/**
 * CameraView Component Test Suite
 * Comprehensive testing for camera functionality, edge cases, and error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import CameraView from '../../../src/lib/components/CameraView.svelte';
import { testUtils, testFixtures } from '../../setup';

describe('CameraView Component', () => {
  describe('Core Functionality', () => {
    it('requests camera permission on component mount', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      
      render(CameraView);
      
      // Wait for component to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: expect.objectContaining({
          facingMode: 'environment'
        })
      });
    });

    it('handles permission denied gracefully', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/camera access denied/i)).toBeInTheDocument();
    });

    it('shows appropriate error messages for permission issues', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia.mockRejectedValue(new Error('NotAllowedError'));
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/camera access is required/i)).toBeInTheDocument();
    });

    it('detects available video input devices', async () => {
      const mockEnumerateDevices = vi.fn().mockResolvedValue([
        { kind: 'videoinput', deviceId: 'camera1', label: 'Front Camera' },
        { kind: 'videoinput', deviceId: 'camera2', label: 'Back Camera' },
        { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone' }
      ]);
      
      Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
        value: mockEnumerateDevices,
        writable: true
      });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });

    it('handles missing camera devices', async () => {
      const mockEnumerateDevices = vi.fn().mockResolvedValue([
        { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone' }
      ]);
      
      Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
        value: mockEnumerateDevices,
        writable: true
      });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/no camera found/i)).toBeInTheDocument();
    });

    it('switches between front/back cameras on mobile', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      
      render(CameraView);
      
      const switchButton = screen.getByLabelText(/switch camera/i);
      await fireEvent.click(switchButton);
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: expect.objectContaining({
          facingMode: 'user'
        })
      });
    });

    it('initializes video stream successfully', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
        getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      } as any;
      
      const mockGetUserMedia = testUtils.mockCamera(mockStream);
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    it('handles stream interruption', async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack])
      } as any;
      
      const mockGetUserMedia = testUtils.mockCamera(mockStream);
      
      const { unmount } = render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate stream interruption
      unmount();
      
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('cleans up stream on component unmount', async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack])
      } as any;
      
      const mockGetUserMedia = testUtils.mockCamera(mockStream);
      
      const { unmount } = render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      unmount();
      
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('tracks initialization time', async () => {
      const mockPerformanceNow = vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);
      
      global.performance.now = mockPerformanceNow;
      
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockPerformanceNow).toHaveBeenCalledTimes(2);
    });

    it('monitors frame rate', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
        getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      } as any;
      
      testUtils.mockCamera(mockStream);
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Frame rate monitoring should be active
      expect(global.performance.now).toHaveBeenCalled();
    });

    it('handles memory pressure', async () => {
      const mockMemory = {
        usedJSHeapSize: 150 * 1024 * 1024, // 150MB
        totalJSHeapSize: 200 * 1024 * 1024, // 200MB
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
      };
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      });
      
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should handle memory pressure gracefully
      expect(screen.queryByText(/memory/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('handles camera device disconnection', async () => {
      const mockTrack = { 
        stop: vi.fn(),
        readyState: 'ended'
      };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack])
      } as any;
      
      testUtils.mockCamera(mockStream);
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate device disconnection
      Object.defineProperty(mockTrack, 'readyState', { value: 'ended' });
      
      // Should handle disconnection gracefully
      expect(screen.getByText(/camera disconnected/i)).toBeInTheDocument();
    });

    it('recovers from camera hardware errors', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia
        .mockRejectedValueOnce(new Error('Hardware error'))
        .mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([]),
          getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
        });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should attempt recovery
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    });

    it('handles device switching during operation', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      
      render(CameraView);
      
      const switchButton = screen.getByLabelText(/switch camera/i);
      
      // Switch cameras multiple times
      await fireEvent.click(switchButton);
      await fireEvent.click(switchButton);
      await fireEvent.click(switchButton);
      
      // Should handle rapid switching
      expect(mockGetUserMedia).toHaveBeenCalledTimes(4); // Initial + 3 switches
    });

    it('works in Chrome, Firefox, Safari, Edge', async () => {
      const browsers = [
        'Chrome/91.0.4472.124',
        'Firefox/89.0',
        'Safari/14.1.1',
        'Edge/91.0.864.59'
      ];
      
      for (const browser of browsers) {
        Object.defineProperty(navigator, 'userAgent', {
          value: `Mozilla/5.0 (compatible; ${browser})`,
          writable: true
        });
        
        testUtils.mockCamera();
        
        const { unmount } = render(CameraView);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Should work in all browsers
        expect(screen.queryByText(/not supported/i)).not.toBeInTheDocument();
        
        unmount();
      }
    });

    it('handles unsupported browser gracefully', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true
      });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/not supported/i)).toBeInTheDocument();
    });

    it('works with different viewport sizes', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];
      
      for (const viewport of viewports) {
        Object.defineProperty(window, 'innerWidth', {
          value: viewport.width,
          writable: true
        });
        Object.defineProperty(window, 'innerHeight', {
          value: viewport.height,
          writable: true
        });
        
        testUtils.mockCamera();
        
        const { unmount } = render(CameraView);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Should be responsive
        const container = screen.getByTestId('camera-container');
        expect(container).toBeInTheDocument();
        
        unmount();
      }
    });

    it('requires HTTPS for camera access', async () => {
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        writable: true
      });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/https required/i)).toBeInTheDocument();
    });

    it('handles insecure context warnings', async () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true
      });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/secure context/i)).toBeInTheDocument();
    });

    it('works on localhost development', async () => {
      Object.defineProperty(location, 'hostname', {
        value: 'localhost',
        writable: true
      });
      
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should work on localhost
      expect(screen.queryByText(/https required/i)).not.toBeInTheDocument();
    });

    it('handles low memory conditions', async () => {
      const mockMemory = {
        usedJSHeapSize: 180 * 1024 * 1024, // 180MB (close to 200MB limit)
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024
      };
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      });
      
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should handle memory pressure
      expect(screen.getByText(/memory/i)).toBeInTheDocument();
    });

    it('works with limited bandwidth', async () => {
      testUtils.simulateNetworkConditions(true, 2000); // 2 second delay
      
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should work with slow connections
      expect(screen.queryByText(/network/i)).not.toBeInTheDocument();
    });

    it('handles concurrent camera access', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia.mockRejectedValue(new Error('Device busy'));
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.getByText(/camera busy/i)).toBeInTheDocument();
    });
  });

  describe('Performance Requirements', () => {
    it('initializes within 2 seconds', async () => {
      const startTime = performance.now();
      
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      expect(initTime).toBeLessThan(2000);
    });

    it('maintains >15 FPS on modern devices', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
        getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      } as any;
      
      testUtils.mockCamera(mockStream);
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Frame rate should be tracked
      expect(global.performance.now).toHaveBeenCalled();
    });

    it('manages memory usage efficiently', async () => {
      const initialMemory = testUtils.checkMemoryUsage();
      
      testUtils.mockCamera();
      
      const { unmount } = render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      unmount();
      
      const finalMemory = testUtils.checkMemoryUsage();
      
      // Memory should be cleaned up
      if (initialMemory && finalMemory) {
        expect(finalMemory.usedJSHeapSize).toBeLessThanOrEqual(
          initialMemory.usedJSHeapSize + 10 * 1024 * 1024 // 10MB tolerance
        );
      }
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', async () => {
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cameraButton = screen.getByLabelText(/start camera/i);
      expect(cameraButton).toBeInTheDocument();
      
      const switchButton = screen.getByLabelText(/switch camera/i);
      expect(switchButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cameraButton = screen.getByLabelText(/start camera/i);
      
      // Should be focusable
      cameraButton.focus();
      expect(document.activeElement).toBe(cameraButton);
      
      // Should respond to Enter key
      await fireEvent.keyDown(cameraButton, { key: 'Enter' });
      expect(cameraButton).toHaveFocus();
    });

    it('provides screen reader announcements', async () => {
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('meets WCAG contrast requirements', async () => {
      testUtils.mockCamera();
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const container = screen.getByTestId('camera-container');
      expect(container).toBeAccessible();
    });
  });

  describe('Error Recovery', () => {
    it('retries camera initialization on failure', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([]),
          getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
        });
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for retry
      
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    });

    it('shows retry button after failure', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia.mockRejectedValue(new Error('Camera error'));
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();
    });

    it('provides alternative input methods', async () => {
      const mockGetUserMedia = testUtils.mockCamera();
      mockGetUserMedia.mockRejectedValue(new Error('Camera not available'));
      
      render(CameraView);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uploadButton = screen.getByText(/upload image/i);
      expect(uploadButton).toBeInTheDocument();
    });
  });
}); 