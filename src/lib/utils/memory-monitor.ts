/**
 * Memory Leak Detection and Monitoring for EcoScan
 * Tracks memory usage patterns, detects leaks, and provides cleanup suggestions
 */

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  externalSize?: number;
  objectCounts: ObjectTypeCount[];
  gcEvents: number;
}

export interface ObjectTypeCount {
  type: string;
  count: number;
  size: number;
}

export interface MemoryLeak {
  id: string;
  type: 'heap_growth' | 'object_accumulation' | 'event_listeners' | 'closures' | 'dom_nodes';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: number;
  growthRate: number; // bytes per second
  affectedObjects?: string[];
  suggestedFix: string;
  confidence: number; // 0-1
}

export interface MemoryAlert {
  id: string;
  type: 'memory_pressure' | 'potential_leak' | 'gc_pressure' | 'heap_limit_approaching';
  message: string;
  timestamp: number;
  metrics: {
    currentUsage: number;
    percentageUsed: number;
    growthRate: number;
  };
}

export interface MonitoringConfig {
  samplingInterval: number;
  snapshotRetention: number;
  leakDetectionThreshold: number; // bytes per second
  memoryPressureThreshold: number; // percentage of heap limit
  objectGrowthThreshold: number; // objects per second
  enableGCMonitoring: boolean;
  enableObjectTracking: boolean;
  enableDOMTracking: boolean;
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private detectedLeaks: MemoryLeak[] = [];
  private alerts: MemoryAlert[] = [];
  private config: MonitoringConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private gcObserver?: PerformanceObserver;
  private domObserver?: MutationObserver;
  private objectTracker = new Map<string, WeakRef<object>>();
  private eventListenerTracker = new Map<EventTarget, Set<string>>();
  private isMonitoring = false;
  
  private readonly MAX_SNAPSHOTS = 100;
  private readonly MAX_LEAKS = 50;
  private readonly MAX_ALERTS = 20;
  private readonly ANALYSIS_WINDOW = 10; // Number of snapshots to analyze

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      samplingInterval: 5000, // 5 seconds
      snapshotRetention: 300000, // 5 minutes
      leakDetectionThreshold: 1024 * 1024, // 1MB per second
      memoryPressureThreshold: 85, // 85% of heap limit
      objectGrowthThreshold: 100, // 100 objects per second
      enableGCMonitoring: true,
      enableObjectTracking: true,
      enableDOMTracking: true,
      ...config
    };
    
    this.initialize();
  }

  private initialize(): void {
    if (!this.isMemoryAPIAvailable()) {
      console.warn('Memory monitoring API not available');
      return;
    }
    
    this.setupGCMonitoring();
    this.setupDOMMonitoring();
    this.setupEventListenerTracking();
    
    console.log('🧠 Memory monitor initialized');
  }

  private isMemoryAPIAvailable(): boolean {
    return 'memory' in performance && 
           typeof (performance as any).memory.usedJSHeapSize !== 'undefined';
  }

  private setupGCMonitoring(): void {
    if (!this.config.enableGCMonitoring || !('PerformanceObserver' in window)) {
      return;
    }
    
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const gcEntries = list.getEntries().filter(entry => entry.entryType === 'measure');
        if (gcEntries.length > 0) {
          this.handleGCEvents(gcEntries.length);
        }
      });
      
      this.gcObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('GC monitoring setup failed:', error);
    }
  }

  private setupDOMMonitoring(): void {
    if (!this.config.enableDOMTracking) return;
    
    this.domObserver = new MutationObserver((mutations) => {
      let addedNodes = 0;
      let removedNodes = 0;
      
      mutations.forEach(mutation => {
        addedNodes += mutation.addedNodes.length;
        removedNodes += mutation.removedNodes.length;
      });
      
      if (addedNodes > removedNodes * 2) {
        this.checkDOMLeaks(addedNodes - removedNodes);
      }
    });
    
    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private setupEventListenerTracking(): void {
    // Monkey patch addEventListener to track event listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      if (!memoryMonitor.eventListenerTracker.has(this)) {
        memoryMonitor.eventListenerTracker.set(this, new Set());
      }
      memoryMonitor.eventListenerTracker.get(this)!.add(type);
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    EventTarget.prototype.removeEventListener = function(type: string, listener: any, options?: any) {
      const trackedEvents = memoryMonitor.eventListenerTracker.get(this);
      if (trackedEvents) {
        trackedEvents.delete(type);
        if (trackedEvents.size === 0) {
          memoryMonitor.eventListenerTracker.delete(this);
        }
      }
      
      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemoryPatterns();
      this.cleanupOldData();
    }, this.config.samplingInterval);
    
    console.log('🧠 Memory monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('🧠 Memory monitoring stopped');
  }

  private takeSnapshot(): void {
    if (!this.isMemoryAPIAvailable()) return;
    
    const memInfo = (performance as any).memory;
    const timestamp = Date.now();
    
    const snapshot: MemorySnapshot = {
      timestamp,
      usedJSHeapSize: memInfo.usedJSHeapSize,
      totalJSHeapSize: memInfo.totalJSHeapSize,
      jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
      objectCounts: this.getObjectCounts(),
      gcEvents: this.getGCEventCount()
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
    
    // Check for immediate alerts
    this.checkMemoryPressure(snapshot);
  }

  private getObjectCounts(): ObjectTypeCount[] {
    if (!this.config.enableObjectTracking) return [];
    
    // Estimate object counts by type (simplified)
    const counts: ObjectTypeCount[] = [];
    
    try {
      // Count DOM nodes
      const allElements = document.getElementsByTagName('*');
      counts.push({
        type: 'HTMLElement',
        count: allElements.length,
        size: allElements.length * 100 // Rough estimate
      });
      
      // Count tracked objects
      let aliveObjects = 0;
      this.objectTracker.forEach((ref, type) => {
        if (ref.deref()) {
          aliveObjects++;
        }
      });
      
      if (aliveObjects > 0) {
        counts.push({
          type: 'TrackedObjects',
          count: aliveObjects,
          size: aliveObjects * 50 // Rough estimate
        });
      }
      
      // Count event listeners
      let totalListeners = 0;
      this.eventListenerTracker.forEach(events => {
        totalListeners += events.size;
      });
      
      if (totalListeners > 0) {
        counts.push({
          type: 'EventListeners',
          count: totalListeners,
          size: totalListeners * 20 // Rough estimate
        });
      }
      
    } catch (error) {
      console.warn('Object counting failed:', error);
    }
    
    return counts;
  }

  private getGCEventCount(): number {
    // This is simplified - in a real implementation, you'd track GC events
    return 0;
  }

  private checkMemoryPressure(snapshot: MemorySnapshot): void {
    const usagePercentage = (snapshot.usedJSHeapSize / snapshot.jsHeapSizeLimit) * 100;
    
    if (usagePercentage > this.config.memoryPressureThreshold) {
      const alert: MemoryAlert = {
        id: this.generateId(),
        type: 'memory_pressure',
        message: `High memory usage: ${usagePercentage.toFixed(1)}%`,
        timestamp: snapshot.timestamp,
        metrics: {
          currentUsage: snapshot.usedJSHeapSize,
          percentageUsed: usagePercentage,
          growthRate: this.calculateGrowthRate()
        }
      };
      
      this.addAlert(alert);
    }
  }

  private analyzeMemoryPatterns(): void {
    if (this.snapshots.length < this.ANALYSIS_WINDOW) return;
    
    const recentSnapshots = this.snapshots.slice(-this.ANALYSIS_WINDOW);
    
    // Analyze heap growth
    this.analyzeHeapGrowth(recentSnapshots);
    
    // Analyze object accumulation
    this.analyzeObjectAccumulation(recentSnapshots);
    
    // Analyze GC pressure
    this.analyzeGCPressure(recentSnapshots);
  }

  private analyzeHeapGrowth(snapshots: MemorySnapshot[]): void {
    const growthRate = this.calculateGrowthRate(snapshots);
    
    if (growthRate > this.config.leakDetectionThreshold) {
      const leak: MemoryLeak = {
        id: this.generateId(),
        type: 'heap_growth',
        severity: this.classifyLeakSeverity(growthRate),
        description: `Sustained heap growth detected: ${(growthRate / 1024 / 1024).toFixed(2)} MB/s`,
        detectedAt: Date.now(),
        growthRate,
        suggestedFix: 'Check for unreleased objects, event listeners, or closures',
        confidence: this.calculateConfidence(snapshots)
      };
      
      this.addLeak(leak);
    }
  }

  private analyzeObjectAccumulation(snapshots: MemorySnapshot[]): void {
    if (snapshots.length < 2) return;
    
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];
    
    latest.objectCounts.forEach(currentCount => {
      const previousCount = previous.objectCounts.find(c => c.type === currentCount.type);
      if (previousCount) {
        const objectGrowthRate = (currentCount.count - previousCount.count) / 
                                ((latest.timestamp - previous.timestamp) / 1000);
        
        if (objectGrowthRate > this.config.objectGrowthThreshold) {
          const leak: MemoryLeak = {
            id: this.generateId(),
            type: 'object_accumulation',
            severity: 'medium',
            description: `${currentCount.type} objects accumulating: +${objectGrowthRate.toFixed(1)}/s`,
            detectedAt: Date.now(),
            growthRate: objectGrowthRate,
            affectedObjects: [currentCount.type],
            suggestedFix: `Review ${currentCount.type} lifecycle and cleanup`,
            confidence: 0.7
          };
          
          this.addLeak(leak);
        }
      }
    });
  }

  private analyzeGCPressure(snapshots: MemorySnapshot[]): void {
    const totalGCEvents = snapshots.reduce((sum, snapshot) => sum + snapshot.gcEvents, 0);
    const avgGCEvents = totalGCEvents / snapshots.length;
    
    if (avgGCEvents > 5) { // Arbitrary threshold
      const alert: MemoryAlert = {
        id: this.generateId(),
        type: 'gc_pressure',
        message: `High GC pressure detected: ${avgGCEvents.toFixed(1)} events/sample`,
        timestamp: Date.now(),
        metrics: {
          currentUsage: snapshots[snapshots.length - 1].usedJSHeapSize,
          percentageUsed: 0,
          growthRate: avgGCEvents
        }
      };
      
      this.addAlert(alert);
    }
  }

  private calculateGrowthRate(snapshots?: MemorySnapshot[]): number {
    const data = snapshots || this.snapshots;
    if (data.length < 2) return 0;
    
    const recent = data.slice(-Math.min(5, data.length));
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // seconds
    const memoryDiff = newest.usedJSHeapSize - oldest.usedJSHeapSize;
    
    return timeDiff > 0 ? memoryDiff / timeDiff : 0;
  }

  private classifyLeakSeverity(growthRate: number): MemoryLeak['severity'] {
    const mbPerSecond = growthRate / 1024 / 1024;
    
    if (mbPerSecond > 10) return 'critical';
    if (mbPerSecond > 5) return 'high';
    if (mbPerSecond > 1) return 'medium';
    return 'low';
  }

  private calculateConfidence(snapshots: MemorySnapshot[]): number {
    // Higher confidence with more consistent growth
    const growthRates = [];
    for (let i = 1; i < snapshots.length; i++) {
      const rate = this.calculateGrowthRate(snapshots.slice(i - 1, i + 1));
      growthRates.push(rate);
    }
    
    if (growthRates.length === 0) return 0;
    
    const avgRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const variance = growthRates.reduce((acc, rate) => acc + Math.pow(rate - avgRate, 2), 0) / growthRates.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = higher confidence
    const confidenceScore = Math.max(0, 1 - (stdDev / avgRate));
    return Math.min(1, Math.max(0, confidenceScore));
  }

  private handleGCEvents(count: number): void {
    if (this.snapshots.length > 0) {
      this.snapshots[this.snapshots.length - 1].gcEvents += count;
    }
  }

  private checkDOMLeaks(netIncrease: number): void {
    if (netIncrease > 50) { // Arbitrary threshold
      const leak: MemoryLeak = {
        id: this.generateId(),
        type: 'dom_nodes',
        severity: 'medium',
        description: `DOM nodes increasing rapidly: +${netIncrease} nodes`,
        detectedAt: Date.now(),
        growthRate: netIncrease,
        suggestedFix: 'Check for proper DOM cleanup and detached node removal',
        confidence: 0.6
      };
      
      this.addLeak(leak);
    }
  }

  private addLeak(leak: MemoryLeak): void {
    // Check for duplicate leaks
    const duplicate = this.detectedLeaks.find(existing => 
      existing.type === leak.type && 
      Date.now() - existing.detectedAt < 60000 // Within 1 minute
    );
    
    if (!duplicate) {
      this.detectedLeaks.push(leak);
      
      if (this.detectedLeaks.length > this.MAX_LEAKS) {
        this.detectedLeaks.shift();
      }
      
      console.warn('🚨 Memory leak detected:', leak);
      
      // Dispatch event for UI notification
      window.dispatchEvent(new CustomEvent('memory-leak-detected', {
        detail: leak
      }));
    }
  }

  private addAlert(alert: MemoryAlert): void {
    this.alerts.push(alert);
    
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift();
    }
    
    console.warn('⚠️ Memory alert:', alert);
    
    // Dispatch event for UI notification
    window.dispatchEvent(new CustomEvent('memory-alert', {
      detail: alert
    }));
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.snapshotRetention;
    
    this.snapshots = this.snapshots.filter(snapshot => snapshot.timestamp > cutoff);
    this.detectedLeaks = this.detectedLeaks.filter(leak => leak.detectedAt > cutoff);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    
    // Clean up weak references
    this.objectTracker.forEach((ref, key) => {
      if (!ref.deref()) {
        this.objectTracker.delete(key);
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API
  
  trackObject(obj: object, type: string): void {
    if (this.config.enableObjectTracking) {
      this.objectTracker.set(type + '_' + this.generateId(), new WeakRef(obj));
    }
  }

  getCurrentMemoryUsage(): MemorySnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getDetectedLeaks(): MemoryLeak[] {
    return [...this.detectedLeaks];
  }

  getAlerts(): MemoryAlert[] {
    return [...this.alerts];
  }

  getMemoryReport(): {
    currentUsage: MemorySnapshot | null;
    trends: { growthRate: number; efficiency: number };
    leaks: MemoryLeak[];
    alerts: MemoryAlert[];
  } {
    const currentUsage = this.getCurrentMemoryUsage();
    const growthRate = this.calculateGrowthRate();
    const efficiency = currentUsage ? 
      (currentUsage.usedJSHeapSize / currentUsage.totalJSHeapSize) : 0;
    
    return {
      currentUsage,
      trends: { growthRate, efficiency },
      leaks: this.getDetectedLeaks(),
      alerts: this.getAlerts()
    };
  }

  forceGarbageCollection(): void {
    // Trigger garbage collection if available (Chrome DevTools)
    if ('gc' in window) {
      (window as any).gc();
      console.log('🗑️ Forced garbage collection');
    } else {
      console.warn('Garbage collection not available');
    }
  }

  clearHistory(): void {
    this.snapshots = [];
    this.detectedLeaks = [];
    this.alerts = [];
    console.log('🧹 Memory monitoring history cleared');
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    const oldInterval = this.config.samplingInterval;
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring if interval changed
    if (this.isMonitoring && newConfig.samplingInterval && newConfig.samplingInterval !== oldInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  dispose(): void {
    this.stopMonitoring();
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }
    
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    this.clearHistory();
    console.log('🧠 Memory monitor disposed');
  }
}

// Global instance for easy access
export const memoryMonitor = new MemoryMonitor(); 