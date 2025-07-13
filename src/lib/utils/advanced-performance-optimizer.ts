/**
 * Advanced Performance Optimizer
 * Intelligent system that monitors performance metrics and automatically optimizes
 * the application based on device capabilities, battery level, and network conditions.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Performance metrics interfaces
interface PerformanceMetrics {
  fps: number;
  inferenceTime: number;
  memoryUsage: number;
  cpuUsage: number;
  batteryLevel: number;
  networkSpeed: number;
  deviceTier: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface OptimizationProfile {
  name: string;
  maxResolution: number;
  confidenceThreshold: number;
  maxFPS: number;
  enableGPUAcceleration: boolean;
  enableParallelProcessing: boolean;
  cacheSize: number;
  qualityLevel: 'low' | 'medium' | 'high';
}

interface OptimizationRecommendation {
  type: 'performance' | 'battery' | 'quality' | 'memory';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: () => void;
  estimatedImprovement: number;
}

// Performance metrics store
export const performanceMetrics = writable<PerformanceMetrics>({
  fps: 0,
  inferenceTime: 0,
  memoryUsage: 0,
  cpuUsage: 0,
  batteryLevel: 1,
  networkSpeed: 0,
  deviceTier: 'medium',
  timestamp: Date.now()
});

// Optimization profiles
const optimizationProfiles: Record<string, OptimizationProfile> = {
  'high-performance': {
    name: 'High Performance',
    maxResolution: 1920,
    confidenceThreshold: 0.3,
    maxFPS: 30,
    enableGPUAcceleration: true,
    enableParallelProcessing: true,
    cacheSize: 100,
    qualityLevel: 'high'
  },
  'balanced': {
    name: 'Balanced',
    maxResolution: 1280,
    confidenceThreshold: 0.5,
    maxFPS: 15,
    enableGPUAcceleration: true,
    enableParallelProcessing: false,
    cacheSize: 50,
    qualityLevel: 'medium'
  },
  'power-saver': {
    name: 'Power Saver',
    maxResolution: 640,
    confidenceThreshold: 0.7,
    maxFPS: 10,
    enableGPUAcceleration: false,
    enableParallelProcessing: false,
    cacheSize: 20,
    qualityLevel: 'low'
  },
  'low-end-device': {
    name: 'Low-End Device',
    maxResolution: 480,
    confidenceThreshold: 0.8,
    maxFPS: 5,
    enableGPUAcceleration: false,
    enableParallelProcessing: false,
    cacheSize: 10,
    qualityLevel: 'low'
  }
};

// Current optimization profile
export const currentProfile = writable<OptimizationProfile>(optimizationProfiles.balanced);

// Performance history for trend analysis
const performanceHistory = writable<PerformanceMetrics[]>([]);

// Optimization recommendations
export const optimizationRecommendations = writable<OptimizationRecommendation[]>([]);

class AdvancedPerformanceOptimizer {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private memoryMonitor: NodeJS.Timeout | null = null;
  private batteryAPI: any = null;
  private networkConnection: any = null;

  constructor() {
    if (browser) {
      this.initializeAPIs();
      this.setupPerformanceObserver();
    }
  }

  private async initializeAPIs() {
    try {
      // Battery API
      if ('getBattery' in navigator) {
        this.batteryAPI = await (navigator as any).getBattery();
      }

      // Network Connection API
      if ('connection' in navigator) {
        this.networkConnection = (navigator as any).connection;
      }
    } catch (error) {
      console.warn('Some performance APIs not available:', error);
    }
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    }
  }

  private processPerformanceEntries(entries: PerformanceEntry[]) {
    entries.forEach(entry => {
      if (entry.entryType === 'measure' && entry.name === 'ml-inference') {
        this.updateMetric('inferenceTime', entry.duration);
      }
    });
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Main monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.generateRecommendations();
    }, 1000);

    // Memory monitoring
    this.memoryMonitor = setInterval(() => {
      this.monitorMemoryUsage();
    }, 5000);

    console.log('Advanced Performance Optimizer started');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    console.log('Advanced Performance Optimizer stopped');
  }

  private collectMetrics() {
    const metrics: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      deviceTier: this.detectDeviceTier()
    };

    // Battery level
    if (this.batteryAPI) {
      metrics.batteryLevel = this.batteryAPI.level;
    }

    // Network speed
    if (this.networkConnection) {
      metrics.networkSpeed = this.networkConnection.downlink || 0;
    }

    // CPU usage estimation
    metrics.cpuUsage = this.estimateCPUUsage();

    // Update store
    performanceMetrics.update(current => ({
      ...current,
      ...metrics
    }));

    // Add to history
    performanceHistory.update(history => {
      const newHistory = [...history, { ...get(performanceMetrics) }];
      // Keep only last 100 entries
      return newHistory.slice(-100);
    });
  }

     private detectDeviceTier(): 'low' | 'medium' | 'high' {
     const canvas = document.createElement('canvas');
     const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
     
     if (!gl) return 'low';

     const webglContext = gl as WebGLRenderingContext;
     const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
     const renderer = debugInfo ? webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // Memory estimation
    const memoryInfo = (performance as any).memory;
    const totalMemory = memoryInfo ? memoryInfo.totalJSHeapSize : 0;
    
    // Core count
    const coreCount = navigator.hardwareConcurrency || 1;
    
    // Device tier calculation
    const score = (
      (totalMemory > 100000000 ? 2 : totalMemory > 50000000 ? 1 : 0) +
      (coreCount >= 8 ? 2 : coreCount >= 4 ? 1 : 0) +
      (renderer.includes('Apple') || renderer.includes('NVIDIA') || renderer.includes('AMD') ? 1 : 0)
    );

    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private estimateCPUUsage(): number {
    const start = performance.now();
    
    // Perform a CPU-intensive task
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      result += Math.random() * Math.random();
    }
    
    const duration = performance.now() - start;
    
    // Normalize to 0-1 range (higher duration = higher CPU usage)
    return Math.min(duration / 100, 1);
  }

  private monitorMemoryUsage() {
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const usedMemory = memoryInfo.usedJSHeapSize;
      const totalMemory = memoryInfo.totalJSHeapSize;
      
      const memoryUsage = usedMemory / totalMemory;
      
      this.updateMetric('memoryUsage', memoryUsage);
    }
  }

  private updateMetric(metric: keyof PerformanceMetrics, value: number) {
    performanceMetrics.update(current => ({
      ...current,
      [metric]: value,
      timestamp: Date.now()
    }));
  }

  private analyzePerformance() {
    const metrics = get(performanceMetrics);
    const history = get(performanceHistory);
    
    if (history.length < 5) return; // Need some history for analysis
    
    // Detect performance trends
    const recentMetrics = history.slice(-10);
    const avgFPS = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
    const avgInferenceTime = recentMetrics.reduce((sum, m) => sum + m.inferenceTime, 0) / recentMetrics.length;
    
    // Auto-adjust profile based on performance
    if (avgFPS < 10 && avgInferenceTime > 200) {
      this.switchToProfile('power-saver');
    } else if (avgFPS > 20 && avgInferenceTime < 50 && metrics.batteryLevel > 0.5) {
      this.switchToProfile('high-performance');
    } else if (metrics.batteryLevel < 0.2) {
      this.switchToProfile('power-saver');
    } else if (metrics.deviceTier === 'low') {
      this.switchToProfile('low-end-device');
    }
  }

  private generateRecommendations() {
    const metrics = get(performanceMetrics);
    const recommendations: OptimizationRecommendation[] = [];

    // Memory usage recommendations
    if (metrics.memoryUsage > 0.8) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        title: 'High Memory Usage Detected',
        description: 'Consider reducing cache size or switching to power-saver mode',
        action: () => this.switchToProfile('power-saver'),
        estimatedImprovement: 0.3
      });
    }

    // Battery recommendations
    if (metrics.batteryLevel < 0.3) {
      recommendations.push({
        type: 'battery',
        priority: 'medium',
        title: 'Low Battery Detected',
        description: 'Switch to power-saver mode to extend battery life',
        action: () => this.switchToProfile('power-saver'),
        estimatedImprovement: 0.4
      });
    }

    // Performance recommendations
    if (metrics.fps < 10) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Low Frame Rate Detected',
        description: 'Reduce resolution or switch to balanced mode',
        action: () => this.switchToProfile('balanced'),
        estimatedImprovement: 0.5
      });
    }

    // Network recommendations
    if (metrics.networkSpeed < 1) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Network Connection',
        description: 'Enable offline mode and reduce cloud features',
        action: () => this.enableOfflineMode(),
        estimatedImprovement: 0.2
      });
    }

    optimizationRecommendations.set(recommendations);
  }

  switchToProfile(profileName: string) {
    const profile = optimizationProfiles[profileName];
    if (!profile) return;

    currentProfile.set(profile);
    
    // Apply profile settings
    this.applyProfileSettings(profile);
    
    console.log(`Switched to ${profile.name} profile`);
  }

  private applyProfileSettings(profile: OptimizationProfile) {
    // These would be applied to the ML system, camera, etc.
    // For now, we'll just log the settings
    console.log('Applied profile settings:', profile);
    
    // Dispatch custom event for other components to listen
    if (browser) {
      window.dispatchEvent(new CustomEvent('profile-changed', { detail: profile }));
    }
  }

  private enableOfflineMode() {
    // Enable offline mode functionality
    console.log('Enabling offline mode');
    
    if (browser) {
      window.dispatchEvent(new CustomEvent('enable-offline-mode'));
    }
  }

  getPerformanceScore(): number {
    const metrics = get(performanceMetrics);
    const history = get(performanceHistory);
    
    if (history.length === 0) return 50; // Default score
    
    // Calculate weighted score based on multiple factors
    const fpsScore = Math.min(metrics.fps / 30, 1) * 30;
    const inferenceScore = Math.max(0, 1 - metrics.inferenceTime / 500) * 25;
    const memoryScore = Math.max(0, 1 - metrics.memoryUsage) * 20;
    const batteryScore = metrics.batteryLevel * 15;
    const networkScore = Math.min(metrics.networkSpeed / 10, 1) * 10;
    
    return Math.round(fpsScore + inferenceScore + memoryScore + batteryScore + networkScore);
  }

  getOptimizationProfile(name: string): OptimizationProfile | undefined {
    return optimizationProfiles[name];
  }

  getAllProfiles(): OptimizationProfile[] {
    return Object.values(optimizationProfiles);
  }

  // Method to update FPS from external components
  updateFPS(fps: number) {
    this.updateMetric('fps', fps);
  }

  // Method to update inference time from ML components
  updateInferenceTime(time: number) {
    this.updateMetric('inferenceTime', time);
  }

  // Get performance trend analysis
  getPerformanceTrend(): { trend: 'improving' | 'stable' | 'degrading', confidence: number } {
    const history = get(performanceHistory);
    
    if (history.length < 10) {
      return { trend: 'stable', confidence: 0 };
    }
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.fps, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    const confidence = Math.abs(change);
    
    if (change > 0.1) {
      return { trend: 'improving', confidence: Math.min(confidence, 1) };
    } else if (change < -0.1) {
      return { trend: 'degrading', confidence: Math.min(confidence, 1) };
    } else {
      return { trend: 'stable', confidence: 1 - confidence };
    }
  }
}

// Create singleton instance
export const advancedPerformanceOptimizer = new AdvancedPerformanceOptimizer();

// Derived stores for computed values
export const performanceScore = derived(
  [performanceMetrics, performanceHistory],
  () => advancedPerformanceOptimizer.getPerformanceScore()
);

export const performanceTrend = derived(
  performanceHistory,
  () => advancedPerformanceOptimizer.getPerformanceTrend()
);

export const deviceInfo = derived(
  performanceMetrics,
  (metrics) => ({
    tier: metrics.deviceTier,
    batteryLevel: metrics.batteryLevel,
    networkSpeed: metrics.networkSpeed,
    memoryUsage: metrics.memoryUsage,
    cpuUsage: metrics.cpuUsage
  })
);

// Auto-start monitoring when imported
if (browser) {
  advancedPerformanceOptimizer.startMonitoring();
} 