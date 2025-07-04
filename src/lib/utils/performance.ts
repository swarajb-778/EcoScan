/**
 * Performance monitoring utilities for EcoScan
 * Tracks model loading, inference times, and user interactions
 */

export interface PerformanceMetrics {
  modelLoadTime?: number;
  averageInferenceTime: number;
  frameRate: number;
  memoryUsage?: number;
  errorCount: number;
  sessionStartTime: number;
  detectionsCount: number;
}

export interface DetectionMetrics {
  timestamp: number;
  inferenceTime: number;
  objectsDetected: number;
  confidence: number;
  category: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private detections: DetectionMetrics[] = [];
  private frameTimestamps: number[] = [];
  private inferenceTimestamps: number[] = [];

  constructor() {
    this.metrics = {
      averageInferenceTime: 0,
      frameRate: 0,
      errorCount: 0,
      sessionStartTime: performance.now(),
      detectionsCount: 0
    };

    // Monitor memory usage if available
    if ('memory' in performance) {
      this.trackMemoryUsage();
    }
  }

  /**
   * Record model loading time
   */
  recordModelLoadTime(startTime: number, endTime: number): void {
    this.metrics.modelLoadTime = endTime - startTime;
    console.log(`🤖 Model loaded in ${this.metrics.modelLoadTime.toFixed(2)}ms`);
  }

  /**
   * Record inference timing
   */
  recordInference(startTime: number, endTime: number, objectsCount = 0): void {
    const inferenceTime = endTime - startTime;
    this.inferenceTimestamps.push(inferenceTime);
    
    // Keep only last 100 measurements for rolling average
    if (this.inferenceTimestamps.length > 100) {
      this.inferenceTimestamps.shift();
    }
    
    this.metrics.averageInferenceTime = 
      this.inferenceTimestamps.reduce((a, b) => a + b, 0) / this.inferenceTimestamps.length;
    
    this.detections.push({
      timestamp: Date.now(),
      inferenceTime,
      objectsDetected: objectsCount,
      confidence: 0,
      category: 'detection'
    });
  }

  /**
   * Record frame rate
   */
  recordFrame(): void {
    const now = performance.now();
    this.frameTimestamps.push(now);
    
    // Keep only last second of frames
    const oneSecondAgo = now - 1000;
    this.frameTimestamps = this.frameTimestamps.filter(t => t > oneSecondAgo);
    
    this.metrics.frameRate = this.frameTimestamps.length;
  }

  /**
   * Record detection event
   */
  recordDetection(category: string, confidence: number): void {
    this.metrics.detectionsCount++;
    
    const lastDetection = this.detections[this.detections.length - 1];
    if (lastDetection) {
      lastDetection.confidence = confidence;
      lastDetection.category = category;
    }
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: string): void {
    this.metrics.errorCount++;
    console.error(`❌ Error in ${context || 'app'}:`, error);
    
    // Send to analytics if available
    this.sendErrorToAnalytics(error, context);
  }

  /**
   * Get current performance summary
   */
  getMetrics(): PerformanceMetrics & { recentDetections: DetectionMetrics[] } {
    return {
      ...this.metrics,
      recentDetections: this.detections.slice(-10) // Last 10 detections
    };
  }

  /**
   * Get formatted performance string for display
   */
  getDisplayMetrics(): string {
    const {
      modelLoadTime,
      averageInferenceTime,
      frameRate,
      detectionsCount
    } = this.metrics;

    const parts = [];
    
    if (modelLoadTime) {
      parts.push(`Model: ${modelLoadTime.toFixed(0)}ms`);
    }
    
    parts.push(`Inference: ${averageInferenceTime.toFixed(0)}ms`);
    parts.push(`FPS: ${frameRate}`);
    parts.push(`Detections: ${detectionsCount}`);

    return parts.join(' | ');
  }

  /**
   * Reset metrics (for new session)
   */
  reset(): void {
    this.metrics = {
      averageInferenceTime: 0,
      frameRate: 0,
      errorCount: 0,
      sessionStartTime: performance.now(),
      detectionsCount: 0
    };
    this.detections = [];
    this.frameTimestamps = [];
    this.inferenceTimestamps = [];
  }

  /**
   * Track memory usage periodically
   */
  private trackMemoryUsage(): void {
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }
    };

    updateMemory();
    setInterval(updateMemory, 5000); // Update every 5 seconds
  }

  /**
   * Send error to analytics (placeholder)
   */
  private sendErrorToAnalytics(error: Error, context?: string): void {
    // In a real app, send to analytics service
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, just store in localStorage for development
    try {
      const errors = JSON.parse(localStorage.getItem('ecoscan-errors') || '[]');
      errors.push(errorData);
      
      // Keep only last 10 errors
      if (errors.length > 10) {
        errors.splice(0, errors.length - 10);
      }
      
      localStorage.setItem('ecoscan-errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error data:', e);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Simple timer utility for measuring execution time
 */
export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Get elapsed time since timer creation
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Reset timer
   */
  reset(): void {
    this.startTime = performance.now();
  }

  /**
   * Log elapsed time with optional label
   */
  log(label = 'Timer'): number {
    const elapsed = this.elapsed();
    console.log(`⏱️ ${label}: ${elapsed.toFixed(2)}ms`);
    return elapsed;
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if device is low-powered (for optimization)
 */
export function isLowPowerDevice(): boolean {
  // Check for low-end device indicators
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;
  const memoryGB = (navigator as any).deviceMemory || 2;
  
  return (
    hardwareConcurrency <= 2 ||
    memoryGB <= 2 ||
    /Android.*Chrome\/[0-6]/.test(navigator.userAgent)
  );
}

/**
 * Get optimal inference settings based on device capability
 */
export function getOptimalSettings() {
  const isLowPower = isLowPowerDevice();
  
  return {
    modelInputSize: isLowPower ? 416 : 640,
    maxFPS: isLowPower ? 10 : 30,
    confidenceThreshold: isLowPower ? 0.6 : 0.5,
    enableGPUAcceleration: !isLowPower
  };
} 