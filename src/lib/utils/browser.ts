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