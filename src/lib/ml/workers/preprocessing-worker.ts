// Preprocessing Worker for Enhanced Object Detection
// Handles image enhancement and preprocessing in parallel

interface PreprocessingTask {
  id: string;
  type: 'enhance' | 'normalize' | 'resize' | 'contrast' | 'denoise';
  imageData: ImageData;
  parameters: any;
}

interface PreprocessingResult {
  id: string;
  success: boolean;
  result?: ImageData;
  error?: string;
  processingTime: number;
}

class PreprocessingWorker {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔧 Preprocessing Worker initialized');
    this.isInitialized = true;
  }

  async processTask(task: PreprocessingTask): Promise<PreprocessingResult> {
    const startTime = performance.now();
    
    try {
      let result: ImageData;

      switch (task.type) {
        case 'enhance':
          result = await this.enhanceImage(task.imageData, task.parameters);
          break;
        case 'normalize':
          result = await this.normalizeImage(task.imageData);
          break;
        case 'resize':
          result = await this.resizeImage(task.imageData, task.parameters);
          break;
        case 'contrast':
          result = await this.adjustContrast(task.imageData, task.parameters);
          break;
        case 'denoise':
          result = await this.denoiseImage(task.imageData);
          break;
        default:
          throw new Error(`Unknown processing type: ${task.type}`);
      }

      const processingTime = performance.now() - startTime;

      return {
        id: task.id,
        success: true,
        result,
        processingTime
      };

    } catch (error: any) {
      const processingTime = performance.now() - startTime;
      
      return {
        id: task.id,
        success: false,
        error: error.message,
        processingTime
      };
    }
  }

  private async enhanceImage(imageData: ImageData, parameters: any): Promise<ImageData> {
    const { brightness = 1.0, contrast = 1.0, saturation = 1.0, gamma = 1.0 } = parameters;
    
    const enhanced = new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const newData = enhanced.data;

    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      let r = data[i] * brightness;
      let g = data[i + 1] * brightness;
      let b = data[i + 2] * brightness;

      // Apply contrast
      r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

      // Apply gamma correction
      r = Math.pow(r / 255, 1 / gamma) * 255;
      g = Math.pow(g / 255, 1 / gamma) * 255;
      b = Math.pow(b / 255, 1 / gamma) * 255;

      // Apply saturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + saturation * (r - gray);
      g = gray + saturation * (g - gray);
      b = gray + saturation * (b - gray);

      // Clamp values
      newData[i] = Math.max(0, Math.min(255, r));
      newData[i + 1] = Math.max(0, Math.min(255, g));
      newData[i + 2] = Math.max(0, Math.min(255, b));
      newData[i + 3] = data[i + 3]; // Alpha unchanged
    }

    return enhanced;
  }

  private async normalizeImage(imageData: ImageData): Promise<ImageData> {
    const { data, width, height } = imageData;
    const normalized = new ImageData(width, height);
    
    // Calculate mean and std for each channel
    const means = [0, 0, 0];
    const stds = [0, 0, 0];
    const pixelCount = width * height;

    // Calculate means
    for (let i = 0; i < data.length; i += 4) {
      means[0] += data[i];
      means[1] += data[i + 1];
      means[2] += data[i + 2];
    }
    
    means[0] /= pixelCount;
    means[1] /= pixelCount;
    means[2] /= pixelCount;

    // Calculate standard deviations
    for (let i = 0; i < data.length; i += 4) {
      stds[0] += Math.pow(data[i] - means[0], 2);
      stds[1] += Math.pow(data[i + 1] - means[1], 2);
      stds[2] += Math.pow(data[i + 2] - means[2], 2);
    }
    
    stds[0] = Math.sqrt(stds[0] / pixelCount);
    stds[1] = Math.sqrt(stds[1] / pixelCount);
    stds[2] = Math.sqrt(stds[2] / pixelCount);

    // Normalize
    for (let i = 0; i < data.length; i += 4) {
      normalized.data[i] = Math.max(0, Math.min(255, ((data[i] - means[0]) / stds[0]) * 64 + 128));
      normalized.data[i + 1] = Math.max(0, Math.min(255, ((data[i + 1] - means[1]) / stds[1]) * 64 + 128));
      normalized.data[i + 2] = Math.max(0, Math.min(255, ((data[i + 2] - means[2]) / stds[2]) * 64 + 128));
      normalized.data[i + 3] = data[i + 3];
    }

    return normalized;
  }

  private async resizeImage(imageData: ImageData, parameters: any): Promise<ImageData> {
    const { width: newWidth, height: newHeight, method = 'bilinear' } = parameters;
    
    if (method === 'bilinear') {
      return this.bilinearResize(imageData, newWidth, newHeight);
    } else {
      return this.nearestNeighborResize(imageData, newWidth, newHeight);
    }
  }

  private bilinearResize(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
    const { data, width, height } = imageData;
    const resized = new ImageData(newWidth, newHeight);
    const resizedData = resized.data;

    const xRatio = width / newWidth;
    const yRatio = height / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;
        
        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);
        
        const fx = srcX - x1;
        const fy = srcY - y1;
        
        const idx = (y * newWidth + x) * 4;
        
        for (let c = 0; c < 4; c++) {
          const p1 = data[(y1 * width + x1) * 4 + c];
          const p2 = data[(y1 * width + x2) * 4 + c];
          const p3 = data[(y2 * width + x1) * 4 + c];
          const p4 = data[(y2 * width + x2) * 4 + c];
          
          const interpolated = p1 * (1 - fx) * (1 - fy) +
                              p2 * fx * (1 - fy) +
                              p3 * (1 - fx) * fy +
                              p4 * fx * fy;
          
          resizedData[idx + c] = Math.round(interpolated);
        }
      }
    }

    return resized;
  }

  private nearestNeighborResize(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
    const { data, width, height } = imageData;
    const resized = new ImageData(newWidth, newHeight);
    const resizedData = resized.data;

    const xRatio = width / newWidth;
    const yRatio = height / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * newWidth + x) * 4;
        
        resizedData[dstIdx] = data[srcIdx];
        resizedData[dstIdx + 1] = data[srcIdx + 1];
        resizedData[dstIdx + 2] = data[srcIdx + 2];
        resizedData[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    return resized;
  }

  private async adjustContrast(imageData: ImageData, parameters: any): Promise<ImageData> {
    const { factor = 1.2 } = parameters;
    const { data, width, height } = imageData;
    const adjusted = new ImageData(width, height);

    for (let i = 0; i < data.length; i += 4) {
      adjusted.data[i] = Math.max(0, Math.min(255, (data[i] - 128) * factor + 128));
      adjusted.data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * factor + 128));
      adjusted.data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * factor + 128));
      adjusted.data[i + 3] = data[i + 3];
    }

    return adjusted;
  }

  private async denoiseImage(imageData: ImageData): Promise<ImageData> {
    // Gaussian blur for noise reduction
    const { data, width, height } = imageData;
    const denoised = new ImageData(width, height);
    
    // 3x3 Gaussian kernel
    const kernel = [
      1/16, 2/16, 1/16,
      2/16, 4/16, 2/16,
      1/16, 2/16, 1/16
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let kernelIdx = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const pixelIdx = ((y + dy) * width + (x + dx)) * 4;
              sum += data[pixelIdx + c] * kernel[kernelIdx];
              kernelIdx++;
            }
          }
          
          denoised.data[idx + c] = Math.round(sum);
        }
        denoised.data[idx + 3] = data[idx + 3]; // Alpha unchanged
      }
    }

    return denoised;
  }
}

// Worker instance
const worker = new PreprocessingWorker();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<PreprocessingTask>) => {
  const task = event.data;
  const result = await worker.processTask(task);
  self.postMessage(result);
};

// Export for TypeScript
export {}; 