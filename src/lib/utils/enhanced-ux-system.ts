/**
 * Enhanced UX System for EcoScan
 * 
 * Features:
 * - Intelligent feedback and guidance system
 * - Smooth animations and transitions
 * - Contextual help and tooltips
 * - Progressive disclosure of features
 * - Adaptive UI based on user behavior
 * - Haptic feedback for mobile devices
 * - Voice guidance and audio feedback
 * - Accessibility enhancements
 * 
 * Based on PRD User Personas:
 * - Alex (28): Tech-savvy, expects smooth app-like experiences
 * - Maria (42): Busy parent, needs simple interfaces with clear feedback
 * - Ben (20): Student, mobile-first expectations with quick interactions
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { enhancedAnalytics } from './analytics';

// UX interfaces
export interface UXState {
  currentStep: 'welcome' | 'camera-setup' | 'detecting' | 'results' | 'feedback' | 'help';
  isFirstTime: boolean;
  userPreferences: UserPreferences;
  guidanceLevel: 'minimal' | 'normal' | 'detailed';
  interactionMode: 'touch' | 'mouse' | 'voice' | 'keyboard';
  deviceContext: DeviceContext;
}

export interface UserPreferences {
  animations: boolean;
  hapticFeedback: boolean;
  voiceGuidance: boolean;
  autoHints: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  language: string;
  accessibilityMode: boolean;
  soundEffects: boolean;
  compactMode: boolean;
}

export interface DeviceContext {
  screenSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
  hasTouch: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasVibration: boolean;
  isLowPowerMode: boolean;
  networkSpeed: 'slow' | 'fast' | 'offline';
}

export interface FeedbackItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'hint';
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  duration?: number;
  persistent?: boolean;
  icon?: string;
  timestamp: number;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  stagger?: number;
}

export interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  type: 'tooltip' | 'modal' | 'highlight' | 'overlay';
  condition?: () => boolean;
  action?: () => void;
}

export interface UserGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'hold' | 'hover' | 'scroll';
  target: string;
  timestamp: number;
  data: any;
}

class EnhancedUXSystem {
  private uxState: UXState;
  private feedbackQueue: FeedbackItem[] = [];
  private guidanceSteps: GuidanceStep[] = [];
  private userGestures: UserGesture[] = [];
  private animationController: AnimationController;
  private hapticManager: HapticManager;
  private voiceManager: VoiceManager;
  private tooltipManager: TooltipManager;
  private gestureHandler: GestureHandler;

  // Reactive stores
  private _currentUXState = writable<UXState>(this.getInitialState());
  private _activeFeedback = writable<FeedbackItem[]>([]);
  private _currentGuidance = writable<GuidanceStep | null>(null);
  private _isProcessing = writable<boolean>(false);
  private _userProgress = writable<number>(0);

  public readonly currentUXState: Readable<UXState> = this._currentUXState;
  public readonly activeFeedback: Readable<FeedbackItem[]> = this._activeFeedback;
  public readonly currentGuidance: Readable<GuidanceStep | null> = this._currentGuidance;
  public readonly isProcessing: Readable<boolean> = this._isProcessing;
  public readonly userProgress: Readable<number> = this._userProgress;

  constructor() {
    this.uxState = this.getInitialState();
    this.animationController = new AnimationController(this.uxState.userPreferences);
    this.hapticManager = new HapticManager();
    this.voiceManager = new VoiceManager();
    this.tooltipManager = new TooltipManager();
    this.gestureHandler = new GestureHandler();
    
    if (browser) {
      this.initializeUXSystem();
    }
  }

  private getInitialState(): UXState {
    const stored = browser ? localStorage.getItem('ecoscan-ux-state') : null;
    const savedState = stored ? JSON.parse(stored) : null;
    
    return {
      currentStep: 'welcome',
      isFirstTime: !savedState,
      userPreferences: {
        animations: true,
        hapticFeedback: true,
        voiceGuidance: false,
        autoHints: true,
        colorScheme: 'auto',
        language: 'en',
        accessibilityMode: false,
        soundEffects: true,
        compactMode: false,
        ...savedState?.userPreferences
      },
      guidanceLevel: savedState?.guidanceLevel || 'normal',
      interactionMode: this.detectInteractionMode(),
      deviceContext: this.detectDeviceContext()
    };
  }

  private detectInteractionMode(): 'touch' | 'mouse' | 'voice' | 'keyboard' {
    if (!browser) return 'touch';
    
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return 'touch';
    }
    
    if (window.matchMedia('(pointer: fine)').matches) {
      return 'mouse';
    }
    
    return 'keyboard';
  }

  private detectDeviceContext(): DeviceContext {
    if (!browser) {
      return {
        screenSize: 'medium',
        orientation: 'portrait',
        hasTouch: false,
        hasCamera: false,
        hasMicrophone: false,
        hasVibration: false,
        isLowPowerMode: false,
        networkSpeed: 'fast'
      };
    }

    const width = window.innerWidth;
    const screenSize = width < 768 ? 'small' : width < 1024 ? 'medium' : 'large';
    
    return {
      screenSize,
      orientation: width > window.innerHeight ? 'landscape' : 'portrait',
      hasTouch: 'ontouchstart' in window,
      hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      hasMicrophone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      hasVibration: 'vibrate' in navigator,
      isLowPowerMode: false, // Would need to be detected
      networkSpeed: 'fast' // Would need to be detected
    };
  }

  private initializeUXSystem(): void {
    this.setupGestureHandlers();
    this.setupKeyboardShortcuts();
    this.setupAccessibilityEnhancements();
    this.initializeGuidanceSteps();
    
    // Update device context on resize
    window.addEventListener('resize', () => {
      this.updateDeviceContext();
    });
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  private setupGestureHandlers(): void {
    this.gestureHandler.on('tap', (gesture) => {
      this.handleGesture(gesture);
    });
    
    this.gestureHandler.on('swipe', (gesture) => {
      this.handleSwipeGesture(gesture);
    });
    
    this.gestureHandler.on('pinch', (gesture) => {
      this.handlePinchGesture(gesture);
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!browser) return;
    
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            this.toggleHelp();
            break;
          case 'r':
            e.preventDefault();
            this.resetToInitialState();
            break;
          case 'f':
            e.preventDefault();
            this.toggleFeedback();
            break;
        }
      }
      
      switch (e.key) {
        case 'Escape':
          this.closeCurrentModal();
          break;
        case 'Enter':
          this.triggerPrimaryAction();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          this.handleArrowKeyNavigation(e.key);
          break;
      }
    });
  }

  private setupAccessibilityEnhancements(): void {
    if (!browser) return;
    
    // Add skip links
    this.addSkipLinks();
    
    // Setup focus management
    this.setupFocusManagement();
    
    // Add ARIA announcements
    this.setupARIAAnnouncements();
    
    // Enable high contrast mode detection
    this.detectHighContrastMode();
  }

  private initializeGuidanceSteps(): void {
    this.guidanceSteps = [
      {
        id: 'welcome',
        title: 'Welcome to EcoScan',
        description: 'Let\'s help you sort waste correctly! Point your camera at any item.',
        target: 'camera-view',
        position: 'bottom',
        type: 'modal',
        condition: () => this.uxState.isFirstTime
      },
      {
        id: 'camera-permission',
        title: 'Camera Access',
        description: 'Allow camera access to start detecting waste items.',
        target: 'camera-button',
        position: 'top',
        type: 'tooltip',
        condition: () => !this.uxState.deviceContext.hasCamera
      },
      {
        id: 'first-detection',
        title: 'Great! Item Detected',
        description: 'Tap on the green box to see disposal instructions.',
        target: 'detection-box',
        position: 'top',
        type: 'highlight',
        condition: () => this.uxState.currentStep === 'detecting'
      },
      {
        id: 'voice-input',
        title: 'Try Voice Input',
        description: 'Tap the microphone to classify items by voice.',
        target: 'voice-button',
        position: 'bottom',
        type: 'tooltip',
        condition: () => this.uxState.userPreferences.voiceGuidance
      },
      {
        id: 'feedback',
        title: 'Help Us Improve',
        description: 'Correct any misclassifications to improve accuracy.',
        target: 'feedback-button',
        position: 'left',
        type: 'tooltip',
        condition: () => this.uxState.currentStep === 'results'
      }
    ];
  }

  // Public methods
  public showFeedback(feedback: Omit<FeedbackItem, 'id' | 'timestamp'>): void {
    const feedbackItem: FeedbackItem = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...feedback
    };
    
    this.feedbackQueue.push(feedbackItem);
    this.updateFeedbackDisplay();
    
    // Add haptic feedback
    if (this.uxState.userPreferences.hapticFeedback) {
      this.hapticManager.vibrate(feedback.type);
    }
    
    // Add voice announcement
    if (this.uxState.userPreferences.voiceGuidance) {
      this.voiceManager.announce(feedback.message);
    }
    
    // Auto-remove if not persistent
    if (!feedback.persistent) {
      setTimeout(() => {
        this.removeFeedback(feedbackItem.id);
      }, feedback.duration || 3000);
    }
    
    // Track analytics
    enhancedAnalytics.trackUserInteraction('feedback_shown', 'ux', {
      type: feedback.type,
      message: feedback.message
    });
  }

  public removeFeedback(id: string): void {
    this.feedbackQueue = this.feedbackQueue.filter(item => item.id !== id);
    this.updateFeedbackDisplay();
  }

  public updateStep(step: UXState['currentStep']): void {
    this.uxState.currentStep = step;
    this._currentUXState.set(this.uxState);
    
    // Update progress
    this.updateUserProgress();
    
    // Show contextual guidance
    this.showContextualGuidance();
    
    // Save state
    this.saveUXState();
    
    // Track analytics
    enhancedAnalytics.trackUserInteraction('step_changed', 'ux', {
      step,
      isFirstTime: this.uxState.isFirstTime
    });
  }

  public updatePreferences(preferences: Partial<UserPreferences>): void {
    this.uxState.userPreferences = { ...this.uxState.userPreferences, ...preferences };
    this._currentUXState.set(this.uxState);
    
    // Update animation controller
    this.animationController.updatePreferences(this.uxState.userPreferences);
    
    // Save preferences
    this.saveUXState();
    
    // Apply immediate changes
    this.applyPreferenceChanges(preferences);
  }

  public startProcessing(message: string = 'Processing...'): void {
    this._isProcessing.set(true);
    this.showFeedback({
      type: 'info',
      message,
      persistent: true,
      icon: '⏳'
    });
  }

  public stopProcessing(): void {
    this._isProcessing.set(false);
    this.removeProcessingFeedback();
  }

  public showGuidance(stepId: string): void {
    const step = this.guidanceSteps.find(s => s.id === stepId);
    if (step && (!step.condition || step.condition())) {
      this._currentGuidance.set(step);
      
      // Add guidance animation
      this.animationController.animateGuidance(step);
      
      // Track analytics
      enhancedAnalytics.trackUserInteraction('guidance_shown', 'ux', {
        stepId,
        type: step.type
      });
    }
  }

  public hideGuidance(): void {
    this._currentGuidance.set(null);
  }

  public createAnimation(element: string, config: AnimationConfig): void {
    this.animationController.animate(element, config);
  }

  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'error' | 'success'): void {
    if (this.uxState.userPreferences.hapticFeedback) {
      this.hapticManager.vibrate(type);
    }
  }

  public announceToScreenReader(message: string): void {
    this.voiceManager.announceToScreenReader(message);
  }

  public showTooltip(target: string, message: string, position: 'top' | 'bottom' | 'left' | 'right' = 'top'): void {
    this.tooltipManager.show(target, message, position);
  }

  public hideTooltip(target: string): void {
    this.tooltipManager.hide(target);
  }

  // Private methods
  private updateFeedbackDisplay(): void {
    this._activeFeedback.set([...this.feedbackQueue]);
  }

  private updateUserProgress(): void {
    const steps = ['welcome', 'camera-setup', 'detecting', 'results', 'feedback'];
    const currentIndex = steps.indexOf(this.uxState.currentStep);
    const progress = currentIndex >= 0 ? (currentIndex + 1) / steps.length * 100 : 0;
    this._userProgress.set(progress);
  }

  private showContextualGuidance(): void {
    const relevantSteps = this.guidanceSteps.filter(step => {
      return step.condition ? step.condition() : true;
    });
    
    if (relevantSteps.length > 0 && this.uxState.userPreferences.autoHints) {
      this.showGuidance(relevantSteps[0].id);
    }
  }

  private saveUXState(): void {
    if (browser) {
      try {
        localStorage.setItem('ecoscan-ux-state', JSON.stringify({
          userPreferences: this.uxState.userPreferences,
          guidanceLevel: this.uxState.guidanceLevel,
          isFirstTime: false
        }));
      } catch (error) {
        console.error('Failed to save UX state:', error);
      }
    }
  }

  private applyPreferenceChanges(preferences: Partial<UserPreferences>): void {
    if (preferences.colorScheme) {
      this.applyColorScheme(preferences.colorScheme);
    }
    
    if (preferences.accessibilityMode !== undefined) {
      this.toggleAccessibilityMode(preferences.accessibilityMode);
    }
    
    if (preferences.compactMode !== undefined) {
      this.toggleCompactMode(preferences.compactMode);
    }
  }

  private applyColorScheme(scheme: 'light' | 'dark' | 'auto'): void {
    if (!browser) return;
    
    const root = document.documentElement;
    
    if (scheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', scheme);
    }
  }

  private toggleAccessibilityMode(enabled: boolean): void {
    if (!browser) return;
    
    const root = document.documentElement;
    root.setAttribute('data-accessibility', enabled ? 'true' : 'false');
    
    if (enabled) {
      // Enhance focus indicators
      root.style.setProperty('--focus-width', '3px');
      root.style.setProperty('--focus-color', '#0066cc');
      
      // Increase text size
      root.style.setProperty('--text-scale', '1.2');
      
      // Disable animations
      root.style.setProperty('--animation-duration', '0s');
    } else {
      root.style.removeProperty('--focus-width');
      root.style.removeProperty('--focus-color');
      root.style.removeProperty('--text-scale');
      root.style.removeProperty('--animation-duration');
    }
  }

  private toggleCompactMode(enabled: boolean): void {
    if (!browser) return;
    
    const root = document.documentElement;
    root.setAttribute('data-compact', enabled ? 'true' : 'false');
    
    if (enabled) {
      root.style.setProperty('--spacing-scale', '0.8');
      root.style.setProperty('--font-size-scale', '0.9');
    } else {
      root.style.removeProperty('--spacing-scale');
      root.style.removeProperty('--font-size-scale');
    }
  }

  private handleGesture(gesture: UserGesture): void {
    this.userGestures.push(gesture);
    
    // Keep only recent gestures
    if (this.userGestures.length > 100) {
      this.userGestures.shift();
    }
    
    // Provide gesture feedback
    if (gesture.type === 'tap') {
      this.triggerHaptic('light');
    }
    
    // Track analytics
    enhancedAnalytics.trackUserInteraction('gesture', 'ux', {
      type: gesture.type,
      target: gesture.target
    });
  }

  private handleSwipeGesture(gesture: UserGesture): void {
    const direction = gesture.data.direction;
    
    switch (direction) {
      case 'left':
        this.navigateNext();
        break;
      case 'right':
        this.navigatePrevious();
        break;
      case 'up':
        this.showGuidance('help');
        break;
      case 'down':
        this.hideGuidance();
        break;
    }
  }

  private handlePinchGesture(gesture: UserGesture): void {
    const scale = gesture.data.scale;
    
    if (scale > 1.2) {
      // Zoom in - show detailed view
      this.updatePreferences({ compactMode: false });
    } else if (scale < 0.8) {
      // Zoom out - show compact view
      this.updatePreferences({ compactMode: true });
    }
  }

  private navigateNext(): void {
    const steps: UXState['currentStep'][] = ['welcome', 'camera-setup', 'detecting', 'results', 'feedback'];
    const currentIndex = steps.indexOf(this.uxState.currentStep);
    if (currentIndex < steps.length - 1) {
      this.updateStep(steps[currentIndex + 1]);
    }
  }

  private navigatePrevious(): void {
    const steps: UXState['currentStep'][] = ['welcome', 'camera-setup', 'detecting', 'results', 'feedback'];
    const currentIndex = steps.indexOf(this.uxState.currentStep);
    if (currentIndex > 0) {
      this.updateStep(steps[currentIndex - 1]);
    }
  }

  private updateDeviceContext(): void {
    this.uxState.deviceContext = this.detectDeviceContext();
    this._currentUXState.set(this.uxState);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor UX performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('ux-')) {
          enhancedAnalytics.trackPerformance('ux_timing', entry.duration, 'ms');
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
  }

  // Cleanup methods
  private removeProcessingFeedback(): void {
    this.feedbackQueue = this.feedbackQueue.filter(item => item.type !== 'info' || !item.persistent);
    this.updateFeedbackDisplay();
  }

  private addSkipLinks(): void {
    if (!browser) return;
    
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  private setupFocusManagement(): void {
    // Implementation for focus management
  }

  private setupARIAAnnouncements(): void {
    // Implementation for ARIA announcements
  }

  private detectHighContrastMode(): void {
    // Implementation for high contrast mode detection
  }

  private toggleHelp(): void {
    // Implementation for help toggle
  }

  private resetToInitialState(): void {
    // Implementation for reset
  }

  private toggleFeedback(): void {
    // Implementation for feedback toggle
  }

  private closeCurrentModal(): void {
    // Implementation for modal close
  }

  private triggerPrimaryAction(): void {
    // Implementation for primary action
  }

  private handleArrowKeyNavigation(key: string): void {
    // Implementation for arrow key navigation
  }

  public cleanup(): void {
    this.saveUXState();
    this.gestureHandler.cleanup();
    this.animationController.cleanup();
    this.tooltipManager.cleanup();
  }
}

// Supporting classes
class AnimationController {
  private preferences: UserPreferences;
  
  constructor(preferences: UserPreferences) {
    this.preferences = preferences;
  }
  
  updatePreferences(preferences: UserPreferences): void {
    this.preferences = preferences;
  }
  
  animate(element: string, config: AnimationConfig): void {
    if (!this.preferences.animations) return;
    
    // Implementation for animations
  }
  
  animateGuidance(step: GuidanceStep): void {
    if (!this.preferences.animations) return;
    
    // Implementation for guidance animations
  }
  
  cleanup(): void {
    // Cleanup animations
  }
}

class HapticManager {
  vibrate(type: 'light' | 'medium' | 'heavy' | 'error' | 'success' | string): void {
    if (!browser || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      error: [100, 50, 100],
      success: [50, 25, 50],
      info: [15],
      warning: [25, 25, 25]
    };
    
    const pattern = patterns[type as keyof typeof patterns] || patterns.light;
    navigator.vibrate(pattern);
  }
}

class VoiceManager {
  announce(message: string): void {
    if (!browser || !window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.8;
    utterance.volume = 0.7;
    window.speechSynthesis.speak(utterance);
  }
  
  announceToScreenReader(message: string): void {
    if (!browser) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

class TooltipManager {
  private activeTooltips: Map<string, HTMLElement> = new Map();
  
  show(target: string, message: string, position: 'top' | 'bottom' | 'left' | 'right'): void {
    if (!browser) return;
    
    const targetElement = document.querySelector(`[data-target="${target}"]`);
    if (!targetElement) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      pointer-events: none;
      max-width: 200px;
    `;
    
    document.body.appendChild(tooltip);
    this.activeTooltips.set(target, tooltip);
    
    this.positionTooltip(tooltip, targetElement, position);
  }
  
  hide(target: string): void {
    const tooltip = this.activeTooltips.get(target);
    if (tooltip) {
      tooltip.remove();
      this.activeTooltips.delete(target);
    }
  }
  
  private positionTooltip(tooltip: HTMLElement, target: Element, position: string): void {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    switch (position) {
      case 'top':
        tooltip.style.left = `${targetRect.left + targetRect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${targetRect.top - tooltipRect.height - 8}px`;
        break;
      case 'bottom':
        tooltip.style.left = `${targetRect.left + targetRect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${targetRect.bottom + 8}px`;
        break;
      case 'left':
        tooltip.style.left = `${targetRect.left - tooltipRect.width - 8}px`;
        tooltip.style.top = `${targetRect.top + targetRect.height / 2 - tooltipRect.height / 2}px`;
        break;
      case 'right':
        tooltip.style.left = `${targetRect.right + 8}px`;
        tooltip.style.top = `${targetRect.top + targetRect.height / 2 - tooltipRect.height / 2}px`;
        break;
    }
  }
  
  cleanup(): void {
    this.activeTooltips.forEach(tooltip => tooltip.remove());
    this.activeTooltips.clear();
  }
}

class GestureHandler {
  private callbacks: Map<string, (gesture: UserGesture) => void> = new Map();
  
  on(type: string, callback: (gesture: UserGesture) => void): void {
    this.callbacks.set(type, callback);
  }
  
  cleanup(): void {
    this.callbacks.clear();
  }
}

// Singleton instance
export const enhancedUXSystem = new EnhancedUXSystem();

// Utility functions
export function createFeedbackMessage(
  type: FeedbackItem['type'],
  message: string,
  action?: FeedbackItem['action']
): Omit<FeedbackItem, 'id' | 'timestamp'> {
  return {
    type,
    message,
    action,
    icon: getFeedbackIcon(type)
  };
}

export function getFeedbackIcon(type: FeedbackItem['type']): string {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    hint: '💡'
  };
  
  return icons[type] || 'ℹ️';
}

export function isAccessibilityEnabled(): boolean {
  return enhancedUXSystem.currentUXState.subscribe(state => state.userPreferences.accessibilityMode);
} 