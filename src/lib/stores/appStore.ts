import { writable, derived, type Writable } from 'svelte/store';
import type { Detection, WasteClassification, PerformanceMetrics, AppSettings, AppLoadingState, AppState } from '../types/index.js';
import { isBrowser, safeLocalStorage } from '../utils/browser.js';

// Main application state
export const appState = writable<AppState>({
  isLoading: false,
  currentView: 'camera',
  detections: [],
  selectedDetection: null,
  error: null
});

// SSR-safe store creation helper
function createSSRSafeStore<T>(initialValue: T, key?: string): Writable<T> {
  const store = writable<T>(initialValue);
  
  if (key && isBrowser()) {
    // Try to load from localStorage on client-side
    const storage = safeLocalStorage();
    if (storage) {
      try {
        const stored = storage.getItem(key);
        if (stored) {
          const parsedValue = JSON.parse(stored);
          store.set(parsedValue);
        }
      } catch (error) {
        console.warn(`Failed to load ${key} from localStorage:`, error);
      }
    }
  }
  
  return store;
}

// App state stores with SSR safety
export const detections = createSSRSafeStore<Detection[]>([]);
export const selectedDetection = createSSRSafeStore<Detection | null>(null);
export const currentClassification = createSSRSafeStore<WasteClassification | null>(null);

// UI state stores
export const isLoading = createSSRSafeStore<boolean>(false);
export const error = createSSRSafeStore<string | null>(null);
export const success = createSSRSafeStore<string | null>(null);
export const loadingState = createSSRSafeStore<AppLoadingState>({
  isLoading: false,
  stage: 'idle',
  progress: 0,
  message: ''
});

// Camera state with SSR safety
export const cameraStream = createSSRSafeStore<MediaStream | null>(null);
export const isCameraActive = createSSRSafeStore<boolean>(false);
export const permissionsGranted = createSSRSafeStore<boolean>(false);

// Voice state
export const isListening = createSSRSafeStore<boolean>(false);
export const voiceSupported = createSSRSafeStore<boolean>(false);
export const lastTranscript = createSSRSafeStore<string>('');

// Settings with localStorage persistence
export const settings = createSSRSafeStore<AppSettings>({
  theme: 'auto',
  soundEnabled: true,
  hapticEnabled: true,
  voiceEnabled: false,
  language: 'en',
  modelQuality: 'balanced',
  cameraResolution: '720p',
  autoCapture: false,
  confidenceThreshold: 0.5
}, 'ecoscan-settings');

// Performance metrics with SSR safety
export const performanceMetrics = createSSRSafeStore<PerformanceMetrics>({
  averageInferenceTime: 0,
  fps: 0,
  memoryUsage: 0,
  batteryLevel: 1,
  isCharging: true,
  thermalState: 'normal',
  lastUpdate: Date.now()
});

// PWA install state
export const showInstallPrompt = createSSRSafeStore<boolean>(false);
export const isInstalled = createSSRSafeStore<boolean>(false);

// Network state with SSR fallback
export const isOnline = createSSRSafeStore<boolean>(true);

// Initialize network state listener on client-side
if (isBrowser()) {
  const updateOnlineStatus = () => {
    isOnline.set(navigator.onLine);
  };
  
  // Set initial state
  updateOnlineStatus();
  
  // Listen for changes
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// Persist settings changes to localStorage
if (isBrowser()) {
  settings.subscribe((value) => {
    const storage = safeLocalStorage();
    if (storage) {
      try {
        storage.setItem('ecoscan-settings', JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to save settings to localStorage:', error);
      }
    }
  });
}

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

// Helper functions
export function setError(message: string | null) {
  error.set(message);
  if (message) {
    // Clear error after 5 seconds
    setTimeout(() => error.set(null), 5000);
  }
}

export function setSuccess(message: string | null) {
  success.set(message);
  if (message) {
    // Clear success message after 3 seconds
    setTimeout(() => success.set(null), 3000);
  }
}

export function setLoadingState(isLoadingValue: boolean, stage?: string, progress?: number, message?: string) {
  loadingState.set({
    isLoading: isLoadingValue,
    stage: stage || 'idle',
    progress: progress || 0,
    message: message || ''
  });
  isLoading.set(isLoadingValue);
}

export function updatePerformanceMetric(key: keyof PerformanceMetrics, value: number | string | boolean) {
  performanceMetrics.update(current => ({
    ...current,
    [key]: value,
    lastUpdate: Date.now()
  }));
}

// Camera utilities
export const setCameraStream = (stream: MediaStream | null) => {
  cameraStream.update(current => {
    // Stop previous stream if exists
    if (current) {
      current.getTracks().forEach(track => track.stop());
    }
    return stream;
  });
  
  // Update permission and active state based on stream availability
  if (stream) {
    permissionsGranted.set(true);
    isCameraActive.set(true);
    console.log('📷 Camera stream set successfully, permissions granted');
  } else {
    permissionsGranted.set(false);
    isCameraActive.set(false);
  }
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