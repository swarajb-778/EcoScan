/**
 * Offline Analytics Queue for EcoScan
 * Handles offline data queuing, background sync, and conflict resolution
 */

export interface QueuedEvent {
  id: string;
  type: 'detection' | 'performance' | 'error' | 'interaction' | 'system';
  timestamp: number;
  data: any;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expiresAt: number;
  metadata: {
    sessionId: string;
    userId?: string;
    deviceId: string;
    version: string;
  };
}

export interface SyncResult {
  success: boolean;
  eventId: string;
  error?: string;
  serverTimestamp?: number;
  conflictResolution?: 'client_wins' | 'server_wins' | 'merged';
}

export interface QueueMetrics {
  totalEvents: number;
  pendingEvents: number;
  failedEvents: number;
  syncedEvents: number;
  queueSizeBytes: number;
  oldestEvent: number;
  lastSyncAttempt: number;
  lastSuccessfulSync: number;
  averageSyncLatency: number;
}

export interface QueueConfig {
  maxQueueSize: number;
  maxEventAge: number; // milliseconds
  maxRetries: number;
  syncInterval: number;
  batchSize: number;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  conflictResolutionStrategy: 'client_wins' | 'server_wins' | 'timestamp' | 'merge';
}

export class OfflineAnalyticsQueue {
  private queue: QueuedEvent[] = [];
  private config: QueueConfig;
  private metrics: QueueMetrics;
  private syncInterval?: NodeJS.Timeout;
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private syncHistory: number[] = [];
  private dbName = 'EcoScanOfflineQueue';
  private db?: IDBDatabase;
  
  private readonly STORAGE_KEY = 'ecoscan_offline_queue';
  private readonly METRICS_KEY = 'ecoscan_queue_metrics';
  private readonly MAX_SYNC_HISTORY = 20;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxQueueSize: 10000,
      maxEventAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxRetries: 5,
      syncInterval: 30000, // 30 seconds
      batchSize: 50,
      compressionEnabled: true,
      persistenceEnabled: true,
      conflictResolutionStrategy: 'timestamp',
      ...config
    };
    
    this.metrics = {
      totalEvents: 0,
      pendingEvents: 0,
      failedEvents: 0,
      syncedEvents: 0,
      queueSizeBytes: 0,
      oldestEvent: 0,
      lastSyncAttempt: 0,
      lastSuccessfulSync: 0,
      averageSyncLatency: 0
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Setup online/offline listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Initialize persistence
      if (this.config.persistenceEnabled) {
        await this.initializePersistence();
        await this.loadPersistedQueue();
      }
      
      // Load metrics
      await this.loadMetrics();
      
      // Start background sync
      this.startBackgroundSync();
      
      // Cleanup old events
      this.cleanupExpiredEvents();
      
      console.log('📊 Offline analytics queue initialized:', {
        queueSize: this.queue.length,
        isOnline: this.isOnline
      });
      
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }

  private async initializePersistence(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create events store
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('timestamp', 'timestamp');
          eventStore.createIndex('type', 'type');
          eventStore.createIndex('priority', 'priority');
        }
        
        // Create metrics store
        if (!db.objectStoreNames.contains('metrics')) {
          db.createObjectStore('metrics');
        }
      };
    });
  }

  private async loadPersistedQueue(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.getAll();
      
      request.onsuccess = () => {
        this.queue = request.result || [];
        this.updateMetrics();
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async persistQueue(): Promise<void> {
    if (!this.db || !this.config.persistenceEnabled) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      
      // Clear existing data
      store.clear();
      
      // Add all queue items
      this.queue.forEach(event => {
        store.add(event);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async loadMetrics(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.METRICS_KEY);
      if (stored) {
        const storedMetrics = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...storedMetrics };
      }
    } catch (error) {
      console.warn('Failed to load queue metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      localStorage.setItem(this.METRICS_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save queue metrics:', error);
    }
  }

  private handleOnline(): void {
    console.log('📶 Connection restored - resuming sync');
    this.isOnline = true;
    this.triggerImmediateSync();
  }

  private handleOffline(): void {
    console.log('📵 Connection lost - queuing events offline');
    this.isOnline = false;
  }

  private startBackgroundSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.queue.length > 0) {
        this.syncEvents();
      }
    }, this.config.syncInterval);
  }

  private cleanupExpiredEvents(): void {
    const now = Date.now();
    const initialCount = this.queue.length;
    
    this.queue = this.queue.filter(event => {
      return now - event.timestamp < this.config.maxEventAge && 
             event.retryCount < this.config.maxRetries;
    });
    
    const removedCount = initialCount - this.queue.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired events`);
      this.updateMetrics();
      this.persistQueue();
    }
  }

  // Public API methods
  
  async enqueue(type: QueuedEvent['type'], data: any, priority: QueuedEvent['priority'] = 'medium'): Promise<string> {
    const eventId = this.generateEventId();
    const now = Date.now();
    
    const event: QueuedEvent = {
      id: eventId,
      type,
      timestamp: now,
      data: this.processEventData(data),
      retryCount: 0,
      priority,
      expiresAt: now + this.config.maxEventAge,
      metadata: {
        sessionId: this.getSessionId(),
        deviceId: this.getDeviceId(),
        version: this.getAppVersion()
      }
    };
    
    // Check queue size limits
    if (this.queue.length >= this.config.maxQueueSize) {
      this.evictOldestEvents();
    }
    
    // Insert event in priority order
    this.insertEventByPriority(event);
    
    this.updateMetrics();
    await this.persistQueue();
    
    // Attempt immediate sync if online
    if (this.isOnline && priority === 'critical') {
      this.triggerImmediateSync();
    }
    
    console.log(`📝 Queued ${type} event:`, { id: eventId, priority, queueSize: this.queue.length });
    return eventId;
  }

  private processEventData(data: any): any {
    // Apply compression if enabled
    if (this.config.compressionEnabled && typeof data === 'object') {
      return this.compressData(data);
    }
    return data;
  }

  private compressData(data: any): any {
    // Simple data compression - remove null/undefined values, truncate strings
    if (Array.isArray(data)) {
      return data.map(item => this.compressData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const compressed: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value != null) {
          if (typeof value === 'string' && value.length > 1000) {
            compressed[key] = value.substring(0, 1000) + '...';
          } else {
            compressed[key] = this.compressData(value);
          }
        }
      }
      return compressed;
    }
    
    return data;
  }

  private insertEventByPriority(event: QueuedEvent): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    let insertIndex = this.queue.findIndex(existingEvent => 
      priorityOrder[event.priority] < priorityOrder[existingEvent.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(event);
    } else {
      this.queue.splice(insertIndex, 0, event);
    }
  }

  private evictOldestEvents(): void {
    // Remove oldest low-priority events first
    const lowPriorityIndices = this.queue
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.priority === 'low')
      .map(({ index }) => index);
    
    if (lowPriorityIndices.length > 0) {
      const oldestIndex = lowPriorityIndices.reduce((oldest, current) => 
        this.queue[current].timestamp < this.queue[oldest].timestamp ? current : oldest
      );
      this.queue.splice(oldestIndex, 1);
    } else {
      // Remove oldest event regardless of priority
      let oldestIndex = 0;
      for (let i = 1; i < this.queue.length; i++) {
        if (this.queue[i].timestamp < this.queue[oldestIndex].timestamp) {
          oldestIndex = i;
        }
      }
      this.queue.splice(oldestIndex, 1);
    }
  }

  private async syncEvents(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) return;
    
    this.isSyncing = true;
    const syncStart = performance.now();
    this.metrics.lastSyncAttempt = Date.now();
    
    try {
      const batch = this.queue.slice(0, this.config.batchSize);
      console.log(`🔄 Syncing ${batch.length} events...`);
      
      const results = await this.sendEventBatch(batch);
      await this.processSyncResults(results);
      
      const syncDuration = performance.now() - syncStart;
      this.updateSyncMetrics(syncDuration);
      
      console.log(`✅ Sync completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.handleSyncFailure();
    } finally {
      this.isSyncing = false;
    }
  }

  private async sendEventBatch(events: QueuedEvent[]): Promise<SyncResult[]> {
    // Mock API call - replace with actual analytics endpoint
    const response = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: events.map(event => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          data: event.data,
          metadata: event.metadata
        }))
      })
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.results || [];
  }

  private async processSyncResults(results: SyncResult[]): Promise<void> {
    const successfulIds = new Set(results.filter(r => r.success).map(r => r.eventId));
    const failedResults = results.filter(r => !r.success);
    
    // Remove successful events from queue
    this.queue = this.queue.filter(event => !successfulIds.has(event.id));
    
    // Handle failed events
    for (const failed of failedResults) {
      const event = this.queue.find(e => e.id === failed.eventId);
      if (event) {
        event.retryCount++;
        if (event.retryCount >= this.config.maxRetries) {
          this.queue = this.queue.filter(e => e.id !== event.id);
          this.metrics.failedEvents++;
        }
      }
    }
    
    this.metrics.syncedEvents += successfulIds.size;
    this.metrics.lastSuccessfulSync = Date.now();
    
    this.updateMetrics();
    await this.persistQueue();
    await this.saveMetrics();
  }

  private updateSyncMetrics(syncDuration: number): void {
    this.syncHistory.push(syncDuration);
    if (this.syncHistory.length > this.MAX_SYNC_HISTORY) {
      this.syncHistory.shift();
    }
    
    this.metrics.averageSyncLatency = this.syncHistory.reduce((a, b) => a + b, 0) / this.syncHistory.length;
  }

  private handleSyncFailure(): void {
    // Exponential backoff for retry interval
    const currentInterval = this.config.syncInterval;
    const newInterval = Math.min(currentInterval * 2, 300000); // Max 5 minutes
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.queue.length > 0) {
        this.syncEvents();
      }
    }, newInterval);
    
    // Restore original interval after some time
    setTimeout(() => {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.startBackgroundSync();
      }
    }, newInterval * 3);
  }

  private updateMetrics(): void {
    this.metrics.totalEvents = this.metrics.syncedEvents + this.queue.length;
    this.metrics.pendingEvents = this.queue.length;
    this.metrics.queueSizeBytes = this.estimateQueueSize();
    this.metrics.oldestEvent = this.queue.length > 0 ? 
      Math.min(...this.queue.map(e => e.timestamp)) : 0;
  }

  private estimateQueueSize(): number {
    // Rough estimation of queue size in bytes
    return this.queue.reduce((total, event) => {
      const eventSize = JSON.stringify(event).length * 2; // Rough UTF-16 estimation
      return total + eventSize;
    }, 0);
  }

  private triggerImmediateSync(): void {
    if (!this.isSyncing) {
      setTimeout(() => this.syncEvents(), 100);
    }
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    // Get or generate session ID
    let sessionId = sessionStorage.getItem('ecoscan_session_id');
    if (!sessionId) {
      sessionId = this.generateEventId();
      sessionStorage.setItem('ecoscan_session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceId(): string {
    // Get or generate device ID
    let deviceId = localStorage.getItem('ecoscan_device_id');
    if (!deviceId) {
      deviceId = this.generateEventId();
      localStorage.setItem('ecoscan_device_id', deviceId);
    }
    return deviceId;
  }

  private getAppVersion(): string {
    return '1.0.0'; // Should be dynamic
  }

  // Public API
  
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  getQueueStatus(): { size: number; isOnline: boolean; isSyncing: boolean } {
    return {
      size: this.queue.length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing
    };
  }

  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncEvents();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    this.updateMetrics();
    await this.persistQueue();
    await this.saveMetrics();
    console.log('🧹 Queue cleared');
  }

  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart background sync with new interval
    if (this.syncInterval && newConfig.syncInterval) {
      clearInterval(this.syncInterval);
      this.startBackgroundSync();
    }
  }

  dispose(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    if (this.db) {
      this.db.close();
    }
    
    console.log('📊 Offline analytics queue disposed');
  }
}

// Global instance for easy access
export const offlineQueue = new OfflineAnalyticsQueue(); 