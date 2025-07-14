import type { Detection } from '$lib/types/index.js';
import { isBrowser } from '$lib/utils/browser.js';

interface PerformanceMetrics {
  fps: number;
  inferenceTime: number;
  memoryUsage: number;
  cpuUsage: number;
  batteryLevel: number;
  networkSpeed: number;
  temperature: number;
}

interface OptimizationSettings {
  maxFPS: number;
  targetInferenceTime: number;
  memoryThreshold: number;
  qualityLevel: 'ultra' | 'high' | 'medium' | 'low' | 'potato';
  adaptiveQuality: boolean;
  enableFrameSkipping: boolean;
  enableResolutionScaling: boolean;
  enableModelSwitching: boolean;
  powerSaveMode: boolean;
}

interface ModelConfig {
  name: string;
  path: string;
  inputSize: [number, number];
  complexity: number;
  accuracy: number;
  speed: number;
  memoryFootprint: number;
}

interface AdaptiveStrategy {
  name: string;
  fps: number;
  resolution: [number, number];
  modelIndex: number;
  qualityModifiers: {
    brightness: number;
    contrast: number;
    sharpness: number;
    noiseReduction: boolean;
  };
  processingOptimizations: {
    skipFrames: number;
    batchSize: number;
    tensorOptimization: boolean;
    parallelProcessing: boolean;
  };
}

export class PerformanceOptimizer {
  private currentMetrics: PerformanceMetrics;
  private settings: OptimizationSettings;
  private availableModels: ModelConfig[];
  private strategies: Map<string, AdaptiveStrategy>;
  private performanceHistory: PerformanceMetrics[];
  private frameSkipCounter = 0;
  private lastOptimizationTime = 0;
  private optimizationInterval = 5000; // 5 seconds
  private isOptimizing = false;
  private memoryPressureObserver?: PerformanceObserver;
  private frameRateCalculator: FrameRateCalculator;
  private resourceMonitor: ResourceMonitor;
  private batteryMonitor: BatteryMonitor;

  constructor() {
    this.currentMetrics = {
      fps: 0,
      inferenceTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      batteryLevel: 100,
      networkSpeed: 0,
      temperature: 0
    };

    this.settings = {
      maxFPS: 30,
      targetInferenceTime: 50,
      memoryThreshold: 200 * 1024 * 1024, // 200MB
      qualityLevel: 'high',
      adaptiveQuality: true,
      enableFrameSkipping: true,
      enableResolutionScaling: true,
      enableModelSwitching: true,
      powerSaveMode: false
    };

    this.availableModels = [
      {
        name: 'YOLOv8n',
        path: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        complexity: 1,
        accuracy: 85,
        speed: 95,
        memoryFootprint: 12 * 1024 * 1024
      },
      {
        name: 'YOLOv8s-lite',
        path: '/models/yolov8s-lite.onnx',
        inputSize: [416, 416],
        complexity: 0.7,
        accuracy: 80,
        speed: 120,
        memoryFootprint: 8 * 1024 * 1024
      },
      {
        name: 'MobileNet-lite',
        path: '/models/mobilenet-lite.onnx',
        inputSize: [320, 320],
        complexity: 0.4,
        accuracy: 70,
        speed: 150,
        memoryFootprint: 4 * 1024 * 1024
      },
      {
        name: 'TinyYOLO',
        path: '/models/tiny-yolo.onnx',
        inputSize: [224, 224],
        complexity: 0.2,
        accuracy: 60,
        speed: 200,
        memoryFootprint: 2 * 1024 * 1024
      }
    ];

    this.strategies = new Map();
    this.performanceHistory = [];
    this.frameRateCalculator = new FrameRateCalculator();
    this.resourceMonitor = new ResourceMonitor();
    this.batteryMonitor = new BatteryMonitor();

    this.initializeStrategies();
    this.initializeMonitoring();
  }

  private initializeStrategies(): void {
    // Ultra Performance Strategy
    this.strategies.set('ultra', {
      name: 'Ultra Performance',
      fps: 30,
      resolution: [640, 640],
      modelIndex: 0, // YOLOv8n
      qualityModifiers: {
        brightness: 1.0,
        contrast: 1.0,
        sharpness: 1.0,
        noiseReduction: false
      },
      processingOptimizations: {
        skipFrames: 0,
        batchSize: 1,
        tensorOptimization: true,
        parallelProcessing: true
      }
    });

    // High Performance Strategy
    this.strategies.set('high', {
      name: 'High Performance',
      fps: 24,
      resolution: [640, 640],
      modelIndex: 0,
      qualityModifiers: {
        brightness: 1.0,
        contrast: 1.0,
        sharpness: 0.9,
        noiseReduction: true
      },
      processingOptimizations: {
        skipFrames: 1,
        batchSize: 1,
        tensorOptimization: true,
        parallelProcessing: true
      }
    });

    // Balanced Strategy
    this.strategies.set('balanced', {
      name: 'Balanced',
      fps: 20,
      resolution: [416, 416],
      modelIndex: 1, // YOLOv8s-lite
      qualityModifiers: {
        brightness: 1.0,
        contrast: 1.1,
        sharpness: 0.8,
        noiseReduction: true
      },
      processingOptimizations: {
        skipFrames: 2,
        batchSize: 1,
        tensorOptimization: true,
        parallelProcessing: false
      }
    });

    // Power Save Strategy
    this.strategies.set('power-save', {
      name: 'Power Save',
      fps: 15,
      resolution: [320, 320],
      modelIndex: 2, // MobileNet-lite
      qualityModifiers: {
        brightness: 1.1,
        contrast: 1.2,
        sharpness: 0.7,
        noiseReduction: true
      },
      processingOptimizations: {
        skipFrames: 3,
        batchSize: 1,
        tensorOptimization: false,
        parallelProcessing: false
      }
    });

    // Emergency Strategy (for very low-end devices)
    this.strategies.set('emergency', {
      name: 'Emergency Mode',
      fps: 10,
      resolution: [224, 224],
      modelIndex: 3, // TinyYOLO
      qualityModifiers: {
        brightness: 1.2,
        contrast: 1.3,
        sharpness: 0.5,
        noiseReduction: false
      },
      processingOptimizations: {
        skipFrames: 5,
        batchSize: 1,
        tensorOptimization: false,
        parallelProcessing: false
      }
    });
  }

  private async initializeMonitoring(): Promise<void> {
    if (!isBrowser()) return;

    try {
      // Initialize performance observer for memory pressure
      if ('PerformanceObserver' in window) {
        this.memoryPressureObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'memory-pressure') {
              this.handleMemoryPressure(entry as any);
            }
          }
        });

        this.memoryPressureObserver.observe({ entryTypes: ['measure'] });
      }

      // Start resource monitoring
      await this.resourceMonitor.initialize();
      await this.batteryMonitor.initialize();

      console.log('🚀 Performance optimizer initialized');
    } catch (error) {
      console.warn('⚠️ Some performance monitoring features unavailable:', error);
    }
  }

  async optimize(): Promise<AdaptiveStrategy> {
    if (this.isOptimizing) {
      return this.getCurrentStrategy();
    }

    this.isOptimizing = true;
    const startTime = performance.now();

    try {
      // Update current metrics
      await this.updateMetrics();

      // Determine optimal strategy
      const strategy = this.determineOptimalStrategy();

      // Apply optimizations
      await this.applyOptimizations(strategy);

      // Store performance data
      this.performanceHistory.push({ ...this.currentMetrics });
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }

      const optimizationTime = performance.now() - startTime;
      console.log(`⚡ Optimization completed in ${optimizationTime.toFixed(1)}ms`);

      return strategy;

    } finally {
      this.isOptimizing = false;
      this.lastOptimizationTime = Date.now();
    }
  }

  private async updateMetrics(): Promise<void> {
    // Update FPS
    this.currentMetrics.fps = this.frameRateCalculator.getCurrentFPS();

    // Update memory usage
    if ('memory' in performance) {
      this.currentMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    // Update resource metrics
    const resourceData = await this.resourceMonitor.getMetrics();
    this.currentMetrics.cpuUsage = resourceData.cpu;
    this.currentMetrics.temperature = resourceData.temperature;

    // Update battery level
    const batteryData = await this.batteryMonitor.getStatus();
    this.currentMetrics.batteryLevel = batteryData.level * 100;

    // Update network speed
    this.currentMetrics.networkSpeed = await this.measureNetworkSpeed();
  }

  private determineOptimalStrategy(): AdaptiveStrategy {
    const deviceScore = this.calculateDeviceScore();
    const performanceScore = this.calculatePerformanceScore();
    const powerScore = this.calculatePowerScore();

    console.log(`📊 Device: ${deviceScore}, Performance: ${performanceScore}, Power: ${powerScore}`);

    // Determine strategy based on combined scores
    if (powerScore < 0.3 || this.settings.powerSaveMode) {
      return this.strategies.get('power-save')!;
    }

    if (deviceScore < 0.3) {
      return this.strategies.get('emergency')!;
    }

    if (performanceScore < 0.5) {
      return this.strategies.get('balanced')!;
    }

    if (deviceScore > 0.8 && performanceScore > 0.8) {
      return this.strategies.get('ultra')!;
    }

    return this.strategies.get('high')!;
  }

  private calculateDeviceScore(): number {
    let score = 1.0;

    // Memory factor
    const memoryRatio = this.currentMetrics.memoryUsage / this.settings.memoryThreshold;
    score *= Math.max(0.1, 1 - memoryRatio * 0.5);

    // CPU factor
    if (this.currentMetrics.cpuUsage > 0) {
      score *= Math.max(0.1, 1 - this.currentMetrics.cpuUsage * 0.3);
    }

    // Hardware concurrency
    const cores = navigator.hardwareConcurrency || 2;
    score *= Math.min(1.0, cores / 4);

    // Device memory (if available)
    if ('deviceMemory' in navigator) {
      const deviceMemory = (navigator as any).deviceMemory;
      score *= Math.min(1.0, deviceMemory / 4);
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  private calculatePerformanceScore(): number {
    let score = 1.0;

    // FPS factor
    const targetFPS = this.settings.maxFPS;
    const fpsRatio = this.currentMetrics.fps / targetFPS;
    score *= Math.min(1.0, fpsRatio);

    // Inference time factor
    if (this.currentMetrics.inferenceTime > 0) {
      const targetTime = this.settings.targetInferenceTime;
      const timeRatio = targetTime / this.currentMetrics.inferenceTime;
      score *= Math.min(1.0, timeRatio);
    }

    // Recent performance trend
    if (this.performanceHistory.length > 10) {
      const recentMetrics = this.performanceHistory.slice(-10);
      const avgFPS = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
      const fpsStability = Math.min(1.0, avgFPS / targetFPS);
      score *= fpsStability;
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  private calculatePowerScore(): number {
    let score = 1.0;

    // Battery level factor
    if (this.currentMetrics.batteryLevel < 100) {
      score *= this.currentMetrics.batteryLevel / 100;
    }

    // Temperature factor
    if (this.currentMetrics.temperature > 0) {
      // Assume normal operation at 40°C, throttle above 60°C
      if (this.currentMetrics.temperature > 40) {
        const tempFactor = Math.max(0.1, (70 - this.currentMetrics.temperature) / 30);
        score *= tempFactor;
      }
    }

    // Power save mode
    if (this.settings.powerSaveMode) {
      score *= 0.5;
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  private async applyOptimizations(strategy: AdaptiveStrategy): Promise<void> {
    // Update frame skipping
    this.frameSkipCounter = 0;

    // Log strategy application
    console.log(`🎯 Applying strategy: ${strategy.name}`);
    console.log(`   Resolution: ${strategy.resolution.join('x')}`);
    console.log(`   FPS: ${strategy.fps}`);
    console.log(`   Model: ${this.availableModels[strategy.modelIndex].name}`);
    console.log(`   Skip frames: ${strategy.processingOptimizations.skipFrames}`);

    // Emit strategy change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-strategy-change', {
        detail: { strategy }
      }));
    }
  }

  shouldSkipFrame(): boolean {
    if (!this.settings.enableFrameSkipping) return false;

    const strategy = this.getCurrentStrategy();
    const skipFrames = strategy.processingOptimizations.skipFrames;

    if (skipFrames === 0) return false;

    this.frameSkipCounter++;
    const shouldSkip = this.frameSkipCounter % (skipFrames + 1) !== 0;

    return shouldSkip;
  }

  getOptimalResolution(): [number, number] {
    const strategy = this.getCurrentStrategy();
    return strategy.resolution;
  }

  getOptimalModel(): ModelConfig {
    const strategy = this.getCurrentStrategy();
    return this.availableModels[strategy.modelIndex];
  }

  getQualityModifiers(): any {
    const strategy = this.getCurrentStrategy();
    return strategy.qualityModifiers;
  }

  private getCurrentStrategy(): AdaptiveStrategy {
    // Return the last applied strategy or default to balanced
    return this.strategies.get('balanced')!;
  }

  recordInferenceTime(time: number): void {
    this.currentMetrics.inferenceTime = time;
    this.frameRateCalculator.recordFrame();

    // Trigger optimization if needed
    const now = Date.now();
    if (now - this.lastOptimizationTime > this.optimizationInterval) {
      this.optimize().catch(console.error);
    }
  }

  private handleMemoryPressure(entry: any): void {
    console.warn('⚠️ Memory pressure detected:', entry);
    
    // Force power save mode
    this.settings.powerSaveMode = true;
    this.settings.qualityLevel = 'low';

    // Trigger immediate optimization
    this.optimize().catch(console.error);
  }

  private async measureNetworkSpeed(): Promise<number> {
    try {
      if (!navigator.onLine) return 0;

      const startTime = performance.now();
      const response = await fetch('/models/speed-test.txt', { 
        cache: 'no-cache',
        method: 'HEAD'
      });
      const endTime = performance.now();

      if (response.ok) {
        return 1000 / (endTime - startTime); // Requests per second
      }
    } catch (error) {
      // Ignore network errors
    }

    return 0;
  }

  getPerformanceReport(): any {
    return {
      currentMetrics: this.currentMetrics,
      settings: this.settings,
      currentStrategy: this.getCurrentStrategy().name,
      performanceHistory: this.performanceHistory.slice(-20),
      deviceScore: this.calculateDeviceScore(),
      performanceScore: this.calculatePerformanceScore(),
      powerScore: this.calculatePowerScore(),
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.currentMetrics.fps < 15) {
      recommendations.push('Consider reducing quality settings for better performance');
    }

    if (this.currentMetrics.memoryUsage > this.settings.memoryThreshold) {
      recommendations.push('High memory usage detected - enable frame skipping');
    }

    if (this.currentMetrics.batteryLevel < 20) {
      recommendations.push('Low battery - switch to power save mode');
    }

    if (this.currentMetrics.inferenceTime > 100) {
      recommendations.push('Slow inference detected - try a lighter model');
    }

    return recommendations;
  }

  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ Performance settings updated:', newSettings);
  }

  dispose(): void {
    if (this.memoryPressureObserver) {
      this.memoryPressureObserver.disconnect();
    }

    this.resourceMonitor.dispose();
    this.batteryMonitor.dispose();
    this.frameRateCalculator.dispose();

    console.log('🧹 Performance optimizer disposed');
  }
}

class FrameRateCalculator {
  private frameTimestamps: number[] = [];
  private lastFrameTime = 0;

  recordFrame(): void {
    const now = performance.now();
    this.frameTimestamps.push(now);

    // Keep only last 60 frames (2 seconds at 30fps)
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
    }

    this.lastFrameTime = now;
  }

  getCurrentFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const timespan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    const frameCount = this.frameTimestamps.length - 1;

    return (frameCount / timespan) * 1000;
  }

  dispose(): void {
    this.frameTimestamps = [];
  }
}

class ResourceMonitor {
  private intervalId?: number;
  private cpuUsage = 0;
  private temperature = 0;

  async initialize(): Promise<void> {
    // Start monitoring if APIs are available
    if ('hardwareConcurrency' in navigator) {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    this.intervalId = window.setInterval(() => {
      this.updateCPUUsage();
      this.updateTemperature();
    }, 1000);
  }

  private updateCPUUsage(): void {
    // Estimate CPU usage based on frame timing
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryPressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      this.cpuUsage = Math.min(1.0, memoryPressure * 1.5);
    }
  }

  private updateTemperature(): void {
    // Temperature monitoring would require device-specific APIs
    // For now, estimate based on performance degradation
    this.temperature = 40 + (this.cpuUsage * 20);
  }

  async getMetrics(): Promise<{ cpu: number; temperature: number }> {
    return {
      cpu: this.cpuUsage,
      temperature: this.temperature
    };
  }

  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

class BatteryMonitor {
  private battery?: any;

  async initialize(): Promise<void> {
    try {
      if ('getBattery' in navigator) {
        this.battery = await (navigator as any).getBattery();
      }
    } catch (error) {
      console.warn('Battery API not available');
    }
  }

  async getStatus(): Promise<{ level: number; charging: boolean }> {
    if (this.battery) {
      return {
        level: this.battery.level,
        charging: this.battery.charging
      };
    }

    return { level: 1.0, charging: false }; // Assume desktop
  }

  dispose(): void {
    this.battery = null;
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer(); 