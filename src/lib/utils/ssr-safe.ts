/**
 * SSR-Safe Utilities
 * Provides safe wrappers for client-side only operations
 */

import { browser } from '$app/environment';
import { diagnostic } from './diagnostic.js';

export interface SSRSafeWrapper<T> {
  value: T | null;
  isAvailable: boolean;
  error: string | null;
}

/**
 * Safely access navigator properties during SSR
 */
export function safeNavigator(): Navigator | null {
  if (!browser || typeof navigator === 'undefined') {
    return null;
  }
  return navigator;
}

/**
 * Safely access window properties during SSR
 */
export function safeWindow(): Window | null {
  if (!browser || typeof window === 'undefined') {
    return null;
  }
  return window;
}

/**
 * Safely access document properties during SSR
 */
export function safeDocument(): Document | null {
  if (!browser || typeof document === 'undefined') {
    return null;
  }
  return document;
}

/**
 * Safely get device memory with fallback
 */
export function getDeviceMemory(): number {
  const nav = safeNavigator() as any;
  if (!nav || typeof nav.deviceMemory !== 'number') {
    return 4; // Default fallback
  }
  return nav.deviceMemory;
}

/**
 * Safely get hardware concurrency with fallback
 */
export function getHardwareConcurrency(): number {
  const nav = safeNavigator();
  if (!nav || typeof nav.hardwareConcurrency !== 'number') {
    return 4; // Default fallback
  }
  return nav.hardwareConcurrency;
}

/**
 * Safely check for WebGL support
 */
export function isWebGLSupported(): boolean {
  const doc = safeDocument();
  if (!doc) return false;
  
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (error) {
    diagnostic.logWarning(`WebGL support check failed: ${error}`, 'SSR-Safe');
    return false;
  }
}

/**
 * Safely check for WebRTC support
 */
export function isWebRTCSupported(): boolean {
  const nav = safeNavigator();
  if (!nav) return false;
  
  return !!(nav.mediaDevices && nav.mediaDevices.getUserMedia);
}

/**
 * Safely initialize performance monitoring
 */
export function initializePerformanceMonitoring(): SSRSafeWrapper<PerformanceObserver> {
  if (!browser) {
    return {
      value: null,
      isAvailable: false,
      error: 'SSR environment'
    };
  }

  try {
    if (typeof PerformanceObserver === 'undefined') {
      return {
        value: null,
        isAvailable: false,
        error: 'PerformanceObserver not supported'
      };
    }

    const observer = new PerformanceObserver((list) => {
      // Performance observation logic will be handled by the caller
    });

    return {
      value: observer,
      isAvailable: true,
      error: null
    };
  } catch (error) {
    diagnostic.logError(`Performance monitoring initialization failed: ${error}`, 'SSR-Safe');
    return {
      value: null,
      isAvailable: false,
      error: String(error)
    };
  }
}

/**
 * Safely access thermal API
 */
export function getThermalAPI(): any | null {
  const nav = safeNavigator() as any;
  if (!nav) return null;
  
  return nav.deviceThermal || nav.thermal || null;
}

/**
 * Safely access battery API
 */
export async function getBatteryAPI(): Promise<any | null> {
  const nav = safeNavigator() as any;
  if (!nav) return null;
  
  try {
    if (nav.getBattery) {
      return await nav.getBattery();
    }
    return nav.battery || null;
  } catch (error) {
    diagnostic.logWarning(`Battery API access failed: ${error}`, 'SSR-Safe');
    return null;
  }
}

/**
 * Safely access connection API
 */
export function getConnectionAPI(): any | null {
  const nav = safeNavigator() as any;
  if (!nav) return null;
  
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

/**
 * Create an SSR-safe async operation wrapper
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  operationName: string
): Promise<T> {
  if (!browser) {
    diagnostic.logWarning(`Skipping ${operationName} during SSR`, 'SSR-Safe');
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    diagnostic.logError(`${operationName} failed: ${error}`, 'SSR-Safe');
    return fallback;
  }
}

/**
 * Create an SSR-safe sync operation wrapper
 */
export function safeSyncOperation<T>(
  operation: () => T,
  fallback: T,
  operationName: string
): T {
  if (!browser) {
    return fallback;
  }

  try {
    return operation();
  } catch (error) {
    diagnostic.logError(`${operationName} failed: ${error}`, 'SSR-Safe');
    return fallback;
  }
}

/**
 * Check if we're in a secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  if (!browser) return false;
  
  const win = safeWindow();
  if (!win || !win.location) return false;
  
  return win.isSecureContext || 
         win.location.protocol === 'https:' || 
         win.location.hostname === 'localhost' ||
         win.location.hostname === '127.0.0.1';
}

/**
 * Get user agent safely
 */
export function getUserAgent(): string {
  const nav = safeNavigator();
  return nav?.userAgent || 'Unknown';
}

/**
 * Get platform information safely
 */
export function getPlatform(): string {
  const nav = safeNavigator();
  return nav?.platform || 'Unknown';
}

/**
 * Initialize client-side only features
 */
export function initializeClientFeatures(callback: () => void): void {
  if (!browser) return;
  
  // Wait for DOM to be ready
  const doc = safeDocument();
  if (!doc) return;
  
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', callback);
  } else {
    // DOM is already ready
    callback();
  }
} 