import { InferenceSession, Tensor } from 'onnxruntime-web';
import type { Detection, ModelConfig } from '../types/index.js';
import { webglManager } from '../utils/webgl-manager.js';

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
  fallbackIndex: number;
}

export class ObjectDetector {
  private session: InferenceSession | null = null;
  private modelConfig: ModelConfig;
  private modelState: ModelState;
  private integrity: ModelIntegrity;
  private isInitialized = false;
  private verificationWorker?: Worker;
  private webglRecoveryBound: () => Promise<void>;

  constructor(config: ModelConfig) {
    this.modelConfig = config;
    this.modelState = {
      isCorrupted: false,
      lastVerified: 0,
      failureCount: 0,
      currentModel: config.modelPath,
      fallbackIndex: 0
    };
    
    this.integrity = {
      expectedSize: 12 * 1024 * 1024, // 12MB for YOLOv8n
      version: '1.0.0',
      fallbackModels: [
        '/models/yolov8n-fallback.onnx',
        '/models/yolov8s-lite.onnx',
        '/models/basic-detector.onnx'
      ]
    };

    // Bind WebGL recovery callback
    this.webglRecoveryBound = this.handleWebGLRecovery.bind(this);
    this.setupWebGLIntegration();
  }

  private setupWebGLIntegration(): void {
    // Register for WebGL context recovery
    webglManager.addRecoveryCallback(this.webglRecoveryBound);

    // Listen for WebGL events with proper typing
    window.addEventListener('webgl-context-lost', this.handleWebGLLoss.bind(this) as EventListener);
    window.addEventListener('webgl-context-restored', this.handleWebGLRestore.bind(this) as EventListener);
    window.addEventListener('gpu-memory-pressure', ((event: Event) => {
      this.handleMemoryPressure(event as CustomEvent);
    }) as EventListener);
  }

  private handleWebGLLoss(): void {
    console.warn('🔥 WebGL context lost - ML inference paused');
    this.isInitialized = false;
    
    // Don't dispose session immediately - it might recover
    // Just mark as not initialized to prevent new inferences
  }

  private handleWebGLRestore(): void {
    console.log('🔄 WebGL context restored - attempting ML recovery');
    // Recovery will be handled by the recovery callback
  }

  private async handleWebGLRecovery(): Promise<void> {
    console.log('🔄 Recovering ML detector after WebGL context restore');
    
    try {
      // Check if we need to recreate the session
      if (this.session) {
        try {
          // Test if existing session still works
          const testData = new Float32Array(1 * 3 * 32 * 32).fill(0.5);
          const testTensor = new Tensor('float32', testData, [1, 3, 32, 32]);
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
      if (webglManager.isContextAvailable()) {
        await this.initializeWithContext();
      } else {
        console.warn('WebGL context not available, deferring ML recovery');
      }
    } catch (error) {
      console.error('ML detector recovery failed:', error);
      this.modelState.failureCount++;
    }
  }

  private handleMemoryPressure(event: CustomEvent): void {
    console.warn('💾 GPU memory pressure - optimizing ML detector');
    
    const { memoryUsage, limit } = event.detail;
    
    // Reduce model complexity if needed
    if (memoryUsage > limit * 0.95) {
      this.optimizeForLowMemory();
    }
  }

  private optimizeForLowMemory(): void {
    // Switch to a smaller model if available
    if (this.modelState.fallbackIndex < this.integrity.fallbackModels.length - 1) {
      console.log('Switching to smaller model due to memory pressure');
      this.modelState.fallbackIndex++;
      this.modelState.currentModel = this.integrity.fallbackModels[this.modelState.fallbackIndex];
      
      // Recreate session with smaller model
      this.reinitialize();
    }
  }

  private async reinitialize(): Promise<void> {
    this.isInitialized = false;
    if (this.session) {
      this.session = null;
    }
    await this.initialize();
  }

  private async initializeWithContext(): Promise<void> {
    // Enhanced initialization with WebGL context awareness
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

    this.session = await InferenceSession.create(this.modelState.currentModel, sessionOptions);
  }

  async initialize(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Check WebGL availability first
        if (!webglManager.isContextAvailable()) {
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
        console.log(`🤖 YOLO model loaded successfully: ${this.modelState.currentModel}`);
        return;
        
      } catch (error) {
        attempts++;
        this.modelState.failureCount++;
        console.error(`❌ Failed to load YOLO model (attempt ${attempts}):`, error);
        
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

  private isWebGLError(error: any): boolean {
    const webglIndicators = [
      'webgl',
      'context lost',
      'gpu',
      'graphics',
      'rendering context',
      'execution provider'
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    return webglIndicators.some(indicator => errorMessage.includes(indicator));
  }

  private async fallbackToCPU(): Promise<void> {
    try {
      this.session = await InferenceSession.create(this.modelState.currentModel, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      console.log('✅ Fallback to CPU inference successful');
    } catch (error) {
      throw new Error(`CPU fallback failed: ${error}`);
    }
  }

  private async verifyModelIntegrity(modelPath: string): Promise<boolean> {
    try {
      const response = await fetch(modelPath, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`Model not accessible: ${modelPath}`);
        return false;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (Math.abs(size - this.integrity.expectedSize) > this.integrity.expectedSize * 0.1) {
          console.warn(`Model size mismatch. Expected: ${this.integrity.expectedSize}, Got: ${size}`);
          return false;
        }
      }

      // Additional integrity check with partial download
      const partialResponse = await fetch(modelPath, {
        headers: { 'Range': 'bytes=0-1023' }
      });
      
      if (partialResponse.ok) {
        const buffer = await partialResponse.arrayBuffer();
        const view = new Uint8Array(buffer);
        
        // Check for ONNX magic bytes (first 4 bytes should be ONNX header)
        if (view.length >= 4) {
          const magic = String.fromCharCode(...view.slice(0, 4));
          if (!magic.includes('ONNX') && view[0] !== 0x08) {
            console.warn('Invalid ONNX file format detected');
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Model integrity verification failed:', error);
      return false;
    }
  }

  private async verifyModelFunctionality(): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }

    try {
      // Create a minimal test tensor (1x3x64x64)
      const testData = new Float32Array(1 * 3 * 64 * 64).fill(0.5);
      const testTensor = new Tensor('float32', testData, [1, 3, 64, 64]);
      
      // Run a test inference with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model functionality test timeout')), 5000);
      });
      
      const testPromise = this.session.run({ images: testTensor });
      await Promise.race([testPromise, timeoutPromise]);
      
      console.log('✅ Model functionality verified');
    } catch (error) {
      throw new Error(`Model functionality test failed: ${error}`);
    }
  }

  private async tryFallbackModel(): Promise<boolean> {
    if (this.modelState.fallbackIndex >= this.integrity.fallbackModels.length) {
      console.error('No more fallback models available');
      return false;
    }

    const fallbackModel = this.integrity.fallbackModels[this.modelState.fallbackIndex];
    console.log(`Trying fallback model: ${fallbackModel}`);
    
    this.modelState.currentModel = fallbackModel;
    this.modelState.fallbackIndex++;
    
    return true;
  }

  private isCorruptionError(error: any): boolean {
    const corruptionIndicators = [
      'corrupted',
      'invalid format',
      'malformed',
      'unexpected end',
      'magic number',
      'checksum',
      'verification failed'
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    return corruptionIndicators.some(indicator => errorMessage.includes(indicator));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.session || !this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    // Check WebGL context before inference
    if (!webglManager.isContextAvailable()) {
      console.warn('WebGL context lost during inference, attempting recovery');
      throw new Error('WebGL context not available for inference');
    }

    // Check if model needs re-verification
    if (Date.now() - this.modelState.lastVerified > 300000) { // 5 minutes
      this.modelState.lastVerified = Date.now();
    }

    try {
      const preprocessedTensor = this.preprocessImage(imageData);
      
      // Add timeout and memory monitoring with WebGL awareness
      const inferencePromise = this.session.run({ images: preprocessedTensor });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Inference timeout')), 10000);
      });
      
      // Monitor for WebGL context loss during inference
      const contextLossPromise = new Promise((_, reject) => {
        const handleLoss = () => {
          window.removeEventListener('webgl-context-lost', handleLoss);
          reject(new Error('WebGL context lost during inference'));
        };
        window.addEventListener('webgl-context-lost', handleLoss);
        
        // Clean up listener after inference
        setTimeout(() => {
          window.removeEventListener('webgl-context-lost', handleLoss);
        }, 10000);
      });
      
      const results = await Promise.race([inferencePromise, timeoutPromise, contextLossPromise]);
      let detections = this.postprocessResults(results, imageData.width, imageData.height);
      
      // Enhanced detection limits and warnings
      if (detections.length > 15) {
        console.warn(`Excessive objects detected (${detections.length}). Performance may degrade.`);
        detections = detections.slice(0, 15);
      }
      
      if (detections.length === 0) {
        console.warn('No objects detected in frame.');
      }
      
      // Reset failure count on successful detection
      this.modelState.failureCount = 0;
      
      return detections;
    } catch (error) {
      this.modelState.failureCount++;
      console.error('❌ Detection failed:', error);
      
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
        category: 'landfill'
      }];
    }
  }

  private preprocessImage(imageData: ImageData): Tensor {
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
      tensorData[tensorIndex] = resizedData[pixelIndex] / 255.0; // R
      tensorData[tensorIndex + modelHeight * modelWidth] = resizedData[pixelIndex + 1] / 255.0; // G
      tensorData[tensorIndex + 2 * modelHeight * modelWidth] = resizedData[pixelIndex + 2] / 255.0; // B
    }
    
    return new Tensor('float32', tensorData, [1, 3, modelHeight, modelWidth]);
  }

  private postprocessResults(results: any, originalWidth: number, originalHeight: number): Detection[] {
    const output = results.output0 || results[Object.keys(results)[0]];
    if (!output || !output.data) {
      return [];
    }

    const detections: Detection[] = [];
    const data = output.data as Float32Array;
    const [modelWidth, modelHeight] = this.modelConfig.inputSize;
    
    // YOLO output format: [batch, 84, num_detections] where 84 = 4 (bbox) + 80 (classes)
    const numDetections = output.dims[2] || data.length / 84;
    
    for (let i = 0; i < numDetections; i++) {
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
      
      // Apply confidence threshold
      if (maxConfidence < this.modelConfig.threshold) {
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
        category: this.mapToCategory(className)
      });
    }
    
    // Apply Non-Maximum Suppression
    return this.applyNMS(detections);
  }

  private applyNMS(detections: Detection[]): Detection[] {
    detections.sort((a, b) => b.confidence - a.confidence);
    const results: Detection[] = [];
    const suppressed = new Set<number>();
    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;
      results.push(detections[i]);
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;
        const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
        if (iou > this.modelConfig.iouThreshold) {
          suppressed.add(j);
          console.warn(`Suppressed overlapping detection (IoU=${iou.toFixed(2)} > threshold)`);
        }
      }
    }
    if (suppressed.size > 0) {
      console.warn(`${suppressed.size} overlapping objects suppressed by NMS.`);
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

  dispose(): void {
    // Clean up WebGL integration with proper typing
    webglManager.removeRecoveryCallback(this.webglRecoveryBound);
    window.removeEventListener('webgl-context-lost', this.handleWebGLLoss.bind(this) as EventListener);
    window.removeEventListener('webgl-context-restored', this.handleWebGLRestore.bind(this) as EventListener);
    window.removeEventListener('gpu-memory-pressure', ((event: Event) => {
      this.handleMemoryPressure(event as CustomEvent);
    }) as EventListener);

    // Dispose session
    if (this.session) {
      this.session = null;
    }
    
    this.isInitialized = false;
    console.log('ObjectDetector disposed');
  }
} 