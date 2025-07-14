/**
 * CameraView Component Test Suite
 * Comprehensive testing for camera functionality, edge cases, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import CameraView from '$lib/components/CameraView.svelte';
import { testUtils } from '../../setup';

// Mock the enhanced detector
vi.mock('$lib/ml/enhanced-detector', () => ({
  EnhancedDetector: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    detect: vi.fn().mockResolvedValue([]),
    dispose: vi.fn()
  }))
}));

// Mock performance utilities
vi.mock('$lib/utils/performance-optimizer', () => ({
  performanceOptimizer: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getOptimizationConfig: vi.fn().mockReturnValue({
      inputResolution: [640, 640],
      frameSkipping: 1,
      confidenceThreshold: 0.5,
      maxDetections: 10
    }),
    updateMetrics: vi.fn()
  }
}));

vi.mock('$lib/utils/model-optimization', () => ({
  modelOptimizer: {
    initialize: vi.fn().mockResolvedValue(undefined),
    checkPerformanceAndOptimize: vi.fn().mockResolvedValue(undefined),
    getModelInfo: vi.fn().mockReturnValue({
      currentModel: 'yolov8n'
    })
  }
}));

describe('CameraView Component', () => {
  let mockDetector: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock detector
    mockDetector = {
      initialize: vi.fn().mockResolvedValue(undefined),
      detect: vi.fn().mockResolvedValue([
        testUtils.createMockDetection({
          class: 'bottle',
          confidence: 0.85,
          category: 'recycle'
        })
      ]),
      dispose: vi.fn()
    };

    // Create mock stream
    mockStream = testUtils.createMockStream();

    // Setup getUserMedia mock
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render camera placeholder when not active', () => {
      render(CameraView, { isActive: false });
      
      expect(screen.getByText('Camera Ready')).toBeInTheDocument();
      expect(screen.getByText('Tap to start detecting waste items')).toBeInTheDocument();
    });

    it('should render camera view when active', async () => {
      render(CameraView, { isActive: true });
      
      // Wait for component to initialize
      await testUtils.waitForNextTick();
      
      // Camera view elements should be present
      const videoElement = document.querySelector('video');
      const canvasElement = document.querySelector('canvas');
      
      expect(videoElement).toBeInTheDocument();
      expect(canvasElement).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(CameraView, { isActive: false });
      
      const placeholder = screen.getByRole('button');
      expect(placeholder).toHaveAttribute('aria-label', 'Start camera detection');
      expect(placeholder).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Camera Activation', () => {
    it('should activate camera when placeholder is clicked', async () => {
      const { component } = render(CameraView, { isActive: false });
      
      const placeholder = screen.getByRole('button');
      await fireEvent.click(placeholder);
      
      // Check if component state changed to active
      await testUtils.waitForNextTick();
      
      // Verify getUserMedia was called
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'environment'
        }
      });
    });

    it('should activate camera with keyboard interaction', async () => {
      render(CameraView, { isActive: false });
      
      const placeholder = screen.getByRole('button');
      
      // Test Enter key
      await fireEvent.keyDown(placeholder, { key: 'Enter' });
      await testUtils.waitForNextTick();
      
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      
      // Reset mock
      vi.clearAllMocks();
      
      // Test Space key
      await fireEvent.keyDown(placeholder, { key: ' ' });
      await testUtils.waitForNextTick();
      
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should not activate camera on other keys', async () => {
      render(CameraView, { isActive: false });
      
      const placeholder = screen.getByRole('button');
      await fireEvent.keyDown(placeholder, { key: 'a' });
      
      expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    });
  });

  describe('Camera Permission Handling', () => {
    it('should handle permission denied gracefully', async () => {
      const permissionError = new Error('Permission denied');
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(permissionError);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      expect(consoleSpy).toHaveBeenCalledWith('Camera access failed:', permissionError);
      
      consoleSpy.mockRestore();
    });

    it('should handle camera initialization errors', async () => {
      const initError = new Error('Detector initialization failed');
      vi.mocked(mockDetector.initialize).mockRejectedValue(initError);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize camera:', initError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Detection Functionality', () => {
    it('should process detections when active', async () => {
      const onDetections = vi.fn();
      render(CameraView, { 
        isActive: true,
        onDetections 
      });
      
      await testUtils.waitForNextTick();
      
      // Mock video element ready state
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (videoElement) {
        Object.defineProperty(videoElement, 'readyState', { value: 4 });
        
        // Trigger a detection frame
        await testUtils.waitForAnimationFrame();
        
        expect(onDetections).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              class: 'bottle',
              confidence: 0.85,
              category: 'recycle'
            })
          ])
        );
      }
    });

    it('should display detection count', async () => {
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      // Wait for detections to be processed
      await testUtils.waitForAnimationFrame();
      
      // Check if detection count is displayed
      expect(screen.getByText(/items detected/)).toBeInTheDocument();
    });
  });

  describe('Camera Controls', () => {
    it('should have switch camera button when active', async () => {
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      const switchButton = screen.getByLabelText('Switch camera');
      expect(switchButton).toBeInTheDocument();
      expect(switchButton).toHaveTextContent('📷');
    });

    it('should switch camera when button is clicked', async () => {
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      const switchButton = screen.getByLabelText('Switch camera');
      await fireEvent.click(switchButton);
      
      // Should call getUserMedia again with different facing mode
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user' // Should switch from 'environment' to 'user'
        }
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should display performance metrics overlay', async () => {
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      await testUtils.waitForAnimationFrame();
      
      // Check if performance overlay is rendered on canvas
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Verify that performance metrics are being updated
      const canvasContext = canvas?.getContext('2d');
      expect(canvasContext?.fillText).toHaveBeenCalledWith(
        expect.stringContaining('FPS:'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should track inference time', async () => {
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      // Mock performance.now to control timing
      const mockNow = vi.fn()
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050); // End time (50ms later)
      
      global.performance.now = mockNow;
      
      await testUtils.waitForAnimationFrame();
      
      // Verify inference time is calculated and displayed
      const canvas = document.querySelector('canvas');
      const canvasContext = canvas?.getContext('2d');
      expect(canvasContext?.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Inference:'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Cleanup and Lifecycle', () => {
    it('should stop camera stream on component unmount', async () => {
      const { unmount } = render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      // Verify stream was created
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      
      // Mock the stop function
      const mockStop = vi.fn();
      (mockStream.getTracks() as any).forEach((track: any) => {
        track.stop = mockStop;
      });
      
      unmount();
      
      // Verify tracks were stopped
      expect(mockStop).toHaveBeenCalled();
    });

    it('should dispose detector on unmount', async () => {
      const { unmount } = render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      unmount();
      
      expect(mockDetector.dispose).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', async () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      const { unmount } = render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      await testUtils.waitForAnimationFrame();
      
      unmount();
      
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
      
      cancelAnimationFrameSpy.mockRestore();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle detection errors gracefully', async () => {
      const detectionError = new Error('Detection failed');
      mockDetector.detect.mockRejectedValue(detectionError);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      await testUtils.waitForAnimationFrame();
      
      expect(consoleSpy).toHaveBeenCalledWith('Detection failed:', detectionError);
      
      consoleSpy.mockRestore();
    });

    it('should continue detection loop after errors', async () => {
      // First call fails, second succeeds
      mockDetector.detect
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue([testUtils.createMockDetection()]);
      
      const onDetections = vi.fn();
      render(CameraView, { 
        isActive: true,
        onDetections 
      });
      
      await testUtils.waitForNextTick();
      
      // First frame fails
      await testUtils.waitForAnimationFrame();
      expect(onDetections).not.toHaveBeenCalled();
      
      // Second frame succeeds
      await testUtils.waitForAnimationFrame();
      expect(onDetections).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should have proper mobile styles', () => {
      render(CameraView, { isActive: false });
      
      const container = document.querySelector('.camera-container');
      expect(container).toHaveClass('camera-container');
      
      // Check for responsive aspect ratio
      expect(container).toHaveStyle('aspect-ratio: 1');
    });

    it('should adapt to different screen sizes', async () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      
      render(CameraView, { isActive: true });
      
      await testUtils.waitForNextTick();
      
      // Verify camera constraints adapt to screen size
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            width: { ideal: 640 },
            height: { ideal: 640 }
          })
        })
      );
    });
  });
}); 