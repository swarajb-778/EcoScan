<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ObjectDetector } from '../ml/detector.js';
  import { WasteClassifier } from '../ml/classifier.js';
  import type { Detection, ModelConfig, CameraConfig } from '../types/index.js';
  
  export let isActive = false;
  export let onDetections: (detections: Detection[]) => void = () => {};
  export let onCapturePhoto: (imageData: ImageData) => void = () => {};
  
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let captureCanvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let stream: MediaStream | null = null;
  let detector: ObjectDetector;
  let classifier: WasteClassifier;
  let animationId: number;
  let isDetecting = false;
  let isInitializing = false;
  let frameCount = 0;
  let detectionResults: Detection[] = [];
  let lastFrameTime = 0;
  let isCapturing = false;
  
  // Performance metrics
  let performanceMetrics = {
    fps: 0,
    inferenceTime: 0,
    memoryUsage: 0,
    cameraInitTime: 0
  };
  
  // Simplified camera configuration
  let cameraConfig: CameraConfig = {
    facingMode: 'environment',
    width: 640,
    height: 640
  };
  
  // Model configuration for reliable detection
  const modelConfig: ModelConfig = {
    modelPath: '/models/yolov8n.onnx',
    inputSize: [640, 640],
    threshold: 0.5,
    iouThreshold: 0.4
  };
  
  onMount(async () => {
    try {
      isInitializing = true;
      console.log('🎥 Initializing camera system...');
      
      const initStartTime = performance.now();
      
      // Initialize reliable detector and classifier
      detector = new ObjectDetector(modelConfig);
      classifier = new WasteClassifier();
      
      await Promise.all([
        detector.initialize(),
        classifier.initialize()
      ]);
      
      performanceMetrics.cameraInitTime = performance.now() - initStartTime;
      console.log(`✅ Camera system initialized in ${performanceMetrics.cameraInitTime.toFixed(1)}ms`);
      
      if (isActive) {
        await startCamera();
      }
    } catch (error) {
      console.error('❌ Failed to initialize camera system:', error);
    } finally {
      isInitializing = false;
    }
  });
  
  onDestroy(() => {
    stopCamera();
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    detector?.dispose();
  });
  
  async function startCamera() {
    try {
      console.log('📹 Starting camera...');
      
      // Request camera access with optimal settings
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: cameraConfig.width },
          height: { ideal: cameraConfig.height },
          facingMode: cameraConfig.facingMode
        }
      });
      
      if (!videoElement) {
        throw new Error('Video element not available');
      }
      
      videoElement.srcObject = stream;
      await videoElement.play();
      
      // Setup canvas context for detection overlay
      ctx = canvasElement.getContext('2d')!;
      canvasElement.width = cameraConfig.width;
      canvasElement.height = cameraConfig.height;
      
      console.log('✅ Camera started successfully');
      
      // Start detection loop
      startDetectionLoop();
      
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      handleCameraError(error);
    }
  }
  
  function handleCameraError(error: any) {
    let errorMessage = 'Camera access failed';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied. Please allow camera access.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found. Please connect a camera.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is being used by another application.';
    }
    
    console.error('Camera error:', errorMessage);
    // You could dispatch an error event here for the parent component
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    isDetecting = false;
  }
  
  function startDetectionLoop() {
    isDetecting = true;
    detectFrame();
  }
  
  async function detectFrame() {
    if (!isDetecting || !videoElement || videoElement.readyState !== 4) {
      if (isDetecting) {
        animationId = requestAnimationFrame(detectFrame);
      }
      return;
    }
    
    const currentTime = performance.now();
    frameCount++;
    
    // Simple frame rate limiting (aim for ~15 FPS for performance)
    if (currentTime - lastFrameTime < 66) { // 66ms = ~15 FPS
      animationId = requestAnimationFrame(detectFrame);
      return;
    }
    
    lastFrameTime = currentTime;
    const startTime = performance.now();
    
    try {
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, cameraConfig.width, cameraConfig.height);
      const imageData = ctx.getImageData(0, 0, cameraConfig.width, cameraConfig.height);
      
      // Run detection with reliable ObjectDetector
      const detections = await detector.detect(imageData);
      
      // Enhance detections with classification
      const enhancedDetections = detections.map(detection => {
        const classification = classifier.classify(detection.class);
        return {
          ...detection,
          category: classification?.category || detection.category,
          confidence: Math.min(detection.confidence, classification?.confidence || detection.confidence),
          instructions: classification?.instructions || detection.instructions
        };
      });
      
      // Update performance metrics
      const inferenceTime = performance.now() - startTime;
      performanceMetrics.inferenceTime = inferenceTime;
      performanceMetrics.fps = frameCount / ((currentTime - (frameCount * 66)) / 1000);
      
      // Filter detections based on confidence threshold
      const filteredDetections = enhancedDetections.filter(d => 
        d.confidence >= modelConfig.threshold
      );
      
      // Limit number of detections for performance
      detectionResults = filteredDetections.slice(0, 10);
      
      // Draw detection visualizations
      drawDetections(detectionResults);
      
      // Notify parent component
      onDetections(detectionResults);
      
    } catch (error) {
      console.error('❌ Detection failed:', error);
    }
    
    // Continue detection loop
    if (isDetecting) {
      animationId = requestAnimationFrame(detectFrame);
    }
  }
  
  function drawDetections(detections: Detection[]) {
    // Clear previous drawings
    ctx.clearRect(0, 0, cameraConfig.width, cameraConfig.height);
    ctx.drawImage(videoElement, 0, 0, cameraConfig.width, cameraConfig.height);
    
    // Draw detection boxes and labels
    detections.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      
             // Choose color based on confidence
       const confidence = (detection as any).confidenceCalibrated || detection.confidence;
      const color = confidence > 0.8 ? '#22c55e' : confidence > 0.6 ? '#f59e0b' : '#ef4444';
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      const label = `${detection.class} (${(confidence * 100).toFixed(0)}%)`;
      const textMetrics = ctx.measureText(label);
      const labelHeight = 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y - labelHeight, textMetrics.width + 10, labelHeight);
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(label, x + 5, y - 5);
      
             // Draw enhanced features if available
       if ((detection as any).llmContext) {
         ctx.fillStyle = '#8b5cf6';
         ctx.font = '12px sans-serif';
         ctx.fillText('🤖 Enhanced', x, y + height + 15);
       }
       
       if ((detection as any).ensembleScore && (detection as any).ensembleScore > detection.confidence) {
         ctx.fillStyle = '#06b6d4';
         ctx.font = '12px sans-serif';
         ctx.fillText(`⚡ ${((detection as any).ensembleScore * 100).toFixed(0)}%`, x, y + height + 30);
       }
    });
    
    // Draw performance overlay
    drawPerformanceOverlay();
  }
  
  function drawPerformanceOverlay() {
    // Simplified performance metrics overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`FPS: ${performanceMetrics.fps.toFixed(1)}`, 15, 25);
    ctx.fillText(`Inference: ${performanceMetrics.inferenceTime.toFixed(1)}ms`, 15, 40);
    ctx.fillText(`Model: YOLOv8n`, 15, 55);
    ctx.fillText(`Resolution: ${cameraConfig.width}x${cameraConfig.height}`, 15, 70);
    ctx.fillText(`Threshold: ${(modelConfig.threshold * 100).toFixed(0)}%`, 15, 85);
  }
  
  function switchCamera() {
    cameraConfig.facingMode = cameraConfig.facingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera();
  }
  
  // Photo capture functionality
  async function capturePhoto() {
    if (!videoElement || !ctx || isCapturing) return;
    
    isCapturing = true;
    console.log('📸 Capturing photo...');
    
    try {
      // Create capture canvas for photo analysis
      if (!captureCanvas) {
        captureCanvas = document.createElement('canvas');
      }
      
      captureCanvas.width = cameraConfig.width;
      captureCanvas.height = cameraConfig.height;
      const captureCtx = captureCanvas.getContext('2d')!;
      
      // Capture current video frame
      captureCtx.drawImage(videoElement, 0, 0, cameraConfig.width, cameraConfig.height);
      const capturedImageData = captureCtx.getImageData(0, 0, cameraConfig.width, cameraConfig.height);
      
      // Stop live detection temporarily
      const wasDetecting = isDetecting;
      isDetecting = false;
      
      // Analyze the captured photo
      await analyzePhoto(capturedImageData);
      
      // Notify parent component
      onCapturePhoto(capturedImageData);
      
      // Resume live detection if it was running
      if (wasDetecting) {
        setTimeout(() => {
          isDetecting = true;
          detectFrame();
        }, 1000); // Brief pause to show capture effect
      }
      
      console.log('✅ Photo captured and analyzed');
      
    } catch (error) {
      console.error('❌ Photo capture failed:', error);
    } finally {
      isCapturing = false;
    }
  }
  
  async function analyzePhoto(imageData: ImageData) {
    if (!detector || !classifier) return;
    
    console.log('🔍 Analyzing captured photo...');
    const startTime = performance.now();
    
    try {
      // Run detection on captured image
      const detections = await detector.detect(imageData);
      
      // Enhance detections with classification
      const enhancedDetections = detections.map(detection => {
        const classification = classifier.classify(detection.class);
        return {
          ...detection,
          category: classification?.category || detection.category,
          confidence: Math.min(detection.confidence, classification?.confidence || detection.confidence),
          instructions: classification?.instructions || detection.instructions
        };
      });
      
      const analysisTime = performance.now() - startTime;
      console.log(`✅ Photo analysis complete in ${analysisTime.toFixed(1)}ms - Found ${enhancedDetections.length} items`);
      
      // Update detection results with photo analysis
      detectionResults = enhancedDetections.filter(d => d.confidence >= modelConfig.threshold);
      
      // Draw results on camera overlay
      drawDetections(detectionResults);
      
      // Notify parent with results
      onDetections(detectionResults);
      
    } catch (error) {
      console.error('❌ Photo analysis failed:', error);
    }
  }
  
  // Update performance metrics periodically
  setInterval(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      performanceMetrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024);
    }
  }, 1000);
  
  // Reactive updates when isActive changes
  $: if (isActive && videoElement) {
    startCamera();
  } else if (!isActive) {
    stopCamera();
  }
  
  // Function to activate camera
  function activateCamera() {
    isActive = true;
  }
  
  // Handle keyboard activation
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateCamera();
    }
  }
</script>

<div class="camera-container">
  {#if isActive}
    <div class="camera-view">
      <video
        bind:this={videoElement}
        autoplay
        muted
        playsinline
        class="video-feed"
      />
      <canvas
        bind:this={canvasElement}
        class="detection-overlay"
      />
      
      <div class="camera-controls">
        <button 
          class="control-btn switch-camera"
          on:click={switchCamera}
          aria-label="Switch camera"
          disabled={isCapturing}
        >
          🔄
        </button>
        
        <button 
          class="capture-btn"
          on:click={capturePhoto}
          aria-label="Capture photo for analysis"
          disabled={isCapturing || isInitializing}
          class:capturing={isCapturing}
        >
          {#if isCapturing}
            📷✨
          {:else}
            📸
          {/if}
        </button>
        
        <div class="detection-info">
          <span class="detection-count">
            {detectionResults.length} items detected
          </span>
        </div>
      </div>
    </div>
  {:else}
    <div class="camera-placeholder" on:click={activateCamera} on:keydown={handleKeydown} role="button" tabindex="0" aria-label="Start camera detection">
      <div class="placeholder-content">
        <div class="camera-icon">📹</div>
        <h3>Camera Ready</h3>
        <p>Tap to start detecting waste items</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .camera-container {
    position: relative;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
  }
  
  .camera-view {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
  }
  
  .video-feed {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .detection-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  
  .camera-controls {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .control-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .control-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.05);
  }
  
  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .capture-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border: 3px solid white;
    font-size: 28px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .capture-btn:hover:not(:disabled) {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
  
  .capture-btn:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  .capture-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .capture-btn.capturing {
    animation: capture-pulse 0.5s ease-in-out;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }
  
  @keyframes capture-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  .detection-info {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
  }
  
  .camera-placeholder {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .camera-placeholder:hover {
    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
    transform: scale(1.02);
  }
  
  .camera-placeholder:active {
    transform: scale(0.98);
  }
  
  .placeholder-content {
    text-align: center;
  }
  
  .camera-icon {
    font-size: 64px;
    margin-bottom: 16px;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .placeholder-content h3 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
  }
  
  .placeholder-content p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    .camera-container {
      border-radius: 0;
    }
    
    .camera-controls {
      bottom: env(safe-area-inset-bottom, 16px);
    }
  }
</style> 