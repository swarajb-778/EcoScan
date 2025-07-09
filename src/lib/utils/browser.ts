/**
 * Browser environment detection utilities
 * Provides safe ways to check browser APIs during SSR
 */

/**
 * Check if we're running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
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
  return isBrowser() ? document : null;
}

/**
 * Safely access window - returns null during SSR
 */
export function safeWindow(): Window | null {
  return isBrowser() ? window : null;
}

/**
 * Safely access navigator - returns null during SSR
 */
export function safeNavigator(): Navigator | null {
  return isBrowser() ? navigator : null;
}

/**
 * Check if WebGL is supported in current environment
 */
export function isWebGLSupported(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * Check if getUserMedia is supported
 */
export function isUserMediaSupported(): boolean {
  if (!isBrowser()) return false;
  
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check if Web Speech API is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  if (!isBrowser()) return false;
  
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Execute function only in browser environment
 */
export function browserOnly<T>(fn: () => T, fallback?: T): T | undefined {
  if (isBrowser()) {
    try {
      return fn();
    } catch (error) {
      console.warn('Browser-only function failed:', error);
      return fallback;
    }
  }
  return fallback;
}

/**
 * Get safe canvas element or null during SSR
 */
export function safeCreateCanvas(): HTMLCanvasElement | null {
  return browserOnly(() => document.createElement('canvas'), null);
} 