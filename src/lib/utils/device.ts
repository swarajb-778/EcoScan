/**
 * Device detection and capability utilities
 * Helps optimize the app for different devices and contexts
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  supportsWebGL: boolean;
  supportsWebRTC: boolean;
  supportsWebSpeech: boolean;
  supportsWebAssembly: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  screenSize: 'small' | 'medium' | 'large';
  connectionSpeed: 'slow' | 'fast' | 'unknown';
}

/**
 * Detect current device capabilities
 */
export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Screen size detection
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width <= 768 || hasTouch && width <= 1024;
  const isTablet = hasTouch && width > 768 && width <= 1024;
  const isDesktop = !isMobile && !isTablet;
  
  // Orientation
  const orientation = height > width ? 'portrait' : 'landscape';
  
  // Screen size categories
  let screenSize: 'small' | 'medium' | 'large' = 'medium';
  if (width <= 640) screenSize = 'small';
  else if (width >= 1280) screenSize = 'large';
  
  // Connection speed (rough estimate)
  let connectionSpeed: 'slow' | 'fast' | 'unknown' = 'unknown';
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType) {
      connectionSpeed = ['slow-2g', '2g', '3g'].includes(connection.effectiveType) 
        ? 'slow' : 'fast';
    }
  }
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    hasTouch,
    supportsWebGL: checkWebGLSupport(),
    supportsWebRTC: checkWebRTCSupport(),
    supportsWebSpeech: checkWebSpeechSupport(),
    supportsWebAssembly: checkWebAssemblySupport(),
    orientation,
    pixelRatio: window.devicePixelRatio || 1,
    screenSize,
    connectionSpeed
  };
}

/**
 * Check WebGL support for GPU acceleration
 */
export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Check WebRTC support for camera access
 */
export function checkWebRTCSupport(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    (
      navigator.mediaDevices.getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia
    )
  );
}

/**
 * Check Web Speech API support
 */
export function checkWebSpeechSupport(): boolean {
  return !!(
    window.SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition
  );
}

/**
 * Check WebAssembly support
 */
export function checkWebAssemblySupport(): boolean {
  try {
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {
    // WebAssembly not supported
  }
  return false;
}

/**
 * Get camera constraints optimized for current device
 */
export function getOptimalCameraConstraints(deviceInfo?: DeviceInfo): MediaStreamConstraints {
  const info = deviceInfo || getDeviceInfo();
  
  // Base constraints
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment', // Back camera preferred
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  };

  // Adjust for device capabilities
  if (info.isMobile) {
    // Mobile optimizations
    if (info.screenSize === 'small') {
      (constraints.video as MediaTrackConstraints).width = { ideal: 480 };
      (constraints.video as MediaTrackConstraints).height = { ideal: 360 };
    }
    
    // Ensure back camera on mobile
    (constraints.video as MediaTrackConstraints).facingMode = { ideal: 'environment' };
  } else if (info.isDesktop) {
    // Desktop can handle higher resolution
    (constraints.video as MediaTrackConstraints).width = { ideal: 1280 };
    (constraints.video as MediaTrackConstraints).height = { ideal: 720 };
  }

  // Frame rate optimization
  const frameRate = info.connectionSpeed === 'slow' ? 15 : 30;
  (constraints.video as MediaTrackConstraints).frameRate = { ideal: frameRate };

  return constraints;
}

/**
 * Check if current device is in landscape orientation
 */
export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

/**
 * Check if device has sufficient memory for ML operations
 */
export function hasEnoughMemory(): boolean {
  // Check device memory if available
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory) {
    return deviceMemory >= 2; // At least 2GB RAM
  }
  
  // Fallback: check if WebGL is available (usually indicates decent hardware)
  return checkWebGLSupport();
}

/**
 * Get recommended model settings based on device
 */
export function getRecommendedModelSettings(deviceInfo?: DeviceInfo) {
  const info = deviceInfo || getDeviceInfo();
  
  // Conservative settings for mobile/low-end devices
  if (info.isMobile || info.connectionSpeed === 'slow') {
    return {
      modelSize: 'small',
      inputSize: 416,
      confidenceThreshold: 0.6,
      nmsThreshold: 0.5,
      maxDetections: 10,
      useGPU: false
    };
  }
  
  // Optimized settings for desktop/high-end devices
  return {
    modelSize: 'medium',
    inputSize: 640,
    confidenceThreshold: 0.5,
    nmsThreshold: 0.4,
    maxDetections: 20,
    useGPU: info.supportsWebGL
  };
}

/**
 * Detect if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Detect if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get safe area insets for devices with notches
 */
export function getSafeAreaInsets() {
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0px',
    right: computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0px',
    bottom: computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
    left: computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0px'
  };
}

/**
 * Vibrate device if supported (for feedback)
 */
export function vibrate(pattern: number | number[] = 100): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
} 