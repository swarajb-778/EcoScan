/**
 * Centralized configuration for EcoScan
 * Manages environment variables and default settings
 */

// Helper function to parse boolean environment variables
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Helper function to parse number environment variables
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config = {
  // Application Info
  app: {
    name: import.meta.env.VITE_APP_NAME || 'EcoScan',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'AI-Powered Waste Classification',
  },

  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
    version: import.meta.env.VITE_API_VERSION || 'v1',
  },

  // Analytics & Monitoring
  analytics: {
    enabled: parseBool(import.meta.env.VITE_ENABLE_ANALYTICS, false),
    analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
    gtmId: import.meta.env.VITE_GTM_ID || '',
  },

  // Feature Flags
  features: {
    voiceInput: parseBool(import.meta.env.VITE_ENABLE_VOICE_INPUT, true),
    cameraDetection: parseBool(import.meta.env.VITE_ENABLE_CAMERA_DETECTION, true),
    imageUpload: parseBool(import.meta.env.VITE_ENABLE_IMAGE_UPLOAD, true),
    offlineMode: parseBool(import.meta.env.VITE_ENABLE_OFFLINE_MODE, true),
    debugMode: parseBool(import.meta.env.VITE_ENABLE_DEBUG_MODE, false),
  },

  // Model Configuration
  model: {
    confidenceThreshold: parseNumber(import.meta.env.VITE_MODEL_CONFIDENCE_THRESHOLD, 0.5),
    nmsThreshold: parseNumber(import.meta.env.VITE_MODEL_NMS_THRESHOLD, 0.4),
    maxDetections: parseNumber(import.meta.env.VITE_MAX_DETECTIONS, 20),
    device: import.meta.env.VITE_INFERENCE_DEVICE || 'auto',
    modelPath: '/models/yolov8n.onnx',
    wasteDataPath: '/data/wasteData.json',
  },

  // PWA Configuration
  pwa: {
    enabled: parseBool(import.meta.env.VITE_PWA_ENABLED, true),
    themeColor: import.meta.env.VITE_PWA_THEME_COLOR || '#22c55e',
    backgroundColor: import.meta.env.VITE_PWA_BACKGROUND_COLOR || '#ffffff',
  },

  // Development Settings
  dev: {
    enableMockCamera: parseBool(import.meta.env.VITE_DEV_ENABLE_MOCK_CAMERA, false),
    enableMockModel: parseBool(import.meta.env.VITE_DEV_ENABLE_MOCK_MODEL, false),
    showPerformanceStats: parseBool(import.meta.env.VITE_DEV_SHOW_PERFORMANCE_STATS, true),
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  },

  // Production Settings
  prod: {
    enableSourceMaps: parseBool(import.meta.env.VITE_PROD_ENABLE_SOURCE_MAPS, false),
    minify: parseBool(import.meta.env.VITE_PROD_MINIFY, true),
    prerender: parseBool(import.meta.env.VITE_PROD_PRERENDER, true),
  },

  // Camera Settings
  camera: {
    defaultConstraints: {
      video: {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    },
    fallbackConstraints: {
      video: {
        width: { ideal: 480 },
        height: { ideal: 360 }
      },
      audio: false
    }
  },

  // Voice Settings
  voice: {
    language: 'en-US',
    continuous: false,
    interimResults: true,
    maxAlternatives: 1
  },

  // Performance Settings
  performance: {
    maxInferenceTime: 1000, // ms
    targetFPS: 30,
    minFPS: 10,
    memoryWarningThreshold: 100, // MB
    maxCacheSize: 50, // number of cached items
  },

  // UI Settings
  ui: {
    animationDuration: 300, // ms
    toastDuration: 5000, // ms
    debounceDelay: 100, // ms
    throttleDelay: 16, // ms (~60fps)
  }
} as const;

// Type definitions for configuration
export type Config = typeof config;
export type FeatureFlags = typeof config.features;
export type ModelConfig = typeof config.model;

// Environment detection helpers
export const isDevelopment = config.dev.isDevelopment;
export const isProduction = config.dev.isProduction;

// Feature flag helpers
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return config.features[feature];
}

// Debug logging helper
export function debugLog(...args: any[]): void {
  if (config.features.debugMode) {
    console.log('[EcoScan Debug]', ...args);
  }
}

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate model thresholds
  if (config.model.confidenceThreshold < 0 || config.model.confidenceThreshold > 1) {
    errors.push('Model confidence threshold must be between 0 and 1');
  }

  if (config.model.nmsThreshold < 0 || config.model.nmsThreshold > 1) {
    errors.push('Model NMS threshold must be between 0 and 1');
  }

  // Validate performance settings
  if (config.performance.targetFPS < config.performance.minFPS) {
    errors.push('Target FPS must be greater than or equal to minimum FPS');
  }

  // Validate URLs if provided
  if (config.api.baseUrl && !isValidUrl(config.api.baseUrl)) {
    errors.push('Invalid API base URL');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Export configuration for use in other modules
export default config; 