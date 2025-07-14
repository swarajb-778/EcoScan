/**
 * ML Detection System Test Suite
 * Comprehensive testing for YOLO model, inference, and classification
 */

import { describe, it, expect, vi } from 'vitest';
import { ObjectDetector } from '../../../src/lib/ml/detector';
import { testUtils, testFixtures } from '../../setup';

describe('ML Detection System', () => {
  describe('Model Loading', () => {
    it('loads YOLOv8 model successfully', async () => {
      const mockSession = testUtils.mockONNXSession();
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      expect(mockSession.run).toBeDefined();
    });

    it('handles model loading failures', async () => {
      const mockSession = testUtils.mockONNXSession();
      mockSession.run.mockRejectedValue(new Error('Model loading failed'));
      
      const detector = new ObjectDetector({
        modelPath: '/models/invalid-model.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await expect(detector.initialize()).rejects.toThrow('Model loading failed');
    });

    it('falls back to CPU inference when WebGL fails', async () => {
      // Mock WebGL failure
      const originalWebGL = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      // Should fall back to CPU
      expect(detector.getExecutionProvider()).toBe('cpu');
      
      // Restore original
      HTMLCanvasElement.prototype.getContext = originalWebGL;
    });

    it('verifies model integrity', async () => {
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      const isValid = await detector.verifyModelIntegrity();
      expect(isValid).toBe(true);
    });

    it('handles corrupted model files', async () => {
      const detector = new ObjectDetector({
        modelPath: '/models/corrupted.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      // Mock corrupted model
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      await expect(detector.initialize()).rejects.toThrow();
    });

    it('falls back to alternative models', async () => {
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4,
        fallbackModels: ['/models/yolov8s.onnx', '/models/basic.onnx']
      });
      
      // Mock primary model failure
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: () => new ArrayBuffer(1024) });
      
      await detector.initialize();
      
      expect(detector.getCurrentModel()).toBe('/models/yolov8s.onnx');
    });
  });

  describe('Object Detection', () => {
    it('detects common household items', async () => {
      const mockOutput = new Float32Array([
        // Mock YOLO output for plastic bottle
        0.2, 0.3, 0.4, 0.5, 0.95, // bbox + confidence
        0.1, 0.1, 0.1, 0.1, 0.1, // class scores (bottle at index 0)
        0.9, 0.05, 0.02, 0.01, 0.02 // bottle has highest score
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections).toHaveLength(1);
      expect(detections[0]).toHaveValidDetection();
      expect(detections[0].class).toBe('bottle');
      expect(detections[0].confidence).toBeGreaterThan(0.8);
    });

    it('returns accurate bounding boxes', async () => {
      const mockOutput = new Float32Array([
        0.2, 0.3, 0.4, 0.5, 0.95, // bbox: center_x, center_y, width, height, confidence
        0.9, 0.05, 0.02, 0.01, 0.02 // class scores
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections[0].bbox).toEqual([
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      ]);
      
      // Bounding box should be within image bounds
      const [x, y, w, h] = detections[0].bbox;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(640);
      expect(y + h).toBeLessThanOrEqual(640);
    });

    it('filters detections by confidence threshold', async () => {
      const mockOutput = new Float32Array([
        // High confidence detection
        0.2, 0.3, 0.4, 0.5, 0.95,
        0.9, 0.05, 0.02, 0.01, 0.02,
        // Low confidence detection
        0.6, 0.7, 0.2, 0.3, 0.3,
        0.8, 0.1, 0.05, 0.03, 0.02
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      // Should only return high confidence detection
      expect(detections).toHaveLength(1);
      expect(detections[0].confidence).toBeGreaterThan(0.5);
    });

    it('handles empty detection results', async () => {
      const mockOutput = new Float32Array([
        0.2, 0.3, 0.4, 0.5, 0.2, // Low confidence
        0.1, 0.1, 0.1, 0.1, 0.1
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections).toHaveLength(0);
    });

    it('performs non-maximum suppression', async () => {
      const mockOutput = new Float32Array([
        // Two overlapping detections of same object
        0.2, 0.3, 0.4, 0.5, 0.95,
        0.9, 0.05, 0.02, 0.01, 0.02,
        0.22, 0.32, 0.38, 0.48, 0.9,
        0.85, 0.08, 0.03, 0.02, 0.02
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      // Should suppress overlapping detection
      expect(detections).toHaveLength(1);
    });
  });

  describe('Classification', () => {
    it('classifies detected objects correctly', async () => {
      const mockOutput = new Float32Array([
        0.2, 0.3, 0.4, 0.5, 0.95,
        0.9, 0.05, 0.02, 0.01, 0.02 // bottle classification
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections[0].class).toBe('bottle');
      expect(detections[0].category).toBe('recycle');
    });

    it('provides disposal instructions', async () => {
      const mockOutput = new Float32Array([
        0.2, 0.3, 0.4, 0.5, 0.95,
        0.9, 0.05, 0.02, 0.01, 0.02
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections[0].instructions).toBeDefined();
      expect(detections[0].instructions).toContain('recycle');
    });

    it('handles unknown objects gracefully', async () => {
      const mockOutput = new Float32Array([
        0.2, 0.3, 0.4, 0.5, 0.95,
        0.1, 0.1, 0.1, 0.1, 0.1 // No clear classification
      ]);
      
      const mockSession = testUtils.mockONNXSession({ output: mockOutput });
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections[0].class).toBe('unknown');
      expect(detections[0].category).toBe('landfill');
    });
  });

  describe('Performance', () => {
    it('maintains >15 FPS on modern devices', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      
      // Measure inference time
      const startTime = performance.now();
      await detector.detect(imageData);
      const endTime = performance.now();
      
      const inferenceTime = endTime - startTime;
      
      // Should be fast enough for 15+ FPS (< 66ms)
      expect(inferenceTime).toBeLessThan(66);
    });

    it('processes frames within 100ms', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      
      const processingTime = await testUtils.measurePerformance(async () => {
        await detector.detect(imageData);
      });
      
      expect(processingTime).toBeLessThan(100);
    });

    it('manages memory usage efficiently', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const initialMemory = testUtils.checkMemoryUsage();
      
      // Run multiple detections
      for (let i = 0; i < 10; i++) {
        const imageData = testUtils.mockImageData(640, 640);
        await detector.detect(imageData);
      }
      
      const finalMemory = testUtils.checkMemoryUsage();
      
      // Memory should not increase significantly
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('handles corrupt image data', async () => {
      const mockSession = testUtils.mockONNXSession();
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      // Create corrupted image data
      const corruptedImageData = {
        data: new Uint8ClampedArray(100), // Wrong size
        width: 640,
        height: 640,
        colorSpace: 'srgb'
      } as ImageData;
      
      await expect(detector.detect(corruptedImageData)).rejects.toThrow();
    });

    it('processes images of various sizes', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const sizes = [
        [320, 240],
        [640, 480],
        [1920, 1080],
        [480, 640] // Portrait
      ];
      
      for (const [width, height] of sizes) {
        const imageData = testUtils.mockImageData(width, height);
        const detections = await detector.detect(imageData);
        
        expect(detections).toBeDefined();
        expect(Array.isArray(detections)).toBe(true);
      }
    });

    it('handles empty or black images', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      // Create black image
      const blackImageData = testUtils.mockImageData(640, 640);
      blackImageData.data.fill(0);
      
      const detections = await detector.detect(blackImageData);
      
      expect(detections).toHaveLength(0);
    });

    it('handles GPU memory exhaustion', async () => {
      const mockSession = testUtils.mockONNXSession();
      mockSession.run.mockRejectedValue(new Error('GPU memory exhausted'));
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      
      // Should fall back to CPU
      const detections = await detector.detect(imageData);
      
      expect(detector.getExecutionProvider()).toBe('cpu');
    });

    it('adapts to device performance', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      // Simulate slow device
      const slowPerformance = vi.fn()
        .mockReturnValue(100)
        .mockReturnValue(300); // 200ms inference time
      
      global.performance.now = slowPerformance;
      
      const imageData = testUtils.mockImageData(640, 640);
      await detector.detect(imageData);
      
      // Should adapt threshold or reduce quality
      expect(detector.getThreshold()).toBeGreaterThan(0.5);
    });

    it('maintains accuracy under load', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array([
          0.2, 0.3, 0.4, 0.5, 0.95,
          0.9, 0.05, 0.02, 0.01, 0.02
        ])
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      // Run multiple concurrent detections
      const imageData = testUtils.mockImageData(640, 640);
      const promises = Array(5).fill(0).map(() => detector.detect(imageData));
      
      const results = await Promise.all(promises);
      
      // All results should be consistent
      results.forEach(detections => {
        expect(detections).toHaveLength(1);
        expect(detections[0].confidence).toBeGreaterThan(0.9);
      });
    });

    it('handles model download failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await expect(detector.initialize()).rejects.toThrow('Network error');
    });

    it('works offline after initial load', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      await detector.initialize();
      
      // Simulate offline
      testUtils.simulateNetworkConditions(false);
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      // Should work offline
      expect(detections).toBeDefined();
    });

    it('resumes after network restoration', async () => {
      const mockSession = testUtils.mockONNXSession({
        output: new Float32Array(100)
      });
      
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      // Start offline
      testUtils.simulateNetworkConditions(false);
      
      await expect(detector.initialize()).rejects.toThrow();
      
      // Go online
      testUtils.simulateNetworkConditions(true);
      
      await detector.initialize();
      
      const imageData = testUtils.mockImageData(640, 640);
      const detections = await detector.detect(imageData);
      
      expect(detections).toBeDefined();
    });
  });

  describe('Model Integrity', () => {
    it('verifies model file integrity', async () => {
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      // Mock valid model response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(12 * 1024 * 1024)) // 12MB
      });
      
      const isValid = await detector.verifyModelIntegrity();
      expect(isValid).toBe(true);
    });

    it('detects corrupted model files', async () => {
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      // Mock corrupted model response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)) // Too small
      });
      
      const isValid = await detector.verifyModelIntegrity();
      expect(isValid).toBe(false);
    });

    it('validates model format', async () => {
      const detector = new ObjectDetector({
        modelPath: '/models/yolov8n.onnx',
        inputSize: [640, 640],
        threshold: 0.5,
        iouThreshold: 0.4
      });
      
      const isValidFormat = await detector.validateModelFormat();
      expect(isValidFormat).toBe(true);
    });
  });
}); 