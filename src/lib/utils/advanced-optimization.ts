/**
 * Advanced Optimization System for EcoScan
 * Automatically optimizes application performance based on device capabilities and real-time metrics
 */

import { diagnostic } from './diagnostic.js';
import { systemHealth } from './system-health.js';
import { performanceScaling } from './performance-scaling.js';

export interface OptimizationProfile {
  id: string;
  name: string;
  description: string;
  settings: {
    modelQuality: 'minimal' | 'low' | 'medium' | 'high' | 'ultra';
    inferenceFrequency: number; // FPS
    resolutionScale: number; // 0.1 - 1.0
    enableWebGL: boolean;
    enableMultithreading: boolean;
    maxDetections: number;
    confidenceThreshold: number;
    enableBatching: boolean;
    memoryOptimization: boolean;
  };
  triggers: {
    minHealthScore: number;
    maxMemoryUsage: number; // MB
    minBatteryLevel: number; // 0-1
    thermalThreshold: 'normal' | 'fair' | 'serious' | 'critical';
  };
}

export interface OptimizationAction {
  id: string;
  type: 'performance' | 'memory' | 'battery' | 'thermal' | 'network';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  execute: () => Promise<void>;
  rollback?: () => Promise<void>;
  impact: {
    performance: number; // -100 to +100
    memory: number;
    battery: number;
    quality: number;
  };
}

class AdvancedOptimizationSystem {
  private currentProfile: OptimizationProfile | null = null;
  private appliedActions: OptimizationAction[] = [];
  private isOptimizing = false;
  private optimizationHistory: Array<{
    timestamp: number;
    profile: OptimizationProfile;
    reason: string;
    healthBefore: number;
    healthAfter: number;
  }> = [];

  private profiles: OptimizationProfile[] = [
    {
      id: 'ultra-performance',
      name: 'Ultra Performance',
      description: 'Maximum performance for high-end devices',
      settings: {
        modelQuality: 'ultra',
        inferenceFrequency: 30,
        resolutionScale: 1.0,
        enableWebGL: true,
        enableMultithreading: true,
        maxDetections: 20,
        confidenceThreshold: 0.3,
        enableBatching: true,
        memoryOptimization: false
      },
      triggers: {
        minHealthScore: 90,
        maxMemoryUsage: 50,
        minBatteryLevel: 0.5,
        thermalThreshold: 'normal'
      }
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Optimal balance of performance and efficiency',
      settings: {
        modelQuality: 'medium',
        inferenceFrequency: 20,
        resolutionScale: 0.8,
        enableWebGL: true,
        enableMultithreading: true,
        maxDetections: 15,
        confidenceThreshold: 0.5,
        enableBatching: false,
        memoryOptimization: true
      },
      triggers: {
        minHealthScore: 70,
        maxMemoryUsage: 100,
        minBatteryLevel: 0.3,
        thermalThreshold: 'fair'
      }
    },
    {
      id: 'power-saver',
      name: 'Power Saver',
      description: 'Optimized for battery life and low-power devices',
      settings: {
        modelQuality: 'low',
        inferenceFrequency: 10,
        resolutionScale: 0.6,
        enableWebGL: false,
        enableMultithreading: false,
        maxDetections: 10,
        confidenceThreshold: 0.7,
        enableBatching: false,
        memoryOptimization: true
      },
      triggers: {
        minHealthScore: 50,
        maxMemoryUsage: 150,
        minBatteryLevel: 0.2,
        thermalThreshold: 'serious'
      }
    },
    {
      id: 'emergency',
      name: 'Emergency Mode',
      description: 'Minimal functionality to keep app running',
      settings: {
        modelQuality: 'minimal',
        inferenceFrequency: 5,
        resolutionScale: 0.4,
        enableWebGL: false,
        enableMultithreading: false,
        maxDetections: 5,
        confidenceThreshold: 0.8,
        enableBatching: false,
        memoryOptimization: true
      },
      triggers: {
        minHealthScore: 0,
        maxMemoryUsage: 200,
        minBatteryLevel: 0.1,
        thermalThreshold: 'critical'
      }
    }
  ];

  async initialize(): Promise<void> {
    diagnostic.logWarning('Initializing advanced optimization system', 'AdvancedOptimization');
    
    // Set initial profile based on device capabilities
    const deviceCapabilities = performanceScaling.getDeviceCapabilities();
    const initialProfile = this.selectOptimalProfile(deviceCapabilities);
    
    await this.applyProfile(initialProfile, 'Initial optimization based on device capabilities');
    
    // Start monitoring for optimization opportunities
    this.startOptimizationMonitoring();
  }

  private selectOptimalProfile(deviceCapabilities: any): OptimizationProfile {
    const { cpuCores, deviceMemory } = deviceCapabilities;
    
    // High-end device
    if (cpuCores >= 8 && deviceMemory >= 8) {
      return this.profiles.find(p => p.id === 'ultra-performance')!;
    }
    
    // Mid-range device
    if (cpuCores >= 4 && deviceMemory >= 4) {
      return this.profiles.find(p => p.id === 'balanced')!;
    }
    
    // Low-end device
    if (cpuCores >= 2 && deviceMemory >= 2) {
      return this.profiles.find(p => p.id === 'power-saver')!;
    }
    
    // Very low-end device
    return this.profiles.find(p => p.id === 'emergency')!;
  }

  private startOptimizationMonitoring(): void {
    // Check for optimization opportunities every 60 seconds
    setInterval(async () => {
      await this.checkOptimizationOpportunities();
    }, 60000);
  }

  private async checkOptimizationOpportunities(): Promise<void> {
    if (this.isOptimizing) return;

    try {
      this.isOptimizing = true;
      
      const currentHealth = systemHealth.getCurrentHealth();
      if (!currentHealth) return;

      // Find the best profile for current conditions
      const optimalProfile = this.findOptimalProfile(currentHealth);
      
      if (optimalProfile && optimalProfile.id !== this.currentProfile?.id) {
        const reason = this.getOptimizationReason(currentHealth, optimalProfile);
        await this.applyProfile(optimalProfile, reason);
      }
      
      // Apply specific optimizations based on current issues
      await this.applySpecificOptimizations(currentHealth);
      
    } catch (error) {
      diagnostic.logError(`Optimization check failed: ${error}`, 'AdvancedOptimization');
    } finally {
      this.isOptimizing = false;
    }
  }

  private findOptimalProfile(health: any): OptimizationProfile | null {
    // Sort profiles by suitability (most restrictive first)
    const suitableProfiles = this.profiles.filter(profile => {
      return (
        health.overall.score >= profile.triggers.minHealthScore &&
        health.performance.memoryUsage <= profile.triggers.maxMemoryUsage &&
        health.resources.batteryLevel >= profile.triggers.minBatteryLevel &&
        this.compareThermalState(health.resources.thermalState, profile.triggers.thermalThreshold) <= 0
      );
    });

    // Return the most performance-oriented suitable profile
    return suitableProfiles.length > 0 ? suitableProfiles[0] : null;
  }

  private compareThermalState(current: string, threshold: string): number {
    const states = ['normal', 'fair', 'serious', 'critical'];
    return states.indexOf(current) - states.indexOf(threshold);
  }

  private getOptimizationReason(health: any, profile: OptimizationProfile): string {
    const issues: string[] = [];
    
    if (health.overall.score < 60) issues.push('low health score');
    if (health.performance.memoryUsage > 100) issues.push('high memory usage');
    if (health.resources.batteryLevel < 0.3) issues.push('low battery');
    if (health.resources.thermalState !== 'normal') issues.push('thermal issues');
    
    return `Switching to ${profile.name} due to: ${issues.join(', ')}`;
  }

  private async applyProfile(profile: OptimizationProfile, reason: string): Promise<void> {
    const healthBefore = systemHealth.getCurrentHealth()?.overall.score || 0;
    
    diagnostic.logWarning(`Applying optimization profile: ${profile.name} - ${reason}`, 'AdvancedOptimization');
    
    try {
      // Apply profile settings
      await this.applyProfileSettings(profile);
      
      this.currentProfile = profile;
      
      // Wait a moment for changes to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const healthAfter = systemHealth.getCurrentHealth()?.overall.score || 0;
      
      // Record optimization
      this.optimizationHistory.push({
        timestamp: Date.now(),
        profile,
        reason,
        healthBefore,
        healthAfter
      });
      
      diagnostic.logWarning(
        `Profile applied successfully. Health: ${healthBefore} → ${healthAfter}`,
        'AdvancedOptimization'
      );
      
    } catch (error) {
      diagnostic.logError(`Failed to apply profile ${profile.name}: ${error}`, 'AdvancedOptimization');
    }
  }

  private async applyProfileSettings(profile: OptimizationProfile): Promise<void> {
    const { settings } = profile;
    
    // Dispatch optimization events for components to listen to
    window.dispatchEvent(new CustomEvent('optimization-profile-change', {
      detail: {
        profile: profile.id,
        settings
      }
    }));

    // Apply ONNX optimizations
    if (!settings.enableWebGL) {
      window.dispatchEvent(new CustomEvent('force-cpu-inference'));
    }
    
    // Apply camera optimizations
    window.dispatchEvent(new CustomEvent('camera-optimization', {
      detail: {
        resolutionScale: settings.resolutionScale,
        frameRate: settings.inferenceFrequency
      }
    }));
    
    // Apply detection optimizations
    window.dispatchEvent(new CustomEvent('detection-optimization', {
      detail: {
        maxDetections: settings.maxDetections,
        confidenceThreshold: settings.confidenceThreshold,
        enableBatching: settings.enableBatching
      }
    }));
  }

  private async applySpecificOptimizations(health: any): Promise<void> {
    const actions: OptimizationAction[] = [];
    
    // Memory optimizations
    if (health.performance.memoryUsage > 150) {
      actions.push(this.createMemoryOptimizationAction());
    }
    
    // Performance optimizations
    if (health.performance.score < 50) {
      actions.push(this.createPerformanceOptimizationAction());
    }
    
    // Battery optimizations
    if (health.resources.batteryLevel < 0.2) {
      actions.push(this.createBatteryOptimizationAction());
    }
    
    // Apply actions
    for (const action of actions) {
      try {
        await action.execute();
        this.appliedActions.push(action);
        diagnostic.logWarning(`Applied optimization: ${action.description}`, 'AdvancedOptimization');
      } catch (error) {
        diagnostic.logError(`Failed to apply optimization ${action.id}: ${error}`, 'AdvancedOptimization');
      }
    }
  }

  private createMemoryOptimizationAction(): OptimizationAction {
    return {
      id: 'memory-cleanup',
      type: 'memory',
      severity: 'moderate',
      description: 'Clear memory caches and reduce memory usage',
      execute: async () => {
        // Force garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
        
        // Clear browser caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            if (cacheName.includes('temp') || cacheName.includes('cache')) {
              await caches.delete(cacheName);
            }
          }
        }
        
        // Reduce image quality
        window.dispatchEvent(new CustomEvent('reduce-image-quality'));
      },
      impact: {
        performance: 10,
        memory: 30,
        battery: 5,
        quality: -10
      }
    };
  }

  private createPerformanceOptimizationAction(): OptimizationAction {
    return {
      id: 'performance-boost',
      type: 'performance',
      severity: 'moderate',
      description: 'Optimize performance settings for better responsiveness',
      execute: async () => {
        // Reduce inference frequency
        window.dispatchEvent(new CustomEvent('reduce-inference-frequency'));
        
        // Disable non-essential features
        window.dispatchEvent(new CustomEvent('disable-animations'));
        
        // Switch to CPU inference if WebGL is causing issues
        window.dispatchEvent(new CustomEvent('optimize-inference-backend'));
      },
      impact: {
        performance: 25,
        memory: 10,
        battery: 10,
        quality: -15
      }
    };
  }

  private createBatteryOptimizationAction(): OptimizationAction {
    return {
      id: 'battery-saver',
      type: 'battery',
      severity: 'major',
      description: 'Enable aggressive battery saving measures',
      execute: async () => {
        // Reduce screen brightness (if possible)
        window.dispatchEvent(new CustomEvent('reduce-brightness'));
        
        // Lower frame rate
        window.dispatchEvent(new CustomEvent('reduce-frame-rate'));
        
        // Disable background processing
        window.dispatchEvent(new CustomEvent('disable-background-processing'));
        
        // Switch to power-efficient algorithms
        window.dispatchEvent(new CustomEvent('enable-power-efficient-mode'));
      },
      impact: {
        performance: -20,
        memory: 5,
        battery: 40,
        quality: -25
      }
    };
  }

  // Public API
  getCurrentProfile(): OptimizationProfile | null {
    return this.currentProfile;
  }

  getOptimizationHistory(): typeof this.optimizationHistory {
    return [...this.optimizationHistory];
  }

  getAppliedActions(): OptimizationAction[] {
    return [...this.appliedActions];
  }

  async forceOptimization(): Promise<void> {
    await this.checkOptimizationOpportunities();
  }

  async rollbackLastOptimization(): Promise<void> {
    const lastAction = this.appliedActions.pop();
    if (lastAction && lastAction.rollback) {
      try {
        await lastAction.rollback();
        diagnostic.logWarning(`Rolled back optimization: ${lastAction.description}`, 'AdvancedOptimization');
      } catch (error) {
        diagnostic.logError(`Failed to rollback optimization: ${error}`, 'AdvancedOptimization');
      }
    }
  }

  generateOptimizationReport(): any {
    const currentHealth = systemHealth.getCurrentHealth();
    
    return {
      currentProfile: this.currentProfile,
      currentHealth: currentHealth?.overall,
      appliedActions: this.appliedActions.length,
      optimizationHistory: this.optimizationHistory.slice(-10),
      recommendations: this.generateRecommendations(currentHealth),
      impact: this.calculateOverallImpact(),
      timestamp: Date.now()
    };
  }

  private generateRecommendations(health: any): string[] {
    const recommendations: string[] = [];
    
    if (!health) return recommendations;
    
    if (health.performance.memoryUsage > 100) {
      recommendations.push('Consider closing other browser tabs to free up memory');
    }
    
    if (health.resources.batteryLevel < 0.3) {
      recommendations.push('Enable power saving mode to extend battery life');
    }
    
    if (health.resources.thermalState !== 'normal') {
      recommendations.push('Allow device to cool down for optimal performance');
    }
    
    if (health.functionality.score < 80) {
      recommendations.push('Check camera and AI model availability');
    }
    
    return recommendations;
  }

  private calculateOverallImpact(): any {
    const totalImpact = this.appliedActions.reduce(
      (sum, action) => ({
        performance: sum.performance + action.impact.performance,
        memory: sum.memory + action.impact.memory,
        battery: sum.battery + action.impact.battery,
        quality: sum.quality + action.impact.quality
      }),
      { performance: 0, memory: 0, battery: 0, quality: 0 }
    );
    
    return {
      ...totalImpact,
      actionsApplied: this.appliedActions.length
    };
  }
}

// Singleton instance
export const advancedOptimization = new AdvancedOptimizationSystem(); 