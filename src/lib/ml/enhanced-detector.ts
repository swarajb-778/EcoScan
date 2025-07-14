import * as ort from 'onnxruntime-web';
import type { Detection, ModelConfig } from '$lib/types/index.js';
import { isBrowser } from '$lib/utils/browser.js';

// Advanced preprocessing techniques
interface ImageEnhancement {
  contrastAdjustment: number;
  brightnessAdjustment: number;
  gammaCorrection: number;
  noiseReduction: boolean;
  sharpening: boolean;
  edgeEnhancement: boolean;
}

interface DetectionContext {
  lighting: 'bright' | 'normal' | 'dim' | 'dark';
  complexity: 'simple' | 'moderate' | 'complex';
  sceneType: 'kitchen' | 'office' | 'outdoor' | 'generic';
  itemCount: number;
  averageSize: number;
}

interface LLMClassificationRequest {
  imageDescription: string;
  detectedObjects: string[];
  context: DetectionContext;
  confidence: number;
}

interface LLMClassificationResponse {
  classification: string;
  category: 'recycle' | 'compost' | 'landfill' | 'hazardous' | 'reuse';
  confidence: number;
  reasoning: string;
  instructions: string;
  tips: string[];
  subcategory?: string;
}

export class EnhancedObjectDetector {
  private session: ort.InferenceSession | null = null;
  private modelConfig: ModelConfig;
  private isInitialized = false;
  private preprocessingWorker: Worker | null = null;
  private llmWorker: Worker | null = null;
  private detectionHistory: Detection[] = [];
  private classificationCache = new Map<string, LLMClassificationResponse>();
  private contextAnalyzer: ContextAnalyzer;
  private imageEnhancer: ImageEnhancer;
  private multiscaleDetector: MultiscaleDetector;

  constructor(config: ModelConfig) {
    this.modelConfig = {
      ...config,
      confidenceThreshold: config.threshold || 0.3, // Lower threshold for better recall
      nmsThreshold: config.iouThreshold || 0.5,
      enableMultiscale: true,
      enableLLMClassification: true,
      enableImageEnhancement: true,
      maxDetections: 50
    };

    this.contextAnalyzer = new ContextAnalyzer();
    this.imageEnhancer = new ImageEnhancer();
    this.multiscaleDetector = new MultiscaleDetector();
  }

  async initialize(): Promise<void> {
    if (!isBrowser()) {
      console.warn('Enhanced detector requires browser environment');
      return;
    }

    try {
      console.log('🚀 Initializing Enhanced Object Detector...');

      // Initialize ONNX Runtime session with optimized settings
      this.session = await ort.InferenceSession.create(this.modelConfig.modelPath, {
        executionProviders: [
          {
            name: 'webgl',
            deviceType: 'gpu',
            powerPreference: 'high-performance'
          },
          {
            name: 'wasm',
            numThreads: navigator.hardwareConcurrency || 4
          }
        ],
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        logSeverityLevel: 0
      });

      // Initialize workers for parallel processing
      await this.initializeWorkers();

      // Initialize sub-components
      await Promise.all([
        this.contextAnalyzer.initialize(),
        this.imageEnhancer.initialize(),
        this.multiscaleDetector.initialize()
      ]);

      this.isInitialized = true;
      console.log('✅ Enhanced Object Detector initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Object Detector:', error);
      throw error;
    }
  }

  private async initializeWorkers(): Promise<void> {
    // Create preprocessing worker
    if (window.Worker) {
      this.preprocessingWorker = new Worker(
        new URL('./workers/preprocessing-worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      // Create LLM classification worker
      this.llmWorker = new Worker(
        new URL('./workers/llm-worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
  }

  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.session || !this.isInitialized) {
      throw new Error('Enhanced detector not initialized');
    }

    const startTime = performance.now();
    
    try {
      // Step 1: Analyze image context
      const context = await this.contextAnalyzer.analyzeImage(imageData);
      console.log('📊 Image context:', context);

      // Step 2: Enhance image quality
      const enhancedImageData = await this.imageEnhancer.enhance(imageData, context);

      // Step 3: Multi-scale detection
      const detections = await this.multiscaleDetector.detect(
        this.session,
        enhancedImageData,
        this.modelConfig
      );

      // Step 4: LLM-based classification for high-confidence detections
      const enhancedDetections = await this.enhanceWithLLM(detections, context);

      // Step 5: Apply temporal consistency
      const consistentDetections = this.applyTemporalConsistency(enhancedDetections);

      // Step 6: Store detection history
      this.updateDetectionHistory(consistentDetections);

      const totalTime = performance.now() - startTime;
      console.log(`🎯 Enhanced detection completed in ${totalTime.toFixed(1)}ms`);
      console.log(`📋 Detected ${consistentDetections.length} objects with enhanced classification`);

      return consistentDetections;

    } catch (error) {
      console.error('❌ Enhanced detection failed:', error);
      // Fallback to basic detection
      return this.fallbackDetection(imageData);
    }
  }

  private async enhanceWithLLM(
    detections: Detection[],
    context: DetectionContext
  ): Promise<Detection[]> {
    const highConfidenceDetections = detections.filter(d => d.confidence > 0.7);
    
    if (highConfidenceDetections.length === 0) {
      return detections;
    }

    try {
      // Prepare LLM classification requests
      const requests: LLMClassificationRequest[] = highConfidenceDetections.map(detection => ({
        imageDescription: this.generateImageDescription(detection, context),
        detectedObjects: [detection.class],
        context,
        confidence: detection.confidence
      }));

      // Process with LLM worker
      const llmResults = await this.classifyWithLLM(requests);

      // Merge LLM results with detections
      const enhancedDetections = detections.map(detection => {
        const llmResult = llmResults.find(r => 
          r.classification.toLowerCase().includes(detection.class.toLowerCase())
        );

        if (llmResult) {
          return {
            ...detection,
            category: llmResult.category,
            confidence: Math.min(detection.confidence * 1.1, 0.99), // Boost confidence slightly
            instructions: llmResult.instructions,
            reasoning: llmResult.reasoning,
            tips: llmResult.tips,
            subcategory: llmResult.subcategory,
            enhanced: true
          };
        }

        return detection;
      });

      return enhancedDetections;

    } catch (error) {
      console.warn('⚠️ LLM classification failed, using basic classification:', error);
      return detections;
    }
  }

  private generateImageDescription(detection: Detection, context: DetectionContext): string {
    return `A ${detection.class.replace(/_/g, ' ')} object detected in a ${context.sceneType} environment with ${context.lighting} lighting conditions. The object has ${detection.confidence > 0.8 ? 'high' : 'moderate'} detection confidence and appears to be ${detection.bbox[2] * detection.bbox[3] > 0.1 ? 'large' : 'small'} in size.`;
  }

  private async classifyWithLLM(requests: LLMClassificationRequest[]): Promise<LLMClassificationResponse[]> {
    // Use local LLM or fallback to rule-based classification
    const responses: LLMClassificationResponse[] = [];

    for (const request of requests) {
      try {
        // For now, implement advanced rule-based classification
        // This can be replaced with actual LLM integration later
        const response = await this.advancedRuleBasedClassification(request);
        responses.push(response);
      } catch (error) {
        console.warn('LLM request failed for:', request.detectedObjects[0]);
      }
    }

    return responses;
  }

  private async advancedRuleBasedClassification(
    request: LLMClassificationRequest
  ): Promise<LLMClassificationResponse> {
    const objectName = request.detectedObjects[0].toLowerCase();
    
    // Advanced classification rules with context awareness
    const classificationRules = {
      // Plastic items
      'bottle': {
        category: 'recycle' as const,
        subcategory: 'plastic_container',
        instructions: 'Remove cap and label. Rinse clean. Check recycling number.',
        tips: ['Look for recycling symbol', 'Remove all labels', 'Rinse thoroughly']
      },
      'plastic_bag': {
        category: 'recycle' as const,
        subcategory: 'soft_plastic',
        instructions: 'Take to special plastic bag collection point at grocery stores.',
        tips: ['Not recyclable in curbside bins', 'Clean and dry first', 'Remove receipts']
      },
      // Organic waste
      'apple': {
        category: 'compost' as const,
        subcategory: 'fruit_waste',
        instructions: 'Remove any stickers. Can be composted whole.',
        tips: ['Remove produce stickers', 'Cut into smaller pieces for faster composting']
      },
      'banana': {
        category: 'compost' as const,
        subcategory: 'fruit_waste',
        instructions: 'Peel and fruit can both be composted.',
        tips: ['Banana peels are excellent for composting', 'Rich in potassium']
      },
      // Paper products
      'cardboard': {
        category: 'recycle' as const,
        subcategory: 'paper_product',
        instructions: 'Remove tape and staples. Flatten for recycling.',
        tips: ['Break down large boxes', 'Remove all plastic tape', 'Keep dry']
      },
      // Electronics
      'cell_phone': {
        category: 'hazardous' as const,
        subcategory: 'electronics',
        instructions: 'Take to electronics recycling center. Do not put in regular trash.',
        tips: ['Remove personal data first', 'Check manufacturer take-back programs']
      }
    };

    const rule = classificationRules[objectName] || {
      category: 'landfill' as const,
      subcategory: 'general_waste',
      instructions: 'Check local recycling guidelines for this item.',
      tips: ['When in doubt, check with local waste management']
    };

    // Adjust confidence based on context
    let confidence = request.confidence;
    if (request.context.lighting === 'bright' && request.context.complexity === 'simple') {
      confidence *= 1.2;
    } else if (request.context.lighting === 'dim' || request.context.complexity === 'complex') {
      confidence *= 0.8;
    }

    return {
      classification: objectName,
      category: rule.category,
      confidence: Math.min(confidence, 0.95),
      reasoning: `Classified as ${rule.category} based on material composition and local recycling guidelines.`,
      instructions: rule.instructions,
      tips: rule.tips,
      subcategory: rule.subcategory
    };
  }

  private applyTemporalConsistency(detections: Detection[]): Detection[] {
    if (this.detectionHistory.length === 0) {
      return detections;
    }

    // Apply temporal smoothing to reduce flickering
    const consistentDetections = detections.map(detection => {
      const historicalMatch = this.detectionHistory.find(hist => 
        this.calculateIoU(detection.bbox, hist.bbox) > 0.5 &&
        detection.class === hist.class
      );

      if (historicalMatch) {
        // Smooth confidence over time
        const smoothedConfidence = (detection.confidence * 0.7) + (historicalMatch.confidence * 0.3);
        return {
          ...detection,
          confidence: smoothedConfidence
        };
      }

      return detection;
    });

    return consistentDetections;
  }

  private calculateIoU(bbox1: number[], bbox2: number[]): number {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;

    const intersection = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2)) *
                        Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
    
    const union = w1 * h1 + w2 * h2 - intersection;
    
    return union > 0 ? intersection / union : 0;
  }

  private updateDetectionHistory(detections: Detection[]): void {
    this.detectionHistory = detections;
    
    // Keep only recent history (last 10 frames)
    if (this.detectionHistory.length > 10) {
      this.detectionHistory = this.detectionHistory.slice(-10);
    }
  }

  private async fallbackDetection(imageData: ImageData): Promise<Detection[]> {
    try {
      // Basic YOLO detection without enhancements
      const tensor = this.preprocessImage(imageData);
      const results = await this.session!.run({ images: tensor });
      return this.postprocessResults(results, imageData.width, imageData.height);
    } catch (error) {
      console.error('❌ Fallback detection also failed:', error);
      return [];
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const { width, height, data } = imageData;
    const [inputHeight, inputWidth] = this.modelConfig.inputSize;
    
    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    canvas.width = inputWidth;
    canvas.height = inputHeight;
    const ctx = canvas.getContext('2d')!;
    
    // Create image from ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Resize to model input size
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, inputWidth, inputHeight);
    
    // Get resized image data
    const resizedImageData = ctx.getImageData(0, 0, inputWidth, inputHeight);
    const resizedData = resizedImageData.data;
    
    // Normalize to float32 and rearrange to CHW format
    const tensorData = new Float32Array(3 * inputHeight * inputWidth);
    
    for (let i = 0; i < inputHeight * inputWidth; i++) {
      const r = resizedData[i * 4] / 255.0;
      const g = resizedData[i * 4 + 1] / 255.0;
      const b = resizedData[i * 4 + 2] / 255.0;
      
      tensorData[i] = r;
      tensorData[inputHeight * inputWidth + i] = g;
      tensorData[2 * inputHeight * inputWidth + i] = b;
    }
    
    return new ort.Tensor('float32', tensorData, [1, 3, inputHeight, inputWidth]);
  }

  private postprocessResults(results: any, originalWidth: number, originalHeight: number): Detection[] {
    const output = results.output0;
    const [_, numClasses, numDetections] = output.dims;
    const detections: Detection[] = [];

    for (let i = 0; i < numDetections; i++) {
      const confidence = output.data[4 * numDetections + i];
      
      if (confidence > this.modelConfig.confidenceThreshold!) {
        const x = output.data[i] / this.modelConfig.inputSize[1] * originalWidth;
        const y = output.data[numDetections + i] / this.modelConfig.inputSize[0] * originalHeight;
        const w = output.data[2 * numDetections + i] / this.modelConfig.inputSize[1] * originalWidth;
        const h = output.data[3 * numDetections + i] / this.modelConfig.inputSize[0] * originalHeight;

        // Find class with highest probability
        let maxClassProb = 0;
        let classIndex = 0;
        for (let j = 0; j < numClasses - 5; j++) {
          const classProb = output.data[(5 + j) * numDetections + i];
          if (classProb > maxClassProb) {
            maxClassProb = classProb;
            classIndex = j;
          }
        }

        const finalConfidence = confidence * maxClassProb;
        if (finalConfidence > this.modelConfig.confidenceThreshold!) {
          detections.push({
            bbox: [x - w/2, y - h/2, w, h],
            class: this.getClassName(classIndex),
            confidence: finalConfidence,
            category: this.mapToCategory(this.getClassName(classIndex)),
            instructions: '',
            label: this.getClassName(classIndex).replace(/_/g, ' ')
          });
        }
      }
    }

    // Apply Non-Maximum Suppression
    return this.applyNMS(detections, this.modelConfig.nmsThreshold!);
  }

  private applyNMS(detections: Detection[], iouThreshold: number): Detection[] {
    const sortedDetections = detections.sort((a, b) => b.confidence - a.confidence);
    const keepDetections: Detection[] = [];

    for (const detection of sortedDetections) {
      let keep = true;
      for (const keptDetection of keepDetections) {
        if (this.calculateIoU(detection.bbox, keptDetection.bbox) > iouThreshold) {
          keep = false;
          break;
        }
      }
      if (keep) {
        keepDetections.push(detection);
      }
    }

    return keepDetections;
  }

  private getClassName(classIndex: number): string {
    // COCO class names for YOLOv8
    const classNames = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'traffic_light', 'fire_hydrant', 'stop_sign', 'parking_meter', 'bench', 'bird', 'cat',
      'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
      'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports_ball',
      'kite', 'baseball_bat', 'baseball_glove', 'skateboard', 'surfboard', 'tennis_racket',
      'bottle', 'wine_glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot_dog', 'pizza', 'donut', 'cake',
      'chair', 'couch', 'potted_plant', 'bed', 'dining_table', 'toilet', 'tv', 'laptop',
      'mouse', 'remote', 'keyboard', 'cell_phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy_bear', 'hair_drier', 'toothbrush'
    ];
    
    return classNames[classIndex] || 'unknown';
  }

  private mapToCategory(className: string): 'recycle' | 'compost' | 'landfill' {
    const recycleItems = ['bottle', 'cup', 'book', 'laptop', 'cell_phone', 'tv'];
    const compostItems = ['banana', 'apple', 'orange', 'broccoli', 'carrot'];
    
    if (recycleItems.includes(className)) return 'recycle';
    if (compostItems.includes(className)) return 'compost';
    return 'landfill';
  }

  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
    
    if (this.preprocessingWorker) {
      this.preprocessingWorker.terminate();
      this.preprocessingWorker = null;
    }
    
    if (this.llmWorker) {
      this.llmWorker.terminate();
      this.llmWorker = null;
    }
    
    this.detectionHistory = [];
    this.classificationCache.clear();
    this.isInitialized = false;
  }
}

// Supporting classes
class ContextAnalyzer {
  async initialize(): Promise<void> {
    // Initialize context analysis
  }

  async analyzeImage(imageData: ImageData): Promise<DetectionContext> {
    // Analyze lighting conditions
    const lighting = this.analyzeLighting(imageData);
    
    // Analyze scene complexity
    const complexity = this.analyzeComplexity(imageData);
    
    // Determine scene type
    const sceneType = this.analyzeSceneType(imageData);

    return {
      lighting,
      complexity,
      sceneType,
      itemCount: 0,
      averageSize: 0
    };
  }

  private analyzeLighting(imageData: ImageData): 'bright' | 'normal' | 'dim' | 'dark' {
    const { data } = imageData;
    let totalBrightness = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    
    const avgBrightness = totalBrightness / (data.length / 4);
    
    if (avgBrightness > 200) return 'bright';
    if (avgBrightness > 150) return 'normal';
    if (avgBrightness > 80) return 'dim';
    return 'dark';
  }

  private analyzeComplexity(imageData: ImageData): 'simple' | 'moderate' | 'complex' {
    // Simple edge detection to measure complexity
    const { data, width, height } = imageData;
    let edgeCount = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const current = data[idx];
        const right = data[idx + 4];
        const down = data[idx + width * 4];
        
        if (Math.abs(current - right) > 50 || Math.abs(current - down) > 50) {
          edgeCount++;
        }
      }
    }
    
    const edgeRatio = edgeCount / (width * height);
    
    if (edgeRatio < 0.1) return 'simple';
    if (edgeRatio < 0.3) return 'moderate';
    return 'complex';
  }

  private analyzeSceneType(imageData: ImageData): 'kitchen' | 'office' | 'outdoor' | 'generic' {
    // Basic scene type detection based on color analysis
    const { data } = imageData;
    let greenCount = 0;
    let brownCount = 0;
    let whiteCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (g > r && g > b && g > 100) greenCount++;
      if (r > 100 && g > 80 && b < 80) brownCount++;
      if (r > 200 && g > 200 && b > 200) whiteCount++;
    }
    
    const totalPixels = data.length / 4;
    
    if (greenCount / totalPixels > 0.3) return 'outdoor';
    if (whiteCount / totalPixels > 0.4) return 'office';
    if (brownCount / totalPixels > 0.2) return 'kitchen';
    return 'generic';
  }
}

class ImageEnhancer {
  async initialize(): Promise<void> {
    // Initialize image enhancement
  }

  async enhance(imageData: ImageData, context: DetectionContext): Promise<ImageData> {
    // Apply context-specific enhancements
    let enhancedData = imageData;
    
    if (context.lighting === 'dim' || context.lighting === 'dark') {
      enhancedData = this.increaseBrightness(enhancedData, 1.3);
      enhancedData = this.increaseContrast(enhancedData, 1.2);
    }
    
    if (context.complexity === 'complex') {
      enhancedData = this.reduceNoise(enhancedData);
    }
    
    return this.sharpen(enhancedData);
  }

  private increaseBrightness(imageData: ImageData, factor: number): ImageData {
    const newData = new ImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      newData.data[i] = Math.min(255, imageData.data[i] * factor);
      newData.data[i + 1] = Math.min(255, imageData.data[i + 1] * factor);
      newData.data[i + 2] = Math.min(255, imageData.data[i + 2] * factor);
      newData.data[i + 3] = imageData.data[i + 3];
    }
    
    return newData;
  }

  private increaseContrast(imageData: ImageData, factor: number): ImageData {
    const newData = new ImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      newData.data[i] = Math.min(255, Math.max(0, (imageData.data[i] - 128) * factor + 128));
      newData.data[i + 1] = Math.min(255, Math.max(0, (imageData.data[i + 1] - 128) * factor + 128));
      newData.data[i + 2] = Math.min(255, Math.max(0, (imageData.data[i + 2] - 128) * factor + 128));
      newData.data[i + 3] = imageData.data[i + 3];
    }
    
    return newData;
  }

  private reduceNoise(imageData: ImageData): ImageData {
    // Simple blur for noise reduction
    const newData = new ImageData(imageData.width, imageData.height);
    const { data, width, height } = imageData;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += data[((y + dy) * width + (x + dx)) * 4 + c];
            }
          }
          newData.data[idx + c] = sum / 9;
        }
        newData.data[idx + 3] = data[idx + 3];
      }
    }
    
    return newData;
  }

  private sharpen(imageData: ImageData): ImageData {
    const newData = new ImageData(imageData.width, imageData.height);
    const { data, width, height } = imageData;
    
    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let kernelIdx = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += data[((y + dy) * width + (x + dx)) * 4 + c] * kernel[kernelIdx];
              kernelIdx++;
            }
          }
          
          newData.data[idx + c] = Math.min(255, Math.max(0, sum));
        }
        newData.data[idx + 3] = data[idx + 3];
      }
    }
    
    return newData;
  }
}

class MultiscaleDetector {
  async initialize(): Promise<void> {
    // Initialize multiscale detection
  }

  async detect(
    session: ort.InferenceSession,
    imageData: ImageData,
    config: ModelConfig
  ): Promise<Detection[]> {
    const scales = [0.8, 1.0, 1.2]; // Multiple scales for better detection
    const allDetections: Detection[] = [];

    for (const scale of scales) {
      try {
        const scaledImageData = this.scaleImage(imageData, scale);
        const tensor = this.preprocessImage(scaledImageData, config);
        const results = await session.run({ images: tensor });
        const detections = this.postprocessResults(results, imageData.width, imageData.height, scale);
        allDetections.push(...detections);
      } catch (error) {
        console.warn(`Detection failed at scale ${scale}:`, error);
      }
    }

    // Merge detections from all scales
    return this.mergeMultiscaleDetections(allDetections);
  }

  private scaleImage(imageData: ImageData, scale: number): ImageData {
    const newWidth = Math.round(imageData.width * scale);
    const newHeight = Math.round(imageData.height * scale);
    
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d')!;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, 0, 0, newWidth, newHeight);
    
    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  private preprocessImage(imageData: ImageData, config: ModelConfig): ort.Tensor {
    // Same preprocessing as base class
    const { width, height, data } = imageData;
    const [inputHeight, inputWidth] = config.inputSize;
    
    const canvas = document.createElement('canvas');
    canvas.width = inputWidth;
    canvas.height = inputHeight;
    const ctx = canvas.getContext('2d')!;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, inputWidth, inputHeight);
    
    const resizedImageData = ctx.getImageData(0, 0, inputWidth, inputHeight);
    const resizedData = resizedImageData.data;
    
    const tensorData = new Float32Array(3 * inputHeight * inputWidth);
    
    for (let i = 0; i < inputHeight * inputWidth; i++) {
      const r = resizedData[i * 4] / 255.0;
      const g = resizedData[i * 4 + 1] / 255.0;
      const b = resizedData[i * 4 + 2] / 255.0;
      
      tensorData[i] = r;
      tensorData[inputHeight * inputWidth + i] = g;
      tensorData[2 * inputHeight * inputWidth + i] = b;
    }
    
    return new ort.Tensor('float32', tensorData, [1, 3, inputHeight, inputWidth]);
  }

  private postprocessResults(results: any, originalWidth: number, originalHeight: number, scale: number): Detection[] {
    // Implementation similar to base class but accounting for scale
    const output = results.output0;
    const [_, numClasses, numDetections] = output.dims;
    const detections: Detection[] = [];

    for (let i = 0; i < numDetections; i++) {
      const confidence = output.data[4 * numDetections + i];
      
      if (confidence > 0.3) { // Lower threshold for multiscale
        const x = (output.data[i] / 640 * originalWidth) / scale;
        const y = (output.data[numDetections + i] / 640 * originalHeight) / scale;
        const w = (output.data[2 * numDetections + i] / 640 * originalWidth) / scale;
        const h = (output.data[3 * numDetections + i] / 640 * originalHeight) / scale;

        let maxClassProb = 0;
        let classIndex = 0;
        for (let j = 0; j < numClasses - 5; j++) {
          const classProb = output.data[(5 + j) * numDetections + i];
          if (classProb > maxClassProb) {
            maxClassProb = classProb;
            classIndex = j;
          }
        }

        const finalConfidence = confidence * maxClassProb;
        if (finalConfidence > 0.3) {
          detections.push({
            bbox: [x - w/2, y - h/2, w, h],
            class: this.getClassName(classIndex),
            confidence: finalConfidence,
            category: 'landfill', // Will be enhanced by LLM
            instructions: '',
            label: this.getClassName(classIndex).replace(/_/g, ' '),
            scale: scale
          });
        }
      }
    }

    return detections;
  }

  private mergeMultiscaleDetections(detections: Detection[]): Detection[] {
    // Group similar detections and keep the best one
    const groups: Detection[][] = [];
    
    for (const detection of detections) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const representative = group[0];
        if (this.calculateIoU(detection.bbox, representative.bbox) > 0.3 &&
            detection.class === representative.class) {
          group.push(detection);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([detection]);
      }
    }
    
    // Select best detection from each group
    return groups.map(group => {
      return group.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
    });
  }

  private calculateIoU(bbox1: number[], bbox2: number[]): number {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;

    const intersection = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2)) *
                        Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
    
    const union = w1 * h1 + w2 * h2 - intersection;
    
    return union > 0 ? intersection / union : 0;
  }

  private getClassName(classIndex: number): string {
    const classNames = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'traffic_light', 'fire_hydrant', 'stop_sign', 'parking_meter', 'bench', 'bird', 'cat',
      'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
      'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports_ball',
      'kite', 'baseball_bat', 'baseball_glove', 'skateboard', 'surfboard', 'tennis_racket',
      'bottle', 'wine_glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot_dog', 'pizza', 'donut', 'cake',
      'chair', 'couch', 'potted_plant', 'bed', 'dining_table', 'toilet', 'tv', 'laptop',
      'mouse', 'remote', 'keyboard', 'cell_phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy_bear', 'hair_drier', 'toothbrush'
    ];
    
    return classNames[classIndex] || 'unknown';
  }
} 