/**
 * Performance Profiler for EcoScan
 * Tracks frame timing, memory patterns, CPU usage, and provides optimization recommendations
 */

export interface PerformanceMetrics {
  frameTime: {
    current: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapLimit: number;
    external: number;
    growthRate: number;
  };
  cpu: {
    utilization: number;
    mainThreadBlocking: number;
    taskDuration: number;
  };
  network: {
    requestCount: number;
    totalBytes: number;
    averageLatency: number;
    failureRate: number;
  };
  render: {
    fps: number;
    frameDrops: number;
    paintTime: number;
    layoutTime: number;
  };
}

export interface PerformanceIssue {
  id: string;
  type: 'frame_drop' | 'memory_leak' | 'cpu_spike' | 'slow_network' | 'layout_thrash';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  detectedAt: number;
  frequency: number;
  affectedComponents: string[];
}

export interface ProfilerConfig {
  samplingRate: number;
  enableFrameTimingAPI: boolean;
  enableMemoryProfiling: boolean;
  enableNetworkProfiling: boolean;
  enableUserTimingAPI: boolean;
  alertThresholds: {
    frameTime: number;
    memoryGrowth: number;
    cpuUtilization: number;
    networkLatency: number;
  };
}

export class PerformanceProfiler {
  private metrics: PerformanceMetrics;
  private config: ProfilerConfig;
  private frameTimings: number[] = [];
  private memorySnapshots: number[] = [];
  private cpuSamples: number[] = [];
  private networkRequests: { start: number; end: number; bytes: number; success: boolean }[] = [];
  private issues: PerformanceIssue[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private rafId?: number;
  private samplingInterval?: NodeJS.Timeout;
  private isRunning = false;
  
  private readonly HISTORY_LENGTH = 100;
  private readonly ISSUE_HISTORY_LENGTH = 50;

  constructor(config?: Partial<ProfilerConfig>) {
    this.config = {
      samplingRate: 1000, // 1 second
      enableFrameTimingAPI: true,
      enableMemoryProfiling: true,
      enableNetworkProfiling: true,
      enableUserTimingAPI: true,
      alertThresholds: {
        frameTime: 16.67, // 60fps threshold
        memoryGrowth: 1024 * 1024, // 1MB/s
        cpuUtilization: 80, // 80%
        networkLatency: 1000 // 1 second
      },
      ...config
    };
    
    this.metrics = this.initializeMetrics();
    this.initialize();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      frameTime: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        heapLimit: 0,
        external: 0,
        growthRate: 0
      },
      cpu: {
        utilization: 0,
        mainThreadBlocking: 0,
        taskDuration: 0
      },
      network: {
        requestCount: 0,
        totalBytes: 0,
        averageLatency: 0,
        failureRate: 0
      },
      render: {
        fps: 0,
        frameDrops: 0,
        paintTime: 0,
        layoutTime: 0
      }
    };
  }

  private initialize(): void {
    this.setupPerformanceObservers();
    this.setupNetworkProfiling();
    console.log('📊 Performance profiler initialized');
  }

  private setupPerformanceObservers(): void {
    // Frame timing observer
    if (this.config.enableFrameTimingAPI && 'PerformanceObserver' in window) {
      try {
        const frameObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.includes('frame')) {
              this.recordFrameTiming(entry.duration);
            }
          }
        });
        
        frameObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('frame', frameObserver);
      } catch (error) {
        console.warn('Frame timing API not supported:', error);
      }
    }
    
    // Paint timing observer
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.metrics.render.paintTime = entry.startTime;
          }
        }
      });
      
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    } catch (error) {
      console.warn('Paint timing API not supported:', error);
    }
    
    // Layout shift observer
    try {
      const layoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            this.metrics.render.layoutTime += (entry as any).value;
          }
        }
      });
      
      layoutObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout', layoutObserver);
    } catch (error) {
      console.warn('Layout shift API not supported:', error);
    }
    
    // Long task observer
    try {
      const taskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.recordLongTask(entry.duration);
          }
        }
      });
      
      taskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('task', taskObserver);
    } catch (error) {
      console.warn('Long task API not supported:', error);
    }
  }

  private setupNetworkProfiling(): void {
    if (!this.config.enableNetworkProfiling) return;
    
    // Monkey patch fetch to track network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const start = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const end = performance.now();
        
        // Estimate response size
        const contentLength = response.headers.get('content-length');
        const bytes = contentLength ? parseInt(contentLength, 10) : 0;
        
        this.recordNetworkRequest({
          start,
          end,
          bytes,
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const end = performance.now();
        this.recordNetworkRequest({
          start,
          end,
          bytes: 0,
          success: false
        });
        throw error;
      }
    };
  }

  startProfiling(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startFrameTracking();
    this.startSampling();
    
    console.log('📊 Performance profiling started');
  }

  stopProfiling(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.stopFrameTracking();
    this.stopSampling();
    
    console.log('📊 Performance profiling stopped');
  }

  private startFrameTracking(): void {
    let lastTime = performance.now();
    
    const trackFrame = (currentTime: number) => {
      const frameTime = currentTime - lastTime;
      this.recordFrameTiming(frameTime);
      lastTime = currentTime;
      
      if (this.isRunning) {
        this.rafId = requestAnimationFrame(trackFrame);
      }
    };
    
    this.rafId = requestAnimationFrame(trackFrame);
  }

  private stopFrameTracking(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  }

  private startSampling(): void {
    this.samplingInterval = setInterval(() => {
      this.sampleMemory();
      this.sampleCPU();
      this.updateMetrics();
      this.analyzePerformanceIssues();
    }, this.config.samplingRate);
  }

  private stopSampling(): void {
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = undefined;
    }
  }

  private recordFrameTiming(frameTime: number): void {
    this.frameTimings.push(frameTime);
    if (this.frameTimings.length > this.HISTORY_LENGTH) {
      this.frameTimings.shift();
    }
    
    // Check for frame drops
    if (frameTime > this.config.alertThresholds.frameTime * 2) {
      this.metrics.render.frameDrops++;
      this.checkFrameDropIssue(frameTime);
    }
  }

  private recordLongTask(duration: number): void {
    this.metrics.cpu.taskDuration = Math.max(this.metrics.cpu.taskDuration, duration);
    this.metrics.cpu.mainThreadBlocking += duration;
    
    if (duration > 50) { // Significant long task
      this.reportIssue({
        type: 'cpu_spike',
        severity: duration > 100 ? 'high' : 'medium',
        description: `Long task detected: ${duration.toFixed(1)}ms`,
        impact: 'User interface becomes unresponsive',
        recommendation: 'Break up large tasks or use web workers',
        affectedComponents: ['main-thread']
      });
    }
  }

  private recordNetworkRequest(request: { start: number; end: number; bytes: number; success: boolean }): void {
    this.networkRequests.push(request);
    if (this.networkRequests.length > this.HISTORY_LENGTH) {
      this.networkRequests.shift();
    }
    
    const latency = request.end - request.start;
    if (latency > this.config.alertThresholds.networkLatency) {
      this.reportIssue({
        type: 'slow_network',
        severity: 'medium',
        description: `Slow network request: ${latency.toFixed(1)}ms`,
        impact: 'Delayed content loading',
        recommendation: 'Optimize API endpoints or implement caching',
        affectedComponents: ['network']
      });
    }
  }

  private sampleMemory(): void {
    if (!this.config.enableMemoryProfiling || !('memory' in performance)) {
      return;
    }
    
    const memInfo = (performance as any).memory;
    const heapUsed = memInfo.usedJSHeapSize;
    
    this.memorySnapshots.push(heapUsed);
    if (this.memorySnapshots.length > this.HISTORY_LENGTH) {
      this.memorySnapshots.shift();
    }
    
    this.metrics.memory.heapUsed = heapUsed;
    this.metrics.memory.heapTotal = memInfo.totalJSHeapSize;
    this.metrics.memory.heapLimit = memInfo.jsHeapSizeLimit;
    
    // Calculate growth rate
    if (this.memorySnapshots.length >= 2) {
      const growthRate = this.calculateMemoryGrowthRate();
      this.metrics.memory.growthRate = growthRate;
      
      if (growthRate > this.config.alertThresholds.memoryGrowth) {
        this.checkMemoryLeakIssue(growthRate);
      }
    }
  }

  private sampleCPU(): void {
    // Estimate CPU utilization using task timing
    const totalTime = this.config.samplingRate;
    const blockedTime = this.metrics.cpu.mainThreadBlocking;
    this.metrics.cpu.utilization = Math.min(100, (blockedTime / totalTime) * 100);
    
    // Reset for next sample
    this.metrics.cpu.mainThreadBlocking = 0;
    this.metrics.cpu.taskDuration = 0;
  }

  private updateMetrics(): void {
    // Update frame timing metrics
    if (this.frameTimings.length > 0) {
      const sorted = [...this.frameTimings].sort((a, b) => a - b);
      
      this.metrics.frameTime.current = this.frameTimings[this.frameTimings.length - 1];
      this.metrics.frameTime.average = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length;
      this.metrics.frameTime.min = sorted[0];
      this.metrics.frameTime.max = sorted[sorted.length - 1];
      this.metrics.frameTime.p95 = sorted[Math.floor(sorted.length * 0.95)];
      this.metrics.frameTime.p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      // Calculate FPS
      this.metrics.render.fps = 1000 / this.metrics.frameTime.average;
    }
    
    // Update network metrics
    const recentRequests = this.networkRequests.slice(-20); // Last 20 requests
    if (recentRequests.length > 0) {
      this.metrics.network.requestCount = this.networkRequests.length;
      this.metrics.network.totalBytes = recentRequests.reduce((total, req) => total + req.bytes, 0);
      this.metrics.network.averageLatency = recentRequests.reduce((total, req) => 
        total + (req.end - req.start), 0) / recentRequests.length;
      this.metrics.network.failureRate = recentRequests.filter(req => !req.success).length / recentRequests.length;
    }
  }

  private calculateMemoryGrowthRate(): number {
    if (this.memorySnapshots.length < 10) return 0;
    
    const recent = this.memorySnapshots.slice(-10);
    const older = this.memorySnapshots.slice(-20, -10);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / (this.config.samplingRate / 1000); // bytes per second
  }

  private analyzePerformanceIssues(): void {
    // Check for frame timing issues
    if (this.metrics.render.fps < 30) {
      this.reportIssue({
        type: 'frame_drop',
        severity: this.metrics.render.fps < 15 ? 'critical' : 'high',
        description: `Low FPS detected: ${this.metrics.render.fps.toFixed(1)}fps`,
        impact: 'Poor user experience, choppy animations',
        recommendation: 'Optimize rendering performance or reduce visual complexity',
        affectedComponents: ['renderer', 'animations']
      });
    }
    
    // Check for layout thrashing
    if (this.metrics.render.layoutTime > 50) {
      this.reportIssue({
        type: 'layout_thrash',
        severity: 'medium',
        description: `Layout thrashing detected: ${this.metrics.render.layoutTime.toFixed(1)}ms`,
        impact: 'Visual instability and performance issues',
        recommendation: 'Minimize layout-triggering CSS changes',
        affectedComponents: ['layout', 'css']
      });
    }
  }

  private checkFrameDropIssue(frameTime: number): void {
    this.reportIssue({
      type: 'frame_drop',
      severity: frameTime > this.config.alertThresholds.frameTime * 3 ? 'high' : 'medium',
      description: `Frame drop detected: ${frameTime.toFixed(1)}ms`,
      impact: 'Visible stuttering in animations',
      recommendation: 'Profile and optimize heavy operations',
      affectedComponents: ['renderer']
    });
  }

  private checkMemoryLeakIssue(growthRate: number): void {
    this.reportIssue({
      type: 'memory_leak',
      severity: growthRate > this.config.alertThresholds.memoryGrowth * 2 ? 'critical' : 'high',
      description: `Memory leak detected: ${(growthRate / 1024 / 1024).toFixed(2)}MB/s growth`,
      impact: 'Increasing memory usage may cause browser crashes',
      recommendation: 'Check for memory leaks in event listeners and object references',
      affectedComponents: ['memory-management']
    });
  }

  private reportIssue(issueData: Omit<PerformanceIssue, 'id' | 'detectedAt' | 'frequency'>): void {
    // Check if similar issue already exists recently
    const similarIssue = this.issues.find(issue => 
      issue.type === issueData.type && 
      Date.now() - issue.detectedAt < 60000 // Within last minute
    );
    
    if (similarIssue) {
      similarIssue.frequency++;
      return;
    }
    
    const issue: PerformanceIssue = {
      id: this.generateId(),
      detectedAt: Date.now(),
      frequency: 1,
      ...issueData
    };
    
    this.issues.push(issue);
    if (this.issues.length > this.ISSUE_HISTORY_LENGTH) {
      this.issues.shift();
    }
    
    console.warn('⚡ Performance issue detected:', issue);
    
    // Dispatch event for UI notification
    window.dispatchEvent(new CustomEvent('performance-issue', {
      detail: issue
    }));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API
  
  mark(name: string): void {
    if (this.config.enableUserTimingAPI) {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string): void {
    if (this.config.enableUserTimingAPI) {
      performance.measure(name, startMark, endMark);
    }
  }

  getMetrics(): PerformanceMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  getIssues(): PerformanceIssue[] {
    return [...this.issues];
  }

  getRecommendations(): string[] {
    const activeIssues = this.issues.filter(issue => 
      Date.now() - issue.detectedAt < 300000 // Last 5 minutes
    );
    
    return Array.from(new Set(activeIssues.map(issue => issue.recommendation)));
  }

  getPerformanceScore(): number {
    // Calculate overall performance score (0-100)
    let score = 100;
    
    // Frame rate impact
    if (this.metrics.render.fps < 60) {
      score -= (60 - this.metrics.render.fps) * 0.5;
    }
    
    // Memory impact
    const memoryUsagePercent = (this.metrics.memory.heapUsed / this.metrics.memory.heapLimit) * 100;
    if (memoryUsagePercent > 70) {
      score -= (memoryUsagePercent - 70) * 0.3;
    }
    
    // CPU impact
    if (this.metrics.cpu.utilization > 50) {
      score -= (this.metrics.cpu.utilization - 50) * 0.2;
    }
    
    // Network impact
    if (this.metrics.network.averageLatency > 500) {
      score -= (this.metrics.network.averageLatency - 500) * 0.01;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  clearHistory(): void {
    this.frameTimings = [];
    this.memorySnapshots = [];
    this.cpuSamples = [];
    this.networkRequests = [];
    this.issues = [];
    console.log('📊 Performance history cleared');
  }

  updateConfig(newConfig: Partial<ProfilerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart profiling if sampling rate changed
    if (this.isRunning && newConfig.samplingRate) {
      this.stopProfiling();
      this.startProfiling();
    }
  }

  dispose(): void {
    this.stopProfiling();
    
    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    this.clearHistory();
    console.log('📊 Performance profiler disposed');
  }
}

// Global instance for easy access
export const performanceProfiler = new PerformanceProfiler();

// Advanced Performance Optimizer Extension
export class PerformanceOptimizer {
  private bottlenecks: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();
  private optimizations: Map<string, boolean> = new Map();

  detectBottleneck(operation: string, duration: number): void {
    const existing = this.bottlenecks.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.bottlenecks.set(operation, existing);
    
    // Trigger optimization if bottleneck is significant
    if (existing.avgTime > 50 && existing.count > 5) {
      this.suggestOptimization(operation, existing);
    }
  }

  private suggestOptimization(operation: string, stats: { count: number; totalTime: number; avgTime: number }): void {
    if (this.optimizations.has(operation)) return;
    
    this.optimizations.set(operation, true);
    
    const suggestion = this.getOptimizationSuggestion(operation, stats);
    console.warn(`🚀 Optimization suggested for ${operation}:`, suggestion);
    
    window.dispatchEvent(new CustomEvent('performance-optimization', {
      detail: { operation, stats, suggestion }
    }));
  }

  private getOptimizationSuggestion(operation: string, stats: any): string {
    if (operation.includes('render')) {
      return 'Consider using requestAnimationFrame or virtual scrolling';
    } else if (operation.includes('network')) {
      return 'Implement request batching or caching strategies';
    } else if (operation.includes('calculation')) {
      return 'Move heavy calculations to web workers';
    } else if (operation.includes('dom')) {
      return 'Batch DOM updates or use document fragments';
    }
    return 'Profile and optimize this operation';
  }

  getBottleneckReport(): Array<{ operation: string; avgTime: number; count: number; severity: string }> {
    return Array.from(this.bottlenecks.entries()).map(([operation, stats]) => ({
      operation,
      avgTime: stats.avgTime,
      count: stats.count,
      severity: stats.avgTime > 100 ? 'critical' : stats.avgTime > 50 ? 'high' : 'medium'
    })).sort((a, b) => b.avgTime - a.avgTime);
  }

  async optimizeForDevice(): Promise<void> {
    // Device-specific optimizations
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    if (deviceMemory < 4) {
      // Low memory device optimizations
      window.dispatchEvent(new CustomEvent('enable-low-memory-mode'));
      console.log('🔧 Enabled low memory optimizations');
    }
    
    if (hardwareConcurrency < 4) {
      // Low CPU device optimizations
      window.dispatchEvent(new CustomEvent('enable-low-cpu-mode'));
      console.log('🔧 Enabled low CPU optimizations');
    }
  }

  clearOptimizations(): void {
    this.bottlenecks.clear();
    this.optimizations.clear();
    console.log('🧹 Performance optimizations cleared');
  }
}

export const performanceOptimizer = new PerformanceOptimizer(); 