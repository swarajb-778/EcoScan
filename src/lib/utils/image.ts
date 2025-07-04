/**
 * Image processing utilities for EcoScan
 * Handles image preprocessing, optimization, and analysis for ML models
 */

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  size: number; // in bytes
  format: string;
  hasAlpha: boolean;
}

export interface ImageProcessingOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
  cropToSquare?: boolean;
}

export interface PreprocessingResult {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  tensor: Float32Array;
  metadata: ImageMetadata;
}

/**
 * Create canvas from image source
 */
export async function createCanvasFromImage(
  source: HTMLImageElement | HTMLVideoElement | ImageBitmap | HTMLCanvasElement,
  options: ImageProcessingOptions = {}
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }

  // Get source dimensions
  const sourceWidth = 'videoWidth' in source ? source.videoWidth : source.width;
  const sourceHeight = 'videoHeight' in source ? source.videoHeight : source.height;

  // Calculate target dimensions
  const { width, height } = calculateDimensions(
    sourceWidth,
    sourceHeight,
    options
  );

  canvas.width = width;
  canvas.height = height;

  // Configure canvas for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image to canvas
  ctx.drawImage(source, 0, 0, width, height);

  return canvas;
}

/**
 * Calculate optimal dimensions for image processing
 */
function calculateDimensions(
  sourceWidth: number,
  sourceHeight: number,
  options: ImageProcessingOptions
): { width: number; height: number } {
  const {
    targetWidth = 640,
    targetHeight = 640,
    maintainAspectRatio = true,
    cropToSquare = false
  } = options;

  if (cropToSquare) {
    const size = Math.min(sourceWidth, sourceHeight);
    return { width: targetWidth, height: targetHeight };
  }

  if (!maintainAspectRatio) {
    return { width: targetWidth, height: targetHeight };
  }

  // Maintain aspect ratio
  const aspectRatio = sourceWidth / sourceHeight;
  let width = targetWidth;
  let height = targetHeight;

  if (aspectRatio > 1) {
    // Landscape
    height = Math.round(width / aspectRatio);
  } else {
    // Portrait or square
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Preprocess image for ML model inference
 */
export async function preprocessImage(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  modelInputSize: { width: number; height: number } = { width: 640, height: 640 }
): Promise<PreprocessingResult> {
  // Create canvas at model input size
  const canvas = await createCanvasFromImage(source, {
    targetWidth: modelInputSize.width,
    targetHeight: modelInputSize.height,
    maintainAspectRatio: false
  });

  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert to normalized tensor (RGB, 0-1 range)
  const tensor = new Float32Array(3 * canvas.width * canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const r = data[i] / 255;     // Red
    const g = data[i + 1] / 255; // Green
    const b = data[i + 2] / 255; // Blue

    // Convert to CHW format (Channel-Height-Width)
    const tensorOffset = pixelIndex;
    tensor[tensorOffset] = r;
    tensor[tensorOffset + canvas.width * canvas.height] = g;
    tensor[tensorOffset + 2 * canvas.width * canvas.height] = b;
  }

  const metadata: ImageMetadata = {
    width: canvas.width,
    height: canvas.height,
    aspectRatio: canvas.width / canvas.height,
    size: imageData.data.length,
    format: 'rgb',
    hasAlpha: false
  };

  return { canvas, imageData, tensor, metadata };
}

/**
 * Get image metadata from various sources
 */
export function getImageMetadata(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | File
): ImageMetadata {
  if (source instanceof File) {
    return {
      width: 0,
      height: 0,
      aspectRatio: 0,
      size: source.size,
      format: source.type,
      hasAlpha: source.type.includes('png')
    };
  }

  const width = 'videoWidth' in source ? source.videoWidth : source.width;
  const height = 'videoHeight' in source ? source.videoHeight : source.height;

  return {
    width,
    height,
    aspectRatio: width / height,
    size: width * height * 4, // Estimate for RGBA
    format: 'canvas' in source ? 'canvas' : 'image',
    hasAlpha: true
  };
}

/**
 * Optimize image for web display
 */
export async function optimizeImage(
  canvas: HTMLCanvasElement,
  options: ImageProcessingOptions = {}
): Promise<Blob> {
  const { quality = 0.9, format = 'jpeg' } = options;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create optimized image blob'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Apply image filters for better detection
 */
export function applyImageFilters(
  canvas: HTMLCanvasElement,
  filters: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    sharpness?: boolean;
  } = {}
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { brightness = 1, contrast = 1, saturation = 1, sharpness = false } = filters;

  // Apply CSS filters
  const filterString = [
    `brightness(${brightness})`,
    `contrast(${contrast})`,
    `saturate(${saturation})`
  ].join(' ');

  ctx.filter = filterString;
  
  // Redraw with filters
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  ctx.putImageData(imageData, 0, 0);

  // Apply sharpening if requested
  if (sharpness) {
    applySharpening(canvas);
  }

  return canvas;
}

/**
 * Apply unsharp mask for image sharpening
 */
function applySharpening(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Simple sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  const tempData = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % canvas.width;
    const y = Math.floor(i / 4 / canvas.width);

    if (x > 0 && x < canvas.width - 1 && y > 0 && y < canvas.height - 1) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * canvas.width + (x + kx)) * 4 + c;
            sum += tempData[pixelIndex] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        data[i + c] = Math.max(0, Math.min(255, sum));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Calculate image quality score
 */
export function calculateImageQuality(canvas: HTMLCanvasElement): {
  score: number;
  factors: {
    brightness: number;
    contrast: number;
    sharpness: number;
    resolution: number;
  };
} {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalBrightness = 0;
  let brightnessSamples = 0;
  const contrastValues: number[] = [];
  let sharpnessSum = 0;
  let sharpnessSamples = 0;

  // Analyze image properties
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate brightness (luminance)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
    brightnessSamples++;

    contrastValues.push(brightness);

    // Calculate local sharpness using gradient
    const x = (i / 4) % canvas.width;
    const y = Math.floor(i / 4 / canvas.width);

    if (x > 0 && x < canvas.width - 1 && y > 0 && y < canvas.height - 1) {
      const rightIdx = i + 4;
      const bottomIdx = i + canvas.width * 4;

      if (rightIdx < data.length && bottomIdx < data.length) {
        const rightBrightness = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
        const bottomBrightness = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];

        const gradientMagnitude = Math.sqrt(
          Math.pow(rightBrightness - brightness, 2) + Math.pow(bottomBrightness - brightness, 2)
        );

        sharpnessSum += gradientMagnitude;
        sharpnessSamples++;
      }
    }
  }

  // Calculate metrics
  const avgBrightness = totalBrightness / brightnessSamples;
  const brightnessScore = 1 - Math.abs(avgBrightness - 128) / 128; // Ideal brightness around 128

  // Calculate contrast using standard deviation
  const variance = contrastValues.reduce((sum, val) => {
    return sum + Math.pow(val - avgBrightness, 2);
  }, 0) / contrastValues.length;
  const stdDev = Math.sqrt(variance);
  const contrastScore = Math.min(stdDev / 64, 1); // Normalize to 0-1

  const avgSharpness = sharpnessSum / sharpnessSamples;
  const sharpnessScore = Math.min(avgSharpness / 50, 1); // Normalize to 0-1

  const resolutionScore = Math.min((canvas.width * canvas.height) / (640 * 640), 1);

  const factors = {
    brightness: brightnessScore,
    contrast: contrastScore,
    sharpness: sharpnessScore,
    resolution: resolutionScore
  };

  // Weighted average score
  const score = (
    factors.brightness * 0.2 +
    factors.contrast * 0.3 +
    factors.sharpness * 0.3 +
    factors.resolution * 0.2
  );

  return { score, factors };
}

/**
 * Create thumbnail from image
 */
export async function createThumbnail(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  maxSize: number = 150
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const sourceWidth = 'videoWidth' in source ? source.videoWidth : source.width;
  const sourceHeight = 'videoHeight' in source ? source.videoHeight : source.height;

  const aspectRatio = sourceWidth / sourceHeight;
  let width, height;

  if (aspectRatio > 1) {
    width = maxSize;
    height = Math.round(maxSize / aspectRatio);
  } else {
    height = maxSize;
    width = Math.round(maxSize * aspectRatio);
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(source, 0, 0, width, height);

  return canvas;
}

/**
 * Convert file to image element
 */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from file'));
    };

    img.src = url;
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File is not a valid image' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image file is too large (max 10MB)' };
  }

  // Check for optimal size
  if (file.size > 5 * 1024 * 1024) {
    warnings.push('Large file size may affect performance');
  }

  // Check supported formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedFormats.includes(file.type)) {
    warnings.push('Unsupported format, may not work in all browsers');
  }

  return { valid: true, warnings };
} 