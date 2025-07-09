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
  import { getQRScanSupportMessage } from '$lib/utils/qr.js';
  import { isBrowser, isUserMediaSupported } from '$lib/utils/browser.js';

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
    if (!isBrowser()) {
      console.warn('CameraView skipping initialization during SSR');
      return;
    }
    
    await initializeML();
    await checkExistingPermissions();
  });

  onDestroy(() => {
    cleanup();
  });

  async function initializeML() {
    if (!isBrowser()) return;
    
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
    if (!isBrowser()) return;
    
    console.log('📷 Starting camera initialization...');
    setLoadingState(true);
    try {
      if (!isUserMediaSupported()) {
        setError('Camera access is not supported in this browser.');
        console.error('❌ Camera not supported');
        return;
      }
      
      console.log('📷 Checking available camera devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      console.log('📷 Found camera devices:', videoInputs.length);
      
      if (videoInputs.length === 0) {
        setError('No camera device found. Please connect a camera and try again.');
        console.error('❌ No camera devices found');
        return;
      }
      
      console.log('📷 Requesting camera stream...');
      // Try to get user media with enhanced constraints
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'environment' // Prefer rear camera on mobile
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Camera stream obtained successfully');
      console.log('📷 Stream details:', {
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        settings: stream.getVideoTracks()[0]?.getSettings()
      });
      
      // Validate stream
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('Invalid camera stream received');
      }
      
      setCameraStream(stream);
      videoElement.srcObject = stream;
      
      // Enhanced video element handling
      videoElement.onloadedmetadata = () => {
        console.log('📷 Video metadata loaded:', {
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          duration: videoElement.duration
        });
        videoElement.play().then(() => {
          console.log('✅ Video playback started successfully');
          // Additional validation
          if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            setError('Invalid video dimensions. Please check your camera.');
          }
        }).catch(err => {
          console.error('❌ Video playback failed:', err);
          setError('Failed to start video playback.');
        });
      };
      
      videoElement.onerror = (err) => {
        console.error('❌ Video element error:', err);
        setError('Video element error occurred.');
      };
      
      // Handle stream interruption with better logging
      stream.getVideoTracks()[0].onended = () => {
        console.warn('📷 Camera stream ended unexpectedly');
        setError('Camera stream was interrupted. Please refresh or re-enable your camera.');
        permissionsGranted.set(false);
      };
      
      // Monitor stream health
      const videoTrack = stream.getVideoTracks()[0];
      console.log('📷 Video track state:', videoTrack.readyState);
      console.log('📷 Video track settings:', videoTrack.getSettings());
      
    } catch (err: any) {
      console.error('❌ Camera initialization failed:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        constraint: err.constraint,
        stack: err.stack
      });
      
      if (err && err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please check if your device has a camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application. Please close other camera apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        console.warn('�� Camera constraints too restrictive, trying fallback...');
        // Try with minimal constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStream(fallbackStream);
          videoElement.srcObject = fallbackStream;
          videoElement.onloadedmetadata = () => videoElement.play();
          console.log('✅ Fallback camera stream successful');
        } catch (fallbackErr) {
          setError('Camera does not support the required settings. Please try a different camera.');
        }
      } else {
        setError('Failed to access camera: ' + (err?.message || err));
      }
    } finally {
      setLoadingState(false);
      console.log('📷 Camera initialization process completed');
    }
  }

  function setupCanvas() {
    if (!isBrowser() || !videoElement) return;
    
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

  function checkLowLightAndResolution() {
    if (!isBrowser() || !canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    // Calculate average brightness
    let total = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      total += 0.299 * imageData.data[i] + 0.587 * imageData.data[i+1] + 0.114 * imageData.data[i+2];
    }
    const avg = total / (imageData.data.length / 4);
    if (avg < 40) {
      setError('Low light detected. Please increase lighting for better detection.');
    }
    // Resolution check
    if (canvasElement.width < 320 || canvasElement.height < 240) {
      setError('Camera resolution too low for reliable detection.');
    }
    if (canvasElement.width > 1920 || canvasElement.height > 1080) {
      setError('Camera resolution too high. Please lower resolution for better performance.');
    }
  }

  function startDetectionLoop() {
    if (!isBrowser() || !detector || !classifier) return;

    const detectFrame = async () => {
      if (!isDetecting && videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
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

          checkLowLightAndResolution();

        } catch (error) {
          console.error('Detection error:', error);
        } finally {
          isDetecting = false;
        }
      }

      if (isBrowser()) {
        animationId = requestAnimationFrame(detectFrame);
      }
    };

    detectFrame();
  }

  function drawDetections(detectedObjects: Detection[]) {
    if (!isBrowser() || !overlayCanvasElement) return;
    
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
    if (!isBrowser() || !overlayCanvasElement) return;
    
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
    if (isBrowser() && animationId) {
      cancelAnimationFrame(animationId);
    }
    if (detector) {
      detector.dispose();
    }
    stopCamera();
  }

  // Handle window resize
  function handleResize() {
    if (!isBrowser()) return;
    
    if (videoElement && videoElement.videoWidth) {
      setupCanvas();
    }
  }

  // Start detection loop when video loads
  function handleVideoLoad() {
    if (!isBrowser()) return;
    
    setupCanvas();
    startDetectionLoop();
  }

  // Enhanced camera permission request
  async function requestCameraPermission() {
    if (!isBrowser()) return;
    
    console.log('📷 User requested camera permission');
    setError(null); // Clear any previous errors
    await startCamera();
  }

  // Retry camera initialization
  async function retryCamera() {
    if (!isBrowser()) return;
    
    console.log('📷 Retrying camera initialization');
    setError(null);
    permissionsGranted.set(false);
    await startCamera();
  }

  // Auto-start camera if permissions were previously granted
  async function checkExistingPermissions() {
    if (!isBrowser() || !navigator.permissions) return;
    
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('📷 Existing camera permission:', permissionStatus.state);
      
      if (permissionStatus.state === 'granted') {
        console.log('📷 Camera permission already granted, auto-starting...');
        await startCamera();
      }
      
      // Listen for permission changes
      permissionStatus.addEventListener('change', () => {
        console.log('📷 Camera permission changed to:', permissionStatus.state);
        if (permissionStatus.state === 'granted' && !$permissionsGranted) {
          startCamera();
        } else if (permissionStatus.state === 'denied') {
          setError('Camera permission was denied. Please enable camera access in your browser settings.');
          permissionsGranted.set(false);
        }
      });
    } catch (error) {
      console.warn('📷 Could not check existing camera permissions:', error);
      // Fallback: just show the permission request UI
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
    on:loadeddata={handleVideoLoad}
  />
  
  <!-- Hidden canvas for processing -->
  <canvas bind:this={canvasElement} class="hidden" />
  
  <!-- Overlay canvas for detections -->
  <canvas 
    bind:this={overlayCanvasElement}
    on:click={handleCanvasClick}
    class="absolute inset-0 cursor-pointer"
  />

  <!-- Loading overlay with enhanced UX -->
  {#if !$permissionsGranted}
    <div class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
      <div class="text-center text-white p-6 max-w-sm">
        {#if $isLoading}
          <div class="loading-spinner w-16 h-16 mx-auto mb-6"></div>
          <p class="text-xl font-medium mb-2">Starting camera...</p>
          <p class="text-sm opacity-75">Please wait while we initialize your camera</p>
        {:else}
          <!-- Permission request UI -->
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Camera Access Required</h3>
            <p class="text-sm opacity-90 leading-relaxed">
              EcoScan needs camera access to detect and classify waste items in real-time. 
              Your privacy is protected - images are processed locally and never uploaded.
            </p>
          </div>
          
          <button 
            class="btn btn-primary btn-lg w-full mb-4"
            on:click={requestCameraPermission}
            disabled={$isLoading}
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Enable Camera
          </button>
          
          <div class="text-xs opacity-70 space-y-1">
            <p>• Real-time waste detection</p>
            <p>• Completely private & secure</p>
            <p>• No data leaves your device</p>
          </div>
        {/if}
        
        {#if $error}
          <div class="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-sm">
            <p class="font-medium">⚠️ Camera Error</p>
            <p class="mt-1 opacity-90">{$error}</p>
            <button 
              class="btn btn-sm btn-outline mt-3"
              on:click={retryCamera}
            >
              Try Again
            </button>
          </div>
        {/if}
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