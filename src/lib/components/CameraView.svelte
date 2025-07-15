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
  
  // Advanced error handling and edge case management
  let errorHistory: { timestamp: number; error: string; context: string }[] = [];
  let connectionQuality: 'excellent' | 'good' | 'poor' | 'critical' = 'good';
  let userGuidance: string | null = null;
  let troubleshootingStep = 0;
  let recoveryMode = false;
  
  // Browser compatibility detection
  let browserCapabilities = {
    webGL: false,
    webAssembly: false,
    offscreenCanvas: false,
    mediaDevices: false,
    speechRecognition: false,
    notifications: false,
    fullscreen: false
  };
  
  // Device constraint monitoring
  let deviceConstraints = {
    memoryLimit: 0,
    thermalState: 'normal' as 'normal' | 'fair' | 'serious' | 'critical',
    batteryLevel: 100,
    networkSpeed: 'fast' as 'slow' | 'medium' | 'fast'
  };
  
  // Comprehensive browser and device capability detection
  async function detectBrowserCapabilities() {
    console.log('🔍 Detecting browser capabilities...');
    
    try {
      // WebGL detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      browserCapabilities.webGL = !!gl;
      
      // WebAssembly detection
      browserCapabilities.webAssembly = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
      
      // OffscreenCanvas detection
      browserCapabilities.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
      
      // MediaDevices detection
      browserCapabilities.mediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      // Speech recognition detection
      browserCapabilities.speechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      
      // Notifications detection
      browserCapabilities.notifications = 'Notification' in window;
      
      // Fullscreen detection
      browserCapabilities.fullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
      
      console.log('🖥️ Browser capabilities:', browserCapabilities);
      
      // Show warnings for missing capabilities
      await checkCriticalCapabilities();
      
    } catch (error) {
      console.error('❌ Capability detection failed:', error);
      logError('Capability detection failed', 'initialization', error);
    }
  }
  
  // Check for critical missing capabilities
  async function checkCriticalCapabilities() {
    const issues = [];
    
    if (!browserCapabilities.mediaDevices) {
      issues.push('Camera access not supported in this browser');
    }
    
    if (!browserCapabilities.webGL && !browserCapabilities.webAssembly) {
      issues.push('AI acceleration not available - performance may be limited');
    }
    
    if (issues.length > 0) {
      userGuidance = issues.join('. ') + '. Consider using a modern browser like Chrome or Firefox.';
      setTimeout(() => { userGuidance = null; }, 10000);
    }
  }
  
  // Enhanced device monitoring
  async function monitorDeviceConstraints() {
    try {
      // Memory monitoring
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        deviceConstraints.memoryLimit = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (deviceConstraints.memoryLimit > 0.8) {
          handleMemoryPressure();
        }
      }
      
      // Battery monitoring
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        deviceConstraints.batteryLevel = battery.level * 100;
        
        if (deviceConstraints.batteryLevel < 15) {
          handleLowBattery();
        }
      }
      
      // Network monitoring
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const speed = connection.effectiveType;
        deviceConstraints.networkSpeed = speed === '4g' ? 'fast' : speed === '3g' ? 'medium' : 'slow';
      }
      
      // Thermal state monitoring (iOS)
      if ('webkitTemperature' in navigator) {
        deviceConstraints.thermalState = (navigator as any).webkitTemperature || 'normal';
        
        if (deviceConstraints.thermalState === 'critical') {
          handleThermalThrottling();
        }
      }
      
    } catch (error) {
      console.warn('Device constraint monitoring failed:', error);
    }
  }
  
  // Enhanced error logging system
  function logError(error: string, context: string, details?: any) {
    const errorEntry = {
      timestamp: Date.now(),
      error,
      context,
      details: details?.message || details
    };
    
    errorHistory.push(errorEntry);
    
    // Keep only recent errors (last 50)
    if (errorHistory.length > 50) {
      errorHistory.shift();
    }
    
    // Analyze error patterns
    analyzeErrorPatterns();
    
    console.error(`[${context}] ${error}`, details);
  }
  
  // Error pattern analysis
  function analyzeErrorPatterns() {
    const recentErrors = errorHistory.slice(-10);
    const errorCounts = recentErrors.reduce((acc, err) => {
      acc[err.context] = (acc[err.context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // If we have recurring errors, suggest solutions
    for (const [context, count] of Object.entries(errorCounts)) {
      if (count >= 3) {
        provideTroubleshootingGuidance(context);
      }
    }
  }
  
  // Troubleshooting guidance system
  function provideTroubleshootingGuidance(context: string) {
    const guidance = {
      'camera': [
        'Check if another app is using the camera',
        'Try refreshing the page',
        'Check browser permissions for camera access',
        'Try switching to a different camera if available'
      ],
      'detection': [
        'Ensure good lighting conditions',
        'Clean the camera lens',
        'Try reducing the detection quality',
        'Move objects closer to the camera'
      ],
      'performance': [
        'Close other browser tabs',
        'Try reducing the camera resolution',
        'Switch to fast detection mode',
        'Restart the browser'
      ],
      'network': [
        'Check your internet connection',
        'Try refreshing the page',
        'Switch to a different network if available',
        'Clear browser cache and cookies'
      ]
    };
    
    const steps = guidance[context as keyof typeof guidance];
    if (steps && troubleshootingStep < steps.length) {
      userGuidance = `Troubleshooting: ${steps[troubleshootingStep]}`;
      troubleshootingStep++;
      
      setTimeout(() => {
        if (troubleshootingStep >= steps.length) {
          troubleshootingStep = 0;
        }
        userGuidance = null;
      }, 8000);
    }
  }
  
  // Memory pressure handling
  function handleMemoryPressure() {
    console.warn('⚠️ Memory pressure detected, optimizing...');
    
    // Reduce detection quality
    if (detectionQuality === 'accurate') {
      detectionQuality = 'balanced';
    } else if (detectionQuality === 'balanced') {
      detectionQuality = 'fast';
    }
    
    // Reduce tracking history
    trackingHistory = trackingHistory.slice(-2);
    
    // Clear capture history
    if (captureHistory.length > 3) {
      captureHistory = captureHistory.slice(-3);
    }
    
    userGuidance = 'Optimizing for low memory. Close other browser tabs for better performance.';
    setTimeout(() => { userGuidance = null; }, 5000);
  }
  
  // Low battery handling
  function handleLowBattery() {
    console.warn('🔋 Low battery detected, reducing power consumption...');
    
    // Reduce detection frequency
    detectionFrequency = Math.max(5, detectionFrequency / 2);
    
    // Switch to fast mode
    detectionQuality = 'fast';
    
    userGuidance = 'Battery low. Switching to power-saving mode.';
    setTimeout(() => { userGuidance = null; }, 5000);
  }
  
  // Thermal throttling handling
  function handleThermalThrottling() {
    console.warn('🌡️ Device overheating, reducing performance...');
    
    // Significantly reduce performance
    detectionFrequency = 5;
    detectionQuality = 'fast';
    
    // Stop detection temporarily
    isDetecting = false;
    
    userGuidance = 'Device overheating. Please let it cool down before continuing.';
    
    // Resume detection after cooling period
    setTimeout(() => {
      if (deviceConstraints.thermalState !== 'critical') {
        isDetecting = true;
        detectFrame();
        userGuidance = null;
      }
    }, 30000);
  }
  
  // Enhanced camera error handling with specific solutions
  function handleCameraPermissionError(error: any) {
    permissionState = 'denied';
    retryCount++;
    
    const errorSolutions = {
      'NotAllowedError': {
        message: 'Camera access denied',
        solutions: [
          'Click "Allow" when prompted for camera access',
          'Check browser settings: Chrome → Privacy → Camera',
          'Reload the page and try again',
          'Check if another app is using the camera'
        ]
      },
      'NotFoundError': {
        message: 'No camera device found',
        solutions: [
          'Connect a camera to your device',
          'Check camera drivers and hardware',
          'Try a different USB port',
          'Restart your device'
        ]
      },
      'NotReadableError': {
        message: 'Camera busy or hardware error',
        solutions: [
          'Close other apps using the camera',
          'Unplug and reconnect USB camera',
          'Restart the browser',
          'Check camera hardware connections'
        ]
      },
      'OverconstrainedError': {
        message: 'Camera settings not supported',
        solutions: [
          'Try a different camera resolution',
          'Use a different camera if available',
          'Update camera drivers',
          'Try basic camera settings'
        ]
      },
      'SecurityError': {
        message: 'Security policy blocks camera access',
        solutions: [
          'Use HTTPS instead of HTTP',
          'Try localhost for development',
          'Check browser security settings',
          'Disable strict security extensions'
        ]
      }
    };
    
    const errorInfo = errorSolutions[error.name as keyof typeof errorSolutions] || {
      message: 'Camera error occurred',
      solutions: ['Refresh the page and try again', 'Check browser console for details']
    };
    
    cameraError = errorInfo.message;
    logError(errorInfo.message, 'camera', error);
    
    // Provide progressive solutions
    if (retryCount <= errorInfo.solutions.length) {
      userGuidance = `Solution ${retryCount}: ${errorInfo.solutions[retryCount - 1]}`;
      setTimeout(() => { userGuidance = null; }, 10000);
    }
    
    // Auto-retry with fallback constraints
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      setTimeout(() => startCameraWithFallback(), 2000 * retryCount);
    }
  }
  
  // Recovery mode for persistent issues
  async function enableRecoveryMode() {
    console.log('🔧 Enabling recovery mode...');
    recoveryMode = true;
    
    // Reset all settings to safe defaults
    detectionQuality = 'fast';
    detectionFrequency = 10;
    detectionStabilization = false;
    adaptiveSkipping = false;
    
    // Clear problematic state
    trackingHistory = [];
    captureHistory = [];
    errorHistory = [];
    
    // Restart with minimal settings
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await startCamera();
      userGuidance = 'Recovery mode enabled. Basic functionality restored.';
      setTimeout(() => { userGuidance = null; }, 5000);
    } catch (error) {
      cameraError = 'Recovery failed. Please refresh the page and try again.';
      logError('Recovery mode failed', 'recovery', error);
    }
  }
  
  // Network quality monitoring
  function monitorConnectionQuality() {
    const start = performance.now();
    
    // Test with a small request
    fetch('/models/ort.all.min.mjs', { method: 'HEAD' })
      .then(() => {
        const latency = performance.now() - start;
        if (latency < 100) {
          connectionQuality = 'excellent';
        } else if (latency < 300) {
          connectionQuality = 'good';
        } else if (latency < 1000) {
          connectionQuality = 'poor';
        } else {
          connectionQuality = 'critical';
        }
      })
      .catch(() => {
        connectionQuality = 'critical';
        logError('Network connectivity issues', 'network', 'Failed to reach server');
      });
  }
  
  // Accessibility error handling
  function handleAccessibilityIssues() {
    // Keyboard navigation support
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && showCapturePreview) {
        showCapturePreview = false;
      }
      
      if (event.key === 'Enter' && document.activeElement?.classList.contains('camera-placeholder')) {
        activateCamera();
      }
    });
    
    // Screen reader announcements
    if ('speechSynthesis' in window) {
      // Announce important state changes
      const announceStateChange = (message: string) => {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.volume = 0.5;
        speechSynthesis.speak(utterance);
      };
      
      // Announce when camera starts
      if (streamStatus === 'active') {
        announceStateChange('Camera activated and ready for detection');
      }
      
      // Announce detection results
      if (detectionResults.length > 0) {
        announceStateChange(`${detectionResults.length} items detected`);
      }
    }
  }
  
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
  
      // Initialize all monitoring systems
  onMount(async () => {
    try {
      isInitializing = true;
      console.log('🎥 Initializing comprehensive camera system...');
      
      const initStartTime = performance.now();
      
      // Initialize browser and device capability detection
      await detectBrowserCapabilities();
      await monitorDeviceConstraints();
      
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
      
      // Setup monitoring systems
      monitorConnectionQuality();
      handleAccessibilityIssues();
      
      // Schedule periodic health checks
      setInterval(monitorDeviceConstraints, 30000); // Every 30 seconds
      setInterval(monitorConnectionQuality, 60000); // Every minute
      
      performanceMetrics.cameraInitTime = performance.now() - initStartTime;
      console.log(`✅ Comprehensive camera system initialized in ${performanceMetrics.cameraInitTime.toFixed(1)}ms`);
      
      if (isActive) {
        await startCamera();
      }
    } catch (error) {
      console.error('❌ Failed to initialize camera system:', error);
      logError('Failed to initialize camera system', 'initialization', error);
      cameraError = 'Failed to initialize camera system. Please refresh the page.';
      
      // Try recovery mode if initialization fails
      setTimeout(() => enableRecoveryMode(), 3000);
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
  
  // Enhanced live detection state
  let detectionQuality: 'fast' | 'balanced' | 'accurate' = 'balanced';
  let detectionStabilization = true;
  let trackingHistory: Detection[][] = [];
  let stabilizedDetections: Detection[] = [];
  let detectionRegions: { [key: string]: number } = {};
  
  // Advanced frame processing
  let frameSkipPattern = 0;
  let adaptiveSkipping = true;
  let lastDetectionTime = 0;
  let detectionFrequency = 15; // Target FPS for detection
  
  // Enhanced detection loop with stabilization
  async function detectFrame() {
    if (!isDetecting || !videoElement || videoElement.readyState !== 4) {
      if (isDetecting) {
        animationId = requestAnimationFrame(detectFrame);
      }
      return;
    }
    
    const currentTime = performance.now();
    frameCount++;
    
    // Adaptive frame rate limiting based on performance
    const targetInterval = 1000 / detectionFrequency;
    if (currentTime - lastFrameTime < targetInterval) {
      animationId = requestAnimationFrame(detectFrame);
      return;
    }
    
    // Intelligent frame skipping based on performance
    if (adaptiveSkipping && shouldSkipFrame()) {
      lastFrameTime = currentTime;
      animationId = requestAnimationFrame(detectFrame);
      return;
    }
    
    lastFrameTime = currentTime;
    const startTime = performance.now();
    
    try {
      // Clear canvas and draw current frame
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      
      // Get image data with optimized quality
      const imageData = getOptimizedImageData();
      
      // Run detection with quality settings
      const rawDetections = await runQualityDetection(imageData);
      
      // Apply detection stabilization
      const currentDetections = detectionStabilization 
        ? stabilizeDetections(rawDetections)
        : rawDetections;
      
      // Update performance metrics
      const inferenceTime = performance.now() - startTime;
      updatePerformanceMetrics(inferenceTime, currentTime);
      
      // Filter and process detections
      const filteredDetections = filterDetections(currentDetections);
      
      // Update detection results
      detectionResults = filteredDetections;
      
      // Enhanced drawing with smooth tracking
      drawDetectionsWithTracking(filteredDetections);
      
      // Notify parent component
      onDetections(filteredDetections);
      
      lastDetectionTime = currentTime;
      
    } catch (error) {
      console.error('❌ Enhanced detection failed:', error);
      handleDetectionError(error);
    }
    
    // Continue detection loop
    if (isDetecting) {
      animationId = requestAnimationFrame(detectFrame);
    }
  }
  
  // Intelligent frame skipping logic
  function shouldSkipFrame(): boolean {
    const recentInferenceTime = performanceMetrics.inferenceTime;
    const currentFPS = performanceMetrics.fps;
    
    // Skip more frames if performance is poor
    if (recentInferenceTime > 150 || currentFPS < 10) {
      frameSkipPattern = (frameSkipPattern + 1) % 3; // Skip 2 out of 3 frames
      return frameSkipPattern !== 0;
    }
    
    // Skip some frames if performance is moderate
    if (recentInferenceTime > 100 || currentFPS < 15) {
      frameSkipPattern = (frameSkipPattern + 1) % 2; // Skip every other frame
      return frameSkipPattern !== 0;
    }
    
    // No skipping if performance is good
    return false;
  }
  
  // Get optimized image data based on quality setting
  function getOptimizedImageData(): ImageData {
    const canvas = canvasElement;
    const width = canvas.width;
    const height = canvas.height;
    
    switch (detectionQuality) {
      case 'fast':
        // Lower resolution for speed
        const fastCanvas = document.createElement('canvas');
        fastCanvas.width = width / 2;
        fastCanvas.height = height / 2;
        const fastCtx = fastCanvas.getContext('2d')!;
        fastCtx.drawImage(videoElement, 0, 0, fastCanvas.width, fastCanvas.height);
        return fastCtx.getImageData(0, 0, fastCanvas.width, fastCanvas.height);
        
      case 'accurate':
        // Full resolution for accuracy
        return ctx.getImageData(0, 0, width, height);
        
      case 'balanced':
      default:
        // Balanced resolution
        const balancedSize = Math.min(640, Math.max(width, height));
        const scale = balancedSize / Math.max(width, height);
        const balancedCanvas = document.createElement('canvas');
        balancedCanvas.width = width * scale;
        balancedCanvas.height = height * scale;
        const balancedCtx = balancedCanvas.getContext('2d')!;
        balancedCtx.drawImage(videoElement, 0, 0, balancedCanvas.width, balancedCanvas.height);
        return balancedCtx.getImageData(0, 0, balancedCanvas.width, balancedCanvas.height);
    }
  }
  
  // Quality-based detection processing
  async function runQualityDetection(imageData: ImageData): Promise<Detection[]> {
    if (!detector) return [];
    
    try {
      const detections = await detector.detect(imageData);
      
      // Apply quality-specific filtering
      const threshold = detectionQuality === 'fast' ? 0.6 : 
                       detectionQuality === 'accurate' ? 0.4 : 0.5;
      
      return detections.filter(d => d.confidence >= threshold);
    } catch (error) {
      console.error('Quality detection failed:', error);
      return [];
    }
  }
  
  // Detection stabilization algorithm
  function stabilizeDetections(currentDetections: Detection[]): Detection[] {
    // Add current detections to tracking history
    trackingHistory.push(currentDetections);
    
    // Keep only recent history (last 5 frames)
    if (trackingHistory.length > 5) {
      trackingHistory.shift();
    }
    
    // If we don't have enough history, return current detections
    if (trackingHistory.length < 3) {
      return currentDetections;
    }
    
    // Stabilize detections by tracking consistent objects
    const stabilized: Detection[] = [];
    
    for (const detection of currentDetections) {
      const stabilizedDetection = stabilizeDetection(detection);
      if (stabilizedDetection) {
        stabilized.push(stabilizedDetection);
      }
    }
    
    return stabilized;
  }
  
  // Stabilize individual detection
  function stabilizeDetection(detection: Detection): Detection | null {
    const similarDetections = trackingHistory
      .flat()
      .filter(d => 
        d.class === detection.class && 
        calculateOverlap(d.bbox, detection.bbox) > 0.3
      );
    
    // Need at least 2 similar detections for stability
    if (similarDetections.length < 2) {
      return null;
    }
    
    // Calculate stabilized properties
    const avgConfidence = similarDetections.reduce((sum, d) => sum + d.confidence, 0) / similarDetections.length;
    
    // Only keep detections that are consistently detected
    if (avgConfidence < 0.4) {
      return null;
    }
    
    // Return stabilized detection
    return {
      ...detection,
      confidence: Math.min(avgConfidence, detection.confidence)
    };
  }
  
  // Calculate bounding box overlap
  function calculateOverlap(bbox1: [number, number, number, number], bbox2: [number, number, number, number]): number {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    
    const left = Math.max(x1, x2);
    const top = Math.max(y1, y2);
    const right = Math.min(x1 + w1, x2 + w2);
    const bottom = Math.min(y1 + h1, y2 + h2);
    
    if (left >= right || top >= bottom) return 0;
    
    const intersectionArea = (right - left) * (bottom - top);
    const area1 = w1 * h1;
    const area2 = w2 * h2;
    const unionArea = area1 + area2 - intersectionArea;
    
    return intersectionArea / unionArea;
  }
  
  // Enhanced detection filtering
  function filterDetections(detections: Detection[]): Detection[] {
    // Remove duplicate detections
    const filtered = [];
    const processed = new Set();
    
    for (const detection of detections) {
      const key = `${detection.class}_${Math.round(detection.bbox[0])}_${Math.round(detection.bbox[1])}`;
      if (!processed.has(key)) {
        processed.add(key);
        filtered.push(detection);
      }
    }
    
    // Sort by confidence
    return filtered
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Limit to 8 detections for performance
  }
  
  // Enhanced drawing with smooth tracking
  function drawDetectionsWithTracking(detections: Detection[]) {
    // Clear previous drawings
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Draw detection boxes with smooth animations
    detections.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      ctx.strokeRect(x, y, width, height);
      ctx.fillText(`${detection.class} (${detection.confidence})`, x, y);
    });
    
    // Draw performance overlay if enabled
    if (detectionQuality === 'accurate') {
      drawPerformanceOverlay();
    }
  }
  
  // Smooth detection drawing
  function drawSmoothDetection(detection: Detection, index: number) {
    const [x, y, width, height] = detection.bbox;
    
    // Get category color
    const color = getCategoryColor(detection.category);
    
    // Draw bounding box with smooth lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeRect(x, y, width, height);
    
    // Draw label with better styling
    const label = `${detection.class} (${(detection.confidence * 100).toFixed(0)}%)`;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textMetrics = ctx.measureText(label);
    const labelWidth = textMetrics.width + 12;
    const labelHeight = 24;
    
    // Draw label background with rounded corners
    ctx.fillStyle = color;
    roundRect(ctx, x, y - labelHeight, labelWidth, labelHeight, 4);
    ctx.fill();
    
    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(label, x + 6, y - 6);
    
    // Draw category indicator
    const categoryIcon = getCategoryIcon(detection.category);
    ctx.font = '16px sans-serif';
    ctx.fillText(categoryIcon, x + width - 20, y + 20);
  }
  
  // Helper function for rounded rectangles
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  // Get category-specific colors
  function getCategoryColor(category: string): string {
    switch (category) {
      case 'recycle': return '#22c55e';
      case 'compost': return '#84cc16';
      case 'landfill': return '#ef4444';
      default: return '#6b7280';
    }
  }
  
  // Get category-specific icons
  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'recycle': return '♻️';
      case 'compost': return '🌱';
      case 'landfill': return '🗑️';
      default: return '❓';
    }
  }
  
  // Update performance metrics with smoothing
  function updatePerformanceMetrics(inferenceTime: number, currentTime: number) {
    // Smooth inference time
    performanceMetrics.inferenceTime = performanceMetrics.inferenceTime * 0.8 + inferenceTime * 0.2;
    
    // Calculate FPS more accurately
    const timeDelta = currentTime - lastDetectionTime;
    if (timeDelta > 0) {
      const instantFPS = 1000 / timeDelta;
      performanceMetrics.fps = performanceMetrics.fps * 0.9 + instantFPS * 0.1;
    }
    
    // Adaptive quality adjustment
    if (frameCount % 30 === 0) {
      adjustQualityBasedOnPerformance();
      adjustDetectionFrequency();
    }
  }
  
  // Adjust detection frequency based on performance
  function adjustDetectionFrequency() {
    const avgInferenceTime = performanceMetrics.inferenceTime;
    const currentFPS = performanceMetrics.fps;
    
    if (avgInferenceTime > 200 || currentFPS < 8) {
      detectionFrequency = Math.max(5, detectionFrequency - 1);
    } else if (avgInferenceTime < 50 && currentFPS > 20) {
      detectionFrequency = Math.min(30, detectionFrequency + 1);
    }
  }
  
  // Handle detection errors gracefully
  function handleDetectionError(error: any) {
    console.error('Detection error details:', error);
    
    // Reduce quality on repeated errors
    if (detectionQuality === 'accurate') {
      detectionQuality = 'balanced';
      console.log('Reduced detection quality to balanced due to errors');
    } else if (detectionQuality === 'balanced') {
      detectionQuality = 'fast';
      console.log('Reduced detection quality to fast due to errors');
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
  
  // Enhanced photo capture state
  let captureHistory: { id: string; timestamp: number; imageData: ImageData; detections: Detection[] }[] = [];
  let showCapturePreview = false;
  let lastCapturedPhoto: { imageData: ImageData; detections: Detection[] } | null = null;
  let captureCount = 0;
  
  // Visual feedback state
  let flashEffect = false;
  let captureProgress = 0;
  let showCaptureSuccess = false;
  
  // Add capture state
  let capturedImage: ImageData | null = null;
  let capturedDetections: Detection[] = [];
  
  // Enhanced photo capture with better feedback
  async function capturePhoto() {
    if (!videoElement || !ctx || isCapturing) return;
    
    isCapturing = true;
    captureProgress = 0;
    console.log('📸 Capturing photo with enhanced feedback...');
    
    try {
      // Visual flash effect
      flashEffect = true;
      setTimeout(() => { flashEffect = false; }, 200);
      
      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        captureProgress += 20;
        if (captureProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, 50);
      
      // Create capture canvas for photo analysis
      if (!captureCanvas) {
        captureCanvas = document.createElement('canvas');
      }
      
      captureCanvas.width = videoElement.videoWidth || cameraConfig.width;
      captureCanvas.height = videoElement.videoHeight || cameraConfig.height;
      const captureCtx = captureCanvas.getContext('2d')!;
      
      // Capture current video frame with high quality
      captureCtx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
      const capturedImageData = captureCtx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
      
      // Stop live detection temporarily
      const wasDetecting = isDetecting;
      isDetecting = false;
      
      // Analyze the captured photo with progress tracking
      captureProgress = 50;
      const analysisResults = await analyzePhoto(capturedImageData);
      
      // Create capture record
      const captureRecord = {
        id: `capture_${Date.now()}_${captureCount++}`,
        timestamp: Date.now(),
        imageData: capturedImageData,
        detections: analysisResults
      };
      
      // Add to history (keep last 10)
      captureHistory = [captureRecord, ...captureHistory.slice(0, 9)];
      lastCapturedPhoto = { imageData: capturedImageData, detections: analysisResults };
      
      captureProgress = 100;
      
      // Show success feedback
      showCaptureSuccess = true;
      setTimeout(() => { showCaptureSuccess = false; }, 2000);
      
      // Notify parent component
      onCapturePhoto(capturedImageData);
      
      // Resume live detection after brief pause
      if (wasDetecting) {
        setTimeout(() => {
          isDetecting = true;
          detectFrame();
        }, 1500);
      }
      
      console.log(`✅ Photo captured and analyzed - ${analysisResults.length} items found`);
      
    } catch (error) {
      console.error('❌ Photo capture failed:', error);
      cameraError = 'Photo capture failed. Please try again.';
    } finally {
      isCapturing = false;
      captureProgress = 0;
    }
  }
  
  // Enhanced photo analysis with better results
  async function analyzePhoto(imageData: ImageData): Promise<Detection[]> {
    if (!detector || !classifier) return [];
    
    console.log('🔍 Analyzing captured photo with enhanced detection...');
    const startTime = performance.now();
    
    try {
      // Run detection with higher quality settings for static images
      const detections = await detector.detect(imageData);
      
      // Enhanced detection filtering for photos (can be more thorough)
      const photoDetections = detections.filter(d => d.confidence >= 0.3); // Lower threshold for photos
      
      // Enhance detections with classification
      const enhancedDetections = photoDetections.map(detection => {
        const classification = classifier.classify(detection.class);
        return {
          ...detection,
          category: classification?.category || detection.category,
          confidence: Math.min(detection.confidence, classification?.confidence || detection.confidence),
          instructions: classification?.instructions || detection.instructions || 'No specific disposal instructions available'
        };
      });
      
      // Classify detections
      enhancedDetections.forEach(d => { d.category = classifier.classify(d.class).category; });
      
      const analysisTime = performance.now() - startTime;
      console.log(`✅ Photo analysis complete in ${analysisTime.toFixed(1)}ms - Found ${enhancedDetections.length} items`);
      
      // Check light level
      if (isLowLight(imageData)) { alert('Low light detected'); return; }
      
      // Check blur
      if (isBlurry(imageData)) { alert('Image blurry'); return; }
      
      // Limit objects
      if (enhancedDetections.length > 10) enhancedDetections = enhancedDetections.slice(0,10);
      
      return enhancedDetections;
      
    } catch (error) {
      console.error('❌ Photo analysis failed:', error);
      return [];
    }
  }
  
  // Show capture preview modal
  function showCaptureDetails() {
    if (lastCapturedPhoto) {
      showCapturePreview = true;
    }
  }
  
  // Clear capture history
  function clearCaptureHistory() {
    captureHistory = [];
    lastCapturedPhoto = null;
    showCapturePreview = false;
  }
  
  // Retake photo
  async function retakePhoto() {
    showCapturePreview = false;
    await capturePhoto();
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
  
  // Offline check
  if (!navigator.onLine) { alert('Offline mode'); /* handle */ }
  
  // Add FPS calc
  performanceMetrics.fps = calculateFPS();
  
  // Auto-capture
  if (isSteady()) capturePhoto();
  
  // Orientation handle
  window.addEventListener('orientationchange', adjustCanvas);
  
  // Battery check
  if (deviceConstraints.batteryLevel < 20) reduceFPS();
  
  // QR share
  generateQRForResults(detections);
  
  // Add capturePhoto
  async function capturePhoto() {
    if (!videoElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    capturedImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    capturedDetections = await detector.detect(capturedImage);
    capturedDetections = capturedDetections.map(d => ({ ...d, category: classifier.classify(d.class).category }));
  }
  
  // Permission handling
  if (permissionState === 'denied') alert('Please grant camera permission in settings.');
  
  // No camera fallback
  if (availableCameras.length === 0) showUploadPrompt();
  
  // Low light check
  function isLowLight(data) { /* impl */ }
  if (isLowLight(capturedImage)) alert('Low light - try better lighting');
  
  // Blurry check
  function isBlurry(data) { /* variance calc */ }
  if (isBlurry(capturedImage)) alert('Blurry - hold steady');
  
  // Offline capture
  if (!navigator.onLine) { useCachedDetector(); }
  
  // Rotation
  window.addEventListener('orientationchange', () => { canvas.width = window.innerWidth; });
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
      
      <!-- Visual feedback overlays -->
      {#if flashEffect}
        <div class="flash-overlay"></div>
      {/if}
      
      {#if isCapturing}
        <div class="capture-overlay">
          <div class="capture-indicator">
            <div class="progress-ring">
              <div class="progress-fill" style="--progress: {captureProgress}%"></div>
            </div>
            <span class="capture-text">📸 Capturing...</span>
          </div>
        </div>
      {/if}
      
      {#if showCaptureSuccess}
        <div class="success-overlay">
          <div class="success-indicator">
            <div class="success-icon">✅</div>
            <span class="success-text">Photo Captured!</span>
          </div>
        </div>
      {/if}
      
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
          {#if captureHistory.length > 0}
            <button class="history-btn" on:click={showCaptureDetails}>
              📷 {captureHistory.length}
            </button>
          {/if}
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
  
  .history-btn {
    background: rgba(59, 130, 246, 0.9);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 4px 8px;
    font-size: 12px;
    margin-left: 8px;
    cursor: pointer;
  }
  
  .flash-overlay {
    position: absolute;
    inset: 0;
    background: white;
    animation: flash 0.2s ease-out;
    pointer-events: none;
    z-index: 20;
  }
  
  @keyframes flash {
    0% { opacity: 0; }
    50% { opacity: 0.8; }
    100% { opacity: 0; }
  }
  
  .capture-overlay, .success-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15;
  }
  
  .capture-indicator, .success-indicator {
    background: white;
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .progress-ring {
    width: 60px;
    height: 60px;
    border: 4px solid #e5e7eb;
    border-radius: 50%;
    position: relative;
    margin: 0 auto 12px;
  }
  
  .progress-fill {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 4px solid #22c55e;
    border-top-color: transparent;
    border-right-color: transparent;
    transform: rotate(calc(var(--progress) * 3.6deg));
    transition: transform 0.3s ease;
  }
  
  .capture-text {
    font-size: 14px;
    color: #374151;
    font-weight: 500;
  }
  
  .success-icon {
    font-size: 48px;
    margin-bottom: 8px;
  }
  
  .success-text {
    font-size: 16px;
    color: #22c55e;
    font-weight: 600;
  }
  
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  
  .capture-modal {
    background: white;
    border-radius: 16px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }
  
  .modal-header {
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #111827;
  }
  
  .close-modal {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .capture-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 12px;
  }
  
  .items-found {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  
  .count {
    font-size: 32px;
    font-weight: bold;
    color: #22c55e;
  }
  
  .label {
    font-size: 14px;
    color: #6b7280;
  }
  
  .timestamp {
    font-size: 12px;
    color: #9ca3af;
  }
  
  .detections-list {
    space-y: 12px;
  }
  
  .detection-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
  }
  
  .item-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .item-name {
    font-weight: 500;
    color: #111827;
  }
  
  .item-category {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .item-category.recycle {
    background: #dcfce7;
    color: #166534;
  }
  
  .item-category.compost {
    background: #fef3c7;
    color: #92400e;
  }
  
  .item-category.landfill {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .item-confidence {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 8px;
  }
  
  .item-instructions {
    font-size: 14px;
    color: #4b5563;
    line-height: 1.4;
    padding: 8px;
    background: #f9fafb;
    border-radius: 6px;
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    justify-content: center;
  }
  
  .retake-btn, .clear-btn {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .retake-btn {
    background: #3b82f6;
    color: white;
  }
  
  .retake-btn:hover {
    background: #2563eb;
  }
  
  .clear-btn {
    background: #ef4444;
    color: white;
  }
  
  .clear-btn:hover {
    background: #dc2626;
  }
  
  .guidance-overlay {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    max-width: 90%;
    width: 400px;
  }
  
  .guidance-content {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideDown 0.3s ease-out;
  }
  
  .guidance-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .guidance-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    font-weight: 500;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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

<!-- Capture Preview Modal -->
{#if showCapturePreview && lastCapturedPhoto}
  <div class="modal-overlay" on:click={() => showCapturePreview = false}>
    <div class="capture-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>📸 Captured Photo Analysis</h3>
        <button class="close-modal" on:click={() => showCapturePreview = false}>×</button>
      </div>
      
      <div class="modal-content">
        <div class="capture-summary">
          <div class="items-found">
            <span class="count">{lastCapturedPhoto.detections.length}</span>
            <span class="label">Items Detected</span>
          </div>
          <div class="timestamp">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div class="detections-list">
          {#each lastCapturedPhoto.detections as detection}
            <div class="detection-item">
              <div class="item-info">
                <span class="item-name">{detection.class}</span>
                <span class="item-category" class:recycle={detection.category === 'recycle'} 
                      class:compost={detection.category === 'compost'} 
                      class:landfill={detection.category === 'landfill'}>
                  {detection.category}
                </span>
              </div>
              <div class="item-confidence">
                {Math.round(detection.confidence * 100)}%
              </div>
              {#if detection.instructions}
                <div class="item-instructions">
                  {detection.instructions}
                </div>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="modal-actions">
          <button class="retake-btn" on:click={retakePhoto}>
            🔄 Retake Photo
          </button>
          <button class="clear-btn" on:click={clearCaptureHistory}>
            🗑️ Clear History
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- User Guidance Overlay -->
{#if userGuidance}
  <div class="guidance-overlay">
    <div class="guidance-content">
      <div class="guidance-icon">💡</div>
      <p class="guidance-text">{userGuidance}</p>
    </div>
  </div>
{/if> 

<!-- Add results modal -->
{#if capturedDetections.length > 0}
  <div class='results-modal'>
    {#each capturedDetections as d}
      <div aria-live='polite'>{d.class} in {d.category}</div>
      <div>{d.class}: {d.category} - Instructions: {d.instructions || 'Dispose in ' + d.category}</div>
    {/each}
  </div>
{/if> 