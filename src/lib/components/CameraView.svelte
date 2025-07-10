<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ObjectDetector } from '$lib/ml/detector.js';
  import { WasteClassifier } from '$lib/ml/classifier.js';
  import { 
    detections, 
    selectedDetection, 
    setError, 
    setSuccess,
    setLoadingState,
    setCameraStream,
    stopCamera,
    permissionsGranted,
    updatePerformanceMetric,
    isLoading,
    error,
    isCameraActive,
    loadingState
  } from '$lib/stores/appStore.js';
  import type { Detection, ModelConfig } from '$lib/types/index.js';
  import { isBrowser, isUserMediaSupported, safeNavigator, safeDocument, checkCameraCompatibility, getOptimalCameraConstraints, getCameraDevicePreferences, getBrowserInfo, getDeviceInfo, isDeviceMobile } from '$lib/utils/browser.js';
  import { perf, getPerformanceMonitor, performanceMetrics, currentFPS, currentInferenceTime } from '$lib/utils/performance-monitor.js';
  import FallbackDetection from './FallbackDetection.svelte';
  import { getOfflineManager, offlineStatus, isOfflineMode } from '$lib/utils/offline-manager.js';

  // Component state
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let overlayCanvasElement: HTMLCanvasElement;
  let detector: ObjectDetector | null = null;
  let classifier: WasteClassifier | null = null;
  let animationId: number;
  let isDetecting = false;
  let lastFrameTime = 0;
  let frameCount = 0;
  let mountStartTime = 0;

  // Local component state for SSR safety
  let localIsLoading = false;
  let localError: string | null = null;
  let localPermissionsGranted = false;
  let initializationAttempts = 0;
  let maxRetryAttempts = 3;

  // Model configuration
  const modelConfig: ModelConfig = {
    modelPath: '/models/yolov8n.onnx',
    inputSize: [640, 640],
    threshold: 0.5,
    iouThreshold: 0.4
  };

  // SSR-safe reactive statements
  $: browserIsLoading = isBrowser() ? $isLoading : localIsLoading;
  $: browserError = isBrowser() ? $error : localError;
  $: browserPermissionsGranted = isBrowser() ? $permissionsGranted : localPermissionsGranted;

  // Component lifecycle with performance monitoring
  onMount(async () => {
    if (!isBrowser()) {
      console.warn('🚫 CameraView: Skipping initialization during SSR');
      return;
    }
    
    mountStartTime = performance.now();
    console.log('🎬 CameraView: Starting component initialization with performance tracking...');
    
    // Initialize performance monitoring
    perf.start('componentMount');
    
    try {
      // Initialize ML models first
      await initializeML();
      
      // Check existing permissions and potentially auto-start camera
      await checkExistingPermissions();
      
      const mountTime = perf.end('componentMount', 'ui');
      console.log(`✅ CameraView: Component initialized in ${mountTime.toFixed(0)}ms`);
      
      // Update both new and legacy performance metrics
      updatePerformanceMetric('componentMountTime', mountTime);
      
      // Generate initial performance snapshot
      const snapshot = perf.snapshot();
      console.log('📊 Initial performance snapshot:', snapshot.summary);
      
    } catch (error) {
      console.error('❌ CameraView: Initialization failed:', error);
      perf.end('componentMount', 'ui');
      perf.record('componentMountFailed', 1, 'count', 'ui');
      setError(`Component initialization failed: ${error}`);
    }
  });

  onDestroy(() => {
    console.log('🧹 CameraView: Cleaning up component with performance monitoring...');
    
    // Record component lifetime
    if (mountStartTime > 0) {
      const lifetime = performance.now() - mountStartTime;
      perf.record('componentLifetime', lifetime, 'ms', 'ui');
    }
    
    cleanup();
    
    // Stop performance monitoring
    getPerformanceMonitor().stop();
  });

  // Initialize ML models with comprehensive performance tracking
  async function initializeML() {
    if (!isBrowser()) return;
    
    console.log('🤖 Initializing ML models with performance tracking...');
    localIsLoading = true;
    setLoadingState(true, 'models', 0, 'Loading AI models...');
    
    // Start overall ML initialization timer
    perf.start('mlInitialization');
    
    try {
      // Initialize models with timeout protection and individual tracking
      const initPromise = Promise.all([
        initializeDetector(),
        initializeClassifier()
      ]);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout (30s)')), 30000);
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      
      // Record successful initialization
      const totalTime = perf.end('mlInitialization', 'ml');
      console.log(`🚀 ML models loaded in ${totalTime.toFixed(0)}ms`);
      
      // Update legacy performance metric for compatibility
      updatePerformanceMetric('modelLoadTime', totalTime);
      
      setSuccess('AI models loaded successfully');
      
    } catch (error) {
      const errorMessage = `Failed to load AI models: ${error}`;
      console.error('❌ ML initialization error:', error);
      
      // Record failed initialization
      perf.end('mlInitialization', 'ml');
      perf.record('mlInitializationFailed', 1, 'count', 'ml');
      
      localError = errorMessage;
      setError(errorMessage);
      throw error;
    } finally {
      localIsLoading = false;
      setLoadingState(false);
    }
  }

  async function initializeDetector(): Promise<void> {
    console.log('🔍 Loading object detector...');
    perf.start('detectorInitialization');
    
    detector = new ObjectDetector(modelConfig);
    setLoadingState(true, 'detector', 25, 'Loading object detector...');
    
    await detector.initialize();
    
    const detectorTime = perf.end('detectorInitialization', 'ml');
    console.log(`✅ Object detector ready in ${detectorTime.toFixed(0)}ms`);
  }

  async function initializeClassifier(): Promise<void> {
    console.log('🏷️ Loading waste classifier...');
    perf.start('classifierInitialization');
    
    classifier = new WasteClassifier();
    setLoadingState(true, 'classifier', 75, 'Loading waste classifier...');
    
    await classifier.initialize();
    
    const classifierTime = perf.end('classifierInitialization', 'ml');
    console.log(`✅ Waste classifier ready in ${classifierTime.toFixed(0)}ms`);
  }

  // Enhanced camera initialization with comprehensive performance tracking
  async function startCamera() {
    if (!isBrowser()) {
      console.warn('🚫 Camera: Cannot start camera during SSR');
      return;
    }
    
    initializationAttempts++;
    console.log(`📷 Camera: Starting initialization with performance tracking (attempt ${initializationAttempts}/${maxRetryAttempts})...`);
    
    // Start performance tracking
    perf.start('cameraInitialization');
    
    localIsLoading = true;
    localError = null;
    setLoadingState(true, 'camera', 0, 'Initializing camera...');
    setError(null);
    
    try {
      // Track compatibility check time
      perf.start('compatibilityCheck');
      const compatibility = checkCameraCompatibility();
      perf.end('compatibilityCheck', 'camera');
      
      console.log('📊 Camera compatibility analysis:', {
        score: compatibility.score,
        issues: compatibility.issues.length,
        warnings: compatibility.warnings.length
      });
      
      // Record compatibility score
      perf.record('cameraCompatibilityScore', compatibility.score, 'score', 'camera');
      
      // Comprehensive browser support check
      if (!isUserMediaSupported()) {
        throw new Error('Camera access is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
      }
      
      const navigator = safeNavigator();
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Media devices API not available. Please ensure you\'re using HTTPS or localhost.');
      }
      
      // Check available devices with timing
      console.log('📷 Camera: Checking available devices...');
      setLoadingState(true, 'camera', 25, 'Checking camera devices...');
      
      perf.start('deviceEnumeration');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const enumerationTime = perf.end('deviceEnumeration', 'camera');
      
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      
      console.log('📷 Camera devices found:', {
        total: devices.length,
        videoInputs: videoInputs.length,
        enumerationTime: `${enumerationTime.toFixed(0)}ms`,
        devices: videoInputs.map(d => ({
          deviceId: d.deviceId.substring(0, 8) + '...',
          label: d.label || 'Unknown Device'
        }))
      });
      
      // Record device information
      perf.record('cameraDeviceCount', videoInputs.length, 'count', 'camera');
      perf.record('deviceEnumerationTime', enumerationTime, 'ms', 'camera');
      
      if (videoInputs.length === 0) {
        throw new Error('No camera device found. Please connect a camera and refresh the page.');
      }
      
      // Request camera stream with performance tracking
      console.log('📷 Camera: Requesting camera stream...');
      setLoadingState(true, 'camera', 50, 'Requesting camera access...');
      
      perf.start('streamAcquisition');
      const stream = await getUserMediaWithFallback();
      const streamTime = perf.end('streamAcquisition', 'camera');
      
      // Validate stream
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('Invalid camera stream received. Please try again.');
      }
      
      console.log('✅ Camera: Stream obtained successfully');
      console.log('📷 Camera: Stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        streamAcquisitionTime: `${streamTime.toFixed(0)}ms`,
        settings: stream.getVideoTracks()[0]?.getSettings()
      });
      
      // Record stream acquisition metrics
      perf.record('streamAcquisitionTime', streamTime, 'ms', 'camera');
      
      // Set up video element with timing
      setLoadingState(true, 'camera', 75, 'Setting up video stream...');
      perf.start('videoSetup');
      await setupVideoElement(stream);
      const setupTime = perf.end('videoSetup', 'camera');
      
      // Update stores
      setCameraStream(stream);
      localPermissionsGranted = true;
      
      // Record total initialization time
      const totalTime = perf.end('cameraInitialization', 'camera');
      
      console.log('✅ Camera: Successfully initialized and ready');
      console.log('📊 Camera initialization performance:', {
        total: `${totalTime.toFixed(0)}ms`,
        streamAcquisition: `${streamTime.toFixed(0)}ms`,
        videoSetup: `${setupTime.toFixed(0)}ms`,
        deviceEnumeration: `${enumerationTime.toFixed(0)}ms`
      });
      
      // Update legacy performance metric for compatibility
      updatePerformanceMetric('cameraInitTime', totalTime);
      
      // Start monitoring camera stream health
      perf.camera(stream);
      
      setSuccess('Camera initialized successfully');
      
      // Reset retry attempts on success
      initializationAttempts = 0;
      
    } catch (error: any) {
      console.error('❌ Camera: Initialization failed:', error);
      
      // Record failed initialization
      const failedTime = perf.end('cameraInitialization', 'camera');
      perf.record('cameraInitializationFailed', 1, 'count', 'camera');
      perf.record('cameraFailureAttempt', initializationAttempts, 'count', 'camera');
      
      const errorMessage = handleCameraError(error);
      localError = errorMessage;
      setError(errorMessage);
      localPermissionsGranted = false;
      
      // Retry logic for transient errors
      if (shouldRetryCamera(error) && initializationAttempts < maxRetryAttempts) {
        console.log(`🔄 Camera: Will retry in 2 seconds (attempt ${initializationAttempts + 1}/${maxRetryAttempts})`);
        setTimeout(() => startCamera(), 2000);
        return;
      }
      
    } finally {
      localIsLoading = false;
      setLoadingState(false);
    }
  }

  // Progressive camera constraints with intelligent device adaptation
  async function getUserMediaWithFallback(): Promise<MediaStream> {
    console.log('📱 Analyzing device capabilities for optimal camera setup...');
    
    // Get device-specific optimal constraints
    const optimalConstraints = getOptimalCameraConstraints();
    const devicePreferences = getCameraDevicePreferences();
    const compatibility = checkCameraCompatibility();
    
    console.log('📊 Device compatibility analysis:', {
      score: compatibility.score,
      issues: compatibility.issues,
      warnings: compatibility.warnings
    });
    
    // Show compatibility warnings to user if needed
    if (compatibility.warnings.length > 0) {
      console.warn('⚠️ Device compatibility warnings:', compatibility.warnings);
    }
    
    // Build constraint sets based on device capabilities and preferences
    const constraintSets = [
      // 1. Optimal constraints for this device
      optimalConstraints,
      
      // 2. Device preference fallbacks
      ...devicePreferences.fallbackConstraints,
      
      // 3. Progressive quality reduction
      {
        video: {
          width: { ideal: 960, max: 1280 },
          height: { ideal: 540, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: { ideal: devicePreferences.preferredFacingMode }
        }
      },
      {
        video: {
          width: { ideal: 640, max: 800 },
          height: { ideal: 480, max: 600 },
          frameRate: { ideal: 15, max: 24 }
        }
      },
      {
        video: {
          width: { ideal: 480 },
          height: { ideal: 360 }
        }
      },
      // 4. Minimal fallback
      { video: true }
    ];
    
    console.log(`📹 Trying ${constraintSets.length} progressive constraint sets...`);
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < constraintSets.length; i++) {
      try {
        const constraints = constraintSets[i];
        console.log(`📷 Attempting constraint set ${i + 1}/${constraintSets.length}:`, constraints);
        
        const startTime = performance.now();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const initTime = performance.now() - startTime;
        
        // Validate stream quality
        if (stream && stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          
          console.log(`✅ Camera initialized successfully with constraint set ${i + 1}:`, {
            resolution: `${settings.width}x${settings.height}`,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode,
            initTime: `${initTime.toFixed(0)}ms`
          });
          
          // Update performance metrics
          updatePerformanceMetric('cameraInitTime', initTime);
          updatePerformanceMetric('cameraResolution', `${settings.width}x${settings.height}`);
          
          return stream;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Constraint set ${i + 1} failed:`, {
          name: error.name,
          message: error.message,
          constraint: error.constraint
        });
        
        // Don't continue if it's a permission error
        if (error.name === 'NotAllowedError') {
          console.error('❌ Camera permission denied - stopping fallback attempts');
          throw error;
        }
      }
    }
    
    // If all constraints failed, throw the last error
    console.error('❌ All camera constraint sets failed');
    throw lastError || new Error('All camera constraint sets failed');
  }

  // Set up video element with comprehensive error handling
  async function setupVideoElement(stream: MediaStream): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!videoElement) {
        reject(new Error('Video element not available'));
        return;
      }
      
      const setupTimeout = setTimeout(() => {
        reject(new Error('Video setup timeout'));
      }, 10000);
      
      videoElement.onloadedmetadata = () => {
        clearTimeout(setupTimeout);
        
        console.log('📷 Video metadata loaded:', {
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          duration: videoElement.duration,
          readyState: videoElement.readyState
        });
        
        // Validate video dimensions
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          reject(new Error('Invalid video dimensions received'));
          return;
        }
        
        videoElement.play()
          .then(() => {
            console.log('✅ Video playback started successfully');
            setupCanvas();
            startDetectionLoop();
            resolve();
          })
          .catch(err => {
            console.error('❌ Video playback failed:', err);
            reject(new Error(`Video playback failed: ${err.message}`));
          });
      };
      
      videoElement.onerror = (err) => {
        clearTimeout(setupTimeout);
        console.error('❌ Video element error:', err);
        reject(new Error('Video element error occurred'));
      };
      
      // Set up stream tracking
      stream.getVideoTracks()[0].onended = () => {
        console.warn('📷 Camera stream ended unexpectedly');
        localError = 'Camera stream was interrupted. Please refresh or re-enable your camera.';
        setError(localError);
        localPermissionsGranted = false;
        permissionsGranted.set(false);
      };
      
      videoElement.srcObject = stream;
    });
  }

  // Enhanced error handling with device-specific recommendations
  function handleCameraError(error: any): string {
    const errorName = error.name || '';
    const errorMessage = error.message || error.toString();
    const compatibility = checkCameraCompatibility();
    const browserInfo = getBrowserInfo();
    const deviceInfo = getDeviceInfo();
    const isMobile = isDeviceMobile();
    
    console.error('🔍 Detailed camera error analysis:', {
      name: errorName,
      message: errorMessage,
      constraint: error.constraint,
      stack: error.stack,
      compatibility: compatibility.score,
      browser: `${browserInfo.name} ${browserInfo.version}`,
      platform: browserInfo.platform,
      mobile: isMobile,
      memory: deviceInfo?.deviceMemory || 0,
      cores: deviceInfo?.hardwareConcurrency || 1
    });
    
    let userMessage = '';
    let recommendations: string[] = [];
    
    switch (errorName) {
      case 'NotAllowedError':
        userMessage = 'Camera permission denied.';
        recommendations.push('Click the camera icon in your browser\'s address bar to allow access');
        recommendations.push('Check your browser settings under Privacy & Security > Camera');
        if (isMobile) {
          recommendations.push('Check your device\'s camera permissions for this browser');
        }
        break;
      
      case 'NotFoundError':
        userMessage = 'No camera device found.';
        if (isMobile) {
          recommendations.push('Ensure your device has a working camera');
        } else {
          recommendations.push('Connect a webcam to your computer');
          recommendations.push('Check if your camera is recognized in system settings');
        }
        break;
      
      case 'NotReadableError':
        userMessage = 'Camera is currently in use.';
        recommendations.push('Close other applications using the camera');
        recommendations.push('Close other browser tabs that might be using the camera');
        if (isMobile) {
          recommendations.push('Close other camera apps running in the background');
        }
        break;
      
      case 'OverconstrainedError':
        userMessage = `Camera doesn't support the required quality settings.`;
        recommendations.push('Your camera may be limited in resolution or frame rate');
        if (error.constraint) {
          recommendations.push(`Constraint failed: ${error.constraint}`);
        }
        break;
      
      case 'SecurityError':
        userMessage = 'Camera access blocked due to security restrictions.';
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          recommendations.push('Camera access requires HTTPS. Use https:// in the URL');
        }
        recommendations.push('Check if camera access is blocked by browser extensions');
        break;
      
      case 'AbortError':
        userMessage = 'Camera initialization was interrupted.';
        recommendations.push('Try refreshing the page');
        recommendations.push('This may be due to browser security policies');
        break;
      
      default:
        if (errorMessage.includes('timeout')) {
          userMessage = 'Camera initialization timed out.';
          recommendations.push('Your device may be slow to initialize the camera');
          recommendations.push('Try refreshing the page and waiting longer');
        } else if (errorMessage.includes('not supported')) {
          userMessage = 'Your browser doesn\'t support camera access.';
          recommendations.push('Update to a modern browser (Chrome, Firefox, Safari, Edge)');
        } else {
          userMessage = `Camera error: ${errorMessage}`;
        }
    }
    
    // Add compatibility-based recommendations
    if (compatibility.score < 70) {
      recommendations.push(...compatibility.recommendations);
    }
    
    // Browser-specific recommendations
    if (browserInfo.name === 'safari' && browserInfo.version < 14) {
      recommendations.push('Update Safari to version 14 or later for better camera support');
    } else if (browserInfo.name === 'firefox' && browserInfo.version < 70) {
      recommendations.push('Update Firefox to version 70 or later for better performance');
    } else if (browserInfo.name === 'chrome' && browserInfo.version < 80) {
      recommendations.push('Update Chrome to the latest version for best experience');
    }
    
    // Device-specific recommendations
    if (deviceInfo && deviceInfo.deviceMemory && deviceInfo.deviceMemory < 2) {
      recommendations.push('Close other tabs to free up memory');
      recommendations.push('Consider using image upload instead of real-time detection');
    }
    
    // Store recommendations for UI display
    localError = userMessage;
    if (recommendations.length > 0) {
      console.log('💡 Recommendations for user:', recommendations);
      // You could store these in a separate reactive variable for the UI
    }
    
    return userMessage;
  }

  // Determine if camera error should trigger retry
  function shouldRetryCamera(error: any): boolean {
    const retryableErrors = [
      'NotReadableError',  // Camera in use
      'AbortError',        // Aborted initialization
      'timeout',           // Timeout errors
      'network'            // Network-related errors
    ];
    
    const errorString = (error.name || error.message || '').toLowerCase();
    return retryableErrors.some(retryable => errorString.includes(retryable.toLowerCase()));
  }

  // Canvas setup for detection visualization
  function setupCanvas() {
    if (!isBrowser() || !videoElement || !overlayCanvasElement) return;
    
    const video = videoElement;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('📷 Video dimensions not ready for canvas setup');
      return;
    }
    
    // Set canvas dimensions to match video
    overlayCanvasElement.width = video.videoWidth;
    overlayCanvasElement.height = video.videoHeight;
    
    if (canvasElement) {
      canvasElement.width = video.videoWidth;
      canvasElement.height = video.videoHeight;
    }
    
    console.log('🎨 Canvas setup complete:', {
      width: overlayCanvasElement.width,
      height: overlayCanvasElement.height
    });
  }

  // Detection loop with comprehensive performance monitoring
  function startDetectionLoop() {
    if (!isBrowser() || isDetecting || !detector || !videoElement) return;
    
    isDetecting = true;
    console.log('🔄 Starting detection loop with performance monitoring...');
    
    function detectFrame() {
      if (!isDetecting || !detector || !videoElement || !canvasElement) return;
      
      try {
        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        
        // Maintain reasonable FPS (max 30 FPS to prevent overwhelming)
        if (deltaTime > 33) { // ~30 FPS
          lastFrameTime = now;
          frameCount++;
          
          // Record frame for FPS calculation
          perf.frame();
          
          // Perform detection with timing
          perf.start('frameDetection');
          performDetectionWithOfflineSupport();
          
          // Update performance metrics every 30 frames
          if (frameCount % 30 === 0) {
            const fps = 1000 / deltaTime;
            // Legacy compatibility
            updatePerformanceMetric('fps', fps);
            
            // Get current performance report
            const report = perf.report();
            if (report.issues.length > 0) {
              console.warn('⚠️ Performance issues detected:', report.issues);
            }
          }
        }
        
        animationId = requestAnimationFrame(detectFrame);
      } catch (error) {
        console.error('❌ Detection loop error:', error);
        perf.record('detectionLoopError', 1, 'count', 'ml');
        // Continue loop despite errors
        animationId = requestAnimationFrame(detectFrame);
      }
    }
    
    animationId = requestAnimationFrame(detectFrame);
  }

  // Enhanced perform detection with offline support
  async function performDetectionWithOfflineSupport() {
    if (!detector && !videoElement && !canvasElement && !overlayCanvasElement) return;
    
    try {
      // Check if we're offline
      const isOffline = !navigator.onLine;
      
      // Get image data
      perf.start('canvasDrawing');
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      const drawTime = perf.end('canvasDrawing', 'ui');
      
      // Get image data for detection
      perf.start('imageDataExtraction');
      const imageDataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
      perf.end('imageDataExtraction', 'ui');
      
      let detectedObjects: Detection[] = [];
      
      if (isOffline) {
        // Use offline detection
        console.log('📴 Performing offline detection...');
        perf.start('offlineDetection');
        detectedObjects = await offline.detect(imageDataUrl);
        const offlineTime = perf.end('offlineDetection', 'ml');
        
        // Store detection offline for later sync
        await offline.store(imageDataUrl, detectedObjects);
        
        console.log(`🤖 Offline detection completed in ${offlineTime.toFixed(1)}ms`);
        
      } else {
        // Use online detection
        perf.start('onlineDetection');
        detectedObjects = await detector.detect(ctx.getImageData(0, 0, canvasElement.width, canvasElement.height));
        const detectionTime = perf.end('onlineDetection', 'ml');
        
        // Record inference time
        perf.inference(detectionTime);
        
        console.log(`🌐 Online detection completed in ${detectionTime.toFixed(1)}ms`);
      }
      
      // Update detections store
      detections.set(detectedObjects);
      
      // Draw detection results
      perf.start('resultRendering');
      drawDetections(detectedObjects);
      const renderTime = perf.end('resultRendering', 'ui');
      
      // Record detection results
      perf.record('detectedObjectCount', detectedObjects.length, 'count', 'ml');
      perf.record('detectionMode', isOffline ? 0 : 1, 'binary', 'ml');
      
      // Log performance every 100 frames
      if (frameCount % 100 === 0) {
        console.log('📊 Detection performance:', {
          mode: isOffline ? 'offline' : 'online',
          objects: detectedObjects.length,
          frameCount: frameCount
        });
      }
      
    } catch (error) {
      console.error('❌ Detection error:', error);
      perf.record('detectionError', 1, 'count', 'ml');
      
      // Try offline fallback if online detection fails
      if (navigator.onLine) {
        console.log('🔄 Falling back to offline detection...');
        try {
          const imageDataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
          const fallbackDetections = await offline.detect(imageDataUrl);
          detections.set(fallbackDetections);
          drawDetections(fallbackDetections);
        } catch (fallbackError) {
          console.error('❌ Offline fallback also failed:', fallbackError);
        }
      }
    }
  }

  // Draw detection bounding boxes and labels
  function drawDetections(detectedObjects: Detection[]) {
    if (!overlayCanvasElement) return;
    
    const ctx = overlayCanvasElement.getContext('2d');
    if (!ctx) return;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, overlayCanvasElement.width, overlayCanvasElement.height);
    
    // Draw each detection
    detectedObjects.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      const confidence = detection.confidence;
      const category = detection.category;
      
      // Color coding by category
      const colors = {
        recycle: '#22c55e',    // Green
        compost: '#f59e0b',    // Orange  
        trash: '#ef4444',      // Red
        hazardous: '#8b5cf6'   // Purple
      };
      
      const color = colors[category as keyof typeof colors] || '#6b7280';
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Draw background for label
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 30, width, 30);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${detection.label} (${Math.round(confidence * 100)}%)`,
        x + 8,
        y - 8
      );
      
      // Draw category icon
      ctx.font = '16px Inter, sans-serif';
      const icon = category === 'recycle' ? '♻️' : category === 'compost' ? '🌱' : '🗑️';
      ctx.fillText(icon, x + width - 25, y + 20);
    });
  }

  // Handle canvas clicks for detection selection
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
      console.log('👆 Detection selected:', clickedDetection.label);
    }
  }

  // Window resize handler
  function handleResize() {
    if (!isBrowser()) return;
    
    if (videoElement && videoElement.videoWidth) {
      setupCanvas();
    }
  }

  // Video load handler  
  function handleVideoLoad() {
    if (!isBrowser()) return;
    
    setupCanvas();
    if (!isDetecting) {
      startDetectionLoop();
    }
  }

  // User-initiated camera permission request
  async function requestCameraPermission() {
    if (!isBrowser()) return;
    
    console.log('👤 User requested camera permission');
    localError = null;
    setError(null);
    initializationAttempts = 0; // Reset retry count for user-initiated request
    await startCamera();
  }

  // Retry camera initialization
  async function retryCamera() {
    if (!isBrowser()) return;
    
    console.log('🔄 User triggered camera retry');
    localError = null;
    setError(null);
    localPermissionsGranted = false;
    permissionsGranted.set(false);
    initializationAttempts = 0; // Reset retry count
    await startCamera();
  }

  // Check existing camera permissions
  async function checkExistingPermissions() {
    if (!isBrowser()) return;
    
    const navigator = safeNavigator();
    if (!navigator?.permissions) {
      console.warn('📷 Permissions API not supported, showing permission UI');
      return;
    }
    
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('📷 Existing camera permission status:', permissionStatus.state);
      
      if (permissionStatus.state === 'granted') {
        console.log('📷 Camera permission already granted, auto-starting camera...');
        await startCamera();
      } else if (permissionStatus.state === 'denied') {
        localError = 'Camera permission was previously denied. Please enable camera access in your browser settings.';
        setError(localError);
      }
      
      // Listen for permission changes
      permissionStatus.addEventListener('change', () => {
        console.log('📷 Camera permission changed to:', permissionStatus.state);
        if (permissionStatus.state === 'granted' && !browserPermissionsGranted) {
          console.log('📷 Permission granted, starting camera...');
          startCamera();
        } else if (permissionStatus.state === 'denied') {
          const errorMsg = 'Camera permission was denied. Please enable camera access in your browser settings.';
          localError = errorMsg;
          setError(errorMsg);
          localPermissionsGranted = false;
          permissionsGranted.set(false);
        }
      });
    } catch (error) {
      console.warn('📷 Could not check existing camera permissions:', error);
      // Fallback: just show the permission request UI
    }
  }

  // Component cleanup
  function cleanup() {
    if (!isBrowser()) return;
    
    console.log('🧹 Cleaning up CameraView...');
    
    // Stop detection loop
    isDetecting = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    // Dispose ML models
    if (detector) {
      detector.dispose();
      detector = null;
    }
    
    if (classifier) {
      // Dispose classifier if it has dispose method
      classifier = null;
    }
    
    // Stop camera
    stopCamera();
    
    console.log('✅ CameraView cleanup complete');
  }

  // Handle fallback detection results
  function handleFallbackDetection(event: CustomEvent<{detections: Detection[], method: string}>) {
    const { detections, method } = event.detail;
    
    console.log(`✅ Fallback detection successful using ${method}:`, detections);
    
    // Update detections store with fallback results
    detections.set(detections);
    
    // Record fallback usage for analytics
    perf.record('fallbackDetectionUsed', 1, 'count', 'ml');
    perf.record('fallbackMethod', this.mapMethodToScore(method), 'score', 'ml');
    
    // Show success message
    setSuccess(`Successfully classified using ${method} input`);
    
    // Clear any existing errors
    localError = null;
    setError(null);
  }

  function handleFallbackError(event: CustomEvent<{message: string, method: string}>) {
    const { message, method } = event.detail;
    
    console.error(`❌ Fallback detection failed using ${method}:`, message);
    
    // Record fallback error for analytics
    perf.record('fallbackDetectionFailed', 1, 'count', 'ml');
    
    // Show error message to user
    setError(`${method} detection failed: ${message}`);
  }

  function handleFallbackLoading(event: CustomEvent<{isLoading: boolean, method: string}>) {
    const { isLoading, method } = event.detail;
    
    if (isLoading) {
      setLoadingState(true, 'fallback', 0, `Processing ${method} input...`);
    } else {
      setLoadingState(false);
    }
  }

  // Map fallback method to numeric score for analytics
  function mapMethodToScore(method: string): number {
    const scores = {
      'image': 4,
      'voice': 3,
      'text': 2,
      'clipboard': 4
    };
    return scores[method as keyof typeof scores] || 1;
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

  <!-- Loading and Permission UI -->
  {#if !browserPermissionsGranted}
    <div class="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
      <div class="text-center text-white p-6 max-w-sm">
        {#if browserIsLoading}
          <!-- Loading State -->
          <div class="loading-spinner w-16 h-16 mx-auto mb-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xl font-medium mb-2">
            {#if $loadingState.stage === 'models'}
              Loading AI Models...
            {:else if $loadingState.stage === 'camera'}
              Starting Camera...
            {:else}
              Initializing...
            {/if}
          </p>
          <p class="text-sm opacity-75">
            {$loadingState.message || 'Please wait while we set up EcoScan'}
          </p>
          {#if $loadingState.progress > 0}
            <div class="w-full bg-gray-700 rounded-full h-2 mt-4">
              <div class="bg-green-500 h-2 rounded-full transition-all duration-300" style="width: {$loadingState.progress}%"></div>
            </div>
          {/if}
        {:else}
          <!-- Permission Request UI -->
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Camera Access Required</h3>
            <p class="text-sm opacity-90 leading-relaxed">
              EcoScan needs camera access to detect and classify waste items in real-time. 
              Your privacy is protected - all processing happens locally on your device.
            </p>
          </div>
          
          <button 
            class="btn btn-primary btn-lg w-full mb-4 bg-green-500 hover:bg-green-600 border-green-500"
            on:click={requestCameraPermission}
            disabled={browserIsLoading}
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Enable Camera
          </button>
          
          <div class="text-xs opacity-70 space-y-1">
            <p>• Real-time waste detection & classification</p>
            <p>• 100% private - no data leaves your device</p>
            <p>• Works offline after initial load</p>
          </div>
        {/if}
        
        <!-- Error Display -->
        {#if browserError}
          <div class="mt-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-sm">
            <div class="flex items-start space-x-3">
              <div class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-medium text-red-200">Camera Access Failed</p>
                <p class="mt-1 text-red-300">{browserError}</p>
                
                <div class="mt-4 space-y-3">
                  <button 
                    class="btn btn-sm btn-error w-full bg-red-500 hover:bg-red-600"
                    on:click={retryCamera}
                    disabled={browserIsLoading}
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Try Again
                    {#if initializationAttempts > 0}
                      ({initializationAttempts}/{maxRetryAttempts})
                    {/if}
                  </button>
                  
                  <!-- Comprehensive Fallback Detection -->
                  <div class="border-t border-red-400 pt-3">
                    <p class="text-xs text-red-300 mb-3">Use alternative detection methods:</p>
                    <FallbackDetection 
                      title="Alternative Detection"
                      subtitle="Choose another way to classify your waste"
                      showTips={false}
                      on:detection={handleFallbackDetection}
                      on:error={handleFallbackError}
                      on:loading={handleFallbackLoading}
                    />
                  </div>
                  
                  <!-- Troubleshooting tips -->
                  <details class="mt-3">
                    <summary class="text-xs text-red-300 cursor-pointer hover:text-red-200">
                      🔧 Troubleshooting Tips
                    </summary>
                    <div class="mt-2 text-xs text-red-400 space-y-1">
                      <p>• Check camera permissions in browser settings</p>
                      <p>• Close other apps using the camera</p>
                      <p>• Try refreshing the page</p>
                      <p>• Ensure you're using HTTPS or localhost</p>
                      <p>• Try a different browser (Chrome recommended)</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Detection count indicator -->
  {#if $detections.length > 0 && browserPermissionsGranted}
    <div class="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
      <span class="font-medium">{$detections.length} item{$detections.length !== 1 ? 's' : ''} detected</span>
    </div>
  {/if}

  <!-- Instructions overlay -->
  {#if browserPermissionsGranted && !browserIsLoading}
    <div class="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
      <p class="text-sm">
        🎯 Point your camera at waste items to classify them.<br>
        📱 Tap on detected objects for disposal instructions.
      </p>
    </div>
  {/if}

  <!-- Offline Status Indicator -->
  {#if $isOfflineMode}
    <div class="absolute top-4 right-4 bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v2.25M12 19.75V22M2 12h2.25M19.75 12H22"></path>
      </svg>
      <span class="text-sm font-medium">Offline Mode</span>
    </div>
  {:else}
    <div class="absolute top-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
      </svg>
      <span class="text-sm font-medium">Online</span>
    </div>
  {/if}

  <!-- Sync Status Indicator -->
  {#if $offlineStatus.pendingSync > 0}
    <div class="absolute top-16 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
      <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      <span class="text-sm font-medium">{$offlineStatus.pendingSync} pending sync</span>
    </div>
  {/if}
</div>

<style>
  .loading-spinner {
    border: 4px solid #374151;
    border-top: 4px solid #22c55e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  video {
    object-fit: cover;
  }
  
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200;
  }
  
  .btn-primary {
    @apply text-white bg-green-500 hover:bg-green-600;
  }
  
  .btn-error {
    @apply text-white bg-red-500 hover:bg-red-600;
  }
  
  .btn-lg {
    @apply px-6 py-3 text-base;
  }
  
  .btn-sm {
    @apply px-3 py-1.5 text-sm;
  }
  
  .btn:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
</style> 