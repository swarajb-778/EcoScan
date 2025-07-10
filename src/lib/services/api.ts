/**
 * API Service for EcoScan Backend Integration
 * High-performance object detection and waste classification via Python FastAPI
 */

import { isBrowser } from '../utils/browser.js';
import type { Detection } from '../types/index.js';

export interface DetectionRequest {
  image_data: string;
  confidence_threshold?: number;
  model_version?: string;
}

export interface DetectionResponse {
  success: boolean;
  detections: Detection[];
  processing_time: number;
  model_info: {
    name: string;
    version: string;
    backend: string;
  };
  recommendations: Array<{
    category: string;
    tip: string;
    environmental_impact: string;
  }>;
}

export interface OptimizationRequest {
  device_info: {
    cpuCores: number;
    deviceMemory: number;
    platform: string;
    userAgent: string;
  };
  performance_metrics: {
    averageInferenceTime: number;
    fps: number;
    memoryUsage: number;
  };
  preferred_quality: 'fast' | 'balanced' | 'accurate';
}

export interface OptimizationResponse {
  optimized_config: {
    resolution: { width: number; height: number };
    confidence_threshold: number;
    max_objects: number;
    enable_quantization: boolean;
  };
  expected_performance: {
    estimated_fps: number;
    memory_usage: number;
    inference_time: number;
  };
  recommendations: string[];
}

class EcoScanAPI {
  private baseURL: string;
  private isAvailable: boolean = false;
  private healthCheckInterval?: number;

  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.checkHealth();
    this.startHealthMonitoring();
  }

  private async checkHealth(): Promise<void> {
    if (!isBrowser()) return;

    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);
      
      this.isAvailable = response.ok;
      console.log(`🚀 Backend API ${this.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
      this.isAvailable = false;
      console.warn('⚠️  Backend API not available, using frontend-only processing');
    }
  }

  private startHealthMonitoring(): void {
    if (!isBrowser()) return;

    this.healthCheckInterval = window.setInterval(() => {
      this.checkHealth();
    }, 30000); // Check every 30 seconds
  }

  public isBackendAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Detect waste objects using the high-performance Python backend
   */
  async detectWaste(imageData: string, options: {
    confidenceThreshold?: number;
    modelVersion?: string;
  } = {}): Promise<DetectionResponse> {
    if (!this.isAvailable) {
      throw new Error('Backend API not available');
    }

    const request: DetectionRequest = {
      image_data: imageData,
      confidence_threshold: options.confidenceThreshold || 0.5,
      model_version: options.modelVersion || 'latest'
    };

    try {
      const response = await fetch(`${this.baseURL}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Backend detection failed: ${response.status} ${response.statusText}`);
      }

      const result: DetectionResponse = await response.json();
      
      console.log(`🤖 Backend detected ${result.detections.length} objects in ${result.processing_time.toFixed(0)}ms`);
      
      return result;
    } catch (error) {
      console.error('❌ Backend detection error:', error);
      this.isAvailable = false; // Mark as unavailable on error
      throw error;
    }
  }

  /**
   * Get optimized configuration for current device
   */
  async getOptimizedConfig(deviceInfo: any, performanceMetrics: any, quality: 'fast' | 'balanced' | 'accurate' = 'balanced'): Promise<OptimizationResponse> {
    if (!this.isAvailable) {
      throw new Error('Backend API not available');
    }

    const request: OptimizationRequest = {
      device_info: deviceInfo,
      performance_metrics: performanceMetrics,
      preferred_quality: quality
    };

    try {
      const response = await fetch(`${this.baseURL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Optimization request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Optimization request error:', error);
      throw error;
    }
  }

  /**
   * Submit feedback for model improvement
   */
  async submitFeedback(detectionId: string, correction: string, confidence: number, wasHelpful: boolean): Promise<void> {
    if (!this.isAvailable) return; // Silent fail for feedback

    try {
      await fetch(`${this.baseURL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detection_id: detectionId,
          user_correction: correction,
          confidence_rating: confidence,
          was_helpful: wasHelpful
        }),
      });
    } catch (error) {
      console.warn('⚠️  Feedback submission failed:', error);
    }
  }

  /**
   * Get environmental impact data for a specific item
   */
  async getEnvironmentalImpact(itemType: string): Promise<any> {
    if (!this.isAvailable) {
      throw new Error('Backend API not available');
    }

    try {
      const response = await fetch(`${this.baseURL}/environmental-impact/${encodeURIComponent(itemType)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get environmental impact: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Environmental impact request error:', error);
      throw error;
    }
  }

  /**
   * Convert ImageData to base64 for API transmission
   */
  static imageDataToBase64(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]; // Remove data:image/jpeg;base64, prefix
  }

  /**
   * Convert canvas to base64 for API transmission
   */
  static canvasToBase64(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  }

  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Singleton instance
export const ecoScanAPI = new EcoScanAPI();

// Hybrid Detection Strategy
export class HybridDetector {
  private frontendDetector: any; // Will be injected
  private useBackend: boolean = false;

  constructor(frontendDetector: any) {
    this.frontendDetector = frontendDetector;
    this.evaluateBackendAvailability();
  }

  private async evaluateBackendAvailability(): Promise<void> {
    this.useBackend = ecoScanAPI.isBackendAvailable();
    
    if (this.useBackend) {
      console.log('🚀 Using high-performance Python backend for object detection');
    } else {
      console.log('💻 Using frontend-only detection (ONNX Runtime)');
    }
  }

  /**
   * Intelligent detection routing - uses backend when available for best performance
   */
  async detect(imageData: ImageData): Promise<Detection[]> {
    // Always check backend availability for each detection
    this.useBackend = ecoScanAPI.isBackendAvailable();

    if (this.useBackend) {
      try {
        // Convert ImageData to base64
        const base64Image = EcoScanAPI.imageDataToBase64(imageData);
        
        // Use high-performance backend
        const result = await ecoScanAPI.detectWaste(base64Image, {
          confidenceThreshold: 0.4
        });
        
        return result.detections;
      } catch (error) {
        console.warn('🔄 Backend detection failed, falling back to frontend:', error);
        this.useBackend = false;
        // Fall through to frontend detection
      }
    }

    // Use frontend detection as fallback
    if (this.frontendDetector && this.frontendDetector.detect) {
      return await this.frontendDetector.detect(imageData);
    }

    // Last resort: return empty array
    console.warn('⚠️  No detection method available');
    return [];
  }

  /**
   * Check if backend is preferred and available
   */
  isUsingBackend(): boolean {
    return this.useBackend && ecoScanAPI.isBackendAvailable();
  }

  /**
   * Force backend usage evaluation
   */
  async refreshBackendStatus(): Promise<void> {
    await this.evaluateBackendAvailability();
  }
}

export default ecoScanAPI; 