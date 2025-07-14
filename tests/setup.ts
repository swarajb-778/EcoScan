/**
 * EcoScan Test Setup and Configuration
 * Comprehensive testing utilities for all features
 */

import { vi, expect, beforeEach, afterEach } from 'vitest';
import { render, type RenderResult } from '@testing-library/svelte';
import { writable } from 'svelte/store';

// Mock browser environment
global.window = Object.create(window);
global.document = Object.create(document);
global.navigator = Object.create(navigator);

// Mock Web APIs
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock Speech Recognition
global.SpeechRecognition = vi.fn();
global.webkitSpeechRecognition = vi.fn();

// Mock ONNX Runtime
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(),
  },
  Tensor: vi.fn(),
  env: {
    wasm: {
      wasmPaths: '/models/',
    },
  },
}));

// Mock Performance API
global.performance = {
  ...performance,
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
};

// Test utilities
export const testUtils = {
  // Mock implementations
  mockCamera: (mockStream: MediaStream | null = null) => {
    const getUserMedia = vi.fn();
    if (mockStream) {
      getUserMedia.mockResolvedValue(mockStream);
    } else {
      getUserMedia.mockRejectedValue(new Error('Camera not available'));
    }
    
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(getUserMedia);
    return getUserMedia;
  },

  mockSpeechRecognition: (mockResults: any[] = []) => {
    const MockSpeechRecognition = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
      continuous: false,
      interimResults: false,
      lang: 'en-US',
    }));
    
    global.SpeechRecognition = MockSpeechRecognition;
    global.webkitSpeechRecognition = MockSpeechRecognition;
    
    return MockSpeechRecognition;
  },

  mockONNXSession: (mockOutput: any = null) => {
    const mockSession = {
      run: vi.fn(),
      release: vi.fn(),
    };
    
    if (mockOutput) {
      mockSession.run.mockResolvedValue(mockOutput);
    }
    
    return mockSession;
  },

  mockImageData: (width: number = 640, height: number = 480): ImageData => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // Red
      data[i + 1] = 255; // Green
      data[i + 2] = 255; // Blue
      data[i + 3] = 255; // Alpha
    }
    return { data, width, height, colorSpace: 'srgb' };
  },

  mockCanvas: () => {
    const canvas = document.createElement('canvas');
    const ctx = {
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setTransform: vi.fn(),
      transform: vi.fn(),
      createImageData: vi.fn(),
      getContext: vi.fn(),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='),
    };
    
    canvas.getContext = vi.fn(() => ctx as any);
    return { canvas, ctx };
  },

  mockFile: (name: string, type: string, content: string = 'test content'): File => {
    const blob = new Blob([content], { type });
    const file = new File([blob], name, { type });
    return file;
  },

  mockFileReader: (result: string | ArrayBuffer | null = null) => {
    const reader = {
      readAsDataURL: vi.fn(),
      readAsArrayBuffer: vi.fn(),
      readAsText: vi.fn(),
      onload: null,
      onerror: null,
      onprogress: null,
      result,
      error: null,
      readyState: 2, // DONE
    };
    
    // Simulate async read
    setTimeout(() => {
      if (reader.onload) {
        reader.onload({ target: reader } as any);
      }
    }, 0);
    
    return reader;
  },

  // Test data generators
  generateDetectionResult: (overrides: any = {}) => ({
    bbox: [100, 100, 200, 200],
    class: 'plastic_bottle',
    confidence: 0.95,
    category: 'recycle',
    ...overrides,
  }),

  generateVoiceResult: (transcript: string = 'plastic bottle', confidence: number = 0.9) => ({
    results: [[{
      transcript,
      confidence,
      isFinal: true,
    }]],
  }),

  generateImageUploadEvent: (file: File) => ({
    target: {
      files: [file],
    },
  }),

  // Performance testing utilities
  measurePerformance: async (fn: () => Promise<any>) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },

  // Network simulation
  simulateNetworkConditions: (online: boolean = true, delay: number = 0) => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: online,
    });
    
    if (delay > 0) {
      // Mock fetch with delay
      const originalFetch = global.fetch;
      global.fetch = vi.fn(async (...args) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return originalFetch(...args);
      });
    }
  },

  // Component testing utilities
  renderWithProviders: (component: any, props: any = {}) => {
    // Mock stores
    const mockStores = {
      isLoading: writable(false),
      error: writable(null),
      detections: writable([]),
      voiceSupported: writable(true),
      isListening: writable(false),
      permissionsGranted: writable(false),
    };
    
    return render(component, { props, context: new Map(Object.entries(mockStores)) });
  },

  // Error simulation
  simulateError: (type: string, message: string) => {
    const error = new Error(message);
    error.name = type;
    return error;
  },

  // Wait utilities
  waitFor: (condition: () => boolean, timeout: number = 5000) => {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  // Accessibility testing
  checkAccessibility: (element: HTMLElement) => {
    const issues = [];
    
    // Check for alt text on images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt) {
        issues.push('Image missing alt text');
      }
    });
    
    // Check for button accessibility
    const buttons = element.querySelectorAll('button');
    buttons.forEach(button => {
      if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
        issues.push('Button missing accessible label');
      }
    });
    
    // Check for form labels
    const inputs = element.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const id = input.id;
      if (id && !element.querySelector(`label[for="${id}"]`)) {
        issues.push(`Form control missing label: ${id}`);
      }
    });
    
    return issues;
  },

  // Memory testing
  checkMemoryUsage: () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

// Test fixtures
export const testFixtures = {
  wasteItems: [
    {
      name: 'plastic_bottle',
      category: 'recycle',
      instructions: 'Remove cap and rinse',
      confidence: 0.95,
    },
    {
      name: 'apple_core',
      category: 'compost',
      instructions: 'Safe for home composting',
      confidence: 0.88,
    },
    {
      name: 'chip_bag',
      category: 'landfill',
      instructions: 'Not recyclable in most areas',
      confidence: 0.92,
    },
  ],

  detectionResults: [
    {
      bbox: [100, 100, 200, 200],
      class: 'plastic_bottle',
      confidence: 0.95,
      category: 'recycle',
    },
    {
      bbox: [300, 150, 400, 250],
      class: 'apple_core',
      confidence: 0.88,
      category: 'compost',
    },
  ],

  voiceTranscripts: [
    'plastic bottle',
    'apple core',
    'chip bag',
    'recycling bin',
    'compost bin',
  ],

  imageFiles: {
    validJPEG: new File(['jpeg content'], 'test.jpg', { type: 'image/jpeg' }),
    validPNG: new File(['png content'], 'test.png', { type: 'image/png' }),
    invalidFile: new File(['text content'], 'test.txt', { type: 'text/plain' }),
    oversizedFile: new File([new ArrayBuffer(10 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' }),
  },
};

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveValidDetection(received: any) {
    const pass = (
      received &&
      Array.isArray(received.bbox) &&
      received.bbox.length === 4 &&
      typeof received.class === 'string' &&
      typeof received.confidence === 'number' &&
      received.confidence >= 0 &&
      received.confidence <= 1
    );
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid detection`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid detection`,
        pass: false,
      };
    }
  },

  toBeAccessible(received: HTMLElement) {
    const issues = testUtils.checkAccessibility(received);
    const pass = issues.length === 0;
    
    if (pass) {
      return {
        message: () => `expected element to have accessibility issues`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to be accessible, but found issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Global test setup
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  
  // Reset navigator
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });
  
  // Reset performance
  vi.clearAllTimers();
});

afterEach(() => {
  // Cleanup
  vi.restoreAllMocks();
});

export default testUtils; 