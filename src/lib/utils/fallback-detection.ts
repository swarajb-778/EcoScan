/**
 * Fallback Detection System
 * Provides alternative detection methods when camera access fails
 */

import { isBrowser, isClipboardSupported, isSpeechRecognitionSupported } from './browser.js';
import type { Detection } from '../types/index.js';

export interface FallbackOptions {
  enableImageUpload: boolean;
  enableVoiceInput: boolean;
  enableTextInput: boolean;
  enableDragDrop: boolean;
  enableClipboard: boolean;
  enableQRCodeDetection: boolean;
}

export interface FallbackCapabilities {
  imageUpload: boolean;
  voiceInput: boolean;
  textInput: boolean;
  dragDrop: boolean;
  clipboard: boolean;
  qrCode: boolean;
  fileApi: boolean;
  webWorkers: boolean;
}

export interface FallbackResult {
  success: boolean;
  method: 'image' | 'voice' | 'text' | 'qr' | 'clipboard';
  data: string | File | Blob;
  confidence: number;
  message: string;
}

/**
 * Analyze available fallback capabilities
 */
export function analyzeFallbackCapabilities(): FallbackCapabilities {
  if (!isBrowser()) {
    return {
      imageUpload: false,
      voiceInput: false,
      textInput: false,
      dragDrop: false,
      clipboard: false,
      qrCode: false,
      fileApi: false,
      webWorkers: false
    };
  }

  return {
    imageUpload: !!(window.File && window.FileReader && window.FileList),
    voiceInput: isSpeechRecognitionSupported(),
    textInput: true, // Always available
    dragDrop: 'ondragover' in window && 'ondrop' in window,
    clipboard: isClipboardSupported(),
    qrCode: !!(window.HTMLCanvasElement && window.CanvasRenderingContext2D),
    fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
    webWorkers: !!window.Worker
  };
}

/**
 * Get optimal fallback options based on device capabilities
 */
export function getOptimalFallbackOptions(): FallbackOptions {
  const capabilities = analyzeFallbackCapabilities();
  
  return {
    enableImageUpload: capabilities.imageUpload,
    enableVoiceInput: capabilities.voiceInput,
    enableTextInput: true, // Always enable as last resort
    enableDragDrop: capabilities.dragDrop,
    enableClipboard: capabilities.clipboard,
    enableQRCodeDetection: capabilities.qrCode
  };
}

/**
 * Fallback Detection Engine
 */
export class FallbackDetectionEngine {
  private options: FallbackOptions;
  private capabilities: FallbackCapabilities;

  constructor(options?: Partial<FallbackOptions>) {
    this.capabilities = analyzeFallbackCapabilities();
    this.options = {
      ...getOptimalFallbackOptions(),
      ...options
    };
  }

  /**
   * Detect objects from uploaded image
   */
  async detectFromImage(imageFile: File): Promise<Detection[]> {
    if (!this.capabilities.fileApi) {
      throw new Error('File API not supported');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          const detections = await this.processImageData(imageData);
          resolve(detections);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Process image data and extract objects
   */
  private async processImageData(imageData: string): Promise<Detection[]> {
    // This would integrate with the ML detection system
    // For now, return mock detection based on image analysis
    
    const mockDetections: Detection[] = [
      {
        id: '1',
        label: 'Detected Object',
        category: 'recycle',
        confidence: 0.85,
        bbox: [100, 100, 200, 150],
        instructions: 'Please upload for manual classification',
        tips: ['Image upload detected - manual review recommended']
      }
    ];
    
    return mockDetections;
  }

  /**
   * Detect objects from voice input
   */
  async detectFromVoice(audioBlob?: Blob): Promise<Detection[]> {
    if (!this.capabilities.voiceInput && !audioBlob) {
      throw new Error('Voice input not supported');
    }

    return new Promise((resolve, reject) => {
      try {
        const recognition = new ((window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition)();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          const detections = this.parseVoiceInput(transcript);
          resolve(detections);
        };
        
        recognition.onerror = (event: any) => {
          reject(new Error(`Voice recognition error: ${event.error}`));
        };
        
        recognition.start();
        
        // Timeout after 10 seconds
        setTimeout(() => {
          recognition.stop();
          reject(new Error('Voice input timeout'));
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Parse voice input and convert to detection
   */
  private parseVoiceInput(transcript: string): Detection[] {
    const wasteKeywords = {
      recycle: ['bottle', 'can', 'plastic', 'cardboard', 'paper', 'aluminum'],
      compost: ['apple', 'banana', 'food', 'organic', 'vegetable', 'fruit'],
      trash: ['wrapper', 'straw', 'styrofoam', 'chip bag', 'candy']
    };
    
    let bestMatch = { category: 'trash', confidence: 0.5, keyword: '' };
    
    for (const [category, keywords] of Object.entries(wasteKeywords)) {
      for (const keyword of keywords) {
        if (transcript.includes(keyword)) {
          const confidence = Math.min(0.9, 0.6 + (keyword.length / transcript.length) * 0.3);
          if (confidence > bestMatch.confidence) {
            bestMatch = { category, confidence, keyword };
          }
        }
      }
    }
    
    const detection: Detection = {
      id: '1',
      label: bestMatch.keyword || 'Voice Input',
      category: bestMatch.category as 'recycle' | 'compost' | 'trash',
      confidence: bestMatch.confidence,
      bbox: [0, 0, 100, 100], // Placeholder bbox for voice input
      instructions: this.getCategoryInstructions(bestMatch.category as any),
      tips: [`Voice input detected: "${transcript}"`]
    };
    
    return [detection];
  }

  /**
   * Detect objects from text input
   */
  async detectFromText(text: string): Promise<Detection[]> {
    const normalizedText = text.toLowerCase().trim();
    
    if (!normalizedText) {
      throw new Error('Please enter a description of the waste item');
    }
    
    // Simple keyword matching for text input
    const wasteDatabase = {
      // Recyclables
      'plastic bottle': { category: 'recycle', confidence: 0.9 },
      'water bottle': { category: 'recycle', confidence: 0.9 },
      'soda can': { category: 'recycle', confidence: 0.9 },
      'aluminum can': { category: 'recycle', confidence: 0.9 },
      'cardboard': { category: 'recycle', confidence: 0.8 },
      'newspaper': { category: 'recycle', confidence: 0.8 },
      'magazine': { category: 'recycle', confidence: 0.8 },
      
      // Compostables
      'apple core': { category: 'compost', confidence: 0.9 },
      'banana peel': { category: 'compost', confidence: 0.9 },
      'food scraps': { category: 'compost', confidence: 0.8 },
      'coffee grounds': { category: 'compost', confidence: 0.8 },
      'vegetable peel': { category: 'compost', confidence: 0.8 },
      
      // Trash
      'chip bag': { category: 'trash', confidence: 0.9 },
      'candy wrapper': { category: 'trash', confidence: 0.9 },
      'styrofoam': { category: 'trash', confidence: 0.9 },
      'plastic straw': { category: 'trash', confidence: 0.8 }
    };
    
    let bestMatch = { category: 'trash', confidence: 0.3, keyword: 'unknown item' };
    
    // Find best matching item
    for (const [item, data] of Object.entries(wasteDatabase)) {
      if (normalizedText.includes(item)) {
        if (data.confidence > bestMatch.confidence) {
          bestMatch = { ...data, keyword: item };
        }
      }
    }
    
    // Fuzzy matching for partial matches
    if (bestMatch.confidence < 0.5) {
      for (const [item, data] of Object.entries(wasteDatabase)) {
        const words = item.split(' ');
        const textWords = normalizedText.split(' ');
        
        const matchCount = words.filter(word => textWords.includes(word)).length;
        const fuzzyConfidence = (matchCount / words.length) * data.confidence * 0.8;
        
        if (fuzzyConfidence > bestMatch.confidence) {
          bestMatch = { category: data.category, confidence: fuzzyConfidence, keyword: item };
        }
      }
    }
    
    const detection: Detection = {
      id: '1',
      label: bestMatch.keyword.charAt(0).toUpperCase() + bestMatch.keyword.slice(1),
      category: bestMatch.category as 'recycle' | 'compost' | 'trash',
      confidence: bestMatch.confidence,
      bbox: [0, 0, 100, 100], // Placeholder bbox for text input
      instructions: this.getCategoryInstructions(bestMatch.category as any),
      tips: [`Text input: "${text}"`]
    };
    
    return [detection];
  }

  /**
   * Detect from clipboard image
   */
  async detectFromClipboard(): Promise<Detection[]> {
    if (!this.capabilities.clipboard) {
      throw new Error('Clipboard access not supported');
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            return this.processImageBlob(blob);
          }
        }
      }
      
      throw new Error('No image found in clipboard');
    } catch (error) {
      throw new Error(`Clipboard access failed: ${error}`);
    }
  }

  /**
   * Process image blob
   */
  private async processImageBlob(blob: Blob): Promise<Detection[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          const detections = await this.processImageData(imageData);
          resolve(detections);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read clipboard image'));
      };
      
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get category-specific instructions
   */
  private getCategoryInstructions(category: string): string {
    const instructions = {
      recycle: 'Clean the item and place in recycling bin',
      compost: 'Add to compost bin or organic waste collection',
      trash: 'Dispose in regular trash bin',
      hazardous: 'Take to hazardous waste facility'
    };
    
    return instructions[category as keyof typeof instructions] || 'Dispose appropriately';
  }

  /**
   * Get available fallback methods
   */
  getAvailableMethods(): Array<{
    method: string;
    name: string;
    description: string;
    icon: string;
    available: boolean;
  }> {
    return [
      {
        method: 'image',
        name: 'Upload Image',
        description: 'Take a photo or select an image from your device',
        icon: '📷',
        available: this.options.enableImageUpload && this.capabilities.imageUpload
      },
      {
        method: 'voice',
        name: 'Voice Input',
        description: 'Describe the waste item using your voice',
        icon: '🎤',
        available: this.options.enableVoiceInput && this.capabilities.voiceInput
      },
      {
        method: 'text',
        name: 'Text Input',
        description: 'Type a description of the waste item',
        icon: '⌨️',
        available: this.options.enableTextInput
      },
      {
        method: 'clipboard',
        name: 'Paste Image',
        description: 'Paste an image from your clipboard',
        icon: '📋',
        available: this.options.enableClipboard && this.capabilities.clipboard
      }
    ].filter(method => method.available);
  }

  /**
   * Get recommendations for improving detection accuracy
   */
  getDetectionTips(): string[] {
    return [
      'Ensure good lighting for image uploads',
      'Hold items close to camera for better recognition',
      'Use clear, descriptive terms for voice/text input',
      'Check recycling guidelines for your local area',
      'When in doubt, check with your waste management provider'
    ];
  }
}

/**
 * Global fallback detection engine instance
 */
let globalFallbackEngine: FallbackDetectionEngine | null = null;

/**
 * Get or create global fallback detection engine
 */
export function getFallbackDetectionEngine(options?: Partial<FallbackOptions>): FallbackDetectionEngine {
  if (!globalFallbackEngine) {
    globalFallbackEngine = new FallbackDetectionEngine(options);
  }
  return globalFallbackEngine;
}

/**
 * Quick access functions
 */
export const fallback = {
  analyze: () => analyzeFallbackCapabilities(),
  getOptions: () => getOptimalFallbackOptions(),
  fromImage: (file: File) => getFallbackDetectionEngine().detectFromImage(file),
  fromVoice: (audioBlob?: Blob) => getFallbackDetectionEngine().detectFromVoice(audioBlob),
  fromText: (text: string) => getFallbackDetectionEngine().detectFromText(text),
  fromClipboard: () => getFallbackDetectionEngine().detectFromClipboard(),
  getMethods: () => getFallbackDetectionEngine().getAvailableMethods(),
  getTips: () => getFallbackDetectionEngine().getDetectionTips()
}; 