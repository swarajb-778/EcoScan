/**
 * Comprehensive Diagnostic System for EcoScan
 * Helps identify and troubleshoot application issues
 */

import { browser } from '$app/environment';

export interface DiagnosticReport {
  timestamp: string;
  browser: {
    name: string;
    version: string;
    userAgent: string;
    platform: string;
  };
  device: {
    memory: number;
    cores: number;
    touchPoints: number;
    pixelRatio: number;
  };
  features: {
    webgl: boolean;
    webrtc: boolean;
    webworkers: boolean;
    onnx: boolean;
    camera: boolean;
    microphone: boolean;
  };
  network: {
    online: boolean;
    connection: string;
    effectiveType: string;
  };
  errors: string[];
  warnings: string[];
  performance: {
    loadTime: number;
    memoryUsage: number;
  };
}

class DiagnosticSystem {
  private errors: string[] = [];
  private warnings: string[] = [];
  private startTime: number = Date.now();

  logError(error: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const fullError = context ? `[${context}] ${error}` : error;
    this.errors.push(`${timestamp}: ${fullError}`);
    console.error(`🔴 [DIAGNOSTIC] ${fullError}`);
  }

  logWarning(warning: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const fullWarning = context ? `[${context}] ${warning}` : warning;
    this.warnings.push(`${timestamp}: ${fullWarning}`);
    console.warn(`🟡 [DIAGNOSTIC] ${fullWarning}`);
  }

  async generateReport(): Promise<DiagnosticReport> {
    if (!browser) {
      return this.getSSRReport();
    }

    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo(),
      device: this.getDeviceInfo(),
      features: await this.checkFeatureSupport(),
      network: this.getNetworkInfo(),
      errors: [...this.errors],
      warnings: [...this.warnings],
      performance: {
        loadTime: Date.now() - this.startTime,
        memoryUsage: this.getMemoryUsage()
      }
    };

    console.log('📊 Diagnostic Report Generated:', report);
    return report;
  }

  private getSSRReport(): DiagnosticReport {
    return {
      timestamp: new Date().toISOString(),
      browser: { name: 'SSR', version: 'N/A', userAgent: 'N/A', platform: 'N/A' },
      device: { memory: 0, cores: 0, touchPoints: 0, pixelRatio: 1 },
      features: { webgl: false, webrtc: false, webworkers: false, onnx: false, camera: false, microphone: false },
      network: { online: false, connection: 'N/A', effectiveType: 'N/A' },
      errors: [...this.errors],
      warnings: [...this.warnings],
      performance: { loadTime: 0, memoryUsage: 0 }
    };
  }

  private getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      name = 'Edge';
      version = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      name,
      version,
      userAgent,
      platform: navigator.platform
    };
  }

  private getDeviceInfo() {
    const nav = navigator as any;
    return {
      memory: nav.deviceMemory || 0,
      cores: nav.hardwareConcurrency || 0,
      touchPoints: nav.maxTouchPoints || 0,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  private async checkFeatureSupport() {
    const features = {
      webgl: this.checkWebGL(),
      webrtc: this.checkWebRTC(),
      webworkers: this.checkWebWorkers(),
      onnx: await this.checkONNX(),
      camera: await this.checkCamera(),
      microphone: await this.checkMicrophone()
    };

    return features;
  }

  private checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  private checkWebRTC(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private checkWebWorkers(): boolean {
    return typeof Worker !== 'undefined';
  }

  private async checkONNX(): Promise<boolean> {
    try {
      // Try to import onnxruntime-web
      const ort = await import('onnxruntime-web');
      return !!ort;
    } catch {
      return false;
    }
  }

  private async checkCamera(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  private async checkMicrophone(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch {
      return false;
    }
  }

  private getNetworkInfo() {
    const nav = navigator as any;
    return {
      online: navigator.onLine,
      connection: nav.connection?.type || 'unknown',
      effectiveType: nav.connection?.effectiveType || 'unknown'
    };
  }

  private getMemoryUsage(): number {
    const perf = performance as any;
    if (perf.memory) {
      return perf.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  clearLogs(): void {
    this.errors = [];
    this.warnings = [];
  }
}

export const diagnostic = new DiagnosticSystem(); 