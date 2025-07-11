/**
 * ONNX Runtime Configuration and Initialization
 * Provides safe and robust ONNX Runtime setup for the application
 */

import { browser } from '$app/environment';
import { diagnostic } from '../utils/diagnostic.js';
import { safeAsyncOperation, isSecureContext } from '../utils/ssr-safe.js';

export interface ONNXConfig {
  wasmPaths: string;
  numThreads: number;
  executionProviders: string[];
  enableGraphOptimization: boolean;
  enableProfiling: boolean;
}

export interface ONNXStatus {
  isConfigured: boolean;
  isReady: boolean;
  error: string | null;
  config: ONNXConfig | null;
  version: string | null;
}

class ONNXRuntimeManager {
  private status: ONNXStatus = {
    isConfigured: false,
    isReady: false,
    error: null,
    config: null,
    version: null
  };

  private defaultConfig: ONNXConfig = {
    wasmPaths: '/models/',
    numThreads: 1, // Conservative for compatibility
    executionProviders: ['wasm'],
    enableGraphOptimization: true,
    enableProfiling: false
  };

  async initialize(): Promise<ONNXStatus> {
    if (!browser) {
      diagnostic.logWarning('Skipping ONNX initialization during SSR', 'ONNXRuntimeManager');
      this.status.error = 'SSR environment';
      return this.status;
    }

    if (!isSecureContext()) {
      diagnostic.logError('ONNX Runtime requires secure context (HTTPS)', 'ONNXRuntimeManager');
      this.status.error = 'Insecure context - HTTPS required';
      return this.status;
    }

    return await safeAsyncOperation(async () => {
      try {
        // Dynamic import to avoid SSR issues
        const ort = await import('onnxruntime-web');
        
        // Configure ONNX Runtime environment
        await this.configureONNX(ort);
        
        // Test ONNX Runtime functionality
        await this.testONNXFunctionality(ort);
        
        this.status.isConfigured = true;
        this.status.isReady = true;
        this.status.error = null;
        this.status.version = (ort.env as any).versions?.ort || 'unknown';
        
        diagnostic.logWarning(`ONNX Runtime initialized successfully (v${this.status.version})`, 'ONNXRuntimeManager');
        
        return this.status;
      } catch (error) {
        this.status.error = `ONNX initialization failed: ${error}`;
        diagnostic.logError(this.status.error, 'ONNXRuntimeManager');
        throw error;
      }
    }, this.status, 'ONNX Runtime Initialization');
  }

  private async configureONNX(ort: any): Promise<void> {
    try {
      // Configure WASM paths - this is crucial for finding the .mjs files
      ort.env.wasm.wasmPaths = this.defaultConfig.wasmPaths;
      
      // Set number of threads (conservative for compatibility)
      ort.env.wasm.numThreads = this.defaultConfig.numThreads;
      
      // Configure proxy settings for better compatibility
      ort.env.wasm.proxy = false; // Disable proxy mode for better performance
      
      // Disable SIMD for better compatibility if needed (uncomment if issues persist)
      // ort.env.wasm.simd = false;
      
      // Enable WebGL if available
      if (this.isWebGLAvailable()) {
        this.defaultConfig.executionProviders.unshift('webgl');
        diagnostic.logWarning('WebGL execution provider enabled', 'ONNXRuntimeManager');
      }
      
      // Configure logging
      ort.env.logLevel = 'warning'; // Reduce noise in production
      
      this.status.config = { ...this.defaultConfig };
      
      diagnostic.logWarning('ONNX Runtime environment configured', 'ONNXRuntimeManager');
    } catch (error) {
      diagnostic.logError(`ONNX configuration failed: ${error}`, 'ONNXRuntimeManager');
      throw new Error(`Failed to configure ONNX Runtime: ${error}`);
    }
  }

  private async testONNXFunctionality(ort: any): Promise<void> {
    try {
      // Test if we can create a simple tensor
      const testData = new Float32Array([1, 2, 3, 4]);
      const testTensor = new ort.Tensor('float32', testData, [1, 4]);
      
      if (!testTensor) {
        throw new Error('Failed to create test tensor');
      }
      
      // Test WASM file accessibility
      await this.testWASMFiles();
      
      diagnostic.logWarning('ONNX Runtime functionality test passed', 'ONNXRuntimeManager');
    } catch (error) {
      diagnostic.logError(`ONNX functionality test failed: ${error}`, 'ONNXRuntimeManager');
      throw new Error(`ONNX Runtime test failed: ${error}`);
    }
  }

  private async testWASMFiles(): Promise<void> {
    const wasmFiles = [
      'ort-wasm-simd-threaded.wasm',
      'ort-wasm-simd-threaded.jsep.wasm',
      'ort-wasm-simd-threaded.mjs',
      'ort-wasm-simd-threaded.jsep.mjs'
    ];

    for (const wasmFile of wasmFiles) {
      try {
        const response = await fetch(`${this.defaultConfig.wasmPaths}${wasmFile}`, {
          method: 'HEAD'
        });
        
        if (!response.ok) {
          diagnostic.logWarning(`WASM file ${wasmFile} not accessible: ${response.statusText}`, 'ONNXRuntimeManager');
        } else {
          diagnostic.logWarning(`WASM file ${wasmFile} is accessible`, 'ONNXRuntimeManager');
        }
      } catch (error) {
        diagnostic.logWarning(`WASM file ${wasmFile} check failed: ${error}`, 'ONNXRuntimeManager');
      }
    }
  }

  private isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  getStatus(): ONNXStatus {
    return { ...this.status };
  }

  isReady(): boolean {
    return this.status.isReady;
  }

  async reinitialize(): Promise<ONNXStatus> {
    diagnostic.logWarning('Reinitializing ONNX Runtime', 'ONNXRuntimeManager');
    this.status = {
      isConfigured: false,
      isReady: false,
      error: null,
      config: null,
      version: null
    };
    return await this.initialize();
  }

  updateConfig(newConfig: Partial<ONNXConfig>): void {
    if (this.status.config) {
      this.status.config = { ...this.status.config, ...newConfig };
      diagnostic.logWarning('ONNX Runtime configuration updated', 'ONNXRuntimeManager');
    }
  }

  generateDiagnosticReport(): any {
    return {
      status: this.status,
      environment: {
        browser: browser,
        secureContext: isSecureContext(),
        webglAvailable: browser ? this.isWebGLAvailable() : false
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const onnxManager = new ONNXRuntimeManager();

// Auto-initialize when imported in browser environment
if (browser) {
  onnxManager.initialize().catch(error => {
    diagnostic.logError(`Auto-initialization failed: ${error}`, 'ONNXRuntimeManager');
  });
} 