<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ObjectDetector } from '$lib/ml/detector.js';
  import { WasteClassifier } from '$lib/ml/classifier.js';
  import { 
    detections, 
    selectedDetection, 
    setError, 
    setLoadingState,
    setCameraStream,
    stopCamera,
    permissionsGranted,
    updatePerformanceMetric
  } from '$lib/stores/appStore.js';
  import type { Detection, ModelConfig } from '$lib/types/index.js';

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let overlayCanvasElement: HTMLCanvasElement;
  let detector: ObjectDetector | null = null;
  let classifier: WasteClassifier | null = null;
  let animationId: number;
  let isDetecting = false;
  let lastFrameTime = 0;
  let frameCount = 0;

  const modelConfig: ModelConfig = {
    modelPath: '/models/yolov8n.onnx',
    inputSize: [640, 640],
    threshold: 0.5,
    iouThreshold: 0.4
  };

  onMount(async () => {
    await initializeML();
    await startCamera();
  });

  onDestroy(() => {
    cleanup();
  });

  async function initializeML() {
    setLoadingState(true);
    try {
      // Initialize the ML models
      detector = new ObjectDetector(modelConfig);
      classifier = new WasteClassifier();
      
      const startTime = performance.now();
      await Promise.all([
        detector.initialize(),
        classifier.initialize()
      ]);
      const loadTime = performance.now() - startTime;
      
      updatePerformanceMetric('modelLoadTime', loadTime);
      console.log(`🚀 Models loaded in ${loadTime.toFixed(0)}ms`);
    } catch (error) {
      setError(`Failed to load AI models: ${error}`);
      console.error('Model initialization error:', error);
    } finally {
      setLoadingState(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      videoElement.srcObject = stream;
      setCameraStream(stream);
      permissionsGranted.set(true);
      
      videoElement.addEventListener('loadedmetadata', () => {
        setupCanvas();
        startDetectionLoop();
      });

    } catch (error) {
      setError('Camera access denied. Please grant camera permissions and try again.');
      console.error('Camera access error:', error);
    }
  }

  function setupCanvas() {
    const { videoWidth, videoHeight } = videoElement;
    
    // Set canvas sizes to match video
    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;
    overlayCanvasElement.width = videoWidth;
    overlayCanvasElement.height = videoHeight;

    // Style canvases to fit container
    const containerRect = videoElement.getBoundingClientRect();
    overlayCanvasElement.style.position = 'absolute';
    overlayCanvasElement.style.top = '0';
    overlayCanvasElement.style.left = '0';
    overlayCanvasElement.style.width = '100%';
    overlayCanvasElement.style.height = '100%';
    overlayCanvasElement.style.pointerEvents = 'none';
  }

  function startDetectionLoop() {
    if (!detector || !classifier) return;

    const detectFrame = async () => {
      if (!isDetecting && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        isDetecting = true;
        const startTime = performance.now();

        try {
          // Capture frame from video
          const ctx = canvasElement.getContext('2d')!;
          ctx.drawImage(videoElement, 0, 0);
          
          // Get image data for detection
          const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
          
          // Run detection
          const detectedObjects = await detector!.detect(imageData);
          
          // Enhance detections with classification
          const enhancedDetections = detectedObjects.map(detection => {
            const classification = classifier!.classify(detection.class);
            return {
              ...detection,
              category: classification?.category || detection.category,
              confidence: Math.min(detection.confidence, classification?.confidence || detection.confidence)
            };
          });

          // Update store
          detections.set(enhancedDetections);
          
          // Draw detection boxes
          drawDetections(enhancedDetections);
          
          const inferenceTime = performance.now() - startTime;
          updatePerformanceMetric('inferenceTime', inferenceTime);
          
          // Calculate FPS
          const now = performance.now();
          frameCount++;
          if (now - lastFrameTime >= 1000) {
            updatePerformanceMetric('frameRate', frameCount);
            frameCount = 0;
            lastFrameTime = now;
          }

        } catch (error) {
          console.error('Detection error:', error);
        } finally {
          isDetecting = false;
        }
      }

      animationId = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  function drawDetections(detectedObjects: Detection[]) {
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
    const rect = overlayCanvasElement.getBoundingClientRect();
    const scaleX = overlayCanvasElement.width / rect.width;
    const scaleY = overlayCanvasElement.height / rect.height;
    
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Find clicked detection
    const clickedDetection = $detections.find(detection => {
      const [x, y, width, height] = detection.bbox;
      return clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height;
    });

    if (clickedDetection) {
      selectedDetection.set(clickedDetection);
    }
  }

  function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (detector) {
      detector.dispose();
    }
    stopCamera();
  }

  // Handle window resize
  function handleResize() {
    if (videoElement && videoElement.videoWidth) {
      setupCanvas();
    }
  }
</script>

<svelte:window on:resize={handleResize} />

<div class="relative w-full h-full min-h-[400px] bg-black rounded-2xl overflow-hidden">
  <!-- Video Element -->
  <video
    bind:this={videoElement}
    autoplay
    playsinline
    muted
    class="w-full h-full object-cover"
  />
  
  <!-- Hidden canvas for processing -->
  <canvas bind:this={canvasElement} class="hidden" />
  
  <!-- Overlay canvas for detections -->
  <canvas 
    bind:this={overlayCanvasElement}
    on:click={handleCanvasClick}
    class="absolute inset-0 cursor-pointer"
  />

  <!-- Loading overlay -->
  {#if !$permissionsGranted}
    <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="text-center text-white">
        <div class="loading-spinner w-12 h-12 mx-auto mb-4"></div>
        <p class="text-lg font-medium">Starting camera...</p>
        <p class="text-sm opacity-75">Please allow camera access</p>
      </div>
    </div>
  {/if}

  <!-- Detection count indicator -->
  {#if $detections.length > 0}
    <div class="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
      <span class="font-medium">{$detections.length} item{$detections.length !== 1 ? 's' : ''} detected</span>
    </div>
  {/if}

  <!-- Instructions overlay -->
  <div class="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
    <p class="text-sm">
      🎯 Point your camera at waste items to classify them.<br>
      📱 Tap on detected objects for disposal instructions.
    </p>
  </div>
</div>

<style>
  /* Ensure video maintains aspect ratio */
  video {
    object-fit: cover;
  }
</style> 