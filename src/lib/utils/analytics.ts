/**
 * Analytics and monitoring utilities for EcoScan
 * Tracks usage patterns, performance metrics, and user interactions
 */

import { config } from '$lib/config';

export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  data: Record<string, any>;
  session: string;
  category: 'detection' | 'interaction' | 'performance' | 'error';
}

export interface UsageMetrics {
  totalDetections: number;
  successfulDetections: number;
  averageConfidence: number;
  categoryCounts: Record<string, number>;
  sessionDuration: number;
  featureUsage: Record<string, number>;
}

export interface PerformanceData {
  modelLoadTime: number;
  averageInferenceTime: number;
  frameRate: number;
  memoryUsage: number;
  errorRate: number;
  cacheHitRate: number;
}

export interface UserInteraction {
  type: 'click' | 'tap' | 'voice' | 'upload' | 'navigation';
  target: string;
  timestamp: number;
  duration?: number;
  result?: 'success' | 'error' | 'cancelled';
}

/**
 * Analytics manager class
 */
export class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStart: number;
  private metrics: UsageMetrics;
  private performance: PerformanceData;
  private interactions: UserInteraction[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.metrics = this.initializeMetrics();
    this.performance = this.initializePerformance();
    this.setupPerformanceMonitoring();
  }

  private generateSessionId(): string {
    return `ecoscan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): UsageMetrics {
    return {
      totalDetections: 0,
      successfulDetections: 0,
      averageConfidence: 0,
      categoryCounts: {},
      sessionDuration: 0,
      featureUsage: {
        camera: 0,
        upload: 0,
        voice: 0
      }
    };
  }

  private initializePerformance(): PerformanceData {
    return {
      modelLoadTime: 0,
      averageInferenceTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      errorRate: 0,
      cacheHitRate: 0
    };
  }

  private setupPerformanceMonitoring(): void {
    // Monitor memory usage if available
    if ('memory' in performance) {
      setInterval(() => {
        this.updateMemoryUsage();
      }, 5000);
    }

    // Monitor errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason
      });
    });
  }

  /**
   * Track a detection event
   */
  trackDetection(detection: {
    item: string;
    category: string;
    confidence: number;
    method: 'camera' | 'upload' | 'voice';
    processingTime: number;
  }): void {
    this.metrics.totalDetections++;
    this.metrics.featureUsage[detection.method]++;

    if (detection.confidence >= 0.5) {
      this.metrics.successfulDetections++;
    }

    // Update category counts
    this.metrics.categoryCounts[detection.category] = 
      (this.metrics.categoryCounts[detection.category] || 0) + 1;

    // Update average confidence
    this.updateAverageConfidence(detection.confidence);

    // Record performance
    this.performance.averageInferenceTime = this.updateMovingAverage(
      this.performance.averageInferenceTime,
      detection.processingTime,
      this.metrics.totalDetections
    );

    this.trackEvent({
      name: 'detection',
      category: 'detection',
      data: {
        item: detection.item,
        category: detection.category,
        confidence: detection.confidence,
        method: detection.method,
        processingTime: detection.processingTime
      }
    });
  }

  /**
   * Track user interaction
   */
  trackInteraction(interaction: Omit<UserInteraction, 'timestamp'>): void {
    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: Date.now()
    };

    this.interactions.push(fullInteraction);

    this.trackEvent({
      name: 'interaction',
      category: 'interaction',
      data: fullInteraction
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: {
    name: string;
    value: number;
    unit?: string;
    context?: Record<string, any>;
  }): void {
    // Update internal performance data
    switch (metric.name) {
      case 'modelLoadTime':
        this.performance.modelLoadTime = metric.value;
        break;
      case 'frameRate':
        this.performance.frameRate = metric.value;
        break;
      case 'cacheHit':
        this.updateCacheHitRate(true);
        break;
      case 'cacheMiss':
        this.updateCacheHitRate(false);
        break;
    }

    this.trackEvent({
      name: 'performance',
      category: 'performance',
      data: {
        metric: metric.name,
        value: metric.value,
        unit: metric.unit,
        context: metric.context
      }
    });
  }

  /**
   * Track error
   */
  trackError(error: {
    message: string;
    source?: string;
    line?: number;
    column?: number;
    stack?: string;
    context?: Record<string, any>;
    [key: string]: any;
  }): void {
    this.performance.errorRate = this.updateMovingAverage(
      this.performance.errorRate,
      1,
      this.events.filter(e => e.category === 'error').length + 1
    );

    this.trackEvent({
      name: 'error',
      category: 'error',
      data: error
    });
  }

  /**
   * Track general event
   */
  trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'session'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      session: this.sessionId
    };

    this.events.push(fullEvent);

    // Only send to external analytics if enabled and configured
    if (config.analytics.enabled && config.analytics.analyticsId) {
      this.sendToExternalAnalytics(fullEvent);
    }

    // Keep only recent events to prevent memory bloat
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): UsageMetrics {
    this.metrics.sessionDuration = Date.now() - this.sessionStart;
    return { ...this.metrics };
  }

  /**
   * Get performance data
   */
  getPerformance(): PerformanceData {
    return { ...this.performance };
  }

  /**
   * Get recent events
   */
  getEvents(limit: number = 100): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    sessionId: string;
    duration: number;
    metrics: UsageMetrics;
    performance: PerformanceData;
    topInteractions: Array<{ type: string; count: number }>;
    errorCount: number;
  } {
    const duration = Date.now() - this.sessionStart;
    
    // Count interaction types
    const interactionCounts = this.interactions.reduce((acc, interaction) => {
      acc[interaction.type] = (acc[interaction.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topInteractions = Object.entries(interactionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const errorCount = this.events.filter(e => e.category === 'error').length;

    return {
      sessionId: this.sessionId,
      duration,
      metrics: this.getMetrics(),
      performance: this.getPerformance(),
      topInteractions,
      errorCount
    };
  }

  /**
   * Export data for analysis
   */
  exportData(): {
    session: string;
    events: AnalyticsEvent[];
    metrics: UsageMetrics;
    performance: PerformanceData;
    interactions: UserInteraction[];
    summary: ReturnType<AnalyticsManager['getSessionSummary']>;
  } {
    return {
      session: this.sessionId,
      events: [...this.events],
      metrics: this.getMetrics(),
      performance: this.getPerformance(),
      interactions: [...this.interactions],
      summary: this.getSessionSummary()
    };
  }

  private updateAverageConfidence(newConfidence: number): void {
    const total = this.metrics.totalDetections;
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (total - 1) + newConfidence) / total;
  }

  private updateMovingAverage(current: number, newValue: number, count: number): number {
    return (current * (count - 1) + newValue) / count;
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.performance.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }
  }

  private updateCacheHitRate(hit: boolean): void {
    const cacheEvents = this.events.filter(e => 
      e.name === 'performance' && 
      (e.data.metric === 'cacheHit' || e.data.metric === 'cacheMiss')
    );
    
    const hits = cacheEvents.filter(e => e.data.metric === 'cacheHit').length + (hit ? 1 : 0);
    const total = cacheEvents.length + 1;
    
    this.performance.cacheHitRate = hits / total;
  }

  private sendToExternalAnalytics(event: AnalyticsEvent): void {
    // This would integrate with Google Analytics, Mixpanel, etc.
    if (config.analytics.gtmId && typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', event.name, {
        event_category: event.category,
        event_label: JSON.stringify(event.data),
        session_id: event.session
      });
    }

    // Custom analytics endpoint
    if (config.analytics.analyticsId) {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(error => {
        console.warn('Failed to send analytics event:', error);
      });
    }
  }
}

/**
 * Global analytics instance
 */
export const analytics = new AnalyticsManager();

/**
 * Convenience functions for common tracking
 */
export const track = {
  detection: (data: Parameters<AnalyticsManager['trackDetection']>[0]) => 
    analytics.trackDetection(data),
  
  interaction: (data: Parameters<AnalyticsManager['trackInteraction']>[0]) => 
    analytics.trackInteraction(data),
  
  performance: (data: Parameters<AnalyticsManager['trackPerformance']>[0]) => 
    analytics.trackPerformance(data),
  
  error: (data: Parameters<AnalyticsManager['trackError']>[0]) => 
    analytics.trackError(data),

  pageView: (page: string) => 
    analytics.trackEvent({
      name: 'page_view',
      category: 'interaction',
      data: { page, timestamp: Date.now() }
    }),

  featureUsage: (feature: string, action: string) =>
    analytics.trackEvent({
      name: 'feature_usage',
      category: 'interaction',
      data: { feature, action }
    })
};

/**
 * Generate analytics report
 */
export function generateAnalyticsReport(): string {
  const summary = analytics.getSessionSummary();
  const metrics = summary.metrics;
  const performance = summary.performance;

  const report = `
# EcoScan Analytics Report

## Session Information
- **Session ID**: ${summary.sessionId}
- **Duration**: ${Math.round(summary.duration / 1000)} seconds
- **Errors**: ${summary.errorCount}

## Usage Metrics
- **Total Detections**: ${metrics.totalDetections}
- **Successful Detections**: ${metrics.successfulDetections} (${metrics.totalDetections > 0 ? Math.round((metrics.successfulDetections / metrics.totalDetections) * 100) : 0}%)
- **Average Confidence**: ${Math.round(metrics.averageConfidence * 100)}%

### Detection Categories
${Object.entries(metrics.categoryCounts)
  .map(([category, count]) => `- **${category}**: ${count}`)
  .join('\n')}

### Feature Usage
${Object.entries(metrics.featureUsage)
  .map(([feature, count]) => `- **${feature}**: ${count} uses`)
  .join('\n')}

## Performance Metrics
- **Model Load Time**: ${Math.round(performance.modelLoadTime)}ms
- **Average Inference Time**: ${Math.round(performance.averageInferenceTime)}ms
- **Frame Rate**: ${Math.round(performance.frameRate)} FPS
- **Memory Usage**: ${Math.round(performance.memoryUsage)}MB
- **Cache Hit Rate**: ${Math.round(performance.cacheHitRate * 100)}%

## Top Interactions
${summary.topInteractions
  .map(interaction => `- **${interaction.type}**: ${interaction.count} times`)
  .join('\n')}

---
*Generated on ${new Date().toISOString()}*
`;

  return report.trim();
} 