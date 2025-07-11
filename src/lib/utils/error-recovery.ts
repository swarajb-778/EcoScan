/**
 * Enhanced Error Recovery System for EcoScan
 * Provides intelligent error recovery with pattern recognition and success tracking
 */

import { diagnostic } from './diagnostic.js';
import { onnxManager } from '../ml/onnx-config.js';

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<void>;
  priority: number;
  maxAttempts: number;
  cooldownMs: number;
  successRate: number;
  lastAttempt: number;
  attempts: number;
}

export interface ErrorPattern {
  id: string;
  patterns: string[];
  category: 'onnx' | 'camera' | 'network' | 'performance' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoveryActions: string[];
}

class ErrorRecoveryManager {
  private recoveryActions = new Map<string, RecoveryAction>();
  private errorPatterns: ErrorPattern[] = [];
  private recoveryHistory: Array<{
    timestamp: number;
    error: string;
    actionId: string;
    success: boolean;
  }> = [];

  constructor() {
    this.initializeRecoveryActions();
    this.initializeErrorPatterns();
  }

  private initializeRecoveryActions(): void {
    const actions: RecoveryAction[] = [
      {
        id: 'clear-onnx-cache',
        name: 'Clear ONNX Cache',
        description: 'Clear ONNX Runtime cache and reinitialize',
        execute: async () => {
          // Clear any cached ONNX sessions
          if (typeof window !== 'undefined' && 'caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              if (cacheName.includes('onnx') || cacheName.includes('wasm')) {
                await caches.delete(cacheName);
              }
            }
          }
          
          // Reinitialize ONNX Runtime
          await onnxManager.reinitialize();
          diagnostic.logWarning('ONNX cache cleared', 'ErrorRecovery');
        },
        priority: 1,
        maxAttempts: 3,
        cooldownMs: 5000,
        successRate: 0.8,
        lastAttempt: 0,
        attempts: 0
      },
      {
        id: 'reload-wasm-files',
        name: 'Reload WebAssembly Files',
        description: 'Force reload of ONNX WebAssembly files',
        execute: async () => {
          // Force reload WASM files by appending cache-busting parameter
          const wasmFiles = [
            '/models/ort-wasm-simd-threaded.wasm',
            '/models/ort-wasm-simd-threaded.jsep.wasm',
            '/models/ort-wasm-simd-threaded.mjs',
            '/models/ort-wasm-simd-threaded.jsep.mjs'
          ];
          
          const timestamp = Date.now();
          for (const file of wasmFiles) {
            try {
              const response = await fetch(`${file}?v=${timestamp}`, { 
                cache: 'no-cache',
                method: 'HEAD'
              });
              if (!response.ok) {
                throw new Error(`Failed to reload ${file}: ${response.statusText}`);
              }
            } catch (error) {
              diagnostic.logError(`Failed to reload WASM file ${file}: ${error}`, 'ErrorRecovery');
            }
          }
          
          // Reinitialize ONNX after reloading files
          await onnxManager.reinitialize();
          diagnostic.logWarning('WASM files reloaded', 'ErrorRecovery');
        },
        priority: 2,
        maxAttempts: 2,
        cooldownMs: 10000,
        successRate: 0.7,
        lastAttempt: 0,
        attempts: 0
      },
      {
        id: 'force-cpu-inference',
        name: 'Force CPU Inference',
        description: 'Fallback to CPU-only inference mode',
        execute: async () => {
          // Configure ONNX to use only WASM (CPU) execution
          const ort = await import('onnxruntime-web');
          ort.env.wasm.proxy = false;
          ort.env.wasm.numThreads = 1;
          
          // Update ONNX manager configuration
          onnxManager.updateConfig({
            executionProviders: ['wasm'],
            numThreads: 1
          });
          
          await onnxManager.reinitialize();
          diagnostic.logWarning('Forced CPU-only inference mode', 'ErrorRecovery');
        },
        priority: 3,
        maxAttempts: 1,
        cooldownMs: 15000,
        successRate: 0.9,
        lastAttempt: 0,
        attempts: 0
      },
      {
        id: 'restart-camera',
        name: 'Restart Camera',
        description: 'Stop and restart camera stream',
        execute: async () => {
          // This would be implemented by the camera component
          const event = new CustomEvent('camera-restart-requested');
          window.dispatchEvent(event);
          diagnostic.logWarning('Camera restart requested', 'ErrorRecovery');
        },
        priority: 1,
        maxAttempts: 3,
        cooldownMs: 3000,
        successRate: 0.85,
        lastAttempt: 0,
        attempts: 0
      },
      {
        id: 'reduce-quality',
        name: 'Reduce Quality',
        description: 'Lower processing quality to reduce load',
        execute: async () => {
          const event = new CustomEvent('quality-reduction-requested', {
            detail: { level: 'minimal' }
          });
          window.dispatchEvent(event);
          diagnostic.logWarning('Quality reduction applied', 'ErrorRecovery');
        },
        priority: 4,
        maxAttempts: 1,
        cooldownMs: 30000,
        successRate: 0.95,
        lastAttempt: 0,
        attempts: 0
      },
      {
        id: 'clear-browser-cache',
        name: 'Clear Browser Cache',
        description: 'Clear browser cache and reload resources',
        execute: async () => {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }
          
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
            }
          }
          
          diagnostic.logWarning('Browser cache cleared', 'ErrorRecovery');
        },
        priority: 5,
        maxAttempts: 1,
        cooldownMs: 60000,
        successRate: 0.6,
        lastAttempt: 0,
        attempts: 0
      }
    ];

    for (const action of actions) {
      this.recoveryActions.set(action.id, action);
    }
  }

  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        id: 'onnx-wasm-missing',
        patterns: [
          'failed to fetch dynamically imported module',
          'ort-wasm-simd-threaded.jsep.mjs',
          'ort-wasm-simd-threaded.mjs',
          'no available backend found',
          'backend not found'
        ],
        category: 'onnx',
        severity: 'high',
        recoveryActions: ['clear-onnx-cache', 'reload-wasm-files', 'force-cpu-inference']
      },
      {
        id: 'onnx-webgl-failure',
        patterns: [
          'webgl backend not found',
          'webgl context lost',
          'gpu memory',
          'webgl error'
        ],
        category: 'onnx',
        severity: 'medium',
        recoveryActions: ['force-cpu-inference', 'reduce-quality']
      },
      {
        id: 'onnx-initialization-failure',
        patterns: [
          'onnx initialization failed',
          'model initialization failed',
          'session creation failed',
          'inference session'
        ],
        category: 'onnx',
        severity: 'critical',
        recoveryActions: ['clear-onnx-cache', 'reload-wasm-files', 'force-cpu-inference', 'clear-browser-cache']
      },
      {
        id: 'camera-access-denied',
        patterns: [
          'permission denied',
          'camera access',
          'getusermedia',
          'notallowederror'
        ],
        category: 'camera',
        severity: 'high',
        recoveryActions: ['restart-camera']
      },
      {
        id: 'camera-hardware-error',
        patterns: [
          'camera hardware',
          'device busy',
          'camera not available',
          'notreadableerror'
        ],
        category: 'camera',
        severity: 'high',
        recoveryActions: ['restart-camera', 'reduce-quality']
      },
      {
        id: 'network-timeout',
        patterns: [
          'fetch timeout',
          'network error',
          'failed to fetch',
          'connection timeout'
        ],
        category: 'network',
        severity: 'medium',
        recoveryActions: ['reload-wasm-files', 'clear-browser-cache']
      },
      {
        id: 'performance-degradation',
        patterns: [
          'memory pressure',
          'performance',
          'slow inference',
          'timeout'
        ],
        category: 'performance',
        severity: 'medium',
        recoveryActions: ['reduce-quality', 'force-cpu-inference']
      }
    ];
  }

  async attemptRecovery(error: string): Promise<boolean> {
    diagnostic.logWarning(`Starting recovery for error: ${error}`, 'ErrorRecovery');
    
    const pattern = this.matchErrorPattern(error);
    if (!pattern) {
      diagnostic.logWarning('No recovery pattern found for error', 'ErrorRecovery');
      return false;
    }

    diagnostic.logWarning(`Matched error pattern: ${pattern.id} (${pattern.category})`, 'ErrorRecovery');

    // Try recovery actions in priority order
    for (const actionId of pattern.recoveryActions) {
      const action = this.recoveryActions.get(actionId);
      if (!action) continue;

      // Check if action is on cooldown or has exceeded max attempts
      const now = Date.now();
      if (action.attempts >= action.maxAttempts) {
        diagnostic.logWarning(`Recovery action ${actionId} has exceeded max attempts`, 'ErrorRecovery');
        continue;
      }

      if (now - action.lastAttempt < action.cooldownMs) {
        diagnostic.logWarning(`Recovery action ${actionId} is on cooldown`, 'ErrorRecovery');
        continue;
      }

      try {
        diagnostic.logWarning(`Executing recovery action: ${actionId}`, 'ErrorRecovery');
        
        action.attempts++;
        action.lastAttempt = now;
        
        await action.execute();
        
        // Record successful recovery
        this.recordRecoveryAttempt(error, actionId, true);
        diagnostic.logWarning(`Recovery action ${actionId} succeeded`, 'ErrorRecovery');
        
        return true;
      } catch (recoveryError) {
        diagnostic.logError(`Recovery action ${actionId} failed: ${recoveryError}`, 'ErrorRecovery');
        this.recordRecoveryAttempt(error, actionId, false);
      }
    }

    diagnostic.logError('All recovery actions failed', 'ErrorRecovery');
    return false;
  }

  private matchErrorPattern(error: string): ErrorPattern | null {
    const errorLower = error.toLowerCase();
    
    for (const pattern of this.errorPatterns) {
      for (const patternStr of pattern.patterns) {
        if (errorLower.includes(patternStr.toLowerCase())) {
          return pattern;
        }
      }
    }
    
    return null;
  }

  private recordRecoveryAttempt(error: string, actionId: string, success: boolean): void {
    this.recoveryHistory.push({
      timestamp: Date.now(),
      error,
      actionId,
      success
    });

    // Keep only last 50 recovery attempts
    if (this.recoveryHistory.length > 50) {
      this.recoveryHistory.shift();
    }

    // Update success rate for the action
    const action = this.recoveryActions.get(actionId);
    if (action) {
      const actionHistory = this.recoveryHistory.filter(h => h.actionId === actionId);
      const successCount = actionHistory.filter(h => h.success).length;
      action.successRate = actionHistory.length > 0 ? successCount / actionHistory.length : 0;
    }
  }

  getRecoveryReport(): any {
    return {
      actions: Array.from(this.recoveryActions.values()).map(action => ({
        id: action.id,
        name: action.name,
        attempts: action.attempts,
        maxAttempts: action.maxAttempts,
        successRate: action.successRate,
        lastAttempt: new Date(action.lastAttempt).toISOString()
      })),
      patterns: this.errorPatterns.map(pattern => ({
        id: pattern.id,
        category: pattern.category,
        severity: pattern.severity,
        recoveryActions: pattern.recoveryActions
      })),
      history: this.recoveryHistory.slice(-10).map(h => ({
        timestamp: new Date(h.timestamp).toISOString(),
        error: h.error.substring(0, 100),
        actionId: h.actionId,
        success: h.success
      }))
    };
  }

  resetRecoveryStats(): void {
    for (const action of this.recoveryActions.values()) {
      action.attempts = 0;
      action.lastAttempt = 0;
      action.successRate = 0;
    }
    this.recoveryHistory = [];
    diagnostic.logWarning('Recovery statistics reset', 'ErrorRecovery');
  }
}

// Singleton instance
export const errorRecovery = new ErrorRecoveryManager(); 