/**
 * Testing utilities for EcoScan development and debugging
 * Mock implementations, test helpers, and debugging tools
 */

import type { Detection, WasteClassification } from '$lib/types';
import { config } from '$lib/config';

/**
 * Mock detection result
 */
export interface MockDetection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  category: 'recycle' | 'compost' | 'landfill' | 'hazardous';
}

/**
 * Test configuration interface
 */
export interface TestConfig {
  enableMockCamera: boolean;
  enableMockDetector: boolean;
  enableMockVoice: boolean;
  mockDetections: MockDetection[];
  simulateSlowNetwork: boolean;
  simulateLowBattery: boolean;
  simulateOffline: boolean;
  debugMode: boolean;
}

/**
 * Mock camera stream for testing
 */
export class MockCameraStream {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stream?: MediaStream;
  private animationId?: number;

  constructor(width = 640, height = 480) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.drawTestPattern();
  }

  /**
   * Create a mock media stream
   */
  async createStream(): Promise<MediaStream> {
    if (this.stream) {
      return this.stream;
    }

    // Create a stream from canvas
    this.stream = this.canvas.captureStream(30);
    this.startAnimation();
    
    return this.stream;
  }

  /**
   * Draw test pattern on canvas
   */
  private drawTestPattern(): void {
    const { width, height } = this.canvas;
    
    // Clear canvas
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
    
    // Draw test objects
    this.drawTestObjects();
    
    // Add timestamp
    this.ctx.fillStyle = '#333';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Mock Camera - ${new Date().toLocaleTimeString()}`, 10, 30);
  }

  /**
   * Draw test objects that look like waste items
   */
  private drawTestObjects(): void {
    const objects = [
      { x: 100, y: 100, width: 80, height: 120, color: '#4CAF50', label: 'Bottle' },
      { x: 300, y: 150, width: 60, height: 60, color: '#FF9800', label: 'Can' },
      { x: 450, y: 200, width: 100, height: 80, color: '#2196F3', label: 'Box' }
    ];

    objects.forEach(obj => {
      // Draw object
      this.ctx.fillStyle = obj.color;
      this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      
      // Draw border
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      
      // Draw label
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(obj.label, obj.x + 5, obj.y + 20);
    });
  }

  /**
   * Start animation to simulate movement
   */
  private startAnimation(): void {
    const animate = () => {
      this.drawTestPattern();
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop the mock stream
   */
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}

/**
 * Mock object detector for testing
 */
export class MockObjectDetector {
  private detections: MockDetection[] = [
    {
      class: 'bottle',
      confidence: 0.95,
      bbox: [100, 100, 80, 120],
      category: 'recycle'
    },
    {
      class: 'can',
      confidence: 0.88,
      bbox: [300, 150, 60, 60],
      category: 'recycle'
    },
    {
      class: 'cardboard',
      confidence: 0.92,
      bbox: [450, 200, 100, 80],
      category: 'recycle'
    }
  ];

  /**
   * Mock detection method
   */
  async detect(imageData: ImageData): Promise<MockDetection[]> {
    // Simulate processing time
    await this.delay(50 + Math.random() * 100);
    
    // Return random subset of detections
    const numDetections = Math.floor(Math.random() * this.detections.length) + 1;
    return this.detections
      .sort(() => Math.random() - 0.5)
      .slice(0, numDetections)
      .map(detection => ({
        ...detection,
        confidence: Math.max(0.5, detection.confidence + (Math.random() - 0.5) * 0.2)
      }));
  }

  /**
   * Add custom detection
   */
  addDetection(detection: MockDetection): void {
    this.detections.push(detection);
  }

  /**
   * Clear all detections
   */
  clearDetections(): void {
    this.detections = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock voice recognition for testing
 */
export class MockVoiceRecognition {
  private responses = [
    'plastic bottle',
    'aluminum can',
    'cardboard box',
    'glass jar',
    'paper cup',
    'food waste',
    'battery',
    'electronic device'
  ];

  /**
   * Mock speech recognition
   */
  async recognize(): Promise<string> {
    // Simulate recognition delay
    await this.delay(1000 + Math.random() * 2000);
    
    // Return random response
    return this.responses[Math.floor(Math.random() * this.responses.length)];
  }

  /**
   * Add custom response
   */
  addResponse(response: string): void {
    this.responses.push(response);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  private measurements = new Map<string, number[]>();

  /**
   * Start measuring performance
   */
  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      
      this.measurements.get(name)!.push(duration);
      return duration;
    };
  }

  /**
   * Get performance statistics
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    
    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const reports: string[] = [];
    
    for (const [name, measurements] of this.measurements) {
      const stats = this.getStats(name);
      if (stats) {
        reports.push(
          `${name}:\n` +
          `  Count: ${stats.count}\n` +
          `  Min: ${stats.min.toFixed(2)}ms\n` +
          `  Max: ${stats.max.toFixed(2)}ms\n` +
          `  Avg: ${stats.avg.toFixed(2)}ms\n` +
          `  Median: ${stats.median.toFixed(2)}ms`
        );
      }
    }
    
    return reports.join('\n\n');
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }
}

/**
 * Network simulation utilities
 */
export class NetworkSimulator {
  private originalFetch = window.fetch;
  private isSimulating = false;

  /**
   * Simulate slow network
   */
  simulateSlowNetwork(delay = 2000): void {
    if (this.isSimulating) return;
    
    this.isSimulating = true;
    
    window.fetch = async (...args) => {
      await this.delay(delay);
      return this.originalFetch.apply(window, args);
    };
  }

  /**
   * Simulate offline network
   */
  simulateOffline(): void {
    if (this.isSimulating) return;
    
    this.isSimulating = true;
    
    window.fetch = async () => {
      throw new Error('Network request failed - simulating offline');
    };
  }

  /**
   * Restore normal network
   */
  restore(): void {
    if (!this.isSimulating) return;
    
    window.fetch = this.originalFetch;
    this.isSimulating = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Debug utilities
 */
export class DebugUtils {
  private static instance?: DebugUtils;
  private debugPanel?: HTMLElement;
  private logs: string[] = [];

  static getInstance(): DebugUtils {
    if (!DebugUtils.instance) {
      DebugUtils.instance = new DebugUtils();
    }
    return DebugUtils.instance;
  }

  /**
   * Create debug panel
   */
  createDebugPanel(): void {
    if (this.debugPanel) return;

    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'ecoscan-debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      display: none;
    `;

    const header = document.createElement('div');
    header.textContent = 'EcoScan Debug Panel';
    header.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #333;
    `;

    const logContainer = document.createElement('div');
    logContainer.id = 'debug-logs';

    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear';
    clearButton.style.cssText = `
      background: #333;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
    `;
    clearButton.onclick = () => this.clearLogs();

    this.debugPanel.appendChild(header);
    this.debugPanel.appendChild(logContainer);
    this.debugPanel.appendChild(clearButton);
    document.body.appendChild(this.debugPanel);

    // Toggle with Ctrl+D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.togglePanel();
      }
    });
  }

  /**
   * Toggle debug panel visibility
   */
  togglePanel(): void {
    if (!this.debugPanel) {
      this.createDebugPanel();
    }

    const isVisible = this.debugPanel!.style.display !== 'none';
    this.debugPanel!.style.display = isVisible ? 'none' : 'block';
  }

  /**
   * Log debug message
   */
  log(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    
    this.logs.push(logEntry);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    this.updatePanel();
    
    // Also log to console
    console[type](message);
  }

  /**
   * Update debug panel content
   */
  private updatePanel(): void {
    if (!this.debugPanel) return;

    const logContainer = this.debugPanel.querySelector('#debug-logs');
    if (logContainer) {
      logContainer.innerHTML = this.logs
        .slice(-20) // Show last 20 logs
        .map(log => `<div>${log}</div>`)
        .join('');
      
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  /**
   * Clear debug logs
   */
  clearLogs(): void {
    this.logs = [];
    this.updatePanel();
  }
}

/**
 * Test configuration manager
 */
export class TestConfigManager {
  private config: TestConfig = {
    enableMockCamera: false,
    enableMockDetector: false,
    enableMockVoice: false,
    mockDetections: [],
    simulateSlowNetwork: false,
    simulateLowBattery: false,
    simulateOffline: false,
    debugMode: false
  };

  /**
   * Load configuration from localStorage
   */
  loadConfig(): TestConfig {
    try {
      const stored = localStorage.getItem('ecoscan-test-config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load test config:', error);
    }
    
    return this.config;
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(config: Partial<TestConfig>): void {
    this.config = { ...this.config, ...config };
    
    try {
      localStorage.setItem('ecoscan-test-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save test config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TestConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = {
      enableMockCamera: false,
      enableMockDetector: false,
      enableMockVoice: false,
      mockDetections: [],
      simulateSlowNetwork: false,
      simulateLowBattery: false,
      simulateOffline: false,
      debugMode: false
    };
    
    localStorage.removeItem('ecoscan-test-config');
  }
}

/**
 * Utility functions for testing
 */
export const TestUtils = {
  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return import.meta.env.DEV || process.env.NODE_ENV === 'development';
  },

  /**
   * Check if running in test environment
   */
  isTest(): boolean {
    return import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';
  },

  /**
   * Create test image data
   */
  createTestImageData(width = 640, height = 480): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Fill with test pattern
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // Add some colored rectangles
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(50, 50, 100, 100);
    
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(200, 100, 80, 120);
    
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(350, 150, 60, 60);
    
    return ctx.getImageData(0, 0, width, height);
  },

  /**
   * Generate random test detection
   */
  generateRandomDetection(): MockDetection {
    const classes = ['bottle', 'can', 'box', 'bag', 'cup', 'wrapper'];
    const categories: MockDetection['category'][] = ['recycle', 'compost', 'landfill', 'hazardous'];
    
    return {
      class: classes[Math.floor(Math.random() * classes.length)],
      confidence: 0.5 + Math.random() * 0.5,
      bbox: [
        Math.random() * 400,
        Math.random() * 300,
        50 + Math.random() * 150,
        50 + Math.random() * 150
      ],
      category: categories[Math.floor(Math.random() * categories.length)]
    };
  },

  /**
   * Wait for specified time
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Create blob URL from canvas
   */
  canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve('');
        }
      });
    });
  }
};

// Global instances
export const mockCameraStream = new MockCameraStream();
export const mockObjectDetector = new MockObjectDetector();
export const mockVoiceRecognition = new MockVoiceRecognition();
export const performanceTester = new PerformanceTester();
export const networkSimulator = new NetworkSimulator();
export const debugUtils = DebugUtils.getInstance();
export const testConfigManager = new TestConfigManager();

/**
 * Global test utilities for development
 */
export const testUtils = {
  enableMockMode: () => {
    (window as any).__ECOSCAN_MOCK_MODE__ = true;
  },
  
  disableMockMode: () => {
    (window as any).__ECOSCAN_MOCK_MODE__ = false;
  },
  
  isMockMode: () => {
    return config.dev.enableMockModel || (window as any).__ECOSCAN_MOCK_MODE__;
  },
  
  getPerformanceTester: () => new PerformanceTester(),
  
  generateTestData: TestDataGenerator,
  
  visual: VisualTestHelper
}; 