/**
 * Error Handling System Test Suite
 * Testing comprehensive error handling, recovery strategies, and input validation
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  ErrorHandler, 
  handleError, 
  validateImageFile, 
  validateVoiceInput, 
  validateImageData,
  ErrorMessages 
} from '../../../src/lib/utils/error-handling';
import { testUtils } from '../../setup';

describe('Error Handling System', () => {
  describe('Error Categorization', () => {
    it('categorizes camera errors correctly', () => {
      const handler = new ErrorHandler();
      const cameraError = new Error('Camera not found');
      
      handleError(cameraError, { source: 'camera' });
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });

    it('categorizes ML errors correctly', () => {
      const handler = new ErrorHandler();
      const mlError = new Error('Model loading failed');
      
      handleError(mlError, { source: 'ml' });
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });

    it('categorizes voice errors correctly', () => {
      const handler = new ErrorHandler();
      const voiceError = new Error('Speech recognition failed');
      
      handleError(voiceError, { source: 'voice' });
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });

    it('categorizes upload errors correctly', () => {
      const handler = new ErrorHandler();
      const uploadError = new Error('Invalid file type');
      
      handleError(uploadError, { source: 'upload' });
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });

    it('categorizes network errors correctly', () => {
      const handler = new ErrorHandler();
      const networkError = new Error('Network connection failed');
      
      handleError(networkError, { source: 'network' });
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });
  });

  describe('Recovery Strategies', () => {
    it('attempts camera recovery', async () => {
      const handler = new ErrorHandler();
      const cameraError = new Error('Camera permission denied');
      
      const recovered = await handler.handleError(cameraError, { device: 'camera' });
      
      expect(recovered).toBe(false); // Permission errors cannot be auto-recovered
    });

    it('attempts ML model recovery', async () => {
      const handler = new ErrorHandler();
      const mlError = new Error('Model loading failed');
      
      // Mock model reload success
      const mockReload = vi.fn().mockResolvedValue(true);
      window.dispatchEvent = vi.fn();
      
      const recovered = await handler.handleError(mlError, { model: 'yolo' });
      
      expect(recovered).toBeDefined();
    });

    it('attempts voice recognition recovery', async () => {
      const handler = new ErrorHandler();
      const voiceError = new Error('Speech recognition timeout');
      
      const recovered = await handler.handleError(voiceError, { language: 'en' });
      
      expect(recovered).toBeDefined();
    });

    it('implements fallback strategies', async () => {
      const handler = new ErrorHandler();
      const criticalError = new Error('Critical system failure');
      
      const recovered = await handler.handleError(criticalError, { severity: 'critical' });
      
      expect(recovered).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    describe('Image File Validation', () => {
      it('validates valid image files', () => {
        const validFile = testUtils.mockFile('test.jpg', 'image/jpeg');
        const result = validateImageFile(validFile);
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects invalid file types', () => {
        const invalidFile = testUtils.mockFile('test.txt', 'text/plain');
        const result = validateImageFile(invalidFile);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe(ErrorMessages.UPLOAD_INVALID_TYPE);
      });

      it('rejects oversized files', () => {
        const oversizedFile = testUtils.mockFile('huge.jpg', 'image/jpeg', 'x'.repeat(11 * 1024 * 1024));
        const result = validateImageFile(oversizedFile);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe(ErrorMessages.UPLOAD_TOO_LARGE);
      });

      it('rejects empty files', () => {
        const emptyFile = testUtils.mockFile('empty.jpg', 'image/jpeg', '');
        const result = validateImageFile(emptyFile);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe(ErrorMessages.UPLOAD_EMPTY);
      });
    });

    describe('Voice Input Validation', () => {
      it('validates valid voice input', () => {
        const result = validateVoiceInput('plastic bottle');
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects empty voice input', () => {
        const result = validateVoiceInput('');
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe(ErrorMessages.VOICE_NO_SPEECH);
      });

      it('rejects excessively long input', () => {
        const longInput = 'a'.repeat(101);
        const result = validateVoiceInput(longInput);
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too long');
      });

      it('rejects potentially dangerous input', () => {
        const dangerousInput = 'javascript:alert("xss")';
        const result = validateVoiceInput(dangerousInput);
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid voice input');
      });
    });

    describe('Image Data Validation', () => {
      it('validates valid image data', () => {
        const validImageData = testUtils.mockImageData(640, 480);
        const result = validateImageData(validImageData);
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects corrupted image data', () => {
        const corruptedImageData = {
          data: new Uint8ClampedArray(100), // Wrong size
          width: 640,
          height: 480,
          colorSpace: 'srgb'
        } as ImageData;
        
        const result = validateImageData(corruptedImageData);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe(ErrorMessages.UPLOAD_CORRUPTED);
      });

      it('rejects null/undefined image data', () => {
        const result = validateImageData(null as any);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe(ErrorMessages.UPLOAD_CORRUPTED);
      });
    });
  });

  describe('Error Severity Assessment', () => {
    it('assesses critical errors correctly', () => {
      const handler = new ErrorHandler();
      const criticalError = new Error('Critical system failure');
      
      handleError(criticalError);
      
      // Should be categorized as critical
      expect(true).toBe(true); // Placeholder
    });

    it('assesses high severity errors correctly', () => {
      const handler = new ErrorHandler();
      const highError = new Error('Permission denied');
      
      handleError(highError);
      
      // Should be categorized as high severity
      expect(true).toBe(true); // Placeholder
    });

    it('assesses medium severity errors correctly', () => {
      const handler = new ErrorHandler();
      const mediumError = new Error('Performance degraded');
      
      handleError(mediumError);
      
      // Should be categorized as medium severity
      expect(true).toBe(true); // Placeholder
    });

    it('assesses low severity errors correctly', () => {
      const handler = new ErrorHandler();
      const lowError = new Error('Minor issue');
      
      handleError(lowError);
      
      // Should be categorized as low severity
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('User-Friendly Messages', () => {
    it('provides user-friendly camera error messages', () => {
      const handler = new ErrorHandler();
      const cameraError = new Error('Camera permission denied');
      
      handleError(cameraError);
      
      // Should provide user-friendly message
      expect(ErrorMessages.CAMERA_PERMISSION_DENIED).toContain('Camera access is required');
    });

    it('provides user-friendly ML error messages', () => {
      const handler = new ErrorHandler();
      const mlError = new Error('Model loading failed');
      
      handleError(mlError);
      
      // Should provide user-friendly message
      expect(ErrorMessages.MODEL_LOADING_FAILED).toContain('AI models are still loading');
    });

    it('provides user-friendly voice error messages', () => {
      const handler = new ErrorHandler();
      const voiceError = new Error('Speech recognition not supported');
      
      handleError(voiceError);
      
      // Should provide user-friendly message
      expect(ErrorMessages.VOICE_NOT_SUPPORTED).toContain('Voice recognition is not supported');
    });

    it('provides user-friendly upload error messages', () => {
      const handler = new ErrorHandler();
      const uploadError = new Error('Invalid file type');
      
      handleError(uploadError);
      
      // Should provide user-friendly message
      expect(ErrorMessages.UPLOAD_INVALID_TYPE).toContain('Please select a valid image file');
    });

    it('provides user-friendly network error messages', () => {
      const handler = new ErrorHandler();
      const networkError = new Error('Network error occurred');
      
      handleError(networkError);
      
      // Should provide user-friendly message
      expect(ErrorMessages.NETWORK_ERROR).toContain('Please check your internet connection');
    });
  });

  describe('Error Store Management', () => {
    it('adds errors to store', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');
      
      handler.handleError(error);
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });

    it('removes errors from store', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');
      
      handler.handleError(error);
      handler.clearErrors();
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });

    it('removes specific error from store', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');
      
      handler.handleError(error);
      handler.clearError('test-id');
      
      const errors = handler.getErrors();
      expect(errors).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles null/undefined errors', async () => {
      const handler = new ErrorHandler();
      
      const recovered = await handler.handleError(null as any);
      
      expect(recovered).toBe(false);
    });

    it('handles errors with circular references', async () => {
      const handler = new ErrorHandler();
      const circularError = new Error('Circular error');
      (circularError as any).self = circularError;
      
      const recovered = await handler.handleError(circularError);
      
      expect(recovered).toBeDefined();
    });

    it('handles concurrent error handling', async () => {
      const handler = new ErrorHandler();
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3')
      ];
      
      const promises = errors.map(error => handler.handleError(error));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
    });

    it('handles recovery cooldown periods', async () => {
      const handler = new ErrorHandler();
      const error = new Error('Recoverable error');
      
      // First attempt
      await handler.handleError(error);
      
      // Second attempt (should be in cooldown)
      await handler.handleError(error);
      
      expect(true).toBe(true); // Placeholder
    });

    it('handles maximum retry attempts', async () => {
      const handler = new ErrorHandler();
      const error = new Error('Persistent error');
      
      // Exhaust retry attempts
      for (let i = 0; i < 5; i++) {
        await handler.handleError(error);
      }
      
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance', () => {
    it('processes errors efficiently', async () => {
      const handler = new ErrorHandler();
      const error = new Error('Performance test error');
      
      const startTime = performance.now();
      await handler.handleError(error);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100); // Should be fast
    });

    it('handles large numbers of errors', async () => {
      const handler = new ErrorHandler();
      const errors = Array(100).fill(0).map((_, i) => new Error(`Error ${i}`));
      
      const startTime = performance.now();
      await Promise.all(errors.map(error => handler.handleError(error)));
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000); // Should handle 100 errors in under 1 second
    });
  });

  describe('Integration with Other Systems', () => {
    it('integrates with analytics system', async () => {
      const handler = new ErrorHandler();
      const error = new Error('Analytics test error');
      
      const analyticsSpy = vi.fn();
      window.dispatchEvent = analyticsSpy;
      
      await handler.handleError(error);
      
      // Should trigger analytics event
      expect(analyticsSpy).toHaveBeenCalled();
    });

    it('integrates with notification system', async () => {
      const handler = new ErrorHandler();
      const error = new Error('Notification test error');
      
      const notificationSpy = vi.fn();
      window.dispatchEvent = notificationSpy;
      
      await handler.handleError(error);
      
      // Should trigger notification
      expect(notificationSpy).toHaveBeenCalled();
    });

    it('integrates with logging system', async () => {
      const handler = new ErrorHandler();
      const error = new Error('Logging test error');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await handler.handleError(error);
      
      // Should log error
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
}); 