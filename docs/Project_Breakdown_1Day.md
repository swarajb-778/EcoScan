# **EcoScan - 1-Day Development Breakdown**

## **🎯 Project Overview**
**Total Duration:** 8-10 hours (1 working day)  
**Target:** Functional MVP with core features  
**Framework:** SvelteKit + TypeScript  
**Deployment:** Vercel/Netlify  

---

## **⏰ Timeline Distribution**
| Phase | Duration | % of Day | Priority |
|-------|----------|----------|----------|
| **Phase 1: Setup & Foundation** | 1.5 hours | 15% | Critical |
| **Phase 2: Core Detection System** | 3.5 hours | 35% | Critical |
| **Phase 3: User Interface** | 2.5 hours | 25% | Critical |
| **Phase 4: Additional Features** | 1.5 hours | 15% | Important |
| **Phase 5: Polish & Deploy** | 1 hour | 10% | Important |

---

# **📋 PHASE 1: PROJECT SETUP & FOUNDATION**
**Duration:** 1.5 hours (9:00 AM - 10:30 AM)  
**Goal:** Complete development environment and basic project structure

## **Task 1.1: Environment Setup** ⏱️ 30 minutes
### **Subtask 1.1.1: Initialize SvelteKit Project** (10 min)
- [ ] Run `npm create svelte@latest ecoscan`
- [ ] Select TypeScript + ESLint + Prettier
- [ ] Navigate to project directory
- [ ] Install dependencies with `npm install`

### **Subtask 1.1.2: Install Required Dependencies** (15 min)
```bash
# Core ML dependencies
npm install onnxruntime-web

# UI and styling
npm install -D tailwindcss postcss autoprefixer @tailwindcss/typography daisyui

# PWA capabilities
npm install -D @vite-pwa/sveltekit

# Utilities
npm install fuse.js  # For fuzzy search in voice input
```

### **Subtask 1.1.3: Configure Build Tools** (5 min)
- [ ] Initialize Tailwind CSS: `npx tailwindcss init -p`
- [ ] Configure `tailwind.config.js` with DaisyUI
- [ ] Update `app.html` with responsive meta tags

## **Task 1.2: Project Structure** ⏱️ 20 minutes
### **Subtask 1.2.1: Create Directory Structure** (10 min)
```
src/
├── lib/
│   ├── components/          # Svelte components
│   ├── stores/             # Svelte stores for state
│   ├── utils/              # Helper functions
│   ├── types/              # TypeScript types
│   └── ml/                 # ML-related code
├── routes/                 # SvelteKit routes
└── static/                # Static assets
    ├── models/            # ONNX models
    └── data/              # JSON classification data
```

### **Subtask 1.2.2: Create Base TypeScript Types** (10 min)
```typescript
// src/lib/types/index.ts
export interface Detection {
  bbox: [number, number, number, number];  // [x, y, width, height]
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
```

## **Task 1.3: Model Setup** ⏱️ 40 minutes
### **Subtask 1.3.1: Acquire YOLOv8n Model** (20 min)
```python
# Quick Python script to export model
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
model.export(format='onnx', imgsz=640, simplify=True)
```
- [ ] Install ultralytics: `pip install ultralytics`
- [ ] Run export script
- [ ] Copy `yolov8n.onnx` to `static/models/`
- [ ] Verify model size (~6MB)

### **Subtask 1.3.2: Create Classification Database** (20 min)
```json
// static/data/wasteData.json
{
  "classifications": {
    "bottle": {
      "category": "recycle",
      "instructions": "Remove cap and rinse",
      "tips": "Check local recycling guidelines",
      "color": "#22c55e"
    },
    "apple": {
      "category": "compost",
      "instructions": "Remove any stickers",
      "tips": "Can be composted whole",
      "color": "#84cc16"
    }
    // ... 50+ common items
  },
  "keywords": {
    "plastic": ["bottle", "container", "bag"],
    "food": ["apple", "banana", "orange"]
  }
}
```

---

# **📋 PHASE 2: CORE DETECTION SYSTEM**
**Duration:** 3.5 hours (10:30 AM - 2:00 PM)  
**Goal:** Working object detection and classification

## **Task 2.1: ONNX Runtime Integration** ⏱️ 45 minutes
### **Subtask 2.1.1: Create ML Service** (25 min)
```typescript
// src/lib/ml/detector.ts
import { InferenceSession, Tensor } from 'onnxruntime-web';

export class ObjectDetector {
  private session: InferenceSession | null = null;
  
  async initialize() {
    this.session = await InferenceSession.create('/models/yolov8n.onnx', {
      executionProviders: ['webgl', 'wasm']
    });
  }
  
  async detect(imageData: ImageData): Promise<Detection[]> {
    // Implementation details
  }
}
```

### **Subtask 2.1.2: Image Preprocessing Pipeline** (20 min)
- [ ] Canvas-based image resizing to 640x640
- [ ] RGB normalization and tensor conversion
- [ ] Batch dimension handling

## **Task 2.2: Real-Time Camera Pipeline** ⏱️ 90 minutes
### **Subtask 2.2.1: Camera Access Component** (30 min)
```svelte
<!-- src/lib/components/CameraFeed.svelte -->
<script lang="ts">
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let stream: MediaStream;
  
  onMount(async () => {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    videoElement.srcObject = stream;
  });
</script>

<video bind:this={videoElement} autoplay playsinline />
<canvas bind:this={canvasElement} />
```

### **Subtask 2.2.2: Detection Loop Implementation** (45 min)
- [ ] RequestAnimationFrame loop for smooth performance
- [ ] Frame capture from video element
- [ ] Async detection with worker-like performance
- [ ] Results caching to prevent flicker

### **Subtask 2.2.3: Bounding Box Rendering** (15 min)
- [ ] Canvas overlay for detection boxes
- [ ] Color-coded categories
- [ ] Responsive box scaling

## **Task 2.3: Post-Processing & NMS** ⏱️ 75 minutes
### **Subtask 2.3.1: YOLO Output Decoding** (45 min)
```typescript
function decodeDetections(output: Float32Array): Detection[] {
  const detections: Detection[] = [];
  const numDetections = output.length / 85; // 4 bbox + 1 conf + 80 classes
  
  for (let i = 0; i < numDetections; i++) {
    const conf = output[i * 85 + 4];
    if (conf > 0.5) {
      // Extract bbox and class information
      // Apply confidence filtering
    }
  }
  return detections;
}
```

### **Subtask 2.3.2: Non-Maximum Suppression** (30 min)
- [ ] IoU calculation function
- [ ] NMS algorithm implementation
- [ ] Confidence threshold tuning

---

# **📋 PHASE 3: USER INTERFACE DEVELOPMENT**
**Duration:** 2.5 hours (2:00 PM - 4:30 PM)  
**Goal:** Complete, responsive user interface

## **Task 3.1: Main Application Layout** ⏱️ 45 minutes
### **Subtask 3.1.1: App Shell Component** (25 min)
```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
</script>

<main class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
  <header class="navbar bg-base-100 shadow-lg">
    <div class="navbar-start">
      <h1 class="text-xl font-bold">🌱 EcoScan</h1>
    </div>
  </header>
  
  <slot />
</main>
```

### **Subtask 3.1.2: Home Page Design** (20 min)
- [ ] Hero section with feature cards
- [ ] Camera/Upload/Voice input buttons
- [ ] Responsive grid layout

## **Task 3.2: Camera Interface** ⏱️ 60 minutes
### **Subtask 3.2.1: Camera View Component** (40 min)
```svelte
<!-- src/lib/components/CameraView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { ObjectDetector } from '$lib/ml/detector';
  
  let detector = new ObjectDetector();
  let detections: Detection[] = [];
  let isLoading = true;
  
  // Real-time detection loop
</script>

<div class="relative w-full h-screen">
  <video class="w-full h-full object-cover" />
  <canvas class="absolute inset-0 pointer-events-none" />
  
  {#each detections as detection}
    <div class="absolute border-2 border-green-500 bg-green-500/20 rounded">
      <span class="bg-green-500 text-white px-2 py-1 text-sm">
        {detection.class} - {detection.category}
      </span>
    </div>
  {/each}
</div>
```

### **Subtask 3.2.2: Detection Results UI** (20 min)
- [ ] Floating result cards
- [ ] Tap-to-expand functionality
- [ ] Category color coding

## **Task 3.3: Upload Interface** ⏱️ 45 minutes
### **Subtask 3.3.1: File Upload Component** (25 min)
```svelte
<!-- src/lib/components/ImageUpload.svelte -->
<script>
  let files: FileList;
  let previewUrl: string;
  
  async function handleUpload() {
    if (files?.[0]) {
      previewUrl = URL.createObjectURL(files[0]);
      // Run detection on uploaded image
    }
  }
</script>

<div class="card bg-base-100 shadow-xl">
  <input type="file" accept="image/*" bind:files on:change={handleUpload} />
  {#if previewUrl}
    <img src={previewUrl} alt="Uploaded" class="w-full h-64 object-cover" />
  {/if}
</div>
```

### **Subtask 3.3.2: Results Display** (20 min)
- [ ] Image overlay with bounding boxes
- [ ] Results panel with classification details
- [ ] Share functionality

---

# **📋 PHASE 4: ADDITIONAL FEATURES**
**Duration:** 1.5 hours (4:30 PM - 6:00 PM)  
**Goal:** Voice input and enhanced functionality

## **Task 4.1: Voice Input System** ⏱️ 60 minutes
### **Subtask 4.1.1: Speech Recognition Component** (35 min)
```svelte
<!-- src/lib/components/VoiceInput.svelte -->
<script lang="ts">
  import { SpeechRecognition } from '$lib/utils/speech';
  
  let isRecording = false;
  let transcript = '';
  
  async function startRecording() {
    isRecording = true;
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      transcript = event.results[0][0].transcript;
      classifyVoiceInput(transcript);
    };
    recognition.start();
  }
</script>

<button 
  class="btn btn-primary btn-circle btn-lg"
  class:btn-error={isRecording}
  on:click={startRecording}
>
  🎤
</button>
```

### **Subtask 4.1.2: Voice Classification Logic** (25 min)
- [ ] Keyword extraction from speech
- [ ] Fuzzy matching with Fuse.js
- [ ] Confidence scoring
- [ ] Fallback to text input

## **Task 4.2: Data Management** ⏱️ 30 minutes
### **Subtask 4.2.1: Classification Store** (15 min)
```typescript
// src/lib/stores/classification.ts
import { writable } from 'svelte/store';
import type { WasteClassification } from '$lib/types';

export const classifications = writable<Record<string, WasteClassification>>({});
export const currentDetections = writable<Detection[]>([]);
```

### **Subtask 4.2.2: Local Storage Integration** (15 min)
- [ ] Save user preferences
- [ ] Cache classification results
- [ ] Offline capability foundation

---

# **📋 PHASE 5: POLISH & DEPLOYMENT**
**Duration:** 1 hour (6:00 PM - 7:00 PM)  
**Goal:** Production-ready application

## **Task 5.1: Performance Optimization** ⏱️ 30 minutes
### **Subtask 5.1.1: Code Optimization** (15 min)
- [ ] Bundle size analysis with `npm run build`
- [ ] Lazy loading for ML models
- [ ] Image optimization
- [ ] Remove console.logs

### **Subtask 5.1.2: Error Handling** (15 min)
```typescript
// Comprehensive error boundaries
try {
  await detector.initialize();
} catch (error) {
  console.error('Model loading failed:', error);
  // Fallback to simplified detection
}
```

## **Task 5.2: Deployment** ⏱️ 30 minutes
### **Subtask 5.2.1: Build Configuration** (10 min)
```javascript
// vite.config.js
export default {
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
};
```

### **Subtask 5.2.2: Vercel Deployment** (15 min)
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Deploy and test

### **Subtask 5.2.3: QR Code Generation** (5 min)
- [ ] Generate QR code for deployed URL
- [ ] Test on mobile devices
- [ ] Document sharing instructions

---

## **🎯 Success Criteria Checklist**

### **Core Functionality** ✅
- [ ] Camera access works on mobile devices
- [ ] Real-time object detection at >15 FPS
- [ ] Classification accuracy >80% on common items
- [ ] Voice input with speech recognition
- [ ] Image upload and analysis
- [ ] Results display with bounding boxes

### **Technical Requirements** ✅
- [ ] Page loads in <3 seconds
- [ ] Model loads in <5 seconds
- [ ] Responsive design on all screen sizes
- [ ] Works offline (basic functionality)
- [ ] No external API dependencies

### **User Experience** ✅
- [ ] Intuitive interface requiring no instructions
- [ ] Clear visual feedback for all actions
- [ ] Accessible color contrast and fonts
- [ ] Smooth animations and transitions

---

## **⚠️ Risk Mitigation Strategies**

### **If Running Behind Schedule:**
1. **Skip Phase 4:** Focus on camera + upload only
2. **Simplify UI:** Use default DaisyUI components
3. **Reduce Model Scope:** Use smaller object set (20 items)
4. **Skip PWA Features:** Deploy as regular web app

### **If Technical Issues Arise:**
1. **Model Loading Problems:** Use CDN-hosted model
2. **Performance Issues:** Reduce detection frequency
3. **Browser Compatibility:** Focus on Chrome/Safari only
4. **Camera Access:** Prioritize upload functionality

### **Quality Assurance Shortcuts:**
1. **Manual Testing:** Focus on mobile Chrome/Safari
2. **Error Handling:** Basic try/catch blocks
3. **Performance:** Monitor with browser DevTools
4. **Accessibility:** Test with keyboard navigation

---

## **📱 Testing Protocol (15 min per phase)**

### **Phase 2 Testing:**
- [ ] Model loads without errors
- [ ] Detection runs in browser console
- [ ] Basic object recognition works

### **Phase 3 Testing:**
- [ ] Camera permission request appears
- [ ] Video stream displays correctly
- [ ] Upload interface accepts files

### **Phase 4 Testing:**
- [ ] Voice recognition activates
- [ ] Classification results appear
- [ ] All features work together

### **Phase 5 Testing:**
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility
- [ ] Deployment success

---

## **🚀 Deployment Checklist**

### **Pre-Deployment:**
- [ ] All features tested locally
- [ ] Build completes without errors
- [ ] Model files accessible in production
- [ ] Environment variables configured

### **Post-Deployment:**
- [ ] Live URL accessible
- [ ] Camera permissions work on mobile
- [ ] Model loading successful
- [ ] QR code generates and works
- [ ] Share URL with stakeholders

**Expected Completion Time:** 8-10 hours  
**Minimum Viable Product:** Real-time camera detection with basic classification  
**Stretch Goals:** Voice input, offline capability, PWA installation 