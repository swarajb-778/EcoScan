import * as ort from 'onnxruntime-web';
import type { Detection, ModelConfig } from '../types/index.js';
import { getWebGLManager } from '../utils/webgl-manager.js';
import { getAdaptiveEngine, type OptimizationStrategy } from './adaptive-engine.js';
import { abTestingFramework } from '$lib/utils/ab-testing.js';
import { modelExperiment } from '$lib/experiments';
import { isBrowser } from '../utils/browser.js';
import { diagnostic } from '../utils/diagnostic.js';
import { safeAsyncOperation, safeSyncOperation, isSecureContext } from '../utils/ssr-safe.js';
import { onnxManager } from './onnx-config.js';

// Configure ONNX Runtime properly for Vite/SvelteKit
if (isBrowser()) {
  // Set the WASM paths before any ONNX operations
  ort.env.wasm.wasmPaths = '/models/';
  ort.env.wasm.proxy = false;
  ort.env.logLevel = 'warning';
  
  diagnostic.logWarning('ONNX Runtime environment configured in detector', 'ObjectDetector');
}

// Model integrity and fallback configuration
interface ModelIntegrity {
  checksum?: string;
  expectedSize: number;
  version: string;
  fallbackModels: string[];
}

interface ModelState {
  isCorrupted: boolean;
  lastVerified: number;
  failureCount: number;
  currentModel: string;
  currentModelName: string;
  fallbackIndex: number;
}

export class ObjectDetector {
  private session: ort.InferenceSession | null = null;
  private modelConfig: ModelConfig;
  private modelState: ModelState;
  private integrity: ModelIntegrity;
  private isInitialized = false;
  private verificationWorker?: Worker;
  private webglRecoveryBound: () => Promise<void>;
  private adaptiveConfigBound: (event: Event) => void;
  private frameSkipCounter = 0;
  private lastInferenceTime = 0;
  private inferenceHistory: number[] = [];

  constructor(config: ModelConfig) {
    this.modelConfig = config;

    // A/B Testing Integration
    abTestingFramework.registerExperiment(modelExperiment);
    const modelVariantConfig = abTestingFramework.getVariantConfig(modelExperiment.id);

    this.modelState = {
      isCorrupted: false,
      lastVerified: 0,
      failureCount: 0,
      currentModel: modelVariantConfig.modelPath || config.modelPath,
      currentModelName: modelVariantConfig.modelName || 'YOLOv8n (Default)',
      fallbackIndex: 0
    };
    
    this.integrity = {
      expectedSize: 12 * 1024 * 1024, // 12MB for YOLOv8n
      version: '1.0.0',
      fallbackModels: [
        // '/models/yolov8n-fallback.onnx',
        // '/models/yolov8s-lite.onnx',
        // '/models/basic-detector.onnx'
      ]
    };

    // Bind callbacks
    this.webglRecoveryBound = this.handleWebGLRecovery.bind(this);
    this.adaptiveConfigBound = this.handleAdaptiveConfigChange.bind(this);
    
    this.setupWebGLIntegration();
    this.setupAdaptiveIntegration();
  }

  private setupWebGLIntegration(): void {
    if (!isBrowser()) {
      console.warn('Skipping WebGL integration during SSR');
      return;
    }

    const webglManager = getWebGLManager();
    if (!webglManager) {
      console.warn('WebGL manager not available');
      return;
    }

    // Register for WebGL context recovery
    webglManager.addRecoveryCallback(this.webglRecoveryBound);

    // Listen for WebGL events with proper typing
    window.addEventListener('webgl-context-lost', this.handleWebGLLoss.bind(this) as EventListener);
    window.addEventListener('webgl-context-restored', this.handleWebGLRestore.bind(this) as EventListener);
    window.addEventListener('gpu-memory-pressure', ((event: Event) => {
      this.handleMemoryPressure(event as CustomEvent);
    }) as EventListener);
  }

  private setupAdaptiveIntegration(): void {
    if (!isBrowser()) {
      console.warn('Skipping adaptive integration during SSR');
      return;
    }

    // Listen for adaptive configuration changes
    window.addEventListener('adaptive-config-change', this.adaptiveConfigBound as EventListener);
  }

  private handleWebGLLoss(event: Event): void {
    console.warn('�� WebGL context lost in ML detector');
    this.isInitialized = false;
  }

  private handleWebGLRestore(event: Event): void {
    console.log('🟢 WebGL context restored in ML detector');
    // Recovery will be handled by the WebGL manager callback
  }

  private handleMemoryPressure(event: CustomEvent): void {
    console.warn('⚠️ GPU memory pressure detected, adjusting ML detector');
    const { severity } = event.detail;
    
    if (severity === 'critical' && this.session) {
      // Force CPU fallback during memory pressure
      this.fallbackToCPU().catch(error => {
        console.error('Failed to fallback to CPU during memory pressure:', error);
      });
    }
  }

  private handleAdaptiveConfigChange(event: Event): void {
    const customEvent = event as CustomEvent;
    const { config } = customEvent.detail;
    console.log('🔄 Adaptive config changed for ML detector:', config);
    
    // Update model configuration based on adaptive settings
    if (config.qualityLevel === 'low' && this.modelState.currentModel.includes('yolov8n')) {
      // Already using the most optimized model
      return;
    }
  }

  private updatePerformanceMetrics(metrics: { inferenceTime: number }): void {
    // Update internal performance tracking
    this.inferenceHistory.push(metrics.inferenceTime);
    
    // Keep only last 10 measurements
    if (this.inferenceHistory.length > 10) {
      this.inferenceHistory.shift();
    }

    // Update adaptive engine with performance metrics
    const adaptiveEngine = getAdaptiveEngine();
    const currentTime = Date.now();
    const timeSinceLastInference = currentTime - this.lastInferenceTime;
    const estimatedFPS = timeSinceLastInference > 0 ? 1000 / timeSinceLastInference : 0;
    this.lastInferenceTime = currentTime;

    adaptiveEngine.updatePerformanceMetrics({
      fps: estimatedFPS,
      averageInferenceTime: metrics.inferenceTime,
      errors: this.modelState.failureCount
    });
  }

  private async handleWebGLRecovery(): Promise<void> {
    console.log('🔄 Recovering ML detector after WebGL context restore');
    
    try {
      // Check if we need to recreate the session
      if (this.session) {
        try {
          // Test if existing session still works
          const testData = new Float32Array(1 * 3 * 32 * 32).fill(0.5);
          const testTensor = new ort.Tensor('float32', testData, [1, 3, 32, 32]);
          await this.session.run({ images: testTensor });
          
          // If we get here, session is still valid
          this.isInitialized = true;
          console.log('✅ Existing ML session recovered successfully');
          return;
        } catch (error) {
          console.warn('Existing session invalid, recreating:', error);
          this.session = null;
        }
      }

      // Recreate the session with WebGL context check
      const webglManager = getWebGLManager();
      if (webglManager && webglManager.isContextAvailable()) {
        await this.initializeWithContext();
      } else {
        console.warn('WebGL context not available, deferring ML recovery');
      }
    } catch (error) {
      console.error('ML detector recovery failed:', error);
      this.modelState.failureCount++;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async verifyModelIntegrity(modelPath: string): Promise<boolean> {
    try {
      const response = await fetch(modelPath, { method: 'HEAD' });
      
      if (!response.ok) {
        console.warn(`Model not accessible: ${response.statusText}`);
        return false;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        const expectedSize = this.integrity.expectedSize;
        const tolerance = expectedSize * 0.1; // 10% tolerance
        
        if (Math.abs(size - expectedSize) > tolerance) {
          console.warn(`Model size mismatch: expected ~${expectedSize}, got ${size}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Model integrity check failed: ${error}`);
      return false;
    }
  }

  private async initializeWithContext(): Promise<void> {
    // Wait for ONNX Runtime to be ready
    if (!onnxManager.isReady()) {
      await onnxManager.initialize();
    }

    // Enhanced initialization with WebGL context awareness
    const webglManager = getWebGLManager();
    if (!webglManager) {
      // Fallback to CPU-only execution
      this.session = await ort.InferenceSession.create(this.modelState.currentModel, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableMemPattern: false,
        enableCpuMemArena: false
      });
      diagnostic.logWarning('ONNX session created with WASM provider only', 'ObjectDetector');
      return;
    }

    const webglState = webglManager.getState();
    const webglConfig = webglManager.getConfig();
    
    // Adjust execution providers based on WebGL state
    let executionProviders: string[] = ['wasm'];
    
    if (webglManager.isContextAvailable() && !webglState.isRecovering) {
      executionProviders.unshift('webgl');
    }
    
    // Adjust session options based on GPU capabilities
    const sessionOptions: any = {
      executionProviders,
      graphOptimizationLevel: 'all',
      enableMemPattern: false,
      enableCpuMemArena: false
    };

    // Reduce memory usage if needed
    if (webglState.memoryUsage > webglConfig.memoryLimit * 0.8) {
      sessionOptions.graphOptimizationLevel = 'basic';
      sessionOptions.enableMemPattern = true;
    }

    this.session = await ort.InferenceSession.create(this.modelState.currentModel, sessionOptions);
    diagnostic.logWarning(`ONNX session created with providers: ${executionProviders.join(', ')}`, 'ObjectDetector');
  }

  async initialize(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Wait for ONNX Runtime to be ready
        if (!onnxManager.isReady()) {
          diagnostic.logWarning('Waiting for ONNX Runtime to initialize...', 'ObjectDetector');
          await onnxManager.initialize();
        }

        const webglManager = getWebGLManager();
        
        // Check WebGL availability first
        if (!webglManager || !webglManager.isContextAvailable()) {
          console.warn('WebGL context not available, using CPU-only inference');
        }

        // Verify model integrity before loading
        const isIntact = await this.verifyModelIntegrity(this.modelState.currentModel);
        if (!isIntact) {
          console.warn(`Model integrity check failed for: ${this.modelState.currentModel}`);
          if (await this.tryFallbackModel()) {
            continue; // Retry with fallback
          } else {
            throw new Error('All fallback models failed integrity check');
          }
        }

        // Load the model with WebGL context awareness
        await this.initializeWithContext();

        // Verify model is functional with test inference
        await this.verifyModelFunctionality();
        
        this.isInitialized = true;
        this.modelState.failureCount = 0;
        this.modelState.lastVerified = Date.now();
        console.log(`🤖 YOLO model loaded successfully: ${this.modelState.currentModelName} (${this.modelState.currentModel})`);
        return;
        
      } catch (error) {
        attempts++;
        this.modelState.failureCount++;
        console.error(`Attempt ${attempts} failed for ${this.modelState.currentModel}:`, error);
        
        // Check if this is a WebGL-related error
        if (this.isWebGLError(error)) {
          console.warn('WebGL error detected, falling back to CPU inference');
          // Force CPU-only mode
          await this.fallbackToCPU();
          continue;
        }
        
        // Check if this is a corruption issue
        if (this.isCorruptionError(error)) {
          this.modelState.isCorrupted = true;
          if (await this.tryFallbackModel()) {
            attempts = 0; // Reset attempts for new model
            continue;
          }
        }
        
        if (attempts >= maxAttempts) {
          throw new Error(`Model initialization failed after ${maxAttempts} attempts: ${error}`);
        }
        
        // Progressive backoff
        await this.delay(Math.pow(2, attempts) * 1000);
      }
    }
  }

  private async fallbackToCPU(): Promise<void> {
    try {
      this.session = await ort.InferenceSession.create(this.modelState.currentModel, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      console.log('✅ Fallback to CPU inference successful');
    } catch (error) {
      throw new Error(`CPU fallback failed: ${error}`);
    }
  }

  private isWebGLError(error: any): boolean {
    const errorStr = error.toString().toLowerCase();
    return errorStr.includes('webgl') || 
           errorStr.includes('gl_') || 
           errorStr.includes('context lost') ||
           errorStr.includes('backend not found');
  }

  private isCorruptionError(error: any): boolean {
    const errorStr = error.toString().toLowerCase();
    return errorStr.includes('corrupted') || 
           errorStr.includes('invalid model') || 
           errorStr.includes('parse error');
  }

  private async tryFallbackModel(): Promise<boolean> {
    if (this.modelState.fallbackIndex >= this.integrity.fallbackModels.length) {
      return false; // No more fallbacks available
    }

    const fallbackModel = this.integrity.fallbackModels[this.modelState.fallbackIndex];
    console.log(`🔄 Trying fallback model: ${fallbackModel}`);
    
    this.modelState.currentModel = fallbackModel;
    this.modelState.currentModelName = `Fallback Model ${this.modelState.fallbackIndex + 1}`;
    this.modelState.fallbackIndex++;
    
    return true;
  }

  private async verifyModelFunctionality(): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }

    try {
      // Create test input tensor
      const testData = new Float32Array(1 * 3 * 640 * 640).fill(0.5);
      const testTensor = new ort.Tensor('float32', testData, [1, 3, 640, 640]);
      
      // Run test inference
      const startTime = performance.now();
      const results = await this.session.run({ images: testTensor });
      const inferenceTime = performance.now() - startTime;
      
      console.log(`✅ Model functionality verified (${inferenceTime.toFixed(2)}ms)`);
      
      // Verify output shape
      const output = results.output0;
      if (!output || !output.dims) {
        throw new Error('Invalid model output');
      }
      
      console.log(`📊 Model output shape: [${output.dims.join(', ')}]`);
      
    } catch (error) {
      throw new Error(`Model functionality verification failed: ${error}`);
    }
  }

  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.session || !this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    // Get current adaptive strategy
    const adaptiveEngine = getAdaptiveEngine();
    const strategy = adaptiveEngine.getCurrentStrategy();
    
    // Handle frame skipping for performance optimization
    if (this.shouldSkipFrame(strategy)) {
      return this.getLastDetections();
    }

    const webglManager = getWebGLManager();
    
    // Check WebGL context before inference
    if (webglManager && !webglManager.isContextAvailable()) {
      console.warn('WebGL context lost during inference, attempting recovery');
      throw new Error('WebGL context not available for inference');
    }

    const inferenceStart = performance.now();

    try {
      // Apply resolution reduction if needed
      const processedImageData = this.applyResolutionOptimization(imageData, strategy);
      
      // Preprocess with adaptive optimizations
      const preprocessedTensor = this.preprocessImageAdaptive(processedImageData, strategy);
      
      // Run inference with timeout based on adaptive config
      const adaptiveConfig = adaptiveEngine.getCurrentConfig();
      const timeoutMs = Math.max(5000, adaptiveConfig.maxInferenceTime * 2);
      
      const inferencePromise = this.session.run({ images: preprocessedTensor });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Adaptive inference timeout')), timeoutMs);
      });
      
      // Monitor for WebGL context loss during inference
      const contextLossPromise = new Promise((_, reject) => {
        if (!isBrowser()) {
          return; // Skip context loss monitoring during SSR
        }
        
        const handleLoss = () => {
          window.removeEventListener('webgl-context-lost', handleLoss);
          reject(new Error('WebGL context lost during inference'));
        };
        window.addEventListener('webgl-context-lost', handleLoss);
        
        // Clean up listener after inference
        setTimeout(() => {
          window.removeEventListener('webgl-context-lost', handleLoss);
        }, timeoutMs);
      });
      
      const results = await Promise.race([inferencePromise, timeoutPromise, contextLossPromise]);
      let detections = this.postprocessResultsAdaptive(results, imageData.width, imageData.height, strategy);
      
      // Apply adaptive detection limits
      if (detections.length > strategy.maxObjects) {
        console.warn(`Limiting objects from ${detections.length} to ${strategy.maxObjects} due to adaptive optimization`);
        detections = detections.slice(0, strategy.maxObjects);
      }
      
      // Apply confidence filtering based on strategy
      detections = detections.filter(detection => detection.confidence >= strategy.confidenceThreshold);
      
      if (detections.length === 0) {
        console.warn('No objects detected after adaptive filtering.');
      }
      
      // Update performance metrics
      const inferenceTime = performance.now() - inferenceStart;
      this.updatePerformanceMetrics({ inferenceTime });
      
      // Reset failure count on successful detection
      this.modelState.failureCount = 0;
      
      return detections;
    } catch (error) {
      this.modelState.failureCount++;
      console.error('❌ Adaptive detection failed:', error);
      
      // Update adaptive engine with error information
      const adaptiveEngine = getAdaptiveEngine();
      adaptiveEngine.updatePerformanceMetrics({
        errors: this.modelState.failureCount,
        averageInferenceTime: performance.now() - inferenceStart
      });
      
      // Handle WebGL-specific errors
      if (this.isWebGLError(error)) {
        console.warn('WebGL error during detection, context may be lost');
        this.isInitialized = false;
      }
      
      // Check for potential corruption after multiple failures
      if (this.modelState.failureCount > 10) {
        console.warn('Multiple detection failures detected. Model may be corrupted.');
        this.modelState.isCorrupted = true;
      }
      
      return [{
        bbox: [0, 0, 0, 0],
        class: 'unknown',
        confidence: 0,
        category: 'landfill',
        label: 'Unknown Item',
        instructions: 'Please try again with better lighting or a clearer view of the item.'
      }];
    }
  }

  private shouldSkipFrame(strategy: OptimizationStrategy): boolean {
    if (strategy.skipFrames === 0) return false;
    
    this.frameSkipCounter++;
    if (this.frameSkipCounter > strategy.skipFrames) {
      this.frameSkipCounter = 0;
      return false;
    }
    
    return true;
  }

  private getLastDetections(): Detection[] {
    // Return empty array for skipped frames
    // In a real implementation, you might want to return the last valid detections
    return [];
  }

  private applyResolutionOptimization(imageData: ImageData, strategy: OptimizationStrategy): ImageData {
    if (strategy.reduceResolution === 0) {
      return imageData;
    }
    
    const reductionFactor = (100 - strategy.reduceResolution) / 100;
    const newWidth = Math.round(imageData.width * reductionFactor);
    const newHeight = Math.round(imageData.height * reductionFactor);
    
    // Create a new canvas for resizing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Create source canvas
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCanvas.width = imageData.width;
    sourceCanvas.height = imageData.height;
    sourceCtx.putImageData(imageData, 0, 0);
    
    // Resize
    ctx.drawImage(sourceCanvas, 0, 0, imageData.width, imageData.height, 0, 0, newWidth, newHeight);
    
    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  private preprocessImageAdaptive(imageData: ImageData, strategy: OptimizationStrategy): ort.Tensor {
    const { width, height, data } = imageData;
    const [modelWidth, modelHeight] = this.modelConfig.inputSize;
    
    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = modelWidth;
    canvas.height = modelHeight;
    
    // Draw and resize image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const imgData = new ImageData(data, width, height);
    tempCtx.putImageData(imgData, 0, 0);
    
    // Apply adaptive image quality settings
    if (strategy.enableQuantization) {
      // Reduce image quality for performance
      tempCtx.filter = 'contrast(0.8) brightness(0.9)';
    }
    
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, modelWidth, modelHeight);
    
    // Get resized image data
    const resizedImageData = ctx.getImageData(0, 0, modelWidth, modelHeight);
    const { data: resizedData } = resizedImageData;
    
    // Convert to RGB tensor format [1, 3, height, width]
    const tensorData = new Float32Array(1 * 3 * modelHeight * modelWidth);
    
    for (let i = 0; i < modelHeight * modelWidth; i++) {
      const pixelIndex = i * 4; // RGBA
      const tensorIndex = i;
      
      // Normalize to [0, 1] and arrange in CHW format
      // Apply adaptive normalization based on strategy
      const normalizationFactor = strategy.enableQuantization ? 255.0 : 255.0;
      
      tensorData[tensorIndex] = resizedData[pixelIndex] / normalizationFactor; // R
      tensorData[tensorIndex + modelHeight * modelWidth] = resizedData[pixelIndex + 1] / normalizationFactor; // G
      tensorData[tensorIndex + 2 * modelHeight * modelWidth] = resizedData[pixelIndex + 2] / normalizationFactor; // B
    }
    
    return new ort.Tensor('float32', tensorData, [1, 3, modelHeight, modelWidth]);
  }

  private postprocessResultsAdaptive(results: any, originalWidth: number, originalHeight: number, strategy: OptimizationStrategy): Detection[] {
    const output = results.output0 || results[Object.keys(results)[0]];
    if (!output || !output.data) {
      return [];
    }

    const detections: Detection[] = [];
    const data = output.data as Float32Array;
    const [modelWidth, modelHeight] = this.modelConfig.inputSize;
    
    // YOLO output format: [batch, 84, num_detections] where 84 = 4 (bbox) + 80 (classes)
    const numDetections = output.dims[2] || data.length / 84;
    
    // Limit processing based on strategy
    const maxDetectionsToProcess = Math.min(numDetections, strategy.maxObjects * 2);
    
    for (let i = 0; i < maxDetectionsToProcess; i++) {
      const baseIndex = i * 84;
      
      // Extract bounding box (center_x, center_y, width, height)
      const centerX = data[baseIndex];
      const centerY = data[baseIndex + 1];
      const boxWidth = data[baseIndex + 2];
      const boxHeight = data[baseIndex + 3];
      
      // Find the class with highest confidence
      let maxConfidence = 0;
      let maxClassIndex = 0;
      
      for (let j = 4; j < 84; j++) {
        const confidence = data[baseIndex + j];
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          maxClassIndex = j - 4;
        }
      }
      
      // Apply adaptive confidence threshold
      if (maxConfidence < strategy.confidenceThreshold) {
        continue;
      }
      
      // Convert to absolute coordinates
      const x = (centerX - boxWidth / 2) * (originalWidth / modelWidth);
      const y = (centerY - boxHeight / 2) * (originalHeight / modelHeight);
      const width = boxWidth * (originalWidth / modelWidth);
      const height = boxHeight * (originalHeight / modelHeight);
      
      // Get class name from COCO classes
      const className = this.getClassName(maxClassIndex) || 'unknown';
      
      detections.push({
        bbox: [x, y, width, height],
        class: className,
        confidence: maxConfidence,
        category: this.mapToCategory(className),
        label: className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        instructions: this.getInstructionsForCategory(this.mapToCategory(className))
      });
    }
    
    // Apply adaptive NMS with adjusted IoU threshold
    const adaptiveIoUThreshold = strategy.enableQuantization ? 
      this.modelConfig.iouThreshold * 0.8 : // More aggressive NMS when quantized
      this.modelConfig.iouThreshold;
    
    return this.applyNMSAdaptive(detections, adaptiveIoUThreshold);
  }

  private applyNMSAdaptive(detections: Detection[], iouThreshold: number): Detection[] {
    detections.sort((a, b) => b.confidence - a.confidence);
    const results: Detection[] = [];
    const suppressed = new Set<number>();
    
    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;
      results.push(detections[i]);
      
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;
        const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }
    
    return results;
  }

  private calculateIoU(box1: number[], box2: number[]): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;
    
    const intersection_x1 = Math.max(x1, x2);
    const intersection_y1 = Math.max(y1, y2);
    const intersection_x2 = Math.min(x1 + w1, x2 + w2);
    const intersection_y2 = Math.min(y1 + h1, y2 + h2);
    
    const intersection_area = Math.max(0, intersection_x2 - intersection_x1) * 
                             Math.max(0, intersection_y2 - intersection_y1);
    
    const box1_area = w1 * h1;
    const box2_area = w2 * h2;
    const union_area = box1_area + box2_area - intersection_area;
    
    return intersection_area / union_area;
  }

  private getClassName(classIndex: number): string {
    // COCO class names (simplified - should match your model)
    const cocoClasses = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
      'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
      'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
      'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
      'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
      'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
      'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
      'scissors', 'teddy bear', 'hair drier', 'toothbrush'
    ];
    
    return cocoClasses[classIndex] || 'unknown';
  }

  private mapToCategory(className: string): 'recycle' | 'compost' | 'landfill' {
    // Simple mapping - will be enhanced with the classification database
    const recycleItems = ['bottle', 'cup', 'wine glass', 'book'];
    const compostItems = ['apple', 'banana', 'orange', 'broccoli', 'carrot', 'sandwich', 'pizza'];
    
    if (recycleItems.includes(className)) return 'recycle';
    if (compostItems.includes(className)) return 'compost';
    return 'landfill';
  }

  private getInstructionsForCategory(category: 'recycle' | 'compost' | 'landfill'): string {
    switch (category) {
      case 'recycle':
        return 'Clean the item before placing it in the recycling bin. Remove any food residue or liquids.';
      case 'compost':
        return 'Place in your compost bin or organic waste collection. Remove any non-organic materials first.';
      case 'landfill':
        return 'This item goes in your regular trash bin. Consider if there are alternatives to reduce waste.';
      default:
        return 'Please dispose of this item according to your local waste management guidelines.';
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in MB
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.usedJSHeapSize) {
        return Math.round(memInfo.usedJSHeapSize / (1024 * 1024));
      }
    }
    return 0;
  }

  dispose(): void {
    // Clean up adaptive integration
    if (isBrowser()) {
      window.removeEventListener('adaptive-config-change', this.adaptiveConfigBound);
    }
    
    // Clean up WebGL integration with proper typing
    const webglManager = getWebGLManager();
    if (webglManager) {
      webglManager.removeRecoveryCallback(this.webglRecoveryBound);
    }
    
    if (isBrowser()) {
      window.removeEventListener('webgl-context-lost', this.handleWebGLLoss.bind(this) as EventListener);
      window.removeEventListener('webgl-context-restored', this.handleWebGLRestore.bind(this) as EventListener);
      window.removeEventListener('gpu-memory-pressure', ((event: Event) => {
        this.handleMemoryPressure(event as CustomEvent);
      }) as EventListener);
    }

    // Dispose session
    if (this.session) {
      this.session = null;
    }
    
    this.isInitialized = false;
    console.log('ObjectDetector disposed');
  }
} 