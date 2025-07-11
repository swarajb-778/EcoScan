/**
 * System Health Monitoring for EcoScan
 * Continuously monitors application health, performance, and system resources
 */

import { diagnostic } from './diagnostic.js';
import { onnxManager } from '../ml/onnx-config.js';
import { errorRecovery } from './error-recovery.js';
import { testingFramework } from './testing-framework.js';

export interface SystemHealthMetrics {
  overall: {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    timestamp: number;
  };
  performance: {
    score: number;
    memoryUsage: number;
    inferenceTime: number;
    frameRate: number;
    cpuUsage: number;
  };
  stability: {
    score: number;
    errorRate: number;
    recoveryRate: number;
    uptime: number;
    crashCount: number;
  };
  functionality: {
    score: number;
    onnxReady: boolean;
    cameraReady: boolean;
    classifierReady: boolean;
    detectorReady: boolean;
  };
  resources: {
    score: number;
    memoryPressure: 'low' | 'medium' | 'high' | 'critical';
    batteryLevel: number;
    networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
    thermalState: 'normal' | 'fair' | 'serious' | 'critical';
  };
}

export interface HealthAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  category: 'performance' | 'stability' | 'functionality' | 'resources';
  autoResolve: boolean;
  actions: string[];
}

class SystemHealthMonitor {
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthHistory: SystemHealthMetrics[] = [];
  private alerts: HealthAlert[] = [];
  private startTime = Date.now();
  private errorCount = 0;
  private recoveryCount = 0;
  private crashCount = 0;
  private lastHealthCheck = 0;

  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private readonly HISTORY_LIMIT = 100;
  private readonly ALERT_LIMIT = 50;

  start(): void {
    if (this.isMonitoring) {
      diagnostic.logWarning('System health monitoring already running', 'SystemHealthMonitor');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    
    diagnostic.logWarning('Starting system health monitoring', 'SystemHealthMonitor');
    
    // Initial health check
    this.performHealthCheck();
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.MONITORING_INTERVAL);

    // Listen for error events
    this.setupErrorListeners();
  }

  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    diagnostic.logWarning('System health monitoring stopped', 'SystemHealthMonitor');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const metrics = await this.collectHealthMetrics();
      
      // Add to history
      this.healthHistory.push(metrics);
      if (this.healthHistory.length > this.HISTORY_LIMIT) {
        this.healthHistory.shift();
      }

      // Check for alerts
      this.checkForAlerts(metrics);
      
      // Log health status
      this.logHealthStatus(metrics);
      
      this.lastHealthCheck = Date.now();
      
    } catch (error) {
      diagnostic.logError(`Health check failed: ${error}`, 'SystemHealthMonitor');
      this.errorCount++;
    }
  }

  private async collectHealthMetrics(): Promise<SystemHealthMetrics> {
    const [performance, stability, functionality, resources] = await Promise.all([
      this.collectPerformanceMetrics(),
      this.collectStabilityMetrics(),
      this.collectFunctionalityMetrics(),
      this.collectResourceMetrics()
    ]);

    // Calculate overall score
    const scores = [performance.score, stability.score, functionality.score, resources.score];
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const overall = {
      score: Math.round(overallScore),
      status: this.getHealthStatus(overallScore),
      timestamp: Date.now()
    };

    return {
      overall,
      performance,
      stability,
      functionality,
      resources
    };
  }

  private async collectPerformanceMetrics(): Promise<SystemHealthMetrics['performance']> {
    let memoryUsage = 0;
    let cpuUsage = 0;
    
    // Get memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Estimate CPU usage (simplified)
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      Math.random();
    }
    const cpuTime = performance.now() - start;
    cpuUsage = Math.min(100, cpuTime / 10); // Rough estimation

    // Get recent performance data
    let inferenceTime = 50; // Default
    let frameRate = 30; // Default
    
    // Calculate performance score
    let score = 100;
    if (memoryUsage > 100) score -= 20; // Memory pressure
    if (cpuUsage > 80) score -= 20; // High CPU usage
    if (inferenceTime > 200) score -= 20; // Slow inference
    if (frameRate < 15) score -= 20; // Low frame rate
    
    return {
      score: Math.max(0, score),
      memoryUsage,
      inferenceTime,
      frameRate,
      cpuUsage
    };
  }

  private collectStabilityMetrics(): SystemHealthMetrics['stability'] {
    const uptime = Date.now() - this.startTime;
    const totalOperations = this.errorCount + this.recoveryCount + 100; // Add base operations
    const errorRate = (this.errorCount / totalOperations) * 100;
    const recoveryRate = this.errorCount > 0 ? (this.recoveryCount / this.errorCount) * 100 : 100;

    // Calculate stability score
    let score = 100;
    if (errorRate > 10) score -= 30; // High error rate
    if (recoveryRate < 50) score -= 20; // Low recovery rate
    if (this.crashCount > 0) score -= 25; // Any crashes
    if (uptime < 60000) score -= 10; // Short uptime

    return {
      score: Math.max(0, score),
      errorRate,
      recoveryRate,
      uptime,
      crashCount: this.crashCount
    };
  }

  private async collectFunctionalityMetrics(): Promise<SystemHealthMetrics['functionality']> {
    const onnxReady = onnxManager.isReady();
    
    // Check camera availability
    let cameraReady = false;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraReady = devices.some(d => d.kind === 'videoinput');
      }
    } catch (error) {
      diagnostic.logWarning(`Camera check failed: ${error}`, 'SystemHealthMonitor');
    }

    // Simulate classifier and detector checks (would be real in production)
    const classifierReady = true; // Would check actual classifier state
    const detectorReady = onnxReady; // Detector depends on ONNX

    // Calculate functionality score
    const components = [onnxReady, cameraReady, classifierReady, detectorReady];
    const readyCount = components.filter(Boolean).length;
    const score = (readyCount / components.length) * 100;

    return {
      score,
      onnxReady,
      cameraReady,
      classifierReady,
      detectorReady
    };
  }

  private async collectResourceMetrics(): Promise<SystemHealthMetrics['resources']> {
    let memoryPressure: SystemHealthMetrics['resources']['memoryPressure'] = 'low';
    let batteryLevel = 1;
    let networkQuality: SystemHealthMetrics['resources']['networkQuality'] = 'excellent';
    let thermalState: SystemHealthMetrics['resources']['thermalState'] = 'normal';

    // Check memory pressure
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      if (usageRatio > 0.9) memoryPressure = 'critical';
      else if (usageRatio > 0.7) memoryPressure = 'high';
      else if (usageRatio > 0.5) memoryPressure = 'medium';
    }

    // Check battery level
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        batteryLevel = battery.level;
      }
    } catch (error) {
      // Battery API not available or failed
    }

    // Check network quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g') networkQuality = 'excellent';
      else if (effectiveType === '3g') networkQuality = 'good';
      else if (effectiveType === '2g') networkQuality = 'fair';
      else networkQuality = 'poor';
    }

    // Estimate thermal state based on performance indicators
    // This is a simplified estimation since there's no direct thermal API
    const cpuStart = performance.now();
    for (let i = 0; i < 50000; i++) {
      Math.random();
    }
    const cpuTime = performance.now() - cpuStart;
    
    if (cpuTime > 100) thermalState = 'critical';
    else if (cpuTime > 50) thermalState = 'serious';
    else if (cpuTime > 25) thermalState = 'fair';
    // else remains 'normal'

    // Calculate resources score
    let score = 100;
    if (memoryPressure === 'critical') score -= 40;
    else if (memoryPressure === 'high') score -= 25;
    else if (memoryPressure === 'medium') score -= 10;
    
    if (batteryLevel < 0.1) score -= 20; // Very low battery
    else if (batteryLevel < 0.2) score -= 10; // Low battery
    
    if (networkQuality === 'poor') score -= 20;
    else if (networkQuality === 'fair') score -= 10;
    
    if (thermalState === 'critical') score -= 30;
    else if (thermalState === 'serious') score -= 20;
    else if (thermalState === 'fair') score -= 10;

    return {
      score: Math.max(0, score),
      memoryPressure,
      batteryLevel,
      networkQuality,
      thermalState
    };
  }

  private getHealthStatus(score: number): SystemHealthMetrics['overall']['status'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  private checkForAlerts(metrics: SystemHealthMetrics): void {
    const alerts: HealthAlert[] = [];

    // Performance alerts
    if (metrics.performance.score < 50) {
      alerts.push({
        id: `perf-${Date.now()}`,
        type: 'warning',
        title: 'Performance Degradation',
        message: `Performance score is ${metrics.performance.score}%. Consider closing other applications.`,
        timestamp: Date.now(),
        category: 'performance',
        autoResolve: true,
        actions: ['reduce-quality', 'force-cpu-inference']
      });
    }

    // Memory pressure alerts
    if (metrics.resources.memoryPressure === 'critical') {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'critical',
        title: 'Critical Memory Pressure',
        message: 'System is running very low on memory. Application may become unstable.',
        timestamp: Date.now(),
        category: 'resources',
        autoResolve: false,
        actions: ['clear-browser-cache', 'reduce-quality']
      });
    }

    // Functionality alerts
    if (!metrics.functionality.onnxReady) {
      alerts.push({
        id: `onnx-${Date.now()}`,
        type: 'error',
        title: 'ONNX Runtime Not Ready',
        message: 'AI models are not available. Object detection will not work.',
        timestamp: Date.now(),
        category: 'functionality',
        autoResolve: false,
        actions: ['clear-onnx-cache', 'reload-wasm-files']
      });
    }

    // Stability alerts
    if (metrics.stability.errorRate > 20) {
      alerts.push({
        id: `stability-${Date.now()}`,
        type: 'error',
        title: 'High Error Rate',
        message: `Error rate is ${metrics.stability.errorRate.toFixed(1)}%. System may be unstable.`,
        timestamp: Date.now(),
        category: 'stability',
        autoResolve: true,
        actions: ['restart-camera', 'clear-browser-cache']
      });
    }

    // Add new alerts
    for (const alert of alerts) {
      this.addAlert(alert);
    }
  }

  private addAlert(alert: HealthAlert): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a => 
      a.category === alert.category && 
      a.type === alert.type &&
      Date.now() - a.timestamp < 300000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't add duplicate alerts
    }

    this.alerts.push(alert);
    
    // Limit alert history
    if (this.alerts.length > this.ALERT_LIMIT) {
      this.alerts.shift();
    }

    // Log alert
    const logLevel = alert.type === 'critical' ? 'error' : 'warning';
    diagnostic[logLevel === 'error' ? 'logError' : 'logWarning'](
      `Health Alert: ${alert.title} - ${alert.message}`,
      'SystemHealthMonitor'
    );
  }

  private logHealthStatus(metrics: SystemHealthMetrics): void {
    const { overall } = metrics;
    const statusEmoji = {
      excellent: '🟢',
      good: '🟡',
      fair: '🟠',
      poor: '🔴',
      critical: '💀'
    };

    diagnostic.logWarning(
      `${statusEmoji[overall.status]} System Health: ${overall.score}% (${overall.status})`,
      'SystemHealthMonitor'
    );
  }

  private setupErrorListeners(): void {
    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      this.errorCount++;
      diagnostic.logError(`Unhandled error: ${event.error?.message || event.message}`, 'SystemHealthMonitor');
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errorCount++;
      diagnostic.logError(`Unhandled promise rejection: ${event.reason}`, 'SystemHealthMonitor');
    });

    // Listen for recovery events
    window.addEventListener('error-recovered', () => {
      this.recoveryCount++;
    });
  }

  // Public API
  getCurrentHealth(): SystemHealthMetrics | null {
    return this.healthHistory[this.healthHistory.length - 1] || null;
  }

  getHealthHistory(): SystemHealthMetrics[] {
    return [...this.healthHistory];
  }

  getActiveAlerts(): HealthAlert[] {
    const now = Date.now();
    return this.alerts.filter(alert => {
      // Remove old auto-resolve alerts
      if (alert.autoResolve && now - alert.timestamp > 600000) { // 10 minutes
        return false;
      }
      return true;
    });
  }

  dismissAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  async runHealthCheck(): Promise<SystemHealthMetrics> {
    const metrics = await this.collectHealthMetrics();
    this.healthHistory.push(metrics);
    return metrics;
  }

  async runQuickDiagnostic(): Promise<{ passed: boolean; issues: string[] }> {
    try {
      const quickTest = await testingFramework.runQuickTest();
      const currentHealth = await this.runHealthCheck();
      
      const issues: string[] = [];
      
      if (!quickTest.passed) {
        issues.push(quickTest.summary);
      }
      
      if (currentHealth.overall.score < 60) {
        issues.push(`System health score is low: ${currentHealth.overall.score}%`);
      }
      
      if (!currentHealth.functionality.onnxReady) {
        issues.push('ONNX Runtime is not ready');
      }
      
      if (!currentHealth.functionality.cameraReady) {
        issues.push('Camera is not available');
      }
      
      return {
        passed: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        passed: false,
        issues: [`Diagnostic failed: ${error}`]
      };
    }
  }

  generateHealthReport(): any {
    const current = this.getCurrentHealth();
    const history = this.getHealthHistory();
    const alerts = this.getActiveAlerts();

    return {
      current,
      trends: this.calculateTrends(history),
      alerts: alerts.map(alert => ({
        ...alert,
        age: Date.now() - alert.timestamp
      })),
      summary: {
        monitoringDuration: Date.now() - this.startTime,
        totalChecks: history.length,
        averageScore: history.length > 0 
          ? history.reduce((sum, h) => sum + h.overall.score, 0) / history.length 
          : 0,
        errorCount: this.errorCount,
        recoveryCount: this.recoveryCount,
        crashCount: this.crashCount
      }
    };
  }

  private calculateTrends(history: SystemHealthMetrics[]): any {
    if (history.length < 2) return null;

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, h) => sum + h.overall.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.overall.score, 0) / older.length;

    return {
      direction: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
      change: recentAvg - olderAvg,
      recentAverage: recentAvg,
      olderAverage: olderAvg
    };
  }
}

// Singleton instance
export const systemHealth = new SystemHealthMonitor(); 