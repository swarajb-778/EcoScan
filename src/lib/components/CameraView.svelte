<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EnhancedDetector } from '../ml/enhanced-detector.js';
  import { performanceOptimizer } from '../utils/performance-optimizer.js';
  import { modelOptimizer } from '../utils/model-optimization.js';
  import type { Detection } from '../types/index.js';
  
  export let isActive = false;
  export let onDetections: (detections: Detection[]) => void = () => {};
  
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let stream: MediaStream | null = null;
  let detector: EnhancedDetector;
  let animationId: number;
  let isDetecting = false;
  let frameCount = 0;
  let detectionResults: Detection[] = [];
  let performanceMetrics = {
    fps: 0,
    inferenceTime: 0,
    memoryUsage: 0
  };
  
  // Enhanced camera settings
  let cameraConfig = {
    width: 640,
    height: 640,
    facingMode: 'environment' as 'user' | 'environment'
  };
  
  onMount(async () => {
    try {
      // Initialize enhanced detector with optimizations
      detector = new EnhancedDetector();
      await detector.initialize();
      
      // Initialize performance monitoring
      await performanceOptimizer.initialize();
      await modelOptimizer.initialize();
      
      if (isActive) {
        await startCamera();
      }
    } catch (error) {
      console.error('Failed to initialize camera:', error);
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
      const optimizationConfig = performanceOptimizer.getOptimizationConfig();
      
      // Use optimized resolution
      cameraConfig.width = optimizationConfig.inputResolution[0];
      cameraConfig.height = optimizationConfig.inputResolution[1];
      
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: cameraConfig.width },
          height: { ideal: cameraConfig.height },
          facingMode: cameraConfig.facingMode
        }
      });
      
      videoElement.srcObject = stream;
      videoElement.play();
      
      // Setup canvas context
      ctx = canvasElement.getContext('2d')!;
      canvasElement.width = cameraConfig.width;
      canvasElement.height = cameraConfig.height;
      
      // Start detection loop
      startDetectionLoop();
      
    } catch (error) {
      console.error('Camera access failed:', error);
    }
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
    
    const startTime = performance.now();
    frameCount++;
    
    try {
      // Get optimization config for frame skipping
      const config = performanceOptimizer.getOptimizationConfig();
      
      // Skip frames based on performance optimization
      if (frameCount % (config.frameSkipping + 1) !== 0) {
        animationId = requestAnimationFrame(detectFrame);
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, cameraConfig.width, cameraConfig.height);
      const imageData = ctx.getImageData(0, 0, cameraConfig.width, cameraConfig.height);
      
      // Run enhanced detection
      const detections = await detector.detect(imageData);
      
      // Update performance metrics
      const inferenceTime = performance.now() - startTime;
      performanceMetrics.inferenceTime = inferenceTime;
      performanceMetrics.fps = 1000 / (performance.now() - startTime);
      
      // Update performance optimizer
      performanceOptimizer.updateMetrics({
        inferenceTime,
        frameRate: performanceMetrics.fps
      });
      
      // Check for performance optimization needs
      await modelOptimizer.checkPerformanceAndOptimize();
      
      // Filter detections based on confidence threshold
      const filteredDetections = detections.filter(d => 
        d.confidence >= config.confidenceThreshold
      );
      
      // Limit number of detections
      detectionResults = filteredDetections.slice(0, config.maxDetections);
      
      // Draw detection visualizations
      drawDetections(detectionResults);
      
      // Notify parent component
      onDetections(detectionResults);
      
    } catch (error) {
      console.error('Detection failed:', error);
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
    const config = performanceOptimizer.getOptimizationConfig();
    const modelInfo = modelOptimizer.getModelInfo();
    
    // Performance metrics overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`FPS: ${performanceMetrics.fps.toFixed(1)}`, 15, 25);
    ctx.fillText(`Inference: ${performanceMetrics.inferenceTime.toFixed(1)}ms`, 15, 40);
    ctx.fillText(`Model: ${modelInfo.currentModel || 'loading...'}`, 15, 55);
    ctx.fillText(`Resolution: ${config.inputResolution[0]}x${config.inputResolution[1]}`, 15, 70);
    ctx.fillText(`Skip: ${config.frameSkipping}`, 15, 85);
    ctx.fillText(`Threshold: ${(config.confidenceThreshold * 100).toFixed(0)}%`, 15, 100);
    ctx.fillText(`Memory: ${performanceMetrics.memoryUsage.toFixed(1)}MB`, 15, 115);
  }
  
  function switchCamera() {
    cameraConfig.facingMode = cameraConfig.facingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera();
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
        >
          📷
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
  
  .control-btn:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.05);
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