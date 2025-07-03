import { writable, derived } from 'svelte/store';
import type { AppState, Detection, PerformanceMetrics } from '../types/index.js';

// Main application state
export const appState = writable<AppState>({
  isLoading: false,
  currentView: 'camera',
  detections: [],
  selectedDetection: null,
  error: null
});

// Individual stores for specific state pieces
export const isLoading = writable<boolean>(false);
export const currentView = writable<'camera' | 'upload' | 'voice'>('camera');
export const detections = writable<Detection[]>([]);
export const selectedDetection = writable<Detection | null>(null);
export const errorMessage = writable<string | null>(null);

// Camera and media state
export const cameraStream = writable<MediaStream | null>(null);
export const isRecording = writable<boolean>(false);
export const permissionsGranted = writable<boolean>(false);

// Performance monitoring
export const performanceMetrics = writable<PerformanceMetrics>({
  modelLoadTime: 0,
  inferenceTime: 0,
  frameRate: 0,
  memoryUsage: 0
});

// Voice recognition state
export const isListening = writable<boolean>(false);
export const voiceSupported = writable<boolean>(false);
export const lastTranscript = writable<string>('');

// Derived stores for computed values
export const hasDetections = derived(
  detections,
  ($detections) => $detections.length > 0
);

export const detectionsByCategory = derived(
  detections,
  ($detections) => {
    return $detections.reduce((acc, detection) => {
      const category = detection.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(detection);
      return acc;
    }, {} as Record<string, Detection[]>);
  }
);

export const averageConfidence = derived(
  detections,
  ($detections) => {
    if ($detections.length === 0) return 0;
    const sum = $detections.reduce((acc, det) => acc + det.confidence, 0);
    return sum / $detections.length;
  }
);

// UI state
export const showInstructions = writable<boolean>(true);
export const darkMode = writable<boolean>(false);
export const soundEnabled = writable<boolean>(true);

// Utility functions for store operations
export const clearDetections = () => {
  detections.set([]);
  selectedDetection.set(null);
};

export const addDetection = (detection: Detection) => {
  detections.update(current => [...current, detection]);
};

export const removeDetection = (index: number) => {
  detections.update(current => current.filter((_, i) => i !== index));
};

export const selectDetection = (detection: Detection | null) => {
  selectedDetection.set(detection);
};

export const setError = (message: string | null) => {
  errorMessage.set(message);
  if (message) {
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      errorMessage.set(null);
    }, 5000);
  }
};

export const setLoadingState = (loading: boolean) => {
  isLoading.set(loading);
  if (loading) {
    setError(null); // Clear errors when starting loading
  }
};

export const updatePerformanceMetric = (metric: keyof PerformanceMetrics, value: number) => {
  performanceMetrics.update(current => ({
    ...current,
    [metric]: value
  }));
};

// Camera utilities
export const setCameraStream = (stream: MediaStream | null) => {
  cameraStream.update(current => {
    // Stop previous stream if exists
    if (current) {
      current.getTracks().forEach(track => track.stop());
    }
    return stream;
  });
};

export const stopCamera = () => {
  cameraStream.update(current => {
    if (current) {
      current.getTracks().forEach(track => track.stop());
    }
    return null;
  });
  permissionsGranted.set(false);
};

// Voice utilities
export const setVoiceListening = (listening: boolean) => {
  isListening.set(listening);
};

export const setVoiceTranscript = (transcript: string) => {
  lastTranscript.set(transcript);
};

// Local storage persistence for user preferences
export const loadPreferences = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ecoscan-preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        darkMode.set(prefs.darkMode ?? false);
        soundEnabled.set(prefs.soundEnabled ?? true);
        showInstructions.set(prefs.showInstructions ?? true);
      } catch (e) {
        console.warn('Failed to load preferences:', e);
      }
    }
  }
};

export const savePreferences = () => {
  if (typeof window !== 'undefined') {
    const prefs = {
      darkMode: false, // Will be updated from store values
      soundEnabled: true,
      showInstructions: true
    };
    
    // Subscribe to get current values (this is a simplified version)
    localStorage.setItem('ecoscan-preferences', JSON.stringify(prefs));
  }
}; 