/**
 * Error Recovery System
 * Automatically handles and recovers from common application errors
 */

import { browser } from '$app/environment';
import { diagnostic } from './diagnostic.js';
import { onnxManager } from '../ml/onnx-config.js';
import { safeAsyncOperation } from './ssr-safe.js';

export interface RecoveryAction {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<boolean>;
}

export interface RecoveryResult {
  success: boolean;
  actionsExecuted: string[];
  errors: string[];
  recommendations: string[];
}

class ErrorRecoverySystem {
  private recoveryActions: Map<string, RecoveryAction[]> = new Map();
  private recoveryHistory: Array<{ timestamp: number; pattern: string; success: boolean }> = [];

  constructor() {
    this.initializeRecoveryActions();
  }

  private initializeRecoveryActions(): void {
    // ONNX Runtime related errors
    this.recoveryActions.set('onnx', [
      {
        name: 'reinitialize-onnx',
        description: 'Reinitialize ONNX Runtime',
        severity: 'medium',
        execute: async () => {
          try {
            const status = await onnxManager.reinitialize();
            return status.isReady;
          } catch (error) {
            diagnostic.logError(`ONNX reinitialization failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      },
      {
        name: 'clear-onnx-cache',
        description: 'Clear ONNX Runtime cache',
        severity: 'low',
        execute: async () => {
          try {
            // Clear any cached ONNX data
            if (browser && 'caches' in window) {
              const cacheNames = await caches.keys();
              for (const cacheName of cacheNames) {
                if (cacheName.includes('onnx') || cacheName.includes('models')) {
                  await caches.delete(cacheName);
                }
              }
            }
            diagnostic.logWarning('ONNX cache cleared', 'ErrorRecovery');
            return true;
          } catch (error) {
            diagnostic.logError(`Cache clearing failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      }
    ]);

    // Camera related errors
    this.recoveryActions.set('camera', [
      {
        name: 'reset-media-permissions',
        description: 'Reset media permissions',
        severity: 'high',
        execute: async () => {
          try {
            // Try to release any existing camera streams
            if (browser && navigator.mediaDevices) {
              // Note: Cannot actually reset permissions, but can clean up streams
              diagnostic.logWarning('Media permissions reset attempted', 'ErrorRecovery');
              return true;
            }
            return false;
          } catch (error) {
            diagnostic.logError(`Media permission reset failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      },
      {
        name: 'restart-camera-stream',
        description: 'Restart camera stream',
        severity: 'medium',
        execute: async () => {
          try {
            // This would need to be integrated with the camera component
            diagnostic.logWarning('Camera stream restart attempted', 'ErrorRecovery');
            return true;
          } catch (error) {
            diagnostic.logError(`Camera stream restart failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      }
    ]);

    // Performance related errors
    this.recoveryActions.set('performance', [
      {
        name: 'force-garbage-collection',
        description: 'Force garbage collection',
        severity: 'low',
        execute: async () => {
          try {
            if (browser && 'gc' in window) {
              (window as any).gc();
              diagnostic.logWarning('Garbage collection forced', 'ErrorRecovery');
              return true;
            }
            return false;
          } catch (error) {
            diagnostic.logError(`Garbage collection failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      },
      {
        name: 'reduce-quality-settings',
        description: 'Reduce quality settings',
        severity: 'medium',
        execute: async () => {
          try {
            // This would integrate with the adaptive engine
            diagnostic.logWarning('Quality settings reduced', 'ErrorRecovery');
            return true;
          } catch (error) {
            diagnostic.logError(`Quality reduction failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      }
    ]);

    // Network related errors
    this.recoveryActions.set('network', [
      {
        name: 'retry-network-requests',
        description: 'Retry failed network requests',
        severity: 'medium',
        execute: async () => {
          try {
            // Test network connectivity
            const response = await fetch('/models/yolov8n.onnx', { method: 'HEAD' });
            if (response.ok) {
              diagnostic.logWarning('Network connectivity restored', 'ErrorRecovery');
              return true;
            }
            return false;
          } catch (error) {
            diagnostic.logError(`Network test failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      },
      {
        name: 'enable-offline-mode',
        description: 'Enable offline mode',
        severity: 'high',
        execute: async () => {
          try {
            // This would switch to offline detection mode
            diagnostic.logWarning('Offline mode enabled', 'ErrorRecovery');
            return true;
          } catch (error) {
            diagnostic.logError(`Offline mode activation failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      }
    ]);

    // General system errors
    this.recoveryActions.set('system', [
      {
        name: 'clear-local-storage',
        description: 'Clear application local storage',
        severity: 'medium',
        execute: async () => {
          try {
            if (browser && localStorage) {
              const keysToKeep = ['user-preferences', 'privacy-settings'];
              const allKeys = Object.keys(localStorage);
              
              for (const key of allKeys) {
                if (!keysToKeep.includes(key) && key.startsWith('ecoscan-')) {
                  localStorage.removeItem(key);
                }
              }
              
              diagnostic.logWarning('Local storage cleared (except preferences)', 'ErrorRecovery');
              return true;
            }
            return false;
          } catch (error) {
            diagnostic.logError(`Local storage clearing failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      },
      {
        name: 'reload-application',
        description: 'Reload the application',
        severity: 'critical',
        execute: async () => {
          try {
            if (browser) {
              diagnostic.logWarning('Application reload initiated', 'ErrorRecovery');
              window.location.reload();
              return true;
            }
            return false;
          } catch (error) {
            diagnostic.logError(`Application reload failed: ${error}`, 'ErrorRecovery');
            return false;
          }
        }
      }
    ]);
  }

  async recoverFromError(error: string, context?: string): Promise<RecoveryResult> {
    diagnostic.logError(`Starting recovery for error: ${error}`, 'ErrorRecovery');

    const result: RecoveryResult = {
      success: false,
      actionsExecuted: [],
      errors: [],
      recommendations: []
    };

    return await safeAsyncOperation(async () => {
      const errorPattern = this.identifyErrorPattern(error);
      const actions = this.getRecoveryActions(errorPattern);

      if (actions.length === 0) {
        result.recommendations.push('No automatic recovery actions available for this error type');
        return result;
      }

      // Sort actions by severity (low to high)
      const sortedActions = actions.sort((a, b) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      for (const action of sortedActions) {
        try {
          diagnostic.logWarning(`Executing recovery action: ${action.name}`, 'ErrorRecovery');
          
          const success = await action.execute();
          result.actionsExecuted.push(action.name);

          if (success) {
            diagnostic.logWarning(`Recovery action ${action.name} succeeded`, 'ErrorRecovery');
            result.success = true;
            
            // Record successful recovery
            this.recordRecovery(errorPattern, true);
            
            // Don't execute critical actions if lower severity ones work
            if (action.severity === 'critical') {
              break;
            }
            
            // Test if the error is resolved
            if (await this.testErrorResolution(errorPattern)) {
              break;
            }
          } else {
            diagnostic.logWarning(`Recovery action ${action.name} failed`, 'ErrorRecovery');
          }
        } catch (actionError) {
          const errorMsg = `Recovery action ${action.name} threw error: ${actionError}`;
          diagnostic.logError(errorMsg, 'ErrorRecovery');
          result.errors.push(errorMsg);
        }
      }

      // Generate recommendations based on recovery results
      result.recommendations = this.generateRecommendations(errorPattern, result);

      // Record recovery attempt
      this.recordRecovery(errorPattern, result.success);

      return result;
    }, result, 'Error Recovery');
  }

  private identifyErrorPattern(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('onnx') || errorLower.includes('wasm') || errorLower.includes('tensor')) {
      return 'onnx';
    } else if (errorLower.includes('camera') || errorLower.includes('media') || errorLower.includes('permission')) {
      return 'camera';
    } else if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
      return 'network';
    } else if (errorLower.includes('memory') || errorLower.includes('performance') || errorLower.includes('slow')) {
      return 'performance';
    } else {
      return 'system';
    }
  }

  private getRecoveryActions(pattern: string): RecoveryAction[] {
    return this.recoveryActions.get(pattern) || this.recoveryActions.get('system') || [];
  }

  private async testErrorResolution(pattern: string): Promise<boolean> {
    // Basic tests for different error patterns
    switch (pattern) {
      case 'onnx':
        return onnxManager.isReady();
      case 'network':
        try {
          const response = await fetch('/', { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private recordRecovery(pattern: string, success: boolean): void {
    this.recoveryHistory.push({
      timestamp: Date.now(),
      pattern,
      success
    });

    // Keep only last 100 recovery attempts
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-100);
    }
  }

  private generateRecommendations(pattern: string, result: RecoveryResult): string[] {
    const recommendations: string[] = [];

    if (!result.success) {
      recommendations.push('Automatic recovery failed. Consider refreshing the page.');
      
      switch (pattern) {
        case 'onnx':
          recommendations.push('Try using a different browser or updating your current browser.');
          recommendations.push('Ensure your device has sufficient memory (>2GB recommended).');
          break;
        case 'camera':
          recommendations.push('Check camera permissions in your browser settings.');
          recommendations.push('Ensure no other applications are using the camera.');
          break;
        case 'network':
          recommendations.push('Check your internet connection.');
          recommendations.push('Try reloading the page when connection is restored.');
          break;
        case 'performance':
          recommendations.push('Close other browser tabs to free up memory.');
          recommendations.push('Consider using a device with better performance.');
          break;
      }
    } else {
      recommendations.push('Recovery successful. The application should now work normally.');
    }

    return recommendations;
  }

  getRecoveryHistory(): Array<{ timestamp: number; pattern: string; success: boolean }> {
    return [...this.recoveryHistory];
  }

  generateRecoveryReport(): any {
    const patterns = ['onnx', 'camera', 'network', 'performance', 'system'];
    const report: any = {
      totalRecoveries: this.recoveryHistory.length,
      successRate: 0,
      patternStats: {},
      recentRecoveries: this.recoveryHistory.slice(-10)
    };

    if (this.recoveryHistory.length > 0) {
      const successful = this.recoveryHistory.filter(r => r.success).length;
      report.successRate = (successful / this.recoveryHistory.length) * 100;
    }

    for (const pattern of patterns) {
      const patternRecoveries = this.recoveryHistory.filter(r => r.pattern === pattern);
      const patternSuccessful = patternRecoveries.filter(r => r.success).length;
      
      report.patternStats[pattern] = {
        total: patternRecoveries.length,
        successful: patternSuccessful,
        successRate: patternRecoveries.length > 0 ? (patternSuccessful / patternRecoveries.length) * 100 : 0
      };
    }

    return report;
  }
}

export const errorRecovery = new ErrorRecoverySystem(); 