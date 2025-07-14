import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ImageUpload from '$lib/components/ImageUpload.svelte';
import VoiceInput from '$lib/components/VoiceInput.svelte';
import CameraView from '$lib/components/CameraView.svelte';

// Mock file types for testing
const createMockFile = (name: string, type: string, size: number, content?: string): File => {
  const file = new File([content || 'mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createCorruptedFile = (name: string, type: string): File => {
  const corruptedContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // Incomplete JPEG header
  return new File([corruptedContent], name, { type });
};

const createMaliciousFile = (name: string, disguisedType: string): File => {
  const maliciousContent = '<script>alert("xss")</script>';
  return new File([maliciousContent], name, { type: disguisedType });
};

describe('Input Validation Tests', () => {
  beforeEach(() => {
    // Mock browser APIs
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn()
    } as any;

    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock Web Speech API
    global.SpeechRecognition = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    global.webkitSpeechRecognition = global.SpeechRecognition;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Image Upload Validation', () => {
    describe('File Type Validation', () => {
      it('should reject non-image files', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const wrongFiles = [
          createMockFile('document.pdf', 'application/pdf', 1024),
          createMockFile('archive.zip', 'application/zip', 2048),
          createMockFile('text.txt', 'text/plain', 512),
          createMockFile('script.js', 'application/javascript', 1024),
          createMockFile('data.json', 'application/json', 256)
        ];

        for (const file of wrongFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/file type not supported/i)).toBeTruthy();
          });
        }
      });

      it('should reject files with fake extensions', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const fakeFiles = [
          createMockFile('fake.jpg.exe', 'application/x-executable', 1024),
          createMockFile('image.png.bat', 'application/x-bat', 512),
          createMockFile('photo.gif.scr', 'application/x-screensaver', 2048)
        ];

        for (const file of fakeFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/potentially malicious file/i)).toBeTruthy();
          });
        }
      });

      it('should accept valid image formats', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const validFiles = [
          createMockFile('image.jpg', 'image/jpeg', 1024),
          createMockFile('photo.png', 'image/png', 2048),
          createMockFile('graphic.webp', 'image/webp', 1536),
          createMockFile('animation.gif', 'image/gif', 4096),
          createMockFile('bitmap.bmp', 'image/bmp', 8192)
        ];

        for (const file of validFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/file type not supported/i)).toBeFalsy();
          });
        }
      });
    });

    describe('File Size Validation', () => {
      it('should reject oversized files', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const oversizedFiles = [
          createMockFile('huge.jpg', 'image/jpeg', 50 * 1024 * 1024), // 50MB
          createMockFile('massive.png', 'image/png', 100 * 1024 * 1024), // 100MB
          createMockFile('enormous.gif', 'image/gif', 200 * 1024 * 1024) // 200MB
        ];

        for (const file of oversizedFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/file too large/i)).toBeTruthy();
          });
        }
      });

      it('should reject empty files', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const emptyFile = createMockFile('empty.jpg', 'image/jpeg', 0);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(emptyFile);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          expect(screen.queryByText(/invalid file/i)).toBeTruthy();
        });
      });

      it('should accept appropriately sized files', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const appropriateFiles = [
          createMockFile('small.jpg', 'image/jpeg', 100 * 1024), // 100KB
          createMockFile('medium.png', 'image/png', 2 * 1024 * 1024), // 2MB
          createMockFile('large.webp', 'image/webp', 8 * 1024 * 1024) // 8MB
        ];

        for (const file of appropriateFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/file too large/i)).toBeFalsy();
          });
        }
      });
    });

    describe('File Content Validation', () => {
      it('should handle corrupted image files', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const corruptedFiles = [
          createCorruptedFile('corrupted.jpg', 'image/jpeg'),
          createCorruptedFile('broken.png', 'image/png'),
          createCorruptedFile('damaged.gif', 'image/gif')
        ];

        for (const file of corruptedFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/unable to process image/i)).toBeTruthy();
          });
        }
      });

      it('should detect malicious content in disguised files', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const maliciousFiles = [
          createMaliciousFile('script.jpg', 'image/jpeg'),
          createMaliciousFile('xss.png', 'image/png'),
          createMaliciousFile('payload.gif', 'image/gif')
        ];

        for (const file of maliciousFiles) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          fireEvent.drop(fileInput, {
            dataTransfer
          });

          await waitFor(() => {
            expect(screen.queryByText(/file type not allowed/i)).toBeTruthy();
          });
        }
      });

      it('should handle files with missing or invalid headers', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        // Create file with wrong content type
        const invalidContent = 'This is not an image';
        const invalidFile = new File([invalidContent], 'fake-image.jpg', { type: 'image/jpeg' });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(invalidFile);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          expect(screen.queryByText(/invalid image data/i)).toBeTruthy();
        });
      });
    });

    describe('Batch Upload Validation', () => {
      it('should handle multiple file uploads with mixed validity', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const mixedFiles = [
          createMockFile('valid.jpg', 'image/jpeg', 1024),
          createMockFile('invalid.pdf', 'application/pdf', 1024),
          createMockFile('oversized.png', 'image/png', 50 * 1024 * 1024),
          createMockFile('valid2.webp', 'image/webp', 2048)
        ];

        const dataTransfer = new DataTransfer();
        mixedFiles.forEach(file => dataTransfer.items.add(file));

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          // Should process valid files and show errors for invalid ones
          expect(screen.queryByText(/some files could not be processed/i)).toBeTruthy();
        });
      });

      it('should respect maximum batch size limits', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const tooManyFiles = Array(20).fill(null).map((_, i) =>
          createMockFile(`image${i}.jpg`, 'image/jpeg', 1024)
        );

        const dataTransfer = new DataTransfer();
        tooManyFiles.forEach(file => dataTransfer.items.add(file));

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          expect(screen.queryByText(/too many files/i)).toBeTruthy();
        });
      });
    });
  });

  describe('Voice Input Validation', () => {
    describe('Audio Quality Validation', () => {
      it('should handle no microphone access', async () => {
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
          new Error('Permission denied')
        );

        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        await waitFor(() => {
          expect(screen.queryByText(/microphone access required/i)).toBeTruthy();
        });
      });

      it('should handle unclear speech input', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        // Simulate unclear speech result
        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        // Simulate low confidence result
        const unclearEvent = {
          results: [{
            0: { transcript: 'mumblemumble', confidence: 0.1 },
            isFinal: true
          }]
        };

        recognitionInstance.onresult(unclearEvent);

        await waitFor(() => {
          expect(screen.queryByText(/could not understand/i)).toBeTruthy();
        });
      });

      it('should handle background noise interference', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        // Simulate noisy result
        const noisyEvent = {
          results: [{
            0: { transcript: 'plastic bottle noise static', confidence: 0.3 },
            isFinal: true
          }]
        };

        recognitionInstance.onresult(noisyEvent);

        await waitFor(() => {
          expect(screen.queryByText(/audio quality too low/i)).toBeTruthy();
        });
      });

      it('should handle silence timeout', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        // Simulate no speech detected
        recognitionInstance.onend();

        await waitFor(() => {
          expect(screen.queryByText(/no speech detected/i)).toBeTruthy();
        });
      });
    });

    describe('Content Validation', () => {
      it('should handle nonsensical input', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        const nonsenseInputs = [
          'qwerty asdfgh zxcvbn',
          'blah blah random words',
          'xkcd lorem ipsum dolor',
          '123 456 789 000'
        ];

        for (const input of nonsenseInputs) {
          const nonsenseEvent = {
            results: [{
              0: { transcript: input, confidence: 0.8 },
              isFinal: true
            }]
          };

          recognitionInstance.onresult(nonsenseEvent);

          await waitFor(() => {
            expect(screen.queryByText(/could not match to any item/i)).toBeTruthy();
          });
        }
      });

      it('should handle inappropriate language', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        const inappropriateEvent = {
          results: [{
            0: { transcript: 'bad words and profanity', confidence: 0.9 },
            isFinal: true
          }]
        };

        recognitionInstance.onresult(inappropriateEvent);

        await waitFor(() => {
          expect(screen.queryByText(/please use appropriate language/i)).toBeTruthy();
        });
      });

      it('should handle mixed language input', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        const mixedLanguageEvent = {
          results: [{
            0: { transcript: 'bottle bouteille Flasche', confidence: 0.7 },
            isFinal: true
          }]
        };

        recognitionInstance.onresult(mixedLanguageEvent);

        await waitFor(() => {
          expect(screen.queryByText(/language not supported/i)).toBeTruthy();
        });
      });

      it('should handle extremely long input', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        const longInput = 'plastic bottle '.repeat(100); // Very long input
        const longInputEvent = {
          results: [{
            0: { transcript: longInput, confidence: 0.8 },
            isFinal: true
          }]
        };

        recognitionInstance.onresult(longInputEvent);

        await waitFor(() => {
          expect(screen.queryByText(/input too long/i)).toBeTruthy();
        });
      });
    });

    describe('Browser Compatibility Validation', () => {
      it('should handle unsupported browser', async () => {
        delete (global as any).SpeechRecognition;
        delete (global as any).webkitSpeechRecognition;

        render(VoiceInput);

        await waitFor(() => {
          expect(screen.queryByText(/speech recognition not supported/i)).toBeTruthy();
        });
      });

      it('should provide fallback for unsupported features', async () => {
        // Mock partially supported browser
        global.SpeechRecognition = undefined as any;
        global.webkitSpeechRecognition = vi.fn().mockImplementation(() => {
          throw new Error('Not supported');
        });

        render(VoiceInput);

        await waitFor(() => {
          expect(screen.queryByText(/text input/i)).toBeTruthy(); // Fallback option
        });
      });
    });
  });

  describe('Camera Input Validation', () => {
    describe('Hardware Validation', () => {
      it('should handle no camera available', async () => {
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
          new Error('No camera found')
        );

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/no camera found/i)).toBeTruthy();
        });
      });

      it('should handle camera already in use', async () => {
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
          new Error('Camera busy')
        );

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/camera busy/i)).toBeTruthy();
        });
      });

      it('should handle camera permission denied', async () => {
        const permissionError = new Error('Permission denied');
        permissionError.name = 'NotAllowedError';
        
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(permissionError);

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/camera access denied/i)).toBeTruthy();
        });
      });

      it('should handle camera hardware errors', async () => {
        const hardwareError = new Error('Hardware error');
        hardwareError.name = 'NotReadableError';
        
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(hardwareError);

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/camera hardware error/i)).toBeTruthy();
        });
      });

      it('should handle camera disconnection during use', async () => {
        const mockStream = {
          getVideoTracks: vi.fn(() => [{
            stop: vi.fn(),
            addEventListener: vi.fn(),
            readyState: 'ended'
          }]),
          getTracks: vi.fn(() => [])
        };

        global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream as any);

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/camera disconnected/i)).toBeTruthy();
        });
      });
    });

    describe('Image Quality Validation', () => {
      it('should handle very dark images', async () => {
        const mockStream = {
          getVideoTracks: vi.fn(() => [{
            stop: vi.fn(),
            addEventListener: vi.fn(),
            readyState: 'live'
          }]),
          getTracks: vi.fn(() => [])
        };

        global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream as any);

        render(CameraView);

        // This would be tested through actual image analysis in real implementation
        await waitFor(() => {
          expect(screen.queryByText(/image too dark/i)).toBeTruthy();
        });
      });

      it('should handle blurry images', async () => {
        const mockStream = {
          getVideoTracks: vi.fn(() => [{
            stop: vi.fn(),
            addEventListener: vi.fn(),
            readyState: 'live'
          }]),
          getTracks: vi.fn(() => [])
        };

        global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream as any);

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/image quality poor/i)).toBeTruthy();
        });
      });

      it('should handle no objects visible', async () => {
        const mockStream = {
          getVideoTracks: vi.fn(() => [{
            stop: vi.fn(),
            addEventListener: vi.fn(),
            readyState: 'live'
          }]),
          getTracks: vi.fn(() => [])
        };

        global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream as any);

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/no objects detected/i)).toBeTruthy();
        });
      });
    });

    describe('Network and Performance Validation', () => {
      it('should handle offline conditions', async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/offline mode/i)).toBeTruthy();
        });
      });

      it('should handle memory pressure', async () => {
        // Mock memory pressure event
        const memoryPressureEvent = new CustomEvent('memory-pressure', {
          detail: { level: 'critical' }
        });

        render(CameraView);

        window.dispatchEvent(memoryPressureEvent);

        await waitFor(() => {
          expect(screen.queryByText(/memory optimization/i)).toBeTruthy();
        });
      });

      it('should handle slow performance', async () => {
        // Mock performance monitoring
        Object.defineProperty(performance, 'memory', {
          value: {
            usedJSHeapSize: 100 * 1024 * 1024, // 100MB
            totalJSHeapSize: 120 * 1024 * 1024,
            jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
          }
        });

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/performance optimization/i)).toBeTruthy();
        });
      });
    });
  });

  describe('Security Validation', () => {
    describe('XSS Prevention', () => {
      it('should sanitize file names', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const maliciousFileName = '<script>alert("xss")</script>.jpg';
        const xssFile = createMockFile(maliciousFileName, 'image/jpeg', 1024);

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(xssFile);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        // Should sanitize filename display
        await waitFor(() => {
          expect(screen.queryByText(/<script>/)).toBeFalsy();
        });
      });

      it('should prevent script injection in voice input', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.click(micButton);

        const mockSpeechRecognition = global.SpeechRecognition as any;
        const recognitionInstance = new mockSpeechRecognition();
        
        const xssEvent = {
          results: [{
            0: { transcript: '<script>alert("xss")</script> bottle', confidence: 0.8 },
            isFinal: true
          }]
        };

        recognitionInstance.onresult(xssEvent);

        // Should sanitize transcript display
        await waitFor(() => {
          expect(screen.queryByText(/<script>/)).toBeFalsy();
        });
      });
    });

    describe('File Security Validation', () => {
      it('should validate file headers against MIME types', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        // Create file with wrong header for declared MIME type
        const wrongHeader = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // ZIP header
        const spoofedFile = new File([wrongHeader], 'image.jpg', { type: 'image/jpeg' });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(spoofedFile);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          expect(screen.queryByText(/file validation failed/i)).toBeTruthy();
        });
      });

      it('should detect embedded scripts in images', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        // Mock image with embedded script
        const maliciousContent = new Uint8Array([
          0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
          ...new TextEncoder().encode('<script>malicious()</script>')
        ]);
        const maliciousImage = new File([maliciousContent], 'malicious.jpg', { type: 'image/jpeg' });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(maliciousImage);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          expect(screen.queryByText(/security threat detected/i)).toBeTruthy();
        });
      });
    });

    describe('Rate Limiting Validation', () => {
      it('should prevent spam uploads', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const spamFile = createMockFile('spam.jpg', 'image/jpeg', 1024);

        // Attempt rapid uploads
        for (let i = 0; i < 10; i++) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(spamFile);

          fireEvent.drop(fileInput, {
            dataTransfer
          });
        }

        await waitFor(() => {
          expect(screen.queryByText(/too many requests/i)).toBeTruthy();
        });
      });

      it('should prevent spam voice commands', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        // Rapid clicks
        for (let i = 0; i < 20; i++) {
          fireEvent.click(micButton);
        }

        await waitFor(() => {
          expect(screen.queryByText(/please wait before trying again/i)).toBeTruthy();
        });
      });
    });
  });

  describe('Accessibility Validation', () => {
    describe('Screen Reader Support', () => {
      it('should announce validation errors to screen readers', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const invalidFile = createMockFile('document.pdf', 'application/pdf', 1024);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(invalidFile);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          const errorMessage = screen.getByRole('alert');
          expect(errorMessage).toBeTruthy();
          expect(errorMessage).toHaveAttribute('aria-live', 'polite');
        });
      });

      it('should provide descriptive error messages', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
          new Error('Permission denied')
        );

        fireEvent.click(micButton);

        await waitFor(() => {
          const errorMessage = screen.getByText(/microphone access is required/i);
          expect(errorMessage).toBeTruthy();
        });
      });
    });

    describe('Keyboard Navigation', () => {
      it('should handle keyboard-only file selection', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        fireEvent.keyDown(fileInput, { key: 'Enter' });

        // Should trigger file selection dialog
        expect(fileInput).toHaveFocus();
      });

      it('should handle keyboard shortcuts for voice input', async () => {
        render(VoiceInput);
        const micButton = screen.getByRole('button', { name: /start recording/i });

        fireEvent.keyDown(micButton, { key: 'Space' });

        // Should start recording with spacebar
        expect(micButton).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  describe('Error Recovery Validation', () => {
    describe('Graceful Degradation', () => {
      it('should provide alternative when camera fails', async () => {
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
          new Error('Camera not available')
        );

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/try image upload instead/i)).toBeTruthy();
        });
      });

      it('should provide alternative when voice fails', async () => {
        delete (global as any).SpeechRecognition;
        delete (global as any).webkitSpeechRecognition;

        render(VoiceInput);

        await waitFor(() => {
          expect(screen.queryByText(/use text input instead/i)).toBeTruthy();
        });
      });

      it('should maintain functionality during partial failures', async () => {
        // Mock partial system failure
        global.navigator.mediaDevices.getUserMedia = vi.fn()
          .mockRejectedValueOnce(new Error('Camera busy'))
          .mockResolvedValue({
            getVideoTracks: () => [{ stop: vi.fn() }],
            getTracks: () => []
          } as any);

        render(CameraView);

        // Should attempt recovery
        await waitFor(() => {
          expect(screen.queryByText(/retrying camera access/i)).toBeTruthy();
        });
      });
    });

    describe('User Guidance', () => {
      it('should provide helpful error resolution steps', async () => {
        render(ImageUpload);
        const fileInput = screen.getByRole('button', { name: /upload/i });

        const oversizedFile = createMockFile('huge.jpg', 'image/jpeg', 50 * 1024 * 1024);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(oversizedFile);

        fireEvent.drop(fileInput, {
          dataTransfer
        });

        await waitFor(() => {
          expect(screen.queryByText(/try resizing the image/i)).toBeTruthy();
          expect(screen.queryByText(/maximum size is 10MB/i)).toBeTruthy();
        });
      });

      it('should suggest troubleshooting steps for camera issues', async () => {
        global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
          new Error('Permission denied')
        );

        render(CameraView);

        await waitFor(() => {
          expect(screen.queryByText(/check browser settings/i)).toBeTruthy();
          expect(screen.queryByText(/allow camera access/i)).toBeTruthy();
        });
      });
    });
  });
}); 