# EcoScan API Documentation

This document provides comprehensive documentation for the EcoScan API and SDK.

## Table of Contents

- [Core APIs](#core-apis)
- [Components](#components)
- [Utilities](#utilities)
- [Types](#types)
- [Configuration](#configuration)
- [Examples](#examples)

## Core APIs

### Object Detection

#### `ObjectDetector`

The main class for performing object detection using ONNX models.

```typescript
import { ObjectDetector } from '$lib/ml/detector';

const detector = new ObjectDetector({
  modelPath: '/models/yolov8n.onnx',
  confidenceThreshold: 0.5,
  nmsThreshold: 0.4
});

// Initialize the model
await detector.initialize();

// Detect objects in an image
const detections = await detector.detect(imageData);
```

**Methods:**

- `initialize()`: Promise\<void\> - Load and initialize the ONNX model
- `detect(imageData: ImageData)`: Promise\<Detection[]\> - Detect objects in image
- `getModelInfo()`: ModelInfo - Get model metadata and performance stats
- `dispose()`: void - Clean up resources

**Configuration:**

```typescript
interface ModelConfig {
  modelPath: string;
  inputSize: [number, number];
  confidenceThreshold: number;
  nmsThreshold: number;
  maxDetections: number;
  providers: string[];
}
```

### Waste Classification

#### `WasteClassifier`

Classify waste items using fuzzy search and keyword matching.

```typescript
import { WasteClassifier } from '$lib/ml/classifier';

const classifier = new WasteClassifier('/data/wasteData.json');

// Initialize with waste database
await classifier.initialize();

// Classify a text query
const results = await classifier.classify('plastic bottle');

// Classify detected objects
const classification = await classifier.classifyDetection('bottle', 0.9);
```

**Methods:**

- `initialize()`: Promise\<void\> - Load waste classification database
- `classify(query: string)`: Promise\<WasteClassification[]\> - Classify text input
- `classifyDetection(className: string, confidence: number)`: Promise\<WasteClassification | null\>
- `getCategories()`: string[] - Get available waste categories
- `updateDatabase(data: WasteData)`: void - Update classification database

## Components

### CameraView

Real-time camera detection component.

```svelte
<script>
  import CameraView from '$lib/components/CameraView.svelte';
  
  function handleDetections(event) {
    const { detections } = event.detail;
    console.log('Detected:', detections);
  }
</script>

<CameraView
  autoStart={true}
  showPerformance={true}
  on:detections={handleDetections}
  on:error={handleError}
/>
```

**Props:**

- `autoStart: boolean = false` - Start camera automatically
- `showPerformance: boolean = false` - Show performance metrics
- `showBoundingBoxes: boolean = true` - Display detection boxes
- `confidenceThreshold: number = 0.5` - Detection confidence threshold

**Events:**

- `detections` - Fired when objects are detected
- `error` - Fired when an error occurs
- `modelLoaded` - Fired when model is loaded
- `cameraStarted` - Fired when camera starts

### VoiceInput

Voice recognition component for hands-free input.

```svelte
<script>
  import VoiceInput from '$lib/components/VoiceInput.svelte';
</script>

<VoiceInput
  language="en-US"
  continuous={false}
  on:result={handleVoiceResult}
  on:error={handleVoiceError}
/>
```

**Props:**

- `language: string = 'en-US'` - Speech recognition language
- `continuous: boolean = false` - Continuous listening mode
- `interimResults: boolean = true` - Show interim results

### ImageUpload

File upload component with drag-and-drop support.

```svelte
<script>
  import ImageUpload from '$lib/components/ImageUpload.svelte';
</script>

<ImageUpload
  maxSize={10485760}
  accept={['image/jpeg', 'image/png']}
  on:upload={handleImageUpload}
/>
```

## Utilities

### Performance Monitoring

Track application performance and model inference times.

```typescript
import { performanceMonitor } from '$lib/utils/performance';

// Start a measurement
const end = performanceMonitor.startMeasurement('inference');

// ... perform inference ...

// End measurement and get duration
const duration = end();

// Get performance statistics
const stats = performanceMonitor.getStats('inference');
console.log(`Average inference time: ${stats.mean}ms`);
```

### Device Detection

Detect device capabilities and optimize settings.

```typescript
import { getDeviceInfo, getOptimalSettings } from '$lib/utils/device';

const deviceInfo = getDeviceInfo();
console.log('Device:', deviceInfo);

const settings = getOptimalSettings(deviceInfo);
console.log('Optimal settings:', settings);
```

### Accessibility

Enhance accessibility with screen reader support and keyboard navigation.

```typescript
import { 
  announceToScreenReader,
  FocusManager,
  createDetectionAria 
} from '$lib/utils/accessibility';

// Announce to screen readers
announceToScreenReader('Objects detected');

// Manage focus for modals
const focusManager = new FocusManager();
focusManager.trapFocus(modalElement);

// Create ARIA attributes
const ariaProps = createDetectionAria('bottle', 0.9, 'Recycle this item');
```

### Security

Input validation and security utilities.

```typescript
import { 
  sanitizeInput,
  validateFileUpload,
  generateSecureId 
} from '$lib/utils/security';

// Sanitize user input
const clean = sanitizeInput(userInput);

// Validate file uploads
const validation = validateFileUpload(file);
if (!validation.valid) {
  console.error(validation.error);
}

// Generate secure IDs
const id = generateSecureId(16);
```

## Types

### Core Types

```typescript
// Detection result from object detection
interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  class: string;
}

// Waste classification result
interface WasteClassification {
  id: string;
  name: string;
  category: 'recycle' | 'compost' | 'landfill';
  confidence: number;
  instructions: string;
  tips: string[];
  keywordMatches: string;
}

// Performance metrics
interface PerformanceMetrics {
  modelLoadTime?: number;
  averageInferenceTime: number;
  frameRate: number;
  memoryUsage?: number;
  errorCount: number;
}

// Device information
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  hasTouch: boolean;
  supportsWebGL: boolean;
  supportsWebRTC: boolean;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
}
```

## Configuration

### Environment Variables

```bash
# Feature flags
VITE_ENABLE_VOICE_INPUT=true
VITE_ENABLE_CAMERA_DETECTION=true
VITE_ENABLE_IMAGE_UPLOAD=true

# Model settings
VITE_MODEL_CONFIDENCE_THRESHOLD=0.5
VITE_MODEL_NMS_THRESHOLD=0.4
VITE_MAX_DETECTIONS=20

# Performance settings
VITE_TARGET_FPS=30
VITE_MEMORY_WARNING_THRESHOLD=100
```

### Runtime Configuration

```typescript
import { config } from '$lib/config';

// Check feature flags
if (config.features.voiceInput) {
  // Enable voice input
}

// Get model configuration
const modelConfig = config.model;
console.log('Confidence threshold:', modelConfig.confidenceThreshold);

// Validate configuration
const validation = validateConfig();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Examples

### Complete Detection Pipeline

```typescript
import { ObjectDetector } from '$lib/ml/detector';
import { WasteClassifier } from '$lib/ml/classifier';
import { performanceMonitor } from '$lib/utils/performance';

// Initialize components
const detector = new ObjectDetector();
const classifier = new WasteClassifier();

await Promise.all([
  detector.initialize(),
  classifier.initialize()
]);

// Process an image
async function processImage(imageData: ImageData) {
  const end = performanceMonitor.startMeasurement('total-processing');
  
  try {
    // Detect objects
    const detections = await detector.detect(imageData);
    
    // Classify each detection
    const classifications = await Promise.all(
      detections.map(detection => 
        classifier.classifyDetection(detection.class, detection.confidence)
      )
    );
    
    const duration = end();
    console.log(`Processing completed in ${duration}ms`);
    
    return { detections, classifications };
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  }
}
```

### Custom Component Integration

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { ObjectDetector } from '$lib/ml/detector';
  import { errorStore } from '$lib/stores/errorStore';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  
  let detector: ObjectDetector;
  let isLoading = true;
  let detections = [];
  
  onMount(async () => {
    try {
      detector = new ObjectDetector();
      await detector.initialize();
      isLoading = false;
    } catch (error) {
      errorStore.handleModelError(error);
      isLoading = false;
    }
  });
  
  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Convert file to ImageData
    const imageData = await convertFileToImageData(file);
    
    // Detect objects
    try {
      detections = await detector.detect(imageData);
    } catch (error) {
      errorStore.error('Detection failed');
    }
  }
</script>

{#if isLoading}
  <LoadingSpinner message="Loading AI model..." />
{:else}
  <input type="file" accept="image/*" on:change={handleImageUpload} />
  
  {#if detections.length > 0}
    <ul>
      {#each detections as detection}
        <li>{detection.class} ({(detection.confidence * 100).toFixed(1)}%)</li>
      {/each}
    </ul>
  {/if}
{/if}
```

### Error Handling

```typescript
import { errorStore } from '$lib/stores/errorStore';

// Handle different types of errors
try {
  await detector.detect(imageData);
} catch (error) {
  if (error.name === 'ModelNotLoadedError') {
    errorStore.handleModelError(error);
  } else if (error.name === 'InsufficientMemoryError') {
    errorStore.error('Not enough memory for detection', {
      context: 'model',
      error
    });
  } else {
    errorStore.handleGenericError(error, 'detection');
  }
}

// Listen to error store
errorStore.subscribe(state => {
  state.toasts.forEach(toast => {
    // Display toast notification
    console.log(`${toast.type}: ${toast.message}`);
  });
});
```

## Performance Optimization

### Model Optimization

```typescript
// Use appropriate execution providers
const detector = new ObjectDetector({
  providers: ['webgl', 'wasm'], // Prefer WebGL for speed
  confidenceThreshold: 0.6, // Higher threshold = fewer false positives
  maxDetections: 10 // Limit detections for performance
});

// Monitor performance
const monitor = performanceMonitor;
setInterval(() => {
  const stats = monitor.getStats('inference');
  if (stats && stats.mean > 200) {
    console.warn('Slow inference detected');
  }
}, 5000);
```

### Memory Management

```typescript
import { createMemoryMonitor } from '$lib/utils/build';

const memoryMonitor = createMemoryMonitor(80); // 80MB threshold

// Check memory periodically
setInterval(() => {
  const usage = memoryMonitor.check();
  if (usage && usage > 100) {
    // Clean up resources
    memoryMonitor.cleanup();
  }
}, 10000);
```

## Testing

### Unit Testing

```typescript
import { test, expect } from 'vitest';
import { WasteClassifier } from '$lib/ml/classifier';

test('classifier identifies recyclable items', async () => {
  const classifier = new WasteClassifier();
  await classifier.initialize();
  
  const result = await classifier.classify('plastic bottle');
  
  expect(result).toBeDefined();
  expect(result[0].category).toBe('recycle');
  expect(result[0].confidence).toBeGreaterThan(0.5);
});
```

### Component Testing

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import ImageUpload from '$lib/components/ImageUpload.svelte';

test('image upload handles file selection', async () => {
  const { getByRole } = render(ImageUpload);
  
  const input = getByRole('button', { name: /upload/i });
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  
  await fireEvent.change(input, { target: { files: [file] } });
  
  // Assert file was processed
});
```

For more examples and advanced usage, see the [examples directory](../examples/) in the repository. 