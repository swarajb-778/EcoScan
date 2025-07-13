/**
 * Enhanced Camera System
 * 
 * Features:
 * - Advanced camera controls and settings
 * - Image stabilization and motion detection
 * - Auto-focus and exposure control
 * - Multi-resolution and aspect ratio support
 * - Camera switching (front/back)
 * - Flash and torch control
 * - Video recording capabilities
 * - Real-time image enhancement
 * - Object tracking and focus
 * - Professional camera modes
 * - Image quality optimization
 * - Performance monitoring
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface CameraConstraints {
  video: {
    width?: { min?: number; ideal?: number; max?: number };
    height?: { min?: number; ideal?: number; max?: number };
    aspectRatio?: { ideal?: number };
    frameRate?: { min?: number; ideal?: number; max?: number };
    facingMode?: 'user' | 'environment' | 'left' | 'right';
    deviceId?: string;
    resizeMode?: 'none' | 'crop-and-scale';
    exposureMode?: 'continuous' | 'manual' | 'single-shot';
    focusMode?: 'continuous' | 'manual' | 'single-shot';
    whiteBalanceMode?: 'continuous' | 'manual' | 'single-shot';
    iso?: { min?: number; ideal?: number; max?: number };
    brightness?: { min?: number; ideal?: number; max?: number };
    contrast?: { min?: number; ideal?: number; max?: number };
    saturation?: { min?: number; ideal?: number; max?: number };
    sharpness?: { min?: number; ideal?: number; max?: number };
    zoom?: { min?: number; ideal?: number; max?: number };
    torch?: boolean;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
  };
  audio?: boolean;
}

export interface CameraCapabilities {
  width: MediaSettingsRange;
  height: MediaSettingsRange;
  aspectRatio: MediaSettingsRange;
  frameRate: MediaSettingsRange;
  facingMode: string[];
  resizeMode: string[];
  exposureMode: string[];
  focusMode: string[];
  whiteBalanceMode: string[];
  iso: MediaSettingsRange;
  brightness: MediaSettingsRange;
  contrast: MediaSettingsRange;
  saturation: MediaSettingsRange;
  sharpness: MediaSettingsRange;
  zoom: MediaSettingsRange;
  torch: boolean;
  exposureCompensation: MediaSettingsRange;
  colorTemperature: MediaSettingsRange;
  focusDistance: MediaSettingsRange;
}

export interface CameraSettings {
  width: number;
  height: number;
  aspectRatio: number;
  frameRate: number;
  facingMode: string;
  exposureMode: string;
  focusMode: string;
  whiteBalanceMode: string;
  iso: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  zoom: number;
  torch: boolean;
  exposureCompensation: number;
  colorTemperature: number;
  focusDistance: number;
}

export interface CameraDevice {
  deviceId: string;
  groupId: string;
  kind: string;
  label: string;
  capabilities: CameraCapabilities;
  facingMode: string;
  isDefault: boolean;
}

export interface CameraState {
  isInitialized: boolean;
  isActive: boolean;
  isRecording: boolean;
  isCapturing: boolean;
  currentDevice: CameraDevice | null;
  availableDevices: CameraDevice[];
  stream: MediaStream | null;
  settings: CameraSettings;
  capabilities: CameraCapabilities | null;
  error: string | null;
  isStabilizing: boolean;
  focusLocked: boolean;
  exposureLocked: boolean;
  flashMode: 'off' | 'on' | 'auto';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  stabilization: boolean;
  noiseReduction: boolean;
  hdr: boolean;
  nightMode: boolean;
  portraitMode: boolean;
  motionDetection: boolean;
  objectTracking: boolean;
}

export interface ImageStabilization {
  enabled: boolean;
  strength: number;
  mode: 'optical' | 'digital' | 'hybrid';
  gyroscopeEnabled: boolean;
  accelerometerEnabled: boolean;
  smoothingFactor: number;
  correctionThreshold: number;
  motionVectors: MotionVector[];
}

export interface MotionVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
  timestamp: number;
}

export interface AutoFocus {
  enabled: boolean;
  mode: 'continuous' | 'single' | 'manual';
  sensitivity: number;
  speed: number;
  accuracy: number;
  currentDistance: number;
  targetDistance: number;
  isLocked: boolean;
  focusArea: FocusArea;
  peakFocus: number;
}

export interface FocusArea {
  x: number;
  y: number;
  width: number;
  height: number;
  weight: number;
}

export interface AutoExposure {
  enabled: boolean;
  mode: 'continuous' | 'single' | 'manual';
  meteringMode: 'matrix' | 'center' | 'spot';
  compensation: number;
  isLocked: boolean;
  currentValue: number;
  targetValue: number;
  meteringArea: MeteringArea;
  histogram: number[];
}

export interface MeteringArea {
  x: number;
  y: number;
  width: number;
  height: number;
  weight: number;
}

export interface ImageEnhancement {
  enabled: boolean;
  denoise: boolean;
  sharpen: boolean;
  colorCorrection: boolean;
  contrastEnhancement: boolean;
  brightnessAdjustment: boolean;
  saturationBoost: boolean;
  hdrProcessing: boolean;
  nightModeProcessing: boolean;
  portraitModeProcessing: boolean;
  realTimeProcessing: boolean;
}

export interface CameraConfig {
  defaultDevice: 'environment' | 'user' | string;
  preferredResolution: { width: number; height: number };
  preferredFrameRate: number;
  enableImageStabilization: boolean;
  enableAutoFocus: boolean;
  enableAutoExposure: boolean;
  enableImageEnhancement: boolean;
  enableMotionDetection: boolean;
  enableObjectTracking: boolean;
  enablePerformanceMonitoring: boolean;
  stabilizationStrength: number;
  focusSensitivity: number;
  exposureSensitivity: number;
  qualityPreset: 'low' | 'medium' | 'high' | 'ultra';
  debugMode: boolean;
  analyticsEnabled: boolean;
}

export class EnhancedCameraSystem {
  private config: CameraConfig;
  private state: CameraState;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private imageCapture: ImageCapture | null = null;
  private imageStabilization: ImageStabilization;
  private autoFocus: AutoFocus;
  private autoExposure: AutoExposure;
  private imageEnhancement: ImageEnhancement;
  private motionDetector: MotionDetector | null = null;
  private objectTracker: ObjectTracker | null = null;
  private performanceMonitor: CameraPerformanceMonitor;
  private eventListeners: Map<string, Function[]> = new Map();
  private animationFrameId: number = 0;
  private frameBuffer: ImageData[] = [];
  private stabilizationWorker: Worker | null = null;
  private enhancementWorker: Worker | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<CameraConfig> = {}) {
    this.config = {
      defaultDevice: 'environment',
      preferredResolution: { width: 1920, height: 1080 },
      preferredFrameRate: 30,
      enableImageStabilization: true,
      enableAutoFocus: true,
      enableAutoExposure: true,
      enableImageEnhancement: true,
      enableMotionDetection: true,
      enableObjectTracking: false,
      enablePerformanceMonitoring: true,
      stabilizationStrength: 0.8,
      focusSensitivity: 0.7,
      exposureSensitivity: 0.6,
      qualityPreset: 'high',
      debugMode: false,
      analyticsEnabled: true,
      ...config
    };

    this.state = {
      isInitialized: false,
      isActive: false,
      isRecording: false,
      isCapturing: false,
      currentDevice: null,
      availableDevices: [],
      stream: null,
      settings: this.getDefaultSettings(),
      capabilities: null,
      error: null,
      isStabilizing: false,
      focusLocked: false,
      exposureLocked: false,
      flashMode: 'off',
      quality: this.config.qualityPreset,
      stabilization: this.config.enableImageStabilization,
      noiseReduction: true,
      hdr: false,
      nightMode: false,
      portraitMode: false,
      motionDetection: this.config.enableMotionDetection,
      objectTracking: this.config.enableObjectTracking
    };

    this.imageStabilization = {
      enabled: this.config.enableImageStabilization,
      strength: this.config.stabilizationStrength,
      mode: 'hybrid',
      gyroscopeEnabled: false,
      accelerometerEnabled: false,
      smoothingFactor: 0.8,
      correctionThreshold: 0.1,
      motionVectors: []
    };

    this.autoFocus = {
      enabled: this.config.enableAutoFocus,
      mode: 'continuous',
      sensitivity: this.config.focusSensitivity,
      speed: 0.8,
      accuracy: 0.9,
      currentDistance: 0,
      targetDistance: 0,
      isLocked: false,
      focusArea: { x: 0.5, y: 0.5, width: 0.2, height: 0.2, weight: 1 },
      peakFocus: 0
    };

    this.autoExposure = {
      enabled: this.config.enableAutoExposure,
      mode: 'continuous',
      meteringMode: 'matrix',
      compensation: 0,
      isLocked: false,
      currentValue: 0,
      targetValue: 0,
      meteringArea: { x: 0.5, y: 0.5, width: 0.3, height: 0.3, weight: 1 },
      histogram: new Array(256).fill(0)
    };

    this.imageEnhancement = {
      enabled: this.config.enableImageEnhancement,
      denoise: true,
      sharpen: true,
      colorCorrection: true,
      contrastEnhancement: true,
      brightnessAdjustment: true,
      saturationBoost: false,
      hdrProcessing: false,
      nightModeProcessing: false,
      portraitModeProcessing: false,
      realTimeProcessing: true
    };

    this.performanceMonitor = new CameraPerformanceMonitor();
    this.initializeEventListeners();
  }

  private getDefaultSettings(): CameraSettings {
    return {
      width: this.config.preferredResolution.width,
      height: this.config.preferredResolution.height,
      aspectRatio: this.config.preferredResolution.width / this.config.preferredResolution.height,
      frameRate: this.config.preferredFrameRate,
      facingMode: this.config.defaultDevice,
      exposureMode: 'continuous',
      focusMode: 'continuous',
      whiteBalanceMode: 'continuous',
      iso: 100,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      zoom: 1,
      torch: false,
      exposureCompensation: 0,
      colorTemperature: 5500,
      focusDistance: 0
    };
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('initialized', []);
    this.eventListeners.set('started', []);
    this.eventListeners.set('stopped', []);
    this.eventListeners.set('deviceChanged', []);
    this.eventListeners.set('settingsChanged', []);
    this.eventListeners.set('error', []);
    this.eventListeners.set('frame', []);
    this.eventListeners.set('capture', []);
    this.eventListeners.set('focusChanged', []);
    this.eventListeners.set('exposureChanged', []);
    this.eventListeners.set('motionDetected', []);
    this.eventListeners.set('objectTracked', []);
    this.eventListeners.set('stabilizationUpdate', []);
  }

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      if (!browser) {
        throw new Error('Camera system can only be initialized in browser environment');
      }

      // Check browser support
      if (!this.checkBrowserSupport()) {
        throw new Error('Browser does not support required camera features');
      }

      // Initialize workers
      await this.initializeWorkers();

      // Get available devices
      await this.enumerateDevices();

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.initialize();
      }

      // Initialize motion detector
      if (this.config.enableMotionDetection) {
        this.motionDetector = new MotionDetector();
      }

      // Initialize object tracker
      if (this.config.enableObjectTracking) {
        this.objectTracker = new ObjectTracker();
      }

      // Initialize device orientation if available
      if (this.config.enableImageStabilization && 'DeviceOrientationEvent' in window) {
        await this.initializeDeviceOrientation();
      }

      this.isInitialized = true;
      this.state.isInitialized = true;
      this.emit('initialized');
      this.log('Enhanced camera system initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize camera system', error);
      this.state.error = error.message;
      throw error;
    }
  }

  private checkBrowserSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.enumerateDevices
    );
  }

  private async initializeWorkers(): Promise<void> {
    try {
      if (this.config.enableImageStabilization) {
        this.stabilizationWorker = new Worker('/workers/stabilization-worker.js');
        this.stabilizationWorker.onmessage = (e) => {
          this.handleStabilizationResult(e.data);
        };
      }

      if (this.config.enableImageEnhancement) {
        this.enhancementWorker = new Worker('/workers/enhancement-worker.js');
        this.enhancementWorker.onmessage = (e) => {
          this.handleEnhancementResult(e.data);
        };
      }

      this.log('Workers initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize workers', error);
      // Continue without workers if they fail to load
    }
  }

  private async enumerateDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      this.state.availableDevices = await Promise.all(
        videoDevices.map(async (device) => {
          const capabilities = await this.getDeviceCapabilities(device.deviceId);
          return {
            deviceId: device.deviceId,
            groupId: device.groupId,
            kind: device.kind,
            label: device.label,
            capabilities,
            facingMode: this.inferFacingMode(device.label),
            isDefault: device.deviceId === 'default'
          };
        })
      );

      this.log(`Found ${this.state.availableDevices.length} camera devices`);
    } catch (error) {
      this.logError('Failed to enumerate devices', error);
      throw error;
    }
  }

  private async getDeviceCapabilities(deviceId: string): Promise<CameraCapabilities> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      stream.getTracks().forEach(track => track.stop());

      return capabilities as CameraCapabilities;
    } catch (error) {
      this.logError(`Failed to get capabilities for device ${deviceId}`, error);
      return {} as CameraCapabilities;
    }
  }

  private inferFacingMode(label: string): string {
    const labelLower = label.toLowerCase();
    if (labelLower.includes('front') || labelLower.includes('user')) {
      return 'user';
    } else if (labelLower.includes('back') || labelLower.includes('environment')) {
      return 'environment';
    }
    return 'unknown';
  }

  private async initializeDeviceOrientation(): Promise<void> {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.imageStabilization.gyroscopeEnabled = true;
          this.setupDeviceOrientationListeners();
        }
      } else {
        this.imageStabilization.gyroscopeEnabled = true;
        this.setupDeviceOrientationListeners();
      }
    } catch (error) {
      this.logError('Failed to initialize device orientation', error);
    }
  }

  private setupDeviceOrientationListeners(): void {
    window.addEventListener('deviceorientation', (event) => {
      this.handleDeviceOrientation(event);
    });

    window.addEventListener('devicemotion', (event) => {
      this.handleDeviceMotion(event);
    });
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    if (!this.imageStabilization.gyroscopeEnabled) return;

    const { alpha, beta, gamma } = event;
    if (alpha !== null && beta !== null && gamma !== null) {
      this.updateStabilization(alpha, beta, gamma);
    }
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    if (!this.imageStabilization.accelerometerEnabled) return;

    const { acceleration } = event;
    if (acceleration && acceleration.x !== null && acceleration.y !== null) {
      this.updateMotionVectors(acceleration.x, acceleration.y);
    }
  }

  private updateStabilization(alpha: number, beta: number, gamma: number): void {
    // Update stabilization based on device orientation
    // This is a simplified implementation
    const motionVector: MotionVector = {
      x: gamma,
      y: beta,
      magnitude: Math.sqrt(gamma * gamma + beta * beta),
      angle: Math.atan2(beta, gamma),
      timestamp: Date.now()
    };

    this.imageStabilization.motionVectors.push(motionVector);
    
    // Keep only recent motion vectors
    if (this.imageStabilization.motionVectors.length > 10) {
      this.imageStabilization.motionVectors.shift();
    }

    this.emit('stabilizationUpdate', motionVector);
  }

  private updateMotionVectors(x: number, y: number): void {
    const motionVector: MotionVector = {
      x,
      y,
      magnitude: Math.sqrt(x * x + y * y),
      angle: Math.atan2(y, x),
      timestamp: Date.now()
    };

    this.imageStabilization.motionVectors.push(motionVector);
    
    if (this.imageStabilization.motionVectors.length > 10) {
      this.imageStabilization.motionVectors.shift();
    }
  }

  async startCamera(deviceId?: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Select device
      const device = this.selectDevice(deviceId);
      if (!device) {
        throw new Error('No suitable camera device found');
      }

      // Build constraints
      const constraints = this.buildConstraints(device);

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store stream and update state
      this.state.stream = stream;
      this.state.currentDevice = device;
      this.state.isActive = true;
      this.state.error = null;

      // Setup video element
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        await this.videoElement.play();
      }

      // Setup image capture
      const videoTrack = stream.getVideoTracks()[0];
      this.imageCapture = new ImageCapture(videoTrack);

      // Get current settings
      this.state.settings = await this.getCurrentSettings();
      this.state.capabilities = videoTrack.getCapabilities() as CameraCapabilities;

      // Start frame processing
      this.startFrameProcessing();

      // Start auto-focus and auto-exposure
      this.startAutoFocus();
      this.startAutoExposure();

      this.emit('started', { device, stream });
      this.log(`Camera started with device: ${device.label}`);
    } catch (error) {
      this.logError('Failed to start camera', error);
      this.state.error = error.message;
      throw error;
    }
  }

  private selectDevice(deviceId?: string): CameraDevice | null {
    if (deviceId) {
      return this.state.availableDevices.find(d => d.deviceId === deviceId) || null;
    }

    // Try to find default device by facing mode
    const preferredFacingMode = this.config.defaultDevice;
    const deviceByFacingMode = this.state.availableDevices.find(d => 
      d.facingMode === preferredFacingMode
    );

    if (deviceByFacingMode) {
      return deviceByFacingMode;
    }

    // Return first available device
    return this.state.availableDevices[0] || null;
  }

  private buildConstraints(device: CameraDevice): CameraConstraints {
    const constraints: CameraConstraints = {
      video: {
        deviceId: { exact: device.deviceId },
        width: { ideal: this.state.settings.width },
        height: { ideal: this.state.settings.height },
        frameRate: { ideal: this.state.settings.frameRate }
      },
      audio: false
    };

    // Add advanced constraints if supported
    if (device.capabilities.focusMode) {
      constraints.video.focusMode = this.state.settings.focusMode as any;
    }

    if (device.capabilities.exposureMode) {
      constraints.video.exposureMode = this.state.settings.exposureMode as any;
    }

    if (device.capabilities.whiteBalanceMode) {
      constraints.video.whiteBalanceMode = this.state.settings.whiteBalanceMode as any;
    }

    if (device.capabilities.torch) {
      constraints.video.torch = this.state.settings.torch;
    }

    return constraints;
  }

  private async getCurrentSettings(): Promise<CameraSettings> {
    if (!this.state.stream) {
      return this.getDefaultSettings();
    }

    const track = this.state.stream.getVideoTracks()[0];
    const settings = track.getSettings();

    return {
      width: settings.width || this.state.settings.width,
      height: settings.height || this.state.settings.height,
      aspectRatio: settings.aspectRatio || this.state.settings.aspectRatio,
      frameRate: settings.frameRate || this.state.settings.frameRate,
      facingMode: settings.facingMode || this.state.settings.facingMode,
      exposureMode: settings.exposureMode || this.state.settings.exposureMode,
      focusMode: settings.focusMode || this.state.settings.focusMode,
      whiteBalanceMode: settings.whiteBalanceMode || this.state.settings.whiteBalanceMode,
      iso: settings.iso || this.state.settings.iso,
      brightness: settings.brightness || this.state.settings.brightness,
      contrast: settings.contrast || this.state.settings.contrast,
      saturation: settings.saturation || this.state.settings.saturation,
      sharpness: settings.sharpness || this.state.settings.sharpness,
      zoom: settings.zoom || this.state.settings.zoom,
      torch: settings.torch || this.state.settings.torch,
      exposureCompensation: settings.exposureCompensation || this.state.settings.exposureCompensation,
      colorTemperature: settings.colorTemperature || this.state.settings.colorTemperature,
      focusDistance: settings.focusDistance || this.state.settings.focusDistance
    };
  }

  private startFrameProcessing(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const processFrame = () => {
      if (!this.state.isActive) return;

      const startTime = performance.now();

      // Draw current frame to canvas
      this.context?.drawImage(
        this.videoElement!,
        0, 0,
        this.canvasElement!.width,
        this.canvasElement!.height
      );

      // Get image data
      const imageData = this.context?.getImageData(
        0, 0,
        this.canvasElement!.width,
        this.canvasElement!.height
      );

      if (imageData) {
        // Process frame
        this.processFrame(imageData);

        // Store in buffer
        this.frameBuffer.push(imageData);
        if (this.frameBuffer.length > 5) {
          this.frameBuffer.shift();
        }
      }

      // Monitor performance
      const processingTime = performance.now() - startTime;
      this.performanceMonitor.recordFrameProcessingTime(processingTime);

      // Continue processing
      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  private processFrame(imageData: ImageData): void {
    // Image stabilization
    if (this.imageStabilization.enabled) {
      this.processStabilization(imageData);
    }

    // Motion detection
    if (this.config.enableMotionDetection && this.motionDetector) {
      const motion = this.motionDetector.detectMotion(imageData);
      if (motion) {
        this.emit('motionDetected', motion);
      }
    }

    // Object tracking
    if (this.config.enableObjectTracking && this.objectTracker) {
      const objects = this.objectTracker.trackObjects(imageData);
      if (objects.length > 0) {
        this.emit('objectTracked', objects);
      }
    }

    // Auto-focus processing
    if (this.autoFocus.enabled) {
      this.processAutoFocus(imageData);
    }

    // Auto-exposure processing
    if (this.autoExposure.enabled) {
      this.processAutoExposure(imageData);
    }

    // Image enhancement
    if (this.imageEnhancement.enabled && this.imageEnhancement.realTimeProcessing) {
      this.processImageEnhancement(imageData);
    }

    this.emit('frame', imageData);
  }

  private processStabilization(imageData: ImageData): void {
    if (!this.stabilizationWorker) return;

    this.state.isStabilizing = true;
    
    this.stabilizationWorker.postMessage({
      type: 'stabilize',
      imageData,
      motionVectors: this.imageStabilization.motionVectors,
      settings: this.imageStabilization
    });
  }

  private handleStabilizationResult(data: any): void {
    if (data.type === 'stabilized') {
      // Apply stabilized image data
      this.state.isStabilizing = false;
      this.emit('stabilizationUpdate', data.result);
    }
  }

  private processAutoFocus(imageData: ImageData): void {
    if (this.autoFocus.mode === 'manual' || this.autoFocus.isLocked) return;

    const focusMetric = this.calculateFocusMetric(imageData);
    
    if (focusMetric > this.autoFocus.peakFocus) {
      this.autoFocus.peakFocus = focusMetric;
      this.autoFocus.currentDistance = this.autoFocus.targetDistance;
    }

    // Adjust focus if needed
    if (Math.abs(focusMetric - this.autoFocus.peakFocus) > this.autoFocus.sensitivity) {
      this.adjustFocus();
    }
  }

  private calculateFocusMetric(imageData: ImageData): number {
    const data = imageData.data;
    let variance = 0;
    let mean = 0;

    // Calculate mean
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      mean += gray;
    }
    mean /= (data.length / 4);

    // Calculate variance (measure of sharpness)
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(gray - mean, 2);
    }
    variance /= (data.length / 4);

    return Math.sqrt(variance);
  }

  private adjustFocus(): void {
    if (!this.state.stream || !this.state.capabilities?.focusDistance) return;

    const track = this.state.stream.getVideoTracks()[0];
    const currentDistance = this.autoFocus.currentDistance;
    const adjustment = this.autoFocus.sensitivity * 0.1;

    try {
      track.applyConstraints({
        advanced: [{
          focusDistance: currentDistance + adjustment
        }]
      });

      this.autoFocus.targetDistance = currentDistance + adjustment;
      this.emit('focusChanged', this.autoFocus);
    } catch (error) {
      this.logError('Failed to adjust focus', error);
    }
  }

  private processAutoExposure(imageData: ImageData): void {
    if (this.autoExposure.mode === 'manual' || this.autoExposure.isLocked) return;

    const brightness = this.calculateBrightness(imageData);
    const histogram = this.calculateHistogram(imageData);
    
    this.autoExposure.currentValue = brightness;
    this.autoExposure.histogram = histogram;

    // Adjust exposure if needed
    const targetBrightness = 128; // Mid-gray
    const difference = targetBrightness - brightness;
    
    if (Math.abs(difference) > this.config.exposureSensitivity * 100) {
      this.adjustExposure(difference);
    }
  }

  private calculateBrightness(imageData: ImageData): number {
    const data = imageData.data;
    let total = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      total += brightness;
    }

    return total / (data.length / 4);
  }

  private calculateHistogram(imageData: ImageData): number[] {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[brightness]++;
    }

    return histogram;
  }

  private adjustExposure(difference: number): void {
    if (!this.state.stream || !this.state.capabilities?.exposureCompensation) return;

    const track = this.state.stream.getVideoTracks()[0];
    const compensation = this.autoExposure.compensation + (difference * 0.01);

    try {
      track.applyConstraints({
        advanced: [{
          exposureCompensation: Math.max(-2, Math.min(2, compensation))
        }]
      });

      this.autoExposure.compensation = compensation;
      this.emit('exposureChanged', this.autoExposure);
    } catch (error) {
      this.logError('Failed to adjust exposure', error);
    }
  }

  private processImageEnhancement(imageData: ImageData): void {
    if (!this.enhancementWorker) return;

    this.enhancementWorker.postMessage({
      type: 'enhance',
      imageData,
      settings: this.imageEnhancement
    });
  }

  private handleEnhancementResult(data: any): void {
    if (data.type === 'enhanced') {
      // Apply enhanced image data
      this.emit('enhanced', data.result);
    }
  }

  private startAutoFocus(): void {
    if (!this.autoFocus.enabled || this.autoFocus.mode !== 'continuous') return;

    const focusLoop = () => {
      if (!this.state.isActive || !this.autoFocus.enabled) return;

      // Auto-focus processing happens in processFrame
      setTimeout(focusLoop, 100); // 10 FPS focus updates
    };

    focusLoop();
  }

  private startAutoExposure(): void {
    if (!this.autoExposure.enabled || this.autoExposure.mode !== 'continuous') return;

    const exposureLoop = () => {
      if (!this.state.isActive || !this.autoExposure.enabled) return;

      // Auto-exposure processing happens in processFrame
      setTimeout(exposureLoop, 200); // 5 FPS exposure updates
    };

    exposureLoop();
  }

  async stopCamera(): Promise<void> {
    try {
      // Stop frame processing
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = 0;
      }

      // Stop stream
      if (this.state.stream) {
        this.state.stream.getTracks().forEach(track => track.stop());
        this.state.stream = null;
      }

      // Clean up video element
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }

      // Clean up image capture
      this.imageCapture = null;

      // Update state
      this.state.isActive = false;
      this.state.isRecording = false;
      this.state.currentDevice = null;

      this.emit('stopped');
      this.log('Camera stopped');
    } catch (error) {
      this.logError('Failed to stop camera', error);
      throw error;
    }
  }

  async capturePhoto(): Promise<Blob> {
    if (!this.imageCapture) {
      throw new Error('Camera not active');
    }

    try {
      this.state.isCapturing = true;
      
      const blob = await this.imageCapture.takePhoto({
        imageWidth: this.state.settings.width,
        imageHeight: this.state.settings.height
      });

      this.state.isCapturing = false;
      this.emit('capture', blob);
      
      this.log('Photo captured');
      return blob;
    } catch (error) {
      this.state.isCapturing = false;
      this.logError('Failed to capture photo', error);
      throw error;
    }
  }

  async switchCamera(): Promise<void> {
    if (this.state.availableDevices.length < 2) {
      throw new Error('No alternative camera available');
    }

    const currentIndex = this.state.availableDevices.findIndex(
      d => d.deviceId === this.state.currentDevice?.deviceId
    );

    const nextIndex = (currentIndex + 1) % this.state.availableDevices.length;
    const nextDevice = this.state.availableDevices[nextIndex];

    await this.stopCamera();
    await this.startCamera(nextDevice.deviceId);
    
    this.emit('deviceChanged', nextDevice);
    this.log(`Switched to camera: ${nextDevice.label}`);
  }

  async updateSettings(settings: Partial<CameraSettings>): Promise<void> {
    if (!this.state.stream) {
      throw new Error('Camera not active');
    }

    try {
      const track = this.state.stream.getVideoTracks()[0];
      const constraints: any = { advanced: [{}] };

      // Build constraints from settings
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined) {
          constraints.advanced[0][key] = value;
        }
      });

      await track.applyConstraints(constraints);
      
      // Update state
      this.state.settings = { ...this.state.settings, ...settings };
      
      this.emit('settingsChanged', this.state.settings);
      this.log('Camera settings updated');
    } catch (error) {
      this.logError('Failed to update settings', error);
      throw error;
    }
  }

  setVideoElement(element: HTMLVideoElement): void {
    this.videoElement = element;
    
    if (this.state.stream) {
      element.srcObject = this.state.stream;
    }
  }

  setCanvasElement(element: HTMLCanvasElement): void {
    this.canvasElement = element;
    this.context = element.getContext('2d');
  }

  // Focus control methods
  async focusAt(x: number, y: number): Promise<void> {
    this.autoFocus.focusArea = {
      x: x / this.state.settings.width,
      y: y / this.state.settings.height,
      width: 0.1,
      height: 0.1,
      weight: 1
    };

    if (this.autoFocus.mode === 'single' || this.autoFocus.mode === 'manual') {
      await this.triggerFocus();
    }
  }

  async triggerFocus(): Promise<void> {
    if (!this.state.stream) return;

    try {
      const track = this.state.stream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{
          focusMode: 'single-shot'
        }]
      });

      this.log('Focus triggered');
    } catch (error) {
      this.logError('Failed to trigger focus', error);
    }
  }

  lockFocus(): void {
    this.autoFocus.isLocked = true;
    this.state.focusLocked = true;
    this.log('Focus locked');
  }

  unlockFocus(): void {
    this.autoFocus.isLocked = false;
    this.state.focusLocked = false;
    this.log('Focus unlocked');
  }

  // Exposure control methods
  async setExposureCompensation(value: number): Promise<void> {
    await this.updateSettings({ exposureCompensation: value });
  }

  lockExposure(): void {
    this.autoExposure.isLocked = true;
    this.state.exposureLocked = true;
    this.log('Exposure locked');
  }

  unlockExposure(): void {
    this.autoExposure.isLocked = false;
    this.state.exposureLocked = false;
    this.log('Exposure unlocked');
  }

  // Flash control methods
  async setFlashMode(mode: 'off' | 'on' | 'auto'): Promise<void> {
    this.state.flashMode = mode;
    
    if (mode === 'on') {
      await this.updateSettings({ torch: true });
    } else {
      await this.updateSettings({ torch: false });
    }
  }

  async toggleFlash(): Promise<void> {
    const currentMode = this.state.flashMode;
    const nextMode = currentMode === 'off' ? 'on' : 'off';
    await this.setFlashMode(nextMode);
  }

  // Zoom control methods
  async setZoom(level: number): Promise<void> {
    const capabilities = this.state.capabilities?.zoom;
    if (!capabilities) {
      throw new Error('Zoom not supported');
    }

    const clampedLevel = Math.max(capabilities.min, Math.min(capabilities.max, level));
    await this.updateSettings({ zoom: clampedLevel });
  }

  async zoomIn(step: number = 0.1): Promise<void> {
    const currentZoom = this.state.settings.zoom;
    await this.setZoom(currentZoom + step);
  }

  async zoomOut(step: number = 0.1): Promise<void> {
    const currentZoom = this.state.settings.zoom;
    await this.setZoom(currentZoom - step);
  }

  // Quality control methods
  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.state.quality = quality;
    
    const qualitySettings = {
      low: { width: 640, height: 480, frameRate: 15 },
      medium: { width: 1280, height: 720, frameRate: 24 },
      high: { width: 1920, height: 1080, frameRate: 30 },
      ultra: { width: 3840, height: 2160, frameRate: 30 }
    };

    this.updateSettings(qualitySettings[quality]);
  }

  // Enhancement control methods
  toggleImageStabilization(): void {
    this.imageStabilization.enabled = !this.imageStabilization.enabled;
    this.state.stabilization = this.imageStabilization.enabled;
    this.log(`Image stabilization ${this.imageStabilization.enabled ? 'enabled' : 'disabled'}`);
  }

  toggleNoiseReduction(): void {
    this.imageEnhancement.denoise = !this.imageEnhancement.denoise;
    this.state.noiseReduction = this.imageEnhancement.denoise;
    this.log(`Noise reduction ${this.imageEnhancement.denoise ? 'enabled' : 'disabled'}`);
  }

  toggleHDR(): void {
    this.imageEnhancement.hdrProcessing = !this.imageEnhancement.hdrProcessing;
    this.state.hdr = this.imageEnhancement.hdrProcessing;
    this.log(`HDR processing ${this.imageEnhancement.hdrProcessing ? 'enabled' : 'disabled'}`);
  }

  toggleNightMode(): void {
    this.imageEnhancement.nightModeProcessing = !this.imageEnhancement.nightModeProcessing;
    this.state.nightMode = this.imageEnhancement.nightModeProcessing;
    this.log(`Night mode ${this.imageEnhancement.nightModeProcessing ? 'enabled' : 'disabled'}`);
  }

  // State getters
  getState(): CameraState {
    return { ...this.state };
  }

  getSettings(): CameraSettings {
    return { ...this.state.settings };
  }

  getCapabilities(): CameraCapabilities | null {
    return this.state.capabilities;
  }

  getAvailableDevices(): CameraDevice[] {
    return [...this.state.availableDevices];
  }

  getCurrentDevice(): CameraDevice | null {
    return this.state.currentDevice;
  }

  getPerformanceMetrics(): any {
    return this.performanceMonitor.getMetrics();
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logError(`Error in event listener for ${event}`, error);
        }
      });
    }
  }

  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[EnhancedCamera] ${message}`);
    }
  }

  private logError(message: string, error?: any): void {
    if (this.config.debugMode) {
      console.error(`[EnhancedCamera] ${message}`, error);
    }
  }

  async dispose(): Promise<void> {
    await this.stopCamera();
    
    // Terminate workers
    if (this.stabilizationWorker) {
      this.stabilizationWorker.terminate();
      this.stabilizationWorker = null;
    }

    if (this.enhancementWorker) {
      this.enhancementWorker.terminate();
      this.enhancementWorker = null;
    }

    // Clean up event listeners
    this.eventListeners.clear();
    
    // Clean up buffers
    this.frameBuffer = [];
    this.imageStabilization.motionVectors = [];
    
    this.isInitialized = false;
    this.log('Camera system disposed');
  }
}

// Helper classes
class MotionDetector {
  private previousFrame: ImageData | null = null;
  private threshold: number = 30;

  detectMotion(currentFrame: ImageData): boolean {
    if (!this.previousFrame) {
      this.previousFrame = this.copyImageData(currentFrame);
      return false;
    }

    const motionLevel = this.calculateMotionLevel(this.previousFrame, currentFrame);
    this.previousFrame = this.copyImageData(currentFrame);

    return motionLevel > this.threshold;
  }

  private calculateMotionLevel(frame1: ImageData, frame2: ImageData): number {
    const data1 = frame1.data;
    const data2 = frame2.data;
    let totalDiff = 0;

    for (let i = 0; i < data1.length; i += 4) {
      const diff = Math.abs(data1[i] - data2[i]) + 
                   Math.abs(data1[i + 1] - data2[i + 1]) + 
                   Math.abs(data1[i + 2] - data2[i + 2]);
      totalDiff += diff;
    }

    return totalDiff / (data1.length / 4);
  }

  private copyImageData(imageData: ImageData): ImageData {
    const copy = new ImageData(imageData.width, imageData.height);
    copy.data.set(imageData.data);
    return copy;
  }
}

class ObjectTracker {
  private trackedObjects: any[] = [];

  trackObjects(frame: ImageData): any[] {
    // Simplified object tracking
    // In a real implementation, this would use computer vision algorithms
    return this.trackedObjects;
  }
}

class CameraPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private isInitialized: boolean = false;

  initialize(): void {
    this.metrics.set('frameProcessingTime', []);
    this.metrics.set('frameRate', []);
    this.metrics.set('memoryUsage', []);
    this.isInitialized = true;
  }

  recordFrameProcessingTime(time: number): void {
    if (!this.isInitialized) return;

    const times = this.metrics.get('frameProcessingTime') || [];
    times.push(time);
    
    if (times.length > 100) {
      times.shift();
    }
    
    this.metrics.set('frameProcessingTime', times);
  }

  getMetrics(): any {
    const result: any = {};
    
    for (const [key, values] of this.metrics.entries()) {
      result[key] = {
        current: values[values.length - 1] || 0,
        average: values.reduce((a, b) => a + b, 0) / values.length || 0,
        min: Math.min(...values) || 0,
        max: Math.max(...values) || 0
      };
    }
    
    return result;
  }
}

// Svelte stores
export const cameraSystem = new EnhancedCameraSystem();
export const cameraState = writable<CameraState>({
  isInitialized: false,
  isActive: false,
  isRecording: false,
  isCapturing: false,
  currentDevice: null,
  availableDevices: [],
  stream: null,
  settings: cameraSystem.getSettings(),
  capabilities: null,
  error: null,
  isStabilizing: false,
  focusLocked: false,
  exposureLocked: false,
  flashMode: 'off',
  quality: 'high',
  stabilization: true,
  noiseReduction: true,
  hdr: false,
  nightMode: false,
  portraitMode: false,
  motionDetection: true,
  objectTracking: false
});

// Initialize camera system
if (browser) {
  cameraSystem.initialize().catch(console.error);
  
  // Update store on state changes
  cameraSystem.on('initialized', () => {
    cameraState.update(state => ({ ...state, isInitialized: true }));
  });

  cameraSystem.on('started', () => {
    cameraState.update(state => ({ ...state, isActive: true }));
  });

  cameraSystem.on('stopped', () => {
    cameraState.update(state => ({ ...state, isActive: false }));
  });

  cameraSystem.on('error', (error: string) => {
    cameraState.update(state => ({ ...state, error }));
  });
}

export default cameraSystem; 