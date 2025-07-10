/**
 * Adaptive Inference Engine for EcoScan
 * Dynamically adjusts ML performance based on device capabilities and conditions
 */

import { isBrowser, safeCreateCanvas, safeNavigator, safeWindow } from '../utils/browser.js';

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  isLowEndDevice: boolean;
  hasGPU: boolean;
  supportedAPIs: {
    webgl: boolean;
    webgl2: boolean;
    webasm: boolean;
    webnn: boolean;
  };
  browserTier: 'low' | 'medium' | 'high';
}

export interface ThermalState {
  level: 'normal' | 'fair' | 'serious' | 'critical';
  temperature?: number;
  throttlingActive: boolean;
  lastUpdate: number;
}

export interface BatteryState {
  level: number; // 0-1
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  lastUpdate: number;
}

export interface PerformanceState {
  fps: number;
  averageInferenceTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errors: number;
  lastUpdate: number;
}

export interface AdaptiveConfig {
  targetFPS: number;
  maxInferenceTime: number;
  qualityLevel: 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
  batchSize: number;
  resolution: {
    width: number;
    height: number;
  };
  enableOptimizations: boolean;
}

export interface OptimizationStrategy {
  skipFrames: number;
  reduceResolution: number; // percentage
  enableQuantization: boolean;
  useCPUFallback: boolean;
  enableBatching: boolean;
  maxObjects: number;
  confidenceThreshold: number;
}

export class AdaptiveInferenceEngine {
  private deviceCapabilities: DeviceCapabilities;
  private thermalState: ThermalState;
  private batteryState: BatteryState;
  private performanceState: PerformanceState;
  private config: AdaptiveConfig;
  private strategy: OptimizationStrategy;
  
  private performanceHistory: number[] = [];
  private thermalHistory: ThermalState[] = [];
  private adaptationInterval?: NodeJS.Timeout;
  private thermalMonitor?: NodeJS.Timeout;
  private batteryMonitor?: NodeJS.Timeout;
  
  private readonly THERMAL_CHECK_INTERVAL = 5000; // 5 seconds
  private readonly BATTERY_CHECK_INTERVAL = 10000; // 10 seconds
  private readonly ADAPTATION_INTERVAL = 2000; // 2 seconds
  private readonly HISTORY_LENGTH = 50;

  constructor() {
    if (!isBrowser()) {
      // Create minimal fallback state for SSR
      this.deviceCapabilities = this.getFallbackCapabilities();
    } else {
      this.deviceCapabilities = this.detectDeviceCapabilities();
    }
    
    this.thermalState = {
      level: 'normal',
      throttlingActive: false,
      lastUpdate: Date.now()
    };
    
    this.batteryState = {
      level: 1.0,
      charging: true,
      lastUpdate: Date.now()
    };
    
    this.performanceState = {
      fps: 30,
      averageInferenceTime: 50,
      memoryUsage: 0,
      cpuUsage: 0,
      errors: 0,
      lastUpdate: Date.now()
    };
    
    this.config = this.getInitialConfig();
    this.strategy = this.getBaseStrategy();
    
    if (isBrowser()) {
      this.startMonitoring();
    }
  }

  private getFallbackCapabilities(): DeviceCapabilities {
    return {
      cpuCores: 4,
      memoryGB: 4,
      isLowEndDevice: false,
      hasGPU: false,
      supportedAPIs: {
        webgl: false,
        webgl2: false,
        webasm: true,
        webnn: false
      },
      browserTier: 'medium'
    };
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    if (!isBrowser()) {
      return this.getFallbackCapabilities();
    }

    // CPU cores detection
    const navigator = safeNavigator();
    const cpuCores = navigator?.hardwareConcurrency || 4;
    
    // Memory estimation (approximate)
    const memoryGB = this.estimateMemory();
    
    // GPU detection
    const canvas = safeCreateCanvas();
    let hasGPU = false;
    let supportedAPIs = {
      webgl: false,
      webgl2: false,
      webasm: typeof WebAssembly !== 'undefined',
      webnn: false
    };

    if (canvas) {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      hasGPU = !!gl;
      
      supportedAPIs = {
        webgl: !!canvas.getContext('webgl'),
        webgl2: !!canvas.getContext('webgl2'),
        webasm: typeof WebAssembly !== 'undefined',
        webnn: !!(navigator && 'ml' in navigator)
      };
    }
    
    // Device tier classification
    const isLowEndDevice = cpuCores <= 2 || memoryGB <= 2;
    const browserTier = this.classifyBrowserTier();
    
    return {
      cpuCores,
      memoryGB,
      isLowEndDevice,
      hasGPU,
      supportedAPIs,
      browserTier
    };
  }

  private estimateMemory(): number {
    if (!isBrowser()) return 4; // Default fallback
    
    // Use performance.memory if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.jsHeapSizeLimit) {
        return Math.round(memInfo.jsHeapSizeLimit / (1024 * 1024 * 1024));
      }
    }
    
    // Fallback estimation based on user agent and other factors
    const navigator = safeNavigator();
    if (!navigator) return 4;
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile')) {
      return 2; // Assume 2GB for mobile
    } else if (userAgent.includes('tablet')) {
      return 4; // Assume 4GB for tablets
    } else {
      return 8; // Assume 8GB for desktop
    }
  }

  private classifyBrowserTier(): 'low' | 'medium' | 'high' {
    const { cpuCores, memoryGB, hasGPU } = this.deviceCapabilities;
    
    if (cpuCores >= 8 && memoryGB >= 8 && hasGPU) {
      return 'high';
    } else if (cpuCores >= 4 && memoryGB >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getInitialConfig(): AdaptiveConfig {
    const { browserTier, isLowEndDevice } = this.deviceCapabilities;
    
    if (isLowEndDevice || browserTier === 'low') {
      return {
        targetFPS: 15,
        maxInferenceTime: 200,
        qualityLevel: 'low',
        batchSize: 1,
        resolution: { width: 320, height: 240 },
        enableOptimizations: true
      };
    } else if (browserTier === 'medium') {
      return {
        targetFPS: 20,
        maxInferenceTime: 150,
        qualityLevel: 'medium',
        batchSize: 1,
        resolution: { width: 480, height: 360 },
        enableOptimizations: true
      };
    } else {
      return {
        targetFPS: 30,
        maxInferenceTime: 100,
        qualityLevel: 'high',
        batchSize: 1,
        resolution: { width: 640, height: 480 },
        enableOptimizations: false
      };
    }
  }

  private getBaseStrategy(): OptimizationStrategy {
    return {
      skipFrames: 0,
      reduceResolution: 0,
      enableQuantization: false,
      useCPUFallback: false,
      enableBatching: false,
      maxObjects: 15,
      confidenceThreshold: 0.5
    };
  }

  private startMonitoring(): void {
    // Start thermal monitoring
    this.thermalMonitor = setInterval(() => {
      this.updateThermalState();
    }, this.THERMAL_CHECK_INTERVAL);

    // Start battery monitoring
    this.batteryMonitor = setInterval(() => {
      this.updateBatteryState();
    }, this.BATTERY_CHECK_INTERVAL);

    // Start adaptive optimization
    this.adaptationInterval = setInterval(() => {
      this.adaptConfiguration();
    }, this.ADAPTATION_INTERVAL);
  }

  private async updateThermalState(): Promise<void> {
    try {
      // Check for thermal throttling indicators
      const throttlingIndicators = this.detectThermalThrottling();
      
      // Estimate thermal level based on performance degradation
      const level = this.estimateThermalLevel();
      
      this.thermalState = {
        level,
        throttlingActive: throttlingIndicators.length > 0,
        lastUpdate: Date.now()
      };

      // Keep thermal history
      this.thermalHistory.push({ ...this.thermalState });
      if (this.thermalHistory.length > this.HISTORY_LENGTH) {
        this.thermalHistory.shift();
      }

    } catch (error) {
      console.warn('Thermal state update failed:', error);
    }
  }

  private detectThermalThrottling(): string[] {
    const indicators: string[] = [];
    
    // Check for performance degradation patterns
    if (this.performanceHistory.length >= 10) {
      const recent = this.performanceHistory.slice(-10);
      const older = this.performanceHistory.slice(-20, -10);
      
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.5) {
        indicators.push('performance_degradation');
      }
    }
    
    // Check FPS drops
    if (this.performanceState.fps < this.config.targetFPS * 0.7) {
      indicators.push('fps_drop');
    }
    
    // Check inference time increases
    if (this.performanceState.averageInferenceTime > this.config.maxInferenceTime * 1.5) {
      indicators.push('inference_slowdown');
    }
    
    return indicators;
  }

  private estimateThermalLevel(): 'normal' | 'fair' | 'serious' | 'critical' {
    const { fps, averageInferenceTime } = this.performanceState;
    const { targetFPS, maxInferenceTime } = this.config;
    
    const fpsRatio = fps / targetFPS;
    const timeRatio = averageInferenceTime / maxInferenceTime;
    
    // Calculate thermal stress score
    const stressScore = (1 - fpsRatio) + (timeRatio - 1);
    
    if (stressScore > 2) return 'critical';
    if (stressScore > 1) return 'serious';
    if (stressScore > 0.5) return 'fair';
    return 'normal';
  }

  private async updateBatteryState(): Promise<void> {
    try {
      if (isBrowser() && 'getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.batteryState = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          lastUpdate: Date.now()
        };
      }
    } catch (error) {
      console.warn('Battery state update failed:', error);
    }
  }

  private adaptConfiguration(): void {
    if (!isBrowser()) return;
    
    const newStrategy = this.calculateOptimalStrategy();
    const configChanged = this.updateConfigIfNeeded(newStrategy);
    
    if (configChanged) {
      const window = safeWindow();
      if (window) {
        window.dispatchEvent(new CustomEvent('adaptive-config-change', {
          detail: {
            config: this.config,
            strategy: this.strategy,
            deviceCapabilities: this.deviceCapabilities,
            thermalState: this.thermalState,
            batteryState: this.batteryState,
            performanceState: this.performanceState
          }
        }));
      }
    }
  }

  private calculateOptimalStrategy(): OptimizationStrategy {
    const strategy = { ...this.getBaseStrategy() };
    
    // Thermal-based optimizations
    switch (this.thermalState.level) {
      case 'critical':
        strategy.skipFrames = 3;
        strategy.reduceResolution = 50;
        strategy.enableQuantization = true;
        strategy.useCPUFallback = true;
        strategy.maxObjects = 5;
        strategy.confidenceThreshold = 0.7;
        break;
      case 'serious':
        strategy.skipFrames = 2;
        strategy.reduceResolution = 30;
        strategy.enableQuantization = true;
        strategy.maxObjects = 8;
        strategy.confidenceThreshold = 0.6;
        break;
      case 'fair':
        strategy.skipFrames = 1;
        strategy.reduceResolution = 15;
        strategy.maxObjects = 10;
        strategy.confidenceThreshold = 0.55;
        break;
    }
    
    // Battery-based optimizations
    if (!this.batteryState.charging && this.batteryState.level < 0.2) {
      strategy.skipFrames = Math.max(strategy.skipFrames, 2);
      strategy.reduceResolution = Math.max(strategy.reduceResolution, 25);
      strategy.useCPUFallback = true;
    } else if (!this.batteryState.charging && this.batteryState.level < 0.5) {
      strategy.skipFrames = Math.max(strategy.skipFrames, 1);
      strategy.reduceResolution = Math.max(strategy.reduceResolution, 15);
    }
    
    // Performance-based optimizations
    if (this.performanceState.fps < this.config.targetFPS * 0.8) {
      strategy.skipFrames = Math.max(strategy.skipFrames, 1);
      strategy.reduceResolution = Math.max(strategy.reduceResolution, 20);
    }
    
    if (this.performanceState.averageInferenceTime > this.config.maxInferenceTime * 1.3) {
      strategy.enableQuantization = true;
      strategy.maxObjects = Math.min(strategy.maxObjects, 8);
    }
    
    // Device capability constraints
    if (this.deviceCapabilities.isLowEndDevice) {
      strategy.maxObjects = Math.min(strategy.maxObjects, 5);
      strategy.enableQuantization = true;
    }
    
    return strategy;
  }

  private updateConfigIfNeeded(newStrategy: OptimizationStrategy): boolean {
    const strategiesEqual = JSON.stringify(this.strategy) === JSON.stringify(newStrategy);
    
    if (!strategiesEqual) {
      this.strategy = newStrategy;
      this.updateConfigFromStrategy();
      return true;
    }
    
    return false;
  }

  private updateConfigFromStrategy(): void {
    // Update resolution based on reduction percentage
    const baseWidth = this.config.resolution.width;
    const baseHeight = this.config.resolution.height;
    const reductionFactor = (100 - this.strategy.reduceResolution) / 100;
    
    this.config.resolution.width = Math.round(baseWidth * reductionFactor);
    this.config.resolution.height = Math.round(baseHeight * reductionFactor);
    
    // Update other config parameters
    this.config.targetFPS = Math.max(10, this.config.targetFPS - this.strategy.skipFrames * 5);
    
    if (this.strategy.enableQuantization) {
      this.config.qualityLevel = 'low';
    }
  }

  // Public API methods
  updatePerformanceMetrics(metrics: Partial<PerformanceState>): void {
    this.performanceState = {
      ...this.performanceState,
      ...metrics,
      lastUpdate: Date.now()
    };
    
    // Update performance history
    if (metrics.averageInferenceTime !== undefined) {
      this.performanceHistory.push(metrics.averageInferenceTime);
      if (this.performanceHistory.length > this.HISTORY_LENGTH) {
        this.performanceHistory.shift();
      }
    }
  }

  getCurrentConfig(): AdaptiveConfig {
    return { ...this.config };
  }

  getCurrentStrategy(): OptimizationStrategy {
    return { ...this.strategy };
  }

  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  getThermalState(): ThermalState {
    return { ...this.thermalState };
  }

  getBatteryState(): BatteryState {
    return { ...this.batteryState };
  }

  getPerformanceState(): PerformanceState {
    return { ...this.performanceState };
  }

  // Force specific optimization level (for testing or manual override)
  forceOptimizationLevel(level: 'minimal' | 'low' | 'medium' | 'high' | 'ultra'): void {
    const strategies: Record<string, OptimizationStrategy> = {
      minimal: {
        skipFrames: 4,
        reduceResolution: 60,
        enableQuantization: true,
        useCPUFallback: true,
        enableBatching: false,
        maxObjects: 3,
        confidenceThreshold: 0.8
      },
      low: {
        skipFrames: 2,
        reduceResolution: 40,
        enableQuantization: true,
        useCPUFallback: false,
        enableBatching: false,
        maxObjects: 5,
        confidenceThreshold: 0.7
      },
      medium: {
        skipFrames: 1,
        reduceResolution: 20,
        enableQuantization: false,
        useCPUFallback: false,
        enableBatching: false,
        maxObjects: 10,
        confidenceThreshold: 0.6
      },
      high: {
        skipFrames: 0,
        reduceResolution: 10,
        enableQuantization: false,
        useCPUFallback: false,
        enableBatching: true,
        maxObjects: 15,
        confidenceThreshold: 0.5
      },
      ultra: {
        skipFrames: 0,
        reduceResolution: 0,
        enableQuantization: false,
        useCPUFallback: false,
        enableBatching: true,
        maxObjects: 20,
        confidenceThreshold: 0.4
      }
    };
    
    this.strategy = strategies[level];
    this.config.qualityLevel = level;
    this.updateConfigFromStrategy();
  }

  dispose(): void {
    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
    }
    if (this.thermalMonitor) {
      clearInterval(this.thermalMonitor);
    }
    if (this.batteryMonitor) {
      clearInterval(this.batteryMonitor);
    }
    
    console.log('Adaptive inference engine disposed');
  }
}

// Lazy singleton instance for browser-only access
let _adaptiveEngine: AdaptiveInferenceEngine | null = null;

export function getAdaptiveEngine(): AdaptiveInferenceEngine {
  if (!_adaptiveEngine) {
    _adaptiveEngine = new AdaptiveInferenceEngine();
  }
  return _adaptiveEngine;
} 