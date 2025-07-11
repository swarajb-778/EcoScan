/**
 * Application Health Monitor
 * Tracks overall application health and provides status reporting
 */

import { browser } from '$app/environment';
import { diagnostic } from './diagnostic.js';
import { onnxManager } from '../ml/onnx-config.js';
import { performanceOptimizer } from './performance-optimizer.js';
import { errorRecovery } from './error-recovery.js';

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    onnx: 'ready' | 'loading' | 'error';
    camera: 'available' | 'unavailable' | 'permission_denied';
    performance: 'optimal' | 'degraded' | 'poor';
    network: 'online' | 'offline' | 'slow';
    memory: 'normal' | 'high' | 'critical';
  };
  metrics: {
    uptime: number;
    errorRate: number;
    recoveryRate: number;
    performanceScore: number;
  };
  lastUpdated: number;
}

class AppHealthMonitor {
  private healthStatus: HealthStatus;
  private startTime: number = Date.now();
  private healthCheckInterval?: NodeJS.Timeout;
  private errorCount = 0;
  private recoveryCount = 0;

  constructor() {
    this.healthStatus = this.getInitialHealthStatus();
    
    if (browser) {
      this.startHealthMonitoring();
    }
  }

  private getInitialHealthStatus(): HealthStatus {
    return {
      overall: 'healthy',
      components: {
        onnx: 'loading',
        camera: 'unavailable',
        performance: 'optimal',
        network: 'online',
        memory: 'normal'
      },
      metrics: {
        uptime: 0,
        errorRate: 0,
        recoveryRate: 0,
        performanceScore: 100
      },
      lastUpdated: Date.now()
    };
  }

  private startHealthMonitoring(): void {
    // Initial health check
    this.performHealthCheck();
    
    // Schedule regular health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds

    diagnostic.logWarning('App health monitoring started', 'AppHealthMonitor');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check ONNX Runtime status
      this.healthStatus.components.onnx = onnxManager.isReady() ? 'ready' : 'error';
      
      // Check camera availability
      this.healthStatus.components.camera = await this.checkCameraStatus();
      
      // Check performance
      this.healthStatus.components.performance = this.checkPerformanceStatus();
      
      // Check network
      this.healthStatus.components.network = await this.checkNetworkStatus();
      
      // Check memory usage
      this.healthStatus.components.memory = this.checkMemoryStatus();
      
      // Update metrics
      this.updateMetrics();
      
      // Calculate overall health
      this.healthStatus.overall = this.calculateOverallHealth();
      
      this.healthStatus.lastUpdated = Date.now();
      
      diagnostic.logWarning(`Health check complete: ${this.healthStatus.overall}`, 'AppHealthMonitor');
    } catch (error) {
      diagnostic.logError(`Health check failed: ${error}`, 'AppHealthMonitor');
      this.healthStatus.overall = 'critical';
    }
  }

  private async checkCameraStatus(): Promise<'available' | 'unavailable' | 'permission_denied'> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'unavailable';
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera) {
        return 'unavailable';
      }

      // Try to check permissions (this is limited by browser security)
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissions.state === 'denied') {
          return 'permission_denied';
        }
      } catch {
        // Permission API not available, assume available
      }

      return 'available';
    } catch (error) {
      diagnostic.logError(`Camera status check failed: ${error}`, 'AppHealthMonitor');
      return 'unavailable';
    }
  }

  private checkPerformanceStatus(): 'optimal' | 'degraded' | 'poor' {
    const profile = performanceOptimizer.getDeviceProfile();
    const settings = performanceOptimizer.getCurrentSettings();
    
    if (profile.tier === 'high' && settings.maxFPS >= 30) {
      return 'optimal';
    } else if (profile.tier === 'medium' || settings.maxFPS >= 20) {
      return 'degraded';
    } else {
      return 'poor';
    }
  }

  private async checkNetworkStatus(): Promise<'online' | 'offline' | 'slow'> {
    if (!navigator.onLine) {
      return 'offline';
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return 'offline';
      }
      
      return responseTime > 3000 ? 'slow' : 'online';
    } catch {
      return 'offline';
    }
  }

  private checkMemoryStatus(): 'normal' | 'high' | 'critical' {
    const perf = performance as any;
    if (!perf.memory) {
      return 'normal'; // Can't measure, assume normal
    }

    const memInfo = perf.memory;
    const usageRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
    
    if (usageRatio > 0.9) {
      return 'critical';
    } else if (usageRatio > 0.7) {
      return 'high';
    } else {
      return 'normal';
    }
  }

  private updateMetrics(): void {
    const currentTime = Date.now();
    this.healthStatus.metrics.uptime = currentTime - this.startTime;
    
    // Calculate error rate (errors per hour)
    const hoursRunning = this.healthStatus.metrics.uptime / (1000 * 60 * 60);
    this.healthStatus.metrics.errorRate = hoursRunning > 0 ? this.errorCount / hoursRunning : 0;
    
    // Calculate recovery rate
    this.healthStatus.metrics.recoveryRate = this.errorCount > 0 ? 
      (this.recoveryCount / this.errorCount) * 100 : 100;
    
    // Calculate performance score
    const performanceWeights = {
      onnx: 30,
      camera: 25,
      performance: 20,
      network: 15,
      memory: 10
    };
    
    let score = 0;
    Object.entries(this.healthStatus.components).forEach(([component, status]) => {
      const weight = performanceWeights[component as keyof typeof performanceWeights];
      let componentScore = 0;
      
      switch (status) {
        case 'ready':
        case 'available':
        case 'optimal':
        case 'online':
        case 'normal':
          componentScore = 100;
          break;
        case 'loading':
        case 'degraded':
        case 'slow':
        case 'high':
          componentScore = 50;
          break;
        default:
          componentScore = 0;
      }
      
      score += (componentScore * weight) / 100;
    });
    
    this.healthStatus.metrics.performanceScore = Math.round(score);
  }

  private calculateOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const { components, metrics } = this.healthStatus;
    
    // Critical if any critical component fails
    if (components.onnx === 'error' || components.memory === 'critical') {
      return 'critical';
    }
    
    // Degraded if performance score is low
    if (metrics.performanceScore < 60) {
      return 'degraded';
    }
    
    // Degraded if multiple components have issues
    const issueCount = Object.values(components).filter(status => 
      !['ready', 'available', 'optimal', 'online', 'normal'].includes(status)
    ).length;
    
    if (issueCount >= 2) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  // Public API
  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  recordError(): void {
    this.errorCount++;
    diagnostic.logWarning(`Error recorded. Total errors: ${this.errorCount}`, 'AppHealthMonitor');
  }

  recordRecovery(): void {
    this.recoveryCount++;
    diagnostic.logWarning(`Recovery recorded. Total recoveries: ${this.recoveryCount}`, 'AppHealthMonitor');
  }

  forceHealthCheck(): Promise<void> {
    return this.performHealthCheck();
  }

  generateHealthReport(): any {
    const recoveryStats = errorRecovery.generateRecoveryReport();
    const optimizationReport = performanceOptimizer.generateOptimizationReport();
    
    return {
      timestamp: new Date().toISOString(),
      health: this.healthStatus,
      recovery: recoveryStats,
      optimization: optimizationReport,
      diagnostics: {
        startTime: this.startTime,
        totalErrors: this.errorCount,
        totalRecoveries: this.recoveryCount,
        uptimeHours: this.healthStatus.metrics.uptime / (1000 * 60 * 60)
      }
    };
  }

  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    diagnostic.logWarning('App health monitoring stopped', 'AppHealthMonitor');
  }
}

export const appHealthMonitor = new AppHealthMonitor(); 