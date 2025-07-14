import { isBrowser } from '$lib/utils/browser.js';
import { performanceOptimizer } from '$lib/ml/performance-optimizer.js';

interface CameraCapabilities {
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  iso?: { min: number; max: number; step: number };
  torch?: boolean;
  fillLightMode?: string[];
  pan?: { min: number; max: number; step: number };
  tilt?: { min: number; max: number; step: number };
}

interface AdvancedCameraSettings {
  autoFocus: boolean;
  imageStabilization: boolean;
  hdr: boolean;
  nightMode: boolean;
  portraitMode: boolean;
  zoomLevel: number;
  focusDistance: number;
  exposureCompensation: number;
  whiteBalance: string;
  iso: number;
  flashMode: 'off' | 'on' | 'auto' | 'torch';
  qualityPreset: 'maximum' | 'high' | 'medium' | 'low' | 'battery';
}

interface ImageStabilizationData {
  enabled: boolean;
  type: 'optical' | 'digital' | 'hybrid';
  strength: number;
  gyroscopeData?: { x: number; y: number; z: number };
  accelerometerData?: { x: number; y: number; z: number };
  motionVectors: Array<{ x: number; y: number; magnitude: number }>;
  stabilizationMatrix: number[][];
}

interface AutoFocusData {
  enabled: boolean;
  mode: 'single' | 'continuous' | 'manual';
  areas: Array<{ x: number; y: number; width: number; height: number; weight: number }>;
  currentDistance: number;
  isLocked: boolean;
  confidence: number;
  scanRange: { near: number; far: number };
}

interface HDRProcessingData {
  enabled: boolean;
  exposureBrackets: number[];
  tonemapping: 'reinhard' | 'filmic' | 'aces' | 'linear';
  shadowsLift: number;
  highlightsSuppression: number;
  contrast: number;
  saturation: number;
}

export class AdvancedCameraFeatures {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private capabilities: CameraCapabilities = {};
  private settings: AdvancedCameraSettings;
  private imageStabilization: ImageStabilizationData;
  private autoFocus: AutoFocusData;
  private hdrProcessing: HDRProcessingData;
  private isInitialized = false;
  private processingWorker?: Worker;
  private motionSensors: MotionSensorManager;
  private focusDetector: FocusDetector;
  private exposureAnalyzer: ExposureAnalyzer;
  private frameBuffer: ImageData[] = [];
  private stabilizationBuffer: ImageData[] = [];
  private hdrFrames: ImageData[] = [];

  constructor() {
    this.settings = {
      autoFocus: true,
      imageStabilization: true,
      hdr: false,
      nightMode: false,
      portraitMode: false,
      zoomLevel: 1.0,
      focusDistance: 0,
      exposureCompensation: 0,
      whiteBalance: 'auto',
      iso: 100,
      flashMode: 'auto',
      qualityPreset: 'high'
    };

    this.imageStabilization = {
      enabled: true,
      type: 'hybrid',
      strength: 0.8,
      motionVectors: [],
      stabilizationMatrix: this.createIdentityMatrix()
    };

    this.autoFocus = {
      enabled: true,
      mode: 'continuous',
      areas: [{ x: 0.3, y: 0.3, width: 0.4, height: 0.4, weight: 1.0 }],
      currentDistance: 0,
      isLocked: false,
      confidence: 0,
      scanRange: { near: 0.1, far: 10.0 }
    };

    this.hdrProcessing = {
      enabled: false,
      exposureBrackets: [-2, 0, 2],
      tonemapping: 'filmic',
      shadowsLift: 0.1,
      highlightsSuppression: 0.1,
      contrast: 1.0,
      saturation: 1.0
    };

    this.motionSensors = new MotionSensorManager();
    this.focusDetector = new FocusDetector();
    this.exposureAnalyzer = new ExposureAnalyzer();
  }

  async initialize(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    if (!isBrowser()) {
      console.warn('Advanced camera features require browser environment');
      return;
    }

    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    try {
      // Initialize motion sensors
      await this.motionSensors.initialize();

      // Initialize processing worker
      if (window.Worker) {
        this.processingWorker = new Worker(
          new URL('./workers/camera-processing-worker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      // Initialize components
      await Promise.all([
        this.focusDetector.initialize(),
        this.exposureAnalyzer.initialize()
      ]);

      this.isInitialized = true;
      console.log('🎥 Advanced camera features initialized');

    } catch (error) {
      console.error('Failed to initialize advanced camera features:', error);
      throw error;
    }
  }

  async attachToStream(stream: MediaStream): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Advanced camera features not initialized');
    }

    this.stream = stream;
    this.videoTrack = stream.getVideoTracks()[0];

    if (this.videoTrack) {
      // Get camera capabilities
      this.capabilities = this.videoTrack.getCapabilities() as CameraCapabilities;
      console.log('📋 Camera capabilities:', this.capabilities);

      // Apply initial settings
      await this.applySettings();

      // Start processing loop
      this.startProcessingLoop();
    }
  }

  private async applySettings(): Promise<void> {
    if (!this.videoTrack) return;

    try {
      const constraints: any = {};

      // Apply focus settings
      if (this.capabilities.focusMode && this.settings.autoFocus) {
        if (this.capabilities.focusMode.includes('continuous')) {
          constraints.focusMode = 'continuous';
        } else if (this.capabilities.focusMode.includes('single-shot')) {
          constraints.focusMode = 'single-shot';
        }
      }

      // Apply zoom if supported
      if (this.capabilities.zoom && this.settings.zoomLevel !== 1.0) {
        const zoomValue = Math.max(
          this.capabilities.zoom.min,
          Math.min(this.capabilities.zoom.max, this.settings.zoomLevel)
        );
        constraints.zoom = zoomValue;
      }

      // Apply exposure compensation
      if (this.settings.exposureCompensation !== 0) {
        constraints.exposureCompensation = this.settings.exposureCompensation;
      }

      // Apply white balance
      if (this.capabilities.whiteBalanceMode && this.settings.whiteBalance !== 'auto') {
        if (this.capabilities.whiteBalanceMode.includes(this.settings.whiteBalance)) {
          constraints.whiteBalanceMode = this.settings.whiteBalance;
        }
      }

      // Apply flash/torch settings
      if (this.capabilities.torch && this.settings.flashMode === 'torch') {
        constraints.torch = true;
      }

      // Apply constraints if any
      if (Object.keys(constraints).length > 0) {
        await this.videoTrack.applyConstraints(constraints);
        console.log('📸 Applied camera constraints:', constraints);
      }

    } catch (error) {
      console.warn('⚠️ Failed to apply some camera settings:', error);
    }
  }

  private startProcessingLoop(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const processFrame = () => {
      if (!this.isInitialized || !this.videoElement || !this.canvasElement) return;

      try {
        // Get current frame
        const ctx = this.canvasElement.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        const imageData = ctx.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);

        // Process frame with enabled features
        this.processFrame(imageData).then(processedData => {
          if (processedData && ctx) {
            ctx.putImageData(processedData, 0, 0);
          }
        }).catch(console.error);

      } catch (error) {
        console.error('Frame processing error:', error);
      }

      // Continue loop
      requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  private async processFrame(imageData: ImageData): Promise<ImageData | null> {
    let processedData = imageData;

    try {
      // Auto-focus processing
      if (this.settings.autoFocus) {
        await this.processAutoFocus(imageData);
      }

      // Image stabilization
      if (this.settings.imageStabilization) {
        processedData = await this.processImageStabilization(processedData);
      }

      // HDR processing
      if (this.settings.hdr) {
        processedData = await this.processHDR(processedData);
      }

      // Night mode enhancement
      if (this.settings.nightMode) {
        processedData = await this.processNightMode(processedData);
      }

      // Portrait mode effects
      if (this.settings.portraitMode) {
        processedData = await this.processPortraitMode(processedData);
      }

      return processedData;

    } catch (error) {
      console.error('Frame processing error:', error);
      return imageData; // Return original on error
    }
  }

  private async processAutoFocus(imageData: ImageData): Promise<void> {
    if (!this.autoFocus.enabled) return;

    try {
      // Calculate focus measure for defined areas
      const focusMeasures = await Promise.all(
        this.autoFocus.areas.map(area => 
          this.focusDetector.calculateFocusMeasure(imageData, area)
        )
      );

      // Weighted average of focus measures
      const weightedFocus = focusMeasures.reduce((sum, measure, index) => {
        return sum + (measure * this.autoFocus.areas[index].weight);
      }, 0) / this.autoFocus.areas.reduce((sum, area) => sum + area.weight, 0);

      // Update focus data
      this.autoFocus.confidence = weightedFocus;
      this.autoFocus.currentDistance = this.focusDetector.estimateDistance(weightedFocus);

      // Trigger focus adjustment if needed
      if (this.autoFocus.mode === 'continuous' && !this.autoFocus.isLocked) {
        await this.adjustFocus(weightedFocus);
      }

    } catch (error) {
      console.warn('Auto-focus processing error:', error);
    }
  }

  private async processImageStabilization(imageData: ImageData): Promise<ImageData> {
    if (!this.imageStabilization.enabled) return imageData;

    try {
      // Get motion sensor data
      const motionData = await this.motionSensors.getCurrentData();
      
      if (motionData) {
        this.imageStabilization.gyroscopeData = motionData.gyroscope;
        this.imageStabilization.accelerometerData = motionData.accelerometer;
      }

      // Calculate motion vectors
      const motionVectors = this.calculateMotionVectors(imageData);
      this.imageStabilization.motionVectors = motionVectors;

      // Apply stabilization
      const stabilized = await this.applyStabilization(imageData, motionVectors);

      // Store in buffer for temporal stabilization
      this.stabilizationBuffer.push(stabilized);
      if (this.stabilizationBuffer.length > 5) {
        this.stabilizationBuffer.shift();
      }

      return stabilized;

    } catch (error) {
      console.warn('Image stabilization error:', error);
      return imageData;
    }
  }

  private async processHDR(imageData: ImageData): Promise<ImageData> {
    if (!this.hdrProcessing.enabled) return imageData;

    try {
      // Collect frames for HDR bracketing
      this.hdrFrames.push(imageData);

      // Process HDR when we have enough frames
      if (this.hdrFrames.length >= this.hdrProcessing.exposureBrackets.length) {
        const hdrResult = await this.computeHDR(this.hdrFrames);
        this.hdrFrames = []; // Reset buffer
        return hdrResult;
      }

      return imageData;

    } catch (error) {
      console.warn('HDR processing error:', error);
      return imageData;
    }
  }

  private async processNightMode(imageData: ImageData): Promise<ImageData> {
    try {
      // Analyze scene brightness
      const brightness = this.exposureAnalyzer.analyzeBrightness(imageData);
      
      if (brightness < 0.3) { // Dark scene
        return this.enhanceForLowLight(imageData);
      }

      return imageData;

    } catch (error) {
      console.warn('Night mode processing error:', error);
      return imageData;
    }
  }

  private async processPortraitMode(imageData: ImageData): Promise<ImageData> {
    try {
      // Simplified portrait mode - apply subtle background blur
      return this.applyPortraitBlur(imageData);

    } catch (error) {
      console.warn('Portrait mode processing error:', error);
      return imageData;
    }
  }

  // Helper methods for image processing

  private calculateMotionVectors(imageData: ImageData): Array<{ x: number; y: number; magnitude: number }> {
    // Simplified motion vector calculation
    // In a real implementation, this would use optical flow algorithms
    const vectors: Array<{ x: number; y: number; magnitude: number }> = [];
    
    if (this.stabilizationBuffer.length > 0) {
      const prevFrame = this.stabilizationBuffer[this.stabilizationBuffer.length - 1];
      // Calculate motion between frames (simplified)
      vectors.push({ x: 0, y: 0, magnitude: 0 });
    }

    return vectors;
  }

  private async applyStabilization(imageData: ImageData, motionVectors: any[]): Promise<ImageData> {
    // Create stabilized image data
    const stabilized = new ImageData(imageData.width, imageData.height);
    
    // Apply stabilization matrix (simplified implementation)
    const strength = this.imageStabilization.strength;
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      stabilized.data[i] = imageData.data[i];     // R
      stabilized.data[i + 1] = imageData.data[i + 1]; // G
      stabilized.data[i + 2] = imageData.data[i + 2]; // B
      stabilized.data[i + 3] = imageData.data[i + 3]; // A
    }

    return stabilized;
  }

  private async computeHDR(frames: ImageData[]): Promise<ImageData> {
    if (frames.length === 0) return frames[0];

    // Create HDR result
    const hdrResult = new ImageData(frames[0].width, frames[0].height);
    const pixelCount = frames[0].width * frames[0].height;

    // Simple HDR merge (in practice, would use more sophisticated algorithms)
    for (let i = 0; i < pixelCount * 4; i += 4) {
      let r = 0, g = 0, b = 0;
      
      // Average frames with exposure weighting
      for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
        const weight = this.getExposureWeight(frameIndex);
        r += frames[frameIndex].data[i] * weight;
        g += frames[frameIndex].data[i + 1] * weight;
        b += frames[frameIndex].data[i + 2] * weight;
      }

      // Apply tonemapping
      const totalWeight = frames.length;
      hdrResult.data[i] = this.tonemap(r / totalWeight);
      hdrResult.data[i + 1] = this.tonemap(g / totalWeight);
      hdrResult.data[i + 2] = this.tonemap(b / totalWeight);
      hdrResult.data[i + 3] = 255; // Alpha
    }

    return hdrResult;
  }

  private enhanceForLowLight(imageData: ImageData): ImageData {
    const enhanced = new ImageData(imageData.width, imageData.height);
    
    // Low-light enhancement
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Brighten shadows, preserve highlights
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      const brightness = (r + g + b) / 3;
      const enhancementFactor = 1 + (1 - brightness / 255) * 0.5;
      
      enhanced.data[i] = Math.min(255, r * enhancementFactor);
      enhanced.data[i + 1] = Math.min(255, g * enhancementFactor);
      enhanced.data[i + 2] = Math.min(255, b * enhancementFactor);
      enhanced.data[i + 3] = imageData.data[i + 3];
    }

    return enhanced;
  }

  private applyPortraitBlur(imageData: ImageData): ImageData {
    // Simplified portrait blur effect
    const blurred = new ImageData(imageData.width, imageData.height);
    
    // Apply subtle blur to outer regions
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const blurFactor = Math.min(1, distance / maxDistance);
        
        const index = (y * imageData.width + x) * 4;
        
        if (blurFactor > 0.6) {
          // Apply blur to background
          const blurRadius = Math.floor(blurFactor * 3);
          const blurredPixel = this.getBlurredPixel(imageData, x, y, blurRadius);
          
          blurred.data[index] = blurredPixel.r;
          blurred.data[index + 1] = blurredPixel.g;
          blurred.data[index + 2] = blurredPixel.b;
          blurred.data[index + 3] = imageData.data[index + 3];
        } else {
          // Keep foreground sharp
          blurred.data[index] = imageData.data[index];
          blurred.data[index + 1] = imageData.data[index + 1];
          blurred.data[index + 2] = imageData.data[index + 2];
          blurred.data[index + 3] = imageData.data[index + 3];
        }
      }
    }

    return blurred;
  }

  private getBlurredPixel(imageData: ImageData, x: number, y: number, radius: number): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0, count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.max(0, Math.min(imageData.width - 1, x + dx));
        const ny = Math.max(0, Math.min(imageData.height - 1, y + dy));
        const index = (ny * imageData.width + nx) * 4;

        r += imageData.data[index];
        g += imageData.data[index + 1];
        b += imageData.data[index + 2];
        count++;
      }
    }

    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }

  private getExposureWeight(frameIndex: number): number {
    // Weight based on exposure bracket
    const exposure = this.hdrProcessing.exposureBrackets[frameIndex] || 0;
    return Math.exp(-Math.abs(exposure) * 0.5);
  }

  private tonemap(value: number): number {
    // Filmic tonemapping
    switch (this.hdrProcessing.tonemapping) {
      case 'reinhard':
        return Math.round((value / (1 + value)) * 255);
      case 'filmic':
        return Math.round(this.filmicTonemap(value / 255) * 255);
      case 'aces':
        return Math.round(this.acesTonemap(value / 255) * 255);
      default:
        return Math.min(255, Math.round(value));
    }
  }

  private filmicTonemap(x: number): number {
    const A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
  }

  private acesTonemap(x: number): number {
    const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return (x * (a * x + b)) / (x * (c * x + d) + e);
  }

  private async adjustFocus(focusMeasure: number): Promise<void> {
    if (!this.videoTrack || !this.capabilities.focusMode) return;

    try {
      // Simplified focus adjustment
      const focusValue = Math.max(0, Math.min(1, focusMeasure));
      
      if (this.capabilities.focusMode.includes('manual')) {
        await this.videoTrack.applyConstraints({
          focusDistance: focusValue
        });
      }

    } catch (error) {
      console.warn('Focus adjustment failed:', error);
    }
  }

  private createIdentityMatrix(): number[][] {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  // Public API methods

  setAutoFocus(enabled: boolean, mode: 'single' | 'continuous' | 'manual' = 'continuous'): void {
    this.settings.autoFocus = enabled;
    this.autoFocus.enabled = enabled;
    this.autoFocus.mode = mode;
  }

  setImageStabilization(enabled: boolean, strength: number = 0.8): void {
    this.settings.imageStabilization = enabled;
    this.imageStabilization.enabled = enabled;
    this.imageStabilization.strength = Math.max(0, Math.min(1, strength));
  }

  setHDR(enabled: boolean): void {
    this.settings.hdr = enabled;
    this.hdrProcessing.enabled = enabled;
  }

  setNightMode(enabled: boolean): void {
    this.settings.nightMode = enabled;
  }

  setPortraitMode(enabled: boolean): void {
    this.settings.portraitMode = enabled;
  }

  setZoom(level: number): void {
    this.settings.zoomLevel = Math.max(1, level);
    this.applySettings().catch(console.error);
  }

  setExposureCompensation(value: number): void {
    this.settings.exposureCompensation = Math.max(-3, Math.min(3, value));
    this.applySettings().catch(console.error);
  }

  setWhiteBalance(mode: string): void {
    this.settings.whiteBalance = mode;
    this.applySettings().catch(console.error);
  }

  setFlashMode(mode: 'off' | 'on' | 'auto' | 'torch'): void {
    this.settings.flashMode = mode;
    this.applySettings().catch(console.error);
  }

  getSettings(): AdvancedCameraSettings {
    return { ...this.settings };
  }

  getCapabilities(): CameraCapabilities {
    return { ...this.capabilities };
  }

  getPerformanceMetrics(): any {
    return {
      autoFocus: this.autoFocus,
      imageStabilization: this.imageStabilization,
      hdrProcessing: this.hdrProcessing,
      frameBufferSize: this.frameBuffer.length,
      processingLoad: this.calculateProcessingLoad()
    };
  }

  private calculateProcessingLoad(): number {
    let load = 0;
    if (this.settings.autoFocus) load += 0.1;
    if (this.settings.imageStabilization) load += 0.2;
    if (this.settings.hdr) load += 0.3;
    if (this.settings.nightMode) load += 0.15;
    if (this.settings.portraitMode) load += 0.25;
    return Math.min(1, load);
  }

  dispose(): void {
    if (this.processingWorker) {
      this.processingWorker.terminate();
    }

    this.motionSensors.dispose();
    this.focusDetector.dispose();
    this.exposureAnalyzer.dispose();

    this.frameBuffer = [];
    this.stabilizationBuffer = [];
    this.hdrFrames = [];
    this.isInitialized = false;

    console.log('🧹 Advanced camera features disposed');
  }
}

// Supporting classes

class MotionSensorManager {
  private gyroscope: any = null;
  private accelerometer: any = null;
  private currentData: any = null;

  async initialize(): Promise<void> {
    try {
      if ('Gyroscope' in window) {
        this.gyroscope = new (window as any).Gyroscope({ frequency: 60 });
        this.gyroscope.start();
      }

      if ('Accelerometer' in window) {
        this.accelerometer = new (window as any).Accelerometer({ frequency: 60 });
        this.accelerometer.start();
      }
    } catch (error) {
      console.warn('Motion sensors not available');
    }
  }

  async getCurrentData(): Promise<any> {
    return this.currentData;
  }

  dispose(): void {
    if (this.gyroscope) this.gyroscope.stop();
    if (this.accelerometer) this.accelerometer.stop();
  }
}

class FocusDetector {
  async initialize(): Promise<void> {
    // Initialize focus detection algorithms
  }

  async calculateFocusMeasure(imageData: ImageData, area: any): Promise<number> {
    // Simplified focus measure using edge detection
    const { x, y, width, height } = area;
    const startX = Math.floor(imageData.width * x);
    const startY = Math.floor(imageData.height * y);
    const endX = Math.floor(imageData.width * (x + width));
    const endY = Math.floor(imageData.height * (y + height));

    let edgeStrength = 0;
    let pixelCount = 0;

    for (let py = startY; py < endY - 1; py++) {
      for (let px = startX; px < endX - 1; px++) {
        const idx = (py * imageData.width + px) * 4;
        const idxRight = (py * imageData.width + px + 1) * 4;
        const idxDown = ((py + 1) * imageData.width + px) * 4;

        // Calculate gradient
        const gx = imageData.data[idxRight] - imageData.data[idx];
        const gy = imageData.data[idxDown] - imageData.data[idx];
        edgeStrength += Math.sqrt(gx * gx + gy * gy);
        pixelCount++;
      }
    }

    return pixelCount > 0 ? edgeStrength / pixelCount / 255 : 0;
  }

  estimateDistance(focusMeasure: number): number {
    // Convert focus measure to estimated distance
    return Math.max(0.1, Math.min(10, 1 / Math.max(0.01, focusMeasure)));
  }

  dispose(): void {
    // Clean up resources
  }
}

class ExposureAnalyzer {
  async initialize(): Promise<void> {
    // Initialize exposure analysis
  }

  analyzeBrightness(imageData: ImageData): number {
    let totalBrightness = 0;
    const pixelCount = imageData.width * imageData.height;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }

    return totalBrightness / pixelCount / 255;
  }

  dispose(): void {
    // Clean up resources
  }
}

export const advancedCameraFeatures = new AdvancedCameraFeatures(); 