// Core detection and classification types
export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  label: string; // Human-readable label for the detected object
  confidence: number;
  category: 'recycle' | 'compost' | 'landfill';
  instructions?: string; // Disposal instructions
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
  averageInferenceTime: number;
  inferenceTime: number;
  modelLoadTime: number;
  cameraInitTime: number;
  componentMountTime: number;
  cameraResolution: string;
  fps: number;
  frameRate: number;
  memoryUsage: number;
  batteryLevel: number;
  isCharging: boolean;
  thermalState: 'normal' | 'fair' | 'serious' | 'critical';
  lastUpdate: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  hapticEnabled: boolean;
  voiceEnabled: boolean;
  language: string;
  modelQuality: 'fast' | 'balanced' | 'accurate';
  cameraResolution: '480p' | '720p' | '1080p';
  autoCapture: boolean;
  confidenceThreshold: number;
}

export interface AppLoadingState {
  isLoading: boolean;
  stage: 'idle' | 'initializing' | 'loading-model' | 'processing' | 'complete' | 'models' | 'camera' | 'detector' | 'classifier';
  progress: number; // 0-100
  message: string;
} 