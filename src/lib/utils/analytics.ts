/**
 * Enhanced Analytics System for EcoScan
 * Comprehensive tracking, insights, and performance analytics
 */

import { browser } from '$app/environment';
import { diagnostic } from './diagnostic.js';

export interface AnalyticsEvent {
  id: string;
  name: string;
  category: 'user_interaction' | 'performance' | 'error' | 'ml_inference' | 'optimization' | 'system';
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  interactions: number;
  errors: number;
  mlInferences: number;
  avgInferenceTime: number;
  detectionAccuracy: number;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface PerformanceInsights {
  averageLoadTime: number;
  averageInferenceTime: number;
  errorRate: number;
  userEngagement: number;
  popularFeatures: Array<{ feature: string; usage: number }>;
  devicePerformance: Record<string, number>;
  optimizationImpact: number;
}

class EnhancedAnalyticsSystem {
  private events: AnalyticsEvent[] = [];
  private sessionMetrics: SessionMetrics;
  private isTracking = false;
  private sessionId: string;
  private startTime = Date.now();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionMetrics = this.initializeSessionMetrics();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSessionMetrics(): SessionMetrics {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      pageViews: 1,
      interactions: 0,
      errors: 0,
      mlInferences: 0,
      avgInferenceTime: 0,
      detectionAccuracy: 0,
      userAgent: browser ? navigator.userAgent : 'SSR',
      deviceType: this.detectDeviceType()
    };
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (!browser) return 'desktop';
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    
    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';
    return 'desktop';
  }

  startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    diagnostic.logWarning('Enhanced analytics tracking started', 'Analytics');
    
    // Track initial page load
    this.trackEvent('page_load', 'user_interaction', {
      loadTime: Date.now() - this.startTime,
      deviceType: this.sessionMetrics.deviceType,
      userAgent: this.sessionMetrics.userAgent
    });
  }

  stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.sessionMetrics.endTime = Date.now();
    this.sessionMetrics.duration = this.sessionMetrics.endTime - this.sessionMetrics.startTime;
    
    diagnostic.logWarning('Enhanced analytics tracking stopped', 'Analytics');
    
    // Track session end
    this.trackEvent('session_end', 'user_interaction', {
      duration: this.sessionMetrics.duration,
      interactions: this.sessionMetrics.interactions,
      errors: this.sessionMetrics.errors,
      mlInferences: this.sessionMetrics.mlInferences
    });
  }

  trackEvent(name: string, category: AnalyticsEvent['category'], properties: Record<string, any> = {}): void {
    if (!this.isTracking) return;

    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      properties: {
        ...properties,
        deviceType: this.sessionMetrics.deviceType,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.events.push(event);
    
    // Update session metrics
    this.updateSessionMetrics(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    diagnostic.logWarning(`Analytics event: ${name} (${category})`, 'Analytics');
  }

  private updateSessionMetrics(event: AnalyticsEvent): void {
    switch (event.category) {
      case 'user_interaction':
        this.sessionMetrics.interactions++;
        break;
      case 'error':
        this.sessionMetrics.errors++;
        break;
      case 'ml_inference':
        this.sessionMetrics.mlInferences++;
        if (event.properties.inferenceTime) {
          // Update average inference time
          const currentAvg = this.sessionMetrics.avgInferenceTime;
          const count = this.sessionMetrics.mlInferences;
          this.sessionMetrics.avgInferenceTime = 
            (currentAvg * (count - 1) + event.properties.inferenceTime) / count;
        }
        break;
    }
  }

  // Enhanced tracking methods
  trackMLInference(inferenceTime: number, detectionCount: number, confidence: number): void {
    this.trackEvent('ml_inference', 'ml_inference', {
      inferenceTime,
      detectionCount,
      confidence,
      modelType: 'yolov8n'
    });
  }

  trackUserInteraction(action: string, element: string, context?: Record<string, any>): void {
    this.trackEvent('user_interaction', 'user_interaction', {
      action,
      element,
      ...context
    });
  }

  trackError(error: string, context: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.trackEvent('error', 'error', {
      error,
      context,
      severity,
      userAgent: this.sessionMetrics.userAgent
    });
  }

  trackPerformance(metric: string, value: number, unit: string): void {
    this.trackEvent('performance_metric', 'performance', {
      metric,
      value,
      unit,
      deviceType: this.sessionMetrics.deviceType
    });
  }

  trackOptimization(action: string, profile: string, impact: Record<string, number>): void {
    this.trackEvent('optimization', 'optimization', {
      action,
      profile,
      impact,
      deviceType: this.sessionMetrics.deviceType
    });
  }

  // Analytics insights
  generateInsights(): PerformanceInsights {
    const performanceEvents = this.events.filter(e => e.category === 'performance');
    const mlEvents = this.events.filter(e => e.category === 'ml_inference');
    const errorEvents = this.events.filter(e => e.category === 'error');
    const interactionEvents = this.events.filter(e => e.category === 'user_interaction');

    // Calculate average load time
    const loadTimeEvents = performanceEvents.filter(e => e.name === 'page_load');
    const averageLoadTime = loadTimeEvents.length > 0
      ? loadTimeEvents.reduce((sum, e) => sum + (e.properties.loadTime || 0), 0) / loadTimeEvents.length
      : 0;

    // Calculate average inference time
    const averageInferenceTime = mlEvents.length > 0
      ? mlEvents.reduce((sum, e) => sum + (e.properties.inferenceTime || 0), 0) / mlEvents.length
      : 0;

    // Calculate error rate
    const totalEvents = this.events.length;
    const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0;

    // Calculate user engagement (interactions per minute)
    const sessionDuration = (Date.now() - this.sessionMetrics.startTime) / 60000; // minutes
    const userEngagement = sessionDuration > 0 ? this.sessionMetrics.interactions / sessionDuration : 0;

    // Popular features
    const featureUsage = new Map<string, number>();
    interactionEvents.forEach(event => {
      const feature = event.properties.element || event.name;
      featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
    });

    const popularFeatures = Array.from(featureUsage.entries())
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Device performance
    const devicePerformance: Record<string, number> = {};
    const deviceGroups = new Map<string, number[]>();
    
    mlEvents.forEach(event => {
      const deviceType = event.properties.deviceType || 'unknown';
      const inferenceTime = event.properties.inferenceTime;
      if (inferenceTime) {
        if (!deviceGroups.has(deviceType)) {
          deviceGroups.set(deviceType, []);
        }
        deviceGroups.get(deviceType)!.push(inferenceTime);
      }
    });

    deviceGroups.forEach((times, deviceType) => {
      devicePerformance[deviceType] = times.reduce((sum, time) => sum + time, 0) / times.length;
    });

    // Optimization impact
    const optimizationEvents = this.events.filter(e => e.category === 'optimization');
    const optimizationImpact = optimizationEvents.length > 0
      ? optimizationEvents.reduce((sum, e) => sum + (e.properties.impact?.performance || 0), 0) / optimizationEvents.length
      : 0;

    return {
      averageLoadTime,
      averageInferenceTime,
      errorRate,
      userEngagement,
      popularFeatures,
      devicePerformance,
      optimizationImpact
    };
  }

  getSessionMetrics(): SessionMetrics {
    return { ...this.sessionMetrics };
  }

  getEvents(category?: AnalyticsEvent['category'], limit?: number): AnalyticsEvent[] {
    let filteredEvents = category 
      ? this.events.filter(e => e.category === category)
      : this.events;
    
    if (limit) {
      filteredEvents = filteredEvents.slice(-limit);
    }
    
    return filteredEvents;
  }

  exportAnalyticsData(): any {
    return {
      sessionMetrics: this.sessionMetrics,
      insights: this.generateInsights(),
      recentEvents: this.events.slice(-100),
      summary: {
        totalEvents: this.events.length,
        sessionDuration: Date.now() - this.sessionMetrics.startTime,
        errorRate: this.sessionMetrics.errors / Math.max(1, this.events.length) * 100,
        avgInferenceTime: this.sessionMetrics.avgInferenceTime
      },
      timestamp: Date.now()
    };
  }

  clearAnalyticsData(): void {
    this.events = [];
    this.sessionMetrics = this.initializeSessionMetrics();
    diagnostic.logWarning('Analytics data cleared', 'Analytics');
  }
}

// Singleton instance
export const enhancedAnalytics = new EnhancedAnalyticsSystem();

// Auto-start tracking in browser environment
if (browser) {
  enhancedAnalytics.startTracking();
}