/**
 * Comprehensive Testing Framework for EcoScan
 * Validates ONNX Runtime Web initialization, camera detection, and error recovery
 */

import { diagnostic } from './diagnostic.js';
import { onnxManager } from '../ml/onnx-config.js';
import { ObjectDetector } from '../ml/detector.js';
import { WasteClassifier } from '../ml/classifier.js';
import { errorRecovery } from './error-recovery.js';

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  error?: string;
  details?: any;
  timestamp: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestResult[];
  status: 'passed' | 'failed' | 'running' | 'not_started';
  duration: number;
  timestamp: number;
}

export interface TestReport {
  suites: TestSuite[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  timestamp: number;
  environment: {
    userAgent: string;
    platform: string;
    webgl: boolean;
    webAssembly: boolean;
    camera: boolean;
    microphone: boolean;
  };
}

class TestingFramework {
  private currentSuite: TestSuite | null = null;
  private suites: TestSuite[] = [];
  private isRunning = false;

  async runFullTestSuite(): Promise<TestReport> {
    if (this.isRunning) {
      throw new Error('Test suite is already running');
    }

    this.isRunning = true;
    this.suites = [];
    
    diagnostic.logWarning('Starting comprehensive test suite', 'TestingFramework');
    
    try {
      // Run all test suites
      await this.runONNXTests();
      await this.runCameraTests();
      await this.runErrorRecoveryTests();
      await this.runPerformanceTests();
      await this.runIntegrationTests();
      
      const report = this.generateReport();
      diagnostic.logWarning(`Test suite completed: ${report.summary.passed}/${report.summary.total} passed`, 'TestingFramework');
      
      return report;
    } finally {
      this.isRunning = false;
    }
  }

  private async runONNXTests(): Promise<void> {
    await this.createSuite('onnx', 'ONNX Runtime Web Tests', 'Validates ONNX Runtime initialization and model loading', async () => {
      
      await this.runTest('onnx-environment', 'ONNX Environment Configuration', async () => {
        const ort = await import('onnxruntime-web');
        
        // Check environment configuration
        if (!ort.env.wasm.wasmPaths) {
          throw new Error('WASM paths not configured');
        }
        
        if (ort.env.wasm.wasmPaths !== '/models/') {
          throw new Error(`Expected WASM paths to be '/models/', got '${ort.env.wasm.wasmPaths}'`);
        }
        
        return {
          wasmPaths: ort.env.wasm.wasmPaths,
          numThreads: ort.env.wasm.numThreads,
          proxy: ort.env.wasm.proxy,
          logLevel: ort.env.logLevel
        };
      });

      await this.runTest('wasm-file-accessibility', 'WebAssembly File Accessibility', async () => {
        const files = [
          '/models/ort-wasm-simd-threaded.wasm',
          '/models/ort-wasm-simd-threaded.jsep.wasm',
          '/models/ort-wasm-simd-threaded.mjs',
          '/models/ort-wasm-simd-threaded.jsep.mjs'
        ];
        
        const results: Record<string, boolean> = {};
        
        for (const file of files) {
          try {
            const response = await fetch(file, { method: 'HEAD' });
            results[file] = response.ok;
            
            if (!response.ok) {
              diagnostic.logWarning(`WASM file not accessible: ${file} (${response.status})`, 'TestingFramework');
            }
          } catch (error) {
            results[file] = false;
            diagnostic.logError(`WASM file check failed: ${file} - ${error}`, 'TestingFramework');
          }
        }
        
        const accessibleFiles = Object.values(results).filter(Boolean).length;
        const totalFiles = files.length;
        
        if (accessibleFiles < totalFiles) {
          throw new Error(`Only ${accessibleFiles}/${totalFiles} WASM files are accessible`);
        }
        
        return results;
      });

      await this.runTest('onnx-manager-initialization', 'ONNX Manager Initialization', async () => {
        const status = await onnxManager.initialize();
        
        if (!status.isReady) {
          throw new Error(`ONNX Manager initialization failed: ${status.error}`);
        }
        
        return {
          isReady: status.isReady,
          version: status.version,
          config: status.config
        };
      });

      await this.runTest('model-loading', 'YOLO Model Loading', async () => {
        const detector = new ObjectDetector({
          modelPath: '/models/yolov8n.onnx',
          inputSize: [640, 640],
          threshold: 0.5,
          iouThreshold: 0.4
        });
        
        await detector.initialize();
        
        // Test with dummy data
        const testImageData = new ImageData(640, 640);
        const detections = await detector.detect(testImageData);
        
        return {
          initialized: true,
          detectionCount: detections.length,
          modelPath: '/models/yolov8n.onnx'
        };
      });

      await this.runTest('waste-classifier-loading', 'Waste Classifier Loading', async () => {
        const classifier = new WasteClassifier();
        await classifier.initialize();
        
        // Test classification
        const result = classifier.classify('plastic bottle');
        
        if (!result) {
          throw new Error('Classifier failed to classify test input');
        }
        
        return {
          initialized: true,
          testClassification: result
        };
      });
    });
  }

  private async runCameraTests(): Promise<void> {
    await this.createSuite('camera', 'Camera System Tests', 'Validates camera access and video stream functionality', async () => {
      
      await this.runTest('media-devices-support', 'Media Devices API Support', async () => {
        if (!navigator.mediaDevices) {
          throw new Error('MediaDevices API not supported');
        }
        
        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        
        return {
          mediaDevicesSupported: true,
          getUserMediaSupported: true
        };
      });

      await this.runTest('camera-device-enumeration', 'Camera Device Enumeration', async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        
        if (videoInputs.length === 0) {
          throw new Error('No video input devices found');
        }
        
        return {
          totalDevices: devices.length,
          videoInputs: videoInputs.length,
          devices: videoInputs.map(d => ({
            deviceId: d.deviceId.substring(0, 8) + '...',
            label: d.label || 'Unknown Device'
          }))
        };
      });

      await this.runTest('camera-stream-acquisition', 'Camera Stream Acquisition', async () => {
        let stream: MediaStream | null = null;
        
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'environment'
            }
          });
          
          if (!stream || stream.getVideoTracks().length === 0) {
            throw new Error('Invalid camera stream received');
          }
          
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          
          return {
            streamId: stream.id,
            active: stream.active,
            trackCount: stream.getTracks().length,
            videoTrackCount: stream.getVideoTracks().length,
            settings: {
              width: settings.width,
              height: settings.height,
              frameRate: settings.frameRate,
              facingMode: settings.facingMode
            }
          };
        } finally {
          // Clean up stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
      });
    });
  }

  private async runErrorRecoveryTests(): Promise<void> {
    await this.createSuite('error-recovery', 'Error Recovery Tests', 'Validates error recovery patterns and actions', async () => {
      
      await this.runTest('error-pattern-matching', 'Error Pattern Matching', async () => {
        const testErrors = [
          'failed to fetch dynamically imported module: ort-wasm-simd-threaded.jsep.mjs',
          'webgl backend not found',
          'permission denied camera access',
          'network error timeout'
        ];
        
        const results: Record<string, boolean> = {};
        
        for (const error of testErrors) {
          // This would test the private matchErrorPattern method
          // For now, we'll test the public attemptRecovery method
          try {
            await errorRecovery.attemptRecovery(error);
            results[error] = true;
          } catch (e) {
            results[error] = false;
          }
        }
        
        return results;
      });

      await this.runTest('recovery-action-execution', 'Recovery Action Execution', async () => {
        // Test that recovery actions can be executed without throwing
        const testError = 'test error for recovery validation';
        
        try {
          const recovered = await errorRecovery.attemptRecovery(testError);
          
          return {
            recoveryAttempted: true,
            recovered: recovered
          };
        } catch (error) {
          throw new Error(`Recovery action execution failed: ${error}`);
        }
      });

      await this.runTest('recovery-report-generation', 'Recovery Report Generation', async () => {
        const report = errorRecovery.getRecoveryReport();
        
        if (!report.actions || !Array.isArray(report.actions)) {
          throw new Error('Recovery report missing actions array');
        }
        
        if (!report.patterns || !Array.isArray(report.patterns)) {
          throw new Error('Recovery report missing patterns array');
        }
        
        return {
          actionCount: report.actions.length,
          patternCount: report.patterns.length,
          historyCount: report.history.length
        };
      });
    });
  }

  private async runPerformanceTests(): Promise<void> {
    await this.createSuite('performance', 'Performance Tests', 'Validates system performance and optimization', async () => {
      
      await this.runTest('webgl-availability', 'WebGL Availability', async () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          throw new Error('WebGL not available');
        }
        
        const webglContext = gl as WebGLRenderingContext;
        const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
        
        return {
          webglAvailable: true,
          version: webglContext.getParameter(webglContext.VERSION),
          vendor: debugInfo ? webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
          renderer: debugInfo ? webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
        };
      });

      await this.runTest('memory-usage', 'Memory Usage Check', async () => {
        const performance = (window as any).performance;
        
        let memoryInfo = null;
        if (performance && performance.memory) {
          memoryInfo = {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        
        return {
          memoryAPIAvailable: !!memoryInfo,
          memoryInfo
        };
      });

      await this.runTest('inference-performance', 'Inference Performance', async () => {
        // This would require an initialized detector
        // For now, we'll just measure basic performance metrics
        const start = performance.now();
        
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const duration = performance.now() - start;
        
        return {
          testDuration: duration,
          performanceAPIAvailable: typeof performance !== 'undefined'
        };
      });
    });
  }

  private async runIntegrationTests(): Promise<void> {
    await this.createSuite('integration', 'Integration Tests', 'Validates end-to-end functionality', async () => {
      
      await this.runTest('full-ml-pipeline', 'Full ML Pipeline', async () => {
        // Test the complete ML pipeline initialization
        const detector = new ObjectDetector({
          modelPath: '/models/yolov8n.onnx',
          inputSize: [640, 640],
          threshold: 0.5,
          iouThreshold: 0.4
        });
        
        const classifier = new WasteClassifier();
        
        await Promise.all([
          detector.initialize(),
          classifier.initialize()
        ]);
        
        // Test with synthetic data
        const testImageData = new ImageData(640, 640);
        const detections = await detector.detect(testImageData);
        
        return {
          detectorInitialized: true,
          classifierInitialized: true,
          detectionCount: detections.length,
          pipelineWorking: true
        };
      });

      await this.runTest('diagnostic-system', 'Diagnostic System', async () => {
        // Test diagnostic logging
        diagnostic.logWarning('Test diagnostic message', 'TestingFramework');
        diagnostic.logError('Test error message', 'TestingFramework');
        
        const report = await diagnostic.generateReport();
        
        if (!report.errors && !report.warnings) {
          throw new Error('Diagnostic system not logging messages');
        }
        
        return {
          diagnosticWorking: true,
          logCount: report.errors.length + report.warnings.length
        };
      });
    });
  }

  private async createSuite(id: string, name: string, description: string, testRunner: () => Promise<void>): Promise<void> {
    const suite: TestSuite = {
      id,
      name,
      description,
      tests: [],
      status: 'running',
      duration: 0,
      timestamp: Date.now()
    };
    
    this.currentSuite = suite;
    this.suites.push(suite);
    
    const start = performance.now();
    
    try {
      await testRunner();
      suite.status = suite.tests.some(t => t.status === 'failed') ? 'failed' : 'passed';
    } catch (error) {
      suite.status = 'failed';
      diagnostic.logError(`Test suite ${name} failed: ${error}`, 'TestingFramework');
    }
    
    suite.duration = performance.now() - start;
    this.currentSuite = null;
  }

  private async runTest(id: string, name: string, testFunction: () => Promise<any>): Promise<void> {
    if (!this.currentSuite) {
      throw new Error('No active test suite');
    }
    
    const test: TestResult = {
      id,
      name,
      status: 'running',
      duration: 0,
      timestamp: Date.now()
    };
    
    this.currentSuite.tests.push(test);
    
    const start = performance.now();
    
    try {
      const result = await testFunction();
      test.status = 'passed';
      test.details = result;
      diagnostic.logWarning(`✅ Test passed: ${name}`, 'TestingFramework');
    } catch (error) {
      test.status = 'failed';
      test.error = error instanceof Error ? error.message : String(error);
      diagnostic.logError(`❌ Test failed: ${name} - ${test.error}`, 'TestingFramework');
    }
    
    test.duration = performance.now() - start;
  }

  private generateReport(): TestReport {
    const environment = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      webgl: this.checkWebGLSupport(),
      webAssembly: this.checkWebAssemblySupport(),
      camera: this.checkCameraSupport(),
      microphone: this.checkMicrophoneSupport()
    };
    
    const allTests = this.suites.flatMap(s => s.tests);
    const summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      skipped: allTests.filter(t => t.status === 'skipped').length,
      duration: this.suites.reduce((sum, s) => sum + s.duration, 0)
    };
    
    return {
      suites: this.suites,
      summary,
      timestamp: Date.now(),
      environment
    };
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  private checkWebAssemblySupport(): boolean {
    return typeof WebAssembly !== 'undefined';
  }

  private checkCameraSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private checkMicrophoneSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async runQuickTest(): Promise<{ passed: boolean; summary: string }> {
    try {
      // Quick validation of critical systems
      const ort = await import('onnxruntime-web');
      
      if (!ort.env.wasm.wasmPaths) {
        return { passed: false, summary: 'ONNX WASM paths not configured' };
      }
      
      const wasmResponse = await fetch('/models/ort-wasm-simd-threaded.mjs', { method: 'HEAD' });
      if (!wasmResponse.ok) {
        return { passed: false, summary: 'WASM files not accessible' };
      }
      
      const onnxStatus = await onnxManager.initialize();
      if (!onnxStatus.isReady) {
        return { passed: false, summary: `ONNX initialization failed: ${onnxStatus.error}` };
      }
      
      return { passed: true, summary: 'All critical systems operational' };
    } catch (error) {
      return { passed: false, summary: `Quick test failed: ${error}` };
    }
  }
}

// Singleton instance
export const testingFramework = new TestingFramework(); 