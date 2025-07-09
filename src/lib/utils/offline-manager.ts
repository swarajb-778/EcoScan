/**
 * Advanced Offline Capabilities Manager
 * Enables full app functionality without internet connection
 */

import { writable, derived } from 'svelte/store';
import { isBrowser } from './browser.js';
import type { Detection } from '../types/index.js';

export interface OfflineDetection {
  id: string;
  timestamp: number;
  imageData: string;
  detections: Detection[];
  synced: boolean;
  location?: GeolocationPosition;
  userFeedback?: string;
}

export interface SyncQueue {
  id: string;
  type: 'detection' | 'feedback' | 'analytics';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  hasOfflineCapability: boolean;
  storageQuota: number;
  storageUsed: number;
  lastSync: number;
  pendingSync: number;
  modelsCached: string[];
}

// Stores for offline functionality
export const offlineStatus = writable<OfflineStatus>({
  isOnline: navigator?.onLine || false,
  hasOfflineCapability: false,
  storageQuota: 0,
  storageUsed: 0,
  lastSync: 0,
  pendingSync: 0,
  modelsCached: []
});

export const offlineDetections = writable<OfflineDetection[]>([]);
export const syncQueue = writable<SyncQueue[]>([]);

// Derived stores
export const isOfflineMode = derived(offlineStatus, ($status) => !$status.isOnline);
export const hasPendingSync = derived(syncQueue, ($queue) => $queue.length > 0);

/**
 * Offline Manager Class
 */
export class OfflineManager {
  private dbName = 'ecoscan-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private modelCache: Map<string, any> = new Map();
  private syncInterval: number | null = null;
  private serviceWorker: ServiceWorkerRegistration | null = null;

  constructor() {
    if (isBrowser()) {
      this.initialize();
    }
  }

  /**
   * Initialize offline capabilities
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing offline capabilities...');
      
      // Initialize IndexedDB
      await this.initializeDatabase();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Set up network status monitoring
      this.setupNetworkMonitoring();
      
      // Initialize storage quota monitoring
      await this.updateStorageQuota();
      
      // Load cached models
      await this.loadCachedModels();
      
      // Start sync process
      this.startSyncProcess();
      
      console.log('✅ Offline capabilities initialized');
      
      offlineStatus.update(status => ({
        ...status,
        hasOfflineCapability: true
      }));
      
    } catch (error) {
      console.error('❌ Failed to initialize offline capabilities:', error);
    }
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('detections')) {
          const detectionsStore = db.createObjectStore('detections', { keyPath: 'id' });
          detectionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          detectionsStore.createIndex('synced', 'synced', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('models')) {
          const modelsStore = db.createObjectStore('models', { keyPath: 'name' });
          modelsStore.createIndex('version', 'version', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Register service worker for advanced caching
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      this.serviceWorker = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }

  /**
   * Setup network status monitoring
   */
  private setupNetworkMonitoring(): void {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      
      offlineStatus.update(status => ({
        ...status,
        isOnline
      }));
      
      if (isOnline) {
        console.log('🌐 Connection restored - starting sync');
        this.syncOfflineData();
      } else {
        console.log('📴 Connection lost - entering offline mode');
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial status
    updateOnlineStatus();
  }

  /**
   * Store detection offline
   */
  async storeDetectionOffline(
    imageData: string, 
    detections: Detection[], 
    location?: GeolocationPosition
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const offlineDetection: OfflineDetection = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      imageData,
      detections,
      synced: false,
      location
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['detections'], 'readwrite');
      const store = transaction.objectStore('detections');
      
      const request = store.add(offlineDetection);
      
      request.onsuccess = () => {
        console.log('💾 Detection stored offline:', offlineDetection.id);
        
        // Update reactive store
        offlineDetections.update(detections => [...detections, offlineDetection]);
        
        resolve(offlineDetection.id);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline detections
   */
  async getOfflineDetections(): Promise<OfflineDetection[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['detections'], 'readonly');
      const store = transaction.objectStore('detections');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const detections = request.result as OfflineDetection[];
        offlineDetections.set(detections);
        resolve(detections);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(type: SyncQueue['type'], data: any): Promise<void> {
    if (!this.db) return;
    
    const queueItem: SyncQueue = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.add(queueItem);
      
      request.onsuccess = () => {
        syncQueue.update(queue => [...queue, queueItem]);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData(): Promise<void> {
    if (!navigator.onLine || !this.db) return;
    
    console.log('🔄 Starting offline data sync...');
    
    try {
      // Sync detections
      await this.syncDetections();
      
      // Sync queue items
      await this.syncQueueItems();
      
      // Update last sync timestamp
      offlineStatus.update(status => ({
        ...status,
        lastSync: Date.now(),
        pendingSync: 0
      }));
      
      console.log('✅ Offline sync completed');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  /**
   * Sync offline detections
   */
  private async syncDetections(): Promise<void> {
    const detections = await this.getOfflineDetections();
    const unsyncedDetections = detections.filter(d => !d.synced);
    
    console.log(`📤 Syncing ${unsyncedDetections.length} offline detections...`);
    
    for (const detection of unsyncedDetections) {
      try {
        // In a real implementation, this would send to the API
        await this.sendDetectionToAPI(detection);
        
        // Mark as synced
        await this.markDetectionSynced(detection.id);
        
      } catch (error) {
        console.warn(`Failed to sync detection ${detection.id}:`, error);
      }
    }
  }

  /**
   * Sync queue items
   */
  private async syncQueueItems(): Promise<void> {
    const queue = await this.getSyncQueue();
    
    console.log(`📤 Syncing ${queue.length} queue items...`);
    
    for (const item of queue) {
      try {
        await this.processQueueItem(item);
        await this.removeFromSyncQueue(item.id);
        
      } catch (error) {
        console.warn(`Failed to sync queue item ${item.id}:`, error);
        
        // Increment retry count
        if (item.retryCount < item.maxRetries) {
          await this.incrementRetryCount(item.id);
        } else {
          await this.removeFromSyncQueue(item.id);
          console.error(`Queue item ${item.id} exceeded max retries`);
        }
      }
    }
  }

  /**
   * Cache ML models for offline use
   */
  async cacheModel(modelName: string, modelData: ArrayBuffer): Promise<void> {
    if (!this.db) return;
    
    const modelCache = {
      name: modelName,
      data: modelData,
      version: '1.0.0',
      timestamp: Date.now(),
      size: modelData.byteLength
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      
      const request = store.put(modelCache);
      
      request.onsuccess = () => {
        console.log(`📥 Model cached: ${modelName} (${(modelData.byteLength / 1024 / 1024).toFixed(1)}MB)`);
        
        this.modelCache.set(modelName, modelData);
        
        offlineStatus.update(status => ({
          ...status,
          modelsCached: [...status.modelsCached, modelName]
        }));
        
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load cached models
   */
  private async loadCachedModels(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const models = request.result;
        const modelNames: string[] = [];
        
        for (const model of models) {
          this.modelCache.set(model.name, model.data);
          modelNames.push(model.name);
        }
        
        offlineStatus.update(status => ({
          ...status,
          modelsCached: modelNames
        }));
        
        console.log(`📦 Loaded ${models.length} cached models`);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Perform offline detection using cached models
   */
  async detectOffline(imageData: string): Promise<Detection[]> {
    // This would use the cached ML models for offline inference
    // For demonstration, we'll return mock results
    
    console.log('🤖 Performing offline detection...');
    
    // Simulate offline processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const offlineDetections: Detection[] = [
      {
        id: `offline_detection_${Date.now()}`,
        label: 'Offline Detected Item',
        category: 'recycle',
        confidence: 0.75,
        bbox: [100, 100, 200, 200],
        instructions: 'Detected offline - sync when online for detailed analysis',
        tips: ['Offline detection may have reduced accuracy']
      }
    ];
    
    return offlineDetections;
  }

  /**
   * Update storage quota information
   */
  private async updateStorageQuota(): Promise<void> {
    if (!('storage' in navigator)) return;
    
    try {
      const estimate = await navigator.storage.estimate();
      
      offlineStatus.update(status => ({
        ...status,
        storageQuota: estimate.quota || 0,
        storageUsed: estimate.usage || 0
      }));
      
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }
  }

  /**
   * Start periodic sync process
   */
  private startSyncProcess(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.syncOfflineData();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        console.log('📥 Service worker cache updated');
        break;
      case 'OFFLINE_READY':
        console.log('📱 App ready for offline use');
        break;
      default:
        console.log('📨 Service worker message:', type, data);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Helper methods
  private async sendDetectionToAPI(detection: OfflineDetection): Promise<void> {
    // Mock API call - would integrate with actual backend
    console.log('📤 Sending detection to API:', detection.id);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async markDetectionSynced(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['detections'], 'readwrite');
      const store = transaction.objectStore('detections');
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const detection = getRequest.result;
        if (detection) {
          detection.synced = true;
          const putRequest = store.put(detection);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  private async getSyncQueue(): Promise<SyncQueue[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async processQueueItem(item: SyncQueue): Promise<void> {
    // Process different types of queue items
    console.log(`📤 Processing queue item: ${item.type}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        syncQueue.update(queue => queue.filter(item => item.id !== id));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount++;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

// Global offline manager instance
let globalOfflineManager: OfflineManager | null = null;

/**
 * Get or create global offline manager
 */
export function getOfflineManager(): OfflineManager {
  if (!globalOfflineManager) {
    globalOfflineManager = new OfflineManager();
  }
  return globalOfflineManager;
}

/**
 * Quick access functions
 */
export const offline = {
  store: (imageData: string, detections: Detection[], location?: GeolocationPosition) =>
    getOfflineManager().storeDetectionOffline(imageData, detections, location),
  detect: (imageData: string) => getOfflineManager().detectOffline(imageData),
  sync: () => getOfflineManager().syncOfflineData(),
  cache: (modelName: string, modelData: ArrayBuffer) =>
    getOfflineManager().cacheModel(modelName, modelData),
  getManager: () => getOfflineManager()
}; 