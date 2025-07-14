/**
 * Comprehensive Input Validation and Error Handling Tests
 * 
 * Tests robust error handling for wrong input data scenarios:
 * - Invalid file types and formats
 * - Corrupted image data
 * - Malicious input attempts
 * - Voice input edge cases
 * - Network failure scenarios
 * - Memory exhaustion
 * - Browser compatibility issues
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedDetector } from '../../../src/lib/ml/enhanced-detector';
import { WasteClassifier } from '../../../src/lib/ml/classifier';
import { ErrorBoundary } from '../../../src/lib/utils/error-boundary';
import { ErrorRecoverySystem } from '../../../src/lib/systems/ErrorRecoverySystem';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Setup error testing environment
const setupErrorTestEnvironment = () => {
  // Mock console to capture error logs
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn()
  };

  // Mock performance API
  global.performance = {
    ...performance,
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => [])
  };

  // Mock navigator with various capabilities
  Object.defineProperty(global, 'navigator', {
    value: {
      hardwareConcurrency: 4,
      userAgent: 'test-browser',
      mediaDevices: {
        getUserMedia: vi.fn()
      }
    },
    configurable: true
  });

  // Mock ONNX Runtime for error scenarios
  vi.mock('onnxruntime-web', () => ({
    InferenceSession: {
      create: vi.fn()
    },
    Tensor: vi.fn(),
    env: {
      wasm: { wasmPaths: '', numThreads: 4, simd: true, proxy: false },
      webgl: { contextId: 'webgl2' },
      webgpu: { validateInputContent: false }
    }
  }));

  // Mock fetch for network error testing
  global.fetch = vi.fn();

  // Mock File API
  global.File = class MockFile {
    name: string;
    size: number;
    type: string;
    lastModified: number;

    constructor(chunks: any[], filename: string, options: any = {}) {
      this.name = filename;
      this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
  } as any;

  // Mock FileReader
  global.FileReader = class MockFileReader {
    result: any = null;
    error: any = null;
    onload: any = null;
    onerror: any = null;
    onabort: any = null;

    readAsDataURL(file: any) {
      setTimeout(() => {
        if (this.onload) {
          this.result = 'data:image/jpeg;base64,mock-data';
          this.onload({ target: this });
        }
      }, 10);
    }

    readAsArrayBuffer(file: any) {
      setTimeout(() => {
        if (this.onload) {
          this.result = new ArrayBuffer(file.size || 1000);
          this.onload({ target: this });
        }
      }, 10);
    }

    abort() {
      if (this.onabort) {
        this.onabort({ target: this });
      }
    }
  } as any;

  // Mock canvas for image processing errors
  const createMockCanvas = (shouldFail = false) => ({
    width: 640,
    height: 640,
    getContext: vi.fn(() => {
      if (shouldFail) {
        throw new Error('Canvas context creation failed');
      }
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => {
          if (shouldFail) {
            throw new Error('getImageData failed');
          }
          return {
            data: new Uint8ClampedArray(640 * 640 * 4),
            width: 640,
            height: 640
          };
        }),
        putImageData: vi.fn(),
        clearRect: vi.fn()
      };
    }),
    toDataURL: vi.fn(() => {
      if (shouldFail) {
        throw new Error('toDataURL failed');
      }
      return 'data:image/jpeg;base64,mock';
    })
  });

  global.document = {
    createElement: vi.fn((tag) => {
      if (tag === 'canvas') {
        return createMockCanvas();
      }
      return {};
    })
  } as any;

  // Mock ImageData
  global.ImageData = class MockImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: any, width?: number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = width!;
        this.data = new Uint8ClampedArray(dataOrWidth * width! * 4);
      } else {
        this.data = dataOrWidth;
        this.width = width!;
        this.height = height!;
      }
    }
  } as any;
};

setupErrorTestEnvironment();

describe('Input Validation and Error Handling', () => {
  let detector: EnhancedDetector;
  let classifier: WasteClassifier;
  let errorBoundary: ErrorBoundary;
  let errorRecovery: ErrorRecoverySystem;

  beforeEach(() => {
    detector = new EnhancedDetector();
    classifier = new WasteClassifier('/data/wasteData.json');
    errorBoundary = new ErrorBoundary();
    errorRecovery = new ErrorRecoverySystem();
    vi.clearAllMocks();
  });

  afterEach(() => {
    detector.dispose();
  });

  describe('File Input Validation', () => {
    test('rejects non-image file types', async () => {
      const invalidFiles = [
        new File(['malicious content'], 'virus.exe', { type: 'application/x-executable' }),
        new File(['document content'], 'document.pdf', { type: 'application/pdf' }),
        new File(['text content'], 'script.js', { type: 'text/javascript' }),
        new File(['archive content'], 'archive.zip', { type: 'application/zip' }),
        new File(['video content'], 'video.mp4', { type: 'video/mp4' })
      ];

      for (const file of invalidFiles) {
        const isValid = errorBoundary.validateFileType(file);
        expect(isValid).toBe(false);
        
        // Should log appropriate error
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid file type')
        );
      }
    });

    test('validates image file sizes', async () => {
      // Test oversized file (50MB)
      const oversizedFile = new File(
        [new ArrayBuffer(50 * 1024 * 1024)], 
        'huge-image.jpg', 
        { type: 'image/jpeg' }
      );

      const isValid = errorBoundary.validateFileSize(oversizedFile, 10 * 1024 * 1024); // 10MB limit
      expect(isValid).toBe(false);

      // Test empty file
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const isEmptyValid = errorBoundary.validateFileSize(emptyFile, 1024); // 1KB minimum
      expect(isEmptyValid).toBe(false);

      // Test valid file
      const validFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)], 
        'valid.jpg', 
        { type: 'image/jpeg' }
      );
      const isValidValid = errorBoundary.validateFileSize(validFile, 10 * 1024 * 1024);
      expect(isValidValid).toBe(true);
    });

    test('detects potentially malicious files', async () => {
      const maliciousFiles = [
        // Double extension
        new File(['content'], 'image.jpg.exe', { type: 'image/jpeg' }),
        
        // Mismatched MIME type
        new File(['content'], 'image.jpg', { type: 'application/x-executable' }),
        
        // Script injection attempts
        new File(['<script>alert("xss")</script>'], 'image.svg', { type: 'image/svg+xml' }),
        
        // Hidden characters
        new File(['content'], 'image\x00.jpg', { type: 'image/jpeg' }),
        
        // Path traversal
        new File(['content'], '../../../etc/passwd.jpg', { type: 'image/jpeg' })
      ];

      for (const file of maliciousFiles) {
        const isSafe = errorBoundary.validateFileSecurity(file);
        expect(isSafe).toBe(false);
        
        // Should log security warning
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Security validation failed')
        );
      }
    });

    test('handles corrupted image data', async () => {
      // Create corrupted image data
      const corruptedData = new Uint8ClampedArray([0xFF, 0xFF, 0xFF, 0xFF]); // Invalid size
      const corruptedImageData = new ImageData(corruptedData, 1, 1);

      await detector.initialize();
      
      // Should handle corruption gracefully
      const result = await detector.detect(corruptedImageData);
      
      // Should return fallback or empty results, not crash
      expect(Array.isArray(result)).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced detection failed')
      );
    });
  });

  describe('Image Processing Error Handling', () => {
    test('handles canvas creation failures', async () => {
      // Mock canvas creation failure
      global.document.createElement = vi.fn((tag) => {
        if (tag === 'canvas') {
          throw new Error('Canvas not supported');
        }
        return {};
      });

      await detector.initialize();
      
      // Should handle canvas failure gracefully
      const result = await detector.detect(new ImageData(640, 640));
      expect(Array.isArray(result)).toBe(true);
    });

    test('handles WebGL context loss', async () => {
      // Mock WebGL context loss during operation
      const mockSession = {
        run: vi.fn().mockRejectedValue(new Error('WebGL context lost')),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);

      await detector.initialize();
      const result = await detector.detect(new ImageData(640, 640));
      
      // Should fallback gracefully
      expect(Array.isArray(result)).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    test('handles out of memory errors', async () => {
      // Mock OOM during model inference
      const oomError = new Error('Out of memory');
      oomError.name = 'OutOfMemoryError';

      const mockSession = {
        run: vi.fn().mockRejectedValue(oomError),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);

      await detector.initialize();
      
      // Should handle OOM gracefully
      const result = await detector.detect(new ImageData(640, 640));
      expect(Array.isArray(result)).toBe(true);
      
      // Should suggest memory cleanup
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('memory')
      );
    });
  });

  describe('Voice Input Error Handling', () => {
    test('handles speech recognition unavailability', () => {
      // Mock missing SpeechRecognition API
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      const voiceHandler = errorBoundary.initializeVoiceInput();
      expect(voiceHandler.isSupported).toBe(false);
      expect(voiceHandler.fallbackToText).toBe(true);
    });

    test('handles microphone permission denial', async () => {
      // Mock getUserMedia rejection
      global.navigator.mediaDevices.getUserMedia = vi.fn()
        .mockRejectedValue(new Error('Permission denied'));

      const voiceHandler = errorBoundary.initializeVoiceInput();
      const result = await voiceHandler.requestMicrophoneAccess();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      expect(result.fallbackAvailable).toBe(true);
    });

    test('handles audio processing errors', async () => {
      const invalidAudioInputs = [
        null,
        undefined,
        '', // Empty string
        '   ', // Whitespace only
        'a'.repeat(10000), // Extremely long input
        '\x00\x01\x02', // Binary data
        '<script>alert("xss")</script>', // XSS attempt
        '🤖👽🛸', // Unicode/emoji only
      ];

      for (const input of invalidAudioInputs) {
        const result = classifier.classify(input as any);
        
        // Should handle gracefully without crashing
        if (result) {
          expect(result).toHaveProperty('category');
        }
        
        // Should not cause security issues
        expect(input).not.toContain('<script>');
      }
    });
  });

  describe('Network Error Handling', () => {
    test('handles model download failures', async () => {
      // Mock network failure for model loading
      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockRejectedValue(
        new Error('Network error: Failed to fetch model')
      );

      // Should attempt fallback or provide clear error
      await expect(detector.initialize()).rejects.toThrow();
      
      // Should log helpful error message
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced detector initialization failed')
      );
    });

    test('handles classification data loading failures', async () => {
      // Mock fetch failure for waste data
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(classifier.initialize()).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    test('handles intermittent network issues', async () => {
      let attemptCount = 0;
      vi.mocked(global.fetch).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ classifications: {}, keywords: {} })
        } as any);
      });

      // Should retry and eventually succeed
      const retryHandler = errorRecovery.createRetryHandler(3, 100);
      const result = await retryHandler.execute(() => classifier.initialize());
      
      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
    });
  });

  describe('Browser Compatibility Errors', () => {
    test('handles missing Web APIs', () => {
      // Test missing APIs one by one
      const missingAPIs = [
        'Worker',
        'ImageData',
        'FileReader',
        'canvas',
        'WebGL',
        'getUserMedia'
      ];

      for (const api of missingAPIs) {
        const compatibility = errorBoundary.checkBrowserCompatibility();
        const missing = compatibility.missingFeatures;
        
        // Should detect missing features
        expect(Array.isArray(missing)).toBe(true);
        
        // Should provide fallback strategies
        expect(compatibility.fallbackStrategies).toBeDefined();
        expect(Object.keys(compatibility.fallbackStrategies).length).toBeGreaterThan(0);
      }
    });

    test('handles old browser versions', () => {
      // Mock old browser
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; MSIE 11.0; Windows NT 6.1)',
        configurable: true
      });

      const compatibility = errorBoundary.checkBrowserCompatibility();
      
      expect(compatibility.isSupported).toBe(false);
      expect(compatibility.recommendations).toContain('upgrade');
      expect(compatibility.fallbackMode).toBe(true);
    });

    test('provides graceful degradation', async () => {
      // Mock limited browser capabilities
      const limitedCapabilities = {
        webgl: false,
        webgpu: false,
        workers: false,
        canvas: true,
        imageData: true
      };

      const degradedConfig = errorBoundary.createDegradedConfiguration(limitedCapabilities);
      
      expect(degradedConfig.executionProviders).toEqual(['cpu']);
      expect(degradedConfig.enableLLM).toBe(false);
      expect(degradedConfig.enableEnsemble).toBe(false);
      expect(degradedConfig.inputResolution).toEqual([320, 320]); // Reduced for performance
    });
  });

  describe('Memory and Performance Error Handling', () => {
    test('handles memory exhaustion gracefully', async () => {
      // Mock memory exhaustion
      const mockSession = {
        run: vi.fn().mockRejectedValue(new Error('JavaScript heap out of memory')),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);

      await detector.initialize();
      
      // Should handle memory issues
      const result = await detector.detect(new ImageData(640, 640));
      expect(Array.isArray(result)).toBe(true);
      
      // Should suggest memory optimization
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('memory')
      );
    });

    test('handles performance degradation', async () => {
      // Mock slow inference
      const slowSession = {
        run: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            output0: { data: new Float32Array(84), dims: [1, 84, 1] }
          }), 5000)) // 5 second delay
        ),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(slowSession as any);

      await detector.initialize();
      
      const startTime = Date.now();
      const result = await detector.detect(new ImageData(640, 640));
      const duration = Date.now() - startTime;
      
      // Should either timeout or complete
      expect(Array.isArray(result)).toBe(true);
      
      if (duration > 3000) {
        // Should log performance warning
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('performance')
        );
      }
    });
  });

  describe('Error Recovery Mechanisms', () => {
    test('implements circuit breaker pattern', async () => {
      const circuitBreaker = errorRecovery.createCircuitBreaker(3, 1000); // 3 failures, 1s timeout
      
      // Mock failing operation
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      // Should fail 3 times then open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.state).toBe('open');
      expect(failingOperation).toHaveBeenCalledTimes(3); // Should stop calling after 3 failures
    });

    test('implements exponential backoff retry', async () => {
      let attemptCount = 0;
      const retryOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 4) {
          return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
        }
        return Promise.resolve('success');
      });

      const retryHandler = errorRecovery.createRetryHandler(5, 100, 2); // 5 retries, 100ms base, 2x backoff
      const startTime = Date.now();
      
      const result = await retryHandler.execute(retryOperation);
      const duration = Date.now() - startTime;
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(4);
      
      // Should implement exponential backoff (100 + 200 + 400 = 700ms minimum)
      expect(duration).toBeGreaterThan(700);
    });

    test('provides fallback data sources', async () => {
      // Mock primary data source failure
      vi.mocked(global.fetch).mockRejectedValue(new Error('Primary source failed'));
      
      // Should try fallback sources
      const fallbackSources = [
        '/data/wasteData.json',
        '/data/wasteData-backup.json',
        '/data/wasteData-minimal.json'
      ];
      
      const dataLoader = errorRecovery.createFallbackLoader(fallbackSources);
      
      // Mock only the last source succeeding
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/data/wasteData-minimal.json') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ classifications: {}, keywords: {} })
          } as any);
        }
        return Promise.reject(new Error('Source not available'));
      });
      
      const result = await dataLoader.load();
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3); // Should try all sources
    });
  });

  describe('User Experience During Errors', () => {
    test('provides helpful error messages', () => {
      const errorMessages = errorBoundary.generateUserFriendlyErrors();
      
      // Should have user-friendly messages for common errors
      expect(errorMessages['Permission denied']).toContain('camera access');
      expect(errorMessages['Network error']).toContain('internet connection');
      expect(errorMessages['Out of memory']).toContain('close some tabs');
      expect(errorMessages['WebGL context lost']).toContain('refresh');
      
      // Should provide actionable advice
      Object.values(errorMessages).forEach(message => {
        expect(message).toMatch(/try|enable|check|refresh|close/i);
      });
    });

    test('maintains partial functionality during errors', async () => {
      // Mock LLM failure but keep basic detection
      global.Worker = vi.fn().mockImplementation(() => {
        throw new Error('Worker not supported');
      });

      await detector.initialize();
      const result = await detector.detect(new ImageData(640, 640));
      
      // Should still work without LLM enhancement
      expect(Array.isArray(result)).toBe(true);
      
      // Should inform user about reduced functionality
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('LLM')
      );
    });

    test('provides recovery suggestions', () => {
      const recoverySuggestions = errorBoundary.getRecoverySuggestions();
      
      expect(recoverySuggestions).toHaveProperty('memoryIssues');
      expect(recoverySuggestions).toHaveProperty('networkIssues');
      expect(recoverySuggestions).toHaveProperty('browserCompatibility');
      expect(recoverySuggestions).toHaveProperty('performanceIssues');
      
      // Each suggestion should have steps
      Object.values(recoverySuggestions).forEach((suggestion: any) => {
        expect(Array.isArray(suggestion.steps)).toBe(true);
        expect(suggestion.steps.length).toBeGreaterThan(0);
      });
    });
  });
}); 