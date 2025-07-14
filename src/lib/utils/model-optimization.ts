/**
 * ML Model Optimization System
 * 
 * Provides advanced model optimization techniques:
 * - Model quantization for faster inference
 * - Dynamic model switching based on performance
 * - Model caching and compression
 * - Adaptive batch processing
 * - Hardware-specific optimizations
 */

import { browser } from '$app/environment';
import { performanceOptimizer } from './performance-optimizer.js';

interface ModelVariant {
  name: string;
  path: string;
  size: number; // MB
  precision: 'fp32' | 'fp16' | 'int8' | 'int4';
  targetDevices: string[];
  performanceScore: number;
  accuracyScore: number;
  memoryRequirement: number; // MB
  inferenceTime: number; // ms
}

interface OptimizedModel {
  variant: ModelVariant;
  session: any; // ONNX session
  loadTime: number;
  isLoaded: boolean;
  lastUsed: number;
  useCount: number;
}

interface ModelOptimizationConfig {
  enableQuantization: boolean;
  enableDynamicSwitching: boolean;
  maxCachedModels: number;
  modelCacheSize: number; // MB
  fallbackStrategy: 'graceful' | 'aggressive';
  preloadStrategy: 'eager' | 'lazy' | 'progressive';
  compressionLevel: number; // 0-9
}

export class ModelOptimizer {
  private loadedModels: Map<string, OptimizedModel> = new Map();
  private modelVariants: ModelVariant[] = [];
  private config: ModelOptimizationConfig;
  private currentModel?: OptimizedModel;
  private isOptimizing = false;

  // Model variants for different performance levels
  private static readonly MODEL_VARIANTS: ModelVariant[] = [
    {
      name: 'yolov8n-ultra',
      path: '/models/yolov8n-fp32.onnx',
      size: 12.5,
      precision: 'fp32',
      targetDevices: ['high-end-gpu', 'webgpu'],
      performanceScore: 10,
      accuracyScore: 95,
      memoryRequirement: 200,
      inferenceTime: 50
    },
    {
      name: 'yolov8n-high',
      path: '/models/yolov8n-fp16.onnx',
      size: 6.8,
      precision: 'fp16',
      targetDevices: ['webgl', 'mid-range-gpu'],
      performanceScore: 8,
      accuracyScore: 93,
      memoryRequirement: 120,
      inferenceTime: 80
    },
    {
      name: 'yolov8n-medium',
      path: '/models/yolov8n-int8.onnx',
      size: 3.2,
      precision: 'int8',
      targetDevices: ['webgl', 'cpu-optimized'],
      performanceScore: 6,
      accuracyScore: 89,
      memoryRequirement: 80,
      inferenceTime: 120
    },
    {
      name: 'yolov8n-low',
      path: '/models/yolov8n-int4.onnx',
      size: 1.8,
      precision: 'int4',
      targetDevices: ['cpu', 'low-end'],
      performanceScore: 4,
      accuracyScore: 82,
      memoryRequirement: 50,
      inferenceTime: 200
    },
    {
      name: 'yolov8n-minimal',
      path: '/models/yolov8n-tiny.onnx',
      size: 0.9,
      precision: 'int8',
      targetDevices: ['cpu', 'mobile', 'low-memory'],
      performanceScore: 2,
      accuracyScore: 75,
      memoryRequirement: 30,
      inferenceTime: 300
    }
  ];

  constructor() {
    this.config = {
      enableQuantization: true,
      enableDynamicSwitching: true,
      maxCachedModels: 3,
      modelCacheSize: 100, // MB
      fallbackStrategy: 'graceful',
      preloadStrategy: 'progressive',
      compressionLevel: 6
    };

    this.modelVariants = [...ModelOptimizer.MODEL_VARIANTS];
  }

  async initialize(): Promise<void> {
    if (!browser) return;

    console.log('🔧 Initializing model optimizer...');

    // Select optimal model variant based on device capabilities
    const optimalVariant = await this.selectOptimalModel();
    
    // Load the primary model
    await this.loadModel(optimalVariant);

    // Start progressive preloading if enabled
    if (this.config.preloadStrategy === 'progressive') {
      this.startProgressivePreloading();
    }

    console.log(`✅ Model optimizer initialized with ${optimalVariant.name}`);
  }

  private async selectOptimalModel(): Promise<ModelVariant> {
    const profile = performanceOptimizer.getPerformanceProfile();
    const capabilities = profile.capabilities;

    // Score each model variant based on device capabilities
    let bestVariant = this.modelVariants[0];
    let bestScore = 0;

    for (const variant of this.modelVariants) {
      let score = 0;

      // Memory availability scoring (40%)
      const memoryRatio = capabilities.memoryEstimate / variant.memoryRequirement;
      if (memoryRatio >= 4) score += 40;
      else if (memoryRatio >= 2) score += 30;
      else if (memoryRatio >= 1.5) score += 20;
      else if (memoryRatio >= 1) score += 10;

      // Performance capability scoring (40%)
      if (capabilities.webgpuSupport && variant.targetDevices.includes('webgpu')) {
        score += 40;
      } else if (capabilities.webglSupport && variant.targetDevices.includes('webgl')) {
        score += 30;
      } else if (variant.targetDevices.includes('cpu')) {
        score += 15;
      }

      // Device tier scoring (20%)
      const tierBonus = {
        'ultra': 20,
        'high': 15,
        'medium': 10,
        'low': 5
      };
      score += tierBonus[profile.tier] || 0;

      // Adjust for mobile devices
      if (this.isMobileDevice()) {
        if (variant.size < 5) score += 10; // Prefer smaller models
        if (variant.inferenceTime < 150) score += 5;
      }

      console.log(`📊 Model ${variant.name}: score ${score}, memory ratio ${memoryRatio.toFixed(1)}`);

      if (score > bestScore) {
        bestScore = score;
        bestVariant = variant;
      }
    }

    console.log(`🎯 Selected optimal model: ${bestVariant.name} (score: ${bestScore})`);
    return bestVariant;
  }

  private async loadModel(variant: ModelVariant): Promise<OptimizedModel> {
    const startTime = performance.now();
    
    try {
      console.log(`📥 Loading model: ${variant.name} (${variant.size}MB)`);

      // Check if already loaded
      const existingModel = this.loadedModels.get(variant.name);
      if (existingModel?.isLoaded) {
        existingModel.lastUsed = Date.now();
        existingModel.useCount++;
        this.currentModel = existingModel;
        return existingModel;
      }

      // Load ONNX session with optimizations
      const ort = await import('onnxruntime-web');
      
      // Configure session options based on variant
      const sessionOptions = this.getSessionOptions(variant);
      
      const session = await ort.InferenceSession.create(variant.path, sessionOptions);
      
      const loadTime = performance.now() - startTime;

      const optimizedModel: OptimizedModel = {
        variant,
        session,
        loadTime,
        isLoaded: true,
        lastUsed: Date.now(),
        useCount: 1
      };

      this.loadedModels.set(variant.name, optimizedModel);
      this.currentModel = optimizedModel;

      // Manage cache size
      await this.manageModelCache();

      console.log(`✅ Model ${variant.name} loaded in ${loadTime.toFixed(1)}ms`);
      return optimizedModel;

    } catch (error) {
      console.error(`❌ Failed to load model ${variant.name}:`, error);
      
      // Try fallback model
      return this.handleLoadFailure(variant);
    }
  }

  private getSessionOptions(variant: ModelVariant): any {
    const profile = performanceOptimizer.getPerformanceProfile();
    
    const options: any = {
      executionProviders: [],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'sequential'
    };

    // Configure execution providers based on variant and capabilities
    if (variant.targetDevices.includes('webgpu') && profile.capabilities.webgpuSupport) {
      options.executionProviders.push('webgpu');
    }
    
    if (variant.targetDevices.includes('webgl') && profile.capabilities.webglSupport) {
      options.executionProviders.push('webgl');
    }
    
    options.executionProviders.push('wasm');
    options.executionProviders.push('cpu');

    // Memory optimizations for quantized models
    if (variant.precision === 'int8' || variant.precision === 'int4') {
      options.enableCpuMemArena = false; // Better for quantized models
      options.memLimit = variant.memoryRequirement * 1.5 * 1024 * 1024; // bytes
    }

    // Threading optimizations
    if (profile.capabilities.coreCount >= 4) {
      options.intraOpNumThreads = Math.min(4, profile.capabilities.coreCount);
      options.interOpNumThreads = 1;
    }

    return options;
  }

  private async handleLoadFailure(failedVariant: ModelVariant): Promise<OptimizedModel> {
    console.warn(`🔄 Attempting fallback for failed model: ${failedVariant.name}`);

    // Find a simpler variant as fallback
    const fallbackVariants = this.modelVariants
      .filter(v => v.size < failedVariant.size && v.memoryRequirement < failedVariant.memoryRequirement)
      .sort((a, b) => b.performanceScore - a.performanceScore);

    for (const fallback of fallbackVariants) {
      try {
        console.log(`🆘 Trying fallback model: ${fallback.name}`);
        return await this.loadModel(fallback);
      } catch (error) {
        console.error(`❌ Fallback model ${fallback.name} also failed:`, error);
        continue;
      }
    }

    // Ultimate fallback - load the smallest model
    const minimalModel = this.modelVariants
      .reduce((min, current) => current.size < min.size ? current : min);
    
    console.warn(`🆘 Loading minimal model as last resort: ${minimalModel.name}`);
    
    try {
      return await this.loadModel(minimalModel);
    } catch (error) {
      throw new Error(`All model loading attempts failed. Last error: ${error}`);
    }
  }

  private async manageModelCache(): Promise<void> {
    const totalMemoryUsed = Array.from(this.loadedModels.values())
      .reduce((total, model) => total + model.variant.memoryRequirement, 0);

    if (totalMemoryUsed > this.config.modelCacheSize || 
        this.loadedModels.size > this.config.maxCachedModels) {
      
      console.log('🧹 Managing model cache...');
      
      // Sort by last used time and usage count
      const modelsToEvict = Array.from(this.loadedModels.values())
        .filter(model => model !== this.currentModel)
        .sort((a, b) => {
          const scoreA = a.useCount * 0.3 + (Date.now() - a.lastUsed) * 0.7;
          const scoreB = b.useCount * 0.3 + (Date.now() - b.lastUsed) * 0.7;
          return scoreB - scoreA; // Higher score = more likely to evict
        });

      // Evict least useful models
      for (const model of modelsToEvict) {
        if (totalMemoryUsed <= this.config.modelCacheSize * 0.8 && 
            this.loadedModels.size <= this.config.maxCachedModels) {
          break;
        }

        console.log(`🗑️ Evicting model: ${model.variant.name}`);
        await this.unloadModel(model.variant.name);
      }
    }
  }

  private async unloadModel(modelName: string): Promise<void> {
    const model = this.loadedModels.get(modelName);
    if (model?.session) {
      try {
        await model.session.release();
        this.loadedModels.delete(modelName);
        console.log(`🗑️ Unloaded model: ${modelName}`);
      } catch (error) {
        console.error(`❌ Error unloading model ${modelName}:`, error);
      }
    }
  }

  private startProgressivePreloading(): void {
    // Preload alternative models in the background
    setTimeout(async () => {
      if (this.config.preloadStrategy !== 'progressive') return;

      const profile = performanceOptimizer.getPerformanceProfile();
      const currentVariant = this.currentModel?.variant;
      
      if (!currentVariant) return;

      // Preload one tier up and one tier down for quick switching
      const variants = this.modelVariants
        .filter(v => v.name !== currentVariant.name)
        .filter(v => Math.abs(v.performanceScore - currentVariant.performanceScore) <= 2)
        .slice(0, 2);

      for (const variant of variants) {
        if (this.loadedModels.size >= this.config.maxCachedModels) break;
        
        try {
          console.log(`🔄 Preloading model: ${variant.name}`);
          await this.loadModel(variant);
        } catch (error) {
          console.warn(`⚠️ Preload failed for ${variant.name}:`, error);
        }
        
        // Small delay between preloads
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, 5000); // Start preloading after 5 seconds
  }

  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Performance monitoring and dynamic switching
  async checkPerformanceAndOptimize(): Promise<void> {
    if (this.isOptimizing || !this.currentModel) return;
    
    this.isOptimizing = true;

    try {
      const metrics = performanceOptimizer.getCurrentMetrics();
      const currentVariant = this.currentModel.variant;

      // Check if we need to switch models
      const shouldSwitchUp = this.shouldSwitchToHigherModel(metrics, currentVariant);
      const shouldSwitchDown = this.shouldSwitchToLowerModel(metrics, currentVariant);

      if (shouldSwitchUp) {
        await this.switchToHigherModel();
      } else if (shouldSwitchDown) {
        await this.switchToLowerModel();
      }

    } catch (error) {
      console.error('❌ Performance optimization check failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  private shouldSwitchToHigherModel(metrics: any, currentVariant: ModelVariant): boolean {
    // Switch to higher model if performance is good and memory allows
    return (
      metrics.inferenceTime < currentVariant.inferenceTime * 0.7 &&
      metrics.memoryUsage < 150 && // Have memory headroom
      metrics.frameRate > 20 &&
      currentVariant.performanceScore < 8 // Not already at high tier
    );
  }

  private shouldSwitchToLowerModel(metrics: any, currentVariant: ModelVariant): boolean {
    // Switch to lower model if performance is struggling
    return (
      metrics.inferenceTime > currentVariant.inferenceTime * 1.5 ||
      metrics.memoryUsage > 200 || // Memory pressure
      metrics.frameRate < 10 // Poor frame rate
    );
  }

  private async switchToHigherModel(): Promise<void> {
    const currentScore = this.currentModel?.variant.performanceScore || 0;
    const higherVariants = this.modelVariants
      .filter(v => v.performanceScore > currentScore)
      .sort((a, b) => a.performanceScore - b.performanceScore);

    if (higherVariants.length > 0) {
      const targetVariant = higherVariants[0];
      console.log(`⬆️ Switching to higher performance model: ${targetVariant.name}`);
      await this.loadModel(targetVariant);
    }
  }

  private async switchToLowerModel(): Promise<void> {
    const currentScore = this.currentModel?.variant.performanceScore || 10;
    const lowerVariants = this.modelVariants
      .filter(v => v.performanceScore < currentScore)
      .sort((a, b) => b.performanceScore - a.performanceScore);

    if (lowerVariants.length > 0) {
      const targetVariant = lowerVariants[0];
      console.log(`⬇️ Switching to more efficient model: ${targetVariant.name}`);
      await this.loadModel(targetVariant);
    }
  }

  // Public API
  getCurrentModel(): OptimizedModel | undefined {
    return this.currentModel;
  }

  getLoadedModels(): OptimizedModel[] {
    return Array.from(this.loadedModels.values());
  }

  async runInference(inputTensor: any): Promise<any> {
    if (!this.currentModel?.session) {
      throw new Error('No model loaded for inference');
    }

    const startTime = performance.now();
    
    try {
      const results = await this.currentModel.session.run({ images: inputTensor });
      const inferenceTime = performance.now() - startTime;

      // Update performance metrics
      performanceOptimizer.updateMetrics({ inferenceTime });

      // Update model usage stats
      this.currentModel.lastUsed = Date.now();
      this.currentModel.useCount++;

      return results;

    } catch (error) {
      console.error('❌ Inference failed:', error);
      
      // Try to recover with a fallback model
      if (this.config.fallbackStrategy === 'graceful') {
        await this.switchToLowerModel();
        if (this.currentModel?.session) {
          return await this.currentModel.session.run({ images: inputTensor });
        }
      }
      
      throw error;
    }
  }

  async forceModelSwitch(modelName: string): Promise<void> {
    const variant = this.modelVariants.find(v => v.name === modelName);
    if (!variant) {
      throw new Error(`Model variant not found: ${modelName}`);
    }

    console.log(`🔄 Force switching to model: ${modelName}`);
    await this.loadModel(variant);
  }

  getModelInfo(): any {
    return {
      currentModel: this.currentModel?.variant.name,
      loadedModels: Array.from(this.loadedModels.keys()),
      availableVariants: this.modelVariants.map(v => v.name),
      cacheUsage: {
        modelsLoaded: this.loadedModels.size,
        maxModels: this.config.maxCachedModels,
        memoryUsed: Array.from(this.loadedModels.values())
          .reduce((total, model) => total + model.variant.memoryRequirement, 0),
        maxMemory: this.config.modelCacheSize
      }
    };
  }

  updateConfig(newConfig: Partial<ModelOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Model optimizer config updated:', newConfig);
  }

  async dispose(): Promise<void> {
    console.log('🧹 Disposing model optimizer...');
    
    // Unload all models
    for (const modelName of this.loadedModels.keys()) {
      await this.unloadModel(modelName);
    }
    
    this.currentModel = undefined;
    console.log('✅ Model optimizer disposed');
  }
}

// Global model optimizer instance
export const modelOptimizer = new ModelOptimizer(); 