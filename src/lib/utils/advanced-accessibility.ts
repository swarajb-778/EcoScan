/**
 * Advanced Accessibility System
 * Provides alternative input methods and motor impairment support
 */

export interface AccessibilitySettings {
  // Motor impairment support
  dwellTime: number; // Time to activate hover actions
  clickAssistance: boolean; // Larger click targets
  dragAssistance: boolean; // Simplified drag interactions
  tremorCompensation: boolean; // Filter out tremor movements
  
  // Alternative input methods
  eyeTracking: boolean; // Eye tracking support
  headMovement: boolean; // Head movement tracking
  breathControl: boolean; // Breath-based controls
  switchAccess: boolean; // Switch/button interface
  
  // Visual accessibility
  highContrast: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  motionReduction: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  
  // Cognitive accessibility
  simplifiedInterface: boolean;
  audioFeedback: boolean;
  visualFeedback: boolean;
  pauseOnHover: boolean;
}

interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
  confidence: number;
}

interface SwitchInput {
  id: string;
  type: 'button' | 'key' | 'joystick';
  action: 'select' | 'next' | 'previous' | 'activate' | 'cancel';
  keyCode?: string;
}

class AdvancedAccessibility {
  private settings: AccessibilitySettings;
  private gazeHistory: GazePoint[] = [];
  private switchInputs: SwitchInput[] = [];
  private dwellTimer: number | null = null;
  private currentFocusElement: HTMLElement | null = null;
  private scanIndex = 0;
  private isScanning = false;
  private speechSynthesis: SpeechSynthesis | null = null;
  
  // Motion tracking for head movement
  private motionData: { x: number; y: number; timestamp: number }[] = [];
  private lastMotionEvent: DeviceMotionEvent | null = null;
  
  // Tremor compensation
  private tremorFilter = new TremorFilter();
  
  constructor() {
    this.settings = this.loadSettings();
    this.initializeAccessibility();
    this.setupEventListeners();
  }

  /**
   * Initialize accessibility features based on settings
   */
  private initializeAccessibility(): void {
    // Setup speech synthesis
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
    
    // Apply visual accessibility settings
    this.applyVisualSettings();
    
    // Initialize input methods
    if (this.settings.eyeTracking) {
      this.initializeEyeTracking();
    }
    
    if (this.settings.headMovement) {
      this.initializeHeadMovement();
    }
    
    if (this.settings.breathControl) {
      this.initializeBreathControl();
    }
    
    if (this.settings.switchAccess) {
      this.initializeSwitchAccess();
    }
    
    console.log('[AdvancedAccessibility] Initialized with settings:', this.settings);
  }

  /**
   * Setup event listeners for accessibility features
   */
  private setupEventListeners(): void {
    // Dwell time activation
    if (this.settings.dwellTime > 0) {
      document.addEventListener('mousemove', this.handleDwellMovement.bind(this));
      document.addEventListener('mouseleave', this.cancelDwell.bind(this));
    }
    
    // Click assistance
    if (this.settings.clickAssistance) {
      this.enableClickAssistance();
    }
    
    // Tremor compensation
    if (this.settings.tremorCompensation) {
      document.addEventListener('mousemove', this.handleTremorCompensation.bind(this));
    }
    
    // Switch access
    if (this.settings.switchAccess) {
      document.addEventListener('keydown', this.handleSwitchInput.bind(this));
    }
    
    // Motion detection for head movement
    if (this.settings.headMovement && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }
  }

  /**
   * Handle dwell-based activation
   */
  private handleDwellMovement(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!this.isInteractiveElement(target)) {
      this.cancelDwell();
      return;
    }
    
    if (this.currentFocusElement !== target) {
      this.cancelDwell();
      this.currentFocusElement = target;
      this.provideFeedback(`Hovering on ${this.getElementDescription(target)}`);
      
      this.dwellTimer = window.setTimeout(() => {
        this.activateElement(target);
      }, this.settings.dwellTime);
    }
  }

  /**
   * Cancel dwell timer
   */
  private cancelDwell(): void {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
    this.currentFocusElement = null;
  }

  /**
   * Enable click assistance with larger targets
   */
  private enableClickAssistance(): void {
    const style = document.createElement('style');
    style.textContent = `
      .accessibility-large-target {
        padding: 12px !important;
        margin: 4px !important;
        min-height: 44px !important;
        min-width: 44px !important;
      }
      
      button, a, input, select, textarea {
        min-height: 44px;
        min-width: 44px;
        padding: 8px 12px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Handle tremor compensation
   */
  private handleTremorCompensation(event: MouseEvent): void {
    const filtered = this.tremorFilter.filter(event.clientX, event.clientY);
    
    if (filtered) {
      // Create synthetic mouse event with filtered coordinates
      const syntheticEvent = new MouseEvent(event.type, {
        ...event,
        clientX: filtered.x,
        clientY: filtered.y
      });
      
      // Prevent original event and dispatch filtered one
      event.preventDefault();
      event.stopPropagation();
      event.target?.dispatchEvent(syntheticEvent);
    }
  }

  /**
   * Initialize eye tracking (requires WebGazer or similar library)
   */
  private async initializeEyeTracking(): Promise<void> {
    try {
      // Check if WebGazer is available (would need to be loaded separately)
      if (typeof window.webgazer !== 'undefined') {
        await window.webgazer.setRegression('ridge')
          .setTracker('clmtrackr')
          .setGazeListener(this.handleGazePoint.bind(this))
          .begin();
        
        console.log('[AdvancedAccessibility] Eye tracking initialized');
      } else {
        console.warn('[AdvancedAccessibility] WebGazer not available for eye tracking');
      }
    } catch (error) {
      console.error('[AdvancedAccessibility] Failed to initialize eye tracking:', error);
    }
  }

  /**
   * Handle gaze point from eye tracking
   */
  private handleGazePoint(data: any): void {
    const gazePoint: GazePoint = {
      x: data.x,
      y: data.y,
      timestamp: Date.now(),
      confidence: data.confidence || 0.5
    };
    
    this.gazeHistory.push(gazePoint);
    
    // Keep only recent gaze history
    if (this.gazeHistory.length > 100) {
      this.gazeHistory = this.gazeHistory.slice(-100);
    }
    
    // Check for gaze-based selection
    this.checkGazeSelection(gazePoint);
  }

  /**
   * Check if gaze indicates selection intent
   */
  private checkGazeSelection(gazePoint: GazePoint): void {
    const element = document.elementFromPoint(gazePoint.x, gazePoint.y) as HTMLElement;
    
    if (!element || !this.isInteractiveElement(element)) return;
    
    // Check for sustained gaze
    const recentGaze = this.gazeHistory.slice(-10);
    const gazeOnElement = recentGaze.filter(point => {
      const el = document.elementFromPoint(point.x, point.y);
      return el === element;
    });
    
    if (gazeOnElement.length >= 8 && gazePoint.confidence > 0.7) {
      this.activateElement(element);
      this.gazeHistory = []; // Clear after activation
    }
  }

  /**
   * Initialize head movement tracking
   */
  private initializeHeadMovement(): void {
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
    }
  }

  /**
   * Handle device orientation for head movement
   */
  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    // Use device orientation for head tracking
    const alpha = event.alpha || 0; // Z-axis rotation
    const beta = event.beta || 0;   // X-axis rotation
    const gamma = event.gamma || 0; // Y-axis rotation
    
    const orientationPoint = {
      x: gamma, // Tilt left/right
      y: beta,  // Tilt forward/back
      timestamp: Date.now()
    };
    
    this.motionData.push(orientationPoint);
    
    // Keep only recent motion data
    if (this.motionData.length > 20) {
      this.motionData = this.motionData.slice(-20);
    }
    
    // Detect intentional head movements
    this.detectHeadGestures();
  }

  /**
   * Handle device motion for head movement
   */
  private handleDeviceMotion(event: DeviceMotionEvent): void {
    this.lastMotionEvent = event;
    
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    
    const motionPoint = {
      x: acceleration.x || 0,
      y: acceleration.y || 0,
      timestamp: Date.now()
    };
    
    this.motionData.push(motionPoint);
    
    // Keep only recent motion data
    if (this.motionData.length > 20) {
      this.motionData = this.motionData.slice(-20);
    }
    
    // Detect intentional head movements
    this.detectHeadGestures();
  }

  /**
   * Detect head gesture patterns
   */
  private detectHeadGestures(): void {
    if (this.motionData.length < 10) return;
    
    const recent = this.motionData.slice(-10);
    const xVariance = this.calculateVariance(recent.map(d => d.x));
    const yVariance = this.calculateVariance(recent.map(d => d.y));
    
    // Detect nod (Y-axis movement)
    if (yVariance > 2 && xVariance < 1) {
      this.handleHeadGesture('nod');
    }
    
    // Detect shake (X-axis movement)
    if (xVariance > 2 && yVariance < 1) {
      this.handleHeadGesture('shake');
    }
  }

  /**
   * Handle detected head gesture
   */
  private handleHeadGesture(gesture: 'nod' | 'shake'): void {
    if (gesture === 'nod') {
      // Activate current focus element
      if (this.currentFocusElement) {
        this.activateElement(this.currentFocusElement);
      }
    } else if (gesture === 'shake') {
      // Cancel current action or go back
      this.cancelCurrentAction();
    }
    
    this.motionData = []; // Clear after gesture
  }

  /**
   * Initialize breath control (requires microphone)
   */
  private async initializeBreathControl(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const detectBreath = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        
        // Detect breath patterns
        if (average > 50) { // Threshold for breath detection
          this.handleBreathInput('inhale');
        } else if (average < 20) {
          this.handleBreathInput('exhale');
        }
        
        requestAnimationFrame(detectBreath);
      };
      
      detectBreath();
      console.log('[AdvancedAccessibility] Breath control initialized');
      
    } catch (error) {
      console.error('[AdvancedAccessibility] Failed to initialize breath control:', error);
    }
  }

  /**
   * Handle breath input
   */
  private handleBreathInput(type: 'inhale' | 'exhale'): void {
    if (type === 'inhale') {
      this.moveToNextElement();
    } else if (type === 'exhale') {
      if (this.currentFocusElement) {
        this.activateElement(this.currentFocusElement);
      }
    }
  }

  /**
   * Initialize switch access scanning
   */
  private initializeSwitchAccess(): void {
    // Default switch configurations
    this.switchInputs = [
      { id: 'switch1', type: 'key', action: 'select', keyCode: 'Space' },
      { id: 'switch2', type: 'key', action: 'next', keyCode: 'Tab' },
      { id: 'switch3', type: 'key', action: 'previous', keyCode: 'Shift+Tab' },
      { id: 'switch4', type: 'key', action: 'cancel', keyCode: 'Escape' }
    ];
    
    this.startScanning();
  }

  /**
   * Start switch access scanning
   */
  private startScanning(): void {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.scanIndex = 0;
    
    const interactiveElements = this.getInteractiveElements();
    
    const scan = () => {
      if (!this.isScanning) return;
      
      // Remove previous highlight
      document.querySelectorAll('.scan-highlight').forEach(el => {
        el.classList.remove('scan-highlight');
      });
      
      // Highlight current element
      if (interactiveElements[this.scanIndex]) {
        const element = interactiveElements[this.scanIndex];
        element.classList.add('scan-highlight');
        this.currentFocusElement = element;
        
        // Provide audio feedback
        this.provideFeedback(this.getElementDescription(element));
      }
      
      setTimeout(() => {
        this.scanIndex = (this.scanIndex + 1) % interactiveElements.length;
        scan();
      }, 2000); // 2 second scan interval
    };
    
    scan();
  }

  /**
   * Handle switch input
   */
  private handleSwitchInput(event: KeyboardEvent): void {
    const keyCombo = event.shiftKey ? `Shift+${event.code}` : event.code;
    const switchInput = this.switchInputs.find(s => s.keyCode === keyCombo);
    
    if (!switchInput) return;
    
    event.preventDefault();
    
    switch (switchInput.action) {
      case 'select':
        if (this.currentFocusElement) {
          this.activateElement(this.currentFocusElement);
        }
        break;
      case 'next':
        this.moveToNextElement();
        break;
      case 'previous':
        this.moveToPreviousElement();
        break;
      case 'cancel':
        this.cancelCurrentAction();
        break;
    }
  }

  /**
   * Apply visual accessibility settings
   */
  private applyVisualSettings(): void {
    const style = document.createElement('style');
    let css = '';
    
    if (this.settings.highContrast) {
      css += `
        * {
          filter: contrast(150%) brightness(120%) !important;
        }
      `;
    }
    
    if (this.settings.colorBlindMode !== 'none') {
      const filters = {
        protanopia: 'sepia(100%) saturate(0%) hue-rotate(0deg)',
        deuteranopia: 'sepia(100%) saturate(0%) hue-rotate(90deg)',
        tritanopia: 'sepia(100%) saturate(0%) hue-rotate(180deg)'
      };
      css += `* { filter: ${filters[this.settings.colorBlindMode]} !important; }`;
    }
    
    if (this.settings.motionReduction) {
      css += `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `;
    }
    
    if (this.settings.fontSize !== 'normal') {
      const sizes = { large: '1.25', 'extra-large': '1.5' };
      css += `* { font-size: ${sizes[this.settings.fontSize]}em !important; }`;
    }
    
    css += `
      .scan-highlight {
        outline: 4px solid #ff6b35 !important;
        outline-offset: 2px !important;
        background-color: rgba(255, 107, 53, 0.1) !important;
      }
    `;
    
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Get interactive elements for scanning
   */
  private getInteractiveElements(): HTMLElement[] {
    const selectors = [
      'button:not(:disabled)',
      'a[href]',
      'input:not(:disabled)',
      'select:not(:disabled)',
      'textarea:not(:disabled)',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]'
    ];
    
    return Array.from(document.querySelectorAll(selectors.join(', '))) as HTMLElement[];
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveElements = this.getInteractiveElements();
    return interactiveElements.includes(element);
  }

  /**
   * Activate an element
   */
  private activateElement(element: HTMLElement): void {
    this.provideFeedback(`Activating ${this.getElementDescription(element)}`);
    
    if (element.tagName === 'BUTTON' || element.role === 'button') {
      element.click();
    } else if (element.tagName === 'A') {
      element.click();
    } else if (element.tagName === 'INPUT') {
      element.focus();
    }
  }

  /**
   * Get element description for screen readers
   */
  private getElementDescription(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('title') ||
           element.textContent?.trim() ||
           element.tagName.toLowerCase();
  }

  /**
   * Provide audio/visual feedback
   */
  private provideFeedback(message: string): void {
    if (this.settings.audioFeedback && this.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.volume = 0.7;
      this.speechSynthesis.speak(utterance);
    }
    
    if (this.settings.visualFeedback) {
      // Show visual notification
      this.showVisualNotification(message);
    }
  }

  /**
   * Show visual notification
   */
  private showVisualNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  /**
   * Move to next element
   */
  private moveToNextElement(): void {
    const elements = this.getInteractiveElements();
    const currentIndex = elements.indexOf(this.currentFocusElement!);
    const nextIndex = (currentIndex + 1) % elements.length;
    
    this.currentFocusElement = elements[nextIndex];
    this.currentFocusElement?.focus();
    this.provideFeedback(this.getElementDescription(this.currentFocusElement));
  }

  /**
   * Move to previous element
   */
  private moveToPreviousElement(): void {
    const elements = this.getInteractiveElements();
    const currentIndex = elements.indexOf(this.currentFocusElement!);
    const prevIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
    
    this.currentFocusElement = elements[prevIndex];
    this.currentFocusElement?.focus();
    this.provideFeedback(this.getElementDescription(this.currentFocusElement));
  }

  /**
   * Cancel current action
   */
  private cancelCurrentAction(): void {
    this.cancelDwell();
    this.provideFeedback('Action cancelled');
  }

  /**
   * Calculate variance for array of numbers
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Load accessibility settings
   */
  private loadSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem('ecoscan_accessibility_settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[AdvancedAccessibility] Failed to load settings:', error);
    }
    
    return this.getDefaultSettings();
  }

  /**
   * Get default accessibility settings
   */
  private getDefaultSettings(): AccessibilitySettings {
    return {
      dwellTime: 1500,
      clickAssistance: false,
      dragAssistance: false,
      tremorCompensation: false,
      eyeTracking: false,
      headMovement: false,
      breathControl: false,
      switchAccess: false,
      highContrast: false,
      colorBlindMode: 'none',
      motionReduction: false,
      fontSize: 'normal',
      simplifiedInterface: false,
      audioFeedback: true,
      visualFeedback: true,
      pauseOnHover: false
    };
  }

  /**
   * Update accessibility settings
   */
  updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    try {
      localStorage.setItem('ecoscan_accessibility_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('[AdvancedAccessibility] Failed to save settings:', error);
    }
    
    // Reinitialize with new settings
    this.initializeAccessibility();
  }

  /**
   * Get current settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }
}

/**
 * Tremor filter for mouse movement smoothing
 */
class TremorFilter {
  private history: { x: number; y: number; timestamp: number }[] = [];
  private readonly maxHistory = 5;
  private readonly smoothingFactor = 0.3;
  
  filter(x: number, y: number): { x: number; y: number } | null {
    const now = Date.now();
    
    this.history.push({ x, y, timestamp: now });
    
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
    
    if (this.history.length < 2) {
      return { x, y };
    }
    
    // Apply exponential moving average
    const smoothedX = this.history.reduce((sum, point, index) => {
      const weight = Math.pow(this.smoothingFactor, this.history.length - index - 1);
      return sum + point.x * weight;
    }, 0) / this.history.reduce((sum, _, index) => {
      const weight = Math.pow(this.smoothingFactor, this.history.length - index - 1);
      return sum + weight;
    }, 0);
    
    const smoothedY = this.history.reduce((sum, point, index) => {
      const weight = Math.pow(this.smoothingFactor, this.history.length - index - 1);
      return sum + point.y * weight;
    }, 0) / this.history.reduce((sum, _, index) => {
      const weight = Math.pow(this.smoothingFactor, this.history.length - index - 1);
      return sum + weight;
    }, 0);
    
    return { x: smoothedX, y: smoothedY };
  }
}

// Add global type for WebGazer
declare global {
  interface Window {
    webgazer: any;
  }
}

export const advancedAccessibility = new AdvancedAccessibility();
export default AdvancedAccessibility; 