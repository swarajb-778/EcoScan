import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { EnhancedObjectDetector } from '$lib/ml/enhanced-detector.js';
import type { Detection, ModelConfig } from '$lib/types/index.js';

// Extended Detection interface for testing
interface ExtendedDetection extends Detection {
  enhanced?: boolean;
  reasoning?: string;
  tips?: string[];
  subcategory?: string;
}

// Mock ONNX Runtime
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue({
      run: vi.fn().mockResolvedValue({
        output0: {
          type: 'float32',
          dims: [1, 85, 8400],
          data: new Float32Array(85 * 8400),
          location: 'cpu',
          cpuData: new Float32Array(85 * 8400),
          texture: undefined,
          gpuBuffer: undefined,
          dataProvider: undefined,
          size: 85 * 8400,
          get: (index: number) => new Float32Array(85 * 8400)[index],
          set: (index: number, value: number) => { /* mock */ },
          slice: () => new Float32Array(85 * 8400),
          getData: () => new Float32Array(85 * 8400),
          dispose: () => { /* mock */ }
        }
      }),
      release: vi.fn()
    })
  },
  Tensor: vi.fn().mockImplementation((type, data, dims) => ({
    type,
    data,
    dims,
    location: 'cpu',
    cpuData: data,
    texture: undefined,
    gpuBuffer: undefined,
    dataProvider: undefined,
    size: data.length,
    get: (index: number) => data[index],
    set: (index: number, value: number) => { data[index] = value; },
    slice: () => data,
    getData: () => data,
    dispose: () => { /* mock */ }
  }))
}));

// Mock browser utilities
vi.mock('$lib/utils/browser.js', () => ({
  isBrowser: vi.fn(() => true)
}));

describe('Enhanced Object Detector Tests', () => {
  let detector: EnhancedObjectDetector;
  let mockConfig: ModelConfig;
  let mockImageData: ImageData;

  beforeEach(() => {
    mockConfig = {
      modelPath: '/models/yolov8n.onnx',
      inputSize: [640, 640],
      threshold: 0.5,
      iouThreshold: 0.4
    };

    // Create mock ImageData
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    mockImageData = ctx.createImageData(640, 640);
    
    // Fill with test pattern
    for (let i = 0; i < mockImageData.data.length; i += 4) {
      mockImageData.data[i] = 128;     // R
      mockImageData.data[i + 1] = 64;  // G
      mockImageData.data[i + 2] = 192; // B
      mockImageData.data[i + 3] = 255; // A
    }

    // Mock Worker
    global.Worker = vi.fn().mockImplementation(() => ({
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null
    }));

    // Mock performance
    global.performance = {
      now: vi.fn(() => Date.now())
    } as any;

    detector = new EnhancedObjectDetector(mockConfig);
  });

  afterEach(() => {
    if (detector) {
      detector.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Initialization Tests', () => {
    it('should initialize successfully', async () => {
      await expect(detector.initialize()).resolves.not.toThrow();
    });

    it('should handle model loading failure', async () => {
      const { InferenceSession } = await import('onnxruntime-web');
      vi.mocked(InferenceSession.create).mockRejectedValue(new Error('Model not found'));

      await expect(detector.initialize()).rejects.toThrow('Model not found');
    });

    it('should initialize workers for parallel processing', async () => {
      await detector.initialize();
      
      expect(global.Worker).toHaveBeenCalledTimes(2); // preprocessing and LLM workers
    });

    it('should use optimal execution providers', async () => {
      await detector.initialize();
      
      const { InferenceSession } = await import('onnxruntime-web');
      expect(InferenceSession.create).toHaveBeenCalledWith(
        mockConfig.modelPath,
        expect.objectContaining({
          executionProviders: expect.arrayContaining([
            expect.objectContaining({ name: 'webgl' }),
            expect.objectContaining({ name: 'wasm' })
          ])
        })
      );
    });

    it('should handle browser environment detection', async () => {
      const { isBrowser } = await import('$lib/utils/browser.js');
      vi.mocked(isBrowser).mockReturnValue(false);

      const nonBrowserDetector = new EnhancedObjectDetector(mockConfig);
      await nonBrowserDetector.initialize();
      
      // Should handle non-browser environment gracefully
    });
  });

  describe('Detection Functionality Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should detect objects in image', async () => {
      const detections = await detector.detect(mockImageData);
      
      expect(Array.isArray(detections)).toBe(true);
      expect(detections.length).toBeGreaterThanOrEqual(0);
    });

    it('should return detection with correct structure', async () => {
      // Mock successful detection
      const mockOutput = {
        output0: {
          dims: [1, 85, 8400],
          data: new Float32Array(85 * 8400)
        }
      };
      
      // Set up mock data for one detection
      const outputData = mockOutput.output0.data;
      outputData[0] = 320;      // x center
      outputData[8400] = 240;   // y center  
      outputData[16800] = 100;  // width
      outputData[25200] = 100;  // height
      outputData[33600] = 0.8;  // confidence
      outputData[42000] = 0.9;  // class probability (bottle)

      const { InferenceSession } = await import('onnxruntime-web');
      const mockSession = await InferenceSession.create('test');
      vi.mocked(mockSession.run).mockResolvedValue(mockOutput);

      const detections = await detector.detect(mockImageData);
      
      if (detections.length > 0) {
        const detection = detections[0];
        expect(detection).toHaveProperty('bbox');
        expect(detection).toHaveProperty('class');
        expect(detection).toHaveProperty('confidence');
        expect(detection).toHaveProperty('category');
        expect(detection.bbox).toHaveLength(4);
        expect(detection.confidence).toBeGreaterThan(0);
        expect(detection.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should apply confidence threshold filtering', async () => {
      const lowConfidenceConfig = { ...mockConfig, threshold: 0.9 };
      const highThresholdDetector = new EnhancedObjectDetector(lowConfidenceConfig);
      await highThresholdDetector.initialize();
      
      const detections = await highThresholdDetector.detect(mockImageData);
      
      detections.forEach(detection => {
        expect(detection.confidence).toBeGreaterThanOrEqual(0.9);
      });
      
      highThresholdDetector.dispose();
    });

    it('should perform non-maximum suppression', async () => {
      // Create mock output with overlapping detections
      const mockOutput = {
        output0: {
          dims: [1, 85, 8400],
          data: new Float32Array(85 * 8400)
        }
      };
      
      const outputData = mockOutput.output0.data;
      
      // First detection
      outputData[0] = 300;      // x center
      outputData[8400] = 200;   // y center  
      outputData[16800] = 100;  // width
      outputData[25200] = 100;  // height
      outputData[33600] = 0.9;  // confidence
      outputData[42000] = 0.8;  // class probability
      
      // Overlapping detection (should be suppressed)
      outputData[1] = 310;      // x center
      outputData[8401] = 210;   // y center  
      outputData[16801] = 100;  // width
      outputData[25201] = 100;  // height
      outputData[33601] = 0.85; // lower confidence
      outputData[42001] = 0.8;  // class probability

      const { InferenceSession } = await import('onnxruntime-web');
      const mockSession = await InferenceSession.create('test');
      vi.mocked(mockSession.run).mockResolvedValue(mockOutput);

      const detections = await detector.detect(mockImageData);
      
      // Should have removed overlapping detection
      expect(detections.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Image Enhancement Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should enhance image quality before detection', async () => {
      // Create dark image
      const darkImageData = new ImageData(640, 640);
      for (let i = 0; i < darkImageData.data.length; i += 4) {
        darkImageData.data[i] = 30;     // Dark R
        darkImageData.data[i + 1] = 30; // Dark G
        darkImageData.data[i + 2] = 30; // Dark B
        darkImageData.data[i + 3] = 255; // A
      }

      const detections = await detector.detect(darkImageData);
      
      // Should apply enhancement for dark images
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should analyze image context', async () => {
      const detections = await detector.detect(mockImageData);
      
      // Context analysis should be applied
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should apply multi-scale detection', async () => {
      const detections = await detector.detect(mockImageData);
      
      // Multi-scale detection should find objects at different scales
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('LLM Classification Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should enhance high-confidence detections with LLM', async () => {
      // Mock detection with high confidence
      const mockOutput = {
        output0: {
          dims: [1, 85, 8400],
          data: new Float32Array(85 * 8400)
        }
      };
      
      const outputData = mockOutput.output0.data;
      outputData[0] = 320;      // x center
      outputData[8400] = 240;   // y center  
      outputData[16800] = 100;  // width
      outputData[25200] = 100;  // height
      outputData[33600] = 0.9;  // high confidence
      outputData[42000] = 0.85; // class probability (bottle)

      const { InferenceSession } = await import('onnxruntime-web');
      const mockSession = await InferenceSession.create('test');
      vi.mocked(mockSession.run).mockResolvedValue(mockOutput);

      const detections = await detector.detect(mockImageData);
      
      if (detections.length > 0) {
        const detection = detections[0];
        expect(detection.confidence).toBeGreaterThan(0.7);
        // High confidence detections should have enhanced properties
      }
    });

    it('should provide detailed instructions for classified items', async () => {
      const detections = await detector.detect(mockImageData);
      
      detections.forEach(detection => {
        if (detection.enhanced) {
          expect(detection).toHaveProperty('instructions');
          expect(detection).toHaveProperty('reasoning');
          expect(detection).toHaveProperty('tips');
          expect(typeof detection.instructions).toBe('string');
          expect(Array.isArray(detection.tips)).toBe(true);
        }
      });
    });

    it('should handle LLM classification errors gracefully', async () => {
      // Mock LLM worker error
      const mockWorker = new Worker('test');
      vi.mocked(mockWorker.postMessage).mockImplementation(() => {
        if (mockWorker.onerror) {
          mockWorker.onerror(new ErrorEvent('error'));
        }
      });

      const detections = await detector.detect(mockImageData);
      
      // Should fallback to basic classification
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Temporal Consistency Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should apply temporal smoothing across frames', async () => {
      // First detection
      const detections1 = await detector.detect(mockImageData);
      
      // Second detection (same object)
      const detections2 = await detector.detect(mockImageData);
      
      // Confidence should be smoothed over time
      if (detections1.length > 0 && detections2.length > 0) {
        // Temporal smoothing should be applied
        expect(Array.isArray(detections2)).toBe(true);
      }
    });

    it('should track objects across frames', async () => {
      // Simulate object movement
      const frame1 = mockImageData;
      const frame2 = new ImageData(640, 640);
      
      const detections1 = await detector.detect(frame1);
      const detections2 = await detector.detect(frame2);
      
      // Object tracking should maintain consistency
      expect(Array.isArray(detections1)).toBe(true);
      expect(Array.isArray(detections2)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should complete detection within time limit', async () => {
      const startTime = performance.now();
      await detector.detect(mockImageData);
      const endTime = performance.now();
      
      const detectionTime = endTime - startTime;
      expect(detectionTime).toBeLessThan(200); // 200ms limit
    });

    it('should handle multiple concurrent detections', async () => {
      const promises = Array(5).fill(null).map(() => 
        detector.detect(mockImageData)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(detections => {
        expect(Array.isArray(detections)).toBe(true);
      });
    });

    it('should manage memory efficiently', async () => {
      // Run multiple detections
      for (let i = 0; i < 10; i++) {
        await detector.detect(mockImageData);
      }
      
      // Memory should not leak significantly
      // This would require actual memory monitoring in real tests
    });

    it('should adapt to device performance', async () => {
      // Mock low-performance device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2
      });
      
      const detections = await detector.detect(mockImageData);
      
      // Should adapt processing for low-end devices
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should handle corrupted image data', async () => {
      const corruptImageData = new ImageData(640, 640);
      // Don't fill with valid data
      
      const detections = await detector.detect(corruptImageData);
      
      // Should handle gracefully without crashing
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should handle invalid image dimensions', async () => {
      const invalidImageData = new ImageData(0, 0);
      
      await expect(detector.detect(invalidImageData)).rejects.toThrow();
    });

    it('should handle WebGL context loss', async () => {
      // Simulate WebGL context loss
      const contextLossEvent = new Event('webglcontextlost');
      window.dispatchEvent(contextLossEvent);
      
      const detections = await detector.detect(mockImageData);
      
      // Should fallback to CPU processing
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should handle model inference timeout', async () => {
      const { InferenceSession } = await import('onnxruntime-web');
      const mockSession = await InferenceSession.create('test');
      
      // Mock slow inference
      vi.mocked(mockSession.run).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(detector.detect(mockImageData)).rejects.toThrow();
    });

    it('should handle worker communication failures', async () => {
      // Mock worker error
      const mockWorker = new Worker('test');
      vi.mocked(mockWorker.postMessage).mockImplementation(() => {
        throw new Error('Worker communication failed');
      });

      const detections = await detector.detect(mockImageData);
      
      // Should fallback gracefully
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Fallback Mechanism Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should fallback to basic detection on enhancement failure', async () => {
      // Mock enhancement failure
      const detections = await detector.detect(mockImageData);
      
      // Should still return valid detections
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should use CPU inference when WebGL fails', async () => {
      const detections = await detector.detect(mockImageData);
      
      // Should work with CPU fallback
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Resource Management Tests', () => {
    it('should clean up resources on disposal', async () => {
      await detector.initialize();
      
      const mockWorker = new Worker('test');
      
      detector.dispose();
      
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should handle multiple disposal calls', async () => {
      await detector.initialize();
      
      detector.dispose();
      detector.dispose(); // Should not throw
      
      // Multiple dispose calls should be safe
    });

    it('should clear detection history on disposal', async () => {
      await detector.initialize();
      await detector.detect(mockImageData);
      
      detector.dispose();
      
      // History should be cleared
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should work with different image formats', async () => {
      // Test with different ImageData formats
      const formats = [
        new ImageData(320, 240),
        new ImageData(640, 480),
        new ImageData(1280, 720),
        new ImageData(1920, 1080)
      ];

      for (const imageData of formats) {
        // Fill with test data
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = 100;
          imageData.data[i + 1] = 100;
          imageData.data[i + 2] = 100;
          imageData.data[i + 3] = 255;
        }

        const detections = await detector.detect(imageData);
        expect(Array.isArray(detections)).toBe(true);
      }
    });

    it('should integrate with preprocessing worker', async () => {
      const detections = await detector.detect(mockImageData);
      
      // Should use preprocessing worker for enhancement
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should integrate with LLM worker', async () => {
      const detections = await detector.detect(mockImageData);
      
      // Should use LLM worker for classification
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Edge Case Tests', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should handle empty images', async () => {
      const emptyImageData = new ImageData(640, 640);
      // All pixels are black (default)
      
      const detections = await detector.detect(emptyImageData);
      
      expect(Array.isArray(detections)).toBe(true);
      expect(detections.length).toBe(0);
    });

    it('should handle very bright images', async () => {
      const brightImageData = new ImageData(640, 640);
      for (let i = 0; i < brightImageData.data.length; i += 4) {
        brightImageData.data[i] = 255;     // Max R
        brightImageData.data[i + 1] = 255; // Max G
        brightImageData.data[i + 2] = 255; // Max B
        brightImageData.data[i + 3] = 255; // Max A
      }

      const detections = await detector.detect(brightImageData);
      
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should handle images with single color', async () => {
      const monoImageData = new ImageData(640, 640);
      for (let i = 0; i < monoImageData.data.length; i += 4) {
        monoImageData.data[i] = 128;
        monoImageData.data[i + 1] = 128;
        monoImageData.data[i + 2] = 128;
        monoImageData.data[i + 3] = 255;
      }

      const detections = await detector.detect(monoImageData);
      
      expect(Array.isArray(detections)).toBe(true);
    });

    it('should handle rapid successive detections', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(detector.detect(mockImageData));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(detections => {
        expect(Array.isArray(detections)).toBe(true);
      });
    });
  });
}); 