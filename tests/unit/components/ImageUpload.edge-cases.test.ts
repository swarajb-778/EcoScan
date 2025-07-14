import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ImageUpload from '$lib/components/ImageUpload.svelte';
import { ObjectDetector } from '$lib/ml/detector.js';

// Mock file creation utilities
const createMockFile = (name: string, type: string, size: number, content?: ArrayBuffer | string): File => {
  const fileContent = content || new ArrayBuffer(size);
  const file = new File([fileContent], name, { type });
  Object.defineProperty(file, 'size', { value: size, writable: false });
  return file;
};

const createImageFile = (width: number, height: number, format: string = 'jpeg'): File => {
  // Create minimal valid image headers
  const headers = {
    jpeg: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
    png: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    gif: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    webp: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    bmp: new Uint8Array([0x42, 0x4D])
  };

  const header = headers[format as keyof typeof headers] || headers.jpeg;
  const padding = new Uint8Array(Math.max(0, 1024 - header.length));
  const content = new Uint8Array([...header, ...padding]);
  
  return new File([content], `test.${format}`, { type: `image/${format}` });
};

const createCorruptedImageFile = (name: string, type: string): File => {
  // Incomplete or corrupted header
  const corruptedData = new Uint8Array([0xFF, 0xD8, 0x00, 0x00]); // Incomplete JPEG
  return new File([corruptedData], name, { type });
};

// Mock ObjectDetector
vi.mock('$lib/ml/detector.js', () => ({
  ObjectDetector: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    detect: vi.fn().mockResolvedValue([]),
    dispose: vi.fn()
  }))
}));

describe('ImageUpload Edge Cases Tests', () => {
  beforeEach(() => {
    // Mock browser APIs
    global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock File Reader
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsDataURL: vi.fn(),
      readAsArrayBuffer: vi.fn(),
      result: null,
      error: null,
      onload: null,
      onerror: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    // Mock Image constructor
    global.Image = vi.fn().mockImplementation(() => ({
      onload: null,
      onerror: null,
      src: '',
      width: 0,
      height: 0,
      naturalWidth: 1920,
      naturalHeight: 1080,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    // Mock Canvas
    global.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(1920 * 1080 * 4),
        width: 1920,
        height: 1080
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) }))
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('File Type Edge Cases', () => {
    it('should reject executable files disguised as images', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const maliciousFiles = [
        createMockFile('virus.jpg.exe', 'image/jpeg', 1024),
        createMockFile('malware.png.scr', 'image/png', 2048),
        createMockFile('trojan.gif.bat', 'image/gif', 1536),
        createMockFile('spyware.webp.com', 'image/webp', 1024)
      ];

      for (const file of maliciousFiles) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        fireEvent.drop(dropZone, { dataTransfer });

        await waitFor(() => {
          expect(screen.getByText(/potentially dangerous file/i)).toBeInTheDocument();
        });
      }
    });

    it('should reject files with null bytes in filename', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const nullByteFile = createMockFile('image\x00.jpg.exe', 'image/jpeg', 1024);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(nullByteFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/invalid filename/i)).toBeInTheDocument();
      });
    });

    it('should reject files with path traversal attempts', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const traversalFiles = [
        createMockFile('../../../etc/passwd.jpg', 'image/jpeg', 1024),
        createMockFile('..\\..\\windows\\system32\\image.png', 'image/png', 1024),
        createMockFile('./../../config/secrets.gif', 'image/gif', 1024)
      ];

      for (const file of traversalFiles) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        fireEvent.drop(dropZone, { dataTransfer });

        await waitFor(() => {
          expect(screen.getByText(/invalid file path/i)).toBeInTheDocument();
        });
      }
    });

    it('should handle files with extremely long names', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const longName = 'a'.repeat(1000) + '.jpg';
      const longNameFile = createMockFile(longName, 'image/jpeg', 1024);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(longNameFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/filename too long/i)).toBeInTheDocument();
      });
    });

    it('should reject SVG files with embedded scripts', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const maliciousSVG = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('xss')</script>
          <rect width="100" height="100"/>
        </svg>
      `;
      const svgFile = createMockFile('image.svg', 'image/svg+xml', maliciousSVG.length, maliciousSVG);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(svgFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/svg files not allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Size Edge Cases', () => {
    it('should handle files exactly at size limit', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const exactLimitFile = createImageFile(1920, 1080);
      Object.defineProperty(exactLimitFile, 'size', { value: 10 * 1024 * 1024 }); // Exactly 10MB

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(exactLimitFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.queryByText(/file too large/i)).not.toBeInTheDocument();
      });
    });

    it('should handle files one byte over limit', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const overLimitFile = createImageFile(1920, 1080);
      Object.defineProperty(overLimitFile, 'size', { value: 10 * 1024 * 1024 + 1 }); // 1 byte over

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(overLimitFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });

    it('should handle zero-byte files', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const emptyFile = createMockFile('empty.jpg', 'image/jpeg', 0);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(emptyFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/file is empty/i)).toBeInTheDocument();
      });
    });

    it('should handle extremely large files gracefully', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const hugeFile = createImageFile(1920, 1080);
      Object.defineProperty(hugeFile, 'size', { value: 1024 * 1024 * 1024 }); // 1GB

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(hugeFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/file extremely large/i)).toBeInTheDocument();
      });
    });
  });

  describe('Image Content Edge Cases', () => {
    it('should handle corrupted image headers', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const corruptedFile = createCorruptedImageFile('corrupted.jpg', 'image/jpeg');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(corruptedFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/corrupted image file/i)).toBeInTheDocument();
      });
    });

    it('should handle images with invalid dimensions', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock Image with invalid dimensions
      global.Image = vi.fn().mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: '',
        width: 0,
        height: 0,
        naturalWidth: 0,
        naturalHeight: 0,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => handler(), 10);
          }
        })
      }));

      const invalidDimensionFile = createImageFile(0, 0);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(invalidDimensionFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/invalid image dimensions/i)).toBeInTheDocument();
      });
    });

    it('should handle images with extreme aspect ratios', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock Image with extreme aspect ratio
      global.Image = vi.fn().mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: '',
        naturalWidth: 10000,
        naturalHeight: 1,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => handler(), 10);
          }
        })
      }));

      const extremeAspectFile = createImageFile(10000, 1);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(extremeAspectFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/unusual image dimensions/i)).toBeInTheDocument();
      });
    });

    it('should handle images that fail to load', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock Image that fails to load
      global.Image = vi.fn().mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: '',
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(), 10);
          }
        })
      }));

      const failingFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(failingFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/failed to load image/i)).toBeInTheDocument();
      });
    });

    it('should handle images with unsupported color profiles', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Simulate image with CMYK color profile
      const cmykImage = createImageFile(1920, 1080);
      
      // Mock FileReader to simulate CMYK detection
      global.FileReader = vi.fn().mockImplementation(() => ({
        readAsArrayBuffer: vi.fn(),
        result: new ArrayBuffer(1024),
        onload: null,
        onerror: null,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            // Simulate CMYK color profile in result
            setTimeout(() => handler(), 10);
          }
        })
      }));

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(cmykImage);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/color profile not supported/i)).toBeInTheDocument();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle memory pressure during image processing', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 500 * 1024 * 1024, // 500MB
          totalJSHeapSize: 512 * 1024 * 1024,
          jsHeapSizeLimit: 512 * 1024 * 1024
        }
      });

      const largeFile = createImageFile(4000, 3000);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(largeFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/memory pressure detected/i)).toBeInTheDocument();
      });
    });

    it('should handle canvas creation failures', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock canvas context creation failure
      global.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/canvas not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle slow image processing', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock slow ML detection
      const mockDetector = new ObjectDetector({} as any);
      vi.mocked(mockDetector.detect).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 10000))
      );

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/processing may take a moment/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent file processing', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const files = [
        createImageFile(1920, 1080, 'jpeg'),
        createImageFile(1920, 1080, 'png'),
        createImageFile(1920, 1080, 'webp'),
        createImageFile(1920, 1080, 'gif')
      ];

      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/processing multiple files/i)).toBeInTheDocument();
      });
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle browsers without File API support', async () => {
      delete (global as any).FileReader;

      render(ImageUpload);

      await waitFor(() => {
        expect(screen.getByText(/file upload not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle browsers without Canvas support', async () => {
      delete global.HTMLCanvasElement.prototype.getContext;

      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/image processing not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle browsers without Blob URL support', async () => {
      delete global.URL.createObjectURL;

      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/preview not available/i)).toBeInTheDocument();
      });
    });

    it('should handle autoplay policy restrictions', async () => {
      // Mock restrictive autoplay policy
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });

      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/processing paused/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle files with embedded malware signatures', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Create file with suspicious binary patterns
      const malwareSignature = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
        0x4D, 0x5A, 0x90, 0x00, // PE executable signature
        0x50, 0x4B, 0x03, 0x04  // ZIP signature
      ]);

      const suspiciousFile = new File([malwareSignature], 'image.jpg', { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(suspiciousFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/suspicious file content/i)).toBeInTheDocument();
      });
    });

    it('should handle polyglot files', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // File that's both a valid image and valid script
      const polyglotContent = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
        ...new TextEncoder().encode('<?php system($_GET["cmd"]); ?>'),
        0xFF, 0xD9 // JPEG footer
      ]);

      const polyglotFile = new File([polyglotContent], 'image.jpg', { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(polyglotFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/potentially dangerous content/i)).toBeInTheDocument();
      });
    });

    it('should handle files with EXIF data containing scripts', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock file with malicious EXIF data
      const exifScript = '<script>alert("xss")</script>';
      const imageWithExif = createImageFile(1920, 1080);

      // Mock FileReader to simulate EXIF reading
      global.FileReader = vi.fn().mockImplementation(() => ({
        readAsArrayBuffer: vi.fn(),
        result: new TextEncoder().encode(exifScript),
        onload: null,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => handler(), 10);
          }
        })
      }));

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageWithExif);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/malicious metadata detected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network and Connectivity Edge Cases', () => {
    it('should handle offline image processing', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/offline processing/i)).toBeInTheDocument();
      });
    });

    it('should handle slow network during processing', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      // Mock slow network by delaying ML processing
      const mockDetector = new ObjectDetector({} as any);
      vi.mocked(mockDetector.detect).mockImplementation(
        () => new Promise(resolve => {
          // Simulate network delay
          setTimeout(() => resolve([]), 5000);
        })
      );

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/network processing/i)).toBeInTheDocument();
      });
    });

    it('should handle network interruption during upload', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      // Simulate network disconnection
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/network connection lost/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Edge Cases', () => {
    it('should handle rapid consecutive uploads', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const files = Array(10).fill(null).map(() => createImageFile(1920, 1080));

      // Rapid successive drops
      for (const file of files) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fireEvent.drop(dropZone, { dataTransfer });
      }

      await waitFor(() => {
        expect(screen.getByText(/processing queue full/i)).toBeInTheDocument();
      });
    });

    it('should handle user cancellation during processing', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      // User clicks cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/processing cancelled/i)).toBeInTheDocument();
      });
    });

    it('should handle browser tab switching during processing', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });

      document.dispatchEvent(new Event('visibilitychange'));

      await waitFor(() => {
        expect(screen.getByText(/processing paused/i)).toBeInTheDocument();
      });
    });

    it('should handle window resize during upload', async () => {
      render(ImageUpload);
      const dropZone = screen.getByTestId('drop-zone');

      const imageFile = createImageFile(1920, 1080);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      fireEvent.drop(dropZone, { dataTransfer });

      // Simulate window resize
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
        // Component should remain functional after resize
      });
    });
  });
}); 