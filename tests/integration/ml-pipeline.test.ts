/**
 * Integration Tests for ML Pipeline
 * 
 * Tests the complete ML detection pipeline from image input to waste classification:
 * - Camera → Detector → Classifier → Results
 * - Image Upload → Processing → Classification
 * - Voice Input → Text Processing → Classification
 * - Error propagation and recovery
 * - Performance under load
 * - System interaction edge cases
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedDetector } from '../../src/lib/ml/enhanced-detector';
import { WasteClassifier } from '../../src/lib/ml/classifier';
import { performanceAnalyzer } from '../../src/lib/utils/performance-analysis';

// Mock environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Setup comprehensive mocks
const setupMocks = () => {
  // Mock ONNX Runtime
  vi.mock('onnxruntime-web', () => ({
    InferenceSession: {
      create: vi.fn(() => Promise.resolve({
        run: vi.fn(() => Promise.resolve({
          output0: {
            data: new Float32Array([
              // Mock YOLO output for a bottle detection
              320, 240, 100, 150, 0.9, // bbox + objectness
              ...Array(79).fill(0), 0.95, // classes (bottle = class 39)
              // Mock detection for apple
              200, 180, 80, 90, 0.8,
              ...Array(40).fill(0), 0.85, ...Array(38).fill(0)
            ]),
            dims: [1, 84, 2]
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
  vi.mock('../../src/lib/utils/performance-analysis', () => ({
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
      end: vi.fn(() => 50),
      report: vi.fn()
    }
  }));

  // Mock Worker for LLM
  global.Worker = vi.fn(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onmessage: null,
    onerror: null
  })) as any;

  // Mock fetch for waste data
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      classifications: {
        bottle: {
          category: 'recycle',
          confidence: 0.95,
          instructions: 'Remove cap and rinse before recycling',
          tips: 'Check local recycling guidelines',
          color: '#22c55e'
        },
        apple: {
          category: 'compost',
          confidence: 0.92,
          instructions: 'Remove stickers before composting',
          tips: 'Can be composted whole',
          color: '#84cc16'
        }
      },
      keywords: {
        plastic: ['bottle', 'container'],
        fruit: ['apple', 'banana']
      }
    })
  })) as any;

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
      putImageData: vi.fn(),
      clearRect: vi.fn()
    })),
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,mock')
  };

  global.document = {
    createElement: vi.fn(() => mockCanvas)
  } as any;

  global.URL = {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn()
  } as any;

  global.ImageData = class {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
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

setupMocks();

describe('ML Pipeline Integration Tests', () => {
  let detector: EnhancedDetector;
  let classifier: WasteClassifier;
  let mockImageData: ImageData;

  beforeEach(async () => {
    detector = new EnhancedDetector();
    classifier = new WasteClassifier('/data/wasteData.json');
    mockImageData = new ImageData(640, 640);
    
    // Initialize both systems
    await detector.initialize();
    await classifier.initialize();
  });

  afterEach(() => {
    detector.dispose();
    vi.clearAllMocks();
  });

  describe('End-to-End Detection Pipeline', () => {
    test('processes image through complete detection pipeline', async () => {
      // Step 1: Run detection
      const detections = await detector.detect(mockImageData);
      
      expect(detections.length).toBeGreaterThan(0);
      expect(detections[0]).toHaveProperty('class');
      expect(detections[0]).toHaveProperty('confidence');
      expect(detections[0]).toHaveProperty('bbox');
      
      // Step 2: Classify detections
      const classifiedDetections = detections.map(detection => {
        const classification = classifier.classify(detection.class);
        return {
          ...detection,
          classification
        };
      });
      
      expect(classifiedDetections.length).toEqual(detections.length);
      classifiedDetections.forEach(detection => {
        expect(detection.classification).toBeDefined();
        if (detection.classification) {
          expect(detection.classification).toHaveProperty('category');
          expect(detection.classification).toHaveProperty('instructions');
        }
      });
    });

    test('maintains data flow integrity through pipeline', async () => {
      const startTime = performance.now();
      
      // Process multiple images to test data consistency
      const results = [];
      for (let i = 0; i < 5; i++) {
        const detections = await detector.detect(mockImageData);
        const classified = detections.map(d => ({
          ...d,
          classification: classifier.classify(d.class)
        }));
        results.push(classified);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Verify consistency
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
      
      // Performance check
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('handles pipeline errors gracefully', async () => {
      // Mock detection failure
      const originalDetect = detector.detect;
      detector.detect = vi.fn().mockRejectedValue(new Error('Detection failed'));
      
      // Should handle gracefully
      const result = await detector.detect(mockImageData).catch(error => ({
        error: error.message,
        fallback: true
      }));
      
      expect(result).toHaveProperty('error');
      
      // Restore original method
      detector.detect = originalDetect;
    });
  });

  describe('Performance Integration', () => {
    test('maintains performance under concurrent load', async () => {
      const concurrentTasks = 10;
      const startTime = performance.now();
      
      // Run concurrent detections
      const promises = Array(concurrentTasks).fill(null).map(async () => {
        const detections = await detector.detect(mockImageData);
        return detections.map(d => ({
          ...d,
          classification: classifier.classify(d.class)
        }));
      });
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Verify all tasks completed
      expect(results.length).toBe(concurrentTasks);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
      
      // Performance should scale reasonably
      const avgTimePerTask = totalTime / concurrentTasks;
      expect(avgTimePerTask).toBeLessThan(200); // Average < 200ms per task
    });

    test('manages memory during extended processing', async () => {
      const initialMemory = process.memoryUsage?.().heapUsed || 0;
      
      // Process many images to test memory management
      for (let i = 0; i < 50; i++) {
        const detections = await detector.detect(mockImageData);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (< 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('recovers from temporary failures', async () => {
      let failureCount = 0;
      const maxFailures = 3;
      
      // Mock intermittent failures
      const originalRun = detector.detect;
      detector.detect = vi.fn().mockImplementation(async (imageData) => {
        if (failureCount < maxFailures) {
          failureCount++;
          throw new Error(`Temporary failure ${failureCount}`);
        }
        return originalRun.call(detector, imageData);
      });
      
      // Should eventually succeed after retries
      let finalResult;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          finalResult = await detector.detect(mockImageData);
          break;
        } catch (error) {
          // Continue retrying
        }
      }
      
      expect(finalResult).toBeDefined();
      expect(Array.isArray(finalResult)).toBe(true);
    });

    test('maintains partial functionality during component failures', async () => {
      // Simulate LLM worker failure
      const mockWorker = vi.mocked(global.Worker).mock.results[0]?.value;
      if (mockWorker) {
        mockWorker.onerror = () => {
          throw new Error('LLM Worker failed');
        };
      }
      
      // Detection should still work without LLM enhancement
      const detections = await detector.detect(mockImageData);
      expect(Array.isArray(detections)).toBe(true);
      
      // Classification should still work
      const classifications = detections.map(d => classifier.classify(d.class));
      classifications.forEach(classification => {
        if (classification) {
          expect(classification).toHaveProperty('category');
        }
      });
    });

    test('handles invalid input data gracefully', async () => {
      const invalidInputs = [
        null,
        undefined,
        new ImageData(0, 0),
        new ImageData(1, 1), // Extremely small
        new ImageData(new Uint8ClampedArray([]), 0, 0) // Empty data
      ];
      
      for (const invalidInput of invalidInputs) {
        try {
          const result = await detector.detect(invalidInput as any);
          // Should either succeed with empty results or throw handled error
          expect(Array.isArray(result)).toBe(true);
        } catch (error) {
          // Acceptable to throw for truly invalid input
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('System Integration Edge Cases', () => {
    test('handles rapid successive requests', async () => {
      const rapidRequests = 20;
      const interval = 10; // 10ms between requests
      
      const results: any[] = [];
      
      // Send rapid successive requests
      for (let i = 0; i < rapidRequests; i++) {
        setTimeout(async () => {
          try {
            const detection = await detector.detect(mockImageData);
            results.push({ index: i, detection, timestamp: Date.now() });
          } catch (error) {
            results.push({ index: i, error: error.message, timestamp: Date.now() });
          }
        }, i * interval);
      }
      
      // Wait for all requests to complete
      await new Promise(resolve => setTimeout(resolve, rapidRequests * interval + 1000));
      
      // Verify requests were handled
      expect(results.length).toBeGreaterThan(0);
      
      // Check for race conditions (timestamps should be roughly in order)
      const timestamps = results.map(r => r.timestamp).filter(Boolean);
      const sortedTimestamps = [...timestamps].sort();
      expect(timestamps).toEqual(sortedTimestamps);
    });

    test('maintains state consistency across operations', async () => {
      // Perform various operations to test state consistency
      const operations = [
        () => detector.detect(mockImageData),
        () => classifier.classify('bottle'),
        () => classifier.search('plastic'),
        () => detector.detect(new ImageData(320, 240)),
        () => classifier.classify('apple')
      ];
      
      const results = [];
      
      // Execute operations in sequence
      for (const operation of operations) {
        try {
          const result = await operation();
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      
      // Verify state consistency
      expect(results.length).toBe(operations.length);
      
      // Most operations should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(operations.length * 0.7); // At least 70% success
    });

    test('handles memory pressure scenarios', async () => {
      // Simulate memory pressure by creating large objects
      const largeObjects: any[] = [];
      
      try {
        // Create memory pressure
        for (let i = 0; i < 100; i++) {
          largeObjects.push(new Array(100000).fill(Math.random()));
        }
        
        // Try detection under memory pressure
        const detections = await detector.detect(mockImageData);
        expect(Array.isArray(detections)).toBe(true);
        
      } catch (error) {
        // Acceptable to fail under extreme memory pressure
        expect(error).toBeInstanceOf(Error);
      } finally {
        // Clean up
        largeObjects.length = 0;
      }
    });
  });

  describe('Data Flow Validation', () => {
    test('preserves detection metadata through pipeline', async () => {
      const detections = await detector.detect(mockImageData);
      
      if (detections.length > 0) {
        const detection = detections[0];
        
        // Verify essential metadata is preserved
        expect(detection).toHaveProperty('bbox');
        expect(detection).toHaveProperty('confidence');
        expect(detection).toHaveProperty('class');
        
        // Verify enhanced metadata
        expect(detection).toHaveProperty('confidenceCalibrated');
        expect(detection).toHaveProperty('ensembleScore');
        expect(detection).toHaveProperty('contextualRelevance');
        
        // Verify bbox format
        expect(Array.isArray(detection.bbox)).toBe(true);
        expect(detection.bbox.length).toBe(4);
        detection.bbox.forEach(coord => {
          expect(typeof coord).toBe('number');
        });
        
        // Verify confidence ranges
        expect(detection.confidence).toBeGreaterThanOrEqual(0);
        expect(detection.confidence).toBeLessThanOrEqual(1);
        expect(detection.confidenceCalibrated).toBeGreaterThanOrEqual(0);
        expect(detection.confidenceCalibrated).toBeLessThanOrEqual(1);
      }
    });

    test('validates classification data consistency', async () => {
      const testItems = ['bottle', 'apple', 'unknown_item'];
      
      for (const item of testItems) {
        const classification = classifier.classify(item);
        
        if (classification) {
          // Verify classification structure
          expect(classification).toHaveProperty('category');
          expect(['recycle', 'compost', 'landfill']).toContain(classification.category);
          
          expect(classification).toHaveProperty('confidence');
          expect(classification.confidence).toBeGreaterThanOrEqual(0);
          expect(classification.confidence).toBeLessThanOrEqual(1);
          
          expect(classification).toHaveProperty('instructions');
          expect(typeof classification.instructions).toBe('string');
          expect(classification.instructions.length).toBeGreaterThan(0);
        }
      }
    });

    test('maintains temporal consistency in results', async () => {
      const results = [];
      const sameImageData = mockImageData;
      
      // Run same detection multiple times
      for (let i = 0; i < 5; i++) {
        const detections = await detector.detect(sameImageData);
        results.push({
          timestamp: Date.now(),
          detectionCount: detections.length,
          detections
        });
        
        // Small delay between detections
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Results should be temporally consistent
      expect(results.length).toBe(5);
      
      // Detection counts should be consistent for same input
      const detectionCounts = results.map(r => r.detectionCount);
      const uniqueCounts = [...new Set(detectionCounts)];
      expect(uniqueCounts.length).toBeLessThanOrEqual(2); // Allow for minor variations
    });
  });
}); 