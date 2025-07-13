/**
 * Advanced Performance Optimizer for EcoScan
 * 
 * Implements comprehensive performance optimization strategies:
 * - Real-time performance monitoring and adjustment
 * - Adaptive quality scaling based on device capabilities
 * - Intelligent resource management and cleanup
 * - Battery-aware optimizations for mobile devices
 * - Performance profiling and bottleneck detection
 * 
 * Targets from PRD:
 * - Initial Load Time: <3 seconds
 * - Model Load Time: <5 seconds  
 * - Inference Latency: <100ms per frame
 * - Frame Rate: >15 FPS on mobile
 * - Memory Usage: <200MB peak
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';

// Performance metrics interfaces
export interface PerformanceMetrics {
  fps: number;
  inferenceTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  deviceTier: 'low' | 'mid' | 'high';
  networkSpeed: 'slow' | 'fast' | 'unknown';
  timestamp: number;
}

export interface OptimizationProfile {
  id: string;
  name: string;
  targetFPS: number;
  maxInferenceTime: number;
  modelSize: 'small' | 'medium' | 'large';
  confidenceThreshold: number;
  maxDetections: number;
  skipFrames: number;
  useWebGL: boolean;
  enableProfiling: boolean;
}

export interface PerformanceReport {
  overallScore: number;
  bottlenecks: string[];
  recommendations: string[];
  optimizationImpact: Record<string, number>;
  trend: 'improving' | 'stable' | 'degrading';
}

// Predefined optimization profiles
const OPTIMIZATION_PROFILES: Record<string, OptimizationProfile> = {
  'high-performance': {
    id: 'high-performance',
    name: 'High Performance',
    targetFPS: 30,
    maxInferenceTime: 50,
    modelSize: 'large',
    confidenceThreshold: 0.5,
    maxDetections: 20,
    skipFrames: 0,
    useWebGL: true,
    enableProfiling: true
  },
  'balanced': {
    id: 'balanced',
    name: 'Balanced',
    targetFPS: 20,
    maxInferenceTime: 100,
    modelSize: 'medium',
    confidenceThreshold: 0.6,
    maxDetections: 15,
    skipFrames: 1,
    useWebGL: true,
    enableProfiling: false
  },
  'power-saver': {
    id: 'power-saver',
    name: 'Power Saver',
    targetFPS: 10,
    maxInferenceTime: 200,
    modelSize: 'small',
    confidenceThreshold: 0.7,
    maxDetections: 10,
    skipFrames: 2,
    useWebGL: false,
    enableProfiling: false
  }
};

class AdvancedPerformanceOptimizer {
  private metrics: PerformanceMetrics[] = [];
  private currentProfile: OptimizationProfile = OPTIMIZATION_PROFILES['balanced'];
  private isMonitoring = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private inferenceHistory: number[] = [];
  private memoryHistory: number[] = [];
  private batteryAPI?: any;
  private networkConnection?: any;
  private performanceObserver?: PerformanceObserver;
  private optimizationCallbacks: Array<(profile: OptimizationProfile) => void> = [];

  // Reactive stores
  private _currentMetrics = writable<PerformanceMetrics | null>(null);
  private _activeProfile = writable<OptimizationProfile>(this.currentProfile);
  private _performanceReport = writable<PerformanceReport | null>(null);

  public readonly currentMetrics: Readable<PerformanceMetrics | null> = this._currentMetrics;
  public readonly activeProfile: Readable<OptimizationProfile> = this._activeProfile;
  public readonly performanceReport: Readable<PerformanceReport | null> = this._performanceReport;

  constructor() {
    if (browser) {
      this.initializeAPIs();
      this.detectDeviceCapabilities();
      this.setupPerformanceObserver();
    }
  }

  private initializeAPIs(): void {
    // Initialize Battery API if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryAPI = battery;
        battery.addEventListener('levelchange', () => this.handleBatteryChange());
        battery.addEventListener('chargingchange', () => this.handleBatteryChange());
      });
    }

    // Initialize Network Information API
    if ('connection' in navigator) {
      this.networkConnection = (navigator as any).connection;
      this.networkConnection.addEventListener('change', () => this.handleNetworkChange());
    }
  }

  private detectDeviceCapabilities(): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    let deviceTier: 'low' | 'mid' | 'high' = 'mid';
    
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      // Simple device tier detection based on GPU info
      if (renderer.includes('Mali-400') || renderer.includes('Adreno 3')) {
        deviceTier = 'low';
      } else if (renderer.includes('Adreno 6') || renderer.includes('Mali-G7')) {
        deviceTier = 'high';
      }
    }

    // Adjust initial profile based on device tier
    if (deviceTier === 'low') {
      this.setOptimizationProfile('power-saver');
    } else if (deviceTier === 'high') {
      this.setOptimizationProfile('high-performance');
    }
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.handlePerformanceMeasure(entry);
          }
        }
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  private handlePerformanceMeasure(entry: PerformanceEntry): void {
    if (entry.name === 'ml-inference') {
      this.recordInferenceTime(entry.duration);
    } else if (entry.name === 'frame-processing') {
      this.recordFrameTime(entry.duration);
    }
  }

  private handleBatteryChange(): void {
    if (this.batteryAPI) {
      const level = this.batteryAPI.level;
      const charging = this.batteryAPI.charging;
      
      // Switch to power-saver mode if battery is low and not charging
      if (level < 0.2 && !charging && this.currentProfile.id !== 'power-saver') {
        this.setOptimizationProfile('power-saver');
      }
    }
  }

  private handleNetworkChange(): void {
    if (this.networkConnection) {
      const effectiveType = this.networkConnection.effectiveType;
      
      // Adjust optimizations based on network speed
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        this.setOptimizationProfile('power-saver');
      }
    }
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.scheduleMetricsCollection();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  private scheduleMetricsCollection(): void {
    if (!this.isMonitoring) return;
    
    requestAnimationFrame(() => {
      this.collectMetrics();
      this.scheduleMetricsCollection();
    });
  }

  private collectMetrics(): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // Calculate FPS
    const fps = 1000 / deltaTime;
    this.frameCount++;
    
    // Get memory usage
    const memoryUsage = this.getMemoryUsage();
    
    // Get battery level
    const batteryLevel = this.batteryAPI?.level;
    
    // Determine device tier and network speed
    const deviceTier = this.getCurrentDeviceTier();
    const networkSpeed = this.getNetworkSpeed();
    
    const metrics: PerformanceMetrics = {
      fps,
      inferenceTime: this.getAverageInferenceTime(),
      memoryUsage,
      batteryLevel,
      deviceTier,
      networkSpeed,
      timestamp: now
    };
    
    this.metrics.push(metrics);
    this._currentMetrics.set(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
    
    // Auto-optimize based on metrics
    this.autoOptimize(metrics);
    
    // Generate performance report every 30 frames
    if (this.frameCount % 30 === 0) {
      this.generatePerformanceReport();
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private getCurrentDeviceTier(): 'low' | 'mid' | 'high' {
    const avgFPS = this.getAverageFPS();
    const avgInference = this.getAverageInferenceTime();
    
    if (avgFPS < 15 || avgInference > 200) {
      return 'low';
    } else if (avgFPS > 25 && avgInference < 100) {
      return 'high';
    }
    return 'mid';
  }

  private getNetworkSpeed(): 'slow' | 'fast' | 'unknown' {
    if (this.networkConnection) {
      const effectiveType = this.networkConnection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      } else if (effectiveType === '4g' || effectiveType === '5g') {
        return 'fast';
      }
    }
    return 'unknown';
  }

  private getAverageFPS(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.fps, 0);
    return sum / recentMetrics.length;
  }

  private getAverageInferenceTime(): number {
    if (this.inferenceHistory.length === 0) return 0;
    
    const recent = this.inferenceHistory.slice(-10);
    const sum = recent.reduce((acc, time) => acc + time, 0);
    return sum / recent.length;
  }

  public recordInferenceTime(time: number): void {
    this.inferenceHistory.push(time);
    if (this.inferenceHistory.length > 50) {
      this.inferenceHistory.shift();
    }
  }

  public recordFrameTime(time: number): void {
    // Used for frame processing time tracking
    performance.mark('frame-end');
    performance.measure('frame-processing', 'frame-start', 'frame-end');
  }

  private autoOptimize(metrics: PerformanceMetrics): void {
    const avgFPS = this.getAverageFPS();
    const avgInference = this.getAverageInferenceTime();
    
    // Performance degradation detection
    if (avgFPS < this.currentProfile.targetFPS * 0.8 || 
        avgInference > this.currentProfile.maxInferenceTime * 1.2) {
      
      // Try to downgrade profile
      if (this.currentProfile.id === 'high-performance') {
        this.setOptimizationProfile('balanced');
      } else if (this.currentProfile.id === 'balanced') {
        this.setOptimizationProfile('power-saver');
      }
    }
    
    // Performance improvement detection
    else if (avgFPS > this.currentProfile.targetFPS * 1.2 && 
             avgInference < this.currentProfile.maxInferenceTime * 0.8) {
      
      // Try to upgrade profile
      if (this.currentProfile.id === 'power-saver') {
        this.setOptimizationProfile('balanced');
      } else if (this.currentProfile.id === 'balanced') {
        this.setOptimizationProfile('high-performance');
      }
    }
  }

  public setOptimizationProfile(profileId: string): void {
    const profile = OPTIMIZATION_PROFILES[profileId];
    if (!profile) return;
    
    this.currentProfile = profile;
    this._activeProfile.set(profile);
    
    // Notify callbacks
    this.optimizationCallbacks.forEach(callback => callback(profile));
  }

  public onOptimizationChange(callback: (profile: OptimizationProfile) => void): void {
    this.optimizationCallbacks.push(callback);
  }

  public getOptimizationProfiles(): OptimizationProfile[] {
    return Object.values(OPTIMIZATION_PROFILES);
  }

  private generatePerformanceReport(): void {
    const recentMetrics = this.metrics.slice(-30);
    if (recentMetrics.length < 10) return;
    
    const avgFPS = recentMetrics.reduce((acc, m) => acc + m.fps, 0) / recentMetrics.length;
    const avgInference = recentMetrics.reduce((acc, m) => acc + m.inferenceTime, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((acc, m) => acc + m.memoryUsage, 0) / recentMetrics.length;
    
    // Calculate performance score (0-100)
    const fpsScore = Math.min(avgFPS / 30 * 100, 100);
    const inferenceScore = Math.max(0, 100 - (avgInference / 100) * 100);
    const memoryScore = Math.max(0, 100 - (avgMemory / 200) * 100);
    const overallScore = (fpsScore + inferenceScore + memoryScore) / 3;
    
    // Identify bottlenecks
    const bottlenecks: string[] = [];
    if (avgFPS < 15) bottlenecks.push('Low frame rate');
    if (avgInference > 150) bottlenecks.push('Slow inference');
    if (avgMemory > 150) bottlenecks.push('High memory usage');
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (avgFPS < 15) recommendations.push('Consider reducing detection frequency');
    if (avgInference > 150) recommendations.push('Switch to smaller model or reduce confidence threshold');
    if (avgMemory > 150) recommendations.push('Enable aggressive garbage collection');
    
    // Calculate optimization impact
    const optimizationImpact = {
      'profile-change': this.calculateProfileChangeImpact(),
      'frame-skipping': this.calculateFrameSkippingImpact(),
      'memory-cleanup': this.calculateMemoryCleanupImpact()
    };
    
    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentMetrics.length >= 20) {
      const firstHalf = recentMetrics.slice(0, 10);
      const secondHalf = recentMetrics.slice(10);
      
      const firstAvgFPS = firstHalf.reduce((acc, m) => acc + m.fps, 0) / firstHalf.length;
      const secondAvgFPS = secondHalf.reduce((acc, m) => acc + m.fps, 0) / secondHalf.length;
      
      if (secondAvgFPS > firstAvgFPS * 1.1) {
        trend = 'improving';
      } else if (secondAvgFPS < firstAvgFPS * 0.9) {
        trend = 'degrading';
      }
    }
    
    const report: PerformanceReport = {
      overallScore,
      bottlenecks,
      recommendations,
      optimizationImpact,
      trend
    };
    
    this._performanceReport.set(report);
  }

  private calculateProfileChangeImpact(): number {
    // Estimate impact of changing optimization profile
    const currentTier = this.getCurrentDeviceTier();
    switch (currentTier) {
      case 'low': return 15;
      case 'mid': return 25;
      case 'high': return 35;
      default: return 20;
    }
  }

  private calculateFrameSkippingImpact(): number {
    // Estimate impact of frame skipping
    const avgFPS = this.getAverageFPS();
    return Math.min(avgFPS * 0.3, 20);
  }

  private calculateMemoryCleanupImpact(): number {
    // Estimate impact of memory cleanup
    const recentMetrics = this.metrics.slice(-10);
    const avgMemory = recentMetrics.reduce((acc, m) => acc + m.memoryUsage, 0) / recentMetrics.length;
    return Math.min(avgMemory * 0.1, 10);
  }

  public cleanup(): void {
    this.stopMonitoring();
    this.performanceObserver?.disconnect();
    this.optimizationCallbacks = [];
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public exportPerformanceData(): any {
    return {
      metrics: this.metrics,
      currentProfile: this.currentProfile,
      inferenceHistory: this.inferenceHistory,
      memoryHistory: this.memoryHistory,
      timestamp: Date.now()
    };
  }
}

// Singleton instance
export const performanceOptimizer = new AdvancedPerformanceOptimizer();

// Utility functions
export function withPerformanceTracking<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  performance.mark(`${name}-start`);
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    });
  } else {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }
}

export function createPerformanceMiddleware() {
  return {
    beforeInference: () => {
      performance.mark('ml-inference-start');
    },
    afterInference: () => {
      performance.mark('ml-inference-end');
      performance.measure('ml-inference', 'ml-inference-start', 'ml-inference-end');
    }
  };
} 