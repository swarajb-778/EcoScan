/**
 * Advanced Resource Manager for EcoScan
 * Handles resource cleanup, lifecycle management, and optimization
 */

export interface ManagedResource {
  id: string;
  type: 'camera' | 'model' | 'webgl' | 'worker' | 'stream' | 'network' | 'cache';
  instance: any;
  createdAt: number;
  lastUsed: number;
  size?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cleanupFn?: () => void | Promise<void>;
  metadata: Record<string, any>;
}

export interface ResourcePool {
  type: string;
  maxSize: number;
  idleTimeout: number;
  resources: Set<ManagedResource>;
  factory: () => Promise<any>;
  validator: (resource: any) => boolean;
  cleaner: (resource: any) => void | Promise<void>;
}

export interface ResourceMetrics {
  totalResources: number;
  activeResources: number;
  idleResources: number;
  totalMemory: number;
  leakedResources: number;
  poolUtilization: Record<string, number>;
}

export class AdvancedResourceManager {
  private resources: Map<string, ManagedResource> = new Map();
  private pools: Map<string, ResourcePool> = new Map();
  private cleanupQueue: Set<string> = new Set();
  private cleanupInterval?: NodeJS.Timeout;
  private metrics: ResourceMetrics;
  private maxTotalResources = 1000;
  private maxMemoryUsage = 500 * 1024 * 1024; // 500MB
  
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly DEFAULT_IDLE_TIMEOUT = 300000; // 5 minutes
  private readonly LEAK_DETECTION_THRESHOLD = 100;

  constructor() {
    this.metrics = {
      totalResources: 0,
      activeResources: 0,
      idleResources: 0,
      totalMemory: 0,
      leakedResources: 0,
      poolUtilization: {}
    };
    
    this.initialize();
  }

  private initialize(): void {
    this.setupCleanupScheduler();
    this.setupDefaultPools();
    this.setupMemoryPressureHandling();
    console.log('🔧 Advanced resource manager initialized');
  }

  private setupCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
      this.updateMetrics();
      this.detectLeaks();
    }, this.CLEANUP_INTERVAL);
  }

  private setupDefaultPools(): void {
    // Camera stream pool
    this.createPool('camera-stream', {
      maxSize: 3,
      idleTimeout: 60000, // 1 minute for camera streams
      factory: async () => {
        // This would create a camera stream
        return { type: 'mock-camera', active: true };
      },
      validator: (resource) => resource.active === true,
      cleaner: async (resource) => {
        if (resource.stop) resource.stop();
      }
    });
    
    // WebGL context pool
    this.createPool('webgl-context', {
      maxSize: 5,
      idleTimeout: 120000, // 2 minutes
      factory: async () => {
        const canvas = document.createElement('canvas');
        return canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      },
      validator: (context) => !context.isContextLost(),
      cleaner: async (context) => {
        const ext = context.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    });
    
    // Worker pool
    this.createPool('worker', {
      maxSize: navigator.hardwareConcurrency || 4,
      idleTimeout: 180000, // 3 minutes
      factory: async () => {
        return new Worker('/workers/generic-worker.js');
      },
      validator: (worker) => worker.readyState !== 'closed',
      cleaner: async (worker) => {
        worker.terminate();
      }
    });
  }

  private setupMemoryPressureHandling(): void {
    // Listen for memory pressure events
    window.addEventListener('memory-pressure', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { level } = customEvent.detail;
      this.handleMemoryPressure(level);
    });
    
    // Periodic memory check
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Every 10 seconds
  }

  register<T>(
    type: ManagedResource['type'],
    instance: T,
    options: {
      priority?: ManagedResource['priority'];
      size?: number;
      cleanupFn?: () => void | Promise<void>;
      metadata?: Record<string, any>;
    } = {}
  ): string {
    const id = this.generateId();
    const now = Date.now();
    
    const resource: ManagedResource = {
      id,
      type,
      instance,
      createdAt: now,
      lastUsed: now,
      priority: options.priority || 'medium',
      size: options.size,
      cleanupFn: options.cleanupFn,
      metadata: options.metadata || {}
    };
    
    // Check resource limits
    if (this.resources.size >= this.maxTotalResources) {
      this.forceCleanupLowPriority();
    }
    
    this.resources.set(id, resource);
    this.updateResourceUsage(id);
    
    console.log(`📦 Resource registered: ${type} (${id})`);
    return id;
  }

  get<T>(id: string): T | null {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
      return resource.instance as T;
    }
    return null;
  }

  async acquire<T>(poolType: string): Promise<{ resource: T; releaseId: string } | null> {
    const pool = this.pools.get(poolType);
    if (!pool) {
      throw new Error(`Pool ${poolType} not found`);
    }
    
    // Try to find an idle resource
    for (const resource of pool.resources) {
      if (pool.validator(resource.instance)) {
        resource.lastUsed = Date.now();
        const releaseId = this.generateId();
        resource.metadata.releaseId = releaseId;
        return { resource: resource.instance as T, releaseId };
      }
    }
    
    // Create new resource if pool has space
    if (pool.resources.size < pool.maxSize) {
      try {
        const instance = await pool.factory();
        const resourceId = this.register(poolType as any, instance, {
          priority: 'high',
          cleanupFn: () => pool.cleaner(instance),
          metadata: { poolType }
        });
        
        const resource = this.resources.get(resourceId)!;
        pool.resources.add(resource);
        
        const releaseId = this.generateId();
        resource.metadata.releaseId = releaseId;
        return { resource: instance as T, releaseId };
      } catch (error) {
        console.error(`Failed to create resource for pool ${poolType}:`, error);
        return null;
      }
    }
    
    // Pool is full
    console.warn(`Pool ${poolType} is at capacity`);
    return null;
  }

  release(poolType: string, releaseId: string): void {
    const pool = this.pools.get(poolType);
    if (!pool) return;
    
    for (const resource of pool.resources) {
      if (resource.metadata.releaseId === releaseId) {
        resource.lastUsed = Date.now();
        delete resource.metadata.releaseId;
        break;
      }
    }
  }

  async cleanup(id: string): Promise<void> {
    const resource = this.resources.get(id);
    if (!resource) return;
    
    try {
      if (resource.cleanupFn) {
        await resource.cleanupFn();
      }
      
      // Remove from pools if applicable
      for (const pool of this.pools.values()) {
        pool.resources.delete(resource);
      }
      
      this.resources.delete(id);
      console.log(`🧹 Resource cleaned up: ${resource.type} (${id})`);
      
    } catch (error) {
      console.error(`Failed to cleanup resource ${id}:`, error);
      this.resources.delete(id); // Force removal
    }
  }

  private async performCleanup(): void {
    const now = Date.now();
    const toCleanup: string[] = [];
    
    for (const [id, resource] of this.resources) {
      const idleTime = now - resource.lastUsed;
      
      // Check if resource should be cleaned up
      if (this.shouldCleanup(resource, idleTime)) {
        toCleanup.push(id);
      }
    }
    
    // Cleanup resources in priority order (low priority first)
    toCleanup.sort((a, b) => {
      const resA = this.resources.get(a)!;
      const resB = this.resources.get(b)!;
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      return priorityOrder[resA.priority] - priorityOrder[resB.priority];
    });
    
    for (const id of toCleanup) {
      await this.cleanup(id);
    }
    
    if (toCleanup.length > 0) {
      console.log(`🧹 Cleaned up ${toCleanup.length} resources`);
    }
  }

  private shouldCleanup(resource: ManagedResource, idleTime: number): boolean {
    // Never cleanup critical resources automatically
    if (resource.priority === 'critical') return false;
    
    // Get pool-specific timeout
    const pool = this.pools.get(resource.metadata.poolType);
    const timeout = pool?.idleTimeout || this.DEFAULT_IDLE_TIMEOUT;
    
    // Priority-based timeout adjustment
    const timeoutMultiplier = {
      low: 0.5,
      medium: 1.0,
      high: 2.0,
      critical: Infinity
    };
    
    const adjustedTimeout = timeout * timeoutMultiplier[resource.priority];
    return idleTime > adjustedTimeout;
  }

  private forceCleanupLowPriority(): void {
    const lowPriorityResources = Array.from(this.resources.entries())
      .filter(([_, resource]) => resource.priority === 'low')
      .sort(([_, a], [__, b]) => a.lastUsed - b.lastUsed); // Oldest first
    
    const toRemove = Math.min(50, lowPriorityResources.length);
    for (let i = 0; i < toRemove; i++) {
      const [id] = lowPriorityResources[i];
      this.cleanup(id);
    }
  }

  private handleMemoryPressure(level: 'low' | 'medium' | 'high' | 'critical'): void {
    console.warn(`💾 Memory pressure detected: ${level}`);
    
    const aggressiveness = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 0.8
    };
    
    const targetCleanup = Math.floor(this.resources.size * aggressiveness[level]);
    
    // Sort resources by priority and last used time
    const candidates = Array.from(this.resources.entries())
      .filter(([_, resource]) => resource.priority !== 'critical')
      .sort(([_, a], [__, b]) => {
        const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastUsed - b.lastUsed;
      });
    
    for (let i = 0; i < Math.min(targetCleanup, candidates.length); i++) {
      const [id] = candidates[i];
      this.cleanup(id);
    }
  }

  private checkMemoryUsage(): void {
    let totalMemory = 0;
    
    for (const resource of this.resources.values()) {
      if (resource.size) {
        totalMemory += resource.size;
      }
    }
    
    this.metrics.totalMemory = totalMemory;
    
    if (totalMemory > this.maxMemoryUsage) {
      this.handleMemoryPressure('high');
    }
  }

  private detectLeaks(): void {
    const now = Date.now();
    let leakedCount = 0;
    
    for (const resource of this.resources.values()) {
      const age = now - resource.createdAt;
      const idleTime = now - resource.lastUsed;
      
      // Consider a resource leaked if it's old and hasn't been used recently
      if (age > 600000 && idleTime > 300000 && resource.priority !== 'critical') { // 10 min old, 5 min idle
        leakedCount++;
      }
    }
    
    this.metrics.leakedResources = leakedCount;
    
    if (leakedCount > this.LEAK_DETECTION_THRESHOLD) {
      console.warn(`🚨 Potential resource leak detected: ${leakedCount} leaked resources`);
      window.dispatchEvent(new CustomEvent('resource-leak-detected', {
        detail: { count: leakedCount }
      }));
    }
  }

  private updateMetrics(): void {
    this.metrics.totalResources = this.resources.size;
    this.metrics.activeResources = Array.from(this.resources.values())
      .filter(r => Date.now() - r.lastUsed < 60000).length; // Active in last minute
    this.metrics.idleResources = this.metrics.totalResources - this.metrics.activeResources;
    
    // Update pool utilization
    for (const [type, pool] of this.pools) {
      this.metrics.poolUtilization[type] = (pool.resources.size / pool.maxSize) * 100;
    }
  }

  private updateResourceUsage(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
    }
  }

  createPool(type: string, config: Omit<ResourcePool, 'type' | 'resources'>): void {
    this.pools.set(type, {
      type,
      resources: new Set(),
      ...config
    });
    
    console.log(`🏊 Resource pool created: ${type} (max: ${config.maxSize})`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API
  
  getMetrics(): ResourceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getResourceCount(type?: ManagedResource['type']): number {
    if (type) {
      return Array.from(this.resources.values()).filter(r => r.type === type).length;
    }
    return this.resources.size;
  }

  async cleanupAll(): Promise<void> {
    const ids = Array.from(this.resources.keys());
    console.log(`🧹 Cleaning up all ${ids.length} resources`);
    
    await Promise.all(ids.map(id => this.cleanup(id)));
  }

  setLimits(maxResources: number, maxMemory: number): void {
    this.maxTotalResources = maxResources;
    this.maxMemoryUsage = maxMemory;
    console.log(`📏 Resource limits updated: ${maxResources} resources, ${maxMemory / 1024 / 1024}MB`);
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupAll();
    this.pools.clear();
    console.log('🔧 Resource manager disposed');
  }
}

// Global instance for easy access
export const resourceManager = new AdvancedResourceManager(); 