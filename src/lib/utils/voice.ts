/**
 * Voice recognition utilities for EcoScan
 * Handles speech-to-text conversion and audio processing
 */

import { config } from '$lib/config';

export interface VoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  timeout?: number;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: {
    transcript: string;
    confidence: number;
  }[];
}

export interface VoiceCapabilities {
  isSupported: boolean;
  hasPermission?: boolean;
  supportedLanguages?: string[];
}

/**
 * Check if speech recognition is supported
 */
export function isVoiceRecognitionSupported(): boolean {
  return !!(
    'webkitSpeechRecognition' in window ||
    'SpeechRecognition' in window
  );
}

/**
 * Get speech recognition constructor
 */
function getSpeechRecognition(): typeof SpeechRecognition | null {
  if ('webkitSpeechRecognition' in window) {
    return (window as any).webkitSpeechRecognition;
  }
  if ('SpeechRecognition' in window) {
    return (window as any).SpeechRecognition;
  }
  return null;
}

/**
 * Check voice recognition capabilities
 */
export async function getVoiceCapabilities(): Promise<VoiceCapabilities> {
  const isSupported = isVoiceRecognitionSupported();
  
  if (!isSupported) {
    return { isSupported: false };
  }

  try {
    // Check if we can create an instance (some browsers require user gesture)
    const SpeechRecognition = getSpeechRecognition();
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.abort(); // Clean up immediately
      
      return {
        isSupported: true,
        hasPermission: true, // If we can create instance, likely have permission
        supportedLanguages: getSupportedLanguages()
      };
    }
  } catch (error) {
    console.warn('Voice recognition permission check failed:', error);
  }

  return {
    isSupported: true,
    hasPermission: false
  };
}

/**
 * Get supported languages for speech recognition
 */
function getSupportedLanguages(): string[] {
  // Common languages supported by most browsers
  return [
    'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
    'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT',
    'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN',
    'ar-SA', 'hi-IN', 'th-TH', 'vi-VN'
  ];
}

/**
 * Create speech recognition instance
 */
export function createSpeechRecognition(
  options: VoiceRecognitionOptions = {}
): SpeechRecognition | null {
  if (!isVoiceRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  
  // Configure recognition settings
  recognition.lang = options.language || config.voice.language;
  recognition.continuous = options.continuous || config.voice.continuous;
  recognition.interimResults = options.interimResults || config.voice.interimResults;
  recognition.maxAlternatives = options.maxAlternatives || config.voice.maxAlternatives;

  return recognition;
}

/**
 * Start voice recognition with promise interface
 */
export function startVoiceRecognition(
  options: VoiceRecognitionOptions = {}
): Promise<VoiceRecognitionResult> {
  return new Promise((resolve, reject) => {
    const recognition = createSpeechRecognition(options);
    
    if (!recognition) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    const timeout = options.timeout || 10000; // 10 seconds default
    let timeoutId: NodeJS.Timeout | undefined;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        recognition.abort();
        reject(new Error('Voice recognition timeout'));
      }, timeout);
    }

    recognition.onresult = (event) => {
      if (timeoutId) clearTimeout(timeoutId);

      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence || 0;

      // Get alternatives
      const alternatives = [];
      for (let i = 1; i < result.length; i++) {
        alternatives.push({
          transcript: result[i].transcript.trim(),
          confidence: result[i].confidence || 0
        });
      }

      resolve({
        transcript,
        confidence,
        isFinal: result.isFinal,
        alternatives: alternatives.length > 0 ? alternatives : undefined
      });
    };

    recognition.onerror = (event) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(handleVoiceError(event.error)));
    };

    recognition.onend = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    try {
      recognition.start();
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Handle voice recognition errors with user-friendly messages
 */
function handleVoiceError(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech detected. Please try speaking more clearly.';
    case 'audio-capture':
      return 'Microphone not accessible. Please check your microphone connection.';
    case 'not-allowed':
      return 'Microphone permission denied. Please allow microphone access.';
    case 'network':
      return 'Network error occurred. Please check your internet connection.';
    case 'service-not-allowed':
      return 'Speech recognition service not available.';
    case 'bad-grammar':
      return 'Speech recognition grammar error.';
    case 'language-not-supported':
      return 'Selected language not supported for speech recognition.';
    case 'aborted':
      return 'Speech recognition was cancelled.';
    default:
      return `Speech recognition error: ${error}`;
  }
}

/**
 * Process voice input for waste classification
 */
export function processVoiceForClassification(transcript: string): {
  keywords: string[];
  cleanText: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const cleanText = cleanTranscript(transcript);
  const keywords = extractKeywords(cleanText);
  const confidence = assessTranscriptConfidence(cleanText, keywords);

  return { keywords, cleanText, confidence };
}

/**
 * Clean and normalize transcript
 */
function cleanTranscript(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Extract keywords relevant to waste classification
 */
function extractKeywords(text: string): string[] {
  const wasteKeywords = [
    // Recyclables
    'bottle', 'can', 'plastic', 'paper', 'cardboard', 'glass', 'metal',
    'aluminum', 'tin', 'container', 'box', 'bag', 'wrapper',
    
    // Compostables
    'apple', 'banana', 'orange', 'food', 'fruit', 'vegetable',
    'core', 'peel', 'scraps', 'organic', 'leaves', 'coffee',
    'tea', 'eggshell', 'bread',
    
    // Materials
    'plastic', 'paper', 'glass', 'metal', 'fabric', 'wood',
    'rubber', 'foam', 'ceramic', 'electronics',
    
    // Specific items
    'newspaper', 'magazine', 'yogurt', 'milk', 'water', 'soda',
    'juice', 'wine', 'beer', 'jar', 'lid', 'cap',
    
    // Waste categories
    'recycle', 'recyclable', 'compost', 'compostable', 'trash',
    'garbage', 'landfill', 'waste', 'refuse'
  ];

  const words = text.split(' ');
  const foundKeywords = [];

  for (const word of words) {
    if (wasteKeywords.includes(word)) {
      foundKeywords.push(word);
    }
  }

  // Also check for compound phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    const compoundKeywords = [
      'plastic bottle', 'glass bottle', 'tin can', 'aluminum can',
      'coffee cup', 'tea bag', 'food waste', 'apple core',
      'banana peel', 'orange peel', 'egg shell', 'pizza box'
    ];
    
    if (compoundKeywords.includes(phrase)) {
      foundKeywords.push(phrase);
    }
  }

  return [...new Set(foundKeywords)]; // Remove duplicates
}

/**
 * Assess confidence in transcript for waste classification
 */
function assessTranscriptConfidence(
  text: string, 
  keywords: string[]
): 'high' | 'medium' | 'low' {
  if (keywords.length === 0) {
    return 'low';
  }

  if (keywords.length >= 2 || text.length >= 10) {
    return 'high';
  }

  return 'medium';
}

/**
 * Convert speech to waste classification query
 */
export function speechToWasteQuery(transcript: string): {
  query: string;
  type: 'item' | 'material' | 'category';
  confidence: number;
} {
  const processed = processVoiceForClassification(transcript);
  
  if (processed.keywords.length === 0) {
    return {
      query: processed.cleanText,
      type: 'item',
      confidence: 0.3
    };
  }

  // Determine query type based on keywords
  const categories = ['recycle', 'recyclable', 'compost', 'compostable', 'trash', 'garbage', 'landfill'];
  const materials = ['plastic', 'paper', 'glass', 'metal', 'fabric', 'wood', 'rubber'];
  
  const hasCategory = processed.keywords.some(k => categories.includes(k));
  const hasMaterial = processed.keywords.some(k => materials.includes(k));

  let type: 'item' | 'material' | 'category';
  if (hasCategory) {
    type = 'category';
  } else if (hasMaterial) {
    type = 'material';
  } else {
    type = 'item';
  }

  // Use primary keyword as query
  const query = processed.keywords[0] || processed.cleanText;
  
  // Calculate confidence based on keyword strength and clarity
  const confidence = Math.min(
    0.5 + (processed.keywords.length * 0.2) + 
    (processed.confidence === 'high' ? 0.3 : processed.confidence === 'medium' ? 0.15 : 0),
    1.0
  );

  return { query, type, confidence };
}

/**
 * Get microphone permission status
 */
export async function getMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!navigator.permissions) {
    return 'prompt'; // Assume unknown, will be tested on first use
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (error) {
    console.warn('Could not query microphone permission:', error);
    return 'prompt';
  }
}

/**
 * Test microphone access
 */
export async function testMicrophone(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, error: 'Microphone access not supported' };
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately
    stream.getTracks().forEach(track => track.stop());
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.name === 'NotAllowedError' 
        ? 'Microphone permission denied'
        : 'Microphone not accessible'
    };
  }
}

/**
 * Provide speech recognition tips
 */
export function getSpeechTips(): string[] {
  return [
    'Speak clearly and at a normal pace',
    'Try to be in a quiet environment',
    'Hold the microphone button while speaking',
    'Say the item name and material if known',
    'Examples: "plastic bottle", "banana peel", "cardboard box"',
    'Speak for 2-5 seconds for best results'
  ];
} 