<script lang="ts">
  import { onMount } from 'svelte';
  import { ObjectDetector } from '$lib/ml/detector.js';
  import { WasteClassifier } from '$lib/ml/classifier.js';
  import { 
    detections, 
    selectedDetection,
    setError,
    setLoadingState,
    updatePerformanceMetric
  } from '$lib/stores/appStore.js';
  import type { Detection, ModelConfig } from '$lib/types/index.js';
  import { isBrowser } from '$lib/utils/browser.js';

  let fileInput: HTMLInputElement;
  let previewImage: HTMLImageElement;
  let canvasElement: HTMLCanvasElement;
  let overlayCanvasElement: HTMLCanvasElement;
  let detector: ObjectDetector | null = null;
  let classifier: WasteClassifier | null = null;
  let isProcessing = false;
  let dragActive = false;
  let uploadedFile: File | null = null;
  let currentDetections: Detection[] = [];
  let mounted = false;
  let uploadProgress = 0;

  const modelConfig: ModelConfig = {
    modelPath: '/models/yolov8n.onnx',
    inputSize: [640, 640],
    threshold: 0.5,
    iouThreshold: 0.4
  };

  // Enhanced file validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
  const MAX_BATCH_SIZE = 5;

  onMount(async () => {
    if (!isBrowser()) {
      console.warn('ImageUpload skipping initialization during SSR');
      return;
    }
    
    mounted = true;
    await initializeML();
  });

  async function initializeML() {
    if (!mounted) return;
    
    setLoadingState(true);
    try {
      detector = new ObjectDetector(modelConfig);
      classifier = new WasteClassifier();
      
      await Promise.all([
        detector.initialize(),
        classifier.initialize()
      ]);
      
      console.log('🚀 Models initialized for image processing');
    } catch (error) {
      setError(`Failed to load AI models: ${error}`);
      console.error('Model initialization error:', error);
    } finally {
      setLoadingState(false);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }

  function handleDragLeave() {
    dragActive = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }

  function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Please select a valid image file.' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'Image file too large. Please select a file under 10MB.' };
    }

    // Check for supported formats
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format. Please use JPG, PNG, WebP, GIF, or BMP.' };
    }

    // Check for potential security issues
    if (file.name.length > 255) {
      return { valid: false, error: 'Filename too long.' };
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.js', '.html', '.php', '.asp'];
    const fileName = file.name.toLowerCase();
    if (suspiciousExtensions.some(ext => fileName.includes(ext))) {
      return { valid: false, error: 'File appears to be invalid or potentially unsafe.' };
    }

    return { valid: true };
  }

  function handleFile(file: File) {
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    uploadedFile = file;
    uploadProgress = 0;
    
    // Simulate upload progress for better UX
    const progressInterval = setInterval(() => {
      uploadProgress += 10;
      if (uploadProgress >= 90) {
        clearInterval(progressInterval);
      }
    }, 50);

    // Try to load image
    const reader = new FileReader();
    reader.onerror = () => {
      clearInterval(progressInterval);
      setError('Failed to read image file. The file may be corrupt.');
      uploadProgress = 0;
    };
    
    reader.onload = (e) => {
      clearInterval(progressInterval);
      uploadProgress = 100;
      
      const imageSrc = e.target?.result as string;
      previewImage.src = imageSrc;
      
      previewImage.onload = () => {
        // Validate image dimensions and aspect ratio
        const { naturalWidth, naturalHeight } = previewImage;
        
        if (naturalWidth < 64 || naturalHeight < 64) {
          setError('Image resolution too low. Minimum 64x64 pixels required.');
          return;
        }
        
        if (naturalWidth > 8192 || naturalHeight > 8192) {
          setError('Image resolution too high. Maximum 8192x8192 pixels supported.');
          return;
        }
        
        // Warn for extreme aspect ratios
        const aspectRatio = naturalWidth / naturalHeight;
        if (aspectRatio > 4 || aspectRatio < 0.25) {
          console.warn('Extreme aspect ratio detected. Detection may be less reliable.');
        }
        
        setupCanvas();
        processImage();
      };
      
      previewImage.onerror = () => {
        setError('Failed to load image. The file may be corrupt or unsupported.');
        uploadProgress = 0;
      };
    };
    
    reader.readAsDataURL(file);
  }

  function handleFiles(files: FileList) {
    if (files.length > MAX_BATCH_SIZE) {
      setError(`Batch upload limit exceeded. Please select up to ${MAX_BATCH_SIZE} images.`);
      return;
    }
    
    // For now, handle only the first file
    // Future enhancement: support batch processing
    if (files.length > 1) {
      console.warn('Multiple files selected. Processing first file only.');
    }
    
    handleFile(files[0]);
  }

  function setupCanvas() {
    if (!mounted || !previewImage) return;
    
    const { naturalWidth, naturalHeight } = previewImage;
    
    // Set canvas sizes to match image
    canvasElement.width = naturalWidth;
    canvasElement.height = naturalHeight;
    overlayCanvasElement.width = naturalWidth;
    overlayCanvasElement.height = naturalHeight;

    // Style overlay canvas to match preview image
    overlayCanvasElement.style.position = 'absolute';
    overlayCanvasElement.style.top = '0';
    overlayCanvasElement.style.left = '0';
    overlayCanvasElement.style.width = '100%';
    overlayCanvasElement.style.height = '100%';
    overlayCanvasElement.style.pointerEvents = 'auto';
  }

  async function processImage() {
    if (!detector || !classifier || !previewImage || !mounted) {
      return;
    }

    isProcessing = true;
    const startTime = performance.now();

    try {
      // Draw image to canvas
      const ctx = canvasElement.getContext('2d')!;
      ctx.drawImage(previewImage, 0, 0);
      
      // Get image data for detection
      const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
      
      // Run detection
      const detectedObjects = await detector.detect(imageData);
      
      // Enhance detections with classification
      const enhancedDetections = detectedObjects.map(detection => {
        const classification = classifier!.classify(detection.class);
        return {
          ...detection,
          category: classification?.category || detection.category,
          confidence: Math.min(detection.confidence, classification?.confidence || detection.confidence)
        };
      });

      currentDetections = enhancedDetections;
      detections.set(enhancedDetections);
      
      // Draw detection boxes
      drawDetections(enhancedDetections);
      
      const inferenceTime = performance.now() - startTime;
      updatePerformanceMetric('inferenceTime', inferenceTime);
      
      console.log(`🔍 Detected ${enhancedDetections.length} objects in ${inferenceTime.toFixed(0)}ms`);

    } catch (error) {
      console.error('Image processing error:', error);
      setError('Failed to process image. Please try again.');
    } finally {
      isProcessing = false;
    }
  }

  function drawDetections(detectedObjects: Detection[]) {
    if (!mounted || !overlayCanvasElement) return;
    
    const ctx = overlayCanvasElement.getContext('2d')!;
    ctx.clearRect(0, 0, overlayCanvasElement.width, overlayCanvasElement.height);

    detectedObjects.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      const category = detection.category;
      
      // Set colors based on category
      let color = '#ef4444'; // red for landfill
      if (category === 'recycle') color = '#22c55e'; // green
      if (category === 'compost') color = '#84cc16'; // lime

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, width, height);

      // Draw filled background for label
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;

      // Draw label background
      const label = `${detection.class} (${(detection.confidence * 100).toFixed(0)}%)`;
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const textMetrics = ctx.measureText(label);
      const labelHeight = 24;
      ctx.fillRect(x, y - labelHeight, textMetrics.width + 16, labelHeight);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 8, y - 6);

      // Draw category icon
      ctx.font = '16px Inter, sans-serif';
      const icon = category === 'recycle' ? '♻️' : category === 'compost' ? '🌱' : '🗑️';
      ctx.fillText(icon, x + width - 25, y + 20);
    });
  }

  function handleCanvasClick(event: MouseEvent) {
    if (!mounted || !overlayCanvasElement) return;
    
    const rect = overlayCanvasElement.getBoundingClientRect();
    const scaleX = overlayCanvasElement.width / rect.width;
    const scaleY = overlayCanvasElement.height / rect.height;
    
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Find clicked detection
    const clickedDetection = currentDetections.find(detection => {
      const [x, y, width, height] = detection.bbox;
      return clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height;
    });

    if (clickedDetection) {
      selectedDetection.set(clickedDetection);
    }
  }

  function clearImage() {
    uploadedFile = null;
    currentDetections = [];
    detections.set([]);
    selectedDetection.set(null);
    uploadProgress = 0;
    
    if (previewImage) {
      previewImage.src = '';
    }
    
    // Clear canvases
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d');
      ctx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
    if (overlayCanvasElement) {
      const ctx = overlayCanvasElement.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasElement.width, overlayCanvasElement.height);
    }
    
    // Reset file input
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function triggerFileSelect() {
    if (mounted && fileInput) {
      fileInput.click();
    }
  }

  function getFileSizeFormatted(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

{#if mounted}
<div class="max-w-4xl mx-auto space-y-6">
  <!-- Upload Interface -->
  <div class="card">
    <h2 class="text-2xl font-bold mb-4 flex items-center">
      <span class="text-2xl mr-2">📁</span>
      Image Upload Classification
    </h2>
    <p class="text-gray-600 mb-6">
      Upload or drag an image to analyze waste items
    </p>

    <!-- Drag and Drop Area -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="border-2 border-dashed rounded-xl p-8 text-center transition-colors
             {dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      role="button"
      tabindex="0"
      aria-label="Drag and drop image upload area"
    >
      {#if uploadedFile}
        <div class="space-y-4">
          <span class="text-4xl">✅</span>
          <p class="font-medium">{uploadedFile.name}</p>
          <p class="text-sm text-gray-500">
            {getFileSizeFormatted(uploadedFile.size)}
          </p>
          
          {#if uploadProgress > 0 && uploadProgress < 100}
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style="width: {uploadProgress}%"
              ></div>
            </div>
          {/if}
          
          <div class="flex space-x-3 justify-center">
            <button on:click={triggerFileSelect} class="btn-secondary">
              📁 Choose Different
            </button>
            <button on:click={clearImage} class="btn-secondary">
              🗑️ Clear
            </button>
          </div>
        </div>
      {:else}
        <div class="space-y-4">
          <span class="text-6xl">📎</span>
          <div>
            <p class="text-lg font-medium mb-2">
              Drop your image here, or 
              <button on:click={triggerFileSelect} class="text-blue-600 hover:text-blue-700 underline">
                browse
              </button>
            </p>
            <p class="text-sm text-gray-500">
              Supports JPG, PNG, WebP • Max {getFileSizeFormatted(MAX_FILE_SIZE)} • Up to {MAX_BATCH_SIZE} files
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Hidden file input -->
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      multiple
      on:change={handleFileSelect}
      class="hidden"
    />
  </div>

  <!-- Image Preview and Results -->
  {#if uploadedFile}
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold flex items-center">
          <span class="text-xl mr-2">🔍</span>
          Detection Results
        </h3>
        {#if isProcessing}
          <div class="flex items-center space-x-2 text-blue-600">
            <div class="loading-spinner w-5 h-5"></div>
            <span class="text-sm">Processing...</span>
          </div>
        {:else if currentDetections.length > 0}
          <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {currentDetections.length} item{currentDetections.length !== 1 ? 's' : ''} detected
          </span>
        {/if}
      </div>

      <!-- Image with Overlay -->
      <div class="relative bg-gray-100 rounded-xl overflow-hidden">
        <img
          bind:this={previewImage}
          alt="Uploaded for analysis"
          class="w-full h-auto max-h-96 object-contain"
        />
        
        <!-- Hidden processing canvas -->
        <canvas bind:this={canvasElement} class="hidden" />
        
        <!-- Overlay canvas for detections -->
        <canvas 
          bind:this={overlayCanvasElement}
          on:click={handleCanvasClick}
          class="absolute inset-0 cursor-pointer"
        />

        {#if isProcessing}
          <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div class="text-center text-white">
              <div class="loading-spinner w-12 h-12 mx-auto mb-4"></div>
              <p class="font-medium">Analyzing image...</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Detection Summary -->
      {#if currentDetections.length > 0}
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each currentDetections as detection, index}
            <button 
              on:click={() => selectedDetection.set(detection)}
              class="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-2xl">
                  {detection.category === 'recycle' ? '♻️' : detection.category === 'compost' ? '🌱' : '🗑️'}
                </span>
                <span class="text-sm text-gray-500">
                  {(detection.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p class="font-medium capitalize">{detection.class}</p>
              <p class="text-sm text-gray-600 capitalize">{detection.category}</p>
            </button>
          {/each}
        </div>
      {:else if !isProcessing && uploadedFile}
        <div class="mt-6 text-center py-8">
          <span class="text-4xl mb-3 block">🤔</span>
          <h4 class="text-lg font-semibold mb-2">No Items Detected</h4>
          <p class="text-gray-600 text-sm">
            Try uploading a clearer image with visible waste items.
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Tips and Guidelines -->
  <div class="card">
    <h3 class="text-lg font-semibold mb-4 flex items-center">
      <span class="text-xl mr-2">💡</span>
      Tips for Better Results
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900">Image Quality</h4>
        <ul class="space-y-1 text-gray-600">
          <li>• Use good lighting</li>
          <li>• Avoid blurry images</li>
          <li>• Clear, unobstructed view</li>
        </ul>
      </div>
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900">Object Placement</h4>
        <ul class="space-y-1 text-gray-600">
          <li>• Items separated, not overlapping</li>
          <li>• Center objects in frame</li>
          <li>• Avoid cluttered backgrounds</li>
        </ul>
      </div>
    </div>
  </div>
</div>
{:else}
  <div class="max-w-4xl mx-auto">
    <div class="alert alert-info">
      <span>Image upload component is initializing...</span>
    </div>
  </div>
{/if} 