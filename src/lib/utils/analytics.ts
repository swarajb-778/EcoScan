/**
 * Advanced Analytics and Reporting System
 * Tracks user behavior, environmental impact, and system performance
 */

import { writable, derived } from 'svelte/store';
import { isBrowser } from './browser.js';
import type { Detection } from '../types/index.js';

export interface AnalyticsEvent {
  id: string;
  type: 'detection' | 'interaction' | 'performance' | 'error' | 'conversion';
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  events: number;
  detections: number;
  errors: number;
  browser: string;
  device: string;
  location?: {
    country?: string;
    city?: string;
  };
}

export interface ImpactMetrics {
  totalDetections: number;
  recycledItems: number;
  compostedItems: number;
  correctDisposals: number;
  estimatedCO2Saved: number;
  estimatedWasteDiverted: number;
  streakDays: number;
  weeklyProgress: number[];
  categoryBreakdown: Record<string, number>;
  timeOfDayAnalysis: Record<string, number>;
}

export interface PerformanceMetrics {
  averageDetectionTime: number;
  cameraInitTime: number;
  modelLoadTime: number;
  errorRate: number;
  crashCount: number;
  memoryUsage: number;
  batteryImpact: number;
  networkUsage: number;
}

export interface InsightData {
  insights: string[];
  recommendations: string[];
  trends: Array<{
    metric: string;
    change: number;
    direction: 'up' | 'down' | 'stable';
    significance: 'high' | 'medium' | 'low';
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: number;
    icon: string;
  }>;
}

// Analytics stores
export const analyticsEvents = writable<AnalyticsEvent[]>([]);
export const currentSession = writable<UserSession | null>(null);
export const impactMetrics = writable<ImpactMetrics>({
  totalDetections: 0,
  recycledItems: 0,
  compostedItems: 0,
  correctDisposals: 0,
  estimatedCO2Saved: 0,
  estimatedWasteDiverted: 0,
  streakDays: 0,
  weeklyProgress: [],
  categoryBreakdown: {},
  timeOfDayAnalysis: {}
});
export const performanceMetrics = writable<PerformanceMetrics>({
  averageDetectionTime: 0,
  cameraInitTime: 0,
  modelLoadTime: 0,
  errorRate: 0,
  crashCount: 0,
  memoryUsage: 0,
  batteryImpact: 0,
  networkUsage: 0
});

// Derived stores for insights
export const weeklyImpact = derived(impactMetrics, ($metrics) => {
  const thisWeek = $metrics.weeklyProgress.slice(-7);
  const lastWeek = $metrics.weeklyProgress.slice(-14, -7);
  
  const thisWeekTotal = thisWeek.reduce((sum, day) => sum + day, 0);
  const lastWeekTotal = lastWeek.reduce((sum, day) => sum + day, 0);
  
  return {
    thisWeek: thisWeekTotal,
    lastWeek: lastWeekTotal,
    change: lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0
  };
});

export const topCategories = derived(impactMetrics, ($metrics) => {
  return Object.entries($metrics.categoryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
});

/**
 * Advanced Analytics Engine
 */
export class AnalyticsEngine {
  private sessionId: string;
  private userId?: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number | null = null;
  private sessionStartTime: number;
  private pageViews = 0;
  private eventCount = 0;
  private detectionCount = 0;
  private errorCount = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    
    if (isBrowser()) {
      this.initialize();
    }
  }

  /**
   * Initialize analytics engine
   */
  private async initialize(): Promise<void> {
    try {
      console.log('📊 Initializing analytics engine...');
      
      // Load existing user ID or generate new one
      this.userId = this.getOrCreateUserId();
      
      // Start session tracking
      this.startSession();
      
      // Set up automatic event flushing
      this.startEventFlushing();
      
      // Set up page visibility tracking
      this.setupVisibilityTracking();
      
      // Set up error tracking
      this.setupErrorTracking();
      
      // Load historical data
      await this.loadHistoricalData();
      
      console.log('✅ Analytics engine initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize analytics:', error);
    }
  }

  /**
   * Track analytics event
   */
  track(
    type: AnalyticsEvent['type'],
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }
    };

    this.eventQueue.push(event);
    this.eventCount++;

    // Update reactive store
    analyticsEvents.update(events => [...events.slice(-100), event]); // Keep last 100 events

    console.log('📊 Analytics event tracked:', {
      type,
      category,
      action,
      label,
      value
    });

    // Special handling for certain event types
    if (type === 'detection') {
      this.detectionCount++;
      this.updateDetectionMetrics(event);
    } else if (type === 'error') {
      this.errorCount++;
    }
  }

  /**
   * Track detection event with environmental impact
   */
  trackDetection(detection: Detection, processingTime: number, method: 'camera' | 'upload' | 'voice' | 'text'): void {
    this.track('detection', 'waste_classification', 'item_detected', detection.label, detection.confidence, {
      category: detection.category,
      processingTime,
      method,
      bbox: detection.bbox,
      instructions: detection.instructions
    });

    // Update impact metrics
    this.updateImpactMetrics(detection);
  }

  /**
   * Track user interaction
   */
  trackInteraction(element: string, action: string, value?: number): void {
    this.track('interaction', 'user_engagement', action, element, value, {
      timestamp: Date.now(),
      pageUrl: window.location.pathname
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string): void {
    this.track('performance', 'app_performance', metric, unit, value, {
      timestamp: Date.now(),
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    });

    // Update performance metrics store
    this.updatePerformanceMetrics(metric, value);
  }

  /**
   * Track conversion events
   */
  trackConversion(goal: string, value?: number): void {
    this.track('conversion', 'goal_completion', goal, undefined, value, {
      timestamp: Date.now(),
      sessionDuration: Date.now() - this.sessionStartTime
    });
  }

  /**
   * Track error events
   */
  trackError(error: Error, context?: string): void {
    this.track('error', 'application_error', error.name, error.message, undefined, {
      stack: error.stack,
      context,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  /**
   * Update detection metrics
   */
  private updateDetectionMetrics(event: AnalyticsEvent): void {
    if (!event.metadata) return;

    const category = event.metadata.category;
    const hour = new Date().getHours();

    impactMetrics.update(metrics => {
      const updated = { ...metrics };
      
      updated.totalDetections++;
      
      if (category === 'recycle') {
        updated.recycledItems++;
        updated.estimatedCO2Saved += 2.3; // Average CO2 saved per recycled item
      } else if (category === 'compost') {
        updated.compostedItems++;
        updated.estimatedCO2Saved += 1.1; // Average CO2 saved per composted item
      }
      
      // Update category breakdown
      updated.categoryBreakdown[category] = (updated.categoryBreakdown[category] || 0) + 1;
      
      // Update time of day analysis
      const timeSlot = `${hour}:00`;
      updated.timeOfDayAnalysis[timeSlot] = (updated.timeOfDayAnalysis[timeSlot] || 0) + 1;
      
      // Update weekly progress
      const today = new Date().getDay();
      if (updated.weeklyProgress.length < 7) {
        updated.weeklyProgress = new Array(7).fill(0);
      }
      updated.weeklyProgress[today]++;
      
      return updated;
    });
  }

  /**
   * Update impact metrics based on detection
   */
  private updateImpactMetrics(detection: Detection): void {
    impactMetrics.update(metrics => {
      const updated = { ...metrics };
      
      // Calculate estimated waste diverted
      const wasteWeights = {
        'recycle': 0.5, // kg average
        'compost': 0.3,
        'trash': 0.2,
        'hazardous': 0.1
      };
      
      const weight = wasteWeights[detection.category as keyof typeof wasteWeights] || 0.2;
      updated.estimatedWasteDiverted += weight;
      
      // Update streak tracking
      const lastDetection = this.getLastDetectionDate();
      const today = new Date();
      
      if (this.isSameDay(lastDetection, today) || this.isConsecutiveDay(lastDetection, today)) {
        if (!this.isSameDay(lastDetection, today)) {
          updated.streakDays++;
        }
      } else {
        updated.streakDays = 1;
      }
      
      this.saveLastDetectionDate(today);
      
      return updated;
    });
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metric: string, value: number): void {
    performanceMetrics.update(metrics => {
      const updated = { ...metrics };
      
      switch (metric) {
        case 'detectionTime':
          updated.averageDetectionTime = (updated.averageDetectionTime + value) / 2;
          break;
        case 'cameraInit':
          updated.cameraInitTime = value;
          break;
        case 'modelLoad':
          updated.modelLoadTime = value;
          break;
        case 'memoryUsage':
          updated.memoryUsage = value;
          break;
      }
      
      return updated;
    });
  }

  /**
   * Generate insights based on analytics data
   */
  generateInsights(): InsightData {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const trends: InsightData['trends'] = [];
    const achievements: InsightData['achievements'] = [];

    // Analyze detection patterns
    impactMetrics.subscribe(metrics => {
      // Most detected category
      const topCategory = Object.entries(metrics.categoryBreakdown)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (topCategory) {
        insights.push(`You classify ${topCategory[0]} items most frequently (${topCategory[1]} times)`);
        
        if (topCategory[0] === 'trash') {
          recommendations.push('Consider reusable alternatives to reduce trash generation');
        }
      }

      // Environmental impact
      if (metrics.estimatedCO2Saved > 10) {
        insights.push(`You've saved an estimated ${metrics.estimatedCO2Saved.toFixed(1)}kg of CO₂`);
      }

      // Streak analysis
      if (metrics.streakDays >= 7) {
        achievements.push({
          id: 'week_streak',
          title: 'Week Warrior',
          description: `${metrics.streakDays} days of consistent eco-actions`,
          unlockedAt: Date.now(),
          icon: '🔥'
        });
      }

      // Peak usage time
      const peakHour = Object.entries(metrics.timeOfDayAnalysis)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (peakHour) {
        insights.push(`You're most eco-active around ${peakHour[0]}`);
      }
    })();

    return {
      insights,
      recommendations,
      trends,
      achievements
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport(timeframe: 'day' | 'week' | 'month' = 'week'): any {
    const endTime = Date.now();
    const startTime = endTime - this.getTimeframeMs(timeframe);
    
    const events = this.eventQueue.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );

    const detectionEvents = events.filter(e => e.type === 'detection');
    const interactionEvents = events.filter(e => e.type === 'interaction');
    const performanceEvents = events.filter(e => e.type === 'performance');
    const errorEvents = events.filter(e => e.type === 'error');

    return {
      timeframe,
      period: { start: startTime, end: endTime },
      summary: {
        totalEvents: events.length,
        detections: detectionEvents.length,
        interactions: interactionEvents.length,
        errors: errorEvents.length,
        uniqueCategories: new Set(detectionEvents.map(e => e.metadata?.category)).size,
        averageConfidence: detectionEvents.reduce((sum, e) => sum + (e.value || 0), 0) / detectionEvents.length
      },
      performance: {
        averageDetectionTime: performanceEvents
          .filter(e => e.action === 'detectionTime')
          .reduce((sum, e) => sum + (e.value || 0), 0) / performanceEvents.length,
        errorRate: errorEvents.length / events.length,
        crashCount: errorEvents.filter(e => e.action === 'crash').length
      },
      environmental: this.calculateEnvironmentalImpact(detectionEvents),
      insights: this.generateInsights()
    };
  }

  /**
   * Calculate environmental impact from events
   */
  private calculateEnvironmentalImpact(detectionEvents: AnalyticsEvent[]): any {
    let co2Saved = 0;
    let wasteDiverted = 0;
    const categoryCount: Record<string, number> = {};

    detectionEvents.forEach(event => {
      const category = event.metadata?.category || 'unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      // CO2 calculations
      if (category === 'recycle') {
        co2Saved += 2.3;
        wasteDiverted += 0.5;
      } else if (category === 'compost') {
        co2Saved += 1.1;
        wasteDiverted += 0.3;
      }
    });

    return {
      co2SavedKg: co2Saved,
      wasteDivertedKg: wasteDiverted,
      categoryBreakdown: categoryCount,
      equivalencies: {
        treesPlanted: Math.floor(co2Saved / 21), // 1 tree absorbs ~21kg CO2/year
        milesNotDriven: Math.floor(co2Saved / 0.4), // 1 mile driving = ~0.4kg CO2
        lightBulbHours: Math.floor(co2Saved * 120) // 1kg CO2 = ~120 hours of LED bulb
      }
    };
  }

  /**
   * Start session tracking
   */
  private startSession(): void {
    const session: UserSession = {
      id: this.sessionId,
      startTime: this.sessionStartTime,
      pageViews: 1,
      events: 0,
      detections: 0,
      errors: 0,
      browser: this.getBrowserInfo(),
      device: this.getDeviceInfo()
    };

    currentSession.set(session);
    this.pageViews++;

    console.log('📊 Session started:', session.id);
  }

  /**
   * End current session
   */
  endSession(): void {
    currentSession.update(session => {
      if (session) {
        const updated = {
          ...session,
          endTime: Date.now(),
          duration: Date.now() - session.startTime,
          events: this.eventCount,
          detections: this.detectionCount,
          errors: this.errorCount,
          pageViews: this.pageViews
        };

        // Store session data
        this.storeSessionData(updated);
        
        return updated;
      }
      return session;
    });

    console.log('📊 Session ended');
  }

  /**
   * Setup automatic event flushing
   */
  private startEventFlushing(): void {
    this.flushInterval = window.setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush events to storage/analytics service
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // In a real implementation, this would send to analytics service
      const eventsToFlush = [...this.eventQueue];
      this.eventQueue = [];

      // Store locally for offline access
      this.storeEventsLocally(eventsToFlush);

      console.log(`📊 Flushed ${eventsToFlush.length} analytics events`);

    } catch (error) {
      console.error('❌ Failed to flush analytics events:', error);
      // Re-add events to queue on failure
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  /**
   * Setup page visibility tracking
   */
  private setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('interaction', 'page_visibility', 'hidden');
      } else {
        this.track('interaction', 'page_visibility', 'visible');
      }
    });

    window.addEventListener('beforeunload', () => {
      this.endSession();
      this.flushEvents();
    });
  }

  /**
   * Setup global error tracking
   */
  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackError(event.error, 'global_error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), 'unhandled_promise');
    });
  }

  /**
   * Load historical analytics data
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      // Load from localStorage
      const storedMetrics = localStorage.getItem('ecoscan-impact-metrics');
      if (storedMetrics) {
        const metrics = JSON.parse(storedMetrics);
        impactMetrics.set(metrics);
      }

      const storedPerf = localStorage.getItem('ecoscan-performance-metrics');
      if (storedPerf) {
        const perf = JSON.parse(storedPerf);
        performanceMetrics.set(perf);
      }

    } catch (error) {
      console.warn('Failed to load historical analytics data:', error);
    }
  }

  /**
   * Store events locally
   */
  private storeEventsLocally(events: AnalyticsEvent[]): void {
    try {
      const existing = localStorage.getItem('ecoscan-analytics-events');
      const existingEvents = existing ? JSON.parse(existing) : [];
      
      const allEvents = [...existingEvents, ...events];
      
      // Keep only last 1000 events
      const recentEvents = allEvents.slice(-1000);
      
      localStorage.setItem('ecoscan-analytics-events', JSON.stringify(recentEvents));
      
      // Store metrics
      impactMetrics.subscribe(metrics => {
        localStorage.setItem('ecoscan-impact-metrics', JSON.stringify(metrics));
      })();
      
      performanceMetrics.subscribe(perf => {
        localStorage.setItem('ecoscan-performance-metrics', JSON.stringify(perf));
      })();
      
    } catch (error) {
      console.warn('Failed to store analytics events locally:', error);
    }
  }

  /**
   * Store session data
   */
  private storeSessionData(session: UserSession): void {
    try {
      const existing = localStorage.getItem('ecoscan-sessions');
      const existingSessions = existing ? JSON.parse(existing) : [];
      
      const allSessions = [...existingSessions, session];
      
      // Keep only last 50 sessions
      const recentSessions = allSessions.slice(-50);
      
      localStorage.setItem('ecoscan-sessions', JSON.stringify(recentSessions));
      
    } catch (error) {
      console.warn('Failed to store session data:', error);
    }
  }

  // Helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getOrCreateUserId(): string {
    let userId = localStorage.getItem('ecoscan-user-id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ecoscan-user-id', userId);
    }
    return userId;
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  private getTimeframeMs(timeframe: 'day' | 'week' | 'month'): number {
    switch (timeframe) {
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private getLastDetectionDate(): Date {
    try {
      const stored = localStorage.getItem('ecoscan-last-detection');
      return stored ? new Date(stored) : new Date(0);
    } catch {
      return new Date(0);
    }
  }

  private saveLastDetectionDate(date: Date): void {
    try {
      localStorage.setItem('ecoscan-last-detection', date.toISOString());
    } catch (error) {
      console.warn('Failed to save last detection date:', error);
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private isConsecutiveDay(date1: Date, date2: Date): boolean {
    const nextDay = new Date(date1);
    nextDay.setDate(nextDay.getDate() + 1);
    return this.isSameDay(nextDay, date2);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    this.endSession();
    this.flushEvents();
  }
}

// Global analytics engine instance
let globalAnalytics: AnalyticsEngine | null = null;

/**
 * Get or create global analytics engine
 */
export function getAnalyticsEngine(): AnalyticsEngine {
  if (!globalAnalytics) {
    globalAnalytics = new AnalyticsEngine();
  }
  return globalAnalytics;
}

/**
 * Quick access functions for analytics
 */
export const analytics = {
  track: (type: AnalyticsEvent['type'], category: string, action: string, label?: string, value?: number, metadata?: Record<string, any>) =>
    getAnalyticsEngine().track(type, category, action, label, value, metadata),
  
  trackDetection: (detection: Detection, processingTime: number, method: 'camera' | 'upload' | 'voice' | 'text') =>
    getAnalyticsEngine().trackDetection(detection, processingTime, method),
  
  trackInteraction: (element: string, action: string, value?: number) =>
    getAnalyticsEngine().trackInteraction(element, action, value),
  
  trackPerformance: (metric: string, value: number, unit: string) =>
    getAnalyticsEngine().trackPerformance(metric, value, unit),
  
  trackConversion: (goal: string, value?: number) =>
    getAnalyticsEngine().trackConversion(goal, value),
  
  trackError: (error: Error, context?: string) =>
    getAnalyticsEngine().trackError(error, context),
  
  generateReport: (timeframe?: 'day' | 'week' | 'month') =>
    getAnalyticsEngine().generateReport(timeframe),
  
  generateInsights: () => getAnalyticsEngine().generateInsights(),
  
  getEngine: () => getAnalyticsEngine()
}; 