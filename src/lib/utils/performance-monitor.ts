/**
 * Comprehensive Performance Monitoring System
 * Tracks camera, ML, and application performance metrics
 */

import { writable, derived } from 'svelte/store';
import { isBrowser } from './browser.js';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'camera' | 'ml' | 'ui' | 'network' | 'memory';
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: Record<string, PerformanceMetric>;
  summary: {
    fps: number;
    averageInferenceTime: number;
    memoryUsage: number;
    cameraHealth: 'excellent' | 'good' | 'poor' | 'critical';
    mlPerformance: 'excellent' | 'good' | 'poor' | 'critical';
    overallScore: number;
  };
}

// Performance metrics store
export const performanceMetrics = writable<Record<string, PerformanceMetric>>({});
export const performanceHistory = writable<PerformanceSnapshot[]>([]);

// Real-time derived metrics
export const currentFPS = derived(performanceMetrics, ($metrics) => 
  $metrics.fps?.value || 0
);

export const currentInferenceTime = derived(performanceMetrics, ($metrics) => 
  $metrics.inferenceTime?.value || 0
);

export const memoryPressure = derived(performanceMetrics, ($metrics) => 
  $metrics.memoryUsage?.value || 0
);

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private timers: Map<string, number> = new Map();
  private intervals: Map<string, number> = new Map();
  private frameCount = 0;
  private lastFrameTime = 0;
  private inferenceHistory: number[] = [];
  private memoryHistory: number[] = [];

  constructor() {
    if (isBrowser()) {
      this.startContinuousMonitoring();
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a performance timer and record the metric
   */
  endTimer(name: string, category: PerformanceMetric['category'] = 'ui'): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.recordMetric(name, duration, 'ms', category);
    this.timers.delete(name);
    
    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string, 
    value: number, 
    unit: string, 
    category: PerformanceMetric['category']
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      category
    };

    this.metrics.set(name, metric);
    
    // Update store
    performanceMetrics.update(current => ({
      ...current,
      [name]: metric
    }));

    // Maintain history for specific metrics
    this.updateHistory(name, value);
  }

  /**
   * Record camera frame for FPS calculation
   */
  recordFrame(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameDelta = now - this.lastFrameTime;
      const fps = 1000 / frameDelta;
      
      this.frameCount++;
      
      // Update FPS every 30 frames for smoother average
      if (this.frameCount % 30 === 0) {
        this.recordMetric('fps', fps, 'fps', 'camera');
      }
    }
    this.lastFrameTime = now;
  }

  /**
   * Record ML inference time
   */
  recordInference(duration: number): void {
    this.recordMetric('inferenceTime', duration, 'ms', 'ml');
    
    // Keep rolling average of last 10 inferences
    this.inferenceHistory.push(duration);
    if (this.inferenceHistory.length > 10) {
      this.inferenceHistory.shift();
    }
    
    const avgInference = this.inferenceHistory.reduce((a, b) => a + b, 0) / this.inferenceHistory.length;
    this.recordMetric('averageInferenceTime', avgInference, 'ms', 'ml');
  }

  /**
   * Monitor memory usage
   */
  private monitorMemory(): void {
    if (!isBrowser()) return;

    try {
      // Modern browsers support performance.memory
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const totalMB = memory.totalJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        
        this.recordMetric('memoryUsage', usedMB, 'MB', 'memory');
        this.recordMetric('memoryTotal', totalMB, 'MB', 'memory');
        this.recordMetric('memoryLimit', limitMB, 'MB', 'memory');
        this.recordMetric('memoryUsagePercent', (usedMB / limitMB) * 100, '%', 'memory');
        
        // Track memory pressure
        this.memoryHistory.push(usedMB);
        if (this.memoryHistory.length > 20) {
          this.memoryHistory.shift();
        }
      }
    } catch (error) {
      console.warn('Memory monitoring failed:', error);
    }
  }

  /**
   * Monitor network performance
   */
  private monitorNetwork(): void {
    if (!isBrowser()) return;

    try {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        this.recordMetric('networkDownlink', connection.downlink || 0, 'Mbps', 'network');
        this.recordMetric('networkRTT', connection.rtt || 0, 'ms', 'network');
        this.recordMetric('networkEffectiveType', 
          this.mapEffectiveType(connection.effectiveType), 'score', 'network');
      }
    } catch (error) {
      console.warn('Network monitoring failed:', error);
    }
  }

  /**
   * Map network effective type to numeric score
   */
  private mapEffectiveType(type: string): number {
    switch (type) {
      case '4g': return 4;
      case '3g': return 3;
      case '2g': return 2;
      case 'slow-2g': return 1;
      default: return 0;
    }
  }

  /**
   * Monitor camera stream health
   */
  monitorCameraStream(stream: MediaStream | null): void {
    if (!stream) {
      this.recordMetric('cameraHealth', 0, 'score', 'camera');
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      this.recordMetric('cameraHealth', 0, 'score', 'camera');
      return;
    }

    const settings = videoTrack.getSettings();
    const constraints = videoTrack.getConstraints();
    
    // Score camera health based on various factors
    let healthScore = 100;
    
    // Check if stream is active
    if (videoTrack.readyState !== 'live') {
      healthScore -= 50;
    }
    
    // Check resolution quality
    const resolution = (settings.width || 0) * (settings.height || 0);
    if (resolution < 640 * 480) {
      healthScore -= 20;
    }
    
    // Check frame rate
    if ((settings.frameRate || 0) < 15) {
      healthScore -= 15;
    }
    
    this.recordMetric('cameraHealth', Math.max(0, healthScore), 'score', 'camera');
    this.recordMetric('cameraResolutionPixels', resolution, 'pixels', 'camera');
    this.recordMetric('cameraFrameRate', settings.frameRate || 0, 'fps', 'camera');
  }

  /**
   * Update metric history
   */
  private updateHistory(name: string, value: number): void {
    // Only track history for key metrics to avoid memory bloat
    const trackedMetrics = ['fps', 'inferenceTime', 'memoryUsage', 'cameraHealth'];
    if (!trackedMetrics.includes(name)) return;

    // Implementation would store in a rolling buffer
    // For now, just log significant changes
    const current = this.metrics.get(name);
    if (current && Math.abs(current.value - value) > value * 0.1) {
      console.log(`📊 Significant change in ${name}: ${current.value.toFixed(1)} → ${value.toFixed(1)}`);
    }
  }

  /**
   * Generate performance snapshot
   */
  generateSnapshot(): PerformanceSnapshot {
    const metrics = Object.fromEntries(this.metrics);
    
    // Calculate summary scores
    const fps = this.metrics.get('fps')?.value || 0;
    const inferenceTime = this.metrics.get('averageInferenceTime')?.value || 0;
    const memoryUsage = this.metrics.get('memoryUsagePercent')?.value || 0;
    const cameraHealth = this.metrics.get('cameraHealth')?.value || 0;
    
    // Score ML performance
    let mlScore = 100;
    if (inferenceTime > 200) mlScore -= 40;
    else if (inferenceTime > 100) mlScore -= 20;
    else if (inferenceTime > 50) mlScore -= 10;
    
    // Overall score calculation
    const overallScore = Math.round((
      (fps / 30) * 25 +           // 25% weight for FPS
      (mlScore / 100) * 30 +      // 30% weight for ML performance
      (cameraHealth / 100) * 25 + // 25% weight for camera health
      ((100 - memoryUsage) / 100) * 20 // 20% weight for memory efficiency
    ));

    return {
      timestamp: Date.now(),
      metrics,
      summary: {
        fps: Math.round(fps),
        averageInferenceTime: Math.round(inferenceTime),
        memoryUsage: Math.round(memoryUsage),
        cameraHealth: this.scoreToRating(cameraHealth),
        mlPerformance: this.scoreToRating(mlScore),
        overallScore: Math.max(0, Math.min(100, overallScore))
      }
    };
  }

  /**
   * Convert numeric score to rating
   */
  private scoreToRating(score: number): 'excellent' | 'good' | 'poor' | 'critical' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 30) return 'poor';
    return 'critical';
  }

  /**
   * Start continuous monitoring
   */
  private startContinuousMonitoring(): void {
    // Monitor memory every 5 seconds
    this.intervals.set('memory', window.setInterval(() => {
      this.monitorMemory();
    }, 5000));

    // Monitor network every 10 seconds
    this.intervals.set('network', window.setInterval(() => {
      this.monitorNetwork();
    }, 10000));

    // Generate snapshots every 30 seconds
    this.intervals.set('snapshot', window.setInterval(() => {
      const snapshot = this.generateSnapshot();
      performanceHistory.update(history => {
        const newHistory = [...history, snapshot];
        // Keep only last 20 snapshots (10 minutes)
        return newHistory.slice(-20);
      });
    }, 30000));
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    this.timers.clear();
  }

  /**
   * Get current performance report
   */
  getReport(): {
    status: 'excellent' | 'good' | 'poor' | 'critical';
    issues: string[];
    recommendations: string[];
    metrics: Record<string, PerformanceMetric>;
  } {
    const fps = this.metrics.get('fps')?.value || 0;
    const inferenceTime = this.metrics.get('averageInferenceTime')?.value || 0;
    const memoryUsage = this.metrics.get('memoryUsagePercent')?.value || 0;
    const cameraHealth = this.metrics.get('cameraHealth')?.value || 0;
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (fps < 15) {
      issues.push('Low frame rate detected');
      recommendations.push('Close other applications to improve camera performance');
    }
    
    if (inferenceTime > 200) {
      issues.push('Slow AI inference');
      recommendations.push('Consider using a more powerful device for better performance');
    }
    
    if (memoryUsage > 80) {
      issues.push('High memory usage');
      recommendations.push('Close other browser tabs to free up memory');
    }
    
    if (cameraHealth < 50) {
      issues.push('Camera quality issues');
      recommendations.push('Check camera settings and ensure good lighting');
    }
    
    let status: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';
    if (issues.length > 2) status = 'critical';
    else if (issues.length > 1) status = 'poor';
    else if (issues.length > 0) status = 'good';
    
    return {
      status,
      issues,
      recommendations,
      metrics: Object.fromEntries(this.metrics)
    };
  }
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Convenience functions for common operations
 */
export const perf = {
  start: (name: string) => getPerformanceMonitor().startTimer(name),
  end: (name: string, category?: PerformanceMetric['category']) => 
    getPerformanceMonitor().endTimer(name, category),
  record: (name: string, value: number, unit: string, category: PerformanceMetric['category']) =>
    getPerformanceMonitor().recordMetric(name, value, unit, category),
  frame: () => getPerformanceMonitor().recordFrame(),
  inference: (duration: number) => getPerformanceMonitor().recordInference(duration),
  camera: (stream: MediaStream | null) => getPerformanceMonitor().monitorCameraStream(stream),
  report: () => getPerformanceMonitor().getReport(),
  snapshot: () => getPerformanceMonitor().generateSnapshot()
}; 