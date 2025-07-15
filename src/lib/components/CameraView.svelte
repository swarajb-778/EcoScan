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
  
  // Camera device management
  let availableCameras: MediaDeviceInfo[] = [];
  let selectedCameraId: string | null = null;
  let showCameraSelector = false;
  
  // Enhanced camera error state management
  let cameraError: string | null = null;
  let permissionState: 'unknown' | 'granted' | 'denied' | 'prompt' = 'unknown';
  let retryCount = 0;
  const MAX_RETRY_ATTEMPTS = 3;
  
  // Performance metrics
  let performanceMetrics = {
    fps: 0,
    inferenceTime: 0,
    memoryUsage: 0,
    cameraInitTime: 0
  };
  
  // Enhanced camera configuration with device support
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
  
  // Detect available camera devices
  async function detectCameraDevices(): Promise<MediaDeviceInfo[]> {
    try {
      console.log('🔍 Detecting camera devices...');
      
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`📱 Found ${cameras.length} camera devices:`, cameras);
      
      return cameras;
    } catch (error) {
      console.error('❌ Camera device detection failed:', error);
      return [];
    }
  }
  
  // Initialize camera device list
  async function initializeCameraDevices() {
    availableCameras = await detectCameraDevices();
    
    if (availableCameras.length === 0) {
      cameraError = 'No camera devices found. Please connect a camera.';
      return;
    }
    
    // Select default camera (prefer environment camera on mobile)
    const environmentCamera = availableCameras.find(camera => 
      camera.label.toLowerCase().includes('back') || 
      camera.label.toLowerCase().includes('environment')
    );
    
    const frontCamera = availableCameras.find(camera => 
      camera.label.toLowerCase().includes('front') || 
      camera.label.toLowerCase().includes('user')
    );
    
    // Prefer environment camera for waste detection
    selectedCameraId = environmentCamera?.deviceId || frontCamera?.deviceId || availableCameras[0]?.deviceId;
    
    console.log(`📹 Selected camera: ${getCameraLabel(selectedCameraId)}`);
  }
  
  function getCameraLabel(deviceId: string | null): string {
    if (!deviceId) return 'Unknown Camera';
    
    const camera = availableCameras.find(c => c.deviceId === deviceId);
    if (!camera) return 'Unknown Camera';
    
    // Clean up camera labels for better display
    let label = camera.label || 'Camera';
    
    // Simplify common camera labels
    if (label.includes('back') || label.includes('environment')) {
      label = '📷 Back Camera';
    } else if (label.includes('front') || label.includes('user')) {
      label = '🤳 Front Camera';
    } else if (label.includes('USB')) {
      label = '🖥️ USB Camera';
    }
    
    return label;
  }
  
  // Enhanced camera switching with device selection
  async function switchCamera(targetCameraId?: string) {
    if (availableCameras.length <= 1) return;
    
    try {
      console.log('🔄 Switching camera...');
      
      // Stop current stream
      stopCamera();
      
      if (targetCameraId) {
        selectedCameraId = targetCameraId;
      } else {
        // Cycle through available cameras
        const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCameraId);
        const nextIndex = (currentIndex + 1) % availableCameras.length;
        selectedCameraId = availableCameras[nextIndex].deviceId;
      }
      
      console.log(`📹 Switching to: ${getCameraLabel(selectedCameraId)}`);
      
      // Restart camera with new device
      await startCamera();
      
    } catch (error) {
      console.error('❌ Camera switch failed:', error);
      cameraError = 'Failed to switch camera. Please try again.';
    }
  }
  
  function toggleCameraSelector() {
    showCameraSelector = !showCameraSelector;
  }
  
  // Device capability and resolution optimization
  let deviceCapabilities = {
    maxResolution: { width: 1920, height: 1080 },
    supportedResolutions: [] as { width: number; height: number; label: string }[],
    performance: 'medium' as 'low' | 'medium' | 'high',
    hasFlash: false,
    hasZoom: false,
    preferredFrameRate: 30
  };
  
  // Resolution options for different devices
  const resolutionPresets = {
    '480p': { width: 640, height: 480, label: '480p (Fast)' },
    '720p': { width: 1280, height: 720, label: '720p (Balanced)' },
    '1080p': { width: 1920, height: 1080, label: '1080p (Quality)' }
  };
  
  // Detect device capabilities and optimal settings
  async function detectDeviceCapabilities() {
    if (!selectedCameraId) return;
    
    console.log('🔧 Detecting device capabilities...');
    
    try {
      const camera = availableCameras.find(c => c.deviceId === selectedCameraId);
      if (!camera) return;
      
      // Test different resolutions to find supported ones
      const testResolutions = [
        { width: 320, height: 240, label: '240p' },
        { width: 640, height: 480, label: '480p' },
        { width: 1280, height: 720, label: '720p' },
        { width: 1920, height: 1080, label: '1080p' }
      ];
      
      const supported = [];
      
      for (const resolution of testResolutions) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: selectedCameraId },
              width: { exact: resolution.width },
              height: { exact: resolution.height }
            }
          });
          
          testStream.getTracks().forEach(track => track.stop());
          supported.push(resolution);
          console.log(`✅ Supported: ${resolution.label}`);
          
        } catch (error) {
          console.log(`❌ Not supported: ${resolution.label}`);
        }
      }
      
      deviceCapabilities.supportedResolutions = supported;
      deviceCapabilities.maxResolution = supported[supported.length - 1] || { width: 640, height: 480 };
      
      // Detect device performance tier
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mobile') || userAgent.includes('android')) {
        deviceCapabilities.performance = 'medium';
        deviceCapabilities.preferredFrameRate = 15;
      } else {
        deviceCapabilities.performance = 'high';
        deviceCapabilities.preferredFrameRate = 30;
      }
      
      // Check for advanced features
      if (typeof (navigator.mediaDevices as any).getSupportedConstraints === 'function') {
        const constraints = (navigator.mediaDevices as any).getSupportedConstraints();
        deviceCapabilities.hasFlash = constraints.torch || false;
        deviceCapabilities.hasZoom = constraints.zoom || false;
      }
      
      console.log('📊 Device capabilities:', deviceCapabilities);
      
    } catch (error) {
      console.error('❌ Capability detection failed:', error);
    }
  }
  
  // Get optimal resolution based on device capabilities
  function getOptimalResolution(): { width: number; height: number } {
    const { performance, supportedResolutions } = deviceCapabilities;
    
    if (supportedResolutions.length === 0) {
      return { width: 640, height: 480 }; // Safe default
    }
    
    switch (performance) {
      case 'low':
        return supportedResolutions[0] || { width: 320, height: 240 };
      case 'medium':
        const midIndex = Math.floor(supportedResolutions.length / 2);
        return supportedResolutions[midIndex] || { width: 640, height: 480 };
      case 'high':
        return supportedResolutions[supportedResolutions.length - 1] || { width: 1280, height: 720 };
      default:
        return { width: 640, height: 480 };
    }
  }
  
  // Adaptive quality adjustment
  function adjustQualityBasedOnPerformance() {
    const avgInferenceTime = performanceMetrics.inferenceTime;
    const currentFPS = performanceMetrics.fps;
    
    // If performance is poor, reduce quality
    if (avgInferenceTime > 200 || currentFPS < 10) {
      console.log('📉 Poor performance detected, reducing quality...');
      
      const currentRes = getOptimalResolution();
      const lowerResIndex = deviceCapabilities.supportedResolutions.findIndex(
        r => r.width === currentRes.width && r.height === currentRes.height
      ) - 1;
      
      if (lowerResIndex >= 0) {
        const newRes = deviceCapabilities.supportedResolutions[lowerResIndex];
        cameraConfig.width = newRes.width;
        cameraConfig.height = newRes.height;
        console.log(`📉 Reduced resolution to ${newRes.width}x${newRes.height}`);
        
        // Restart camera with new settings
        setTimeout(() => restartCameraWithNewSettings(), 1000);
      }
    }
    
    // If performance is excellent, try higher quality
    if (avgInferenceTime < 50 && currentFPS > 25) {
      console.log('📈 Excellent performance, considering quality upgrade...');
      
      const currentRes = getOptimalResolution();
      const higherResIndex = deviceCapabilities.supportedResolutions.findIndex(
        r => r.width === currentRes.width && r.height === currentRes.height
      ) + 1;
      
      if (higherResIndex < deviceCapabilities.supportedResolutions.length) {
        const newRes = deviceCapabilities.supportedResolutions[higherResIndex];
        cameraConfig.width = newRes.width;
        cameraConfig.height = newRes.height;
        console.log(`📈 Increased resolution to ${newRes.width}x${newRes.height}`);
        
        // Restart camera with new settings
        setTimeout(() => restartCameraWithNewSettings(), 1000);
      }
    }
  }
  
  // Restart camera with new settings
  async function restartCameraWithNewSettings() {
    if (streamStatus !== 'active') return;
    
    console.log('🔄 Restarting camera with new settings...');
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 500));
    await startCamera();
  }
  
  // Enhanced camera constraints with optimization
  function getCameraConstraints() {
    const optimalRes = getOptimalResolution();
    
    const baseConstraints = {
      width: { ideal: optimalRes.width },
      height: { ideal: optimalRes.height },
      frameRate: { ideal: deviceCapabilities.preferredFrameRate }
    };
    
    // Use specific device if selected
    if (selectedCameraId) {
      return {
        ...baseConstraints,
        deviceId: { exact: selectedCameraId }
      };
    }
    
    // Fallback to facing mode
    return {
      ...baseConstraints,
      facingMode: cameraConfig.facingMode
    };
  }
  
  // Check camera permissions
  async function checkCameraPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'prompt'; // Fallback for browsers without Permissions API
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return permission.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      console.warn('Permissions API not supported:', error);
      return 'prompt';
    }
  }
  
  // Request camera permission with detailed error handling
  async function requestCameraPermission(): Promise<boolean> {
    try {
      console.log('🔐 Requesting camera permission...');
      
      // Check current permission state
      permissionState = await checkCameraPermissions();
      console.log('Current permission state:', permissionState);
      
      if (permissionState === 'denied') {
        cameraError = 'Camera access denied. Please enable camera permissions in your browser settings.';
        return false;
      }
      
             // Try to get camera access with device-specific constraints
       const videoConstraints = getCameraConstraints();
       const constraints = { video: videoConstraints };
       
       stream = await navigator.mediaDevices.getUserMedia(constraints);
      permissionState = 'granted';
      cameraError = null;
      console.log('✅ Camera permission granted');
      return true;
      
    } catch (error: any) {
      console.error('❌ Camera permission failed:', error);
      handleCameraPermissionError(error);
      return false;
    }
  }
  
  function handleCameraPermissionError(error: any) {
    permissionState = 'denied';
    retryCount++;
    
    switch (error.name) {
      case 'NotAllowedError':
        cameraError = 'Camera access denied. Please click "Allow" when prompted, or enable camera permissions in your browser settings.';
        break;
      case 'NotFoundError':
        cameraError = 'No camera device found. Please connect a camera and try again.';
        break;
      case 'NotReadableError':
        cameraError = 'Camera is being used by another application. Please close other camera apps and try again.';
        break;
      case 'OverconstrainedError':
        cameraError = 'Camera constraints not supported. Trying with default settings...';
        // Retry with relaxed constraints
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          setTimeout(() => startCameraWithFallback(), 1000);
        }
        break;
      case 'SecurityError':
        cameraError = 'Camera access blocked due to security policy. Please ensure you\'re using HTTPS or localhost.';
        break;
      case 'AbortError':
        cameraError = 'Camera access was interrupted. Please try again.';
        break;
      default:
        cameraError = `Camera access failed: ${error.message || 'Unknown error'}. Please check your camera and try again.`;
    }
  }
  
  // Fallback camera initialization with reduced constraints
  async function startCameraWithFallback() {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      cameraError = 'Unable to access camera after multiple attempts. Please check your device settings.';
      return;
    }
    
    console.log(`🔄 Attempting camera fallback (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
    
    const fallbackConstraints = [
      // Try with any camera
      { video: { facingMode: cameraConfig.facingMode } },
      // Try with any resolution
      { video: { width: 320, height: 240 } },
      // Try with absolute minimal constraints
      { video: true }
    ];
    
    for (const constraints of fallbackConstraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraError = null;
        console.log('✅ Camera fallback successful');
        return await completeCameraSetup();
      } catch (error) {
        console.warn('Fallback attempt failed:', error);
      }
    }
    
    // All fallbacks failed
    cameraError = 'Unable to access camera with any configuration. Please check device permissions and hardware.';
  }
  
  // Complete camera setup after stream is available
  async function completeCameraSetup() {
    if (!stream || !videoElement) return;
    
    try {
      // Setup canvas context for detection overlay
      ctx = canvasElement.getContext('2d')!;
      
      // Use enhanced stream setup with monitoring
      await setupCameraStream();
      
      console.log('✅ Camera setup completed successfully');
      
      // Start detection loop
      startDetectionLoop();
      
    } catch (error) {
      console.error('❌ Camera setup failed:', error);
      cameraError = 'Failed to initialize camera display. Please refresh the page.';
      streamStatus = 'failed';
    }
  }
  
  function clearCameraError() {
    cameraError = null;
    retryCount = 0;
  }
  
  async function retryCamera() {
    clearCameraError();
    await startCamera();
  }
  
  onMount(async () => {
    try {
      isInitializing = true;
      console.log('🎥 Initializing camera system...');
      
      const initStartTime = performance.now();
      
      // Initialize camera device detection
      await initializeCameraDevices();
      
      // Detect device capabilities for optimization
      if (selectedCameraId) {
        await detectDeviceCapabilities();
      }
      
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
      cameraError = 'Failed to initialize camera system. Please refresh the page.';
    } finally {
      isInitializing = false;
    }
  });
  
  onDestroy(() => {
    console.log('🧹 Cleaning up camera component...');
    
    // Enhanced cleanup
    stopCamera();
    
    // Clean up detector and classifier
    detector?.dispose();
    
    // Clear any timeouts
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout);
    }
    
    console.log('✅ Camera component cleanup complete');
  });
  
  async function startCamera() {
    try {
      console.log('📹 Starting camera with enhanced permission handling...');
      clearCameraError();
      
      // Use enhanced permission request system
      const permissionGranted = await requestCameraPermission();
      
      if (!permissionGranted) {
        console.error('❌ Camera permission not granted');
        return;
      }
      
      // Complete the camera setup
      await completeCameraSetup();
      
    } catch (error) {
      console.error('❌ Camera startup failed:', error);
      handleCameraPermissionError(error);
    }
  }
  
  // Enhanced stream and resource management
  let activeMediaTracks: MediaStreamTrack[] = [];
  let streamStatus: 'idle' | 'starting' | 'active' | 'stopping' | 'failed' = 'idle';
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  let cleanupTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Enhanced cleanup with proper resource management
  function stopCamera() {
    console.log('🛑 Stopping camera...');
    streamStatus = 'stopping';
    
    try {
      // Stop detection loop
      isDetecting = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
      
      // Stop all media tracks properly
      if (stream) {
        stream.getTracks().forEach(track => {
          console.log(`Stopping track: ${track.kind} - ${track.label}`);
          track.stop();
        });
        stream = null;
      }
      
      // Clean up active tracks array
      activeMediaTracks.forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      activeMediaTracks = [];
      
      // Clear video element
      if (videoElement) {
        videoElement.srcObject = null;
      }
      
      // Clear any pending cleanup
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
      }
      
      streamStatus = 'idle';
      console.log('✅ Camera stopped successfully');
      
    } catch (error) {
      console.error('❌ Error stopping camera:', error);
      streamStatus = 'failed';
    }
  }
  
  // Enhanced stream monitoring and recovery
  function setupStreamMonitoring() {
    if (!stream) return;
    
    const tracks = stream.getTracks();
    activeMediaTracks = [...tracks];
    
    tracks.forEach(track => {
      console.log(`Monitoring track: ${track.kind} - ${track.label}`);
      
      track.addEventListener('ended', () => {
        console.warn('📹 Camera track ended unexpectedly');
        handleStreamInterruption('track_ended');
      });
      
      track.addEventListener('mute', () => {
        console.warn('📹 Camera track muted');
        handleStreamInterruption('track_muted');
      });
      
      track.addEventListener('unmute', () => {
        console.log('📹 Camera track unmuted');
      });
    });
    
    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      if (!stream || streamStatus !== 'active') {
        clearInterval(healthCheckInterval);
        return;
      }
      
      const activeTracks = stream.getTracks().filter(track => track.readyState === 'live');
      if (activeTracks.length === 0) {
        console.warn('📹 No active camera tracks detected');
        clearInterval(healthCheckInterval);
        handleStreamInterruption('no_active_tracks');
      }
    }, 5000); // Check every 5 seconds
  }
  
  // Handle stream interruptions with recovery
  async function handleStreamInterruption(reason: string) {
    console.warn(`📹 Stream interrupted: ${reason}`);
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      cameraError = 'Camera connection lost. Please restart the camera manually.';
      streamStatus = 'failed';
      return;
    }
    
    reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
    
    // Clean up current stream
    stopCamera();
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000 * reconnectAttempts));
    
    try {
      await startCamera();
      reconnectAttempts = 0; // Reset on successful reconnection
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        cameraError = 'Unable to reconnect camera. Please refresh the page.';
        streamStatus = 'failed';
      }
    }
  }
  
  // Enhanced stream setup with monitoring
  async function setupCameraStream() {
    if (!stream || !videoElement) return;
    
    streamStatus = 'starting';
    
    try {
      // Configure video element
      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.autoplay = true;
      
      // Set up stream monitoring before playing
      setupStreamMonitoring();
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000); // 10 second timeout
        
        videoElement.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          resolve(null);
        }, { once: true });
        
        videoElement.addEventListener('error', (e) => {
          clearTimeout(timeout);
          reject(new Error(`Video error: ${e}`));
        }, { once: true });
      });
      
      await videoElement.play();
      
      // Verify video is actually playing
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        throw new Error('Video dimensions are zero');
      }
      
      streamStatus = 'active';
      console.log(`✅ Camera stream active: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      
      // Update canvas size to match video
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      
      // Schedule resource cleanup
      scheduleResourceCleanup();
      
    } catch (error) {
      console.error('❌ Camera stream setup failed:', error);
      streamStatus = 'failed';
      throw error;
    }
  }
  
  // Periodic resource cleanup
  function scheduleResourceCleanup() {
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout);
    }
    
    cleanupTimeout = setTimeout(() => {
      // Clean up unused resources periodically
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        performanceMetrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024);
        
        // Force garbage collection if memory usage is high
        if (memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
          console.log('🧹 High memory usage detected, triggering cleanup');
          // The browser will handle GC automatically
        }
      }
      
      // Reschedule
      scheduleResourceCleanup();
    }, 30000); // Every 30 seconds
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
      
      // Adaptive quality adjustment based on performance
      if (frameCount % 30 === 0) { // Check every 30 frames
        adjustQualityBasedOnPerformance();
      }
      
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
          on:click={() => switchCamera()}
          on:click={toggleCameraSelector}
          aria-label="Switch camera"
          disabled={isCapturing || availableCameras.length <= 1}
        >
          📷
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
      
      <!-- Camera Selector -->
      {#if showCameraSelector && availableCameras.length > 1}
        <div class="camera-selector">
          <div class="selector-header">
            <h4>Select Camera</h4>
            <button class="close-btn" on:click={toggleCameraSelector}>×</button>
          </div>
          <div class="camera-list">
            {#each availableCameras as camera}
              <button 
                class="camera-option"
                class:selected={camera.deviceId === selectedCameraId}
                on:click={() => {
                  switchCamera(camera.deviceId);
                  toggleCameraSelector();
                }}
              >
                <span class="camera-label">{getCameraLabel(camera.deviceId)}</span>
                {#if camera.deviceId === selectedCameraId}
                  <span class="selected-indicator">✓</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="camera-placeholder" on:click={activateCamera} on:keydown={handleKeydown} role="button" tabindex="0" aria-label="Start camera detection">
      <div class="placeholder-content">
        {#if cameraError}
          <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Camera Issue</h3>
            <p class="error-message">{cameraError}</p>
            <div class="error-actions">
              <button class="retry-btn" on:click|stopPropagation={retryCamera}>
                🔄 Try Again
              </button>
              {#if permissionState === 'denied'}
                <button class="settings-btn" on:click|stopPropagation={() => window.open('chrome://settings/content/camera', '_blank')}>
                  ⚙️ Settings
                </button>
              {/if}
            </div>
          </div>
        {:else if isInitializing}
          <div class="loading-state">
            <div class="loading-spinner">🔄</div>
            <h3>Initializing...</h3>
            <p>Setting up camera and AI models</p>
          </div>
        {:else}
          <div class="ready-state">
            <div class="camera-icon">📹</div>
            <h3>Camera Ready</h3>
            <p>Tap to start detecting waste items</p>
          </div>
        {/if}
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
  
  .camera-selector {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    min-width: 200px;
    z-index: 10;
  }
  
  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .selector-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    color: #374151;
  }
  
  .camera-list {
    padding: 8px;
  }
  
  .camera-option {
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s ease;
  }
  
  .camera-option:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  
  .camera-option.selected {
    background: rgba(34, 197, 94, 0.1);
  }
  
  .camera-label {
    font-size: 14px;
    color: #374151;
    text-align: left;
  }
  
  .selected-indicator {
    color: #22c55e;
    font-weight: bold;
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
    padding: 20px;
  }
  
  .ready-state .camera-icon {
    font-size: 64px;
    margin-bottom: 16px;
    animation: pulse 2s infinite;
  }
  
  .error-state {
    color: #ef4444;
  }
  
  .error-icon {
    font-size: 48px;
    margin-bottom: 12px;
    animation: shake 1s ease-in-out;
  }
  
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 16px;
  }
  
  .retry-btn, .settings-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .retry-btn {
    background: #22c55e;
    color: white;
  }
  
  .retry-btn:hover {
    background: #16a34a;
  }
  
  .settings-btn {
    background: #6b7280;
    color: white;
  }
  
  .settings-btn:hover {
    background: #4b5563;
  }
  
  .loading-state {
    color: #3b82f6;
  }
  
  .loading-spinner {
    font-size: 48px;
    margin-bottom: 12px;
    animation: spin 2s linear infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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