// Core detection and classification types
export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  confidence: number;
  category: 'recycle' | 'compost' | 'landfill';
}

export interface WasteClassification {
  category: 'recycle' | 'compost' | 'landfill';
  confidence: number;
  instructions: string;
  tips: string;
  color: string;
}

// ML model types
export interface ModelConfig {
  modelPath: string;
  inputSize: [number, number]; // [width, height]
  threshold: number;
  iouThreshold: number;
}

// Camera and media types
export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
}

// Voice recognition types
export interface VoiceResult {
  transcript: string;
  confidence: number;
  isSupported: boolean;
}

// Application state types
export interface AppState {
  isLoading: boolean;
  currentView: 'camera' | 'upload' | 'voice';
  detections: Detection[];
  selectedDetection: Detection | null;
  error: string | null;
}

// Classification database types
export interface ClassificationData {
  classifications: Record<string, WasteClassification>;
  keywords: Record<string, string[]>;
}

// Performance monitoring types
export interface PerformanceMetrics {
  modelLoadTime: number;
  inferenceTime: number;
  frameRate: number;
  memoryUsage: number;
} 