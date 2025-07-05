/**
 * Analytics and monitoring utilities for EcoScan
 * Tracks performance metrics, user behavior, and system health
 */

import { config } from '$lib/config';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  sessionId?: string;
  userId?: string;
}

export interface PerformanceMetrics {
  // Core performance
  modelLoadTime: number;
  inferenceTime: number;
  frameRate: number;
  memoryUsage: number;
  
  // User interaction
  detectionCount: number;
  sessionDuration: number;
  errorCount: number;
  featureUsage: {
    camera: number;
    voice: number;
    upload: number;
  };
  
  // System health
  batteryLevel?: number;
  networkSpeed?: number;
  deviceType: string;
  browserInfo: string;
}

export interface UserBehaviorMetrics {
  // Engagement
  sessionCount: number;
  averageSessionTime: number;
  bounceRate: number;
  
  // Feature adoption
  voiceUsageRate: number;
  cameraUsageRate: number;
  uploadUsageRate: number;
  
  // Classification accuracy feedback
  userCorrections: number;
  confidenceRatings: number[];
  
  // Error patterns
  commonErrors: string[];
  errorRecoveryRate: number;
}

class AnalyticsManager {
  private sessionId: string;
  private userId: string;
  private startTime: number;
  private events: AnalyticsEvent[] = [];
  private metrics: Partial<PerformanceMetrics> = {};
  private isEnabled: boolean;
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.isEnabled = config.analytics.enabled;
    
    if (this.isEnabled) {
      this.initializeAnalytics();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let userId = localStorage.getItem('ecoscan-user-id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ecoscan-user-id', userId);
    }
    return userId;
  }

  private initializeAnalytics(): void {
    // Track page load performance
    this.trackPageLoad();
    
    // Set up automatic flushing
    this.startAutoFlush();
    
    // Track unload events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
      
      // Track visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.trackEvent('session_pause');
        } else {
          this.trackEvent('session_resume');
        }
      });
    }
  }

  private trackPageLoad(): void {
    if (typeof window === 'undefined') return;
    
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.trackEvent('page_load', {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        networkTime: navigation.responseEnd - navigation.requestStart,
        renderTime: navigation.loadEventEnd - navigation.responseEnd
      });
    }
  }

  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Track a custom event
   */
  trackEvent(name: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.pathname : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      },
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now()
    };

    this.events.push(event);
    
    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit = 'ms'): void {
    this.trackEvent('performance_metric', {
      metric,
      value,
      unit,
      timestamp: Date.now()
    });

         // Store for aggregation
     (this.metrics as Record<string, any>)[metric] = value;
  }

  /**
   * Track model inference performance
   */
  trackInference(inferenceTime: number, objectsDetected: number, confidence: number): void {
    this.trackEvent('ml_inference', {
      inferenceTime,
      objectsDetected,
      averageConfidence: confidence,
      timestamp: Date.now()
    });
  }

  /**
   * Track user interaction with detection results
   */
  trackDetectionInteraction(detection: {
    class: string;
    category: string;
    confidence: number;
    action: 'view' | 'share' | 'learn_more' | 'correct';
  }): void {
    this.trackEvent('detection_interaction', {
      objectClass: detection.class,
      category: detection.category,
      confidence: detection.confidence,
      action: detection.action
    });
  }

  /**
   * Track errors and exceptions
   */
  trackError(error: Error, context?: string, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      timestamp: Date.now()
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: 'camera' | 'voice' | 'upload' | 'qr_code', action: 'start' | 'success' | 'error'): void {
    this.trackEvent('feature_usage', {
      feature,
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Track system information
   */
  trackSystemInfo(): void {
    if (typeof window === 'undefined') return;

    const systemInfo = {
      // Device info
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      
      // Screen info
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      
      // Browser capabilities
      webglSupported: this.checkWebGLSupport(),
      webrtcSupported: this.checkWebRTCSupport(),
      speechSupported: this.checkSpeechSupport(),
      
      // Performance info
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      
      // Battery info (if available)
      ...(this.getBatteryInfo())
    };

    this.trackEvent('system_info', systemInfo);
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private checkWebRTCSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private checkSpeechSupport(): boolean {
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  private getBatteryInfo(): Record<string, any> {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.trackEvent('battery_info', {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        });
      });
    }
    return {};
  }

  /**
   * Get current session metrics
   */
  getSessionMetrics(): PerformanceMetrics {
    const sessionDuration = Date.now() - this.startTime;
    
    return {
      modelLoadTime: this.metrics.modelLoadTime || 0,
      inferenceTime: this.metrics.inferenceTime || 0,
      frameRate: this.metrics.frameRate || 0,
      memoryUsage: this.getMemoryUsage(),
      detectionCount: this.getEventCount('ml_inference'),
      sessionDuration,
      errorCount: this.getEventCount('error'),
      featureUsage: {
        camera: this.getFeatureUsageCount('camera'),
        voice: this.getFeatureUsageCount('voice'),
        upload: this.getFeatureUsageCount('upload')
      },
      deviceType: this.getDeviceType(),
      browserInfo: navigator.userAgent
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private getEventCount(eventName: string): number {
    return this.events.filter(event => event.name === eventName).length;
  }

  private getFeatureUsageCount(feature: string): number {
    return this.events.filter(event => 
      event.name === 'feature_usage' && 
      event.properties?.feature === feature &&
      event.properties?.action === 'success'
    ).length;
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    const hasTouch = 'ontouchstart' in window;
    
    if (width <= 768 || hasTouch && width <= 1024) return 'mobile';
    if (hasTouch && width > 768 && width <= 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Flush events to storage/analytics service
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      // Store locally for development
      await this.storeLocally(eventsToFlush);
      
      // Send to analytics service (placeholder)
      if (config.analytics.analyticsId) {
        await this.sendToAnalyticsService(eventsToFlush);
      }
    } catch (error) {
      console.warn('Failed to flush analytics:', error);
      // Put events back if failed
      this.events.unshift(...eventsToFlush);
    }
  }

  private async storeLocally(events: AnalyticsEvent[]): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const existingData = JSON.parse(localStorage.getItem('ecoscan-analytics') || '[]');
      const allEvents = [...existingData, ...events];
      
      // Keep only last 1000 events
      const recentEvents = allEvents.slice(-1000);
      
      localStorage.setItem('ecoscan-analytics', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to store analytics locally:', error);
    }
  }

  private async sendToAnalyticsService(events: AnalyticsEvent[]): Promise<void> {
    // Placeholder for real analytics service integration
    // In production, this would send to Google Analytics, Mixpanel, etc.
    
    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      events,
      timestamp: Date.now()
    };

    // Example: Send to custom analytics endpoint
    if (config.api.baseUrl) {
      try {
        await fetch(`${config.api.baseUrl}/analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.warn('Failed to send to analytics service:', error);
      }
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  getAnalyticsSummary(): {
    totalEvents: number;
    sessionDuration: number;
    topEvents: Array<{ name: string; count: number }>;
    errorRate: number;
    performanceScore: number;
  } {
    const totalEvents = this.events.length;
    const sessionDuration = Date.now() - this.startTime;
    const errorCount = this.getEventCount('error');
    
    // Calculate top events
    const eventCounts = this.events.reduce((acc, event) => {
      acc[event.name] = (acc[event.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topEvents = Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Calculate performance score (0-100)
    const metrics = this.getSessionMetrics();
    const performanceScore = this.calculatePerformanceScore(metrics);
    
    return {
      totalEvents,
      sessionDuration,
      topEvents,
      errorRate: totalEvents > 0 ? errorCount / totalEvents : 0,
      performanceScore
    };
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Penalize slow model loading (target: <5s)
    if (metrics.modelLoadTime > 5000) {
      score -= Math.min(30, (metrics.modelLoadTime - 5000) / 1000 * 5);
    }
    
    // Penalize slow inference (target: <100ms)
    if (metrics.inferenceTime > 100) {
      score -= Math.min(25, (metrics.inferenceTime - 100) / 10);
    }
    
    // Penalize low frame rate (target: >15 FPS)
    if (metrics.frameRate < 15) {
      score -= Math.min(20, (15 - metrics.frameRate) * 2);
    }
    
    // Penalize high memory usage (target: <200MB)
    if (metrics.memoryUsage > 200) {
      score -= Math.min(15, (metrics.memoryUsage - 200) / 50 * 5);
    }
    
    // Penalize errors
    score -= Math.min(10, metrics.errorCount * 2);
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Export analytics data for analysis
   */
  exportData(): {
    session: {
      id: string;
      userId: string;
      startTime: number;
      duration: number;
    };
    events: AnalyticsEvent[];
    metrics: PerformanceMetrics;
    summary: ReturnType<typeof this.getAnalyticsSummary>;
  } {
    return {
      session: {
        id: this.sessionId,
        userId: this.userId,
        startTime: this.startTime,
        duration: Date.now() - this.startTime
      },
      events: this.events,
      metrics: this.getSessionMetrics(),
      summary: this.getAnalyticsSummary()
    };
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.events = [];
    this.metrics = {};
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ecoscan-analytics');
    }
  }

  /**
   * Destroy analytics manager
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Global analytics instance
export const analytics = new AnalyticsManager();

// Convenience functions
export const trackEvent = (name: string, properties?: Record<string, any>) => 
  analytics.trackEvent(name, properties);

export const trackPerformance = (metric: string, value: number, unit = 'ms') => 
  analytics.trackPerformance(metric, value, unit);

export const trackError = (error: Error, context?: string, severity: 'low' | 'medium' | 'high' = 'medium') => 
  analytics.trackError(error, context, severity);

export const trackFeatureUsage = (feature: 'camera' | 'voice' | 'upload' | 'qr_code', action: 'start' | 'success' | 'error') => 
  analytics.trackFeatureUsage(feature, action);

export const getSessionMetrics = () => analytics.getSessionMetrics();

export const getAnalyticsSummary = () => analytics.getAnalyticsSummary();

/**
 * Initialize analytics tracking
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Track initial system info
  analytics.trackSystemInfo();
  
  // Track app initialization
  analytics.trackEvent('app_init', {
    version: config.app.version,
    timestamp: Date.now()
  });
  
  // Set up error tracking
  window.addEventListener('error', (event) => {
    analytics.trackError(event.error, 'global_error_handler');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    analytics.trackError(new Error(event.reason), 'unhandled_promise_rejection');
  });
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private measurements: Map<string, number> = new Map();
  
  startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
  }
  
  endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.measurements.delete(name);
    
    // Track the performance metric
    trackPerformance(name, duration);
    
    return duration;
  }
  
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => {
      this.endMeasurement(name);
    });
  }
  
  measureSync<T>(name: string, fn: () => T): T {
    this.startMeasurement(name);
    try {
      return fn();
    } finally {
      this.endMeasurement(name);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor(); 