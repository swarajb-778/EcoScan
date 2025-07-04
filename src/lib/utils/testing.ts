/**
 * Testing utilities and mock helpers for EcoScan
 * Provides mock implementations for development and testing
 */

import type { Detection, WasteClassification } from '$lib/types';
import { config } from '$lib/config';

/**
 * Mock camera stream for testing
 */
export function createMockCameraStream(width = 640, height = 480): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Draw a simple test pattern
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);
  
  // Add some test objects
  drawMockObjects(ctx, width, height);
  
  // Create stream from canvas
  const stream = canvas.captureStream(30);
  return stream;
}

function drawMockObjects(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Draw mock bottle
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(100, 100, 80, 120);
  
  // Draw mock can
  ctx.fillStyle = '#FF9800';
  ctx.beginPath();
  ctx.arc(300, 200, 40, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw mock food container
  ctx.fillStyle = '#2196F3';
  ctx.fillRect(450, 150, 100, 60);
  
  // Add labels
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.fillText('Bottle', 110, 240);
  ctx.fillText('Can', 290, 260);
  ctx.fillText('Container', 460, 230);
}

/**
 * Mock object detector for testing
 */
export class MockObjectDetector {
  private isLoaded = false;
  private loadTime = 0;

  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    this.loadTime = performance.now() - startTime;
    this.isLoaded = true;
  }

  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded');
    }

    // Simulate inference time
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Generate mock detections
    const detections: Detection[] = [];
    const numDetections = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < numDetections; i++) {
      const detection: Detection = {
        bbox: {
          x: Math.random() * (imageData.width - 100),
          y: Math.random() * (imageData.height - 100),
          width: 50 + Math.random() * 100,
          height: 50 + Math.random() * 100
        },
        confidence: 0.5 + Math.random() * 0.5,
        class: this.getRandomClass(),
        classId: i
      };
      
      detections.push(detection);
    }

    return detections;
  }

  private getRandomClass(): string {
    const classes = [
      'bottle', 'can', 'plastic_container', 'glass_jar', 'cardboard_box',
      'food_waste', 'paper', 'battery', 'electronics', 'clothing'
    ];
    return classes[Math.floor(Math.random() * classes.length)];
  }

  getModelInfo() {
    return {
      name: 'MockYOLOv8n',
      version: '1.0.0',
      loadTime: this.loadTime,
      inputSize: [640, 640]
    };
  }
}

/**
 * Mock waste classifier for testing
 */
export class MockWasteClassifier {
  async classify(query: string): Promise<WasteClassification[]> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const mockClassifications: WasteClassification[] = [
      {
        id: 'mock-1',
        name: query || 'Mock Item',
        category: this.getRandomCategory(),
        confidence: 0.7 + Math.random() * 0.3,
        instructions: this.getRandomInstructions(),
        tips: ['This is a mock classification for testing'],
        keywordMatches: query ? [query.toLowerCase()] : ['mock']
      }
    ];

    return mockClassifications;
  }

  private getRandomCategory(): 'recycle' | 'compost' | 'landfill' {
    const categories = ['recycle', 'compost', 'landfill'] as const;
    return categories[Math.floor(Math.random() * categories.length)];
  }

  private getRandomInstructions(): string {
    const instructions = [
      'Rinse container before recycling',
      'Remove all food residue',
      'Check local recycling guidelines',
      'Separate lid from container',
      'Place in appropriate bin'
    ];
    return instructions[Math.floor(Math.random() * instructions.length)];
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  private measurements: { [key: string]: number[] } = {};

  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements[name]) {
        this.measurements[name] = [];
      }
      this.measurements[name].push(duration);
      
      return duration;
    };
  }

  getStats(name: string) {
    const measurements = this.measurements[name];
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);
    
    return {
      count: measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      mean: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllStats() {
    const stats: { [key: string]: any } = {};
    Object.keys(this.measurements).forEach(name => {
      stats[name] = this.getStats(name);
    });
    return stats;
  }

  reset(): void {
    this.measurements = {};
  }

  generateReport(): string {
    const stats = this.getAllStats();
    let report = '📊 Performance Test Report\n';
    report += '=' * 40 + '\n\n';
    
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat) {
        report += `${name}:\n`;
        report += `  Count: ${stat.count}\n`;
        report += `  Mean: ${stat.mean.toFixed(2)}ms\n`;
        report += `  Median: ${stat.median.toFixed(2)}ms\n`;
        report += `  Min: ${stat.min.toFixed(2)}ms\n`;
        report += `  Max: ${stat.max.toFixed(2)}ms\n`;
        report += `  P95: ${stat.p95.toFixed(2)}ms\n`;
        report += `  P99: ${stat.p99.toFixed(2)}ms\n\n`;
      }
    });
    
    return report;
  }
}

/**
 * Test data generator
 */
export class TestDataGenerator {
  static generateMockDetections(count = 5): Detection[] {
    const detections: Detection[] = [];
    
    for (let i = 0; i < count; i++) {
      detections.push({
        bbox: {
          x: Math.random() * 500,
          y: Math.random() * 400,
          width: 50 + Math.random() * 100,
          height: 50 + Math.random() * 100
        },
        confidence: 0.5 + Math.random() * 0.5,
        class: `class_${i}`,
        classId: i
      });
    }
    
    return detections;
  }

  static generateMockImageData(width = 640, height = 480): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Fill with random pattern
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.random() * 255;     // R
      imageData.data[i + 1] = Math.random() * 255; // G
      imageData.data[i + 2] = Math.random() * 255; // B
      imageData.data[i + 3] = 255;                 // A
    }
    
    return imageData;
  }

  static generateMockWasteData(): WasteClassification[] {
    return [
      {
        id: 'test-bottle',
        name: 'Plastic Bottle',
        category: 'recycle',
        confidence: 0.95,
        instructions: 'Remove cap and label, rinse clean',
        tips: ['Crush to save space', 'Check recycling number'],
        keywordMatches: ['bottle', 'plastic']
      },
      {
        id: 'test-banana',
        name: 'Banana Peel',
        category: 'compost',
        confidence: 0.88,
        instructions: 'Add to compost bin',
        tips: ['Great for composting', 'Rich in potassium'],
        keywordMatches: ['banana', 'peel', 'fruit']
      },
      {
        id: 'test-battery',
        name: 'AA Battery',
        category: 'landfill',
        confidence: 0.92,
        instructions: 'Take to special battery recycling center',
        tips: ['Never put in regular trash', 'Contains hazardous materials'],
        keywordMatches: ['battery', 'aa', 'alkaline']
      }
    ];
  }
}

/**
 * Visual regression testing helper
 */
export class VisualTestHelper {
  static async captureCanvas(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    });
  }

  static compareImages(img1Data: string, img2Data: string): boolean {
    // Simple comparison - in a real test, you'd use a proper image diff library
    return img1Data === img2Data;
  }

  static async waitForStableRender(
    element: HTMLElement, 
    timeout = 5000,
    checkInterval = 100
  ): Promise<void> {
    const startTime = Date.now();
    let lastHash = '';
    
    while (Date.now() - startTime < timeout) {
      const currentHash = this.getElementHash(element);
      
      if (currentHash === lastHash) {
        // Stable for one check interval
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        const finalHash = this.getElementHash(element);
        
        if (finalHash === currentHash) {
          return; // Stable!
        }
      }
      
      lastHash = currentHash;
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Element did not stabilize within ${timeout}ms`);
  }

  private static getElementHash(element: HTMLElement): string {
    // Simple hash of element's visual state
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    
    const data = [
      rect.width,
      rect.height,
      style.backgroundColor,
      style.color,
      element.textContent
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }
}

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