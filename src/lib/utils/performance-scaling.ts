/**
 * Real-Time Performance Scaling System
 * Monitors device capabilities and adjusts performance dynamically
 */

export interface DeviceCapabilities {
  cpuCores: number;
  deviceMemory: number; // GB
  maxTouchPoints: number;
  connectionType: string;
  effectiveType: string;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  userAgent: string;
  platform: string;
}

export interface ThermalState {
  state: 'nominal' | 'fair' | 'serious' | 'critical';
  temperature?: number;
  throttlingActive: boolean;
  timestamp: number;
}

export interface BatteryInfo {
  level: number; // 0-1
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  lowBattery: boolean;
}

export interface PerformanceProfile {
  name: string;
  mlModelSize: 'nano' | 'micro' | 'small' | 'medium' | 'large';
  inferenceFrequency: number; // FPS
  imageResolution: { width: number; height: number };
  qualitySettings: {
    enableGPU: boolean;
    useWebGL: boolean;
    enableMultithreading: boolean;
    enableOptimizations: boolean;
  };
  uiSettings: {
    animationsEnabled: boolean;
    reducedMotion: boolean;
    simplifiedUI: boolean;
    backgroundProcessing: boolean;
  };
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuMemoryUsage?: number;
  cpuUsage: number;
  thermalState: ThermalState;
  batteryLevel: number;
  timestamp: number;
}

class PerformanceScaling {
  private deviceCapabilities: DeviceCapabilities;
  private currentProfile: PerformanceProfile;
  private thermalState: ThermalState;
  private batteryInfo: BatteryInfo | null = null;
  private performanceMetrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  
  // Performance monitoring
  private observer: PerformanceObserver | null = null;
  private thermalMonitor: any = null;
  private batteryMonitor: any = null;
  private memoryMonitor: NodeJS.Timeout | null = null;
  
  // Adaptive thresholds
  private readonly fpsThreshold = { low: 15, target: 30, high: 60 };
  private readonly memoryThreshold = { low: 0.7, critical: 0.9 };
  private readonly batteryThreshold = { low: 0.2, critical: 0.1 };
  
  // Callbacks
  private onProfileChangeCallback: ((profile: PerformanceProfile) => void) | null = null;
  private onMetricsUpdateCallback: ((metrics: PerformanceMetrics) => void) | null = null;
  
  constructor() {
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.thermalState = { state: 'nominal', throttlingActive: false, timestamp: Date.now() };
    this.currentProfile = this.selectInitialProfile();
    
    this.initializeMonitoring();
    console.log('[PerformanceScaling] Initialized with profile:', this.currentProfile.name);
  }

  /**
   * Detect device capabilities
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    const navigator = window.navigator as any;
    const screen = window.screen;
    
    return {
      cpuCores: navigator.hardwareConcurrency || 2,
      deviceMemory: navigator.deviceMemory || 2,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      connectionType: (navigator.connection?.type) || 'unknown',
      effectiveType: (navigator.connection?.effectiveType) || '4g',
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 2,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }

  /**
   * Select initial performance profile based on device capabilities
   */
  private selectInitialProfile(): PerformanceProfile {
    const { cpuCores, deviceMemory, userAgent } = this.deviceCapabilities;
    
    // Detect device class
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isLowEnd = cpuCores <= 2 || deviceMemory <= 2;
    const isHighEnd = cpuCores >= 8 && deviceMemory >= 8;
    
    if (isMobile && isLowEnd) {
      return this.getProfile('battery-saver');
    } else if (isHighEnd) {
      return this.getProfile('high-performance');
    } else if (isMobile) {
      return this.getProfile('mobile-optimized');
    } else {
      return this.getProfile('balanced');
    }
  }

  /**
   * Get predefined performance profile
   */
  private getProfile(profileName: string): PerformanceProfile {
    const profiles: Record<string, PerformanceProfile> = {
      'battery-saver': {
        name: 'Battery Saver',
        mlModelSize: 'nano',
        inferenceFrequency: 10,
        imageResolution: { width: 320, height: 240 },
        qualitySettings: {
          enableGPU: false,
          useWebGL: false,
          enableMultithreading: false,
          enableOptimizations: true
        },
        uiSettings: {
          animationsEnabled: false,
          reducedMotion: true,
          simplifiedUI: true,
          backgroundProcessing: false
        }
      },
      'mobile-optimized': {
        name: 'Mobile Optimized',
        mlModelSize: 'micro',
        inferenceFrequency: 15,
        imageResolution: { width: 480, height: 360 },
        qualitySettings: {
          enableGPU: true,
          useWebGL: true,
          enableMultithreading: false,
          enableOptimizations: true
        },
        uiSettings: {
          animationsEnabled: true,
          reducedMotion: false,
          simplifiedUI: false,
          backgroundProcessing: true
        }
      },
      'balanced': {
        name: 'Balanced',
        mlModelSize: 'small',
        inferenceFrequency: 20,
        imageResolution: { width: 640, height: 480 },
        qualitySettings: {
          enableGPU: true,
          useWebGL: true,
          enableMultithreading: true,
          enableOptimizations: true
        },
        uiSettings: {
          animationsEnabled: true,
          reducedMotion: false,
          simplifiedUI: false,
          backgroundProcessing: true
        }
      },
      'high-performance': {
        name: 'High Performance',
        mlModelSize: 'medium',
        inferenceFrequency: 30,
        imageResolution: { width: 800, height: 600 },
        qualitySettings: {
          enableGPU: true,
          useWebGL: true,
          enableMultithreading: true,
          enableOptimizations: false
        },
        uiSettings: {
          animationsEnabled: true,
          reducedMotion: false,
          simplifiedUI: false,
          backgroundProcessing: true
        }
      },
      'maximum': {
        name: 'Maximum',
        mlModelSize: 'large',
        inferenceFrequency: 60,
        imageResolution: { width: 1024, height: 768 },
        qualitySettings: {
          enableGPU: true,
          useWebGL: true,
          enableMultithreading: true,
          enableOptimizations: false
        },
        uiSettings: {
          animationsEnabled: true,
          reducedMotion: false,
          simplifiedUI: false,
          backgroundProcessing: true
        }
      }
    };
    
    return profiles[profileName] || profiles['balanced'];
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    this.startFPSMonitoring();
    this.startThermalMonitoring();
    this.startBatteryMonitoring();
    this.startMemoryMonitoring();
    
    // Start adaptive scaling
    this.isMonitoring = true;
    this.adaptiveScaling();
  }

  /**
   * Start FPS monitoring using Performance Observer
   */
  private startFPSMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              this.updateFPSMetrics(entry);
            }
          });
        });
        
        this.observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (error) {
        console.warn('[PerformanceScaling] PerformanceObserver not supported:', error);
      }
    }
    
    // Fallback: manual FPS calculation
    this.startManualFPSTracking();
  }

  /**
   * Manual FPS tracking using requestAnimationFrame
   */
  private startManualFPSTracking(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    
    const trackFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        // Update metrics
        this.updatePerformanceMetrics({ fps, frameTime: 1000 / fps });
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(trackFPS);
      }
    };
    
    requestAnimationFrame(trackFPS);
  }

  /**
   * Start thermal state monitoring
   */
  private startThermalMonitoring(): void {
    // Modern browsers with thermal API
    if ('devicethermalstate' in navigator) {
      navigator.addEventListener('devicethermalstatechange', (event: any) => {
        this.updateThermalState(event.state);
      });
    }
    
    // Fallback: CPU usage estimation
    this.startCPUMonitoring();
  }

  /**
   * Monitor CPU usage as thermal proxy
   */
  private startCPUMonitoring(): void {
    let lastTime = performance.now();
    let lastUsage = 0;
    
    const measureCPU = () => {
      const currentTime = performance.now();
      const timeDiff = currentTime - lastTime;
      
      // Estimate CPU usage based on frame timing inconsistencies
      const expectedFrameTime = 1000 / 60; // 60 FPS target
      const actualFrameTime = timeDiff;
      const cpuUsage = Math.min(100, (actualFrameTime / expectedFrameTime) * 100);
      
      // Detect thermal throttling
      if (cpuUsage > 80 && cpuUsage > lastUsage * 1.5) {
        this.updateThermalState('serious');
      } else if (cpuUsage > 60) {
        this.updateThermalState('fair');
      } else {
        this.updateThermalState('nominal');
      }
      
      lastTime = currentTime;
      lastUsage = cpuUsage;
      
      setTimeout(measureCPU, 5000); // Check every 5 seconds
    };
    
    measureCPU();
  }

  /**
   * Start battery monitoring
   */
  private startBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryMonitor = battery;
        this.updateBatteryInfo(battery);
        
        battery.addEventListener('chargingchange', () => this.updateBatteryInfo(battery));
        battery.addEventListener('levelchange', () => this.updateBatteryInfo(battery));
        battery.addEventListener('chargingtimechange', () => this.updateBatteryInfo(battery));
        battery.addEventListener('dischargingtimechange', () => this.updateBatteryInfo(battery));
      }).catch((error: any) => {
        console.warn('[PerformanceScaling] Battery API not available:', error);
      });
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memoryUsage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
        
        this.updatePerformanceMetrics({ memoryUsage });
        
        // Trigger garbage collection if memory usage is high
        if (memoryUsage > this.memoryThreshold.critical && 'gc' in window) {
          (window as any).gc();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Update thermal state
   */
  private updateThermalState(state: string): void {
    this.thermalState = {
      state: state as ThermalState['state'],
      throttlingActive: ['serious', 'critical'].includes(state),
      timestamp: Date.now()
    };
    
    console.log(`[PerformanceScaling] Thermal state changed to: ${state}`);
    this.triggerAdaptiveScaling();
  }

  /**
   * Update battery information
   */
  private updateBatteryInfo(battery: any): void {
    this.batteryInfo = {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
      lowBattery: battery.level < this.batteryThreshold.low
    };
    
    if (this.batteryInfo.lowBattery && !this.batteryInfo.charging) {
      console.log('[PerformanceScaling] Low battery detected, switching to power saving mode');
      this.triggerAdaptiveScaling();
    }
  }

  /**
   * Update FPS metrics from Performance Observer
   */
  private updateFPSMetrics(entry: PerformanceEntry): void {
    // Implementation depends on specific performance entry type
    if (entry.name === 'frame') {
      const frameTime = entry.duration;
      const fps = 1000 / frameTime;
      this.updatePerformanceMetrics({ fps, frameTime });
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    const currentMetrics: PerformanceMetrics = {
      fps: metrics.fps || 0,
      frameTime: metrics.frameTime || 0,
      memoryUsage: metrics.memoryUsage || 0,
      cpuUsage: metrics.cpuUsage || 0,
      thermalState: this.thermalState,
      batteryLevel: this.batteryInfo?.level || 1,
      timestamp: Date.now()
    };
    
    this.performanceMetrics.push(currentMetrics);
    
    // Keep only recent metrics (last 100 entries)
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
    
    this.onMetricsUpdateCallback?.(currentMetrics);
  }

  /**
   * Adaptive scaling logic
   */
  private adaptiveScaling(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      this.evaluateAndAdjustPerformance();
    }, 5000); // Evaluate every 5 seconds
  }

  /**
   * Trigger immediate adaptive scaling
   */
  private triggerAdaptiveScaling(): void {
    setTimeout(() => {
      this.evaluateAndAdjustPerformance();
    }, 100);
  }

  /**
   * Evaluate performance and adjust profile if needed
   */
  private evaluateAndAdjustPerformance(): void {
    const recentMetrics = this.performanceMetrics.slice(-5);
    if (recentMetrics.length === 0) return;
    
    const avgFPS = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
    
    let targetProfile = this.currentProfile.name;
    
    // Critical conditions - emergency downgrade
    if (this.thermalState.state === 'critical' || 
        (this.batteryInfo?.level || 1) < this.batteryThreshold.critical) {
      targetProfile = 'battery-saver';
    }
    // Serious thermal or low battery
    else if (this.thermalState.state === 'serious' || 
             (this.batteryInfo?.lowBattery && !this.batteryInfo?.charging)) {
      targetProfile = this.currentProfile.name === 'high-performance' ? 'balanced' : 'mobile-optimized';
    }
    // Performance degradation
    else if (avgFPS < this.fpsThreshold.low || avgMemory > this.memoryThreshold.critical) {
      targetProfile = this.downgradeProfile(this.currentProfile.name);
    }
    // Good performance - potential upgrade
    else if (avgFPS > this.fpsThreshold.high && 
             avgMemory < this.memoryThreshold.low && 
             this.thermalState.state === 'nominal' &&
             (this.batteryInfo?.level || 1) > this.batteryThreshold.low) {
      targetProfile = this.upgradeProfile(this.currentProfile.name);
    }
    
    if (targetProfile !== this.currentProfile.name) {
      this.switchProfile(targetProfile);
    }
  }

  /**
   * Downgrade to lower performance profile
   */
  private downgradeProfile(currentProfile: string): string {
    const profiles = ['battery-saver', 'mobile-optimized', 'balanced', 'high-performance', 'maximum'];
    const currentIndex = profiles.indexOf(currentProfile);
    
    if (currentIndex > 0) {
      return profiles[currentIndex - 1];
    }
    
    return currentProfile;
  }

  /**
   * Upgrade to higher performance profile
   */
  private upgradeProfile(currentProfile: string): string {
    const profiles = ['battery-saver', 'mobile-optimized', 'balanced', 'high-performance', 'maximum'];
    const currentIndex = profiles.indexOf(currentProfile);
    
    if (currentIndex < profiles.length - 1) {
      return profiles[currentIndex + 1];
    }
    
    return currentProfile;
  }

  /**
   * Switch to a different performance profile
   */
  switchProfile(profileName: string): void {
    const newProfile = this.getProfile(profileName);
    
    if (newProfile.name !== this.currentProfile.name) {
      const oldProfile = this.currentProfile;
      this.currentProfile = newProfile;
      
      console.log(`[PerformanceScaling] Switched from ${oldProfile.name} to ${newProfile.name}`);
      this.onProfileChangeCallback?.(newProfile);
    }
  }

  /**
   * Get current performance profile
   */
  getCurrentProfile(): PerformanceProfile {
    return { ...this.currentProfile };
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  /**
   * Get current thermal state
   */
  getThermalState(): ThermalState {
    return { ...this.thermalState };
  }

  /**
   * Get battery information
   */
  getBatteryInfo(): BatteryInfo | null {
    return this.batteryInfo ? { ...this.batteryInfo } : null;
  }

  /**
   * Get recent performance metrics
   */
  getPerformanceMetrics(count: number = 10): PerformanceMetrics[] {
    return this.performanceMetrics.slice(-count);
  }

  /**
   * Force profile change (manual override)
   */
  forceProfile(profileName: string): void {
    this.switchProfile(profileName);
  }

  /**
   * Set callbacks for profile changes and metrics updates
   */
  setCallbacks(
    onProfileChange: (profile: PerformanceProfile) => void,
    onMetricsUpdate: (metrics: PerformanceMetrics) => void
  ): void {
    this.onProfileChangeCallback = onProfileChange;
    this.onMetricsUpdateCallback = onMetricsUpdate;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    deviceInfo: DeviceCapabilities;
    currentProfile: PerformanceProfile;
    thermalState: ThermalState;
    batteryInfo: BatteryInfo | null;
    averageMetrics: {
      fps: number;
      memoryUsage: number;
      cpuUsage: number;
    };
    recommendations: string[];
  } {
    const recentMetrics = this.performanceMetrics.slice(-20);
    
    const averageMetrics = {
      fps: recentMetrics.reduce((sum, m) => sum + m.fps, 0) / Math.max(recentMetrics.length, 1),
      memoryUsage: recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / Math.max(recentMetrics.length, 1),
      cpuUsage: recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / Math.max(recentMetrics.length, 1)
    };
    
    const recommendations: string[] = [];
    
    if (averageMetrics.fps < this.fpsThreshold.target) {
      recommendations.push('Consider reducing image resolution or model complexity');
    }
    
    if (averageMetrics.memoryUsage > this.memoryThreshold.low) {
      recommendations.push('Memory usage is high, consider enabling optimizations');
    }
    
    if (this.thermalState.throttlingActive) {
      recommendations.push('Device is thermal throttling, reduce workload');
    }
    
    if (this.batteryInfo?.lowBattery) {
      recommendations.push('Low battery detected, enable power saving mode');
    }
    
    return {
      deviceInfo: this.deviceCapabilities,
      currentProfile: this.currentProfile,
      thermalState: this.thermalState,
      batteryInfo: this.batteryInfo,
      averageMetrics,
      recommendations
    };
  }
}

export const performanceScaling = new PerformanceScaling();
export default PerformanceScaling; 