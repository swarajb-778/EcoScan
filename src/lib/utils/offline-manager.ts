/**
 * Advanced Offline Management System for EcoScan
 * 
 * Features:
 * - Intelligent caching with cache policies
 * - Offline-first architecture with sync capabilities
 * - Background synchronization and conflict resolution
 * - Progressive data loading and smart prefetching
 * - Offline analytics and performance tracking
 * - Multi-layered cache strategy (memory, indexedDB, service worker)
 * - Automatic cache invalidation and cleanup
 * - Offline detection and network status monitoring
 * - Queue management for offline actions
 * - Data compression and optimization
 * - Intelligent sync scheduling
 * - Offline-specific UI adaptations
 * - Background tasks and service worker integration
 * 
 * Cache Strategies:
 * - Cache First (for static assets)
 * - Network First (for dynamic content)
 * - Stale While Revalidate (for frequently updated content)
 * - Network Only (for critical operations)
 * - Cache Only (for offline-only features)
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { enhancedAnalytics } from './analytics';

// Offline interfaces
export interface OfflineConfig {
  enabled: boolean;
  debug: boolean;
  maxCacheSize: number; // in MB
  maxCacheAge: number; // in milliseconds
  cachePolicies: {
    staticAssets: CachePolicy;
    dynamicContent: CachePolicy;
    apiResponses: CachePolicy;
    userGeneratedContent: CachePolicy;
  };
  syncStrategy: {
    enabled: boolean;
    interval: number; // milliseconds
    maxRetries: number;
    backoffMultiplier: number;
    conflictResolution: 'client' | 'server' | 'merge' | 'prompt';
  };
  storage: {
    memory: boolean;
    indexedDB: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'br' | 'deflate';
    threshold: number; // bytes
  };
  prefetching: {
    enabled: boolean;
    strategy: 'aggressive' | 'conservative' | 'smart';
    maxConcurrentRequests: number;
  };
  queue: {
    maxSize: number;
    priority: 'fifo' | 'lifo' | 'priority';
    persistence: boolean;
  };
}

export type CachePolicy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';

export interface CacheEntry {
  id: string;
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  etag?: string;
  metadata: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    compressed?: boolean;
    priority?: number;
  };
}

export interface SyncQueue {
  id: string;
  action: 'create' | 'update' | 'delete' | 'sync';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  metadata: any;
}

export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastOnline: number;
  lastOffline: number;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'failed';
  queueLength: number;
  cacheSize: number;
  cacheHitRate: number;
}

export interface OfflineMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  networkRequests: number;
  syncOperations: number;
  syncFailures: number;
  bytesTransferred: number;
  bytesSaved: number;
  avgResponseTime: number;
  offlineTime: number;
  performanceScore: number;
  lastSync: number;
  syncQueue: SyncQueue[];
  cacheEntries: CacheEntry[];
}

export interface ConflictResolution {
  id: string;
  resource: string;
  clientData: any;
  serverData: any;
  strategy: 'client' | 'server' | 'merge' | 'prompt';
  resolved: boolean;
  timestamp: number;
  resolution?: any;
}

class OfflineManager {
  private config: OfflineConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private indexedDBCache: IDBDatabase | null = null;
  private syncQueue: SyncQueue[] = [];
  private activeRequests: Map<string, Promise<any>> = new Map();
  private networkStatus: OfflineStatus;
  private metricsData: OfflineMetrics;
  private syncInterval: number | null = null;
  private cleanupInterval: number | null = null;
  private prefetchQueue: string[] = [];
  private conflictQueue: ConflictResolution[] = [];
  private compressionWorker: Worker | null = null;
  private serviceWorker: ServiceWorker | null = null;

  // Reactive stores
  private _offlineStatus = writable<OfflineStatus>(this.getInitialStatus());
  private _metrics = writable<OfflineMetrics>(this.getInitialMetrics());
  private _syncQueue = writable<SyncQueue[]>([]);
  private _conflicts = writable<ConflictResolution[]>([]);
  private _cacheSize = writable<number>(0);

  public readonly offlineStatus: Readable<OfflineStatus> = this._offlineStatus;
  public readonly metrics: Readable<OfflineMetrics> = this._metrics;
  public readonly syncQueueStore: Readable<SyncQueue[]> = this._syncQueue;
  public readonly conflicts: Readable<ConflictResolution[]> = this._conflicts;
  public readonly cacheSize: Readable<number> = this._cacheSize;

  constructor() {
    this.config = this.getOfflineConfig();
    this.networkStatus = this.getInitialStatus();
    this.metricsData = this.getInitialMetrics();
    this.initializeOfflineSystem();
  }

  private getOfflineConfig(): OfflineConfig {
    return {
      enabled: true,
      debug: false,
      maxCacheSize: 100, // 100MB
      maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      cachePolicies: {
        staticAssets: 'cache-first',
        dynamicContent: 'network-first',
        apiResponses: 'stale-while-revalidate',
        userGeneratedContent: 'network-first'
      },
      syncStrategy: {
        enabled: true,
        interval: 30000, // 30 seconds
        maxRetries: 3,
        backoffMultiplier: 2,
        conflictResolution: 'merge'
      },
      storage: {
        memory: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: false
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        threshold: 1024 // 1KB
      },
      prefetching: {
        enabled: true,
        strategy: 'smart',
        maxConcurrentRequests: 3
      },
      queue: {
        maxSize: 1000,
        priority: 'priority',
        persistence: true
      }
    };
  }

  private getInitialStatus(): OfflineStatus {
    return {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      networkQuality: navigator.onLine ? 'good' : 'offline',
      lastOnline: navigator.onLine ? Date.now() : 0,
      lastOffline: navigator.onLine ? 0 : Date.now(),
      syncStatus: 'synced',
      queueLength: 0,
      cacheSize: 0,
      cacheHitRate: 0
    };
  }

  private getInitialMetrics(): OfflineMetrics {
    return {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      networkRequests: 0,
      syncOperations: 0,
      syncFailures: 0,
      bytesTransferred: 0,
      bytesSaved: 0,
      avgResponseTime: 0,
      offlineTime: 0,
      performanceScore: 100,
      lastSync: 0,
      syncQueue: [],
      cacheEntries: []
    };
  }

  private async initializeOfflineSystem(): Promise<void> {
    if (!browser || !this.config.enabled) return;

    try {
      await this.initializeStorage();
      this.setupNetworkMonitoring();
      this.setupServiceWorker();
      this.setupSyncScheduler();
      this.setupCacheCleanup();
      this.setupCompressionWorker();
      this.setupPrefetching();
      this.loadPersistedData();
      
      console.log('🔄 Offline management system initialized');
    } catch (error) {
      console.error('Failed to initialize offline system:', error);
    }
  }

  private async initializeStorage(): Promise<void> {
    if (this.config.storage.indexedDB) {
      await this.initializeIndexedDB();
    }
    if (this.config.storage.localStorage) {
      this.loadFromLocalStorage();
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EcoScanOfflineCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('key', 'key', { unique: true });
          cacheStore.createIndex('timestamp', 'timestamp');
          cacheStore.createIndex('expiresAt', 'expiresAt');
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('priority', 'priority');
          syncStore.createIndex('status', 'status');
        }
        
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictStore.createIndex('timestamp', 'timestamp');
          conflictStore.createIndex('resolved', 'resolved');
        }
      };
    });
  }

  private loadFromLocalStorage(): void {
    try {
      const syncQueue = localStorage.getItem('ecoscan-sync-queue');
      if (syncQueue) {
        this.syncQueue = JSON.parse(syncQueue);
      }
      
      const conflicts = localStorage.getItem('ecoscan-conflicts');
      if (conflicts) {
        this.conflictQueue = JSON.parse(conflicts);
      }
      
      const metrics = localStorage.getItem('ecoscan-offline-metrics');
      if (metrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(metrics) };
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  private setupNetworkMonitoring(): void {
    // Basic online/offline detection
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.networkStatus.isOffline = false;
      this.networkStatus.lastOnline = Date.now();
      this.networkStatus.networkQuality = 'good';
      this.updateNetworkStatus();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.networkStatus.isOffline = true;
      this.networkStatus.lastOffline = Date.now();
      this.networkStatus.networkQuality = 'offline';
      this.updateNetworkStatus();
    });

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.networkStatus.connectionType = connection.type || 'unknown';
        this.networkStatus.effectiveType = connection.effectiveType || 'unknown';
        this.networkStatus.downlink = connection.downlink || 0;
        this.networkStatus.rtt = connection.rtt || 0;
        this.networkStatus.saveData = connection.saveData || false;
        
        // Determine network quality
        if (connection.effectiveType === '4g' || connection.effectiveType === '5g') {
          this.networkStatus.networkQuality = 'excellent';
        } else if (connection.effectiveType === '3g') {
          this.networkStatus.networkQuality = 'good';
        } else if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
          this.networkStatus.networkQuality = 'poor';
        }
        
        this.updateNetworkStatus();
      };
      
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 10000); // Check every 10 seconds
  }

  private async checkConnectivity(): Promise<void> {
    if (!this.networkStatus.isOnline) return;

    try {
      const start = Date.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const end = Date.now();
      
      if (response.ok) {
        this.networkStatus.rtt = end - start;
        this.networkStatus.networkQuality = this.networkStatus.rtt < 100 ? 'excellent' : 
                                            this.networkStatus.rtt < 300 ? 'good' : 'poor';
      }
    } catch (error) {
      this.networkStatus.isOnline = false;
      this.networkStatus.isOffline = true;
      this.networkStatus.networkQuality = 'offline';
    }
    
    this.updateNetworkStatus();
  }

  private setupServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        this.serviceWorker = registration.active;
        this.setupServiceWorkerMessaging();
      });
    }
  }

  private setupServiceWorkerMessaging(): void {
    if (!this.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'CACHE_HIT':
          this.metricsData.cacheHits++;
          this.metricsData.bytesSaved += data.size;
          break;
        case 'CACHE_MISS':
          this.metricsData.cacheMisses++;
          break;
        case 'NETWORK_REQUEST':
          this.metricsData.networkRequests++;
          this.metricsData.bytesTransferred += data.size;
          break;
        case 'SYNC_COMPLETED':
          this.handleSyncCompleted(data);
          break;
        case 'SYNC_FAILED':
          this.handleSyncFailed(data);
          break;
      }
      
      this.updateMetrics();
    });
  }

  private setupSyncScheduler(): void {
    if (!this.config.syncStrategy.enabled) return;

    this.syncInterval = setInterval(() => {
      if (this.networkStatus.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, this.config.syncStrategy.interval);
  }

  private setupCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
      this.optimizeCacheSize();
    }, 60000); // Cleanup every minute
  }

  private setupCompressionWorker(): void {
    if (!this.config.compression.enabled) return;

    try {
      this.compressionWorker = new Worker('/workers/compression.js');
      this.compressionWorker.onmessage = (event) => {
        const { id, compressed, size } = event.data;
        this.handleCompressionResult(id, compressed, size);
      };
    } catch (error) {
      console.warn('Compression worker not available:', error);
    }
  }

  private setupPrefetching(): void {
    if (!this.config.prefetching.enabled) return;

    // Intersection Observer for smart prefetching
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const url = element.dataset.prefetch;
          if (url) {
            this.prefetchQueue.push(url);
          }
        }
      });
    }, { threshold: 0.1 });

    // Monitor for prefetch candidates
    document.addEventListener('DOMContentLoaded', () => {
      const prefetchElements = document.querySelectorAll('[data-prefetch]');
      prefetchElements.forEach(element => observer.observe(element));
    });

    // Process prefetch queue
    setInterval(() => {
      this.processPrefetchQueue();
    }, 5000); // Process every 5 seconds
  }

  private loadPersistedData(): void {
    if (this.config.storage.localStorage) {
      this.loadFromLocalStorage();
    }
    
    if (this.indexedDBCache) {
      this.loadFromIndexedDB();
    }
  }

  private async loadFromIndexedDB(): Promise<void> {
    if (!this.indexedDBCache) return;

    try {
      // Load cache entries
      const cacheTransaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const cacheStore = cacheTransaction.objectStore('cache');
      const cacheRequest = cacheStore.getAll();
      
      cacheRequest.onsuccess = () => {
        const entries = cacheRequest.result as CacheEntry[];
        entries.forEach(entry => {
          if (entry.expiresAt > Date.now()) {
            this.memoryCache.set(entry.key, entry);
          }
        });
        this.updateCacheSize();
      };

      // Load sync queue
      const syncTransaction = this.indexedDBCache.transaction(['syncQueue'], 'readonly');
      const syncStore = syncTransaction.objectStore('syncQueue');
      const syncRequest = syncStore.getAll();
      
      syncRequest.onsuccess = () => {
        this.syncQueue = syncRequest.result as SyncQueue[];
        this.updateSyncQueue();
      };

      // Load conflicts
      const conflictTransaction = this.indexedDBCache.transaction(['conflicts'], 'readonly');
      const conflictStore = conflictTransaction.objectStore('conflicts');
      const conflictRequest = conflictStore.getAll();
      
      conflictRequest.onsuccess = () => {
        this.conflictQueue = conflictRequest.result as ConflictResolution[];
        this.updateConflicts();
      };
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }
  }

  public async get(key: string, policy: CachePolicy = 'cache-first'): Promise<any> {
    this.metricsData.totalRequests++;
    const startTime = Date.now();

    try {
      const result = await this.executeGetStrategy(key, policy);
      const endTime = Date.now();
      this.updateAverageResponseTime(endTime - startTime);
      return result;
    } catch (error) {
      console.error('Cache get error:', error);
      throw error;
    }
  }

  private async executeGetStrategy(key: string, policy: CachePolicy): Promise<any> {
    switch (policy) {
      case 'cache-first':
        return this.getCacheFirst(key);
      case 'network-first':
        return this.getNetworkFirst(key);
      case 'stale-while-revalidate':
        return this.getStaleWhileRevalidate(key);
      case 'network-only':
        return this.getNetworkOnly(key);
      case 'cache-only':
        return this.getCacheOnly(key);
      default:
        return this.getCacheFirst(key);
    }
  }

  private async getCacheFirst(key: string): Promise<any> {
    const cached = this.getFromCache(key);
    if (cached) {
      this.metricsData.cacheHits++;
      return cached.data;
    }

    if (this.networkStatus.isOnline) {
      try {
        const data = await this.fetchFromNetwork(key);
        this.setCache(key, data);
        return data;
      } catch (error) {
        this.metricsData.cacheMisses++;
        throw error;
      }
    } else {
      this.metricsData.cacheMisses++;
      throw new Error('No cached data available offline');
    }
  }

  private async getNetworkFirst(key: string): Promise<any> {
    if (this.networkStatus.isOnline) {
      try {
        const data = await this.fetchFromNetwork(key);
        this.setCache(key, data);
        return data;
      } catch (error) {
        const cached = this.getFromCache(key);
        if (cached) {
          this.metricsData.cacheHits++;
          return cached.data;
        }
        throw error;
      }
    } else {
      const cached = this.getFromCache(key);
      if (cached) {
        this.metricsData.cacheHits++;
        return cached.data;
      }
      throw new Error('No cached data available offline');
    }
  }

  private async getStaleWhileRevalidate(key: string): Promise<any> {
    const cached = this.getFromCache(key);
    
    if (cached) {
      this.metricsData.cacheHits++;
      
      // Return cached data immediately
      const result = cached.data;
      
      // Revalidate in background if online
      if (this.networkStatus.isOnline) {
        this.fetchFromNetwork(key).then(data => {
          this.setCache(key, data);
        }).catch(error => {
          console.warn('Background revalidation failed:', error);
        });
      }
      
      return result;
    }

    if (this.networkStatus.isOnline) {
      const data = await this.fetchFromNetwork(key);
      this.setCache(key, data);
      return data;
    } else {
      this.metricsData.cacheMisses++;
      throw new Error('No cached data available offline');
    }
  }

  private async getNetworkOnly(key: string): Promise<any> {
    if (!this.networkStatus.isOnline) {
      throw new Error('Network required but offline');
    }
    
    return this.fetchFromNetwork(key);
  }

  private async getCacheOnly(key: string): Promise<any> {
    const cached = this.getFromCache(key);
    if (cached) {
      this.metricsData.cacheHits++;
      return cached.data;
    }
    
    this.metricsData.cacheMisses++;
    throw new Error('No cached data available');
  }

  private getFromCache(key: string): CacheEntry | null {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry;
    }

    // Check localStorage
    if (this.config.storage.localStorage) {
      try {
        const stored = localStorage.getItem(`ecoscan-cache-${key}`);
        if (stored) {
          const entry = JSON.parse(stored) as CacheEntry;
          if (entry.expiresAt > Date.now()) {
            entry.accessCount++;
            entry.lastAccessed = Date.now();
            this.memoryCache.set(key, entry);
            return entry;
          }
        }
      } catch (error) {
        console.warn('localStorage cache read error:', error);
      }
    }

    return null;
  }

  private async fetchFromNetwork(key: string): Promise<any> {
    // Check if request is already in progress
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key);
    }

    const requestPromise = this.performNetworkRequest(key);
    this.activeRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.activeRequests.delete(key);
      return result;
    } catch (error) {
      this.activeRequests.delete(key);
      throw error;
    }
  }

  private async performNetworkRequest(key: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(key, {
        cache: 'no-cache',
        headers: this.getRequestHeaders()
      });

      if (!response.ok) {
        throw new Error(`Network request failed: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      
      this.metricsData.networkRequests++;
      this.metricsData.bytesTransferred += JSON.stringify(data).length;
      
      return data;
    } catch (error) {
      console.error('Network request failed:', error);
      throw error;
    }
  }

  private getRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.networkStatus.saveData) {
      headers['Save-Data'] = 'on';
    }

    return headers;
  }

  public async set(key: string, data: any, options: { ttl?: number; priority?: number } = {}): Promise<void> {
    this.setCache(key, data, options);
  }

  private setCache(key: string, data: any, options: { ttl?: number; priority?: number } = {}): void {
    const ttl = options.ttl || this.config.maxCacheAge;
    const priority = options.priority || 1;
    const size = JSON.stringify(data).length;
    
    const entry: CacheEntry = {
      id: `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      metadata: {
        priority,
        compressed: false
      }
    };

    // Compress if enabled and data is large enough
    if (this.config.compression.enabled && size > this.config.compression.threshold) {
      this.compressData(entry);
    }

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store in localStorage if enabled
    if (this.config.storage.localStorage) {
      try {
        localStorage.setItem(`ecoscan-cache-${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('localStorage cache write error:', error);
      }
    }

    // Store in IndexedDB if enabled
    if (this.config.storage.indexedDB && this.indexedDBCache) {
      this.storeInIndexedDB(entry);
    }

    this.updateCacheSize();
  }

  private compressData(entry: CacheEntry): void {
    if (this.compressionWorker) {
      this.compressionWorker.postMessage({
        id: entry.id,
        data: entry.data,
        algorithm: this.config.compression.algorithm
      });
    }
  }

  private handleCompressionResult(id: string, compressed: any, size: number): void {
    const entry = Array.from(this.memoryCache.values()).find(e => e.id === id);
    if (entry) {
      entry.data = compressed;
      entry.size = size;
      entry.metadata.compressed = true;
      this.metricsData.bytesSaved += entry.size - size;
    }
  }

  private async storeInIndexedDB(entry: CacheEntry): Promise<void> {
    if (!this.indexedDBCache) return;

    try {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await store.put(entry);
    } catch (error) {
      console.error('IndexedDB cache write error:', error);
    }
  }

  public async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    if (this.config.storage.localStorage) {
      localStorage.removeItem(`ecoscan-cache-${key}`);
    }
    
    if (this.config.storage.indexedDB && this.indexedDBCache) {
      try {
        const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('key');
        await index.delete(key);
      } catch (error) {
        console.error('IndexedDB cache delete error:', error);
      }
    }
    
    this.updateCacheSize();
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.config.storage.localStorage) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('ecoscan-cache-'));
      keys.forEach(key => localStorage.removeItem(key));
    }
    
    if (this.config.storage.indexedDB && this.indexedDBCache) {
      try {
        const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await store.clear();
      } catch (error) {
        console.error('IndexedDB cache clear error:', error);
      }
    }
    
    this.updateCacheSize();
  }

  public addToSyncQueue(item: Omit<SyncQueue, 'id' | 'timestamp' | 'retryCount' | 'status'>): void {
    if (this.syncQueue.length >= this.config.queue.maxSize) {
      console.warn('Sync queue is full, removing oldest item');
      this.syncQueue.shift();
    }

    const queueItem: SyncQueue = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...item
    };

    this.syncQueue.push(queueItem);
    this.persistSyncQueue();
    this.updateSyncQueue();

    if (this.networkStatus.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || !this.networkStatus.isOnline) return;

    this.networkStatus.syncStatus = 'syncing';
    this.updateNetworkStatus();

    const pendingItems = this.syncQueue
      .filter(item => item.status === 'pending')
      .sort((a, b) => this.config.queue.priority === 'priority' ? b.priority - a.priority : 0);

    for (const item of pendingItems) {
      try {
        item.status = 'processing';
        await this.processSyncItem(item);
        item.status = 'completed';
        this.metricsData.syncOperations++;
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        item.retryCount++;
        this.metricsData.syncFailures++;

        if (item.retryCount < item.maxRetries) {
          item.status = 'pending';
          // Exponential backoff
          setTimeout(() => {
            this.processSyncQueue();
          }, item.retryCount * this.config.syncStrategy.backoffMultiplier * 1000);
        }
      }
    }

    // Clean up completed items
    this.syncQueue = this.syncQueue.filter(item => item.status !== 'completed');
    this.persistSyncQueue();
    this.updateSyncQueue();

    this.networkStatus.syncStatus = this.syncQueue.some(item => item.status === 'failed') ? 'failed' : 'synced';
    this.updateNetworkStatus();
  }

  private async processSyncItem(item: SyncQueue): Promise<void> {
    const { action, resource, data } = item;
    
    switch (action) {
      case 'create':
        await this.performCreate(resource, data);
        break;
      case 'update':
        await this.performUpdate(resource, data);
        break;
      case 'delete':
        await this.performDelete(resource, data);
        break;
      case 'sync':
        await this.performSync(resource, data);
        break;
    }
  }

  private async performCreate(resource: string, data: any): Promise<void> {
    const response = await fetch(resource, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Create failed: ${response.status}`);
    }
  }

  private async performUpdate(resource: string, data: any): Promise<void> {
    const response = await fetch(resource, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`);
    }
  }

  private async performDelete(resource: string, data: any): Promise<void> {
    const response = await fetch(resource, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }
  }

  private async performSync(resource: string, data: any): Promise<void> {
    const response = await fetch(`${resource}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.conflicts && result.conflicts.length > 0) {
      this.handleConflicts(result.conflicts);
    }
  }

  private handleConflicts(conflicts: any[]): void {
    conflicts.forEach(conflict => {
      const resolution: ConflictResolution = {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        resource: conflict.resource,
        clientData: conflict.clientData,
        serverData: conflict.serverData,
        strategy: this.config.syncStrategy.conflictResolution,
        resolved: false,
        timestamp: Date.now()
      };

      this.conflictQueue.push(resolution);
      this.resolveConflict(resolution);
    });

    this.updateConflicts();
  }

  private resolveConflict(conflict: ConflictResolution): void {
    switch (conflict.strategy) {
      case 'client':
        conflict.resolution = conflict.clientData;
        break;
      case 'server':
        conflict.resolution = conflict.serverData;
        break;
      case 'merge':
        conflict.resolution = this.mergeData(conflict.clientData, conflict.serverData);
        break;
      case 'prompt':
        // Would typically show UI for user to resolve
        console.warn('Conflict requires user resolution:', conflict);
        return;
    }

    conflict.resolved = true;
    this.updateConflicts();
  }

  private mergeData(clientData: any, serverData: any): any {
    if (typeof clientData === 'object' && typeof serverData === 'object') {
      return { ...serverData, ...clientData };
    }
    return serverData; // Fallback to server data
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0 || !this.networkStatus.isOnline) return;

    const urls = this.prefetchQueue.splice(0, this.config.prefetching.maxConcurrentRequests);
    
    const promises = urls.map(async (url) => {
      try {
        const cached = this.getFromCache(url);
        if (!cached) {
          const data = await this.fetchFromNetwork(url);
          this.setCache(url, data);
        }
      } catch (error) {
        console.warn('Prefetch failed:', url, error);
      }
    });

    await Promise.all(promises);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        expired.push(key);
      }
    });

    expired.forEach(key => {
      this.memoryCache.delete(key);
    });

    if (expired.length > 0) {
      this.updateCacheSize();
    }
  }

  private optimizeCacheSize(): void {
    const currentSize = this.calculateCacheSize();
    const maxSize = this.config.maxCacheSize * 1024 * 1024; // Convert MB to bytes

    if (currentSize > maxSize) {
      const entries = Array.from(this.memoryCache.entries()).sort((a, b) => {
        // Sort by access count (ascending) and last accessed (ascending)
        const aScore = a[1].accessCount + (Date.now() - a[1].lastAccessed) / 1000;
        const bScore = b[1].accessCount + (Date.now() - b[1].lastAccessed) / 1000;
        return aScore - bScore;
      });

      let removedSize = 0;
      const targetSize = maxSize * 0.8; // Remove until 80% of max size

      for (const [key, entry] of entries) {
        if (currentSize - removedSize <= targetSize) break;
        
        this.memoryCache.delete(key);
        removedSize += entry.size;
      }

      this.updateCacheSize();
    }
  }

  private calculateCacheSize(): number {
    let totalSize = 0;
    this.memoryCache.forEach(entry => {
      totalSize += entry.size;
    });
    return totalSize;
  }

  private persistSyncQueue(): void {
    if (this.config.storage.localStorage) {
      localStorage.setItem('ecoscan-sync-queue', JSON.stringify(this.syncQueue));
    }

    if (this.config.storage.indexedDB && this.indexedDBCache) {
      this.syncQueue.forEach(item => {
        this.storeInIndexedDBSync(item);
      });
    }
  }

  private async storeInIndexedDBSync(item: SyncQueue): Promise<void> {
    if (!this.indexedDBCache) return;

    try {
      const transaction = this.indexedDBCache.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.put(item);
    } catch (error) {
      console.error('IndexedDB sync queue write error:', error);
    }
  }

  private handleSyncCompleted(data: any): void {
    this.metricsData.syncOperations++;
    this.metricsData.lastSync = Date.now();
    this.updateMetrics();
  }

  private handleSyncFailed(data: any): void {
    this.metricsData.syncFailures++;
    this.updateMetrics();
  }

  private updateNetworkStatus(): void {
    this.networkStatus.queueLength = this.syncQueue.length;
    this.networkStatus.cacheSize = this.calculateCacheSize();
    this.networkStatus.cacheHitRate = this.calculateCacheHitRate();
    this._offlineStatus.set(this.networkStatus);
  }

  private updateMetrics(): void {
    this.metricsData.syncQueue = this.syncQueue;
    this.metricsData.cacheEntries = Array.from(this.memoryCache.values());
    this.metricsData.performanceScore = this.calculatePerformanceScore();
    this._metrics.set(this.metrics);
  }

  private updateSyncQueue(): void {
    this._syncQueue.set(this.syncQueue);
  }

  private updateConflicts(): void {
    this._conflicts.set(this.conflictQueue);
  }

  private updateCacheSize(): void {
    const size = this.calculateCacheSize();
    this._cacheSize.set(size);
  }

  private calculateCacheHitRate(): number {
    const total = this.metricsData.cacheHits + this.metricsData.cacheMisses;
    return total > 0 ? (this.metricsData.cacheHits / total) * 100 : 0;
  }

  private calculatePerformanceScore(): number {
    const cacheHitRate = this.calculateCacheHitRate();
    const syncSuccessRate = this.metricsData.syncOperations > 0 ? 
      ((this.metricsData.syncOperations - this.metricsData.syncFailures) / this.metricsData.syncOperations) * 100 : 100;
    
    return Math.round((cacheHitRate + syncSuccessRate) / 2);
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metricsData.totalRequests;
    this.metricsData.avgResponseTime = ((this.metricsData.avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  // Public API
  public isOnline(): boolean {
    return this.networkStatus.isOnline;
  }

  public isOffline(): boolean {
    return this.networkStatus.isOffline;
  }

  public getNetworkStatus(): OfflineStatus {
    return { ...this.networkStatus };
  }

  public getMetrics(): OfflineMetrics {
    return { ...this.metricsData };
  }

  public getSyncQueue(): SyncQueue[] {
    return [...this.syncQueue];
  }

  public getConflicts(): ConflictResolution[] {
    return [...this.conflictQueue];
  }

  public async forcSync(): Promise<void> {
    if (this.networkStatus.isOnline) {
      await this.processSyncQueue();
    }
  }

  public async resolveConflictManually(conflictId: string, resolution: any): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (conflict) {
      conflict.resolution = resolution;
      conflict.resolved = true;
      this.updateConflicts();
    }
  }

  public getCachePolicy(type: keyof OfflineConfig['cachePolicies']): CachePolicy {
    return this.config.cachePolicies[type];
  }

  public setCachePolicy(type: keyof OfflineConfig['cachePolicies'], policy: CachePolicy): void {
    this.config.cachePolicies[type] = policy;
  }

  public async prefetch(urls: string[]): Promise<void> {
    this.prefetchQueue.push(...urls);
    await this.processPrefetchQueue();
  }

  public cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    if (this.indexedDBCache) {
      this.indexedDBCache.close();
    }
    
    this.memoryCache.clear();
    this.syncQueue.length = 0;
    this.conflictQueue.length = 0;
    this.prefetchQueue.length = 0;
    this.activeRequests.clear();
  }
}

// Global instance
export const offlineManager = new OfflineManager();

// Utility functions
export function isOnline(): boolean {
  return offlineManager.isOnline();
}

export function isOffline(): boolean {
  return offlineManager.isOffline();
}

export function getNetworkStatus(): OfflineStatus {
  return offlineManager.getNetworkStatus();
}

export function getCachedData(key: string, policy?: CachePolicy): Promise<any> {
  return offlineManager.get(key, policy);
}

export function setCachedData(key: string, data: any, options?: { ttl?: number; priority?: number }): Promise<void> {
  return offlineManager.set(key, data, options);
}

export function addToSyncQueue(item: Omit<SyncQueue, 'id' | 'timestamp' | 'retryCount' | 'status'>): void {
  offlineManager.addToSyncQueue(item);
}

export function forcSync(): Promise<void> {
  return offlineManager.forcSync();
}

export function prefetchUrls(urls: string[]): Promise<void> {
  return offlineManager.prefetch(urls);
} 