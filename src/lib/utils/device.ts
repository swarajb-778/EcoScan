/**
 * Device detection and capability utilities for EcoScan
 * Detects device features, capabilities, and optimizes experience
 */

/**
 * Device information interface
 */
export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  version: string;
  capabilities: DeviceCapabilities;
  performance: DevicePerformance;
}

/**
 * Device capabilities interface
 */
export interface DeviceCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasWebRTC: boolean;
  hasServiceWorker: boolean;
  hasNotifications: boolean;
  hasVibration: boolean;
  hasGeolocation: boolean;
  hasFullscreen: boolean;
  hasClipboard: boolean;
  hasTouchScreen: boolean;
  hasAccelerometer: boolean;
  hasGyroscope: boolean;
  hasAmbientLight: boolean;
  hasProximity: boolean;
  hasBattery: boolean;
  hasWebAssembly: boolean;
  hasSharedArrayBuffer: boolean;
  hasOffscreenCanvas: boolean;
}

/**
 * Device performance interface
 */
export interface DevicePerformance {
  cores: number;
  memory: number; // in GB
  tier: 'low' | 'medium' | 'high';
  gpu: string;
  maxTextureSize: number;
  recommendedSettings: {
    modelSize: 'small' | 'medium' | 'large';
    inferenceFrequency: number; // ms
    maxResolution: number;
    enableOptimizations: boolean;
  };
}

/**
 * Device detector class
 */
export class DeviceDetector {
  private cachedInfo?: DeviceInfo;

  /**
   * Get comprehensive device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const info: DeviceInfo = {
      type: this.getDeviceType(),
      os: this.getOperatingSystem(),
      browser: this.getBrowser(),
      version: this.getBrowserVersion(),
      capabilities: await this.getCapabilities(),
      performance: await this.getPerformanceInfo()
    };

    this.cachedInfo = info;
    return info;
  }

  /**
   * Detect device type
   */
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for mobile devices
    if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(userAgent)) {
      return 'mobile';
    }
    
    // Check for tablets
    if (/tablet|ipad|kindle|silk/.test(userAgent)) {
      return 'tablet';
    }
    
    // Check screen size as fallback
    if (window.screen.width <= 768) {
      return 'mobile';
    } else if (window.screen.width <= 1024) {
      return 'tablet';
    }
    
    return 'desktop';
  }

  /**
   * Detect operating system
   */
  private getOperatingSystem(): DeviceInfo['os'] {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    if (/win/.test(platform)) return 'windows';
    if (/mac/.test(platform)) return 'macos';
    if (/linux/.test(platform)) return 'linux';
    
    return 'unknown';
  }

  /**
   * Detect browser
   */
  private getBrowser(): DeviceInfo['browser'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/chrome/.test(userAgent) && !/edge|edg/.test(userAgent)) return 'chrome';
    if (/firefox/.test(userAgent)) return 'firefox';
    if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) return 'safari';
    if (/edge|edg/.test(userAgent)) return 'edge';
    
    return 'unknown';
  }

  /**
   * Get browser version
   */
  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const browser = this.getBrowser();
    
    let match: RegExpMatchArray | null = null;
    
    switch (browser) {
      case 'chrome':
        match = userAgent.match(/Chrome\/(\d+\.\d+)/);
        break;
      case 'firefox':
        match = userAgent.match(/Firefox\/(\d+\.\d+)/);
        break;
      case 'safari':
        match = userAgent.match(/Version\/(\d+\.\d+)/);
        break;
      case 'edge':
        match = userAgent.match(/Edg\/(\d+\.\d+)/);
        break;
    }
    
    return match ? match[1] : 'unknown';
  }

  /**
   * Check device capabilities
   */
  private async getCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      hasCamera: await this.checkCameraSupport(),
      hasMicrophone: await this.checkMicrophoneSupport(),
      hasWebGL: this.checkWebGLSupport(),
      hasWebGL2: this.checkWebGL2Support(),
      hasWebRTC: this.checkWebRTCSupport(),
      hasServiceWorker: this.checkServiceWorkerSupport(),
      hasNotifications: this.checkNotificationSupport(),
      hasVibration: this.checkVibrationSupport(),
      hasGeolocation: this.checkGeolocationSupport(),
      hasFullscreen: this.checkFullscreenSupport(),
      hasClipboard: this.checkClipboardSupport(),
      hasTouchScreen: this.checkTouchSupport(),
      hasAccelerometer: this.checkAccelerometerSupport(),
      hasGyroscope: this.checkGyroscopeSupport(),
      hasAmbientLight: this.checkAmbientLightSupport(),
      hasProximity: this.checkProximitySupport(),
      hasBattery: this.checkBatterySupport(),
      hasWebAssembly: this.checkWebAssemblySupport(),
      hasSharedArrayBuffer: this.checkSharedArrayBufferSupport(),
      hasOffscreenCanvas: this.checkOffscreenCanvasSupport()
    };

    return capabilities;
  }

  /**
   * Get performance information
   */
  private async getPerformanceInfo(): Promise<DevicePerformance> {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = this.getMemoryInfo();
    const gpu = this.getGPUInfo();
    const maxTextureSize = this.getMaxTextureSize();
    
    const tier = this.calculatePerformanceTier(cores, memory, gpu);
    const recommendedSettings = this.getRecommendedSettings(tier);

    return {
      cores,
      memory,
      tier,
      gpu,
      maxTextureSize,
      recommendedSettings
    };
  }

  /**
   * Check camera support
   */
  private async checkCameraSupport(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check microphone support
   */
  private async checkMicrophoneSupport(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check WebGL support
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Check WebGL2 support
   */
  private checkWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  /**
   * Check WebRTC support
   */
  private checkWebRTCSupport(): boolean {
    return !!(window.RTCPeerConnection || 
              (window as any).webkitRTCPeerConnection || 
              (window as any).mozRTCPeerConnection);
  }

  /**
   * Check Service Worker support
   */
  private checkServiceWorkerSupport(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Check Notification support
   */
  private checkNotificationSupport(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check Vibration support
   */
  private checkVibrationSupport(): boolean {
    return 'vibrate' in navigator;
  }

  /**
   * Check Geolocation support
   */
  private checkGeolocationSupport(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check Fullscreen support
   */
  private checkFullscreenSupport(): boolean {
    return !!(document.documentElement.requestFullscreen ||
              (document.documentElement as any).webkitRequestFullscreen ||
              (document.documentElement as any).mozRequestFullScreen ||
              (document.documentElement as any).msRequestFullscreen);
  }

  /**
   * Check Clipboard support
   */
  private checkClipboardSupport(): boolean {
    return 'clipboard' in navigator;
  }

  /**
   * Check Touch support
   */
  private checkTouchSupport(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Check Accelerometer support
   */
  private checkAccelerometerSupport(): boolean {
    return 'DeviceMotionEvent' in window;
  }

  /**
   * Check Gyroscope support
   */
  private checkGyroscopeSupport(): boolean {
    return 'DeviceOrientationEvent' in window;
  }

  /**
   * Check Ambient Light support
   */
  private checkAmbientLightSupport(): boolean {
    return 'AmbientLightSensor' in window;
  }

  /**
   * Check Proximity support
   */
  private checkProximitySupport(): boolean {
    return 'ProximitySensor' in window;
  }

  /**
   * Check Battery support
   */
  private checkBatterySupport(): boolean {
    return 'getBattery' in navigator;
  }

  /**
   * Check WebAssembly support
   */
  private checkWebAssemblySupport(): boolean {
    return 'WebAssembly' in window;
  }

  /**
   * Check SharedArrayBuffer support
   */
  private checkSharedArrayBufferSupport(): boolean {
    return 'SharedArrayBuffer' in window;
  }

  /**
   * Check OffscreenCanvas support
   */
  private checkOffscreenCanvasSupport(): boolean {
    return 'OffscreenCanvas' in window;
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.jsHeapSizeLimit / (1024 * 1024 * 1024)); // Convert to GB
    }
    
    // Estimate based on other factors
    const cores = navigator.hardwareConcurrency || 2;
    if (cores >= 8) return 8;
    if (cores >= 4) return 4;
    return 2;
  }

  /**
   * Get GPU information
   */
  private getGPUInfo(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext || 
                 canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown GPU';
        }
      }
    } catch {
      // Ignore errors
    }
    
    return 'Unknown GPU';
  }

  /**
   * Get maximum texture size
   */
  private getMaxTextureSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext || 
                 canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (gl) {
        return gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
      }
    } catch {
      // Ignore errors
    }
    
    return 2048; // Safe default
  }

  /**
   * Calculate performance tier
   */
  private calculatePerformanceTier(cores: number, memory: number, gpu: string): 'low' | 'medium' | 'high' {
    let score = 0;
    
    // CPU score
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;
    
    // Memory score
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;
    
    // GPU score
    const gpuLower = gpu.toLowerCase();
    if (/nvidia|amd|intel iris|mali-g7|adreno 6/.test(gpuLower)) score += 3;
    else if (/intel|mali|adreno/.test(gpuLower)) score += 2;
    else score += 1;
    
    if (score >= 7) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  /**
   * Get recommended settings based on performance tier
   */
  private getRecommendedSettings(tier: 'low' | 'medium' | 'high'): DevicePerformance['recommendedSettings'] {
    switch (tier) {
      case 'high':
        return {
          modelSize: 'large',
          inferenceFrequency: 50,
          maxResolution: 1280,
          enableOptimizations: false
        };
      case 'medium':
        return {
          modelSize: 'medium',
          inferenceFrequency: 100,
          maxResolution: 960,
          enableOptimizations: true
        };
      case 'low':
        return {
          modelSize: 'small',
          inferenceFrequency: 200,
          maxResolution: 640,
          enableOptimizations: true
        };
    }
  }
}

/**
 * Device-specific optimizations
 */
export class DeviceOptimizer {
  private deviceInfo?: DeviceInfo;

  constructor(private detector: DeviceDetector) {}

  async initialize(): Promise<void> {
    this.deviceInfo = await this.detector.getDeviceInfo();
  }

  /**
   * Get optimized camera constraints
   */
  getCameraConstraints(): MediaStreamConstraints {
    if (!this.deviceInfo) {
      throw new Error('DeviceOptimizer not initialized');
    }

    const { performance, type } = this.deviceInfo;
    const { maxResolution } = performance.recommendedSettings;

    return {
      video: {
        width: { ideal: Math.min(maxResolution, 1280) },
        height: { ideal: Math.min(maxResolution * 0.75, 960) },
        frameRate: type === 'mobile' ? { ideal: 20, max: 30 } : { ideal: 30 },
        facingMode: type === 'mobile' ? 'environment' : 'user'
      }
    };
  }

  /**
   * Get optimized canvas size
   */
  getOptimizedCanvasSize(targetWidth: number, targetHeight: number): { width: number; height: number } {
    if (!this.deviceInfo) {
      return { width: targetWidth, height: targetHeight };
    }

    const { maxResolution } = this.deviceInfo.performance.recommendedSettings;
    const scale = Math.min(maxResolution / Math.max(targetWidth, targetHeight), 1);

    return {
      width: Math.round(targetWidth * scale),
      height: Math.round(targetHeight * scale)
    };
  }

  /**
   * Check if feature should be enabled
   */
  shouldEnableFeature(feature: keyof DeviceCapabilities): boolean {
    if (!this.deviceInfo) return false;
    return this.deviceInfo.capabilities[feature];
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    if (!this.deviceInfo) return [];

    const recommendations: string[] = [];
    const { performance, type, capabilities } = this.deviceInfo;

    if (performance.tier === 'low') {
      recommendations.push('Consider using lower resolution for better performance');
      recommendations.push('Reduce inference frequency to save battery');
    }

    if (type === 'mobile' && !capabilities.hasWebGL2) {
      recommendations.push('WebGL2 not available - some features may be limited');
    }

    if (performance.cores < 4) {
      recommendations.push('Limited CPU cores detected - enable performance optimizations');
    }

    if (performance.memory < 4) {
      recommendations.push('Limited memory detected - avoid memory-intensive operations');
    }

    return recommendations;
  }
}

/**
 * Utility functions
 */
export const DeviceUtils = {
  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Check if device is iOS
   */
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  /**
   * Check if device is Android
   */
  isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  },

  /**
   * Check if device is in landscape mode
   */
  isLandscape(): boolean {
    return window.innerWidth > window.innerHeight;
  },

  /**
   * Get device pixel ratio
   */
  getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  },

  /**
   * Check if device supports hover
   */
  supportsHover(): boolean {
    return window.matchMedia('(hover: hover)').matches;
  },

  /**
   * Get safe area insets for notched devices
   */
  getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
    };
  }
};

// Global instances
export const deviceDetector = new DeviceDetector();
export const deviceOptimizer = new DeviceOptimizer(deviceDetector); 