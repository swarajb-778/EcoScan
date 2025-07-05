import { InferenceSession, Tensor } from 'onnxruntime-web';
import type { Detection, ModelConfig } from '../types/index.js';

export class ObjectDetector {
  private session: InferenceSession | null = null;
  private modelConfig: ModelConfig;
  private isInitialized = false;

  constructor(config: ModelConfig) {
    this.modelConfig = config;
  }

  async initialize(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        this.session = await InferenceSession.create(this.modelConfig.modelPath, {
          executionProviders: ['webgl', 'wasm'],
          graphOptimizationLevel: 'all'
        });
        this.isInitialized = true;
        console.log('🤖 YOLO model loaded successfully');
        return;
      } catch (error) {
        attempts++;
        console.error(`❌ Failed to load YOLO model (attempt ${attempts}):`, error);
        if (attempts >= maxAttempts) {
          throw new Error(`Model initialization failed after ${maxAttempts} attempts: ${error}`);
        }
      }
    }
  }

  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.session || !this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    try {
      const preprocessedTensor = this.preprocessImage(imageData);
      const results = await this.session.run({ images: preprocessedTensor });
      let detections = this.postprocessResults(results, imageData.width, imageData.height);
      // Limit max objects
      if (detections.length > 10) {
        console.warn('Too many objects detected. Limiting to 10.');
        detections = detections.slice(0, 10);
      }
      if (detections.length === 0) {
        console.warn('No objects detected in frame.');
      }
      return detections;
    } catch (error) {
      console.error('❌ Detection failed:', error);
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
    if (this.session) {
      this.session.release();
      this.session = null;
      this.isInitialized = false;
    }
  }
} 