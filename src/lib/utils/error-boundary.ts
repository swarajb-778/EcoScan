/**
 * Advanced Error Boundary and Recovery System for EcoScan
 * Handles errors, crashes, recovery, and graceful degradation
 */

export interface ErrorDetails {
  id: string;
  timestamp: number;
  type: 'javascript' | 'promise' | 'resource' | 'network' | 'security' | 'ml_inference' | 'camera' | 'webgl';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  url?: string;
  userAgent: string;
  context: {
    component?: string;
    action?: string;
    userId?: string;
    sessionId: string;
    deviceInfo: any;
    memoryUsage?: number;
    timestamp: number;
  };
  recovery?: {
    attempted: boolean;
    successful: boolean;
    strategy: string;
    attemptCount: number;
  };
}

export interface ErrorRecoveryStrategy {
  type: string;
  condition: (error: ErrorDetails) => boolean;
  handler: (error: ErrorDetails) => Promise<boolean>;
  maxAttempts: number;
  cooldownPeriod: number;
  fallbackStrategy?: string;
}

export interface CrashReport {
  id: string;
  timestamp: number;
  errors: ErrorDetails[];
  systemState: {
    memoryUsage: number;
    performance: any;
    networkState: string;
    deviceCapabilities: any;
  };
  userActions: string[];
  recoveryAttempts: number;
  finalState: 'recovered' | 'degraded' | 'crashed';
}

export interface ErrorBoundaryConfig {
  enableGlobalHandling: boolean;
  enableCrashReporting: boolean;
  enableRecovery: boolean;
  maxErrorsPerSession: number;
  reportingEndpoint?: string;
  fallbackUI: boolean;
  gracefulDegradation: boolean;
  debugMode: boolean;
}

export class ErrorBoundarySystem {
  private errors: ErrorDetails[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private config: ErrorBoundaryConfig;
  private crashReports: CrashReport[] = [];
  private userActions: string[] = [];
  private isInRecovery = false;
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();
  
  private readonly MAX_ERRORS = 100;
  private readonly MAX_CRASH_REPORTS = 10;
  private readonly MAX_USER_ACTIONS = 50;
  private readonly RECOVERY_COOLDOWN = 5000; // 5 seconds

  constructor(config?: Partial<ErrorBoundaryConfig>) {
    this.config = {
      enableGlobalHandling: true,
      enableCrashReporting: true,
      enableRecovery: true,
      maxErrorsPerSession: 50,
      fallbackUI: true,
      gracefulDegradation: true,
      debugMode: false,
      ...config
    };
    
    this.initialize();
  }

  private initialize(): void {
    if (this.config.enableGlobalHandling) {
      this.setupGlobalErrorHandling();
    }
    
    this.setupRecoveryStrategies();
    this.trackUserActions();
    
    console.log('🛡️ Error boundary system initialized');
  }

  private setupGlobalErrorHandling(): void {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.createErrorDetails({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        severity: 'high'
      });
      
      this.handleError(error);
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createErrorDetails({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        severity: 'medium'
      });
      
      this.handleError(error);
    });
    
    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        const error = this.createErrorDetails({
          type: 'resource',
          message: `Failed to load resource: ${target.tagName}`,
          source: (target as any).src || (target as any).href,
          severity: 'medium'
        });
        
        this.handleError(error);
      }
    }, true);
    
    // Handle security errors
    window.addEventListener('securitypolicyviolation', (event) => {
      const error = this.createErrorDetails({
        type: 'security',
        message: `CSP violation: ${event.violatedDirective}`,
        source: event.sourceFile,
        line: event.lineNumber,
        column: event.columnNumber,
        severity: 'high'
      });
      
      this.handleError(error);
    });
  }

  private setupRecoveryStrategies(): void {
    // ML Model Recovery
    this.addRecoveryStrategy({
      type: 'ml_inference_failure',
      condition: (error) => error.type === 'ml_inference' || error.message.includes('inference'),
      handler: async (error) => {
        console.log('🔄 Attempting ML model recovery...');
        try {
          // Trigger model reload
          window.dispatchEvent(new CustomEvent('ml-model-reload'));
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        } catch {
          return false;
        }
      },
      maxAttempts: 2,
      cooldownPeriod: 10000,
      fallbackStrategy: 'cpu_fallback'
    });
    
    // Camera Recovery
    this.addRecoveryStrategy({
      type: 'camera_failure',
      condition: (error) => error.type === 'camera' || error.message.includes('camera'),
      handler: async (error) => {
        console.log('📷 Attempting camera recovery...');
        try {
          window.dispatchEvent(new CustomEvent('camera-restart'));
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        } catch {
          return false;
        }
      },
      maxAttempts: 3,
      cooldownPeriod: 5000,
      fallbackStrategy: 'image_upload_mode'
    });
    
    // WebGL Context Recovery
    this.addRecoveryStrategy({
      type: 'webgl_context_loss',
      condition: (error) => error.type === 'webgl' || error.message.includes('webgl'),
      handler: async (error) => {
        console.log('🎮 Attempting WebGL context recovery...');
        try {
          window.dispatchEvent(new CustomEvent('webgl-context-restore'));
          await new Promise(resolve => setTimeout(resolve, 1500));
          return true;
        } catch {
          return false;
        }
      },
      maxAttempts: 2,
      cooldownPeriod: 3000,
      fallbackStrategy: 'cpu_rendering'
    });
    
    // Network Recovery
    this.addRecoveryStrategy({
      type: 'network_failure',
      condition: (error) => error.type === 'network' || error.message.includes('fetch'),
      handler: async (error) => {
        console.log('🌐 Attempting network recovery...');
        try {
          // Wait for network and retry
          await this.waitForNetwork();
          return true;
        } catch {
          return false;
        }
      },
      maxAttempts: 3,
      cooldownPeriod: 5000,
      fallbackStrategy: 'offline_mode'
    });
  }

  private async waitForNetwork(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (navigator.onLine) {
        resolve();
        return;
      }
      
      const timeout = setTimeout(() => {
        window.removeEventListener('online', onlineHandler);
        reject(new Error('Network timeout'));
      }, 30000);
      
      const onlineHandler = () => {
        clearTimeout(timeout);
        window.removeEventListener('online', onlineHandler);
        resolve();
      };
      
      window.addEventListener('online', onlineHandler);
    });
  }

  private trackUserActions(): void {
    // Track user interactions for crash context
    ['click', 'keydown', 'submit', 'change'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const action = `${eventType}:${(event.target as Element)?.tagName || 'unknown'}`;
        this.userActions.push(`${Date.now()}:${action}`);
        
        if (this.userActions.length > this.MAX_USER_ACTIONS) {
          this.userActions.shift();
        }
      });
    });
  }

  private createErrorDetails(params: Partial<ErrorDetails>): ErrorDetails {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      type: params.type || 'javascript',
      severity: params.severity || 'medium',
      message: params.message || 'Unknown error',
      stack: params.stack,
      source: params.source,
      line: params.line,
      column: params.column,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: {
        sessionId: this.getSessionId(),
        deviceInfo: this.getDeviceInfo(),
        memoryUsage: this.getMemoryUsage(),
        timestamp: Date.now(),
        ...params.context
      }
    };
  }

  private async handleError(error: ErrorDetails): Promise<void> {
    // Add to error collection
    this.errors.push(error);
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }
    
    // Check for error flooding
    if (this.isErrorFlooding(error)) {
      console.warn('🚨 Error flooding detected, implementing rate limiting');
      return;
    }
    
    // Log error
    if (this.config.debugMode) {
      console.error('🚨 Error captured:', error);
    }
    
    // Attempt recovery if enabled
    if (this.config.enableRecovery && !this.isInRecovery) {
      await this.attemptRecovery(error);
    }
    
    // Create crash report if critical
    if (error.severity === 'critical' || this.errors.length > this.config.maxErrorsPerSession) {
      await this.createCrashReport();
    }
    
    // Report error if enabled
    if (this.config.enableCrashReporting) {
      await this.reportError(error);
    }
    
    // Trigger graceful degradation if needed
    if (this.shouldDegradeGracefully(error)) {
      this.triggerGracefulDegradation(error);
    }
  }

  private isErrorFlooding(error: ErrorDetails): boolean {
    const errorKey = `${error.type}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    const lastTime = this.lastErrorTime.get(errorKey) || 0;
    const now = Date.now();
    
    // Reset count if enough time has passed
    if (now - lastTime > 60000) { // 1 minute
      this.errorCounts.set(errorKey, 1);
    } else {
      this.errorCounts.set(errorKey, count + 1);
    }
    
    this.lastErrorTime.set(errorKey, now);
    
    return this.errorCounts.get(errorKey)! > 10; // More than 10 of same error in 1 minute
  }

  private async attemptRecovery(error: ErrorDetails): Promise<void> {
    if (this.isInRecovery) return;
    
    this.isInRecovery = true;
    
    try {
      for (const [name, strategy] of this.recoveryStrategies) {
        if (strategy.condition(error)) {
          const recoveryCount = this.errorCounts.get(`recovery:${name}`) || 0;
          
          if (recoveryCount < strategy.maxAttempts) {
            console.log(`🔄 Attempting recovery strategy: ${name}`);
            
            const success = await strategy.handler(error);
            
            error.recovery = {
              attempted: true,
              successful: success,
              strategy: name,
              attemptCount: recoveryCount + 1
            };
            
            this.errorCounts.set(`recovery:${name}`, recoveryCount + 1);
            
            if (success) {
              console.log(`✅ Recovery successful: ${name}`);
              break;
            } else if (strategy.fallbackStrategy) {
              console.log(`🔄 Trying fallback strategy: ${strategy.fallbackStrategy}`);
              await this.triggerFallbackStrategy(strategy.fallbackStrategy);
            }
          }
        }
      }
    } finally {
      setTimeout(() => {
        this.isInRecovery = false;
      }, this.RECOVERY_COOLDOWN);
    }
  }

  private async triggerFallbackStrategy(strategy: string): Promise<void> {
    switch (strategy) {
      case 'cpu_fallback':
        window.dispatchEvent(new CustomEvent('ml-cpu-fallback'));
        break;
      case 'image_upload_mode':
        window.dispatchEvent(new CustomEvent('camera-fallback-upload'));
        break;
      case 'cpu_rendering':
        window.dispatchEvent(new CustomEvent('webgl-cpu-fallback'));
        break;
      case 'offline_mode':
        window.dispatchEvent(new CustomEvent('network-offline-mode'));
        break;
    }
  }

  private shouldDegradeGracefully(error: ErrorDetails): boolean {
    if (!this.config.gracefulDegradation) return false;
    
    const criticalErrors = this.errors.filter(e => 
      e.severity === 'critical' && 
      Date.now() - e.timestamp < 60000 // Last minute
    );
    
    return criticalErrors.length >= 3 || error.severity === 'critical';
  }

  private triggerGracefulDegradation(error: ErrorDetails): void {
    console.warn('🔧 Triggering graceful degradation');
    
    // Disable non-essential features
    window.dispatchEvent(new CustomEvent('app-degrade', {
      detail: {
        reason: error.type,
        disableFeatures: ['realtime-detection', 'advanced-analytics', 'background-sync']
      }
    }));
    
    // Show fallback UI if enabled
    if (this.config.fallbackUI) {
      this.showFallbackUI(error);
    }
  }

  private showFallbackUI(error: ErrorDetails): void {
    // Create simple fallback UI
    const fallbackDiv = document.createElement('div');
    fallbackDiv.id = 'error-fallback';
    fallbackDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fee;
      border: 1px solid #fcc;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      max-width: 300px;
    `;
    
    fallbackDiv.innerHTML = `
      <h4>⚠️ System Error</h4>
      <p>Some features may be temporarily unavailable. Please refresh the page or try again later.</p>
      <button onclick="location.reload()">Refresh Page</button>
      <button onclick="this.parentElement.remove()">Dismiss</button>
    `;
    
    document.body.appendChild(fallbackDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (fallbackDiv.parentElement) {
        fallbackDiv.remove();
      }
    }, 10000);
  }

  private async createCrashReport(): Promise<void> {
    const report: CrashReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      errors: [...this.errors],
      systemState: {
        memoryUsage: this.getMemoryUsage(),
        performance: this.getPerformanceInfo(),
        networkState: navigator.onLine ? 'online' : 'offline',
        deviceCapabilities: this.getDeviceInfo()
      },
      userActions: [...this.userActions],
      recoveryAttempts: this.getRecoveryAttemptCount(),
      finalState: this.determineFinalState()
    };
    
    this.crashReports.push(report);
    if (this.crashReports.length > this.MAX_CRASH_REPORTS) {
      this.crashReports.shift();
    }
    
    console.warn('📊 Crash report created:', report.id);
  }

  private async reportError(error: ErrorDetails): Promise<void> {
    if (!this.config.reportingEndpoint) return;
    
    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error,
          sessionInfo: {
            sessionId: this.getSessionId(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now()
          }
        })
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getPerformanceInfo(): any {
    return {
      timing: performance.timing,
      navigation: performance.navigation,
      now: performance.now()
    };
  }

  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error_boundary_session');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('error_boundary_session', sessionId);
    }
    return sessionId;
  }

  private getRecoveryAttemptCount(): number {
    return Array.from(this.errorCounts.keys())
      .filter(key => key.startsWith('recovery:'))
      .reduce((total, key) => total + (this.errorCounts.get(key) || 0), 0);
  }

  private determineFinalState(): CrashReport['finalState'] {
    const recentErrors = this.errors.filter(e => Date.now() - e.timestamp < 60000);
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical');
    
    if (criticalErrors.length >= 3) return 'crashed';
    if (recentErrors.length >= 10) return 'degraded';
    return 'recovered';
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API
  
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.type, strategy);
  }

  captureError(type: ErrorDetails['type'], message: string, context?: any): void {
    const error = this.createErrorDetails({
      type,
      message,
      severity: 'medium',
      context
    });
    
    this.handleError(error);
  }

  getErrorSummary(): {
    totalErrors: number;
    recentErrors: number;
    criticalErrors: number;
    recoveryRate: number;
  } {
    const recentErrors = this.errors.filter(e => Date.now() - e.timestamp < 300000); // 5 minutes
    const criticalErrors = this.errors.filter(e => e.severity === 'critical');
    const successfulRecoveries = this.errors.filter(e => e.recovery?.successful).length;
    const attemptedRecoveries = this.errors.filter(e => e.recovery?.attempted).length;
    
    return {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      criticalErrors: criticalErrors.length,
      recoveryRate: attemptedRecoveries > 0 ? successfulRecoveries / attemptedRecoveries : 0
    };
  }

  getCrashReports(): CrashReport[] {
    return [...this.crashReports];
  }

  clearErrorHistory(): void {
    this.errors = [];
    this.crashReports = [];
    this.userActions = [];
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    console.log('🧹 Error history cleared');
  }

  updateConfig(newConfig: Partial<ErrorBoundaryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  dispose(): void {
    this.clearErrorHistory();
    console.log('🛡️ Error boundary system disposed');
  }
}

// Global instance for easy access
export const errorBoundary = new ErrorBoundarySystem(); 