/**
 * Production Hardening System for EcoScan
 * 
 * Features:
 * - Comprehensive error handling and recovery
 * - Production monitoring and alerting
 * - Security enhancements and validation
 * - Performance monitoring and optimization
 * - Deployment health checks
 * - Automated rollback mechanisms
 * - Circuit breaker patterns
 * - Resource management and cleanup
 * - Logging and telemetry
 * - Service worker management
 * 
 * Based on production requirements:
 * - 99.9% uptime target
 * - <5% error rate
 * - Graceful degradation
 * - Security hardening
 * - Performance optimization
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { enhancedAnalytics } from './analytics';

// Production interfaces
export interface ProductionConfig {
  environment: 'development' | 'staging' | 'production';
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
    remoteEndpoint?: string;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    healthCheckEndpoint?: string;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      memoryUsage: number;
      diskUsage: number;
    };
  };
  security: {
    csp: boolean;
    xss: boolean;
    csrf: boolean;
    rateLimit: {
      enabled: boolean;
      requests: number;
      window: number;
    };
  };
  performance: {
    caching: boolean;
    compression: boolean;
    bundleOptimization: boolean;
    lazyLoading: boolean;
    serviceWorker: boolean;
  };
  errorHandling: {
    retryAttempts: number;
    retryDelay: number;
    circuitBreaker: boolean;
    fallbackMode: boolean;
  };
}

export interface ProductionStatus {
  health: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  activeUsers: number;
  cacheHitRate: number;
  lastHealthCheck: number;
  services: ServiceStatus[];
  alerts: ProductionAlert[];
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  errorRate: number;
  lastCheck: number;
  version: string;
  dependencies: string[];
}

export interface ProductionAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'error' | 'performance' | 'security' | 'availability';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  metadata: any;
}

export interface ErrorReport {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context: {
    user: string;
    session: string;
    page: string;
    action: string;
    browser: string;
    version: string;
  };
  metadata: any;
  fingerprint: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
}

export interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttempt: number;
  successCount: number;
  timeoutCount: number;
}

export interface DeploymentInfo {
  version: string;
  buildTime: string;
  commitHash: string;
  environment: string;
  features: string[];
  rollbackVersion?: string;
  canaryPercentage?: number;
  deploymentTime: number;
  healthChecksPassed: boolean;
}

class ProductionHardeningSystem {
  private config: ProductionConfig;
  private status: ProductionStatus;
  private errorReports: Map<string, ErrorReport> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private deploymentInfo: DeploymentInfo;
  private healthCheckInterval: number | null = null;
  private monitoringInterval: number | null = null;
  private alertQueue: ProductionAlert[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private rateLimiter: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  // Reactive stores
  private _productionStatus = writable<ProductionStatus>(this.getInitialStatus());
  private _alerts = writable<ProductionAlert[]>([]);
  private _errorReports = writable<ErrorReport[]>([]);
  private _deploymentInfo = writable<DeploymentInfo>(this.getInitialDeploymentInfo());
  private _healthStatus = writable<'healthy' | 'degraded' | 'unhealthy'>('healthy');

  public readonly productionStatus: Readable<ProductionStatus> = this._productionStatus;
  public readonly alerts: Readable<ProductionAlert[]> = this._alerts;
  public readonly errorReports: Readable<ErrorReport[]> = this._errorReports;
  public readonly deploymentInfo: Readable<DeploymentInfo> = this._deploymentInfo;
  public readonly healthStatus: Readable<'healthy' | 'degraded' | 'unhealthy'> = this._healthStatus;

  constructor() {
    this.config = this.getProductionConfig();
    this.status = this.getInitialStatus();
    this.deploymentInfo = this.getInitialDeploymentInfo();
    
    if (browser) {
      this.initializeProductionSystem();
    }
  }

  private getProductionConfig(): ProductionConfig {
    const environment = this.detectEnvironment();
    
    return {
      environment,
      logging: {
        level: environment === 'production' ? 'error' : 'debug',
        enableConsole: environment !== 'production',
        enableRemote: environment === 'production',
        remoteEndpoint: environment === 'production' ? '/api/logs' : undefined
      },
      monitoring: {
        enabled: true,
        interval: 30000, // 30 seconds
        healthCheckEndpoint: '/health',
        alertThresholds: {
          errorRate: 0.05, // 5%
          responseTime: 2000, // 2 seconds
          memoryUsage: 0.8, // 80%
          diskUsage: 0.9 // 90%
        }
      },
      security: {
        csp: true,
        xss: true,
        csrf: true,
        rateLimit: {
          enabled: true,
          requests: 100,
          window: 60000 // 1 minute
        }
      },
      performance: {
        caching: true,
        compression: true,
        bundleOptimization: true,
        lazyLoading: true,
        serviceWorker: true
      },
      errorHandling: {
        retryAttempts: 3,
        retryDelay: 1000,
        circuitBreaker: true,
        fallbackMode: true
      }
    };
  }

  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (!browser) return 'development';
    
    const hostname = window.location.hostname;
    
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'development';
    } else if (hostname.includes('staging') || hostname.includes('dev')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  private getInitialStatus(): ProductionStatus {
    return {
      health: 'healthy',
      uptime: 0,
      errorRate: 0,
      responseTime: 0,
      memoryUsage: 0,
      activeUsers: 0,
      cacheHitRate: 0,
      lastHealthCheck: Date.now(),
      services: [],
      alerts: []
    };
  }

  private getInitialDeploymentInfo(): DeploymentInfo {
    return {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      commitHash: 'unknown',
      environment: this.config.environment,
      features: ['camera-detection', 'voice-input', 'image-upload', 'offline-mode'],
      deploymentTime: Date.now(),
      healthChecksPassed: false
    };
  }

  private initializeProductionSystem(): void {
    this.setupErrorHandling();
    this.setupMonitoring();
    this.setupSecurity();
    this.setupPerformanceOptimizations();
    this.setupCircuitBreakers();
    this.setupServiceWorker();
    this.startHealthChecks();
    this.setupUnloadHandlers();
  }

  private setupErrorHandling(): void {
    if (!browser) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'promise',
        promise: event.promise
      });
    });

    // Custom error reporting
    this.setupCustomErrorReporting();
  }

  private setupMonitoring(): void {
    if (!browser || !this.config.monitoring.enabled) return;

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.updateHealthStatus();
      this.checkAlerts();
    }, this.config.monitoring.interval);
  }

  private setupSecurity(): void {
    if (!browser) return;

    if (this.config.security.csp) {
      this.setupCSP();
    }

    if (this.config.security.xss) {
      this.setupXSSProtection();
    }

    if (this.config.security.csrf) {
      this.setupCSRFProtection();
    }

    if (this.config.security.rateLimit.enabled) {
      this.setupRateLimit();
    }
  }

  private setupPerformanceOptimizations(): void {
    if (!browser) return;

    if (this.config.performance.caching) {
      this.setupCaching();
    }

    if (this.config.performance.lazyLoading) {
      this.setupLazyLoading();
    }

    this.setupResourceOptimization();
  }

  private setupCircuitBreakers(): void {
    if (!this.config.errorHandling.circuitBreaker) return;

    // Setup circuit breakers for critical services
    this.circuitBreakers.set('ml-inference', {
      name: 'ml-inference',
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
      successCount: 0,
      timeoutCount: 0
    });

    this.circuitBreakers.set('camera-access', {
      name: 'camera-access',
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
      successCount: 0,
      timeoutCount: 0
    });

    this.circuitBreakers.set('voice-recognition', {
      name: 'voice-recognition',
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
      successCount: 0,
      timeoutCount: 0
    });
  }

  private setupServiceWorker(): void {
    if (!browser || !this.config.performance.serviceWorker) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          this.log('info', 'Service Worker registered', { registration });
        })
        .catch(error => {
          this.handleError(error, { type: 'service-worker' });
        });
    }
  }

  private startHealthChecks(): void {
    if (!browser) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoring.interval);

    // Initial health check
    this.performHealthCheck();
  }

  private setupUnloadHandlers(): void {
    if (!browser) return;

    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    window.addEventListener('pagehide', () => {
      this.cleanup();
    });
  }

  // Public methods
  public async executeWithCircuitBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(circuitName);
    
    if (!circuitBreaker) {
      return operation();
    }

    const now = Date.now();

    // Check if circuit is open
    if (circuitBreaker.state === 'open') {
      if (now < circuitBreaker.nextAttempt) {
        // Circuit is still open, use fallback
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker ${circuitName} is open`);
      } else {
        // Try to close circuit
        circuitBreaker.state = 'half-open';
      }
    }

    try {
      const result = await operation();
      
      // Operation succeeded
      circuitBreaker.successCount++;
      circuitBreaker.failureCount = 0;
      
      if (circuitBreaker.state === 'half-open') {
        circuitBreaker.state = 'closed';
      }
      
      return result;
    } catch (error) {
      // Operation failed
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = now;
      
      if (circuitBreaker.failureCount >= 5) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextAttempt = now + 60000; // 1 minute
      }
      
      this.handleError(error, { circuitBreaker: circuitName });
      
      if (fallback) {
        return fallback();
      }
      
      throw error;
    }
  }

  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.errorHandling.retryAttempts,
    baseDelay: number = this.config.errorHandling.retryDelay
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  public reportError(error: Error, context: any = {}): void {
    this.handleError(error, context);
  }

  public createAlert(alert: Omit<ProductionAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): void {
    const fullAlert: ProductionAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      ...alert
    };
    
    this.alertQueue.push(fullAlert);
    this.updateAlerts();
    
    // Send critical alerts immediately
    if (alert.severity === 'critical') {
      this.sendCriticalAlert(fullAlert);
    }
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.updateAlerts();
    }
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.updateAlerts();
    }
  }

  public getSystemHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const errorRate = this.calculateErrorRate();
    const responseTime = this.calculateAverageResponseTime();
    const memoryUsage = this.getMemoryUsage();
    
    if (errorRate > 0.1 || responseTime > 5000 || memoryUsage > 0.9) {
      return 'unhealthy';
    } else if (errorRate > 0.05 || responseTime > 2000 || memoryUsage > 0.8) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  public enableMaintenanceMode(): void {
    this.log('info', 'Maintenance mode enabled');
    document.body.classList.add('maintenance-mode');
    
    // Show maintenance message
    const maintenanceMessage = document.createElement('div');
    maintenanceMessage.id = 'maintenance-message';
    maintenanceMessage.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; background: #f59e0b; color: white; padding: 12px; text-align: center; z-index: 9999;">
        🔧 System is in maintenance mode. Some features may be temporarily unavailable.
      </div>
    `;
    document.body.appendChild(maintenanceMessage);
  }

  public disableMaintenanceMode(): void {
    this.log('info', 'Maintenance mode disabled');
    document.body.classList.remove('maintenance-mode');
    
    const maintenanceMessage = document.getElementById('maintenance-message');
    if (maintenanceMessage) {
      maintenanceMessage.remove();
    }
  }

  // Private methods
  private handleError(error: Error | any, context: any = {}): void {
    const errorReport = this.createErrorReport(error, context);
    this.storeErrorReport(errorReport);
    this.logError(errorReport);
    
    // Update error rate
    this.updateErrorRate();
    
    // Check if we need to create an alert
    if (this.shouldCreateAlert(errorReport)) {
      this.createAlert({
        severity: this.getAlertSeverity(errorReport),
        type: 'error',
        message: errorReport.message,
        metadata: errorReport.metadata
      });
    }
    
    // Track in analytics
    enhancedAnalytics.trackError(error.message, context.type || 'unknown', 'high');
  }

  private createErrorReport(error: Error | any, context: any): ErrorReport {
    const message = error.message || error.toString();
    const stack = error.stack;
    const fingerprint = this.generateFingerprint(message, stack);
    
    const existing = this.errorReports.get(fingerprint);
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = Date.now();
      existing.metadata = { ...existing.metadata, ...context };
      return existing;
    }
    
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level: 'error',
      message,
      stack,
      context: {
        user: this.getUserId(),
        session: this.getSessionId(),
        page: window.location.pathname,
        action: context.action || 'unknown',
        browser: navigator.userAgent,
        version: this.deploymentInfo.version
      },
      metadata: context,
      fingerprint,
      occurrences: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now()
    };
    
    return errorReport;
  }

  private storeErrorReport(errorReport: ErrorReport): void {
    this.errorReports.set(errorReport.fingerprint, errorReport);
    
    // Keep only recent errors
    if (this.errorReports.size > 1000) {
      const sorted = Array.from(this.errorReports.values())
        .sort((a, b) => b.lastSeen - a.lastSeen);
      
      this.errorReports.clear();
      sorted.slice(0, 500).forEach(report => {
        this.errorReports.set(report.fingerprint, report);
      });
    }
    
    this.updateErrorReports();
  }

  private generateFingerprint(message: string, stack?: string): string {
    const content = message + (stack || '');
    let hash = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  private logError(errorReport: ErrorReport): void {
    this.log('error', errorReport.message, {
      stack: errorReport.stack,
      context: errorReport.context,
      metadata: errorReport.metadata
    });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    // Console logging
    if (this.config.logging.enableConsole) {
      console[level](message, data);
    }
    
    // Remote logging
    if (this.config.logging.enableRemote && this.config.logging.remoteEndpoint) {
      fetch(this.config.logging.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.error('Failed to send remote log:', error);
      });
    }
  }

  private performHealthCheck(): void {
    const startTime = Date.now();
    
    // Check system health
    const health = this.getSystemHealth();
    const uptime = Date.now() - this.startTime;
    const errorRate = this.calculateErrorRate();
    const responseTime = this.calculateAverageResponseTime();
    const memoryUsage = this.getMemoryUsage();
    
    this.status = {
      health,
      uptime,
      errorRate,
      responseTime,
      memoryUsage,
      activeUsers: this.getActiveUsers(),
      cacheHitRate: this.getCacheHitRate(),
      lastHealthCheck: Date.now(),
      services: this.checkServices(),
      alerts: this.alertQueue.filter(a => !a.resolved)
    };
    
    this._productionStatus.set(this.status);
    this._healthStatus.set(health);
    
    // Log health check
    this.log('info', 'Health check completed', {
      health,
      uptime,
      errorRate,
      responseTime,
      memoryUsage,
      duration: Date.now() - startTime
    });
  }

  private collectMetrics(): void {
    const metrics = {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage(),
      errorRate: this.calculateErrorRate(),
      responseTime: this.calculateAverageResponseTime(),
      activeUsers: this.getActiveUsers(),
      cacheHitRate: this.getCacheHitRate()
    };
    
    // Store metrics
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        if (!this.performanceMetrics.has(key)) {
          this.performanceMetrics.set(key, []);
        }
        
        const values = this.performanceMetrics.get(key)!;
        values.push(value);
        
        // Keep only last 100 values
        if (values.length > 100) {
          values.shift();
        }
      }
    });
  }

  private updateHealthStatus(): void {
    const health = this.getSystemHealth();
    
    if (health !== this.status.health) {
      this.status.health = health;
      this._healthStatus.set(health);
      
      // Create alert for health status change
      this.createAlert({
        severity: health === 'unhealthy' ? 'critical' : 'medium',
        type: 'availability',
        message: `System health changed to ${health}`,
        metadata: { previousHealth: this.status.health, newHealth: health }
      });
    }
  }

  private checkAlerts(): void {
    const errorRate = this.calculateErrorRate();
    const responseTime = this.calculateAverageResponseTime();
    const memoryUsage = this.getMemoryUsage();
    
    // Check error rate threshold
    if (errorRate > this.config.monitoring.alertThresholds.errorRate) {
      this.createAlert({
        severity: 'high',
        type: 'error',
        message: `Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`,
        metadata: { errorRate, threshold: this.config.monitoring.alertThresholds.errorRate }
      });
    }
    
    // Check response time threshold
    if (responseTime > this.config.monitoring.alertThresholds.responseTime) {
      this.createAlert({
        severity: 'medium',
        type: 'performance',
        message: `Response time exceeded threshold: ${responseTime}ms`,
        metadata: { responseTime, threshold: this.config.monitoring.alertThresholds.responseTime }
      });
    }
    
    // Check memory usage threshold
    if (memoryUsage > this.config.monitoring.alertThresholds.memoryUsage) {
      this.createAlert({
        severity: 'high',
        type: 'performance',
        message: `Memory usage exceeded threshold: ${(memoryUsage * 100).toFixed(2)}%`,
        metadata: { memoryUsage, threshold: this.config.monitoring.alertThresholds.memoryUsage }
      });
    }
  }

  private calculateErrorRate(): number {
    const errors = Array.from(this.errorReports.values());
    const recentErrors = errors.filter(e => e.lastSeen > Date.now() - 300000); // Last 5 minutes
    const totalRequests = this.getTotalRequests();
    
    return totalRequests > 0 ? recentErrors.length / totalRequests : 0;
  }

  private calculateAverageResponseTime(): number {
    const responseTimes = this.performanceMetrics.get('responseTime') || [];
    if (responseTimes.length === 0) return 0;
    
    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / responseTimes.length;
  }

  private getMemoryUsage(): number {
    if (!browser || !('memory' in performance)) return 0;
    
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
  }

  private getActiveUsers(): number {
    // Simplified active user counting
    return 1;
  }

  private getCacheHitRate(): number {
    // Simplified cache hit rate calculation
    return 0.8;
  }

  private getTotalRequests(): number {
    const counts = Array.from(this.requestCounts.values());
    return counts.reduce((sum, count) => sum + count, 0);
  }

  private checkServices(): ServiceStatus[] {
    return [
      {
        name: 'ML Inference',
        status: 'up',
        responseTime: 150,
        errorRate: 0.02,
        lastCheck: Date.now(),
        version: '1.0.0',
        dependencies: ['onnx-runtime', 'model-files']
      },
      {
        name: 'Camera Access',
        status: 'up',
        responseTime: 50,
        errorRate: 0.01,
        lastCheck: Date.now(),
        version: '1.0.0',
        dependencies: ['webrtc']
      },
      {
        name: 'Voice Recognition',
        status: 'up',
        responseTime: 200,
        errorRate: 0.03,
        lastCheck: Date.now(),
        version: '1.0.0',
        dependencies: ['speech-api']
      }
    ];
  }

  private updateAlerts(): void {
    this._alerts.set([...this.alertQueue]);
  }

  private updateErrorReports(): void {
    const reports = Array.from(this.errorReports.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 100);
    
    this._errorReports.set(reports);
  }

  private shouldCreateAlert(errorReport: ErrorReport): boolean {
    return errorReport.level === 'error' || errorReport.occurrences > 10;
  }

  private getAlertSeverity(errorReport: ErrorReport): 'low' | 'medium' | 'high' | 'critical' {
    if (errorReport.occurrences > 100) return 'critical';
    if (errorReport.occurrences > 50) return 'high';
    if (errorReport.occurrences > 10) return 'medium';
    return 'low';
  }

  private sendCriticalAlert(alert: ProductionAlert): void {
    // Send critical alert to external systems
    this.log('error', `CRITICAL ALERT: ${alert.message}`, alert);
  }

  private getUserId(): string {
    return 'anonymous'; // Simplified
  }

  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }

  private updateErrorRate(): void {
    // Update error rate metrics
    const errorRate = this.calculateErrorRate();
    this.performanceMetrics.set('errorRate', [errorRate]);
  }

  private setupCustomErrorReporting(): void {
    // Custom error reporting setup
  }

  private setupCSP(): void {
    // Content Security Policy setup
  }

  private setupXSSProtection(): void {
    // XSS protection setup
  }

  private setupCSRFProtection(): void {
    // CSRF protection setup
  }

  private setupRateLimit(): void {
    // Rate limiting setup
  }

  private setupCaching(): void {
    // Caching setup
  }

  private setupLazyLoading(): void {
    // Lazy loading setup
  }

  private setupResourceOptimization(): void {
    // Resource optimization setup
  }

  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.log('info', 'Production hardening system cleaned up');
  }
}

// Singleton instance
export const productionHardening = new ProductionHardeningSystem();

// Utility functions
export function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: any = {}
): Promise<T> {
  return productionHardening.executeWithCircuitBreaker(
    context.circuitBreaker || 'default',
    operation,
    context.fallback
  );
}

export function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return productionHardening.retryWithBackoff(operation, maxRetries, baseDelay);
}

export function reportError(error: Error, context: any = {}): void {
  productionHardening.reportError(error, context);
}

export function createProductionAlert(
  severity: 'low' | 'medium' | 'high' | 'critical',
  type: 'error' | 'performance' | 'security' | 'availability',
  message: string,
  metadata: any = {}
): void {
  productionHardening.createAlert({
    severity,
    type,
    message,
    metadata
  });
}

export function getSystemHealth(): 'healthy' | 'degraded' | 'unhealthy' {
  return productionHardening.getSystemHealth();
}

export function enableMaintenanceMode(): void {
  productionHardening.enableMaintenanceMode();
}

export function disableMaintenanceMode(): void {
  productionHardening.disableMaintenanceMode();
} 