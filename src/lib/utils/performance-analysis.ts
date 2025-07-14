/**
 * Performance Analysis Utility for EcoScan Detection System
 * 
 * Analyzes current detection performance and identifies bottlenecks:
 * - Model loading times
 * - Inference performance
 * - Memory usage patterns
 * - Device capability assessment
 * - Optimization recommendations
 */

import { browser } from '$app/environment';

interface PerformanceMetrics {
  modelLoadTime: number;
  averageInferenceTime: number;
  memoryUsage: {
    initial: number;
    peak: number;
    current: number;
  };
  frameRate: number;
  deviceCapabilities: DeviceCapabilities;
  bottlenecks: BottleneckAnalysis[];
  recommendations: OptimizationRecommendation[];
}

interface DeviceCapabilities {
  webglSupport: boolean;
  webgpuSupport: boolean;
  coreCount: number;
  memoryEstimate: number;
  performanceTier: 'low' | 'medium' | 'high' | 'ultra';
  supportedProviders: string[];
}

interface BottleneckAnalysis {
  area: 'model_loading' | 'inference' | 'preprocessing' | 'postprocessing' | 'memory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  measurementValue: number;
  threshold: number;
}

interface OptimizationRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'model' | 'runtime' | 'preprocessing' | 'hardware';
  description: string;
  expectedImprovement: string;
  implementation: string;
}

export class PerformanceAnalyzer {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private measurementStartTime: number = 0;
  private frameTimestamps: number[] = [];
  private memoryBaseline: number = 0;

  constructor() {
    if (browser) {
      this.initializePerformanceMonitoring();
    }
  }

  private initializePerformanceMonitoring(): void {
    // Memory baseline
    if ('memory' in performance) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize;
    }

    // Frame rate monitoring
    this.startFrameRateMonitoring();

    // Performance observers
    this.setupPerformanceObservers();
  }

  private setupPerformanceObservers(): void {
    try {
      // Resource loading observer
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name.includes('yolov8') || entry.name.includes('.onnx')) {
            this.metrics.modelLoadTime = entry.duration;
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Measure observer for custom timings
      const measureObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name.startsWith('ml-inference')) {
            this.recordInferenceTime(entry.duration);
          }
        }
      });

      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);

    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  private startFrameRateMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const calculateFPS = () => {
      const currentTime = performance.now();
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(calculateFPS);
    };

    requestAnimationFrame(calculateFPS);
  }

  private recordInferenceTime(duration: number): void {
    if (!this.frameTimestamps) {
      this.frameTimestamps = [];
    }
    
    this.frameTimestamps.push(duration);
    
    // Keep only last 100 measurements
    if (this.frameTimestamps.length > 100) {
      this.frameTimestamps.shift();
    }
    
    // Calculate average
    const sum = this.frameTimestamps.reduce((a, b) => a + b, 0);
    this.metrics.averageInferenceTime = sum / this.frameTimestamps.length;
  }

  async analyzeDeviceCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      webglSupport: this.checkWebGLSupport(),
      webgpuSupport: await this.checkWebGPUSupport(),
      coreCount: this.estimateCoreCount(),
      memoryEstimate: this.estimateDeviceMemory(),
      performanceTier: 'medium',
      supportedProviders: []
    };

    // Determine supported ONNX providers
    capabilities.supportedProviders = this.getSupportedONNXProviders(capabilities);
    
    // Calculate performance tier
    capabilities.performanceTier = this.calculatePerformanceTier(capabilities);

    this.metrics.deviceCapabilities = capabilities;
    return capabilities;
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  private async checkWebGPUSupport(): Promise<boolean> {
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        return !!adapter;
      }
      return false;
    } catch {
      return false;
    }
  }

  private estimateCoreCount(): number {
    return navigator.hardwareConcurrency || 4;
  }

  private estimateDeviceMemory(): number {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory * 1024; // Convert GB to MB
    }
    
    // Estimate based on performance
    if ('memory' in performance) {
      const jsHeapLimit = (performance as any).memory.jsHeapSizeLimit;
      return Math.round(jsHeapLimit / (1024 * 1024)); // Convert to MB
    }
    
    return 2048; // Default 2GB estimate
  }

  private getSupportedONNXProviders(capabilities: DeviceCapabilities): string[] {
    const providers: string[] = ['cpu'];
    
    if (capabilities.webglSupport) {
      providers.push('webgl');
    }
    
    if (capabilities.webgpuSupport) {
      providers.push('webgpu');
    }
    
    return providers;
  }

  private calculatePerformanceTier(capabilities: DeviceCapabilities): 'low' | 'medium' | 'high' | 'ultra' {
    let score = 0;
    
    // Core count contribution (25%)
    if (capabilities.coreCount >= 8) score += 25;
    else if (capabilities.coreCount >= 4) score += 15;
    else score += 5;
    
    // Memory contribution (25%)
    if (capabilities.memoryEstimate >= 8192) score += 25;
    else if (capabilities.memoryEstimate >= 4096) score += 15;
    else if (capabilities.memoryEstimate >= 2048) score += 10;
    else score += 5;
    
    // GPU support contribution (50%)
    if (capabilities.webgpuSupport) score += 50;
    else if (capabilities.webglSupport) score += 30;
    else score += 0;
    
    if (score >= 85) return 'ultra';
    if (score >= 65) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  analyzeBottlenecks(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];
    
    // Model loading bottleneck
    if (this.metrics.modelLoadTime && this.metrics.modelLoadTime > 5000) {
      bottlenecks.push({
        area: 'model_loading',
        severity: this.metrics.modelLoadTime > 10000 ? 'critical' : 'high',
        impact: `Model loading takes ${(this.metrics.modelLoadTime / 1000).toFixed(1)}s, affecting user experience`,
        measurementValue: this.metrics.modelLoadTime,
        threshold: 5000
      });
    }
    
    // Inference performance bottleneck
    if (this.metrics.averageInferenceTime && this.metrics.averageInferenceTime > 100) {
      bottlenecks.push({
        area: 'inference',
        severity: this.metrics.averageInferenceTime > 300 ? 'critical' : 'high',
        impact: `Inference takes ${this.metrics.averageInferenceTime.toFixed(1)}ms, below target of 100ms`,
        measurementValue: this.metrics.averageInferenceTime,
        threshold: 100
      });
    }
    
    // Frame rate bottleneck
    if (this.metrics.frameRate && this.metrics.frameRate < 15) {
      bottlenecks.push({
        area: 'inference',
        severity: this.metrics.frameRate < 10 ? 'critical' : 'high',
        impact: `Frame rate of ${this.metrics.frameRate}fps below target of 15fps`,
        measurementValue: this.metrics.frameRate,
        threshold: 15
      });
    }
    
    // Memory usage bottleneck
    if (browser && 'memory' in performance) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = currentMemory - this.memoryBaseline;
      
      if (memoryIncrease > 200 * 1024 * 1024) { // 200MB
        bottlenecks.push({
          area: 'memory',
          severity: memoryIncrease > 500 * 1024 * 1024 ? 'critical' : 'high',
          impact: `Memory usage increased by ${Math.round(memoryIncrease / (1024 * 1024))}MB`,
          measurementValue: memoryIncrease,
          threshold: 200 * 1024 * 1024
        });
      }
    }
    
    return bottlenecks;
  }

  generateRecommendations(bottlenecks: BottleneckAnalysis[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.area) {
        case 'model_loading':
          recommendations.push({
            priority: 'high',
            category: 'model',
            description: 'Implement progressive model loading and quantization',
            expectedImprovement: '50-70% reduction in load time',
            implementation: 'Use INT8 quantized model, implement model streaming, add preload hints'
          });
          break;
          
        case 'inference':
          if (this.metrics.deviceCapabilities?.webgpuSupport) {
            recommendations.push({
              priority: 'critical',
              category: 'runtime',
              description: 'Switch to WebGPU execution provider',
              expectedImprovement: '2-4x inference speed improvement',
              implementation: 'Update ONNX Runtime configuration to prioritize WebGPU'
            });
          } else if (this.metrics.deviceCapabilities?.webglSupport) {
            recommendations.push({
              priority: 'high',
              category: 'runtime',
              description: 'Optimize WebGL execution provider settings',
              expectedImprovement: '30-50% inference speed improvement',
              implementation: 'Tune WebGL provider settings, reduce input resolution'
            });
          }
          
          recommendations.push({
            priority: 'medium',
            category: 'preprocessing',
            description: 'Implement dynamic input resolution scaling',
            expectedImprovement: '20-40% inference speed improvement',
            implementation: 'Scale input resolution based on device capabilities'
          });
          break;
          
        case 'memory':
          recommendations.push({
            priority: 'high',
            category: 'runtime',
            description: 'Implement memory-efficient inference with cleanup',
            expectedImprovement: '40-60% memory usage reduction',
            implementation: 'Add tensor disposal, implement memory pooling, cleanup unused resources'
          });
          break;
      }
    }
    
    // Always recommend LLM integration for better accuracy
    recommendations.push({
      priority: 'medium',
      category: 'model',
      description: 'Integrate LLM for enhanced classification accuracy',
      expectedImprovement: '15-25% accuracy improvement with context awareness',
      implementation: 'Add Ollama/WebLLM integration for post-processing and context analysis'
    });
    
    return recommendations;
  }

  async generateFullReport(): Promise<PerformanceMetrics> {
    const capabilities = await this.analyzeDeviceCapabilities();
    const bottlenecks = this.analyzeBottlenecks();
    const recommendations = this.generateRecommendations(bottlenecks);
    
    // Update memory metrics
    if (browser && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        initial: this.memoryBaseline,
        peak: memory.totalJSHeapSize,
        current: memory.usedJSHeapSize
      };
    }
    
    const fullMetrics: PerformanceMetrics = {
      modelLoadTime: this.metrics.modelLoadTime || 0,
      averageInferenceTime: this.metrics.averageInferenceTime || 0,
      memoryUsage: this.metrics.memoryUsage || { initial: 0, peak: 0, current: 0 },
      frameRate: this.metrics.frameRate || 0,
      deviceCapabilities: capabilities,
      bottlenecks,
      recommendations
    };
    
    return fullMetrics;
  }

  startMeasurement(name: string): void {
    if (browser) {
      performance.mark(`${name}-start`);
    }
  }

  endMeasurement(name: string): number {
    if (!browser) return 0;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    return measure ? measure.duration : 0;
  }

  dispose(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.frameTimestamps = [];
  }
}

// Global performance analyzer instance
export const performanceAnalyzer = new PerformanceAnalyzer();

// Export performance measurement helpers
export const measurePerformance = {
  start: (name: string) => performanceAnalyzer.startMeasurement(name),
  end: (name: string) => performanceAnalyzer.endMeasurement(name),
  report: () => performanceAnalyzer.generateFullReport()
}; 