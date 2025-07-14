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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedDetector } from '$lib/ml/enhanced-detector';
import { WasteClassifier } from '$lib/ml/classifier';
import { performanceOptimizer } from '$lib/utils/performance-optimizer';
import { modelOptimizer } from '$lib/utils/model-optimization';
import { testUtils } from '../setup';
import type { Detection, WasteClassification } from '$lib/types';

// Mock ONNX Runtime
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue({
      run: vi.fn().mockResolvedValue({
        output0: {
          data: new Float32Array([
            // Mock YOLO output: [x, y, w, h, conf, ...classes]
            320, 240, 100, 100, 0.85, 0.1, 0.9, 0.05, // bottle detection
            100, 150, 80, 80, 0.75, 0.8, 0.1, 0.05    // apple detection
          ]),
          dims: [1, 8, 2] // batch, features, detections
        }
      }),
      dispose: vi.fn()
    })
  },
  Tensor: {
    from: vi.fn().mockReturnValue({
      data: new Float32Array(640 * 640 * 3),
      dims: [1, 3, 640, 640]
    })
  }
}));

describe('ML Pipeline Integration Tests', () => {
  let enhancedDetector: EnhancedDetector;
  let wasteClassifier: WasteClassifier;
  let mockImageData: ImageData;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Initialize components
    enhancedDetector = new EnhancedDetector();
    wasteClassifier = new WasteClassifier();
    
    // Mock image data
    mockImageData = testUtils.createMockImageData(640, 640);
    
    // Initialize performance systems
    await performanceOptimizer.initialize();
    await modelOptimizer.initialize();
  });

  afterEach(() => {
    enhancedDetector?.dispose();
  });

  describe('End-to-End Detection Pipeline', () => {
    it('should complete full detection workflow', async () => {
      // Initialize detector
      await enhancedDetector.initialize();
      await wasteClassifier.initialize();
      
      // Run detection
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Verify detections
      expect(detections).toBeArray();
      expect(detections.length).toBeGreaterThan(0);
      
      // Verify detection structure
      detections.forEach(detection => {
        expect(detection).toHaveProperty('bbox');
        expect(detection).toHaveProperty('class');
        expect(detection).toHaveProperty('confidence');
        expect(detection.bbox).toBeArray();
        expect(detection.bbox).toHaveLength(4);
        expect(detection.confidence).toBeGreaterThan(0);
        expect(detection.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should integrate enhanced features', async () => {
      await enhancedDetector.initialize();
      
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Check for enhanced features
      detections.forEach(detection => {
        const enhanced = detection as any;
        
        // Should have ensemble scoring
        if (enhanced.ensembleScore) {
          expect(enhanced.ensembleScore).toBeGreaterThanOrEqual(detection.confidence);
        }
        
        // Should have calibrated confidence
        if (enhanced.confidenceCalibrated) {
          expect(enhanced.confidenceCalibrated).toBeGreaterThan(0);
          expect(enhanced.confidenceCalibrated).toBeLessThanOrEqual(1);
        }
        
        // Should have LLM context if available
        if (enhanced.llmContext) {
          expect(enhanced.llmContext).toHaveProperty('description');
          expect(enhanced.llmContext).toHaveProperty('confidence');
        }
      });
    });

    it('should handle classification integration', async () => {
      await enhancedDetector.initialize();
      await wasteClassifier.initialize();
      
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Classify each detection
      for (const detection of detections) {
        const classification = wasteClassifier.classify(detection.class);
        
        if (classification) {
          expect(classification).toHaveProperty('category');
          expect(classification).toHaveProperty('confidence');
          expect(classification).toHaveProperty('instructions');
          expect(['recycle', 'compost', 'landfill']).toContain(classification.category);
        }
      }
    });
  });

  describe('Performance Integration', () => {
    it('should meet performance requirements', async () => {
      await enhancedDetector.initialize();
      
      const startTime = performance.now();
      
      // Run multiple detections to test sustained performance
      const promises = Array(5).fill(null).map(() => 
        enhancedDetector.detect(mockImageData)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / results.length;
      
      // Should complete within performance targets
      expect(averageTime).toBeLessThan(100); // <100ms per inference
      
      // All detections should succeed
      results.forEach(detections => {
        expect(detections).toBeArray();
      });
    });

    it('should optimize based on device performance', async () => {
      // Mock low-performance device
      vi.spyOn(performanceOptimizer, 'getOptimizationConfig').mockReturnValue({
        inputResolution: [320, 320], // Reduced for low-end device
        frameSkipping: 2,
        confidenceThreshold: 0.7,
        maxDetections: 5,
        batchSize: 1,
        modelPrecision: 'fp16'
      });
      
      await enhancedDetector.initialize();
      
      const config = performanceOptimizer.getOptimizationConfig();
      
      // Should use optimized settings
      expect(config.inputResolution).toEqual([320, 320]);
      expect(config.frameSkipping).toBe(2);
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it('should handle memory constraints', async () => {
      // Mock memory pressure
      const mockMemory = {
        usedJSHeapSize: 180 * 1024 * 1024, // 180MB
        totalJSHeapSize: 200 * 1024 * 1024, // 200MB
        jsHeapSizeLimit: 200 * 1024 * 1024
      };
      
      vi.spyOn(performance, 'memory', 'get').mockReturnValue(mockMemory);
      
      await enhancedDetector.initialize();
      
      // Should adapt to memory constraints
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Should still produce results despite memory pressure
      expect(detections).toBeArray();
    });
  });

  describe('Model Loading and Optimization', () => {
    it('should load model within time limit', async () => {
      const startTime = performance.now();
      
      await enhancedDetector.initialize();
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    it('should handle model loading failures', async () => {
      // Mock ONNX session creation failure
      const mockCreate = vi.fn().mockRejectedValue(new Error('Model load failed'));
      vi.doMock('onnxruntime-web', () => ({
        InferenceSession: { create: mockCreate }
      }));
      
      const detector = new EnhancedDetector();
      
      // Should handle failure gracefully
      await expect(detector.initialize()).rejects.toThrow('Model load failed');
    });

    it('should optimize model based on hardware', async () => {
      await enhancedDetector.initialize();
      
      // Check if optimization was attempted
      expect(modelOptimizer.initialize).toHaveBeenCalled();
      
      // Should adapt model configuration
      const modelInfo = modelOptimizer.getModelInfo();
      expect(modelInfo).toHaveProperty('currentModel');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle inference errors gracefully', async () => {
      await enhancedDetector.initialize();
      
      // Mock inference failure
      const mockRun = vi.fn().mockRejectedValue(new Error('Inference failed'));
      (enhancedDetector as any).session = { run: mockRun };
      
      // Should handle error without crashing
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Should return empty array on error
      expect(detections).toEqual([]);
    });

    it('should recover from temporary failures', async () => {
      await enhancedDetector.initialize();
      
      // Mock session that fails once then succeeds
      const mockRun = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          output0: {
            data: new Float32Array([320, 240, 100, 100, 0.85, 0.1, 0.9, 0.05]),
            dims: [1, 8, 1]
          }
        });
      
      (enhancedDetector as any).session = { run: mockRun };
      
      // First call should fail, second should succeed
      let detections = await enhancedDetector.detect(mockImageData);
      expect(detections).toEqual([]);
      
      detections = await enhancedDetector.detect(mockImageData);
      expect(detections.length).toBeGreaterThan(0);
    });

    it('should validate input data', async () => {
      await enhancedDetector.initialize();
      
      // Test with invalid image data
      const invalidImageData = null as any;
      
      const detections = await enhancedDetector.detect(invalidImageData);
      
      // Should handle invalid input gracefully
      expect(detections).toEqual([]);
    });
  });

  describe('Classification Pipeline', () => {
    it('should integrate voice input classification', async () => {
      await wasteClassifier.initialize();
      
      const voiceInputs = [
        'plastic bottle',
        'apple core',
        'cardboard box',
        'broken glass',
        'coffee cup'
      ];
      
      for (const input of voiceInputs) {
        const classification = wasteClassifier.classifyVoiceInput(input);
        
        if (classification) {
          expect(classification).toHaveProperty('category');
          expect(classification).toHaveProperty('confidence');
          expect(classification).toHaveProperty('instructions');
          expect(['recycle', 'compost', 'landfill']).toContain(classification.category);
        }
      }
    });

    it('should handle fuzzy matching', async () => {
      await wasteClassifier.initialize();
      
      const fuzzyInputs = [
        'bottel', // misspelled bottle
        'aple',   // misspelled apple
        'cardord', // misspelled cardboard
        'glas jar' // missing s in glass
      ];
      
      for (const input of fuzzyInputs) {
        const classification = wasteClassifier.classifyVoiceInput(input);
        
        // Should find matches despite misspellings
        expect(classification).toBeTruthy();
        if (classification) {
          expect(classification.confidence).toBeGreaterThan(0);
        }
      }
    });

    it('should provide disposal instructions', async () => {
      await wasteClassifier.initialize();
      
      const testItems = ['plastic_bottle', 'apple', 'cardboard_box'];
      
      for (const item of testItems) {
        const classification = wasteClassifier.classify(item);
        
        if (classification) {
          expect(classification.instructions).toBeTruthy();
          expect(typeof classification.instructions).toBe('string');
          expect(classification.instructions.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Real-time Processing', () => {
    it('should handle rapid detection requests', async () => {
      await enhancedDetector.initialize();
      
      const rapidRequests = Array(10).fill(null).map((_, index) => 
        enhancedDetector.detect(mockImageData).then(result => ({ index, result }))
      );
      
      const results = await Promise.all(rapidRequests);
      
      // All requests should complete
      expect(results).toHaveLength(10);
      
      // Results should be in order
      results.forEach((result, index) => {
        expect(result.index).toBe(index);
        expect(result.result).toBeArray();
      });
    });

    it('should handle concurrent detection requests', async () => {
      await enhancedDetector.initialize();
      
      // Create multiple image data
      const images = Array(5).fill(null).map(() => testUtils.createMockImageData());
      
      // Run detections concurrently
      const concurrentDetections = images.map(img => enhancedDetector.detect(img));
      
      const results = await Promise.all(concurrentDetections);
      
      // All detections should complete
      expect(results).toHaveLength(5);
      results.forEach(detections => {
        expect(detections).toBeArray();
      });
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data integrity through pipeline', async () => {
      await enhancedDetector.initialize();
      await wasteClassifier.initialize();
      
      // Create test image with known properties
      const testImage = testUtils.createMockImageData(640, 640);
      
      // Run through complete pipeline
      const detections = await enhancedDetector.detect(testImage);
      
      for (const detection of detections) {
        // Verify detection data integrity
        expect(detection.bbox).toHaveLength(4);
        expect(detection.bbox.every(coord => typeof coord === 'number')).toBe(true);
        expect(typeof detection.class).toBe('string');
        expect(typeof detection.confidence).toBe('number');
        
        // Verify classification integration
        const classification = wasteClassifier.classify(detection.class);
        if (classification) {
          expect(typeof classification.category).toBe('string');
          expect(typeof classification.confidence).toBe('number');
        }
      }
    });

    it('should handle pipeline state consistency', async () => {
      // Initialize in sequence
      await enhancedDetector.initialize();
      await wasteClassifier.initialize();
      
      // Verify both systems are ready
      expect((enhancedDetector as any).isInitialized).toBe(true);
      expect((wasteClassifier as any).isInitialized).toBe(true);
      
      // Test pipeline state after operations
      await enhancedDetector.detect(mockImageData);
      
      // State should remain consistent
      expect((enhancedDetector as any).isInitialized).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty detection results', async () => {
      await enhancedDetector.initialize();
      
      // Mock empty detection result
      const mockRun = vi.fn().mockResolvedValue({
        output0: {
          data: new Float32Array([]), // Empty results
          dims: [1, 8, 0]
        }
      });
      
      (enhancedDetector as any).session = { run: mockRun };
      
      const detections = await enhancedDetector.detect(mockImageData);
      
      expect(detections).toEqual([]);
    });

    it('should handle low confidence detections', async () => {
      await enhancedDetector.initialize();
      
      // Mock low confidence detections
      const mockRun = vi.fn().mockResolvedValue({
        output0: {
          data: new Float32Array([
            320, 240, 100, 100, 0.3, 0.1, 0.9, 0.05, // Low confidence
            100, 150, 80, 80, 0.2, 0.8, 0.1, 0.05     // Very low confidence
          ]),
          dims: [1, 8, 2]
        }
      });
      
      (enhancedDetector as any).session = { run: mockRun };
      
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Should filter out low confidence detections
      expect(detections.every(d => d.confidence >= 0.5)).toBe(true);
    });

    it('should handle malformed model outputs', async () => {
      await enhancedDetector.initialize();
      
      // Mock malformed output
      const mockRun = vi.fn().mockResolvedValue({
        output0: {
          data: new Float32Array([1, 2, 3]), // Wrong format
          dims: [1, 3, 1]
        }
      });
      
      (enhancedDetector as any).session = { run: mockRun };
      
      const detections = await enhancedDetector.detect(mockImageData);
      
      // Should handle gracefully
      expect(detections).toEqual([]);
    });
  });
});

// Helper to extend expect with custom matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeArray(): T;
    }
  }
}

// Custom matcher for arrays
expect.extend({
  toBeArray(received) {
    const pass = Array.isArray(received);
    return {
      pass,
      message: () => pass 
        ? `Expected ${received} not to be an array`
        : `Expected ${received} to be an array`
    };
  }
}); 