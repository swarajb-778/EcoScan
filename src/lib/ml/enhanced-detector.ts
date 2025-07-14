/**
 * Enhanced High-Performance Detection System with LLM Integration
 * 
 * Features:
 * - Quantized models for faster inference
 * - WebGPU acceleration when available
 * - LLM-powered context analysis and classification
 * - Progressive loading and adaptive optimization
 * - Multi-model ensemble for higher accuracy
 */

import * as ort from 'onnxruntime-web';
import type { Detection, ModelConfig } from '../types/index.js';
import { performanceAnalyzer, measurePerformance } from '../utils/performance-analysis.js';
import { browser } from '$app/environment';

interface EnhancedDetection extends Detection {
  llmContext?: LLMAnalysis;
  confidenceCalibrated: number;
  ensembleScore: number;
  contextualRelevance: number;
}

interface LLMAnalysis {
  description: string;
  contextualTags: string[];
  disposalRecommendation: string;
  environmentalImpact: string;
  confidenceScore: number;
  reasoning: string;
}

interface ModelEnsemble {
  primaryModel: ort.InferenceSession | null;
  quantizedModel: ort.InferenceSession | null;
  fallbackModel: ort.InferenceSession | null;
  activeModel: 'primary' | 'quantized' | 'fallback';
}

interface OptimizedConfig {
  inputResolution: [number, number];
  batchSize: number;
  confidenceThreshold: number;
  maxDetections: number;
  enableLLM: boolean;
  enableEnsemble: boolean;
  executionProviders: string[];
}

export class EnhancedDetector {
  private ensemble: ModelEnsemble;
  private config: OptimizedConfig;
  private llmWorker?: Worker;
  private isInitialized = false;
  private deviceCapabilities: any;

  // Model paths for different performance tiers
  private static readonly MODEL_CONFIGS = {
    ultra: {
      primary: '/models/yolov8n.onnx',
      quantized: '/models/yolov8n-int8.onnx',
      fallback: '/models/yolov8n-lite.onnx'
    },
    high: {
      primary: '/models/yolov8n.onnx',
      quantized: '/models/yolov8n-int8.onnx',
      fallback: '/models/basic-detector.onnx'
    },
    medium: {
      primary: '/models/yolov8n-int8.onnx',
      quantized: '/models/yolov8n-lite.onnx',
      fallback: '/models/basic-detector.onnx'
    },
    low: {
      primary: '/models/yolov8n-lite.onnx',
      quantized: '/models/basic-detector.onnx',
      fallback: '/models/fallback-detector.onnx'
    }
  };

  constructor() {
    this.ensemble = {
      primaryModel: null,
      quantizedModel: null,
      fallbackModel: null,
      activeModel: 'primary'
    };

    this.config = {
      inputResolution: [640, 640],
      batchSize: 1,
      confidenceThreshold: 0.5,
      maxDetections: 10,
      enableLLM: true,
      enableEnsemble: false,
      executionProviders: ['webgl', 'cpu']
    };

    this.initializeLLMWorker();
  }

  private initializeLLMWorker(): void {
    if (!browser) return;

    try {
      // Create LLM worker for context analysis
      this.llmWorker = new Worker(
        new URL('../workers/llm-analysis-worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.llmWorker.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'analysis-complete') {
          this.handleLLMAnalysis(data);
        }
      };

      this.llmWorker.onerror = (error) => {
        console.warn('LLM Worker error:', error);
        this.config.enableLLM = false;
      };
    } catch (error) {
      console.warn('Failed to initialize LLM worker:', error);
      this.config.enableLLM = false;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    measurePerformance.start('enhanced-detector-init');

    try {
      // Analyze device capabilities first
      this.deviceCapabilities = await performanceAnalyzer.analyzeDeviceCapabilities();
      
      // Optimize configuration based on device
      this.optimizeConfigForDevice();

      // Configure ONNX Runtime for optimal performance
      await this.configureONNXRuntime();

      // Load models based on performance tier
      await this.loadOptimalModels();

      // Initialize LLM if enabled
      if (this.config.enableLLM) {
        await this.initializeLLM();
      }

      this.isInitialized = true;
      
      const initTime = measurePerformance.end('enhanced-detector-init');
      console.log(`🚀 Enhanced detector initialized in ${initTime.toFixed(1)}ms`);

    } catch (error) {
      console.error('Enhanced detector initialization failed:', error);
      await this.fallbackInitialization();
    }
  }

  private optimizeConfigForDevice(): void {
    const { performanceTier, webgpuSupport, webglSupport } = this.deviceCapabilities;

    // Adjust resolution based on performance tier
    switch (performanceTier) {
      case 'ultra':
        this.config.inputResolution = [640, 640];
        this.config.enableEnsemble = true;
        this.config.maxDetections = 15;
        break;
      case 'high':
        this.config.inputResolution = [512, 512];
        this.config.enableEnsemble = true;
        this.config.maxDetections = 12;
        break;
      case 'medium':
        this.config.inputResolution = [416, 416];
        this.config.enableEnsemble = false;
        this.config.maxDetections = 10;
        break;
      case 'low':
        this.config.inputResolution = [320, 320];
        this.config.enableEnsemble = false;
        this.config.maxDetections = 5;
        this.config.enableLLM = false;
        break;
    }

    // Configure execution providers
    if (webgpuSupport) {
      this.config.executionProviders = ['webgpu', 'webgl', 'wasm', 'cpu'];
    } else if (webglSupport) {
      this.config.executionProviders = ['webgl', 'wasm', 'cpu'];
    } else {
      this.config.executionProviders = ['wasm', 'cpu'];
    }

    console.log(`🎯 Optimized config for ${performanceTier} performance tier:`, this.config);
  }

  private async configureONNXRuntime(): Promise<void> {
    if (!browser) return;

    // Set optimal ONNX Runtime configuration
    ort.env.wasm.wasmPaths = '/models/';
    ort.env.wasm.numThreads = Math.min(this.deviceCapabilities.coreCount, 4);
    ort.env.wasm.simd = true;
    ort.env.wasm.proxy = false;

    // WebGL optimizations
    ort.env.webgl.contextId = 'webgl2';
    ort.env.webgl.matmulMaxBatchSize = this.config.batchSize;
    ort.env.webgl.textureCacheMode = 'full';

    // WebGPU optimizations if available
    if (this.deviceCapabilities.webgpuSupport) {
      ort.env.webgpu.validateInputContent = false;
    }

    console.log('⚙️ ONNX Runtime configured for optimal performance');
  }

  private async loadOptimalModels(): Promise<void> {
    const tier = this.deviceCapabilities.performanceTier as keyof typeof EnhancedDetector.MODEL_CONFIGS;
    const modelPaths = EnhancedDetector.MODEL_CONFIGS[tier];

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: this.config.executionProviders.map(provider => {
        if (provider === 'webgl') {
          return {
            name: 'webgl',
            deviceType: 'gpu',
            powerPreference: 'high-performance'
          } as any;
        }
        if (provider === 'webgpu') {
          return {
            name: 'webgpu',
            deviceType: 'gpu',
            powerPreference: 'high-performance'
          } as any;
        }
        return provider;
      }),
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      logSeverityLevel: 2
    };

    try {
      // Load primary model (always required)
      console.log(`📥 Loading primary model: ${modelPaths.primary}`);
      this.ensemble.primaryModel = await ort.InferenceSession.create(
        modelPaths.primary, 
        sessionOptions
      );

      // Load quantized model for ensemble if enabled
      if (this.config.enableEnsemble) {
        try {
          console.log(`📥 Loading quantized model: ${modelPaths.quantized}`);
          this.ensemble.quantizedModel = await ort.InferenceSession.create(
            modelPaths.quantized,
            sessionOptions
          );
        } catch (error) {
          console.warn('Failed to load quantized model:', error);
        }
      }

      // Determine active model based on what loaded successfully
      if (this.ensemble.primaryModel) {
        this.ensemble.activeModel = 'primary';
      } else {
        throw new Error('Failed to load any models');
      }

      console.log(`✅ Models loaded successfully. Active: ${this.ensemble.activeModel}`);

    } catch (error) {
      console.error('Failed to load optimal models:', error);
      throw error;
    }
  }

  private async initializeLLM(): Promise<void> {
    if (!this.llmWorker) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('LLM initialization timeout'));
      }, 10000);

      const messageHandler = (event: MessageEvent) => {
        const { type, success } = event.data;
        if (type === 'llm-init-complete') {
          clearTimeout(timeout);
          this.llmWorker!.removeEventListener('message', messageHandler);
          
          if (success) {
            console.log('🧠 LLM analysis system initialized');
            resolve();
          } else {
            console.warn('LLM initialization failed, disabling LLM features');
            this.config.enableLLM = false;
            resolve();
          }
        }
      };

      this.llmWorker.addEventListener('message', messageHandler);
      this.llmWorker.postMessage({ type: 'init-llm' });
    });
  }

  private async fallbackInitialization(): Promise<void> {
    console.warn('🔄 Attempting fallback initialization...');
    
    try {
      // Try with basic configuration
      this.config.inputResolution = [320, 320];
      this.config.enableEnsemble = false;
      this.config.enableLLM = false;
      this.config.executionProviders = ['cpu'];

      this.ensemble.primaryModel = await ort.InferenceSession.create('/models/yolov8n.onnx', {
        executionProviders: ['cpu']
      });

      this.ensemble.activeModel = 'primary';
      this.isInitialized = true;
      
      console.log('✅ Fallback initialization successful');
    } catch (error) {
      console.error('❌ Fallback initialization failed:', error);
      throw new Error('All initialization methods failed');
    }
  }

  async detect(imageData: ImageData): Promise<EnhancedDetection[]> {
    if (!this.isInitialized) {
      throw new Error('Enhanced detector not initialized');
    }

    measurePerformance.start('enhanced-detection');

    try {
      // Preprocess image with adaptive optimization
      const tensorData = this.preprocessImage(imageData);

      // Run detection (with ensemble if enabled)
      let detections: Detection[];
      if (this.config.enableEnsemble && this.ensemble.quantizedModel) {
        detections = await this.runEnsembleDetection(tensorData);
      } else {
        detections = await this.runSingleModelDetection(tensorData);
      }

      // Filter and enhance detections
      let enhancedDetections = this.enhanceDetections(detections, imageData);

      // Apply LLM analysis if enabled
      if (this.config.enableLLM && enhancedDetections.length > 0) {
        enhancedDetections = await this.applyLLMAnalysis(enhancedDetections, imageData);
      }

      // Apply final filtering and sorting
      enhancedDetections = this.finalizeDetections(enhancedDetections);

      const detectionTime = measurePerformance.end('enhanced-detection');
      console.log(`🔍 Enhanced detection completed in ${detectionTime.toFixed(1)}ms - Found ${enhancedDetections.length} objects`);

      return enhancedDetections;

    } catch (error) {
      console.error('Enhanced detection failed:', error);
      
      // Fallback to basic detection
      return this.fallbackDetection(imageData);
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const [modelWidth, modelHeight] = this.config.inputResolution;
    
    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    canvas.width = modelWidth;
    canvas.height = modelHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw and resize image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, modelWidth, modelHeight);
    
    // Get resized image data
    const resizedImageData = ctx.getImageData(0, 0, modelWidth, modelHeight);
    const { data } = resizedImageData;

    // Convert to RGB tensor format
    const rgbData = new Float32Array(3 * modelWidth * modelHeight);
    
    for (let i = 0; i < modelWidth * modelHeight; i++) {
      rgbData[i] = data[i * 4] / 255.0;                    // R
      rgbData[modelWidth * modelHeight + i] = data[i * 4 + 1] / 255.0;    // G  
      rgbData[2 * modelWidth * modelHeight + i] = data[i * 4 + 2] / 255.0; // B
    }

    return new ort.Tensor('float32', rgbData, [1, 3, modelHeight, modelWidth]);
  }

  private async runSingleModelDetection(tensorData: ort.Tensor): Promise<Detection[]> {
    const model = this.ensemble.primaryModel!;
    
    measurePerformance.start('model-inference');
    const results = await model.run({ images: tensorData });
    const inferenceTime = measurePerformance.end('model-inference');

    console.log(`⚡ Single model inference: ${inferenceTime.toFixed(1)}ms`);

    return this.postprocessResults(results, this.config.inputResolution);
  }

  private async runEnsembleDetection(tensorData: ort.Tensor): Promise<Detection[]> {
    const promises: Promise<Detection[]>[] = [];

    // Run primary model
    promises.push(this.runSingleModelDetection(tensorData));

         // Run quantized model if available
     if (this.ensemble.quantizedModel) {
       measurePerformance.start('quantized-inference');
       const quantizedModel = this.ensemble.quantizedModel;
       const quantizedPromise = quantizedModel.run({ images: tensorData })
         .then(results => {
           const inferenceTime = measurePerformance.end('quantized-inference');
           console.log(`⚡ Quantized model inference: ${inferenceTime.toFixed(1)}ms`);
           return this.postprocessResults(results, this.config.inputResolution);
         });
       promises.push(quantizedPromise);
     }

    // Wait for all models to complete
    const allDetections = await Promise.all(promises);

    // Combine and deduplicate results
    return this.combineEnsembleResults(allDetections);
  }

  private combineEnsembleResults(allDetections: Detection[][]): Detection[] {
    if (allDetections.length === 1) {
      return allDetections[0];
    }

         const combined: Detection[] = [];
     const [primaryDetections, quantizedDetections = []] = allDetections;

         // Use primary detections as base
     for (const primary of primaryDetections || []) {
       // Find matching detection in quantized results
       const match = quantizedDetections.find(q => 
         this.calculateIoU(primary.bbox, q.bbox) > 0.5 && primary.class === q.class
       );

      if (match) {
        // Combine confidence scores (weighted average)
        const combinedConfidence = (primary.confidence * 0.7) + (match.confidence * 0.3);
        combined.push({
          ...primary,
          confidence: combinedConfidence,
          // Store ensemble information for later analysis
          bbox: primary.bbox
        });
      } else {
        // Use primary detection only
        combined.push(primary);
      }
    }

    // Add unique quantized detections
    for (const quantized of quantizedDetections) {
      const exists = combined.some(c => 
        this.calculateIoU(c.bbox, quantized.bbox) > 0.5 && c.class === quantized.class
      );
      
      if (!exists && quantized.confidence > 0.7) {
        combined.push(quantized);
      }
    }

    return combined;
  }

  private calculateIoU(box1: number[], box2: number[]): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;

    const intersection = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2)) *
                        Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));

    const union = w1 * h1 + w2 * h2 - intersection;

    return union > 0 ? intersection / union : 0;
  }

  private postprocessResults(results: any, inputSize: [number, number]): Detection[] {
    const output = results.output0 || results[Object.keys(results)[0]];
    if (!output || !output.data) {
      return [];
    }

    const detections: Detection[] = [];
    const data = output.data as Float32Array;
    const [modelWidth, modelHeight] = inputSize;

    // YOLOv8 output format: [batch, 84, num_detections]
    const numDetections = output.dims[2] || data.length / 84;

    for (let i = 0; i < Math.min(numDetections, this.config.maxDetections * 2); i++) {
      const baseIndex = i * 84;

      // Extract bounding box
      const centerX = data[baseIndex];
      const centerY = data[baseIndex + 1];
      const boxWidth = data[baseIndex + 2];
      const boxHeight = data[baseIndex + 3];

      // Find best class
      let maxConfidence = 0;
      let maxClassIndex = 0;

      for (let j = 4; j < 84; j++) {
        const confidence = data[baseIndex + j];
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          maxClassIndex = j - 4;
        }
      }

      if (maxConfidence < this.config.confidenceThreshold) {
        continue;
      }

      // Convert to absolute coordinates
      const x = centerX - boxWidth / 2;
      const y = centerY - boxHeight / 2;

      const className = this.getClassName(maxClassIndex);
      
      detections.push({
        bbox: [x, y, boxWidth, boxHeight],
        class: className,
        confidence: maxConfidence,
        category: this.mapToCategory(className),
        label: className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        instructions: this.getInstructions(className)
      });
    }

    // Apply NMS
    return this.applyNMS(detections);
  }

  private enhanceDetections(detections: Detection[], imageData: ImageData): EnhancedDetection[] {
    return detections.map(detection => ({
      ...detection,
      confidenceCalibrated: this.calibrateConfidence(detection.confidence, detection.class),
      ensembleScore: detection.confidence, // Will be updated if ensemble was used
      contextualRelevance: this.calculateContextualRelevance(detection, imageData)
    }));
  }

  private calibrateConfidence(confidence: number, className: string): number {
    // Apply class-specific confidence calibration
    const calibrationFactors: Record<string, number> = {
      'bottle': 0.95,
      'cup': 0.90,
      'bowl': 0.85,
      'banana': 0.92,
      'apple': 0.90,
      'sandwich': 0.88,
      // Add more class-specific factors
    };

    const factor = calibrationFactors[className] || 0.85;
    return Math.min(confidence * factor, 1.0);
  }

  private calculateContextualRelevance(detection: Detection, imageData: ImageData): number {
    // Simple contextual analysis based on object size and position
    const [x, y, width, height] = detection.bbox;
    const imageWidth = imageData.width;
    const imageHeight = imageData.height;

    // Normalize bbox to image dimensions
    const normalizedArea = (width * height) / (imageWidth * imageHeight);
    const centeredness = 1 - Math.abs((x + width/2) - imageWidth/2) / (imageWidth/2);

    // Objects that are larger and more centered are more relevant
    return (normalizedArea * 0.6) + (centeredness * 0.4);
  }

  private async applyLLMAnalysis(detections: EnhancedDetection[], imageData: ImageData): Promise<EnhancedDetection[]> {
    if (!this.llmWorker) return detections;

    try {
      // Convert image to base64 for LLM analysis
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Send to LLM worker
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('LLM analysis timeout, returning original detections');
          resolve(detections);
        }, 3000);

        const messageHandler = (event: MessageEvent) => {
          const { type, detections: enhancedDetections } = event.data;
          if (type === 'llm-analysis-complete') {
            clearTimeout(timeout);
            this.llmWorker!.removeEventListener('message', messageHandler);
            resolve(enhancedDetections || detections);
          }
        };

        this.llmWorker.addEventListener('message', messageHandler);
        this.llmWorker.postMessage({
          type: 'analyze-detections',
          detections,
          imageBase64
        });
      });

    } catch (error) {
      console.warn('LLM analysis failed:', error);
      return detections;
    }
  }

  private finalizeDetections(detections: EnhancedDetection[]): EnhancedDetection[] {
    // Sort by ensemble score (confidence + contextual relevance + LLM score)
    const scored = detections.map(detection => ({
      ...detection,
      finalScore: (
        detection.confidenceCalibrated * 0.5 +
        detection.contextualRelevance * 0.2 +
        (detection.llmContext?.confidenceScore || detection.confidence) * 0.3
      )
    }));

    // Sort by final score and limit results
    return scored
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, this.config.maxDetections);
  }

  private async fallbackDetection(imageData: ImageData): Promise<EnhancedDetection[]> {
    console.warn('🔄 Using fallback detection...');
    
    // Simple fallback detection - return mock results or basic analysis
    return [{
      bbox: [100, 100, 200, 200],
      class: 'unknown',
      confidence: 0.3,
      category: 'landfill',
      label: 'Unidentified Object',
      instructions: 'Please try again with better lighting',
      confidenceCalibrated: 0.25,
      ensembleScore: 0.3,
      contextualRelevance: 0.5
    }];
  }

  // Helper methods
  private applyNMS(detections: Detection[]): Detection[] {
    const result: Detection[] = [];
    const sorted = detections.sort((a, b) => b.confidence - a.confidence);

    for (const detection of sorted) {
      let shouldKeep = true;
      
      for (const kept of result) {
        if (this.calculateIoU(detection.bbox, kept.bbox) > 0.4) {
          shouldKeep = false;
          break;
        }
      }
      
      if (shouldKeep) {
        result.push(detection);
      }
    }

    return result;
  }

  private getClassName(classIndex: number): string {
    // COCO class names (simplified for waste detection)
    const classNames = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
      'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
      'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
      'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
      'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake'
    ];
    
    return classNames[classIndex] || 'unknown';
  }

  private mapToCategory(className: string): 'recycle' | 'compost' | 'landfill' {
    const recyclables = ['bottle', 'cup', 'bowl'];
    const compostables = ['banana', 'apple', 'orange', 'broccoli', 'carrot'];
    
    if (recyclables.includes(className)) return 'recycle';
    if (compostables.includes(className)) return 'compost';
    return 'landfill';
  }

  private getInstructions(className: string): string {
    const instructions: Record<string, string> = {
      'bottle': 'Remove cap and rinse before recycling',
      'cup': 'Check if recyclable in your area',
      'banana': 'Can be composted with peel',
      'apple': 'Remove stickers before composting',
    };
    
    return instructions[className] || 'Check local disposal guidelines';
  }

  private handleLLMAnalysis(data: any): void {
    // Handle LLM analysis results
    console.log('📝 LLM analysis received:', data);
  }

  dispose(): void {
    this.ensemble.primaryModel?.release();
    this.ensemble.quantizedModel?.release();
    this.ensemble.fallbackModel?.release();
    
    if (this.llmWorker) {
      this.llmWorker.terminate();
    }
    
    performanceAnalyzer.dispose();
  }
} 