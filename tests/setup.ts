/**
 * Test Setup Configuration
 * 
 * Provides comprehensive test environment setup for all test types:
 * - Unit tests
 * - Integration tests
 * - E2E tests
 * - Browser environment mocking
 * - Performance testing utilities
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom';

// Global test configuration
beforeEach(() => {
  // Clean up DOM after each test
  cleanup();
  
  // Reset all mocks
  vi.clearAllMocks();
  
  // Setup browser environment
  setupBrowserEnvironment();
  
  // Setup console mocking
  setupConsoleMocking();
  
  // Setup performance monitoring
  setupPerformanceMonitoring();
});

afterEach(() => {
  // Additional cleanup
  cleanup();
  
  // Clear any timers
  vi.clearAllTimers();
  
  // Clear any intervals (note: vitest doesn't have clearAllIntervals)
  // This would be done by vi.useRealTimers() in real scenarios
  
  // Reset modules
  vi.resetModules();
});

/**
 * Setup browser environment for testing
 */
function setupBrowserEnvironment() {
  // Mock window object
  Object.defineProperty(global, 'window', {
    value: {
      ...global.window,
      location: {
        href: 'http://localhost:5173',
        origin: 'http://localhost:5173',
        protocol: 'http:',
        host: 'localhost:5173'
      },
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      sessionStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
      cancelAnimationFrame: vi.fn(),
      URL: {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn()
      }
    },
    configurable: true,
    writable: true
  });

  // Mock document object
  Object.defineProperty(global, 'document', {
    value: {
      ...global.document,
      createElement: vi.fn((tagName) => {
        const element = {
          tagName: tagName.toUpperCase(),
          style: {},
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          querySelector: vi.fn(),
          querySelectorAll: vi.fn(() => []),
          getAttribute: vi.fn(),
          setAttribute: vi.fn(),
          removeAttribute: vi.fn(),
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(),
            toggle: vi.fn()
          }
        };

        // Canvas-specific mocking
        if (tagName === 'canvas') {
          return {
            ...element,
            width: 640,
            height: 640,
            getContext: vi.fn(() => ({
              drawImage: vi.fn(),
              getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray(640 * 640 * 4),
                width: 640,
                height: 640
              })),
              putImageData: vi.fn(),
              clearRect: vi.fn(),
              fillRect: vi.fn(),
              strokeRect: vi.fn(),
              beginPath: vi.fn(),
              moveTo: vi.fn(),
              lineTo: vi.fn(),
              stroke: vi.fn(),
              fill: vi.fn()
            })),
            toDataURL: vi.fn(() => 'data:image/png;base64,mock-data'),
            toBlob: vi.fn((callback) => callback(new Blob(['mock'], { type: 'image/png' })))
          };
        }

        // Video-specific mocking
        if (tagName === 'video') {
          return {
            ...element,
            play: vi.fn(),
            pause: vi.fn(),
            load: vi.fn(),
            currentTime: 0,
            duration: 0,
            paused: true,
            ended: false,
            volume: 1,
            muted: false,
            srcObject: null,
            src: '',
            width: 640,
            height: 480
          };
        }

        return element;
      }),
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      head: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    },
    configurable: true,
    writable: true
  });

  // Mock navigator
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Test Browser) Test/1.0',
      hardwareConcurrency: 4,
      deviceMemory: 4,
      onLine: true,
      mediaDevices: {
        getUserMedia: vi.fn(() => Promise.resolve({
          getTracks: vi.fn(() => []),
          getVideoTracks: vi.fn(() => []),
          getAudioTracks: vi.fn(() => [])
        })),
        enumerateDevices: vi.fn(() => Promise.resolve([]))
      },
      permissions: {
        query: vi.fn(() => Promise.resolve({ state: 'granted' }))
      },
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
        readText: vi.fn(() => Promise.resolve(''))
      }
    },
    configurable: true,
    writable: true
  });

  // Mock performance API
  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => []),
      timing: {
        navigationStart: Date.now() - 1000,
        loadEventEnd: Date.now(),
        domContentLoadedEventEnd: Date.now() - 500
      },
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 2000000000
      }
    },
    configurable: true,
    writable: true
  });

  // Mock Web APIs
  mockWebAPIs();
}

/**
 * Mock Web APIs for testing
 */
function mockWebAPIs() {
  // Mock fetch
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  } as any));

  // Mock Worker
  global.Worker = vi.fn(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onmessage: null,
    onerror: null,
    onmessageerror: null
  })) as any;

  // Mock ImageData
  global.ImageData = class MockImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
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

  // Mock File and FileReader
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

  global.FileReader = class MockFileReader {
    result: any = null;
    error: any = null;
    readyState: number = 0;
    onload: any = null;
    onerror: any = null;
    onabort: any = null;
    onloadstart: any = null;
    onloadend: any = null;
    onprogress: any = null;

    readAsDataURL(file: any) {
      setTimeout(() => {
        this.readyState = 2;
        this.result = 'data:image/jpeg;base64,mock-data';
        if (this.onload) {
          this.onload({ target: this });
        }
      }, 10);
    }

    readAsArrayBuffer(file: any) {
      setTimeout(() => {
        this.readyState = 2;
        this.result = new ArrayBuffer(file.size || 1000);
        if (this.onload) {
          this.onload({ target: this });
        }
      }, 10);
    }

    readAsText(file: any) {
      setTimeout(() => {
        this.readyState = 2;
        this.result = 'mock text content';
        if (this.onload) {
          this.onload({ target: this });
        }
      }, 10);
    }

    abort() {
      this.readyState = 2;
      if (this.onabort) {
        this.onabort({ target: this });
      }
    }
  } as any;

  // Mock Speech Recognition
  global.SpeechRecognition = class MockSpeechRecognition {
    continuous: boolean = false;
    interimResults: boolean = false;
    lang: string = 'en-US';
    maxAlternatives: number = 1;
    serviceURI: string = '';
    grammars: any = null;

    onstart: any = null;
    onend: any = null;
    onerror: any = null;
    onresult: any = null;
    onnomatch: any = null;
    onspeechstart: any = null;
    onspeechend: any = null;
    onsoundstart: any = null;
    onsoundend: any = null;
    onaudiostart: any = null;
    onaudioend: any = null;

    start() {
      setTimeout(() => {
        if (this.onstart) this.onstart({});
      }, 100);
    }

    stop() {
      setTimeout(() => {
        if (this.onend) this.onend({});
      }, 100);
    }

    abort() {
      setTimeout(() => {
        if (this.onend) this.onend({});
      }, 50);
    }
  } as any;

  global.webkitSpeechRecognition = global.SpeechRecognition;

  // Mock IntersectionObserver
  global.IntersectionObserver = class MockIntersectionObserver {
    constructor(callback: any, options?: any) {}
    observe(element: any) {}
    unobserve(element: any) {}
    disconnect() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class MockResizeObserver {
    constructor(callback: any) {}
    observe(element: any) {}
    unobserve(element: any) {}
    disconnect() {}
  } as any;

  // Mock MutationObserver
  global.MutationObserver = class MockMutationObserver {
    constructor(callback: any) {}
    observe(element: any, options?: any) {}
    disconnect() {}
    takeRecords() { return []; }
  } as any;
}

/**
 * Setup console mocking for tests
 */
function setupConsoleMocking() {
  // Store original console methods
  const originalConsole = { ...console };

  // Mock console methods while preserving them for debugging
  global.console = {
    ...originalConsole,
    log: vi.fn((...args) => {
      if (process.env.VITEST_DEBUG) {
        originalConsole.log(...args);
      }
    }),
    warn: vi.fn((...args) => {
      if (process.env.VITEST_DEBUG) {
        originalConsole.warn(...args);
      }
    }),
    error: vi.fn((...args) => {
      if (process.env.VITEST_DEBUG) {
        originalConsole.error(...args);
      }
    }),
    debug: vi.fn((...args) => {
      if (process.env.VITEST_DEBUG) {
        originalConsole.debug(...args);
      }
    }),
    info: vi.fn((...args) => {
      if (process.env.VITEST_DEBUG) {
        originalConsole.info(...args);
      }
    })
  };
}

/**
 * Setup performance monitoring for tests
 */
function setupPerformanceMonitoring() {
  // Mock high-resolution timer
  if (!global.performance.now) {
    global.performance.now = vi.fn(() => Date.now());
  }

  // Mock performance observer
  global.PerformanceObserver = class MockPerformanceObserver {
    constructor(callback: any) {}
    observe(options: any) {}
    disconnect() {}
    takeRecords() { return []; }
  } as any;

  // Mock performance entry
  global.PerformanceEntry = class MockPerformanceEntry {
    name: string = '';
    entryType: string = '';
    startTime: number = 0;
    duration: number = 0;
  } as any;
}

/**
 * Test utilities
 */
export const testUtils = {
  // Wait for next tick
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Wait for specified time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock async operation
  mockAsyncOperation: <T>(result: T, delay: number = 100) => 
    new Promise<T>(resolve => setTimeout(() => resolve(result), delay)),
  
  // Create mock event
  createMockEvent: (type: string, properties: any = {}) => ({
    type,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: {},
    currentTarget: {},
    ...properties
  }),
  
  // Create mock file
  createMockFile: (name: string, type: string, size: number = 1000) => 
    new File(['mock content'], name, { type, lastModified: Date.now() }),
  
  // Mock canvas context
  createMockCanvasContext: () => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(640 * 640 * 4),
      width: 640,
      height: 640
    })),
    putImageData: vi.fn(),
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
    rotate: vi.fn(),
    scale: vi.fn()
  }),
  
  // Mock performance measurement
  measurePerformance: async (fn: () => Promise<any> | any) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  }
};

// Export test utilities for use in tests
export default testUtils; 