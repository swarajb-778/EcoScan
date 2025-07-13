export interface PerformanceMetrics {
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    timeToInteractive: number;
  };
  resources: {
    totalSize: number;
    totalDuration: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
    fontSize: number;
    numberOfRequests: number;
    cacheHitRatio: number;
  };
  runtime: {
    jsHeapUsed: number;
    jsHeapTotal: number;
    jsHeapLimit: number;
    domNodes: number;
    eventListeners: number;
    memoryUsage: number;
  };
  user: {
    sessionDuration: number;
    pageViews: number;
    interactions: number;
    bounceRate: number;
    errorRate: number;
    conversionRate: number;
  };
  vitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
    tti: number; // Time to Interactive
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  action?: string;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
  description: string;
  category: 'timing' | 'resources' | 'runtime' | 'user' | 'vitals';
}

export interface PerformanceReport {
  id: string;
  timestamp: Date;
  duration: number;
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: PerformanceRecommendation[];
  score: {
    overall: number;
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  comparison: {
    previous: PerformanceMetrics;
    trend: 'improving' | 'stable' | 'degrading';
    percentage: number;
  };
}

export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  action: string;
  priority: number;
  estimatedImprovement: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  thresholds: PerformanceThreshold[];
  alerts: {
    enabled: boolean;
    channels: ('console' | 'notification' | 'api')[];
    debounceTime: number;
  };
  reporting: {
    interval: number;
    retention: number;
    autoExport: boolean;
  };
  monitoring: {
    resources: boolean;
    memory: boolean;
    network: boolean;
    interactions: boolean;
    vitals: boolean;
  };
}

export interface PerformanceProfiler {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  metadata: Record<string, any>;
}

export interface PerformanceMark {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMeasure {
  name: string;
  startMark: string;
  endMark: string;
  duration: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitoringSystem {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[];
  private reports: PerformanceReport[];
  private profilers: Map<string, PerformanceProfiler>;
  private observers: PerformanceObserver[];
  private intervalId?: number;
  private startTime: number;
  private isMonitoring: boolean;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = this.mergeConfig(config);
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.reports = [];
    this.profilers = new Map();
    this.observers = [];
    this.startTime = performance.now();
    this.isMonitoring = false;
    
    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  private mergeConfig(config?: Partial<PerformanceConfig>): PerformanceConfig {
    const defaultConfig: PerformanceConfig = {
      enabled: true,
      sampleRate: 1.0,
      thresholds: [
        { metric: 'lcp', warning: 2500, critical: 4000, unit: 'ms', description: 'Largest Contentful Paint', category: 'vitals' },
        { metric: 'fid', warning: 100, critical: 300, unit: 'ms', description: 'First Input Delay', category: 'vitals' },
        { metric: 'cls', warning: 0.1, critical: 0.25, unit: 'score', description: 'Cumulative Layout Shift', category: 'vitals' },
        { metric: 'fcp', warning: 1800, critical: 3000, unit: 'ms', description: 'First Contentful Paint', category: 'vitals' },
        { metric: 'ttfb', warning: 200, critical: 600, unit: 'ms', description: 'Time to First Byte', category: 'vitals' },
        { metric: 'tti', warning: 3800, critical: 7300, unit: 'ms', description: 'Time to Interactive', category: 'vitals' },
        { metric: 'jsHeapUsed', warning: 50, critical: 100, unit: 'MB', description: 'JavaScript Memory Usage', category: 'runtime' },
        { metric: 'domNodes', warning: 1500, critical: 3000, unit: 'nodes', description: 'DOM Nodes Count', category: 'runtime' },
        { metric: 'totalSize', warning: 2, critical: 5, unit: 'MB', description: 'Total Resource Size', category: 'resources' },
        { metric: 'numberOfRequests', warning: 50, critical: 100, unit: 'requests', description: 'Number of Requests', category: 'resources' }
      ],
      alerts: {
        enabled: true,
        channels: ['console', 'notification'],
        debounceTime: 5000
      },
      reporting: {
        interval: 60000, // 1 minute
        retention: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoExport: false
      },
      monitoring: {
        resources: true,
        memory: true,
        network: true,
        interactions: true,
        vitals: true
      }
    };

    return { ...defaultConfig, ...config };
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      timing: {
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        timeToInteractive: 0
      },
      resources: {
        totalSize: 0,
        totalDuration: 0,
        jsSize: 0,
        cssSize: 0,
        imageSize: 0,
        fontSize: 0,
        numberOfRequests: 0,
        cacheHitRatio: 0
      },
      runtime: {
        jsHeapUsed: 0,
        jsHeapTotal: 0,
        jsHeapLimit: 0,
        domNodes: 0,
        eventListeners: 0,
        memoryUsage: 0
      },
      user: {
        sessionDuration: 0,
        pageViews: 0,
        interactions: 0,
        bounceRate: 0,
        errorRate: 0,
        conversionRate: 0
      },
      vitals: {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
        tti: 0
      }
    };
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupObservers();
    this.startPeriodicCollection();
    this.collectInitialMetrics();
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.cleanupObservers();
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private setupObservers(): void {
    if (!('PerformanceObserver' in window)) return;

    // Navigation timing
    if (this.config.monitoring.vitals) {
      this.setupNavigationObserver();
    }

    // Resource timing
    if (this.config.monitoring.resources) {
      this.setupResourceObserver();
    }

    // Core Web Vitals
    if (this.config.monitoring.vitals) {
      this.setupWebVitalsObserver();
    }

    // Memory usage
    if (this.config.monitoring.memory) {
      this.setupMemoryObserver();
    }

    // User interactions
    if (this.config.monitoring.interactions) {
      this.setupInteractionObserver();
    }
  }

  private setupNavigationObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.updateNavigationMetrics(navEntry);
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Navigation observer setup failed:', error);
    }
  }

  private setupResourceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.updateResourceMetrics(resourceEntry);
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource observer setup failed:', error);
    }
  }

  private setupWebVitalsObserver(): void {
    try {
      // First Input Delay
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            this.metrics.vitals.fid = entry.processingStart - entry.startTime;
            this.metrics.timing.firstInputDelay = this.metrics.vitals.fid;
            this.checkThresholds('fid', this.metrics.vitals.fid);
          }
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.vitals.lcp = lastEntry.startTime;
          this.metrics.timing.largestContentfulPaint = this.metrics.vitals.lcp;
          this.checkThresholds('lcp', this.metrics.vitals.lcp);
        }
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.vitals.cls = clsValue;
        this.metrics.timing.cumulativeLayoutShift = clsValue;
        this.checkThresholds('cls', clsValue);
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('Web Vitals observer setup failed:', error);
    }
  }

  private setupMemoryObserver(): void {
    if ('memory' in performance) {
      // Memory monitoring will be handled in periodic collection
    }
  }

  private setupInteractionObserver(): void {
    // User interaction tracking
    const events = ['click', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.metrics.user.interactions++;
      }, { passive: true });
    });
  }

  private startPeriodicCollection(): void {
    this.intervalId = window.setInterval(() => {
      this.collectMetrics();
      this.generateReport();
    }, this.config.reporting.interval);
  }

  private collectInitialMetrics(): void {
    // Collect initial navigation timing
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      this.updateNavigationMetrics(navTiming);
    }

    // Collect initial resource timing
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resourceEntries.forEach(entry => this.updateResourceMetrics(entry));

    // Collect initial paint timing
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        this.metrics.timing.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        this.metrics.timing.firstContentfulPaint = entry.startTime;
        this.metrics.vitals.fcp = entry.startTime;
      }
    });
  }

  private updateNavigationMetrics(entry: PerformanceNavigationTiming): void {
    this.metrics.timing.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
    this.metrics.timing.loadComplete = entry.loadEventEnd - entry.loadEventStart;
    this.metrics.vitals.ttfb = entry.responseStart - entry.requestStart;
    
    // Estimate TTI (simplified)
    this.metrics.vitals.tti = entry.domInteractive - entry.navigationStart;
    this.metrics.timing.timeToInteractive = this.metrics.vitals.tti;
  }

  private updateResourceMetrics(entry: PerformanceResourceTiming): void {
    const transferSize = entry.transferSize || 0;
    this.metrics.resources.totalSize += transferSize;
    this.metrics.resources.totalDuration += entry.duration;
    this.metrics.resources.numberOfRequests++;

    // Categorize resources
    if (entry.name.includes('.js')) {
      this.metrics.resources.jsSize += transferSize;
    } else if (entry.name.includes('.css')) {
      this.metrics.resources.cssSize += transferSize;
    } else if (entry.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      this.metrics.resources.imageSize += transferSize;
    } else if (entry.name.includes('.woff') || entry.name.includes('.ttf')) {
      this.metrics.resources.fontSize += transferSize;
    }

    // Cache hit ratio
    if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
      this.metrics.resources.cacheHitRatio = 
        (this.metrics.resources.cacheHitRatio * (this.metrics.resources.numberOfRequests - 1) + 1) / 
        this.metrics.resources.numberOfRequests;
    }
  }

  private collectMetrics(): void {
    // Update runtime metrics
    this.updateRuntimeMetrics();
    
    // Update user metrics
    this.updateUserMetrics();
    
    // Check all thresholds
    this.checkAllThresholds();
  }

  private updateRuntimeMetrics(): void {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.runtime.jsHeapUsed = memory.usedJSHeapSize / 1024 / 1024; // MB
      this.metrics.runtime.jsHeapTotal = memory.totalJSHeapSize / 1024 / 1024; // MB
      this.metrics.runtime.jsHeapLimit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
    }

    // DOM nodes
    this.metrics.runtime.domNodes = document.querySelectorAll('*').length;
    
    // Memory usage estimate
    this.metrics.runtime.memoryUsage = this.metrics.runtime.jsHeapUsed;
  }

  private updateUserMetrics(): void {
    this.metrics.user.sessionDuration = (performance.now() - this.startTime) / 1000; // seconds
    this.metrics.user.pageViews = 1; // Single page app
    
    // Calculate bounce rate (simplified)
    if (this.metrics.user.sessionDuration > 30 && this.metrics.user.interactions > 5) {
      this.metrics.user.bounceRate = 0;
    } else {
      this.metrics.user.bounceRate = 1;
    }
  }

  private checkAllThresholds(): void {
    this.config.thresholds.forEach(threshold => {
      const value = this.getMetricValue(threshold.metric);
      if (value !== undefined) {
        this.checkThresholds(threshold.metric, value);
      }
    });
  }

  private getMetricValue(metric: string): number | undefined {
    const parts = metric.split('.');
    let value: any = this.metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private checkThresholds(metric: string, value: number): void {
    const threshold = this.config.thresholds.find(t => t.metric === metric);
    if (!threshold) return;

    let alertType: 'warning' | 'critical' | null = null;
    let severity: PerformanceAlert['severity'] = 'low';

    if (value >= threshold.critical) {
      alertType = 'critical';
      severity = 'critical';
    } else if (value >= threshold.warning) {
      alertType = 'warning';
      severity = 'medium';
    }

    if (alertType) {
      const alert: PerformanceAlert = {
        id: crypto.randomUUID(),
        type: alertType === 'critical' ? 'error' : 'warning',
        metric,
        threshold: alertType === 'critical' ? threshold.critical : threshold.warning,
        currentValue: value,
        message: `${threshold.description} exceeded threshold: ${value}${threshold.unit} (threshold: ${alertType === 'critical' ? threshold.critical : threshold.warning}${threshold.unit})`,
        timestamp: new Date(),
        severity,
        acknowledged: false,
        action: this.getRecommendedAction(metric, value)
      };

      this.addAlert(alert);
    }
  }

  private getRecommendedAction(metric: string, value: number): string {
    const actions: Record<string, string> = {
      'lcp': 'Optimize images and reduce server response time',
      'fid': 'Reduce JavaScript execution time and split large tasks',
      'cls': 'Add size attributes to images and reserve space for dynamic content',
      'fcp': 'Optimize CSS delivery and reduce render-blocking resources',
      'ttfb': 'Improve server response time and use CDN',
      'tti': 'Reduce JavaScript execution time and optimize critical rendering path',
      'jsHeapUsed': 'Optimize memory usage and remove memory leaks',
      'domNodes': 'Simplify DOM structure and remove unused elements',
      'totalSize': 'Optimize assets and enable compression',
      'numberOfRequests': 'Combine resources and use resource hints'
    };

    return actions[metric] || 'Review and optimize this metric';
  }

  private addAlert(alert: PerformanceAlert): void {
    // Check if similar alert already exists (debouncing)
    const existingAlert = this.alerts.find(a => 
      a.metric === alert.metric && 
      a.type === alert.type &&
      (Date.now() - a.timestamp.getTime()) < this.config.alerts.debounceTime
    );

    if (existingAlert) return;

    this.alerts.push(alert);
    this.trimAlerts();

    if (this.config.alerts.enabled) {
      this.dispatchAlert(alert);
    }
  }

  private trimAlerts(): void {
    const maxAlerts = 100;
    if (this.alerts.length > maxAlerts) {
      this.alerts = this.alerts.slice(-maxAlerts);
    }
  }

  private dispatchAlert(alert: PerformanceAlert): void {
    this.config.alerts.channels.forEach(channel => {
      switch (channel) {
        case 'console':
          console.warn(`Performance Alert: ${alert.message}`);
          break;
        case 'notification':
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Performance Alert', {
              body: alert.message,
              icon: '/icon-192x192.png'
            });
          }
          break;
        case 'api':
          this.sendAlertToAPI(alert);
          break;
      }
    });
  }

  private async sendAlertToAPI(alert: PerformanceAlert): Promise<void> {
    try {
      await fetch('/api/performance/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to send alert to API:', error);
    }
  }

  private generateReport(): void {
    const report: PerformanceReport = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      duration: this.metrics.user.sessionDuration,
      metrics: { ...this.metrics },
      alerts: [...this.alerts],
      recommendations: this.generateRecommendations(),
      score: this.calculateScore(),
      comparison: this.generateComparison()
    };

    this.reports.push(report);
    this.trimReports();
    
    if (this.config.reporting.autoExport) {
      this.exportReport(report);
    }
  }

  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // LCP recommendations
    if (this.metrics.vitals.lcp > 2500) {
      recommendations.push({
        id: 'lcp-optimization',
        title: 'Optimize Largest Contentful Paint',
        description: 'Reduce the time it takes for the largest content element to render',
        impact: 'high',
        difficulty: 'medium',
        category: 'Performance',
        action: 'Optimize images, reduce server response time, and preload key resources',
        priority: 1,
        estimatedImprovement: 30
      });
    }

    // Memory recommendations
    if (this.metrics.runtime.jsHeapUsed > 50) {
      recommendations.push({
        id: 'memory-optimization',
        title: 'Optimize Memory Usage',
        description: 'Reduce JavaScript memory consumption',
        impact: 'medium',
        difficulty: 'medium',
        category: 'Performance',
        action: 'Identify and fix memory leaks, optimize data structures',
        priority: 2,
        estimatedImprovement: 20
      });
    }

    // Resource recommendations
    if (this.metrics.resources.totalSize > 2 * 1024 * 1024) {
      recommendations.push({
        id: 'resource-optimization',
        title: 'Optimize Resource Loading',
        description: 'Reduce total resource size and optimize loading',
        impact: 'medium',
        difficulty: 'easy',
        category: 'Performance',
        action: 'Compress images, minify CSS/JS, and enable gzip compression',
        priority: 3,
        estimatedImprovement: 25
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private calculateScore(): PerformanceReport['score'] {
    let performanceScore = 100;
    
    // Deduct points based on Core Web Vitals
    if (this.metrics.vitals.lcp > 4000) performanceScore -= 30;
    else if (this.metrics.vitals.lcp > 2500) performanceScore -= 15;
    
    if (this.metrics.vitals.fid > 300) performanceScore -= 20;
    else if (this.metrics.vitals.fid > 100) performanceScore -= 10;
    
    if (this.metrics.vitals.cls > 0.25) performanceScore -= 25;
    else if (this.metrics.vitals.cls > 0.1) performanceScore -= 10;

    // Deduct points for resource issues
    if (this.metrics.resources.totalSize > 5 * 1024 * 1024) performanceScore -= 20;
    else if (this.metrics.resources.totalSize > 2 * 1024 * 1024) performanceScore -= 10;

    // Deduct points for memory issues
    if (this.metrics.runtime.jsHeapUsed > 100) performanceScore -= 15;
    else if (this.metrics.runtime.jsHeapUsed > 50) performanceScore -= 5;

    return {
      overall: Math.max(0, performanceScore),
      performance: Math.max(0, performanceScore),
      accessibility: 85, // Placeholder
      bestPractices: 90, // Placeholder
      seo: 95 // Placeholder
    };
  }

  private generateComparison(): PerformanceReport['comparison'] {
    const previousReport = this.reports[this.reports.length - 1];
    
    if (!previousReport) {
      return {
        previous: this.initializeMetrics(),
        trend: 'stable',
        percentage: 0
      };
    }

    const currentLCP = this.metrics.vitals.lcp;
    const previousLCP = previousReport.metrics.vitals.lcp;
    
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    let percentage = 0;

    if (currentLCP < previousLCP * 0.95) {
      trend = 'improving';
      percentage = ((previousLCP - currentLCP) / previousLCP) * 100;
    } else if (currentLCP > previousLCP * 1.05) {
      trend = 'degrading';
      percentage = ((currentLCP - previousLCP) / previousLCP) * 100;
    }

    return {
      previous: previousReport.metrics,
      trend,
      percentage
    };
  }

  private trimReports(): void {
    const maxReports = 1000;
    if (this.reports.length > maxReports) {
      this.reports = this.reports.slice(-maxReports);
    }
  }

  private cleanupObservers(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // Public API methods
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  public startProfiler(name: string, metadata?: Record<string, any>): string {
    const id = crypto.randomUUID();
    const profiler: PerformanceProfiler = {
      id,
      name,
      startTime: performance.now(),
      marks: [],
      measures: [],
      metadata: metadata || {}
    };

    this.profilers.set(id, profiler);
    performance.mark(`${name}-start`);
    
    return id;
  }

  public stopProfiler(id: string): PerformanceProfiler | undefined {
    const profiler = this.profilers.get(id);
    if (!profiler) return undefined;

    profiler.endTime = performance.now();
    profiler.duration = profiler.endTime - profiler.startTime;
    
    performance.mark(`${profiler.name}-end`);
    performance.measure(profiler.name, `${profiler.name}-start`, `${profiler.name}-end`);
    
    this.profilers.delete(id);
    return profiler;
  }

  public mark(name: string, metadata?: Record<string, any>): void {
    performance.mark(name);
    
    // Add to current profilers
    this.profilers.forEach(profiler => {
      profiler.marks.push({
        name,
        timestamp: performance.now(),
        metadata
      });
    });
  }

  public measure(name: string, startMark: string, endMark: string): void {
    performance.measure(name, startMark, endMark);
    
    const entry = performance.getEntriesByName(name, 'measure')[0];
    if (entry) {
      this.profilers.forEach(profiler => {
        profiler.measures.push({
          name,
          startMark,
          endMark,
          duration: entry.duration
        });
      });
    }
  }

  public updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enabled === false && this.isMonitoring) {
      this.stopMonitoring();
    } else if (config.enabled === true && !this.isMonitoring) {
      this.startMonitoring();
    }
  }

  public exportReport(report?: PerformanceReport): string {
    const reportToExport = report || this.reports[this.reports.length - 1];
    if (!reportToExport) return '';

    return JSON.stringify(reportToExport, null, 2);
  }

  public exportAllData(): string {
    return JSON.stringify({
      config: this.config,
      metrics: this.metrics,
      alerts: this.alerts,
      reports: this.reports
    }, null, 2);
  }

  public importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.config) this.config = parsed.config;
      if (parsed.metrics) this.metrics = parsed.metrics;
      if (parsed.alerts) this.alerts = parsed.alerts;
      if (parsed.reports) this.reports = parsed.reports;
    } catch (error) {
      console.error('Failed to import performance data:', error);
    }
  }

  public reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.reports = [];
    this.profilers.clear();
    this.startTime = performance.now();
  }

  public getRealtimeMetrics(): PerformanceMetrics {
    this.collectMetrics();
    return this.getMetrics();
  }

  public getPerformanceScore(): number {
    return this.calculateScore().overall;
  }

  public getRecommendations(): PerformanceRecommendation[] {
    return this.generateRecommendations();
  }

  public destroy(): void {
    this.stopMonitoring();
    this.profilers.clear();
    this.alerts = [];
    this.reports = [];
  }
}

export const performanceMonitoringSystem = new PerformanceMonitoringSystem(); 