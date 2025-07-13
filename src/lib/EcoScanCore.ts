/**
 * EcoScan Core System Integration
 * 
 * This file integrates all the comprehensive systems implemented:
 * - Internationalization System
 * - Enhanced Voice Recognition System
 * - Enhanced Camera System
 * - ML Model Optimization System
 * - User Feedback System
 * - Error Recovery System
 * - Deployment Automation System
 * - And all existing systems
 */

import { browser } from '$app/environment';
import { writable, derived, get } from 'svelte/store';

// Import all systems
import { InternationalizationSystem } from './systems/InternationalizationSystem';
import { EnhancedVoiceSystem } from './systems/EnhancedVoiceSystem';
import { EnhancedCameraSystem } from './systems/EnhancedCameraSystem';
import { MLModelOptimizationSystem } from './systems/MLModelOptimizationSystem';
import { UserFeedbackSystem } from './systems/UserFeedbackSystem';
import { ErrorRecoverySystem } from './systems/ErrorRecoverySystem';
import { DeploymentAutomationSystem } from './systems/DeploymentAutomationSystem';

export interface EcoScanConfig {
  environment: 'development' | 'staging' | 'production';
  debugMode: boolean;
  analyticsEnabled: boolean;
  features: {
    internationalization: boolean;
    voiceRecognition: boolean;
    cameraEnhancement: boolean;
    mlOptimization: boolean;
    userFeedback: boolean;
    errorRecovery: boolean;
    deploymentAutomation: boolean;
  };
  performance: {
    enableOptimizations: boolean;
    cacheStrategy: 'memory' | 'localStorage' | 'indexedDB';
    maxCacheSize: number;
    preloadModels: boolean;
  };
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    encryptStorage: boolean;
    validateInputs: boolean;
  };
  accessibility: {
    enabled: boolean;
    highContrast: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
}

export interface EcoScanState {
  isInitialized: boolean;
  currentLocale: string;
  isOnline: boolean;
  performance: {
    modelLoadTime: number;
    inferenceTime: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
  error: string | null;
  features: {
    camera: boolean;
    voice: boolean;
    upload: boolean;
    mlModel: boolean;
    feedback: boolean;
  };
  user: {
    id: string;
    sessionId: string;
    preferences: any;
    experience: string;
  };
}

export class EcoScanCore {
  private config: EcoScanConfig;
  private state: EcoScanState;
  private systems: Map<string, any> = new Map();
  private isInitialized = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<EcoScanConfig> = {}) {
    this.config = {
      environment: 'production',
      debugMode: false,
      analyticsEnabled: true,
      features: {
        internationalization: true,
        voiceRecognition: true,
        cameraEnhancement: true,
        mlOptimization: true,
        userFeedback: true,
        errorRecovery: true,
        deploymentAutomation: true
      },
      performance: {
        enableOptimizations: true,
        cacheStrategy: 'localStorage',
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        preloadModels: true
      },
      security: {
        enableCSP: true,
        enableHSTS: true,
        encryptStorage: true,
        validateInputs: true
      },
      accessibility: {
        enabled: true,
        highContrast: false,
        screenReader: false,
        keyboardNavigation: true
      },
      ...config
    };

    this.state = {
      isInitialized: false,
      currentLocale: 'en',
      isOnline: navigator.onLine,
      performance: {
        modelLoadTime: 0,
        inferenceTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0
      },
      error: null,
      features: {
        camera: false,
        voice: false,
        upload: false,
        mlModel: false,
        feedback: false
      },
      user: {
        id: this.generateUserId(),
        sessionId: this.generateSessionId(),
        preferences: {},
        experience: 'beginner'
      }
    };

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('initialized', []);
    this.eventListeners.set('error', []);
    this.eventListeners.set('stateChanged', []);
    this.eventListeners.set('featureReady', []);
    this.eventListeners.set('performanceUpdate', []);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🌱 Initializing EcoScan Core System...');
      
      // Initialize systems based on configuration
      if (this.config.features.errorRecovery) {
        await this.initializeErrorRecovery();
      }

      if (this.config.features.internationalization) {
        await this.initializeInternationalization();
      }

      if (this.config.features.mlOptimization) {
        await this.initializeMLOptimization();
      }

      if (this.config.features.cameraEnhancement) {
        await this.initializeCameraSystem();
      }

      if (this.config.features.voiceRecognition) {
        await this.initializeVoiceSystem();
      }

      if (this.config.features.userFeedback) {
        await this.initializeUserFeedback();
      }

      if (this.config.features.deploymentAutomation) {
        await this.initializeDeploymentAutomation();
      }

      // Setup global event listeners
      this.setupGlobalEventListeners();

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // Setup online/offline detection
      this.setupNetworkMonitoring();

      this.isInitialized = true;
      this.state.isInitialized = true;
      this.state.error = null;

      this.emit('initialized');
      console.log('✅ EcoScan Core System initialized successfully!');
      
      // Log feature summary
      this.logFeatureSummary();
      
    } catch (error: any) {
      this.state.error = error.message;
      this.emit('error', error);
      console.error('❌ Failed to initialize EcoScan Core System:', error);
      throw error;
    }
  }

  private async initializeErrorRecovery(): Promise<void> {
    try {
      const errorRecovery = new ErrorRecoverySystem();
      this.systems.set('errorRecovery', errorRecovery);
      
      errorRecovery.on('errorDetected', (error: any) => {
        this.state.error = error.message;
        this.emit('error', error);
      });
      
      errorRecovery.on('errorRecovered', () => {
        this.state.error = null;
        this.emit('stateChanged', this.state);
      });
      
      console.log('🛡️  Error Recovery System initialized');
    } catch (error) {
      console.error('Failed to initialize Error Recovery System:', error);
    }
  }

  private async initializeInternationalization(): Promise<void> {
    try {
      const i18n = new InternationalizationSystem();
      await i18n.initialize();
      this.systems.set('i18n', i18n);
      
      this.state.currentLocale = i18n.getCurrentLocale();
      this.emit('featureReady', 'internationalization');
      
      console.log('🌍 Internationalization System initialized');
    } catch (error) {
      console.error('Failed to initialize Internationalization System:', error);
    }
  }

  private async initializeMLOptimization(): Promise<void> {
    try {
      const mlOptimizer = new MLModelOptimizationSystem();
      await mlOptimizer.initialize();
      this.systems.set('mlOptimizer', mlOptimizer);
      
      mlOptimizer.on('modelLoaded', () => {
        this.state.features.mlModel = true;
        this.emit('featureReady', 'mlModel');
      });
      
      mlOptimizer.on('performanceUpdate', (metrics: any) => {
        this.state.performance.modelLoadTime = metrics.modelLoadTime;
        this.state.performance.inferenceTime = metrics.averageLatency;
        this.emit('performanceUpdate', metrics);
      });
      
      console.log('🧠 ML Optimization System initialized');
    } catch (error) {
      console.error('Failed to initialize ML Optimization System:', error);
    }
  }

  private async initializeCameraSystem(): Promise<void> {
    try {
      const camera = new EnhancedCameraSystem();
      await camera.initialize();
      this.systems.set('camera', camera);
      
      camera.on('initialized', () => {
        this.state.features.camera = true;
        this.emit('featureReady', 'camera');
      });
      
      console.log('📸 Enhanced Camera System initialized');
    } catch (error) {
      console.error('Failed to initialize Camera System:', error);
    }
  }

  private async initializeVoiceSystem(): Promise<void> {
    try {
      const voice = new EnhancedVoiceSystem();
      await voice.initialize();
      this.systems.set('voice', voice);
      
      voice.on('initialized', () => {
        this.state.features.voice = true;
        this.emit('featureReady', 'voice');
      });
      
      console.log('🎤 Enhanced Voice System initialized');
    } catch (error) {
      console.error('Failed to initialize Voice System:', error);
    }
  }

  private async initializeUserFeedback(): Promise<void> {
    try {
      const feedback = new UserFeedbackSystem();
      await feedback.initialize();
      this.systems.set('feedback', feedback);
      
      feedback.on('initialized', () => {
        this.state.features.feedback = true;
        this.emit('featureReady', 'feedback');
      });
      
      console.log('📝 User Feedback System initialized');
    } catch (error) {
      console.error('Failed to initialize User Feedback System:', error);
    }
  }

  private async initializeDeploymentAutomation(): Promise<void> {
    try {
      const deployment = new DeploymentAutomationSystem();
      await deployment.initialize();
      this.systems.set('deployment', deployment);
      
      console.log('🚀 Deployment Automation System initialized');
    } catch (error) {
      console.error('Failed to initialize Deployment Automation System:', error);
    }
  }

  private setupGlobalEventListeners(): void {
    if (!browser) return;

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseNonEssentialSystems();
      } else {
        this.resumeNonEssentialSystems();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Handle errors
    window.addEventListener('error', (event) => {
      const errorSystem = this.systems.get('errorRecovery');
      if (errorSystem) {
        errorSystem.handleError(event.error, {
          component: 'global',
          action: 'runtime',
          state: this.state,
          url: window.location.href,
          userAgent: navigator.userAgent,
          sessionId: this.state.user.sessionId,
          buildVersion: '1.0.0',
          environment: this.config.environment,
          locale: this.state.currentLocale,
          feature: 'core'
        });
      }
    });
  }

  private initializePerformanceMonitoring(): void {
    if (!this.config.performance.enableOptimizations) return;

    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 5000);
  }

  private updatePerformanceMetrics(): void {
    if ('memory' in performance) {
      this.state.performance.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    this.emit('performanceUpdate', this.state.performance);
  }

  private setupNetworkMonitoring(): void {
    if (!browser) return;

    const updateOnlineStatus = () => {
      this.state.isOnline = navigator.onLine;
      this.emit('stateChanged', this.state);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  private pauseNonEssentialSystems(): void {
    // Pause non-essential systems to save resources
    const camera = this.systems.get('camera');
    if (camera) {
      camera.pauseProcessing?.();
    }

    const voice = this.systems.get('voice');
    if (voice) {
      voice.pauseListening?.();
    }
  }

  private resumeNonEssentialSystems(): void {
    // Resume non-essential systems
    const camera = this.systems.get('camera');
    if (camera) {
      camera.resumeProcessing?.();
    }

    const voice = this.systems.get('voice');
    if (voice) {
      voice.resumeListening?.();
    }
  }

  private logFeatureSummary(): void {
    console.log('\n🌟 EcoScan Feature Summary:');
    console.log('─'.repeat(50));
    
    const features = [
      { name: '🌍 Internationalization', enabled: this.config.features.internationalization },
      { name: '🎤 Voice Recognition', enabled: this.config.features.voiceRecognition },
      { name: '📸 Camera Enhancement', enabled: this.config.features.cameraEnhancement },
      { name: '🧠 ML Optimization', enabled: this.config.features.mlOptimization },
      { name: '📝 User Feedback', enabled: this.config.features.userFeedback },
      { name: '🛡️  Error Recovery', enabled: this.config.features.errorRecovery },
      { name: '🚀 Deployment Automation', enabled: this.config.features.deploymentAutomation }
    ];

    features.forEach(feature => {
      const status = feature.enabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`${feature.name}: ${status}`);
    });

    console.log('─'.repeat(50));
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Debug Mode: ${this.config.debugMode ? 'ON' : 'OFF'}`);
    console.log(`Analytics: ${this.config.analyticsEnabled ? 'ON' : 'OFF'}`);
    console.log('─'.repeat(50));
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanup(): void {
    // Cleanup all systems
    this.systems.forEach((system, name) => {
      if (system.dispose) {
        system.dispose().catch(console.error);
      }
    });

    this.systems.clear();
    this.eventListeners.clear();
  }

  // Public API
  getSystem(name: string): any {
    return this.systems.get(name);
  }

  getState(): EcoScanState {
    return { ...this.state };
  }

  getConfig(): EcoScanConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<EcoScanConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('stateChanged', this.state);
  }

  async classify(input: any): Promise<any> {
    const mlOptimizer = this.systems.get('mlOptimizer');
    if (!mlOptimizer) {
      throw new Error('ML Optimization System not initialized');
    }

    return await mlOptimizer.runInference('yolov8n', input);
  }

  async submitFeedback(feedback: any): Promise<void> {
    const feedbackSystem = this.systems.get('feedback');
    if (!feedbackSystem) {
      throw new Error('User Feedback System not initialized');
    }

    return await feedbackSystem.submitTextFeedback(feedback);
  }

  async changeLanguage(locale: string): Promise<void> {
    const i18n = this.systems.get('i18n');
    if (!i18n) {
      throw new Error('Internationalization System not initialized');
    }

    await i18n.setLocale(locale);
    this.state.currentLocale = locale;
    this.emit('stateChanged', this.state);
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Svelte stores
export const ecoScanCore = new EcoScanCore();
export const coreState = writable<EcoScanState>(ecoScanCore.getState());
export const coreConfig = writable<EcoScanConfig>(ecoScanCore.getConfig());
export const isInitialized = writable(false);
export const currentError = writable<string | null>(null);

// Initialize core system
if (browser) {
  ecoScanCore.initialize().then(() => {
    isInitialized.set(true);
    coreState.set(ecoScanCore.getState());
  }).catch(error => {
    currentError.set(error.message);
    console.error('Failed to initialize EcoScan Core:', error);
  });

  // Update stores on events
  ecoScanCore.on('stateChanged', (state: any) => {
    coreState.set(state);
  });

  ecoScanCore.on('error', (error: any) => {
    currentError.set(error.message);
  });
}

export default ecoScanCore; 