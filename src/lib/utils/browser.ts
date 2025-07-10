/**
 * Browser environment detection utilities
 * Provides safe ways to check browser APIs during SSR
 */

// Cache results to avoid repeated DOM queries
let browserCache: {
  isBrowser?: boolean;
  navigator?: Navigator | null;
  window?: Window | null;
  document?: Document | null;
} = {};

/**
 * Check if we're running in a browser environment
 */
export function isBrowser(): boolean {
  if (browserCache.isBrowser !== undefined) {
    return browserCache.isBrowser;
  }
  
  browserCache.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  return browserCache.isBrowser;
}

/**
 * Check if a specific browser API is available
 */
export function isBrowserAPI(api: string): boolean {
  if (!isBrowser()) return false;
  
  try {
    const parts = api.split('.');
    let current: any = window;
    
    for (const part of parts) {
      if (!(part in current)) return false;
      current = current[part];
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely access document - returns null during SSR
 */
export function safeDocument(): Document | null {
  if (browserCache.document !== undefined) {
    return browserCache.document;
  }
  
  browserCache.document = isBrowser() ? document : null;
  return browserCache.document;
}

/**
 * Safely access window - returns null during SSR
 */
export function safeWindow(): Window | null {
  if (browserCache.window !== undefined) {
    return browserCache.window;
  }
  
  browserCache.window = isBrowser() ? window : null;
  return browserCache.window;
}

/**
 * Safely access navigator - returns null during SSR
 */
export function safeNavigator(): Navigator | null {
  if (browserCache.navigator !== undefined) {
    return browserCache.navigator;
  }
  
  browserCache.navigator = isBrowser() ? navigator : null;
  return browserCache.navigator;
}

/**
 * Check if WebGL is supported
 */
export function isWebGLSupported(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const canvas = safeCreateCanvas();
    if (!canvas) return false;
    const context = canvas.getContext('webgl') || canvas.getContext('webgl2');
    return !!context;
  } catch {
    return false;
  }
}

/**
 * Check if getUserMedia is supported
 */
export function isUserMediaSupported(): boolean {
  const navigator = safeNavigator();
  return !!(navigator?.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check if Speech Recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  const window = safeWindow();
  if (!window) return false;
  
  return !!(
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Check if Web Audio API is supported
 */
export function isWebAudioSupported(): boolean {
  const window = safeWindow();
  if (!window) return false;
  
  return !!(
    (window as any).AudioContext || 
    (window as any).webkitAudioContext
  );
}

/**
 * Check if Vibration API is supported
 */
export function isVibrationSupported(): boolean {
  const navigator = safeNavigator();
  if (!navigator) return false;
  
  return !!(
    navigator.vibrate || 
    (navigator as any).webkitVibrate || 
    (navigator as any).mozVibrate
  );
}

/**
 * Check if Clipboard API is supported
 */
export function isClipboardSupported(): boolean {
  const navigator = safeNavigator();
  return !!(navigator?.clipboard && navigator.clipboard.writeText);
}

/**
 * Check if Service Worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  const navigator = safeNavigator();
  return !!(navigator && 'serviceWorker' in navigator);
}

/**
 * Check if Push API is supported
 */
export function isPushSupported(): boolean {
  const window = safeWindow();
  return !!(window && 'PushManager' in window);
}

/**
 * Check if Notification API is supported
 */
export function isNotificationSupported(): boolean {
  const window = safeWindow();
  return !!(window && 'Notification' in window);
}

/**
 * Safely create a canvas element
 */
export function safeCreateCanvas(): HTMLCanvasElement | null {
  return browserOnly(() => {
    const doc = safeDocument();
    return doc ? doc.createElement('canvas') : null;
  }, null);
}

/**
 * Execute function only in browser environment
 */
export function browserOnly<T>(fn: () => T, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }
  
  try {
    return fn();
  } catch (error) {
    console.warn('Browser-only function failed:', error);
    return fallback;
  }
}

/**
 * Get comprehensive browser capabilities
 */
export function getBrowserCapabilities() {
  return browserOnly(() => ({
    webgl: isWebGLSupported(),
    webgl2: isBrowserAPI('HTMLCanvasElement.prototype.getContext') && !!safeCreateCanvas()?.getContext('webgl2'),
    userMedia: isUserMediaSupported(),
    speechRecognition: isSpeechRecognitionSupported(),
    webAudio: isWebAudioSupported(),
    vibration: isVibrationSupported(),
    clipboard: isClipboardSupported(),
    serviceWorker: isServiceWorkerSupported(),
    push: isPushSupported(),
    notification: isNotificationSupported(),
    webAssembly: typeof WebAssembly !== 'undefined',
    es6Modules: isBrowserAPI('HTMLScriptElement.prototype.type'),
    intersectionObserver: isBrowserAPI('IntersectionObserver'),
    resizeObserver: isBrowserAPI('ResizeObserver'),
    mutationObserver: isBrowserAPI('MutationObserver')
  }), {
    webgl: false,
    webgl2: false,
    userMedia: false,
    speechRecognition: false,
    webAudio: false,
    vibration: false,
    clipboard: false,
    serviceWorker: false,
    push: false,
    notification: false,
    webAssembly: false,
    es6Modules: false,
    intersectionObserver: false,
    resizeObserver: false,
    mutationObserver: false
  });
}

/**
 * Get device information safely
 */
export function getDeviceInfo() {
  return browserOnly(() => {
    const navigator = safeNavigator();
    const window = safeWindow();
    
    if (!navigator || !window) return null;
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages || [navigator.language],
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      deviceMemory: (navigator as any).deviceMemory || null,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
      colorDepth: window.screen?.colorDepth || 24,
      pixelRatio: window.devicePixelRatio || 1
    };
  }, null);
}

/**
 * Clear the browser detection cache (useful for testing)
 */
export function clearBrowserCache(): void {
  browserCache = {};
}

/**
 * Get safe performance API
 */
export function safePerformance(): Performance | null {
  return browserOnly(() => performance, null);
}

/**
 * Get safe local storage
 */
export function safeLocalStorage(): Storage | null {
  return browserOnly(() => localStorage, null);
}

/**
 * Get safe session storage
 */
export function safeSessionStorage(): Storage | null {
  return browserOnly(() => sessionStorage, null);
} 

/**
 * Enhanced compatibility check result
 */
export interface CompatibilityResult {
  isSupported: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  score: number; // 0-100 compatibility score
}

/**
 * Camera compatibility requirements
 */
export interface CameraCompatibility {
  userMedia: boolean;
  webgl: boolean;
  canvas: boolean;
  promises: boolean;
  es6: boolean;
  https: boolean;
}

/**
 * Comprehensive browser and device compatibility check
 */
export function checkCameraCompatibility(): CompatibilityResult {
  const result: CompatibilityResult = {
    isSupported: true,
    issues: [],
    warnings: [],
    recommendations: [],
    score: 100
  };

  if (!isBrowser()) {
    result.isSupported = false;
    result.issues.push('Server-side rendering detected');
    result.score = 0;
    return result;
  }

  // Check critical requirements
  const requirements: Array<[keyof CameraCompatibility, () => boolean, string, number]> = [
    ['userMedia', isUserMediaSupported, 'Camera access (getUserMedia) not supported', 40],
    ['webgl', isWebGLSupported, 'WebGL not supported - AI processing will be slow', 20],
    ['canvas', () => !!safeCreateCanvas(), 'Canvas API not supported', 15],
    ['promises', () => typeof Promise !== 'undefined', 'Promise API not supported', 10],
    ['es6', () => {
      try {
        // Test basic ES6 features
        eval('() => {}; const x = {}; let y = 1;');
        return true;
      } catch {
        return false;
      }
    }, 'ES6 features not supported', 10],
    ['https', () => location.protocol === 'https:' || location.hostname === 'localhost', 'HTTPS required for camera access', 5]
  ];

  for (const [key, test, message, penalty] of requirements) {
    if (!test()) {
      if (key === 'userMedia' || key === 'canvas' || key === 'promises') {
        result.isSupported = false;
        result.issues.push(message);
      } else {
        result.warnings.push(message);
      }
      result.score -= penalty;
    }
  }

  // Browser-specific checks
  const browserInfo = getBrowserInfo();
  
  // Check known problematic browsers
  if (browserInfo.name === 'safari' && browserInfo.version < 14) {
    result.warnings.push('Safari version may have camera access issues');
    result.recommendations.push('Update to Safari 14+ for best experience');
    result.score -= 10;
  }
  
  if (browserInfo.name === 'firefox' && browserInfo.version < 70) {
    result.warnings.push('Firefox version may have performance issues');
    result.recommendations.push('Update to Firefox 70+ for best experience');
    result.score -= 5;
  }

  // Device-specific checks
  const deviceInfo = getDeviceInfo();
  
  if (deviceInfo && deviceInfo.deviceMemory && deviceInfo.deviceMemory < 2) {
    result.warnings.push('Low device memory detected - performance may be affected');
    result.recommendations.push('Close other tabs to improve performance');
    result.score -= 10;
  }

  if (deviceInfo && deviceInfo.hardwareConcurrency && deviceInfo.hardwareConcurrency < 2) {
    result.warnings.push('Limited CPU cores - processing may be slow');
    result.score -= 5;
  }

  // Network checks
  const connection = getNetworkInfo();
  if (connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) {
    result.warnings.push('Slow network connection detected');
    result.recommendations.push('Connect to faster network for better model loading');
    result.score -= 5;
  }

  // Generate final recommendations
  if (result.score < 70) {
    result.recommendations.push('Consider using image upload instead of real-time detection');
  }

  if (result.score < 50) {
    result.recommendations.push('Switch to a more modern browser for better experience');
  }

  result.score = Math.max(0, Math.min(100, result.score));
  
  return result;
}

/**
 * Get detailed browser information
 */
export function getBrowserInfo(): {
  name: string;
  version: number;
  engine: string;
  platform: string;
} {
  if (!isBrowser()) {
    return { name: 'unknown', version: 0, engine: 'unknown', platform: 'unknown' };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  let name = 'unknown';
  let version = 0;
  let engine = 'unknown';
  
  // Detect browser
  if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
    name = 'chrome';
    const match = userAgent.match(/chrome\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
    engine = 'blink';
  } else if (userAgent.includes('firefox')) {
    name = 'firefox';
    const match = userAgent.match(/firefox\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
    engine = 'gecko';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    name = 'safari';
    const match = userAgent.match(/version\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
    engine = 'webkit';
  } else if (userAgent.includes('edge')) {
    name = 'edge';
    const match = userAgent.match(/edge\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
    engine = 'blink';
  }
  
  return {
    name,
    version,
    engine,
    platform: navigator.platform.toLowerCase()
  };
}

/**
 * Get network connection information
 */
export function getNetworkInfo(): {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
} {
  if (!isBrowser()) {
    return { online: false };
  }

  const result = { online: navigator.onLine };
  
  // Get connection info if available
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  if (connection) {
    return {
      ...result,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    };
  }
  
  return result;
}

/**
 * Check if device supports hardware acceleration
 */
export function isHardwareAccelerated(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const canvas = safeCreateCanvas();
    if (!canvas) return false;
    
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return true; // Assume yes if we can't detect
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    // Check for software rendering indicators
    if (renderer.toLowerCase().includes('software') || 
        renderer.toLowerCase().includes('swiftshader') ||
        renderer.toLowerCase().includes('llvmpipe')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get optimal camera constraints based on device capabilities
 */
export function getOptimalCameraConstraints(): MediaStreamConstraints {
  const deviceInfo = getDeviceInfo();
  const browserInfo = getBrowserInfo();
  const compatibility = checkCameraCompatibility();
  
  // Base constraints
  let constraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: 'environment' }
    }
  };
  
  // Adjust based on device capabilities
  if (compatibility.score > 80 && deviceInfo && deviceInfo.deviceMemory && deviceInfo.deviceMemory >= 4) {
    // High-end device
    constraints.video = {
      ...(constraints.video as object),
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    };
  } else if (compatibility.score > 60) {
    // Mid-range device
    constraints.video = {
      ...(constraints.video as object),
      width: { ideal: 960, max: 1280 },
      height: { ideal: 540, max: 720 },
      frameRate: { ideal: 24, max: 30 }
    };
  } else {
    // Low-end device
    constraints.video = {
      ...(constraints.video as object),
      width: { ideal: 640, max: 800 },
      height: { ideal: 480, max: 600 },
      frameRate: { ideal: 15, max: 24 }
    };
  }
  
  // Browser-specific adjustments
  if (browserInfo.name === 'safari') {
    // Safari sometimes has issues with frameRate constraints
    delete (constraints.video as any).frameRate;
  }
  
  return constraints;
}

/**
 * Get camera device preferences based on browser
 */
export function getCameraDevicePreferences(): {
  preferredFacingMode: string;
  fallbackConstraints: MediaStreamConstraints[];
} {
  const browserInfo = getBrowserInfo();
  
  let preferredFacingMode = 'environment'; // Default to rear camera
  
  // Desktop browsers typically don't have rear cameras
  if (!isDeviceMobile()) {
    preferredFacingMode = 'user';
  }
  
  const fallbackConstraints: MediaStreamConstraints[] = [
    // Try environment (rear) camera first
    {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    },
    // Fall back to user (front) camera
    {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    },
    // Basic constraints without facing mode
    {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    },
    // Minimal constraints
    { video: true }
  ];
  
  return {
    preferredFacingMode,
    fallbackConstraints
  };
}

/**
 * Check if device is mobile
 */
export function isDeviceMobile(): boolean {
  if (!isBrowser()) return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

/**
 * Performance testing for camera operations
 */
export async function testCameraPerformance(): Promise<{
  streamInitTime: number;
  frameRate: number;
  supported: boolean;
  errors: string[];
}> {
  const result = {
    streamInitTime: 0,
    frameRate: 0,
    supported: false,
    errors: [] as string[]
  };
  
  if (!isBrowser() || !isUserMediaSupported()) {
    result.errors.push('Camera not supported');
    return result;
  }
  
  try {
    const startTime = performance.now();
    
    // Test basic camera access
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    result.streamInitTime = performance.now() - startTime;
    result.supported = true;
    
    // Test frame rate by creating a video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    // Measure frame rate for 1 second
    let frameCount = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const measureFrames = () => {
        ctx.drawImage(video, 0, 0);
        frameCount++;
      };
      
      const interval = setInterval(measureFrames, 16); // ~60fps max
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(interval);
      
      result.frameRate = frameCount;
    }
    
    // Clean up
    stream.getTracks().forEach(track => track.stop());
    
  } catch (error) {
    result.errors.push(`Performance test failed: ${error}`);
  }
  
  return result;
} 