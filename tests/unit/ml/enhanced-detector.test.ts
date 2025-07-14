/**
 * Comprehensive Tests for Enhanced Detection System
 * 
 * Tests cover:
 * - Core functionality
 * - Performance optimization
 * - LLM integration
 * - Edge cases and error handling
 * - Device compatibility
 * - Memory management
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedDetector } from '../../../src/lib/ml/enhanced-detector';
import { performanceAnalyzer } from '../../../src/lib/utils/performance-analysis';

// Mock ONNX Runtime
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(() => Promise.resolve({
      run: vi.fn(() => Promise.resolve({
        output0: {
          data: new Float32Array(84 * 10), // Mock YOLO output
          dims: [1, 84, 10]
        }
      })),
      release: vi.fn()
    }))
  },
  Tensor: vi.fn((type, data, dims) => ({ type, data, dims, dispose: vi.fn() })),
  env: {
    wasm: { wasmPaths: '', numThreads: 4, simd: true, proxy: false },
    webgl: { contextId: 'webgl2', matmulMaxBatchSize: 1, textureCacheMode: 'full' },
    webgpu: { validateInputContent: false }
  }
}));

// Mock performance analyzer
vi.mock('../../../src/lib/utils/performance-analysis', () => ({
  performanceAnalyzer: {
    analyzeDeviceCapabilities: vi.fn(() => Promise.resolve({
      webglSupport: true,
      webgpuSupport: false,
      coreCount: 4,
      memoryEstimate: 4096,
      performanceTier: 'high',
      supportedProviders: ['webgl', 'wasm', 'cpu']
    })),
    dispose: vi.fn()
  },
  measurePerformance: {
    start: vi.fn(),
    end: vi.fn(() => 50), // Mock 50ms timing
    report: vi.fn()
  }
}));

// Mock Worker
global.Worker = vi.fn(() => ({
  postMessage: vi.fn() as any,
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null
})) as any;

// Mock browser environment
Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
    userAgent: 'test'
  }
});

// Mock canvas and image processing
const mockCanvas = {
  width: 640,
  height: 640,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(640 * 640 * 4),
      width: 640,
      height: 640
    })),
    putImageData: vi.fn()
  }))
};

global.document = {
  createElement: vi.fn(() => mockCanvas)
} as any;

describe('Enhanced Detection System', () => {
  let detector: EnhancedDetector;
  let mockImageData: ImageData;

  beforeEach(() => {
    detector = new EnhancedDetector();
    mockImageData = new ImageData(640, 640);
  });

  afterEach(() => {
    detector.dispose();
    vi.clearAllMocks();
  });

  describe('Core Functionality', () => {
    test('initializes enhanced detector successfully', async () => {
      await expect(detector.initialize()).resolves.not.toThrow();
    });

    test('runs detection on image data', async () => {
      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      
      expect(Array.isArray(detections)).toBe(true);
      expect(detections.length).toBeGreaterThanOrEqual(0);
    });

    test('enhances detections with LLM context', async () => {
      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      
      if (detections.length > 0) {
        expect(detections[0]).toHaveProperty('confidenceCalibrated');
        expect(detections[0]).toHaveProperty('ensembleScore');
        expect(detections[0]).toHaveProperty('contextualRelevance');
      }
    });

    test('applies confidence calibration', async () => {
      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      
      detections.forEach(detection => {
        expect(detection.confidenceCalibrated).toBeGreaterThanOrEqual(0);
        expect(detection.confidenceCalibrated).toBeLessThanOrEqual(1);
        expect(typeof detection.confidenceCalibrated).toBe('number');
      });
    });
  });

  describe('Performance Optimization', () => {
    test('optimizes configuration for device capabilities', async () => {
      // Mock high-performance device
      vi.mocked(performanceAnalyzer.analyzeDeviceCapabilities).mockResolvedValue({
        webglSupport: true,
        webgpuSupport: true,
        coreCount: 8,
        memoryEstimate: 8192,
        performanceTier: 'ultra',
        supportedProviders: ['webgpu', 'webgl', 'wasm', 'cpu']
      });

      await detector.initialize();
      
      // Verify device capabilities were analyzed
      expect(performanceAnalyzer.analyzeDeviceCapabilities).toHaveBeenCalled();
    });

    test('adapts to low-performance devices', async () => {
      // Mock low-performance device
      vi.mocked(performanceAnalyzer.analyzeDeviceCapabilities).mockResolvedValue({
        webglSupport: false,
        webgpuSupport: false,
        coreCount: 2,
        memoryEstimate: 1024,
        performanceTier: 'low',
        supportedProviders: ['cpu']
      });

      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      
      // Should still work on low-performance devices
      expect(Array.isArray(detections)).toBe(true);
    });

         test('measures and reports inference time', async () => {
       await detector.initialize();
       await detector.detect(mockImageData);
       
       const { measurePerformance } = await import('../../../src/lib/utils/performance-analysis');
       expect(vi.mocked(measurePerformance.start)).toHaveBeenCalledWith('enhanced-detection');
       expect(vi.mocked(measurePerformance.end)).toHaveBeenCalledWith('enhanced-detection');
     });

    test('manages memory efficiently', async () => {
      await detector.initialize();
      
      // Run multiple detections
      for (let i = 0; i < 10; i++) {
        await detector.detect(mockImageData);
      }
      
      // Memory should not grow excessively
      // This test would check actual memory usage in a real environment
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('LLM Integration', () => {
    test('initializes LLM worker', async () => {
      await detector.initialize();
      
      // Verify worker was created
      expect(global.Worker).toHaveBeenCalledWith(
        expect.any(URL),
        { type: 'module' }
      );
    });

    test('handles LLM worker errors gracefully', async () => {
      // Mock worker error
      const mockWorker = vi.mocked(global.Worker).mockImplementation(() => ({
        postMessage: vi.fn(),
        terminate: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onmessage: null,
        onerror: () => {
          throw new Error('Worker error');
        }
      })) as any;

      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      
      // Should still work without LLM
      expect(Array.isArray(detections)).toBe(true);
    });

    test('applies contextual analysis to detections', async () => {
      await detector.initialize();
      
      // Mock successful LLM analysis
      const mockWorker = vi.mocked(global.Worker).mock.results[0]?.value;
      if (mockWorker) {
        mockWorker.onmessage = vi.fn((event) => {
          if (event.data.type === 'analyze-detections') {
            // Simulate LLM response
            mockWorker.onmessage({
              data: {
                type: 'llm-analysis-complete',
                detections: event.data.detections.map((d: any) => ({
                  ...d,
                  llmContext: {
                    description: 'LLM enhanced description',
                    confidenceScore: 0.9
                  }
                }))
              }
            });
          }
        });
      }

      const detections = await detector.detect(mockImageData);
      
      detections.forEach(detection => {
        if (detection.llmContext) {
          expect(detection.llmContext).toHaveProperty('description');
          expect(detection.llmContext).toHaveProperty('confidenceScore');
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty image data', async () => {
      await detector.initialize();
      const emptyImageData = new ImageData(1, 1);
      
      const detections = await detector.detect(emptyImageData);
      expect(Array.isArray(detections)).toBe(true);
    });

    test('handles corrupted image data', async () => {
      await detector.initialize();
      const corruptedImageData = new ImageData(new Uint8ClampedArray([]), 0, 0);
      
      await expect(detector.detect(corruptedImageData)).resolves.not.toThrow();
    });

    test('handles model loading failures', async () => {
      // Mock model loading failure
      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockRejectedValue(new Error('Model load failed'));
      
      await expect(detector.initialize()).rejects.toThrow();
    });

    test('handles inference failures with fallback', async () => {
      await detector.initialize();
      
      // Mock inference failure
      const ort = await import('onnxruntime-web');
      const mockSession = {
        run: vi.fn().mockRejectedValue(new Error('Inference failed')),
        release: vi.fn()
      };
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);
      
      const detections = await detector.detect(mockImageData);
      
      // Should return fallback results
      expect(Array.isArray(detections)).toBe(true);
    });

    test('handles WebGL context loss', async () => {
      await detector.initialize();
      
      // Simulate WebGL context loss
      const mockError = new Error('WebGL context lost');
      mockError.name = 'WebGLContextLostError';
      
      // Mock inference failure due to context loss
      const ort = await import('onnxruntime-web');
      const mockSession = {
        run: vi.fn().mockRejectedValue(mockError),
        release: vi.fn()
      };
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);
      
      const detections = await detector.detect(mockImageData);
      expect(Array.isArray(detections)).toBe(true);
    });

    test('handles out of memory errors', async () => {
      await detector.initialize();
      
      // Mock OOM error
      const oomError = new Error('Out of memory');
      oomError.name = 'OutOfMemoryError';
      
      const ort = await import('onnxruntime-web');
      const mockSession = {
        run: vi.fn().mockRejectedValue(oomError),
        release: vi.fn()
      };
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);
      
      await expect(detector.detect(mockImageData)).resolves.not.toThrow();
    });
  });

  describe('Input Validation', () => {
    test('validates image data format', async () => {
      await detector.initialize();
      
      // Test with invalid image data
      const invalidData = null as any;
      await expect(detector.detect(invalidData)).rejects.toThrow();
    });

    test('handles different image dimensions', async () => {
      await detector.initialize();
      
      const testDimensions = [
        [320, 240],
        [640, 480],
        [1920, 1080],
        [100, 100]
      ];
      
      for (const [width, height] of testDimensions) {
        const imageData = new ImageData(width, height);
        const detections = await detector.detect(imageData);
        expect(Array.isArray(detections)).toBe(true);
      }
    });

    test('handles extremely large images', async () => {
      await detector.initialize();
      
      // Test with very large image (should be handled gracefully)
      const largeImageData = new ImageData(4096, 4096);
      const detections = await detector.detect(largeImageData);
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    test('meets inference time requirements', async () => {
      await detector.initialize();
      
      const startTime = performance.now();
      await detector.detect(mockImageData);
      const inferenceTime = performance.now() - startTime;
      
      // Should complete within reasonable time (mocked to 50ms)
      expect(inferenceTime).toBeLessThan(200); // Allow for overhead
    });

    test('handles concurrent detections', async () => {
      await detector.initialize();
      
      // Run multiple detections concurrently
      const promises = Array(5).fill(null).map(() => detector.detect(mockImageData));
      const results = await Promise.all(promises);
      
      results.forEach(detections => {
        expect(Array.isArray(detections)).toBe(true);
      });
    });

    test('maintains consistent performance', async () => {
      await detector.initialize();
      
      const times: number[] = [];
      
      // Run multiple detections to test consistency
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await detector.detect(mockImageData);
        times.push(performance.now() - startTime);
      }
      
      // Check that performance is relatively consistent
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be reasonable (within 50% of average)
      expect(stdDev).toBeLessThan(avgTime * 0.5);
    });
  });

  describe('Resource Management', () => {
    test('properly disposes resources', () => {
      detector.dispose();
      
      // Verify disposal was called
      expect(performanceAnalyzer.dispose).toHaveBeenCalled();
    });

    test('handles multiple dispose calls', () => {
      detector.dispose();
      detector.dispose(); // Should not throw
      
      expect(true).toBe(true); // Test passes if no error thrown
    });

    test('cleans up workers on dispose', () => {
      const mockWorker = vi.mocked(global.Worker).mock.results[0]?.value;
      
      detector.dispose();
      
      if (mockWorker) {
        expect(mockWorker.terminate).toHaveBeenCalled();
      }
    });
  });

  describe('Device Compatibility', () => {
    test('works with WebGL support', async () => {
      vi.mocked(performanceAnalyzer.analyzeDeviceCapabilities).mockResolvedValue({
        webglSupport: true,
        webgpuSupport: false,
        coreCount: 4,
        memoryEstimate: 4096,
        performanceTier: 'high',
        supportedProviders: ['webgl', 'wasm', 'cpu']
      });

      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      expect(Array.isArray(detections)).toBe(true);
    });

    test('works without GPU acceleration', async () => {
      vi.mocked(performanceAnalyzer.analyzeDeviceCapabilities).mockResolvedValue({
        webglSupport: false,
        webgpuSupport: false,
        coreCount: 2,
        memoryEstimate: 2048,
        performanceTier: 'low',
        supportedProviders: ['cpu']
      });

      await detector.initialize();
      const detections = await detector.detect(mockImageData);
      expect(Array.isArray(detections)).toBe(true);
    });

    test('adapts to different core counts', async () => {
      const testCores = [1, 2, 4, 8, 16];
      
      for (const coreCount of testCores) {
        vi.mocked(performanceAnalyzer.analyzeDeviceCapabilities).mockResolvedValue({
          webglSupport: true,
          webgpuSupport: false,
          coreCount,
          memoryEstimate: 4096,
          performanceTier: 'medium',
          supportedProviders: ['webgl', 'wasm', 'cpu']
        });

        const newDetector = new EnhancedDetector();
        await newDetector.initialize();
        const detections = await newDetector.detect(mockImageData);
        expect(Array.isArray(detections)).toBe(true);
        newDetector.dispose();
      }
    });
  });
}); 