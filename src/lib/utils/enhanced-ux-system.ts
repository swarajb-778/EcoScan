/**
 * Enhanced UX System for EcoScan
 * 
 * Provides intelligent user experience enhancements:
 * - Intelligent feedback and contextual guidance
 * - Smooth animations with user preferences
 * - Adaptive UI based on user behavior and device capabilities
 * - Haptic feedback and voice guidance
 * - Progressive disclosure and step-by-step guidance
 * - Gesture handling and interaction patterns
 * - Multi-persona support and accessibility
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// UX System Interfaces
interface UserBehavior {
  sessionDuration: number;
  actionsPerSession: number;
  featureUsage: Record<string, number>;
  errorRate: number;
  preferredInputMethod: 'camera' | 'voice' | 'upload';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  accessibilityNeeds: string[];
  learningProgress: number;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
}

interface UIAdaptations {
  showTooltips: boolean;
  enableAnimations: boolean;
  simplifyInterface: boolean;
  highContrastMode: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  quickActions: boolean;
  voicePrompts: boolean;
  hapticFeedback: boolean;
}

interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'guidance';
  title: string;
  message: string;
  actionable: boolean;
  action?: () => void;
  actionLabel?: string;
  duration?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: string;
  timestamp: number;
  dismissed: boolean;
}

interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  highlight: boolean;
  required: boolean;
  completed: boolean;
  skippable: boolean;
  animation?: string;
}

interface GestureConfig {
  swipeThreshold: number;
  tapThreshold: number;
  holdThreshold: number;
  enableSwipeGestures: boolean;
  enableTapGestures: boolean;
  enableHoldGestures: boolean;
  enablePinchZoom: boolean;
  enableRotation: boolean;
}

interface AnimationConfig {
  duration: number;
  easing: string;
  enableMicroAnimations: boolean;
  enablePageTransitions: boolean;
  enableLoaders: boolean;
  enableHoverEffects: boolean;
  reducedMotion: boolean;
  performanceMode: boolean;
}

interface VoiceGuidanceConfig {
  enabled: boolean;
  volume: number;
  speed: number;
  pitch: number;
  voice: string;
  language: string;
  contextual: boolean;
  interrupt: boolean;
}

interface HapticFeedbackConfig {
  enabled: boolean;
  intensity: number;
  patterns: Record<string, number[]>;
  contextual: boolean;
  accessibility: boolean;
}

// UX System Stores
export const userBehavior = writable<UserBehavior>({
  sessionDuration: 0,
  actionsPerSession: 0,
  featureUsage: {},
  errorRate: 0,
  preferredInputMethod: 'camera',
  deviceType: 'mobile',
  accessibilityNeeds: [],
  learningProgress: 0,
  expertiseLevel: 'beginner'
});

export const uiAdaptations = writable<UIAdaptations>({
  showTooltips: true,
  enableAnimations: true,
  simplifyInterface: false,
  highContrastMode: false,
  largeText: false,
  reducedMotion: false,
  quickActions: false,
  voicePrompts: false,
  hapticFeedback: false
});

export const feedbackMessages = writable<FeedbackMessage[]>([]);
export const guidanceSteps = writable<GuidanceStep[]>([]);
export const currentGuidanceStep = writable<GuidanceStep | null>(null);

class EnhancedUXSystem {
  private isInitialized = false;
  private behaviorTracker: BehaviorTracker;
  private feedbackManager: FeedbackManager;
  private guidanceSystem: GuidanceSystem;
  private animationManager: AnimationManager;
  private gestureHandler: GestureHandler;
  private voiceGuidance: VoiceGuidance;
  private hapticFeedback: HapticFeedback;
  private adaptiveUI: AdaptiveUI;

  constructor() {
    this.behaviorTracker = new BehaviorTracker();
    this.feedbackManager = new FeedbackManager();
    this.guidanceSystem = new GuidanceSystem();
    this.animationManager = new AnimationManager();
    this.gestureHandler = new GestureHandler();
    this.voiceGuidance = new VoiceGuidance();
    this.hapticFeedback = new HapticFeedback();
    this.adaptiveUI = new AdaptiveUI();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize all subsystems
      await this.behaviorTracker.initialize();
      await this.feedbackManager.initialize();
      await this.guidanceSystem.initialize();
      await this.animationManager.initialize();
      await this.gestureHandler.initialize();
      await this.voiceGuidance.initialize();
      await this.hapticFeedback.initialize();
      await this.adaptiveUI.initialize();

      // Start behavior tracking
      this.behaviorTracker.startTracking();

      // Set up event listeners
      this.setupEventListeners();

      // Load user preferences
      await this.loadUserPreferences();

      this.isInitialized = true;
      console.log('Enhanced UX System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced UX System:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!browser) return;

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.behaviorTracker.pauseTracking();
      } else {
        this.behaviorTracker.resumeTracking();
      }
    });

    // Error handling
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });

    // User interaction events
    document.addEventListener('click', (event) => {
      this.behaviorTracker.trackInteraction('click', event.target);
    });

    document.addEventListener('keydown', (event) => {
      this.behaviorTracker.trackInteraction('keydown', event.target);
    });

    // Touch events for mobile
    document.addEventListener('touchstart', (event) => {
      this.gestureHandler.handleTouchStart(event);
    });

    document.addEventListener('touchmove', (event) => {
      this.gestureHandler.handleTouchMove(event);
    });

    document.addEventListener('touchend', (event) => {
      this.gestureHandler.handleTouchEnd(event);
    });
  }

  private handleError(error: any): void {
    this.feedbackManager.showError({
      title: 'Something went wrong',
      message: error.message || 'An unexpected error occurred',
      actionable: true,
      action: () => window.location.reload(),
      actionLabel: 'Reload Page'
    });
  }

  private async loadUserPreferences(): Promise<void> {
    if (!browser) return;

    try {
      const preferences = localStorage.getItem('ecoscan_ux_preferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        uiAdaptations.set(parsed.adaptations || get(uiAdaptations));
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  // Public API methods
  showFeedback(message: Omit<FeedbackMessage, 'id' | 'timestamp' | 'dismissed'>): void {
    this.feedbackManager.showFeedback(message);
  }

  showGuidance(steps: GuidanceStep[]): void {
    this.guidanceSystem.startGuidance(steps);
  }

  adaptUIForUser(behavior: Partial<UserBehavior>): void {
    this.adaptiveUI.adaptForBehavior(behavior);
  }

  enableFeature(feature: string): void {
    this.behaviorTracker.trackFeatureUsage(feature);
  }

  triggerHapticFeedback(pattern: string): void {
    this.hapticFeedback.trigger(pattern);
  }

  speakText(text: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    this.voiceGuidance.speak(text, priority);
  }

  animateElement(element: HTMLElement, animation: string): void {
    this.animationManager.animate(element, animation);
  }

  trackUserAction(action: string, context?: any): void {
    this.behaviorTracker.trackAction(action, context);
  }

  getRecommendations(): any[] {
    return this.adaptiveUI.getRecommendations();
  }

  updateAccessibilityNeeds(needs: string[]): void {
    this.adaptiveUI.updateAccessibilityNeeds(needs);
  }

  getUserExpertiseLevel(): 'beginner' | 'intermediate' | 'expert' {
    return get(userBehavior).expertiseLevel;
  }

  shouldShowTooltips(): boolean {
    return get(uiAdaptations).showTooltips;
  }

  shouldEnableAnimations(): boolean {
    return get(uiAdaptations).enableAnimations && !get(uiAdaptations).reducedMotion;
  }

  cleanup(): void {
    this.behaviorTracker.stopTracking();
    this.voiceGuidance.stop();
    this.hapticFeedback.cleanup();
    this.animationManager.cleanup();
    this.gestureHandler.cleanup();
  }
}

// Behavior Tracking System
class BehaviorTracker {
  private startTime: number = 0;
  private isTracking = false;
  private actions: any[] = [];
  private sessionStats: any = {};

  async initialize(): Promise<void> {
    this.startTime = Date.now();
    this.loadSessionStats();
  }

  startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    this.startTime = Date.now();
  }

  pauseTracking(): void {
    this.isTracking = false;
    this.updateSessionStats();
  }

  resumeTracking(): void {
    this.isTracking = true;
  }

  stopTracking(): void {
    if (!this.isTracking) return;
    this.isTracking = false;
    this.updateSessionStats();
    this.saveSessionStats();
  }

  trackAction(action: string, context?: any): void {
    if (!this.isTracking) return;

    const actionData = {
      action,
      context,
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime
    };

    this.actions.push(actionData);
    this.updateBehaviorMetrics();
  }

  trackInteraction(type: string, target: EventTarget | null): void {
    if (!this.isTracking) return;

    const element = target as HTMLElement;
    const actionData = {
      type,
      element: element?.tagName || 'unknown',
      id: element?.id || '',
      className: element?.className || '',
      timestamp: Date.now()
    };

    this.actions.push(actionData);
  }

  trackFeatureUsage(feature: string): void {
    this.sessionStats.featureUsage = this.sessionStats.featureUsage || {};
    this.sessionStats.featureUsage[feature] = (this.sessionStats.featureUsage[feature] || 0) + 1;
  }

  private updateBehaviorMetrics(): void {
    const behavior = get(userBehavior);
    const sessionDuration = (Date.now() - this.startTime) / 1000;
    
    const updatedBehavior: UserBehavior = {
      ...behavior,
      sessionDuration,
      actionsPerSession: this.actions.length,
      featureUsage: this.sessionStats.featureUsage || {},
      errorRate: this.calculateErrorRate(),
      learningProgress: this.calculateLearningProgress(),
      expertiseLevel: this.determineExpertiseLevel()
    };

    userBehavior.set(updatedBehavior);
  }

  private calculateErrorRate(): number {
    const errorActions = this.actions.filter(action => action.action?.includes('error'));
    return this.actions.length > 0 ? errorActions.length / this.actions.length : 0;
  }

  private calculateLearningProgress(): number {
    // Simple learning progress based on successful actions
    const successfulActions = this.actions.filter(action => action.action?.includes('success'));
    return Math.min(successfulActions.length / 20, 1); // Max at 20 successful actions
  }

  private determineExpertiseLevel(): 'beginner' | 'intermediate' | 'expert' {
    const sessionCount = this.sessionStats.totalSessions || 0;
    const successRate = 1 - this.calculateErrorRate();
    
    if (sessionCount >= 10 && successRate > 0.8) return 'expert';
    if (sessionCount >= 5 && successRate > 0.6) return 'intermediate';
    return 'beginner';
  }

  private updateSessionStats(): void {
    this.sessionStats.totalSessions = (this.sessionStats.totalSessions || 0) + 1;
    this.sessionStats.totalTime = (this.sessionStats.totalTime || 0) + (Date.now() - this.startTime);
    this.sessionStats.lastSession = Date.now();
  }

  private loadSessionStats(): void {
    if (!browser) return;

    try {
      const stored = localStorage.getItem('ecoscan_session_stats');
      if (stored) {
        this.sessionStats = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load session stats:', error);
    }
  }

  private saveSessionStats(): void {
    if (!browser) return;

    try {
      localStorage.setItem('ecoscan_session_stats', JSON.stringify(this.sessionStats));
    } catch (error) {
      console.warn('Failed to save session stats:', error);
    }
  }
}

// Feedback Management System
class FeedbackManager {
  private messages: FeedbackMessage[] = [];
  private messageId = 0;

  async initialize(): Promise<void> {
    // Initialize feedback system
  }

  showFeedback(message: Omit<FeedbackMessage, 'id' | 'timestamp' | 'dismissed'>): void {
    const feedbackMessage: FeedbackMessage = {
      ...message,
      id: `feedback_${++this.messageId}`,
      timestamp: Date.now(),
      dismissed: false
    };

    this.messages.push(feedbackMessage);
    feedbackMessages.set([...this.messages]);

    // Auto-dismiss after duration
    if (message.duration) {
      setTimeout(() => {
        this.dismissMessage(feedbackMessage.id);
      }, message.duration);
    }
  }

  showError(error: { title: string; message: string; actionable?: boolean; action?: () => void; actionLabel?: string }): void {
    this.showFeedback({
      type: 'error',
      priority: 'high',
      context: 'error',
      ...error
    });
  }

  showSuccess(message: string): void {
    this.showFeedback({
      type: 'success',
      title: 'Success',
      message,
      actionable: false,
      priority: 'medium',
      context: 'success',
      duration: 3000
    });
  }

  showWarning(message: string): void {
    this.showFeedback({
      type: 'warning',
      title: 'Warning',
      message,
      actionable: false,
      priority: 'medium',
      context: 'warning',
      duration: 5000
    });
  }

  showInfo(message: string): void {
    this.showFeedback({
      type: 'info',
      title: 'Information',
      message,
      actionable: false,
      priority: 'low',
      context: 'info',
      duration: 4000
    });
  }

  dismissMessage(messageId: string): void {
    this.messages = this.messages.filter(m => m.id !== messageId);
    feedbackMessages.set([...this.messages]);
  }

  clearAll(): void {
    this.messages = [];
    feedbackMessages.set([]);
  }
}

// Guidance System
class GuidanceSystem {
  private steps: GuidanceStep[] = [];
  private currentStep: number = 0;
  private isActive = false;

  async initialize(): Promise<void> {
    // Initialize guidance system
  }

  startGuidance(steps: GuidanceStep[]): void {
    this.steps = steps;
    this.currentStep = 0;
    this.isActive = true;
    
    guidanceSteps.set(steps);
    this.showCurrentStep();
  }

  nextStep(): void {
    if (!this.isActive || this.currentStep >= this.steps.length - 1) return;

    this.steps[this.currentStep].completed = true;
    this.currentStep++;
    this.showCurrentStep();
  }

  previousStep(): void {
    if (!this.isActive || this.currentStep <= 0) return;

    this.currentStep--;
    this.showCurrentStep();
  }

  skipStep(): void {
    if (!this.isActive) return;

    const currentGuidanceStep = this.steps[this.currentStep];
    if (currentGuidanceStep.skippable) {
      this.nextStep();
    }
  }

  completeGuidance(): void {
    this.isActive = false;
    this.currentStep = 0;
    this.steps = [];
    
    guidanceSteps.set([]);
    currentGuidanceStep.set(null);
  }

  private showCurrentStep(): void {
    if (!this.isActive || this.currentStep >= this.steps.length) {
      this.completeGuidance();
      return;
    }

    const step = this.steps[this.currentStep];
    currentGuidanceStep.set(step);
    
    // Highlight target element
    if (step.highlight && step.target) {
      this.highlightElement(step.target);
    }
  }

  private highlightElement(selector: string): void {
    if (!browser) return;

    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('ux-highlight');
      
      // Remove highlight after a delay
      setTimeout(() => {
        element.classList.remove('ux-highlight');
      }, 2000);
    }
  }
}

// Animation Manager
class AnimationManager {
  private config: AnimationConfig = {
    duration: 300,
    easing: 'ease-in-out',
    enableMicroAnimations: true,
    enablePageTransitions: true,
    enableLoaders: true,
    enableHoverEffects: true,
    reducedMotion: false,
    performanceMode: false
  };

  async initialize(): Promise<void> {
    // Check for reduced motion preference
    if (browser && window.matchMedia) {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.config.reducedMotion = reducedMotionQuery.matches;
      
      reducedMotionQuery.addEventListener('change', (e) => {
        this.config.reducedMotion = e.matches;
        this.updateAnimationSettings();
      });
    }

    this.updateAnimationSettings();
  }

  animate(element: HTMLElement, animation: string): void {
    if (!this.config.enableMicroAnimations || this.config.reducedMotion) return;

    const animations = {
      'fade-in': { opacity: [0, 1] },
      'fade-out': { opacity: [1, 0] },
      'slide-in-left': { transform: ['translateX(-100%)', 'translateX(0)'] },
      'slide-in-right': { transform: ['translateX(100%)', 'translateX(0)'] },
      'slide-up': { transform: ['translateY(100%)', 'translateY(0)'] },
      'slide-down': { transform: ['translateY(-100%)', 'translateY(0)'] },
      'scale-up': { transform: ['scale(0)', 'scale(1)'] },
      'scale-down': { transform: ['scale(1)', 'scale(0)'] },
      'bounce': { transform: ['scale(1)', 'scale(1.1)', 'scale(1)'] },
      'shake': { transform: ['translateX(0)', 'translateX(-10px)', 'translateX(10px)', 'translateX(0)'] }
    };

    const keyframes = animations[animation];
    if (!keyframes) return;

    element.animate(keyframes, {
      duration: this.config.duration,
      easing: this.config.easing,
      fill: 'both'
    });
  }

  private updateAnimationSettings(): void {
    if (!browser) return;

    const adaptations = get(uiAdaptations);
    const updatedAdaptations = {
      ...adaptations,
      enableAnimations: !this.config.reducedMotion,
      reducedMotion: this.config.reducedMotion
    };

    uiAdaptations.set(updatedAdaptations);
  }

  cleanup(): void {
    // Cleanup animations
  }
}

// Gesture Handler
class GestureHandler {
  private config: GestureConfig = {
    swipeThreshold: 50,
    tapThreshold: 200,
    holdThreshold: 500,
    enableSwipeGestures: true,
    enableTapGestures: true,
    enableHoldGestures: true,
    enablePinchZoom: true,
    enableRotation: false
  };

  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private touchEndPos: { x: number; y: number } = { x: 0, y: 0 };

  async initialize(): Promise<void> {
    // Initialize gesture handling
  }

  handleTouchStart(event: TouchEvent): void {
    if (!this.config.enableTapGestures && !this.config.enableSwipeGestures) return;

    const touch = event.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
  }

  handleTouchMove(event: TouchEvent): void {
    if (!this.config.enableSwipeGestures) return;

    const touch = event.touches[0];
    this.touchEndPos = { x: touch.clientX, y: touch.clientY };
  }

  handleTouchEnd(event: TouchEvent): void {
    const touchDuration = Date.now() - this.touchStartTime;
    const deltaX = this.touchEndPos.x - this.touchStartPos.x;
    const deltaY = this.touchEndPos.y - this.touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Tap gesture
    if (touchDuration < this.config.tapThreshold && distance < 10) {
      this.handleTap(event);
    }
    // Hold gesture
    else if (touchDuration > this.config.holdThreshold && distance < 10) {
      this.handleHold(event);
    }
    // Swipe gesture
    else if (distance > this.config.swipeThreshold) {
      this.handleSwipe(deltaX, deltaY, event);
    }
  }

  private handleTap(event: TouchEvent): void {
    // Dispatch custom tap event
    const customEvent = new CustomEvent('ux-tap', { detail: { originalEvent: event } });
    event.target?.dispatchEvent(customEvent);
  }

  private handleHold(event: TouchEvent): void {
    // Dispatch custom hold event
    const customEvent = new CustomEvent('ux-hold', { detail: { originalEvent: event } });
    event.target?.dispatchEvent(customEvent);
  }

  private handleSwipe(deltaX: number, deltaY: number, event: TouchEvent): void {
    let direction = '';
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    // Dispatch custom swipe event
    const customEvent = new CustomEvent('ux-swipe', { 
      detail: { 
        direction, 
        deltaX, 
        deltaY, 
        originalEvent: event 
      } 
    });
    event.target?.dispatchEvent(customEvent);
  }

  cleanup(): void {
    // Cleanup gesture handlers
  }
}

// Voice Guidance System
class VoiceGuidance {
  private config: VoiceGuidanceConfig = {
    enabled: false,
    volume: 0.8,
    speed: 1.0,
    pitch: 1.0,
    voice: '',
    language: 'en-US',
    contextual: true,
    interrupt: true
  };

  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechQueue: { text: string; priority: string }[] = [];

  async initialize(): Promise<void> {
    if (!browser || !window.speechSynthesis) return;

    this.speechSynthesis = window.speechSynthesis;
    this.loadVoiceSettings();
  }

  speak(text: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    if (!this.config.enabled || !this.speechSynthesis) return;

    // Handle priority
    if (priority === 'high' && this.currentUtterance) {
      this.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.config.volume;
    utterance.rate = this.config.speed;
    utterance.pitch = this.config.pitch;
    utterance.lang = this.config.language;

    utterance.onstart = () => {
      this.currentUtterance = utterance;
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.processQueue();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      this.processQueue();
    };

    if (priority === 'high') {
      this.speechSynthesis.speak(utterance);
    } else {
      this.speechQueue.push({ text, priority });
      if (!this.currentUtterance) {
        this.processQueue();
      }
    }
  }

  private processQueue(): void {
    if (!this.speechSynthesis || this.speechQueue.length === 0) return;

    const next = this.speechQueue.shift();
    if (next) {
      this.speak(next.text, next.priority as any);
    }
  }

  stop(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    this.speechQueue = [];
    this.currentUtterance = null;
  }

  private loadVoiceSettings(): void {
    if (!browser) return;

    try {
      const stored = localStorage.getItem('ecoscan_voice_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.config = { ...this.config, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load voice settings:', error);
    }
  }
}

// Haptic Feedback System
class HapticFeedback {
  private config: HapticFeedbackConfig = {
    enabled: false,
    intensity: 1.0,
    patterns: {
      success: [100, 50, 100],
      error: [200, 100, 200],
      warning: [150],
      info: [50],
      click: [25],
      longPress: [50, 25, 50]
    },
    contextual: true,
    accessibility: true
  };

  async initialize(): Promise<void> {
    // Check if haptic feedback is available
    if (browser && 'vibrate' in navigator) {
      this.config.enabled = true;
      this.loadHapticSettings();
    }
  }

  trigger(pattern: string): void {
    if (!this.config.enabled || !navigator.vibrate) return;

    const vibrationPattern = this.config.patterns[pattern];
    if (vibrationPattern) {
      navigator.vibrate(vibrationPattern.map(duration => duration * this.config.intensity));
    }
  }

  private loadHapticSettings(): void {
    if (!browser) return;

    try {
      const stored = localStorage.getItem('ecoscan_haptic_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.config = { ...this.config, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load haptic settings:', error);
    }
  }

  cleanup(): void {
    // Cleanup haptic feedback
  }
}

// Adaptive UI System
class AdaptiveUI {
  private recommendations: any[] = [];

  async initialize(): Promise<void> {
    // Load adaptive UI settings
    this.loadAdaptiveSettings();
  }

  adaptForBehavior(behavior: Partial<UserBehavior>): void {
    const currentAdaptations = get(uiAdaptations);
    let newAdaptations = { ...currentAdaptations };

    // Adapt based on expertise level
    if (behavior.expertiseLevel === 'expert') {
      newAdaptations.showTooltips = false;
      newAdaptations.quickActions = true;
      newAdaptations.simplifyInterface = false;
    } else if (behavior.expertiseLevel === 'beginner') {
      newAdaptations.showTooltips = true;
      newAdaptations.quickActions = false;
      newAdaptations.simplifyInterface = true;
    }

    // Adapt based on device type
    if (behavior.deviceType === 'mobile') {
      newAdaptations.largeText = true;
      newAdaptations.hapticFeedback = true;
    }

    // Adapt based on error rate
    if (behavior.errorRate && behavior.errorRate > 0.3) {
      newAdaptations.showTooltips = true;
      newAdaptations.voicePrompts = true;
    }

    uiAdaptations.set(newAdaptations);
    this.saveAdaptiveSettings(newAdaptations);
  }

  updateAccessibilityNeeds(needs: string[]): void {
    const currentAdaptations = get(uiAdaptations);
    let newAdaptations = { ...currentAdaptations };

    needs.forEach(need => {
      switch (need) {
        case 'visual':
          newAdaptations.highContrastMode = true;
          newAdaptations.largeText = true;
          break;
        case 'motor':
          newAdaptations.reducedMotion = true;
          newAdaptations.largeText = true;
          break;
        case 'cognitive':
          newAdaptations.simplifyInterface = true;
          newAdaptations.showTooltips = true;
          break;
        case 'auditory':
          newAdaptations.voicePrompts = false;
          newAdaptations.hapticFeedback = true;
          break;
      }
    });

    uiAdaptations.set(newAdaptations);
    this.saveAdaptiveSettings(newAdaptations);
  }

  getRecommendations(): any[] {
    return this.recommendations;
  }

  private loadAdaptiveSettings(): void {
    if (!browser) return;

    try {
      const stored = localStorage.getItem('ecoscan_adaptive_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        uiAdaptations.set(settings);
      }
    } catch (error) {
      console.warn('Failed to load adaptive settings:', error);
    }
  }

  private saveAdaptiveSettings(adaptations: UIAdaptations): void {
    if (!browser) return;

    try {
      localStorage.setItem('ecoscan_adaptive_settings', JSON.stringify(adaptations));
    } catch (error) {
      console.warn('Failed to save adaptive settings:', error);
    }
  }
}

// Create singleton instance
export const enhancedUXSystem = new EnhancedUXSystem();

// Initialize when imported
if (browser) {
  enhancedUXSystem.initialize().catch(console.error);
}

// Derived stores
export const isBeginnerUser = derived(
  userBehavior,
  ($behavior) => $behavior.expertiseLevel === 'beginner'
);

export const shouldSimplifyInterface = derived(
  [userBehavior, uiAdaptations],
  ([$behavior, $adaptations]) => 
    $behavior.expertiseLevel === 'beginner' || 
    $adaptations.simplifyInterface ||
    $behavior.errorRate > 0.3
);

export const preferredInputMethod = derived(
  userBehavior,
  ($behavior) => $behavior.preferredInputMethod
);

export const currentFeedback = derived(
  feedbackMessages,
  ($messages) => $messages.filter(m => !m.dismissed)
);

export const urgentFeedback = derived(
  feedbackMessages,
  ($messages) => $messages.filter(m => !m.dismissed && m.priority === 'urgent')
);

export const hasActiveGuidance = derived(
  currentGuidanceStep,
  ($step) => $step !== null
);

// Export convenience functions
export const showSuccessMessage = (message: string) => {
  enhancedUXSystem.showFeedback({
    type: 'success',
    title: 'Success',
    message,
    actionable: false,
    priority: 'medium',
    context: 'success',
    duration: 3000
  });
};

export const showErrorMessage = (message: string) => {
  enhancedUXSystem.showFeedback({
    type: 'error',
    title: 'Error',
    message,
    actionable: false,
    priority: 'high',
    context: 'error',
    duration: 5000
  });
};

export const trackAction = (action: string, context?: any) => {
  enhancedUXSystem.trackUserAction(action, context);
};

export const triggerHaptic = (pattern: string) => {
  enhancedUXSystem.triggerHapticFeedback(pattern);
};

export const speakText = (text: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
  enhancedUXSystem.speakText(text, priority);
}; 