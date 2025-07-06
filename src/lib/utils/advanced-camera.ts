/**
 * Advanced Camera Management for EcoScan
 * Handles multi-camera switching, dynamic resolution, and performance optimization
 */

export interface CameraCapabilities {
  deviceId: string;
  label: string;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  facingMode: 'user' | 'environment' | 'left' | 'right';
  supportedConstraints: MediaTrackSupportedConstraints;
  isDefault: boolean;
}

export interface CameraState {
  isActive: boolean;
  currentCamera: string | null;
  currentResolution: { width: number; height: number };
  currentFrameRate: number;
  isStreaming: boolean;
  streamHealth: 'excellent' | 'good' | 'poor' | 'critical';
  lastFrameTime: number;
  droppedFrames: number;
  avgFrameTime: number;
}

export interface CameraConstraints {
  preferredDeviceId?: string;
  preferredResolution?: { width: number; height: number };
  preferredFrameRate?: number;
  facingMode?: 'user' | 'environment';
  lowLatency?: boolean;
  autoFocus?: boolean;
  exposureMode?: 'none' | 'manual' | 'single-shot' | 'continuous';
}

export interface FrameDropStrategy {
  enabled: boolean;
  targetFPS: number;
  maxDropPercentage: number;
  adaptiveThreshold: number;
  qualityLevel: 'ultra' | 'high' | 'medium' | 'low';
}

export class AdvancedCameraManager {
  private cameras: CameraCapabilities[] = [];
  private state: CameraState;
  private currentStream: MediaStream | null = null;
  private videoElement?: HTMLVideoElement;
  private constraints: CameraConstraints = {};
  private frameDropStrategy: FrameDropStrategy;
  
  private frameTimes: number[] = [];
  private lastFrameTimestamp = 0;
  private frameDropCounter = 0;
  private performanceMonitorInterval?: NodeJS.Timeout;
  private cameraWatchInterval?: NodeJS.Timeout;
  
  private readonly FRAME_TIME_HISTORY_LENGTH = 30;
  private readonly PERFORMANCE_CHECK_INTERVAL = 1000; // 1 second
  private readonly CAMERA_WATCH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.state = {
      isActive: false,
      currentCamera: null,
      currentResolution: { width: 640, height: 480 },
      currentFrameRate: 30,
      isStreaming: false,
      streamHealth: 'excellent',
      lastFrameTime: 0,
      droppedFrames: 0,
      avgFrameTime: 0
    };
    
    this.frameDropStrategy = {
      enabled: false,
      targetFPS: 30,
      maxDropPercentage: 20,
      adaptiveThreshold: 50, // ms
      qualityLevel: 'high'
    };
    
    this.initializeManager();
  }

  private async initializeManager(): Promise<void> {
    try {
      await this.discoverCameras();
      this.setupEventListeners();
      this.startPerformanceMonitoring();
      this.startCameraWatching();
    } catch (error) {
      console.error('Failed to initialize camera manager:', error);
    }
  }

  private async discoverCameras(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      this.cameras = [];
      
      for (const device of videoInputs) {
        try {
          const capabilities = await this.probeCameraCapabilities(device.deviceId);
          const cameraInfo: CameraCapabilities = {
            deviceId: device.deviceId,
            label: device.label || `Camera ${this.cameras.length + 1}`,
            resolution: capabilities.resolution,
            frameRate: capabilities.frameRate,
            facingMode: capabilities.facingMode,
            supportedConstraints: capabilities.supportedConstraints,
            isDefault: this.cameras.length === 0 // First camera is default
          };
          
          this.cameras.push(cameraInfo);
        } catch (error) {
          console.warn(`Failed to probe camera ${device.deviceId}:`, error);
        }
      }
      
      console.log(`📷 Discovered ${this.cameras.length} cameras:`, this.cameras);
    } catch (error) {
      console.error('Camera discovery failed:', error);
      throw new Error('No cameras available or permission denied');
    }
  }

  private async probeCameraCapabilities(deviceId: string): Promise<{
    resolution: { width: number; height: number };
    frameRate: number;
    facingMode: 'user' | 'environment' | 'left' | 'right';
    supportedConstraints: MediaTrackSupportedConstraints;
  }> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
    
    try {
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const capabilities = track.getCapabilities();
      
      // Determine optimal resolution
      const maxWidth = capabilities.width?.max || 1920;
      const maxHeight = capabilities.height?.max || 1080;
      const optimalResolution = this.selectOptimalResolution(maxWidth, maxHeight);
      
      // Determine optimal frame rate
      const maxFrameRate = capabilities.frameRate?.max || 30;
      const optimalFrameRate = Math.min(30, maxFrameRate);
      
      // Determine facing mode
      const facingMode = settings.facingMode as 'user' | 'environment' | 'left' | 'right' || 'environment';
      
      return {
        resolution: optimalResolution,
        frameRate: optimalFrameRate,
        facingMode,
        supportedConstraints: navigator.mediaDevices.getSupportedConstraints()
      };
    } finally {
      stream.getTracks().forEach(track => track.stop());
    }
  }

  private selectOptimalResolution(maxWidth: number, maxHeight: number): { width: number; height: number } {
    // Common resolutions in order of preference
    const resolutions = [
      { width: 1920, height: 1080 }, // Full HD
      { width: 1280, height: 720 },  // HD
      { width: 960, height: 540 },   // qHD
      { width: 640, height: 480 },   // VGA
      { width: 480, height: 360 },   // Low
      { width: 320, height: 240 }    // Very Low
    ];
    
    for (const resolution of resolutions) {
      if (resolution.width <= maxWidth && resolution.height <= maxHeight) {
        return resolution;
      }
    }
    
    return { width: 320, height: 240 }; // Fallback
  }

  private setupEventListeners(): void {
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('📷 Camera devices changed, re-discovering...');
      this.discoverCameras();
    });
    
    // Listen for adaptive config changes
    window.addEventListener('adaptive-config-change', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { config } = customEvent.detail;
      this.adaptToPerformanceRequirements(config);
    });
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseStream();
      } else {
        this.resumeStream();
      }
    });
  }

  private adaptToPerformanceRequirements(config: any): void {
    // Update frame drop strategy based on performance requirements
    this.frameDropStrategy = {
      enabled: config.enableOptimizations,
      targetFPS: config.targetFPS || 30,
      maxDropPercentage: config.qualityLevel === 'low' ? 30 : 15,
      adaptiveThreshold: config.maxInferenceTime || 50,
      qualityLevel: config.qualityLevel || 'high'
    };
    
    // Adjust camera resolution if needed
    if (config.resolution && this.state.isActive) {
      this.adjustResolution(config.resolution);
    }
  }

  private async adjustResolution(targetResolution: { width: number; height: number }): Promise<void> {
    if (!this.currentStream) return;
    
    try {
      const videoTrack = this.currentStream.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints({
          width: { ideal: targetResolution.width },
          height: { ideal: targetResolution.height }
        });
        
        this.state.currentResolution = targetResolution;
        console.log(`📷 Resolution adjusted to: ${targetResolution.width}x${targetResolution.height}`);
      }
    } catch (error) {
      console.warn('Failed to adjust camera resolution:', error);
    }
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitorInterval = setInterval(() => {
      this.updateStreamHealth();
      this.optimizeFrameRate();
    }, this.PERFORMANCE_CHECK_INTERVAL);
  }

  private startCameraWatching(): void {
    this.cameraWatchInterval = setInterval(() => {
      this.checkStreamIntegrity();
    }, this.CAMERA_WATCH_INTERVAL);
  }

  private updateStreamHealth(): void {
    if (!this.state.isStreaming) return;
    
    const avgFrameTime = this.calculateAverageFrameTime();
    const targetFrameTime = 1000 / this.frameDropStrategy.targetFPS;
    const frameTimeRatio = avgFrameTime / targetFrameTime;
    
    // Determine stream health
    if (frameTimeRatio <= 1.1) {
      this.state.streamHealth = 'excellent';
    } else if (frameTimeRatio <= 1.5) {
      this.state.streamHealth = 'good';
    } else if (frameTimeRatio <= 2.0) {
      this.state.streamHealth = 'poor';
    } else {
      this.state.streamHealth = 'critical';
    }
    
    this.state.avgFrameTime = avgFrameTime;
    
    // Trigger optimization if needed
    if (this.state.streamHealth === 'poor' || this.state.streamHealth === 'critical') {
      this.triggerPerformanceOptimization();
    }
  }

  private calculateAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  private triggerPerformanceOptimization(): void {
    console.warn('📷 Stream performance degraded, applying optimizations');
    
    // Enable frame dropping
    this.frameDropStrategy.enabled = true;
    
    // Reduce resolution if possible
    if (this.state.currentResolution.width > 320) {
      const newWidth = Math.max(320, Math.round(this.state.currentResolution.width * 0.8));
      const newHeight = Math.max(240, Math.round(this.state.currentResolution.height * 0.8));
      this.adjustResolution({ width: newWidth, height: newHeight });
    }
    
    // Reduce frame rate
    if (this.state.currentFrameRate > 15) {
      this.adjustFrameRate(Math.max(15, this.state.currentFrameRate - 5));
    }
  }

  private async adjustFrameRate(targetFPS: number): Promise<void> {
    if (!this.currentStream) return;
    
    try {
      const videoTrack = this.currentStream.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints({
          frameRate: { ideal: targetFPS }
        });
        
        this.state.currentFrameRate = targetFPS;
        this.frameDropStrategy.targetFPS = targetFPS;
        console.log(`📷 Frame rate adjusted to: ${targetFPS} FPS`);
      }
    } catch (error) {
      console.warn('Failed to adjust camera frame rate:', error);
    }
  }

  private optimizeFrameRate(): void {
    if (!this.frameDropStrategy.enabled) return;
    
    const shouldDropFrame = this.shouldDropCurrentFrame();
    if (shouldDropFrame) {
      this.frameDropCounter++;
      this.state.droppedFrames++;
    }
  }

  private shouldDropCurrentFrame(): boolean {
    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTimestamp;
    
    // Always process first frame
    if (this.lastFrameTimestamp === 0) {
      this.lastFrameTimestamp = now;
      return false;
    }
    
    const targetFrameTime = 1000 / this.frameDropStrategy.targetFPS;
    
    // Drop frame if we're ahead of schedule and recent performance is poor
    if (timeSinceLastFrame < targetFrameTime * 0.8 && this.state.streamHealth !== 'excellent') {
      return true;
    }
    
    // Drop frame if adaptive threshold exceeded
    if (timeSinceLastFrame > this.frameDropStrategy.adaptiveThreshold) {
      const dropRate = this.frameDropCounter / (this.frameTimes.length || 1);
      if (dropRate < this.frameDropStrategy.maxDropPercentage / 100) {
        return true;
      }
    }
    
    this.lastFrameTimestamp = now;
    return false;
  }

  private checkStreamIntegrity(): void {
    if (!this.currentStream || !this.state.isStreaming) return;
    
    const videoTrack = this.currentStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      console.warn('📷 Stream integrity compromised, attempting recovery');
      this.handleStreamLoss();
    }
  }

  private async handleStreamLoss(): Promise<void> {
    console.log('📷 Attempting stream recovery...');
    
    try {
      // Stop current stream
      this.stopStream();
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Restart with same camera or fallback
      const cameraId = this.state.currentCamera;
      if (cameraId) {
        await this.startCamera(cameraId);
      } else {
        await this.startDefaultCamera();
      }
      
      console.log('✅ Stream recovery successful');
    } catch (error) {
      console.error('❌ Stream recovery failed:', error);
      throw new Error('Camera stream recovery failed');
    }
  }

  private pauseStream(): void {
    if (this.currentStream && this.state.isStreaming) {
      this.currentStream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
      this.state.isStreaming = false;
      console.log('📷 Stream paused');
    }
  }

  private resumeStream(): void {
    if (this.currentStream && !this.state.isStreaming) {
      this.currentStream.getVideoTracks().forEach(track => {
        track.enabled = true;
      });
      this.state.isStreaming = true;
      console.log('📷 Stream resumed');
    }
  }

  // Public API methods
  
  async startDefaultCamera(): Promise<MediaStream> {
    const defaultCamera = this.cameras.find(camera => camera.isDefault) || this.cameras[0];
    if (!defaultCamera) {
      throw new Error('No cameras available');
    }
    return this.startCamera(defaultCamera.deviceId);
  }

  async startCamera(deviceId: string, constraints?: CameraConstraints): Promise<MediaStream> {
    try {
      // Stop current stream if active
      if (this.currentStream) {
        this.stopStream();
      }
      
      // Find camera info
      const camera = this.cameras.find(c => c.deviceId === deviceId);
      if (!camera) {
        throw new Error(`Camera not found: ${deviceId}`);
      }
      
      // Merge constraints
      this.constraints = { ...this.constraints, ...constraints };
      
      // Create media constraints
      const mediaConstraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: this.constraints.preferredResolution?.width || camera.resolution.width },
          height: { ideal: this.constraints.preferredResolution?.height || camera.resolution.height },
          frameRate: { ideal: this.constraints.preferredFrameRate || camera.frameRate }
        }
      };
      
      // Add advanced constraints if supported
      if (camera.supportedConstraints.facingMode && this.constraints.facingMode) {
        (mediaConstraints.video as any).facingMode = this.constraints.facingMode;
      }
      
      if ('focusMode' in camera.supportedConstraints && this.constraints.autoFocus !== undefined) {
        (mediaConstraints.video as any).focusMode = this.constraints.autoFocus ? 'continuous' : 'manual';
      }
      
      // Get media stream
      this.currentStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      // Update state
      this.state.isActive = true;
      this.state.currentCamera = deviceId;
      this.state.isStreaming = true;
      
      // Get actual settings
      const videoTrack = this.currentStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      this.state.currentResolution = {
        width: settings.width || camera.resolution.width,
        height: settings.height || camera.resolution.height
      };
      this.state.currentFrameRate = settings.frameRate || camera.frameRate;
      
      console.log(`📷 Camera started: ${camera.label} (${this.state.currentResolution.width}x${this.state.currentResolution.height} @ ${this.state.currentFrameRate}fps)`);
      
      return this.currentStream;
    } catch (error) {
      console.error('Failed to start camera:', error);
      throw error;
    }
  }

  async switchCamera(deviceId: string): Promise<MediaStream> {
    console.log(`📷 Switching to camera: ${deviceId}`);
    return this.startCamera(deviceId, this.constraints);
  }

  async switchToNextCamera(): Promise<MediaStream> {
    const currentIndex = this.cameras.findIndex(c => c.deviceId === this.state.currentCamera);
    const nextIndex = (currentIndex + 1) % this.cameras.length;
    const nextCamera = this.cameras[nextIndex];
    
    return this.switchCamera(nextCamera.deviceId);
  }

  stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    this.state.isActive = false;
    this.state.currentCamera = null;
    this.state.isStreaming = false;
    this.frameDropCounter = 0;
    this.frameTimes = [];
    
    console.log('📷 Camera stopped');
  }

  getCameras(): CameraCapabilities[] {
    return [...this.cameras];
  }

  getCurrentState(): CameraState {
    return { ...this.state };
  }

  getFrameDropStrategy(): FrameDropStrategy {
    return { ...this.frameDropStrategy };
  }

  updateFrameDropStrategy(strategy: Partial<FrameDropStrategy>): void {
    this.frameDropStrategy = { ...this.frameDropStrategy, ...strategy };
  }

  // Frame processing integration
  processFrame(timestamp: number): boolean {
    // Record frame timing
    if (this.lastFrameTimestamp > 0) {
      const frameTime = timestamp - this.lastFrameTimestamp;
      this.frameTimes.push(frameTime);
      
      if (this.frameTimes.length > this.FRAME_TIME_HISTORY_LENGTH) {
        this.frameTimes.shift();
      }
    }
    
    this.state.lastFrameTime = timestamp;
    
    // Check if frame should be dropped
    return !this.shouldDropCurrentFrame();
  }

  dispose(): void {
    this.stopStream();
    
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
    }
    
    if (this.cameraWatchInterval) {
      clearInterval(this.cameraWatchInterval);
    }
    
    console.log('📷 Advanced camera manager disposed');
  }
}

// Global instance for easy access
export const advancedCameraManager = new AdvancedCameraManager(); 