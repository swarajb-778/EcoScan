// tests/setup.ts - Comprehensive Test Setup
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock browser environment
const mockNavigator = {
  mediaDevices: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn()
  },
  permissions: {
    query: vi.fn()
  },
  userAgent: 'test-browser',
  platform: 'test-platform',
  language: 'en-US',
  onLine: true,
  cookieEnabled: true
};

const mockWindow = {
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  },
  AudioContext: vi.fn(),
  webkitAudioContext: vi.fn(),
  SpeechRecognition: vi.fn(),
  webkitSpeechRecognition: vi.fn(),
  performance: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000
    }
  },
  requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
  cancelAnimationFrame: vi.fn(),
  crypto: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
  }
};

// Global test setup
beforeAll(() => {
  // Set up DOM environment
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true
  });

  Object.defineProperty(global, 'window', {
    value: mockWindow,
    writable: true
  });

  // Mock canvas and WebGL context
  global.HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
    if (type === '2d') {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(640 * 640 * 4),
          width: 640,
          height: 640
        })),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn()
      } as any;
    }
    return null;
  }) as any;

  // Mock HTMLVideoElement
  Object.defineProperty(global.HTMLVideoElement.prototype, 'play', {
    value: vi.fn(() => Promise.resolve()),
    writable: true
  });

  Object.defineProperty(global.HTMLVideoElement.prototype, 'readyState', {
    value: 4, // HAVE_ENOUGH_DATA
    writable: true
  });

  console.log('🧪 Test environment initialized');
});

afterAll(() => {
  console.log('🧪 Test environment cleaned up');
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Reset mock implementations
  mockNavigator.mediaDevices.getUserMedia.mockResolvedValue({
    getTracks: vi.fn(() => [
      {
        stop: vi.fn(),
        getSettings: vi.fn(() => ({ width: 640, height: 640, frameRate: 30 }))
      }
    ])
  });

  mockNavigator.mediaDevices.enumerateDevices.mockResolvedValue([
    {
      deviceId: 'test-camera-1',
      label: 'Test Camera',
      kind: 'videoinput'
    }
  ]);

  mockNavigator.permissions.query.mockResolvedValue({ state: 'granted' });
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Test utilities
export const testUtils = {
  // Create mock image data
  createMockImageData: (width = 640, height = 640): ImageData => {
    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
      colorSpace: 'srgb'
    } as ImageData;
  },

  // Create mock video element
  createMockVideo: (): HTMLVideoElement => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 640 });
    Object.defineProperty(video, 'videoHeight', { value: 640 });
    Object.defineProperty(video, 'readyState', { value: 4 });
    return video;
  },

  // Create mock stream
  createMockStream: (): MediaStream => {
    return {
      getTracks: vi.fn(() => [
        {
          stop: vi.fn(),
          getSettings: vi.fn(() => ({ width: 640, height: 640 }))
        }
      ]),
      getVideoTracks: vi.fn(() => [
        {
          stop: vi.fn(),
          getSettings: vi.fn(() => ({ width: 640, height: 640 }))
        }
      ])
    } as any;
  },

  // Create mock detection result
  createMockDetection: (overrides = {}) => ({
    bbox: [100, 100, 200, 200],
    class: 'bottle',
    confidence: 0.85,
    category: 'recycle',
    ...overrides
  }),

  // Wait for next tick
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Wait for animation frame
  waitForAnimationFrame: () => new Promise(resolve => requestAnimationFrame(() => resolve(void 0))),

  // Mock file
  createMockFile: (name = 'test.jpg', type = 'image/jpeg', size = 1024): File => {
    const content = new Uint8Array(size);
    return new File([content], name, { type });
  }
};

// Export mock implementations for use in tests
export { mockNavigator, mockWindow }; 