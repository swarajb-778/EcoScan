/**
 * Performance Optimization System for EcoScan
 * 
 * Provides intelligent performance optimization based on:
 * - Device capabilities and performance tier
 * - Real-time performance monitoring
 * - Adaptive configuration adjustments
 * - Memory management and cleanup
 * - Network-aware optimizations
 */

import { browser } from '$app/environment';
import { performanceAnalyzer } from './performance-analysis.js';

interface OptimizationConfig {
  inputResolution: [number, number];
  batchSize: number;
  confidenceThreshold: number;
  maxDetections: number;
  frameSkipping: number;
  enableEnsemble: boolean;
  enableLLM: boolean;
  executionProviders: string[];
  memoryManagement: MemoryManagementConfig;
  networkOptimization: NetworkOptimizationConfig;
}

interface MemoryManagementConfig {
  maxMemoryUsage: number; // MB
  gcTriggerThreshold: number; // MB
  tensorCleanupInterval: number; // ms
  cacheSize: number; // Number of cached results
  enableMemoryPressureHandling: boolean;
}

interface NetworkOptimizationConfig {
  modelLoadingStrategy: 'eager' | 'lazy' | 'progressive';
  enableCompression: boolean;
  retryAttempts: number;
  timeoutMs: number;
  enableOfflineMode: boolean;
}

interface PerformanceProfile {
  tier: 'low' | 'medium' | 'high' | 'ultra';
  targetFPS: number;
  maxInferenceTime: number;
  memoryBudget: number;
  capabilities: DeviceCapabilities;
}

interface DeviceCapabilities {
  coreCount: number;
  memoryEstimate: number;
  webglSupport: boolean;
  webgpuSupport: boolean;
  hardwareAcceleration: boolean;
  connectionType: string;
  batteryAware: boolean;
}

interface OptimizationMetrics {
  inferenceTime: number;
  memoryUsage: number;
  frameRate: number;
  accuracy: number;
  powerConsumption: number;
  networkLatency: number;
}

export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private profile: PerformanceProfile;
  private metrics: OptimizationMetrics;
  private isOptimizing = false;
  private optimizationHistory: OptimizationMetrics[] = [];
  private memoryMonitor?: MemoryMonitor;
  private networkMonitor?: NetworkMonitor;
  private batteryMonitor?: BatteryMonitor;

  // Predefined optimization profiles
  private static readonly OPTIMIZATION_PROFILES: Record<string, Partial<OptimizationConfig>> = {
    'ultra': {
      inputResolution: [640, 640],
      batchSize: 1,
      confidenceThreshold: 0.5,
      maxDetections: 15,
      frameSkipping: 0,
      enableEnsemble: true,
      enableLLM: true,
      executionProviders: ['webgpu', 'webgl', 'wasm', 'cpu']
    },
    'high': {
      inputResolution: [512, 512],
      batchSize: 1,
      confidenceThreshold: 0.6,
      maxDetections: 12,
      frameSkipping: 1,
      enableEnsemble: true,
      enableLLM: true,
      executionProviders: ['webgl', 'wasm', 'cpu']
    },
    'medium': {
      inputResolution: [416, 416],
      batchSize: 1,
      confidenceThreshold: 0.7,
      maxDetections: 8,
      frameSkipping: 2,
      enableEnsemble: false,
      enableLLM: true,
      executionProviders: ['webgl', 'cpu']
    },
    'low': {
      inputResolution: [320, 320],
      batchSize: 1,
      confidenceThreshold: 0.8,
      maxDetections: 5,
      frameSkipping: 3,
      enableEnsemble: false,
      enableLLM: false,
      executionProviders: ['cpu']
    },
    'battery-saver': {
      inputResolution: [256, 256],
      batchSize: 1,
      confidenceThreshold: 0.8,
      maxDetections: 3,
      frameSkipping: 4,
      enableEnsemble: false,
      enableLLM: false,
      executionProviders: ['cpu']
    }
  };

  constructor() {
    this.config = this.getDefaultConfig();
    this.profile = this.getDefaultProfile();
    this.metrics = this.getDefaultMetrics();

    if (browser) {
      this.initializeMonitoring();
    }
  }

  async initialize(): Promise<void> {
    if (!browser) return;

    // Analyze device capabilities
    const capabilities = await performanceAnalyzer.analyzeDeviceCapabilities();
    this.profile.capabilities = {
      ...capabilities,
      hardwareAcceleration: capabilities.webglSupport || capabilities.webgpuSupport,
      connectionType: 'wifi', // Default assumption
      batteryAware: 'getBattery' in navigator
    };

    // Determine optimal profile
    this.profile.tier = this.determinePerformanceTier(capabilities);
    
    // Apply optimization profile
    this.applyOptimizationProfile(this.profile.tier);

    // Start monitoring
    this.startPerformanceMonitoring();

    console.log(`🎯 Performance optimizer initialized for ${this.profile.tier} tier`);
  }

  private getDefaultConfig(): OptimizationConfig {
    return {
      inputResolution: [416, 416],
      batchSize: 1,
      confidenceThreshold: 0.6,
      maxDetections: 10,
      frameSkipping: 1,
      enableEnsemble: false,
      enableLLM: true,
      executionProviders: ['webgl', 'cpu'],
      memoryManagement: {
        maxMemoryUsage: 200,
        gcTriggerThreshold: 150,
        tensorCleanupInterval: 5000,
        cacheSize: 50,
        enableMemoryPressureHandling: true
      },
      networkOptimization: {
        modelLoadingStrategy: 'lazy',
        enableCompression: true,
        retryAttempts: 3,
        timeoutMs: 10000,
        enableOfflineMode: true
      }
    };
  }

  private getDefaultProfile(): PerformanceProfile {
    return {
      tier: 'medium',
      targetFPS: 15,
      maxInferenceTime: 100,
      memoryBudget: 200,
      capabilities: {
        coreCount: 4,
        memoryEstimate: 4096,
        webglSupport: true,
        webgpuSupport: false,
        hardwareAcceleration: true,
        connectionType: 'wifi',
        batteryAware: false
      }
    };
  }

  private getDefaultMetrics(): OptimizationMetrics {
    return {
      inferenceTime: 0,
      memoryUsage: 0,
      frameRate: 0,
      accuracy: 0,
      powerConsumption: 0,
      networkLatency: 0
    };
  }

  private determinePerformanceTier(capabilities: any): 'low' | 'medium' | 'high' | 'ultra' {
    let score = 0;

    // Core count scoring (25%)
    if (capabilities.coreCount >= 8) score += 25;
    else if (capabilities.coreCount >= 4) score += 15;
    else score += 5;

    // Memory scoring (25%)
    if (capabilities.memoryEstimate >= 8192) score += 25;
    else if (capabilities.memoryEstimate >= 4096) score += 15;
    else if (capabilities.memoryEstimate >= 2048) score += 10;
    else score += 5;

    // GPU support scoring (50%)
    if (capabilities.webgpuSupport) score += 50;
    else if (capabilities.webglSupport) score += 30;
    else score += 0;

    // Determine tier based on score
    if (score >= 85) return 'ultra';
    if (score >= 65) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private applyOptimizationProfile(tier: string): void {
    const profile = PerformanceOptimizer.OPTIMIZATION_PROFILES[tier];
    if (profile) {
      this.config = { ...this.config, ...profile };
      console.log(`⚙️ Applied ${tier} optimization profile:`, this.config);
    }
  }

  private initializeMonitoring(): void {
    // Memory monitoring
    this.memoryMonitor = new MemoryMonitor(this.config.memoryManagement);
    this.memoryMonitor.onMemoryPressure = (usage) => {
      this.handleMemoryPressure(usage);
    };

    // Network monitoring
    this.networkMonitor = new NetworkMonitor(this.config.networkOptimization);
    this.networkMonitor.onNetworkChange = (info) => {
      this.handleNetworkChange(info);
    };

    // Battery monitoring
    if ('getBattery' in navigator) {
      this.batteryMonitor = new BatteryMonitor();
      this.batteryMonitor.onBatteryChange = (info) => {
        this.handleBatteryChange(info);
      };
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.optimizeIfNeeded();
    }, 1000); // Check every second
  }

  private updatePerformanceMetrics(): void {
    if (!browser) return;

    // Update metrics from performance API
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Store metrics history
    this.optimizationHistory.push({ ...this.metrics });
    
    // Keep only last 60 measurements (1 minute)
    if (this.optimizationHistory.length > 60) {
      this.optimizationHistory.shift();
    }
  }

  private optimizeIfNeeded(): void {
    if (this.isOptimizing) return;

    const shouldOptimize = this.shouldOptimize();
    if (shouldOptimize) {
      this.performDynamicOptimization();
    }
  }

  private shouldOptimize(): boolean {
    // Check if performance is below targets
    if (this.metrics.inferenceTime > this.profile.maxInferenceTime * 1.5) return true;
    if (this.metrics.frameRate < this.profile.targetFPS * 0.8) return true;
    if (this.metrics.memoryUsage > this.profile.memoryBudget * 0.9) return true;

    // Check for degrading performance trends
    if (this.optimizationHistory.length >= 10) {
      const recent = this.optimizationHistory.slice(-10);
      const older = this.optimizationHistory.slice(-20, -10);
      
      if (recent.length === 10 && older.length === 10) {
        const recentAvg = recent.reduce((sum, m) => sum + m.inferenceTime, 0) / 10;
        const olderAvg = older.reduce((sum, m) => sum + m.inferenceTime, 0) / 10;
        
        if (recentAvg > olderAvg * 1.2) return true; // 20% performance degradation
      }
    }

    return false;
  }

  private async performDynamicOptimization(): Promise<void> {
    if (this.isOptimizing) return;
    this.isOptimizing = true;

    try {
      console.log('🔧 Performing dynamic optimization...');

      // Memory optimization
      if (this.metrics.memoryUsage > this.profile.memoryBudget * 0.8) {
        await this.optimizeMemoryUsage();
      }

      // Performance optimization
      if (this.metrics.inferenceTime > this.profile.maxInferenceTime) {
        this.optimizeInferencePerformance();
      }

      // Quality vs speed optimization
      if (this.metrics.frameRate < this.profile.targetFPS * 0.9) {
        this.optimizeFrameRate();
      }

      console.log('✅ Dynamic optimization completed');

    } catch (error) {
      console.error('❌ Dynamic optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  private async optimizeMemoryUsage(): Promise<void> {
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Reduce cache size
    this.config.memoryManagement.cacheSize = Math.max(
      this.config.memoryManagement.cacheSize * 0.7,
      10
    );

    // Increase cleanup frequency
    this.config.memoryManagement.tensorCleanupInterval = Math.max(
      this.config.memoryManagement.tensorCleanupInterval * 0.8,
      1000
    );

    console.log('🧹 Memory optimization applied');
  }

  private optimizeInferencePerformance(): void {
    // Reduce input resolution
    const [width, height] = this.config.inputResolution;
    const newWidth = Math.max(width * 0.9, 256);
    const newHeight = Math.max(height * 0.9, 256);
    this.config.inputResolution = [newWidth, newHeight];

    // Increase confidence threshold to reduce processing
    this.config.confidenceThreshold = Math.min(
      this.config.confidenceThreshold * 1.1,
      0.9
    );

    // Reduce max detections
    this.config.maxDetections = Math.max(
      this.config.maxDetections - 1,
      3
    );

    console.log('⚡ Inference performance optimization applied');
  }

  private optimizeFrameRate(): void {
    // Increase frame skipping
    this.config.frameSkipping = Math.min(
      this.config.frameSkipping + 1,
      5
    );

    // Disable expensive features if needed
    if (this.config.frameSkipping >= 3 && this.config.enableEnsemble) {
      this.config.enableEnsemble = false;
      console.log('🔄 Disabled ensemble for better frame rate');
    }

    if (this.config.frameSkipping >= 4 && this.config.enableLLM) {
      this.config.enableLLM = false;
      console.log('🔄 Disabled LLM for better frame rate');
    }

    console.log('🎬 Frame rate optimization applied');
  }

  private handleMemoryPressure(usage: number): void {
    console.warn(`⚠️ Memory pressure detected: ${usage}MB`);
    
    if (usage > this.config.memoryManagement.maxMemoryUsage) {
      // Emergency memory cleanup
      this.optimizeMemoryUsage();
      
      // Switch to battery saver mode if critical
      if (usage > this.config.memoryManagement.maxMemoryUsage * 1.2) {
        this.applyOptimizationProfile('battery-saver');
        console.warn('🔋 Switched to battery saver mode due to memory pressure');
      }
    }
  }

  private handleNetworkChange(info: any): void {
    console.log('🌐 Network change detected:', info);
    
    if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
      this.config.networkOptimization.modelLoadingStrategy = 'lazy';
      this.config.networkOptimization.enableCompression = true;
    } else if (info.effectiveType === '4g') {
      this.config.networkOptimization.modelLoadingStrategy = 'eager';
    }
  }

  private handleBatteryChange(info: any): void {
    console.log('🔋 Battery change detected:', info);
    
    if (info.level < 0.2 && !info.charging) {
      // Low battery - switch to power saving
      this.applyOptimizationProfile('battery-saver');
      console.log('🔋 Switched to battery saver mode - low battery');
    } else if (info.level > 0.8 && info.charging) {
      // High battery and charging - can use full performance
      const tier = this.determinePerformanceTier(this.profile.capabilities);
      this.applyOptimizationProfile(tier);
      console.log('🔋 Restored full performance - battery charging');
    }
  }

  // Public API
  getOptimizationConfig(): OptimizationConfig {
    return { ...this.config };
  }

  getPerformanceProfile(): PerformanceProfile {
    return { ...this.profile };
  }

  getCurrentMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  updateMetrics(newMetrics: Partial<OptimizationMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
  }

  forceOptimization(): Promise<void> {
    return this.performDynamicOptimization();
  }

  resetToDefault(): void {
    this.config = this.getDefaultConfig();
    this.profile = this.getDefaultProfile();
    console.log('🔄 Reset to default optimization settings');
  }

  dispose(): void {
    this.memoryMonitor?.dispose();
    this.networkMonitor?.dispose();
    this.batteryMonitor?.dispose();
  }
}

// Helper classes for monitoring
class MemoryMonitor {
  onMemoryPressure?: (usage: number) => void;
  private interval?: number;

  constructor(private config: MemoryManagementConfig) {
    if (browser) {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    this.interval = window.setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usageMB = memory.usedJSHeapSize / (1024 * 1024);
        
        if (usageMB > this.config.gcTriggerThreshold && this.onMemoryPressure) {
          this.onMemoryPressure(usageMB);
        }
      }
    }, 1000);
  }

  dispose(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

class NetworkMonitor {
  onNetworkChange?: (info: any) => void;

  constructor(private config: NetworkOptimizationConfig) {
    if (browser && 'connection' in navigator) {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        if (this.onNetworkChange) {
          this.onNetworkChange({
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          });
        }
      });
    }
  }

  dispose(): void {
    // Network monitoring cleanup if needed
  }
}

class BatteryMonitor {
  onBatteryChange?: (info: any) => void;
  private battery?: any;

  constructor() {
    if (browser && 'getBattery' in navigator) {
      this.initializeBatteryMonitoring();
    }
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      this.battery = await (navigator as any).getBattery();
      
      const updateBattery = () => {
        if (this.onBatteryChange) {
          this.onBatteryChange({
            level: this.battery.level,
            charging: this.battery.charging,
            dischargingTime: this.battery.dischargingTime
          });
        }
      };

      this.battery.addEventListener('levelchange', updateBattery);
      this.battery.addEventListener('chargingchange', updateBattery);
    } catch (error) {
      console.warn('Battery API not available:', error);
    }
  }

  dispose(): void {
    // Battery monitoring cleanup if needed
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer(); 