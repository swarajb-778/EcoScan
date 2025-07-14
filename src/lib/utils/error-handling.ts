/**
 * Comprehensive Error Handling System for EcoScan
 * Handles all wrong input scenarios and edge cases with graceful recovery
 */

import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

// Error types and severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'camera' | 'ml' | 'voice' | 'upload' | 'network' | 'storage' | 'browser' | 'security' | 'performance';

export interface ErrorDetails {
  id: string;
  message: string;
  originalError?: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, any>;
  userAction?: string;
  recoveryActions?: string[];
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorRecoveryStrategy {
  condition: (error: ErrorDetails) => boolean;
  handler: (error: ErrorDetails) => Promise<boolean>;
  fallback?: () => Promise<void>;
  maxAttempts: number;
  cooldownPeriod: number;
}

// User-friendly error messages
export const ErrorMessages = {
  // Camera errors
  CAMERA_NOT_FOUND: 'No camera found on this device. Please connect a camera or try uploading an image instead.',
  CAMERA_PERMISSION_DENIED: 'Camera access is required for scanning. Please enable camera permissions in your browser settings.',
  CAMERA_BUSY: 'Camera is currently in use by another application. Please close other camera apps and try again.',
  CAMERA_HARDWARE_ERROR: 'Camera hardware error occurred. Please try restarting your device.',
  CAMERA_DISCONNECTED: 'Camera was disconnected. Please reconnect your camera and try again.',
  CAMERA_UNSUPPORTED: 'Camera access is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.',
  
  // ML/AI errors
  MODEL_LOADING_FAILED: 'AI models are still loading. Please wait a moment and try again.',
  MODEL_CORRUPTED: 'AI model appears to be corrupted. Please refresh the page to reload the model.',
  INFERENCE_FAILED: 'AI processing failed. Please try again with a different image.',
  MODEL_NOT_READY: 'AI system is initializing. Please wait a moment before scanning.',
  GPU_MEMORY_EXHAUSTED: 'Device memory is low. Please close some browser tabs and try again.',
  
  // Voice recognition errors
  VOICE_NOT_SUPPORTED: 'Voice recognition is not supported in this browser. Please use Chrome or Edge.',
  VOICE_PERMISSION_DENIED: 'Microphone access is required for voice input. Please enable microphone permissions.',
  VOICE_UNCLEAR: 'Could not understand your voice. Please speak clearly and try again.',
  VOICE_NO_SPEECH: 'No speech detected. Please try speaking again.',
  VOICE_TIMEOUT: 'Voice recognition timed out. Please try again.',
  
  // Upload errors
  UPLOAD_INVALID_TYPE: 'Please select a valid image file (JPG, PNG, WebP, or GIF).',
  UPLOAD_TOO_LARGE: 'File is too large. Please select an image smaller than 10MB.',
  UPLOAD_CORRUPTED: 'Unable to process this image. Please try a different image.',
  UPLOAD_EMPTY: 'Selected file appears to be empty. Please choose a different file.',
  UPLOAD_MALICIOUS: 'File appears to be potentially harmful and cannot be processed.',
  
  // Network errors
  NETWORK_OFFLINE: 'You are currently offline. Some features may not be available.',
  NETWORK_SLOW: 'Network connection is slow. Please wait while content loads.',
  NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
  
  // Storage errors
  STORAGE_FULL: 'Device storage is full. Please clear some space and try again.',
  STORAGE_QUOTA_EXCEEDED: 'Browser storage limit exceeded. Please clear browsing data.',
  STORAGE_PERMISSION_DENIED: 'Storage access denied. Some features may not work properly.',
  
  // Browser compatibility errors
  BROWSER_UNSUPPORTED: 'This browser is not fully supported. Please upgrade to a newer version.',
  BROWSER_FEATURE_MISSING: 'Required browser feature is not available. Please use a modern browser.',
  HTTPS_REQUIRED: 'Camera and microphone require HTTPS. Please use https:// or localhost.',
  
  // Security errors
  SECURITY_VIOLATION: 'Security violation detected. Please refresh the page and try again.',
  CONTENT_BLOCKED: 'Content was blocked by security policies. Please check your browser settings.',
  
  // Performance errors
  PERFORMANCE_DEGRADED: 'Performance is degraded. Consider closing other applications.',
  MEMORY_PRESSURE: 'System is running low on memory. Please close unnecessary tabs.',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  TEMPORARY_ERROR: 'Temporary error occurred. Please wait a moment and try again.',
  CRITICAL_ERROR: 'Critical error occurred. Please refresh the page.'
};

// Recovery strategies
export const RecoveryStrategies = {
  // Camera recovery
  CAMERA_RETRY: ['restart-camera', 'switch-camera', 'reduce-quality'],
  CAMERA_FALLBACK: ['upload-mode', 'voice-input', 'manual-entry'],
  
  // ML recovery
  ML_RETRY: ['reload-model', 'fallback-model', 'cpu-inference'],
  ML_FALLBACK: ['cached-results', 'manual-classification', 'basic-mode'],
  
  // Voice recovery
  VOICE_RETRY: ['restart-recognition', 'reduce-sensitivity', 'text-input'],
  VOICE_FALLBACK: ['keyboard-input', 'camera-mode', 'upload-mode'],
  
  // Upload recovery
  UPLOAD_RETRY: ['resize-image', 'change-format', 'reduce-quality'],
  UPLOAD_FALLBACK: ['camera-mode', 'voice-input', 'manual-entry'],
  
  // Network recovery
  NETWORK_RETRY: ['retry-request', 'use-cache', 'offline-mode'],
  NETWORK_FALLBACK: ['offline-functionality', 'cached-data', 'basic-mode'],
  
  // Storage recovery
  STORAGE_RETRY: ['clear-cache', 'compress-data', 'reduce-storage'],
  STORAGE_FALLBACK: ['memory-only', 'no-cache', 'basic-mode'],
  
  // Browser recovery
  BROWSER_RETRY: ['reload-page', 'clear-cache', 'incognito-mode'],
  BROWSER_FALLBACK: ['basic-mode', 'fallback-ui', 'minimal-features']
};

// Error handling class
export class ErrorHandler {
  private errors: Writable<ErrorDetails[]> = writable([]);
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private cooldownMap: Map<string, number> = new Map();
  
  constructor() {
    this.setupDefaultStrategies();
  }

  private setupDefaultStrategies(): void {
    // Camera error recovery
    this.addRecoveryStrategy('camera-permission', {
      condition: (error) => error.category === 'camera' && error.message.includes('permission'),
      handler: async (error) => {
        // Guide user to enable permissions
        this.showPermissionGuide('camera');
        return false; // User must manually enable
      },
      maxAttempts: 1,
      cooldownPeriod: 0
    });

    // ML model recovery
    this.addRecoveryStrategy('ml-model-failure', {
      condition: (error) => error.category === 'ml' && error.message.includes('model'),
      handler: async (error) => {
        try {
          // Attempt to reload model
          await this.reloadMLModel();
          return true;
        } catch {
          return false;
        }
      },
      fallback: async () => {
        // Switch to CPU-only inference
        await this.switchToCPUInference();
      },
      maxAttempts: 3,
      cooldownPeriod: 5000
    });

    // Voice recognition recovery
    this.addRecoveryStrategy('voice-recognition-failure', {
      condition: (error) => error.category === 'voice',
      handler: async (error) => {
        try {
          // Restart voice recognition
          await this.restartVoiceRecognition();
          return true;
        } catch {
          return false;
        }
      },
      fallback: async () => {
        // Switch to text input
        this.switchToTextInput();
      },
      maxAttempts: 2,
      cooldownPeriod: 3000
    });

    // Upload validation recovery
    this.addRecoveryStrategy('upload-validation-failure', {
      condition: (error) => error.category === 'upload' && error.message.includes('invalid'),
      handler: async (error) => {
        try {
          // Attempt to convert/resize image
          await this.processUploadedImage(error.context?.file);
          return true;
        } catch {
          return false;
        }
      },
      fallback: async () => {
        // Suggest alternative input methods
        this.suggestAlternativeInput();
      },
      maxAttempts: 2,
      cooldownPeriod: 1000
    });

    // Network error recovery
    this.addRecoveryStrategy('network-failure', {
      condition: (error) => error.category === 'network',
      handler: async (error) => {
        try {
          // Retry with exponential backoff
          await this.retryWithBackoff(error.context?.request);
          return true;
        } catch {
          return false;
        }
      },
      fallback: async () => {
        // Switch to offline mode
        this.enableOfflineMode();
      },
      maxAttempts: 3,
      cooldownPeriod: 2000
    });
  }

  // Add recovery strategy
  addRecoveryStrategy(id: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(id, strategy);
  }

  // Handle error with automatic recovery
  async handleError(error: Error | ErrorDetails, context?: Record<string, any>): Promise<boolean> {
    const errorDetails = this.normalizeError(error, context);
    
    // Add to error store
    this.errors.update(errors => [...errors, errorDetails]);
    
    // Log error for debugging
    this.logError(errorDetails);
    
    // Attempt recovery
    const recovered = await this.attemptRecovery(errorDetails);
    
    if (recovered) {
      // Remove from error store if recovered
      this.errors.update(errors => errors.filter(e => e.id !== errorDetails.id));
    }
    
    return recovered;
  }

  // Normalize error to ErrorDetails
  private normalizeError(error: Error | ErrorDetails, context?: Record<string, any>): ErrorDetails {
    if ('id' in error) {
      return error as ErrorDetails;
    }
    
    return {
      id: this.generateErrorId(),
      message: this.getUserFriendlyMessage(error),
      originalError: error,
      category: this.categorizeError(error),
      severity: this.assessSeverity(error),
      timestamp: Date.now(),
      context,
      canRetry: this.canRetry(error),
      retryCount: 0,
      maxRetries: this.getMaxRetries(error),
      recoveryActions: this.getRecoveryActions(error)
    };
  }

  // Attempt automatic recovery
  private async attemptRecovery(error: ErrorDetails): Promise<boolean> {
    for (const [id, strategy] of this.recoveryStrategies) {
      if (strategy.condition(error)) {
        // Check cooldown
        const lastAttempt = this.cooldownMap.get(id) || 0;
        if (Date.now() - lastAttempt < strategy.cooldownPeriod) {
          continue;
        }
        
        // Check retry count
        if (error.retryCount >= strategy.maxAttempts) {
          // Execute fallback if available
          if (strategy.fallback) {
            await strategy.fallback();
          }
          continue;
        }
        
        // Attempt recovery
        this.cooldownMap.set(id, Date.now());
        error.retryCount++;
        
        const recovered = await strategy.handler(error);
        
        if (recovered) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Error categorization
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('camera') || message.includes('video') || message.includes('getusermedia')) {
      return 'camera';
    }
    if (message.includes('model') || message.includes('inference') || message.includes('onnx')) {
      return 'ml';
    }
    if (message.includes('speech') || message.includes('voice') || message.includes('audio')) {
      return 'voice';
    }
    if (message.includes('upload') || message.includes('file') || message.includes('image')) {
      return 'upload';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('storage') || message.includes('quota') || message.includes('memory')) {
      return 'storage';
    }
    if (message.includes('browser') || message.includes('supported') || message.includes('feature')) {
      return 'browser';
    }
    if (message.includes('security') || message.includes('permission') || message.includes('denied')) {
      return 'security';
    }
    if (message.includes('performance') || message.includes('slow') || message.includes('timeout')) {
      return 'performance';
    }
    
    return 'browser';
  }

  // Assess error severity
  private assessSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal') || message.includes('corrupt')) {
      return 'critical';
    }
    if (message.includes('permission') || message.includes('denied') || message.includes('failed')) {
      return 'high';
    }
    if (message.includes('warning') || message.includes('degraded') || message.includes('slow')) {
      return 'medium';
    }
    
    return 'low';
  }

  // Get user-friendly message
  private getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Camera errors
    if (message.includes('permission denied') && message.includes('camera')) {
      return ErrorMessages.CAMERA_PERMISSION_DENIED;
    }
    if (message.includes('camera') && message.includes('not found')) {
      return ErrorMessages.CAMERA_NOT_FOUND;
    }
    if (message.includes('device busy') || message.includes('camera busy')) {
      return ErrorMessages.CAMERA_BUSY;
    }
    
    // ML errors
    if (message.includes('model') && message.includes('loading')) {
      return ErrorMessages.MODEL_LOADING_FAILED;
    }
    if (message.includes('inference') && message.includes('failed')) {
      return ErrorMessages.INFERENCE_FAILED;
    }
    if (message.includes('gpu') && message.includes('memory')) {
      return ErrorMessages.GPU_MEMORY_EXHAUSTED;
    }
    
    // Voice errors
    if (message.includes('speech') && message.includes('not supported')) {
      return ErrorMessages.VOICE_NOT_SUPPORTED;
    }
    if (message.includes('microphone') && message.includes('permission')) {
      return ErrorMessages.VOICE_PERMISSION_DENIED;
    }
    if (message.includes('no speech') || message.includes('silence')) {
      return ErrorMessages.VOICE_NO_SPEECH;
    }
    
    // Upload errors
    if (message.includes('invalid') && message.includes('file')) {
      return ErrorMessages.UPLOAD_INVALID_TYPE;
    }
    if (message.includes('file too large') || message.includes('size')) {
      return ErrorMessages.UPLOAD_TOO_LARGE;
    }
    if (message.includes('corrupted') && message.includes('image')) {
      return ErrorMessages.UPLOAD_CORRUPTED;
    }
    
    // Network errors
    if (message.includes('network') && message.includes('offline')) {
      return ErrorMessages.NETWORK_OFFLINE;
    }
    if (message.includes('network') && message.includes('error')) {
      return ErrorMessages.NETWORK_ERROR;
    }
    
    // Storage errors
    if (message.includes('quota') && message.includes('exceeded')) {
      return ErrorMessages.STORAGE_QUOTA_EXCEEDED;
    }
    if (message.includes('storage') && message.includes('full')) {
      return ErrorMessages.STORAGE_FULL;
    }
    
    // Browser errors
    if (message.includes('https') && message.includes('required')) {
      return ErrorMessages.HTTPS_REQUIRED;
    }
    if (message.includes('browser') && message.includes('supported')) {
      return ErrorMessages.BROWSER_UNSUPPORTED;
    }
    
    // Performance errors
    if (message.includes('memory') && message.includes('pressure')) {
      return ErrorMessages.MEMORY_PRESSURE;
    }
    if (message.includes('performance') && message.includes('degraded')) {
      return ErrorMessages.PERFORMANCE_DEGRADED;
    }
    
    // Generic fallback
    return ErrorMessages.UNKNOWN_ERROR;
  }

  // Recovery action helpers
  private async reloadMLModel(): Promise<void> {
    // Implement model reloading logic
    if (browser) {
      window.dispatchEvent(new CustomEvent('ml-model-reload'));
    }
  }

  private async switchToCPUInference(): Promise<void> {
    // Implement CPU inference fallback
    if (browser) {
      window.dispatchEvent(new CustomEvent('ml-cpu-fallback'));
    }
  }

  private async restartVoiceRecognition(): Promise<void> {
    // Implement voice recognition restart
    if (browser) {
      window.dispatchEvent(new CustomEvent('voice-restart'));
    }
  }

  private switchToTextInput(): void {
    // Implement text input fallback
    if (browser) {
      window.dispatchEvent(new CustomEvent('voice-text-fallback'));
    }
  }

  private async processUploadedImage(file: File): Promise<void> {
    // Implement image processing/conversion
    if (file) {
      // Resize or convert image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Image processing logic here
    }
  }

  private suggestAlternativeInput(): void {
    // Implement alternative input suggestion
    if (browser) {
      window.dispatchEvent(new CustomEvent('suggest-alternative-input'));
    }
  }

  private async retryWithBackoff(request: any): Promise<void> {
    // Implement exponential backoff retry
    let delay = 1000;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      try {
        // Retry request
        await request();
        return;
      } catch (error) {
        delay *= 2;
        if (i === 2) throw error;
      }
    }
  }

  private enableOfflineMode(): void {
    // Implement offline mode
    if (browser) {
      window.dispatchEvent(new CustomEvent('enable-offline-mode'));
    }
  }

  private showPermissionGuide(type: 'camera' | 'microphone'): void {
    // Show permission guide UI
    if (browser) {
      window.dispatchEvent(new CustomEvent('show-permission-guide', {
        detail: { type }
      }));
    }
  }

  // Utility methods
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private canRetry(error: Error): boolean {
    const nonRetryableErrors = [
      'permission denied',
      'not supported',
      'invalid file',
      'corrupted'
    ];
    
    return !nonRetryableErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  private getMaxRetries(error: Error): number {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout')) {
      return 3;
    }
    if (message.includes('temporary') || message.includes('busy')) {
      return 2;
    }
    if (message.includes('permission') || message.includes('not supported')) {
      return 0;
    }
    
    return 1;
  }

  private getRecoveryActions(error: Error): string[] {
    const category = this.categorizeError(error);
    return (RecoveryStrategies as any)[`${category.toUpperCase()}_RETRY`] || [];
  }

  private logError(error: ErrorDetails): void {
    if (browser) {
      console.error(`[EcoScan Error] ${error.category}:${error.severity}`, {
        message: error.message,
        originalError: error.originalError,
        context: error.context,
        timestamp: new Date(error.timestamp).toISOString()
      });
    }
  }

  // Public API
  getErrors() {
    return this.errors;
  }

  clearErrors(): void {
    this.errors.set([]);
  }

  clearError(id: string): void {
    this.errors.update(errors => errors.filter(e => e.id !== id));
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Convenience functions
export const handleError = (error: Error | ErrorDetails, context?: Record<string, any>) => {
  return errorHandler.handleError(error, context);
};

export const getErrors = () => errorHandler.getErrors();

export const clearErrors = () => errorHandler.clearErrors();

export const clearError = (id: string) => errorHandler.clearError(id);

// Input validation utilities
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: ErrorMessages.UPLOAD_INVALID_TYPE };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: ErrorMessages.UPLOAD_TOO_LARGE };
  }
  
  if (file.size === 0) {
    return { valid: false, error: ErrorMessages.UPLOAD_EMPTY };
  }
  
  return { valid: true };
};

export const validateVoiceInput = (transcript: string): { valid: boolean; error?: string } => {
  if (!transcript || transcript.trim().length === 0) {
    return { valid: false, error: ErrorMessages.VOICE_NO_SPEECH };
  }
  
  if (transcript.length > 100) {
    return { valid: false, error: 'Voice input too long. Please keep it under 100 characters.' };
  }
  
  // Check for inappropriate content
  const inappropriateWords = ['script', 'javascript', 'eval', 'function'];
  if (inappropriateWords.some(word => transcript.toLowerCase().includes(word))) {
    return { valid: false, error: 'Invalid voice input detected.' };
  }
  
  return { valid: true };
};

export const validateImageData = (imageData: ImageData): { valid: boolean; error?: string } => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return { valid: false, error: ErrorMessages.UPLOAD_CORRUPTED };
  }
  
  const expectedSize = imageData.width * imageData.height * 4;
  if (imageData.data.length !== expectedSize) {
    return { valid: false, error: ErrorMessages.UPLOAD_CORRUPTED };
  }
  
  return { valid: true };
};

export default errorHandler; 