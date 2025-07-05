/**
 * Performance monitoring and optimization utilities for EcoScan
 * Tracks metrics, optimizes resources, and provides insights
 */

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  // Core metrics
  modelLoadTime: number;
  inferenceTime: number;
  frameRate: number;
  memoryUsage: number;
  
  // User experience metrics
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  
  // Custom metrics
  cameraInitTime: number;
  detectionLatency: number;
  uiResponseTime: number;
  
  // Resource metrics
  networkLatency: number;
  bundleSize: number;
  assetLoadTime: number;
}

/**
 * Performance monitor class
 */
export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  constructor() {
    this.initializeObservers();
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.collectWebVitals();
    this.monitorResourceTiming();
    this.trackMemoryUsage();
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: keyof PerformanceMetrics, value: number): void {
    this.metrics[name] = value;
    
    // Log significant performance issues
    if (name === 'inferenceTime' && value > 500) {
      console.warn(`Slow inference detected: ${value}ms`);
    }
    
    if (name === 'memoryUsage' && value > 500) {
      console.warn(`High memory usage detected: ${value}MB`);
    }
  }

  /**
   * Start timing a metric
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name as keyof PerformanceMetrics, duration);
      return duration;
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const weights = {
      modelLoadTime: 0.2,
      inferenceTime: 0.3,
      frameRate: 0.2,
      memoryUsage: 0.1,
      firstContentfulPaint: 0.1,
      largestContentfulPaint: 0.1
    };

    let score = 100;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      const value = this.metrics[metric as keyof PerformanceMetrics];
      if (value !== undefined) {
        totalWeight += weight;
        
        // Score based on thresholds
        let metricScore = 100;
        switch (metric) {
          case 'modelLoadTime':
            metricScore = value < 2000 ? 100 : Math.max(0, 100 - (value - 2000) / 50);
            break;
          case 'inferenceTime':
            metricScore = value < 100 ? 100 : Math.max(0, 100 - (value - 100) / 10);
            break;
          case 'frameRate':
            metricScore = value > 25 ? 100 : (value / 25) * 100;
            break;
          case 'memoryUsage':
            metricScore = value < 200 ? 100 : Math.max(0, 100 - (value - 200) / 10);
            break;
          case 'firstContentfulPaint':
            metricScore = value < 1500 ? 100 : Math.max(0, 100 - (value - 1500) / 50);
            break;
          case 'largestContentfulPaint':
            metricScore = value < 2500 ? 100 : Math.max(0, 100 - (value - 2500) / 50);
            break;
        }
        
        score -= (100 - metricScore) * weight;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance insights
   */
  getInsights(): string[] {
    const insights: string[] = [];
    const metrics = this.metrics;

    if (metrics.modelLoadTime && metrics.modelLoadTime > 5000) {
      insights.push('Model loading is slow. Consider model optimization or caching.');
    }

    if (metrics.inferenceTime && metrics.inferenceTime > 200) {
      insights.push('Inference time is high. Consider using a smaller model or GPU acceleration.');
    }

    if (metrics.frameRate && metrics.frameRate < 15) {
      insights.push('Frame rate is low. Reduce processing frequency or optimize detection pipeline.');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 400) {
      insights.push('High memory usage detected. Consider memory optimization techniques.');
    }

    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 2000) {
      insights.push('Slow initial page load. Optimize critical resources and reduce bundle size.');
    }

    if (insights.length === 0) {
      insights.push('Performance looks good! All metrics are within acceptable ranges.');
    }

    return insights;
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('firstContentfulPaint', navEntry.loadEventEnd - navEntry.fetchStart);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
    } catch (error) {
      console.warn('Navigation timing observer not supported:', error);
    }

    // Paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('firstContentfulPaint', entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('Paint timing observer not supported:', error);
    }

    // Layout shift
    try {
      const layoutObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cumulativeLayoutShift', clsValue);
      });
      layoutObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(layoutObserver);
    } catch (error) {
      console.warn('Layout shift observer not supported:', error);
    }
  }

  /**
   * Collect Web Vitals
   */
  private collectWebVitals(): void {
    // First Input Delay
    if ('PerformanceEventTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = (entry as any).processingStart - entry.startTime;
            this.recordMetric('firstInputDelay', fid);
          }
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    }

    // Largest Contentful Paint
    if ('LargestContentfulPaint' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('largestContentfulPaint', lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }
  }

  /**
   * Monitor resource timing
   */
  private monitorResourceTiming(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Track model loading time
          if (resourceEntry.name.includes('.onnx')) {
            const loadTime = resourceEntry.responseEnd - resourceEntry.requestStart;
            this.recordMetric('modelLoadTime', loadTime);
          }
          
          // Track asset loading
          if (resourceEntry.name.includes('.js') || resourceEntry.name.includes('.css')) {
            const loadTime = resourceEntry.responseEnd - resourceEntry.requestStart;
            this.recordMetric('assetLoadTime', loadTime);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }
  }

  /**
   * Track memory usage
   */
  private trackMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const updateMemory = () => {
      if (this.isMonitoring) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        this.recordMetric('memoryUsage', usedMB);
        
        setTimeout(updateMemory, 5000); // Update every 5 seconds
      }
    };

    updateMemory();
  }
}

/**
 * Frame rate monitor
 */
export class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private isRunning = false;
  private animationId?: number;

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    
    const tick = (currentTime: number) => {
      if (!this.isRunning) return;
      
      this.frameCount++;
      
      if (currentTime - this.lastTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
      
      this.animationId = requestAnimationFrame(tick);
    };
    
    this.animationId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  getFPS(): number {
    return this.fps;
  }
}

/**
 * Resource optimizer
 */
export class ResourceOptimizer {
  private cache = new Map<string, any>();
  private preloadedResources = new Set<string>();

  /**
   * Preload critical resources
   */
  async preloadResources(urls: string[]): Promise<void> {
    const promises = urls.map(async (url) => {
      if (this.preloadedResources.has(url)) return;
      
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        this.cache.set(url, blob);
        this.preloadedResources.add(url);
      } catch (error) {
        console.warn(`Failed to preload resource: ${url}`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get cached resource
   */
  getCachedResource(url: string): any {
    return this.cache.get(url);
  }

  /**
   * Optimize images
   */
  optimizeImage(canvas: HTMLCanvasElement, quality = 0.8): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Reduce resolution for better performance
    const maxSize = 640;
    const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1);
    
    if (scale < 1) {
      const optimizedCanvas = document.createElement('canvas');
      const optimizedCtx = optimizedCanvas.getContext('2d')!;
      
      optimizedCanvas.width = canvas.width * scale;
      optimizedCanvas.height = canvas.height * scale;
      
      optimizedCtx.drawImage(canvas, 0, 0, optimizedCanvas.width, optimizedCanvas.height);
      return optimizedCanvas.toDataURL('image/jpeg', quality);
    }

    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    this.preloadedResources.clear();
  }
}

/**
 * Battery optimization
 */
export class BatteryOptimizer {
  private batteryLevel = 1;
  private isCharging = true;
  private optimizationLevel = 0; // 0: normal, 1: conservative, 2: aggressive

  async initialize(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;
        this.updateOptimizationLevel();

        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.updateOptimizationLevel();
        });

        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
          this.updateOptimizationLevel();
        });
      } catch (error) {
        console.warn('Battery API not supported:', error);
      }
    }
  }

  private updateOptimizationLevel(): void {
    if (this.isCharging) {
      this.optimizationLevel = 0; // Normal performance when charging
    } else if (this.batteryLevel < 0.2) {
      this.optimizationLevel = 2; // Aggressive optimization when low battery
    } else if (this.batteryLevel < 0.5) {
      this.optimizationLevel = 1; // Conservative optimization
    } else {
      this.optimizationLevel = 0; // Normal performance
    }
  }

  getOptimizationLevel(): number {
    return this.optimizationLevel;
  }

  getRecommendedFrameRate(): number {
    switch (this.optimizationLevel) {
      case 0: return 30; // Normal
      case 1: return 20; // Conservative
      case 2: return 10; // Aggressive
      default: return 30;
    }
  }

  getRecommendedInferenceInterval(): number {
    switch (this.optimizationLevel) {
      case 0: return 100; // Normal: every 100ms
      case 1: return 200; // Conservative: every 200ms
      case 2: return 500; // Aggressive: every 500ms
      default: return 100;
    }
  }
}

/**
 * Performance utilities
 */
export const PerformanceUtils = {
  /**
   * Measure async function performance
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    monitor?: PerformanceMonitor
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (monitor) {
        monitor.recordMetric(name as keyof PerformanceMetrics, duration);
      }
      console.log(`${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  /**
   * Check if device has good performance
   */
  isHighPerformanceDevice(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Check for dedicated GPU indicators
      return /nvidia|amd|intel iris|mali-g|adreno/i.test(renderer);
    }
    
    // Fallback: check memory
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit > 1000000000; // > 1GB
    }
    
    return navigator.hardwareConcurrency >= 4;
  },

  /**
   * Get device performance tier
   */
  getPerformanceTier(): 'low' | 'medium' | 'high' {
    const cores = navigator.hardwareConcurrency || 2;
    const hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
    const hasGoodMemory = 'memory' in performance && 
      (performance as any).memory.jsHeapSizeLimit > 500000000;

    if (cores >= 8 && hasWebGL2 && hasGoodMemory) return 'high';
    if (cores >= 4 && hasWebGL2) return 'medium';
    return 'low';
  }
};

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const frameRateMonitor = new FrameRateMonitor();
export const resourceOptimizer = new ResourceOptimizer();
export const batteryOptimizer = new BatteryOptimizer(); 