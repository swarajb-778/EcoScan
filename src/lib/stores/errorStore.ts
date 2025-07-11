import { writable } from 'svelte/store';
import { performanceMonitor } from '$lib/utils/performance';
import { diagnostic } from '$lib/utils/diagnostic.js';
import { errorRecovery } from '$lib/utils/error-recovery.js';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  context?: string;
  timestamp: number;
  dismissible: boolean;
  autoHide: boolean;
  duration?: number;
  error?: Error;
}

interface ErrorState {
  errors: AppError[];
  toasts: AppError[];
}

function createErrorStore() {
  const { subscribe, set, update } = writable<ErrorState>({
    errors: [],
    toasts: []
  });

  return {
    subscribe,

    /**
     * Add a new error
     */
    addError(
      message: string, 
      type: 'error' | 'warning' | 'info' = 'error',
      options: {
        context?: string;
        dismissible?: boolean;
        autoHide?: boolean;
        duration?: number;
        error?: Error;
        toast?: boolean;
      } = {}
    ) {
      const {
        context,
        dismissible = true,
        autoHide = type !== 'error',
        duration = type === 'error' ? 0 : 5000,
        error,
        toast = true
      } = options;

      const newError: AppError = {
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message,
        type,
        context,
        timestamp: Date.now(),
        dismissible,
        autoHide,
        duration,
        error
      };

      // Record error for performance monitoring and diagnostics
      if (error) {
        diagnostic.logError(`${message}: ${error.message}`, context || 'AppError');
        console.error('Application error:', error, context);
      } else {
        if (type === 'error') {
          diagnostic.logError(message, context || 'AppError');
        } else if (type === 'warning') {
          diagnostic.logWarning(message, context || 'AppError');
        }
      }

      update(state => {
        const newState = { ...state };
        
        // Add to appropriate collection
        if (toast) {
          newState.toasts = [...state.toasts, newError];
        } else {
          newState.errors = [...state.errors, newError];
        }

        return newState;
      });

      // Auto-hide if configured
      if (autoHide && duration && duration > 0) {
        setTimeout(() => {
          this.dismissError(newError.id);
        }, duration);
      }

      return newError.id;
    },

    /**
     * Dismiss an error by ID
     */
    dismissError(id: string) {
      update(state => ({
        errors: state.errors.filter(e => e.id !== id),
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    },

    /**
     * Dismiss all errors of a type
     */
    dismissAllOfType(type: 'error' | 'warning' | 'info') {
      update(state => ({
        errors: state.errors.filter(e => e.type !== type),
        toasts: state.toasts.filter(t => t.type !== type)
      }));
    },

    /**
     * Clear all errors and toasts
     */
    clearAll() {
      set({ errors: [], toasts: [] });
    },

    /**
     * Convenience methods for different error types
     */
    error(message: string, options?: { context?: string; error?: Error }) {
      return this.addError(message, 'error', { ...options, toast: true });
    },

    warning(message: string, options?: { context?: string }) {
      return this.addError(message, 'warning', { ...options, toast: true });
    },

    info(message: string, options?: { context?: string }) {
      return this.addError(message, 'info', { ...options, toast: true });
    },

    /**
     * Handle camera permission errors
     */
    handleCameraError(error: Error) {
      let message = 'Camera access failed';
      
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Please enable camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found. Please ensure your device has a camera.';
      } else if (error.name === 'NotReadableError') {
        message = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Camera constraints cannot be satisfied. Try adjusting settings.';
      } else if (error.name === 'SecurityError') {
        message = 'Camera access blocked for security reasons. Please use HTTPS.';
      }

      return this.error(message, { context: 'camera', error });
    },

    /**
     * Handle microphone permission errors
     */
    handleMicrophoneError(error: Error) {
      let message = 'Microphone access failed';
      
      if (error.name === 'NotAllowedError') {
        message = 'Microphone permission denied. Please enable microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        message = 'No microphone found. Please ensure your device has a microphone.';
      } else if (error.name === 'NotReadableError') {
        message = 'Microphone is already in use by another application.';
      }

      return this.error(message, { context: 'microphone', error });
    },

    /**
     * Handle model loading errors
     */
    handleModelError(error: Error) {
      let message = 'Failed to load AI model';
      
      if (error.message.includes('network')) {
        message = 'Network error loading AI model. Please check your connection.';
      } else if (error.message.includes('memory')) {
        message = 'Not enough memory to load AI model. Try closing other apps.';
      } else if (error.message.includes('unsupported')) {
        message = 'Your device does not support the required AI features.';
      }

      return this.error(message, { context: 'model', error });
    },

    /**
     * Handle generic application errors
     */
    handleGenericError(error: Error, context?: string) {
      const message = error.message || 'An unexpected error occurred';
      return this.error(message, { context, error });
    },

    /**
     * Attempt automatic error recovery
     */
    async attemptRecovery(errorId: string) {
      let errorToRecover: AppError | undefined;
      
      const currentState = new Promise<ErrorState>((resolve) => {
        const unsubscribe = this.subscribe((state) => {
          unsubscribe();
          resolve(state);
        });
      });
      
      const state = await currentState;
      errorToRecover = [...state.errors, ...state.toasts].find(e => e.id === errorId);
      
      if (!errorToRecover) {
        diagnostic.logWarning(`Error ${errorId} not found for recovery`, 'ErrorStore');
        return false;
      }

      diagnostic.logWarning(`Attempting recovery for error: ${errorToRecover.message}`, 'ErrorStore');
      
      try {
        const recoveryResult = await errorRecovery.recoverFromError(
          errorToRecover.message, 
          errorToRecover.context
        );
        
        if (recoveryResult.success) {
          // Remove the original error
          this.dismissError(errorId);
          
          // Show success message
          this.info('Issue resolved automatically', { context: 'recovery' });
          
          diagnostic.logWarning(`Recovery successful for error: ${errorToRecover.message}`, 'ErrorStore');
          return true;
        } else {
          // Show recovery failure with recommendations
          const recommendations = recoveryResult.recommendations.join(' ');
          this.warning(`Auto-recovery failed: ${recommendations}`, { context: 'recovery' });
          
          diagnostic.logError(`Recovery failed for error: ${errorToRecover.message}`, 'ErrorStore');
          return false;
        }
      } catch (recoveryError) {
        diagnostic.logError(`Recovery attempt threw error: ${recoveryError}`, 'ErrorStore');
        this.error('Recovery system failed', { context: 'recovery', error: recoveryError as Error });
        return false;
      }
    },

    /**
     * Generate diagnostic report for all errors
     */
    generateErrorReport() {
      return new Promise<any>((resolve) => {
        const unsubscribe = this.subscribe((state) => {
          unsubscribe();
          const report = {
            timestamp: new Date().toISOString(),
            errorCount: state.errors.length,
            toastCount: state.toasts.length,
            errors: state.errors.map(e => ({
              id: e.id,
              message: e.message,
              type: e.type,
              context: e.context,
              timestamp: e.timestamp
            })),
            toasts: state.toasts.map(t => ({
              id: t.id,
              message: t.message,
              type: t.type,
              context: t.context,
              timestamp: t.timestamp
            })),
            recoveryHistory: errorRecovery.getRecoveryHistory(),
            recoveryStats: errorRecovery.generateRecoveryReport()
          };
          resolve(report);
        });
      });
    }
  };
}

export const errorStore = createErrorStore(); 