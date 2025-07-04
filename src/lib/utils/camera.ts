/**
 * Camera utility functions for EcoScan
 * Handles camera permissions, device enumeration, and stream management
 */

import { config } from '$lib/config';

export interface CameraDevice {
  deviceId: string;
  label: string;
  facingMode?: 'user' | 'environment';
}

export interface CameraCapabilities {
  hasCamera: boolean;
  hasMultipleCameras: boolean;
  supportsConstraints: boolean;
  devices: CameraDevice[];
}

/**
 * Check if the browser supports camera access
 */
export function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately as we just needed permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.warn('Camera permission denied:', error);
    return false;
  }
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  if (!isCameraSupported()) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        facingMode: detectFacingMode(device.label)
      }));
  } catch (error) {
    console.error('Error enumerating camera devices:', error);
    return [];
  }
}

/**
 * Detect camera facing mode from device label
 */
function detectFacingMode(label: string): 'user' | 'environment' | undefined {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('back') || lowerLabel.includes('rear') || lowerLabel.includes('environment')) {
    return 'environment';
  }
  if (lowerLabel.includes('front') || lowerLabel.includes('user') || lowerLabel.includes('selfie')) {
    return 'user';
  }
  return undefined;
}

/**
 * Get camera capabilities for the current device
 */
export async function getCameraCapabilities(): Promise<CameraCapabilities> {
  const hasCamera = isCameraSupported();
  if (!hasCamera) {
    return {
      hasCamera: false,
      hasMultipleCameras: false,
      supportsConstraints: false,
      devices: []
    };
  }

  const devices = await getCameraDevices();
  return {
    hasCamera: true,
    hasMultipleCameras: devices.length > 1,
    supportsConstraints: !!(navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints),
    devices
  };
}

/**
 * Create camera stream with fallback options
 */
export async function createCameraStream(deviceId?: string): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new Error('Camera not supported in this browser');
  }

  // Primary constraints
  const primaryConstraints: MediaStreamConstraints = {
    video: {
      ...config.camera.defaultConstraints.video,
      ...(deviceId && { deviceId: { exact: deviceId } })
    },
    audio: false
  };

  try {
    return await navigator.mediaDevices.getUserMedia(primaryConstraints);
  } catch (error) {
    console.warn('Failed with primary constraints, trying fallback:', error);
    
    // Fallback constraints
    const fallbackConstraints: MediaStreamConstraints = {
      video: {
        ...config.camera.fallbackConstraints.video,
        ...(deviceId && { deviceId: { exact: deviceId } })
      },
      audio: false
    };

    try {
      return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
    } catch (fallbackError) {
      console.warn('Fallback constraints failed, trying minimal constraints:', fallbackError);
      
      // Minimal constraints as last resort
      const minimalConstraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      };
      return await navigator.mediaDevices.getUserMedia(minimalConstraints);
    }
  }
}

/**
 * Stop camera stream and release resources
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
}

/**
 * Switch camera device
 */
export async function switchCamera(currentStream: MediaStream | null, deviceId: string): Promise<MediaStream> {
  // Stop current stream
  stopCameraStream(currentStream);
  
  // Create new stream with specified device
  return await createCameraStream(deviceId);
}

/**
 * Check if device has rear camera
 */
export async function hasRearCamera(): Promise<boolean> {
  const devices = await getCameraDevices();
  return devices.some(device => device.facingMode === 'environment');
}

/**
 * Get preferred camera device (rear camera if available)
 */
export async function getPreferredCamera(): Promise<string | undefined> {
  const devices = await getCameraDevices();
  const rearCamera = devices.find(device => device.facingMode === 'environment');
  return rearCamera?.deviceId || devices[0]?.deviceId;
}

/**
 * Handle camera errors with user-friendly messages
 */
export function handleCameraError(error: any): string {
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return 'Camera permission denied. Please allow camera access and try again.';
  }
  
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return 'No camera found. Please check if your device has a camera.';
  }
  
  if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
    return 'Camera is already in use by another application. Please close other camera apps and try again.';
  }
  
  if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
    return 'Camera does not support the required settings. Trying with different settings...';
  }
  
  if (error.name === 'NotSupportedError') {
    return 'Camera is not supported in this browser. Please try a different browser.';
  }
  
  if (error.name === 'TypeError') {
    return 'Browser does not support camera access. Please use a modern browser.';
  }
  
  return `Camera error: ${error.message || 'Unknown error occurred'}`;
}

/**
 * Test camera functionality
 */
export async function testCamera(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isCameraSupported()) {
      return { success: false, error: 'Camera not supported' };
    }

    const stream = await createCameraStream();
    stopCameraStream(stream);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: handleCameraError(error)
    };
  }
} 