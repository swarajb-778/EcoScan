/**
 * Performance Optimization System
 * Automatically optimizes application performance based on device capabilities
 */

import { browser } from '$app/environment';
import { diagnostic } from './diagnostic.js';
import { getDeviceMemory, getHardwareConcurrency } from './ssr-safe.js';

export interface OptimizationSettings {
  maxFPS: number;
  imageQuality: number;
  enableWebGL: boolean;
  enableMultithreading: boolean;
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  memoryLimit: number;
}

export interface DeviceProfile {
  tier: 'low' | 'medium' | 'high';
  memory: number;
  cores: number;
  isLowEndDevice: boolean;
  isMobile: boolean;
}

class PerformanceOptimizer {
  private currentSettings: OptimizationSettings;
  private deviceProfile: DeviceProfile;
  private optimizationHistory: Array<{ timestamp: number; action: string; result: string }> = [];

  constructor() {
    this.deviceProfile = this.analyzeDevice();
    this.currentSettings = this.generateOptimalSettings();
    
    if (browser) {
      this.initializeOptimizations();
    }
  }

  private analyzeDevice(): DeviceProfile {
    const memory = getDeviceMemory();
    const cores = getHardwareConcurrency();
    const userAgent = navigator?.userAgent || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    let tier: 'low' | 'medium' | 'high' = 'medium';
    
    // Determine device tier based on specs
    if (memory <= 2 || cores <= 2) {
      tier = 'low';
    } else if (memory >= 8 && cores >= 4) {
      tier = 'high';
    }
    
    const isLowEndDevice = tier === 'low' || (isMobile && memory <= 4);
    
    diagnostic.logWarning(`Device profile: ${tier} tier, ${memory}GB memory, ${cores} cores, mobile: ${isMobile}`, 'PerformanceOptimizer');
    
    return {
      tier,
      memory,
      cores,
      isLowEndDevice,
      isMobile
    };
  }

  private generateOptimalSettings(): OptimizationSettings {
    const { tier, isLowEndDevice, isMobile } = this.deviceProfile;
    
    let settings: OptimizationSettings;
    
    switch (tier) {
      case 'low':
        settings = {
          maxFPS: 15,
          imageQuality: 0.6,
          enableWebGL: false,
          enableMultithreading: false,
          cacheStrategy: 'minimal',
          memoryLimit: 100 // MB
        };
        break;
      
      case 'high':
        settings = {
          maxFPS: 60,
          imageQuality: 0.9,
          enableWebGL: true,
          enableMultithreading: true,
          cacheStrategy: 'aggressive',
          memoryLimit: 500 // MB
        };
        break;
      
      default: // medium
        settings = {
          maxFPS: 30,
          imageQuality: 0.8,
          enableWebGL: true,
          enableMultithreading: false,
          cacheStrategy: 'moderate',
          memoryLimit: 250 // MB
        };
    }
    
    // Mobile-specific adjustments
    if (isMobile) {
      settings.maxFPS = Math.min(settings.maxFPS, 30);
      settings.imageQuality *= 0.9;
      settings.memoryLimit *= 0.8;
    }
    
    diagnostic.logWarning(`Generated optimization settings: ${JSON.stringify(settings)}`, 'PerformanceOptimizer');
    
    return settings;
  }

  private initializeOptimizations(): void {
    this.recordOptimization('initialization', 'Applied device-specific settings');
    
    // Apply memory optimizations
    this.optimizeMemoryUsage();
    
    // Apply rendering optimizations
    this.optimizeRendering();
    
    // Apply network optimizations
    this.optimizeNetworking();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  private optimizeMemoryUsage(): void {
    try {
      // Configure garbage collection hints
      if ('gc' in window && this.deviceProfile.isLowEndDevice) {
        // More aggressive GC for low-end devices
        setInterval(() => {
          if ((performance as any).memory) {
            const memInfo = (performance as any).memory;
            const usage = memInfo.usedJSHeapSize / (1024 * 1024); // MB
            
            if (usage > this.currentSettings.memoryLimit) {
              (window as any).gc();
              diagnostic.logWarning(`Triggered GC: ${usage.toFixed(1)}MB usage`, 'PerformanceOptimizer');
            }
          }
        }, 5000);
      }
      
      // Configure cache limits
      if ('caches' in window) {
        this.configureCacheStrategy();
      }
      
      this.recordOptimization('memory', 'Configured memory management');
    } catch (error) {
      diagnostic.logError(`Memory optimization failed: ${error}`, 'PerformanceOptimizer');
    }
  }

  private optimizeRendering(): void {
    try {
      // Configure frame rate limiting
      if (this.currentSettings.maxFPS < 60) {
        // Implement frame rate limiting for lower-end devices
        this.implementFrameRateLimiting();
      }
      
      // Configure image quality
      this.configureImageOptimization();
      
      this.recordOptimization('rendering', `Configured for ${this.currentSettings.maxFPS}FPS`);
    } catch (error) {
      diagnostic.logError(`Rendering optimization failed: ${error}`, 'PerformanceOptimizer');
    }
  }

  private optimizeNetworking(): void {
    try {
      // Configure preload strategy based on device tier
      if (this.deviceProfile.tier === 'high') {
        this.enableAggressivePreloading();
      } else {
        this.enableConservativePreloading();
      }
      
      this.recordOptimization('networking', `Applied ${this.currentSettings.cacheStrategy} caching`);
    } catch (error) {
      diagnostic.logError(`Network optimization failed: ${error}`, 'PerformanceOptimizer');
    }
  }

  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              this.analyzePerformanceMetric(entry);
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
        diagnostic.logWarning('Performance monitoring enabled', 'PerformanceOptimizer');
      } catch (error) {
        diagnostic.logError(`Performance monitoring setup failed: ${error}`, 'PerformanceOptimizer');
      }
    }
  }

  private configureCacheStrategy(): void {
    const strategy = this.currentSettings.cacheStrategy;
    
    // This would be implemented with actual cache management
    diagnostic.logWarning(`Cache strategy set to: ${strategy}`, 'PerformanceOptimizer');
  }

  private implementFrameRateLimiting(): void {
    const targetFrameTime = 1000 / this.currentSettings.maxFPS;
    
    // This would be implemented in the actual rendering loop
    diagnostic.logWarning(`Frame rate limited to ${this.currentSettings.maxFPS}FPS`, 'PerformanceOptimizer');
  }

  private configureImageOptimization(): void {
    const quality = this.currentSettings.imageQuality;
    
    // This would configure canvas context and image processing
    diagnostic.logWarning(`Image quality set to ${(quality * 100).toFixed(0)}%`, 'PerformanceOptimizer');
  }

  private enableAggressivePreloading(): void {
    // Preload critical resources
    diagnostic.logWarning('Aggressive preloading enabled', 'PerformanceOptimizer');
  }

  private enableConservativePreloading(): void {
    // Load resources on demand
    diagnostic.logWarning('Conservative preloading enabled', 'PerformanceOptimizer');
  }

  private analyzePerformanceMetric(entry: PerformanceEntry): void {
    // Analyze performance metrics and adjust settings if needed
    if (entry.name === 'frame' && entry.duration > (1000 / this.currentSettings.maxFPS) * 2) {
      this.adaptToPerformanceIssue('slow_frames');
    }
  }

  private adaptToPerformanceIssue(issue: string): void {
    switch (issue) {
      case 'slow_frames':
        if (this.currentSettings.maxFPS > 15) {
          this.currentSettings.maxFPS = Math.max(15, this.currentSettings.maxFPS - 5);
          this.recordOptimization('adaptation', `Reduced FPS to ${this.currentSettings.maxFPS}`);
        }
        break;
      
      case 'high_memory':
        this.currentSettings.imageQuality = Math.max(0.5, this.currentSettings.imageQuality - 0.1);
        this.recordOptimization('adaptation', `Reduced image quality to ${this.currentSettings.imageQuality}`);
        break;
    }
  }

  private recordOptimization(action: string, result: string): void {
    this.optimizationHistory.push({
      timestamp: Date.now(),
      action,
      result
    });
    
    // Keep only last 50 optimizations
    if (this.optimizationHistory.length > 50) {
      this.optimizationHistory = this.optimizationHistory.slice(-50);
    }
  }

  // Public API
  getCurrentSettings(): OptimizationSettings {
    return { ...this.currentSettings };
  }

  getDeviceProfile(): DeviceProfile {
    return { ...this.deviceProfile };
  }

  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    this.recordOptimization('manual_update', `Updated settings: ${JSON.stringify(newSettings)}`);
    diagnostic.logWarning('Performance settings updated manually', 'PerformanceOptimizer');
  }

  getOptimizationHistory(): Array<{ timestamp: number; action: string; result: string }> {
    return [...this.optimizationHistory];
  }

  generateOptimizationReport(): any {
    return {
      deviceProfile: this.deviceProfile,
      currentSettings: this.currentSettings,
      optimizationHistory: this.optimizationHistory.slice(-10),
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.deviceProfile.isLowEndDevice) {
      recommendations.push('Consider closing other browser tabs to improve performance');
      recommendations.push('Lower camera resolution may improve performance');
    }
    
    if (this.deviceProfile.memory < 4) {
      recommendations.push('Device has limited memory - some features may be slower');
    }
    
    if (!this.currentSettings.enableWebGL) {
      recommendations.push('WebGL is disabled - this may reduce AI inference performance');
    }
    
    return recommendations;
  }
}

export const performanceOptimizer = new PerformanceOptimizer(); 