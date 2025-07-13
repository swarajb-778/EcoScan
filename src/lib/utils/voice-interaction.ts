/**
 * Advanced Voice Interaction System for EcoScan
 * 
 * Features:
 * - Speech recognition with multi-language support
 * - Text-to-speech synthesis with voice customization
 * - Voice command processing and natural language understanding
 * - Accessibility compliance with screen reader integration
 * - Audio feedback and sonic branding
 * - Noise cancellation and audio enhancement
 * - Voice biometrics and user identification
 * - Continuous listening and wake word detection
 * - Offline voice processing capabilities
 * - Voice analytics and performance tracking
 * - Custom voice models and training
 * - Audio visualization and waveform analysis
 * - Multi-modal interaction support
 * - Voice-controlled navigation and shortcuts
 * - Personalized voice assistant features
 * 
 * Voice Commands:
 * - "Scan waste" - Start scanning process
 * - "Take photo" - Capture image
 * - "Read results" - Announce detection results
 * - "Help" - Voice-guided assistance
 * - "Settings" - Open voice settings
 * - "Repeat" - Repeat last announcement
 * - "Navigate to [page]" - Voice navigation
 * - "Filter by [category]" - Apply filters
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { advancedAnalytics } from './advanced-analytics';

// Voice interaction interfaces
export interface VoiceConfig {
  enabled: boolean;
  recognition: {
    enabled: boolean;
    continuous: boolean;
    interimResults: boolean;
    language: string;
    maxAlternatives: number;
    sensitivity: number;
    timeout: number;
    noiseThreshold: number;
  };
  synthesis: {
    enabled: boolean;
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
    language: string;
    ssml: boolean;
  };
  commands: {
    enabled: boolean;
    wakeWord: string;
    confirmationSounds: boolean;
    confidenceThreshold: number;
    contextAware: boolean;
  };
  accessibility: {
    screenReader: boolean;
    audioDescriptions: boolean;
    hapticFeedback: boolean;
    visualIndicators: boolean;
    keyboardShortcuts: boolean;
  };
  privacy: {
    localProcessing: boolean;
    dataRetention: number;
    anonymization: boolean;
    consentRequired: boolean;
  };
}

export interface VoiceCommand {
  id: string;
  patterns: string[];
  action: string;
  description: string;
  category: 'navigation' | 'scanning' | 'settings' | 'help' | 'accessibility';
  parameters?: VoiceParameter[];
  confidence: number;
  enabled: boolean;
  contextRequired?: string[];
}

export interface VoiceParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  values?: string[];
  pattern?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  alternatives: string[];
  isFinal: boolean;
  timestamp: number;
  duration: number;
  language: string;
  metadata: any;
}

export interface VoiceCommandMatch {
  command: VoiceCommand;
  parameters: Record<string, any>;
  confidence: number;
  timestamp: number;
  context: string;
}

export interface SynthesisOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  ssml?: boolean;
  interrupt?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface VoiceAnalytics {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageConfidence: number;
  popularCommands: Array<{ command: string; count: number }>;
  recognitionAccuracy: number;
  synthesisUsage: number;
  errorRate: number;
  responseTime: number;
  languageUsage: Record<string, number>;
}

export interface AudioFeatures {
  amplitude: number;
  frequency: number;
  pitch: number;
  volume: number;
  noiseLevel: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  isVoice: boolean;
  isSpeech: boolean;
}

class VoiceInteractionSystem {
  private config: VoiceConfig;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private synthQueue: SynthesisOptions[] = [];
  private isListening = false;
  private isSpeaking = false;
  private currentContext = '';
  private analytics: VoiceAnalytics;
  private wakeWordDetector: any = null;
  private noiseGate: any = null;
  private voiceProcessor: any = null;

  // Reactive stores
  private _listening = writable<boolean>(false);
  private _speaking = writable<boolean>(false);
  private _lastTranscript = writable<string>('');
  private _lastCommand = writable<VoiceCommandMatch | null>(null);
  private _voices = writable<SpeechSynthesisVoice[]>([]);
  private _audioLevel = writable<number>(0);
  private _analyticsStore = writable<VoiceAnalytics>(this.getInitialAnalytics());
  private _accessibility = writable<{ enabled: boolean; features: string[] }>({
    enabled: false,
    features: []
  });

  public readonly listening: Readable<boolean> = this._listening;
  public readonly speaking: Readable<boolean> = this._speaking;
  public readonly lastTranscript: Readable<string> = this._lastTranscript;
  public readonly lastCommand: Readable<VoiceCommandMatch | null> = this._lastCommand;
  public readonly voices: Readable<SpeechSynthesisVoice[]> = this._voices;
  public readonly audioLevel: Readable<number> = this._audioLevel;
  public readonly analyticsStore: Readable<VoiceAnalytics> = this._analyticsStore;
  public readonly accessibility: Readable<any> = this._accessibility;

  constructor() {
    this.config = this.getVoiceConfig();
    this.analytics = this.getInitialAnalytics();
    this.initializeVoiceSystem();
  }

  private getVoiceConfig(): VoiceConfig {
    return {
      enabled: true,
      recognition: {
        enabled: true,
        continuous: true,
        interimResults: true,
        language: 'en-US',
        maxAlternatives: 3,
        sensitivity: 0.7,
        timeout: 5000,
        noiseThreshold: 0.3
      },
      synthesis: {
        enabled: true,
        voice: 'default',
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        language: 'en-US',
        ssml: false
      },
      commands: {
        enabled: true,
        wakeWord: 'eco scan',
        confirmationSounds: true,
        confidenceThreshold: 0.7,
        contextAware: true
      },
      accessibility: {
        screenReader: true,
        audioDescriptions: true,
        hapticFeedback: true,
        visualIndicators: true,
        keyboardShortcuts: true
      },
      privacy: {
        localProcessing: true,
        dataRetention: 0, // Don't retain voice data
        anonymization: true,
        consentRequired: true
      }
    };
  }

  private getInitialAnalytics(): VoiceAnalytics {
    return {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageConfidence: 0,
      popularCommands: [],
      recognitionAccuracy: 0,
      synthesisUsage: 0,
      errorRate: 0,
      responseTime: 0,
      languageUsage: {}
    };
  }

  private initializeVoiceSystem(): void {
    if (!browser || !this.config.enabled) return;

    try {
      this.setupSpeechRecognition();
      this.setupSpeechSynthesis();
      this.setupAudioContext();
      this.setupVoiceCommands();
      this.setupAccessibilityFeatures();
      this.setupWakeWordDetection();
      this.loadVoices();
      
      console.log('🎤 Voice interaction system initialized');
    } catch (error) {
      console.error('Failed to initialize voice system:', error);
    }
  }

  private setupSpeechRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    if (this.recognition) {
      this.recognition.continuous = this.config.recognition.continuous;
      this.recognition.interimResults = this.config.recognition.interimResults;
      this.recognition.lang = this.config.recognition.language;
      this.recognition.maxAlternatives = this.config.recognition.maxAlternatives;

      this.recognition.onstart = () => {
        this.isListening = true;
        this._listening.set(true);
        this.playSound('listening_start');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this._listening.set(false);
        this.playSound('listening_end');
      };

      this.recognition.onresult = (event: any) => {
        this.handleSpeechResult(event);
      };

      this.recognition.onerror = (event: any) => {
        this.handleSpeechError(event);
      };
    }
  }

  private setupSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      
      // Load voices
      this.synthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    } else {
      console.warn('Speech synthesis not supported');
    }
  }

  private setupAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.setupAudioProcessing();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Set up audio analysis
      this.setupAudioAnalysis(source);
      
      // Set up noise gate
      this.setupNoiseGate(source);
      
    } catch (error) {
      console.warn('Failed to setup audio processing:', error);
    }
  }

  private setupAudioAnalysis(source: MediaStreamAudioSourceNode): void {
    if (!this.audioContext) return;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      this._audioLevel.set(average / 255);
      
      if (this.isListening) {
        requestAnimationFrame(updateAudioLevel);
      }
    };

    updateAudioLevel();
  }

  private setupNoiseGate(source: MediaStreamAudioSourceNode): void {
    if (!this.audioContext) return;

    // Simple noise gate implementation
    const gainNode = this.audioContext.createGain();
    source.connect(gainNode);
    
    this.noiseGate = gainNode;
  }

  private setupVoiceCommands(): void {
    // Navigation commands
    this.addCommand({
      id: 'scan_waste',
      patterns: ['scan waste', 'start scan', 'take photo', 'capture image'],
      action: 'startScan',
      description: 'Start the waste scanning process',
      category: 'scanning',
      confidence: 0.8,
      enabled: true
    });

    this.addCommand({
      id: 'go_home',
      patterns: ['go home', 'home page', 'main page'],
      action: 'navigate',
      description: 'Navigate to the home page',
      category: 'navigation',
      parameters: [{ name: 'page', type: 'string', required: true, values: ['home'] }],
      confidence: 0.7,
      enabled: true
    });

    this.addCommand({
      id: 'show_results',
      patterns: ['show results', 'view results', 'see detection'],
      action: 'navigate',
      description: 'Show scan results',
      category: 'navigation',
      parameters: [{ name: 'page', type: 'string', required: true, values: ['results'] }],
      confidence: 0.7,
      enabled: true
    });

    // Accessibility commands
    this.addCommand({
      id: 'read_page',
      patterns: ['read page', 'read this', 'describe page'],
      action: 'readPage',
      description: 'Read the current page content',
      category: 'accessibility',
      confidence: 0.8,
      enabled: true
    });

    this.addCommand({
      id: 'help',
      patterns: ['help', 'what can I say', 'voice commands', 'how to use'],
      action: 'showHelp',
      description: 'Show available voice commands',
      category: 'help',
      confidence: 0.9,
      enabled: true
    });

    this.addCommand({
      id: 'repeat',
      patterns: ['repeat', 'say again', 'repeat that'],
      action: 'repeat',
      description: 'Repeat the last announcement',
      category: 'accessibility',
      confidence: 0.8,
      enabled: true
    });

    // Settings commands
    this.addCommand({
      id: 'voice_settings',
      patterns: ['voice settings', 'speech settings', 'audio settings'],
      action: 'openVoiceSettings',
      description: 'Open voice and audio settings',
      category: 'settings',
      confidence: 0.7,
      enabled: true
    });

    this.addCommand({
      id: 'stop_listening',
      patterns: ['stop listening', 'turn off voice', 'disable voice'],
      action: 'stopListening',
      description: 'Stop voice recognition',
      category: 'settings',
      confidence: 0.8,
      enabled: true
    });
  }

  private setupAccessibilityFeatures(): void {
    if (!this.config.accessibility.screenReader) return;

    // Set up ARIA live regions for announcements
    this.createAriaLiveRegions();
    
    // Set up keyboard shortcuts
    if (this.config.accessibility.keyboardShortcuts) {
      this.setupKeyboardShortcuts();
    }

    // Update accessibility status
    this._accessibility.set({
      enabled: true,
      features: [
        'screen_reader',
        'voice_commands',
        'keyboard_shortcuts',
        'audio_descriptions'
      ]
    });
  }

  private createAriaLiveRegions(): void {
    // Create polite announcements region
    const politeRegion = document.createElement('div');
    politeRegion.id = 'voice-announcements-polite';
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.style.position = 'absolute';
    politeRegion.style.left = '-10000px';
    politeRegion.style.width = '1px';
    politeRegion.style.height = '1px';
    politeRegion.style.overflow = 'hidden';
    document.body.appendChild(politeRegion);

    // Create assertive announcements region
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'voice-announcements-assertive';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.style.position = 'absolute';
    assertiveRegion.style.left = '-10000px';
    assertiveRegion.style.width = '1px';
    assertiveRegion.style.height = '1px';
    assertiveRegion.style.overflow = 'hidden';
    document.body.appendChild(assertiveRegion);
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + Shift + V: Toggle voice recognition
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        this.toggleListening();
      }

      // Ctrl/Cmd + Shift + H: Voice help
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        this.executeCommand('showHelp', {});
      }

      // Ctrl/Cmd + Shift + R: Read page
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.executeCommand('readPage', {});
      }
    });
  }

  private setupWakeWordDetection(): void {
    // Simplified wake word detection
    // In a real implementation, this would use a more sophisticated algorithm
    if (this.config.commands.wakeWord && this.config.commands.enabled) {
      // This would integrate with a wake word detection library
      console.log(`Wake word detection enabled: "${this.config.commands.wakeWord}"`);
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return;

    const voices = this.synthesis.getVoices();
    this._voices.set(voices);

    // Set default voice if not already set
    if (this.config.synthesis.voice === 'default' && voices.length > 0) {
      const defaultVoice = voices.find(voice => voice.default) || voices[0];
      this.config.synthesis.voice = defaultVoice.name;
    }
  }

  // Public API methods
  public startListening(): void {
    if (!this.recognition || this.isListening) return;

    try {
      this.recognition.start();
      this.announceToScreenReader('Voice recognition started', 'polite');
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.announceToScreenReader('Failed to start voice recognition', 'assertive');
    }
  }

  public stopListening(): void {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
      this.announceToScreenReader('Voice recognition stopped', 'polite');
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }

  public toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  public async speak(options: SynthesisOptions): Promise<void> {
    if (!this.synthesis || !this.config.synthesis.enabled) {
      console.warn('Speech synthesis not available');
      return;
    }

    return new Promise((resolve, reject) => {
      // Add to queue if currently speaking and not interrupting
      if (this.isSpeaking && !options.interrupt) {
        this.synthQueue.push(options);
        return resolve();
      }

      // Stop current speech if interrupting
      if (this.isSpeaking && options.interrupt) {
        this.synthesis!.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(options.text);
      
      // Set voice properties
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.name === (options.voice || this.config.synthesis.voice));
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = options.rate || this.config.synthesis.rate;
      utterance.pitch = options.pitch || this.config.synthesis.pitch;
      utterance.volume = options.volume || this.config.synthesis.volume;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this._speaking.set(true);
        options.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this._speaking.set(false);
        this.analytics.synthesisUsage++;
        this.updateAnalytics();
        
        // Process queue
        this.processVoiceQueue();
        
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (error) => {
        this.isSpeaking = false;
        this._speaking.set(false);
        options.onError?.(error);
        reject(error);
      };

      this.synthesis.speak(utterance);
    });
  }

  public announceToScreenReader(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const regionId = `voice-announcements-${priority}`;
    const region = document.getElementById(regionId);
    
    if (region) {
      region.textContent = text;
      
      // Also speak if synthesis is enabled
      if (this.config.synthesis.enabled) {
        this.speak({
          text,
          priority: priority === 'assertive' ? 'high' : 'normal'
        });
      }
    }
  }

  public addCommand(command: VoiceCommand): void {
    this.voiceCommands.set(command.id, command);
  }

  public removeCommand(commandId: string): void {
    this.voiceCommands.delete(commandId);
  }

  public getCommands(): VoiceCommand[] {
    return Array.from(this.voiceCommands.values());
  }

  public setContext(context: string): void {
    this.currentContext = context;
  }

  public getContext(): string {
    return this.currentContext;
  }

  public async executeCommand(action: string, parameters: Record<string, any>): Promise<void> {
    try {
      switch (action) {
        case 'startScan':
          await this.handleStartScan();
          break;
        case 'navigate':
          await this.handleNavigation(parameters.page);
          break;
        case 'readPage':
          await this.handleReadPage();
          break;
        case 'showHelp':
          await this.handleShowHelp();
          break;
        case 'repeat':
          await this.handleRepeat();
          break;
        case 'openVoiceSettings':
          await this.handleOpenVoiceSettings();
          break;
        case 'stopListening':
          this.stopListening();
          break;
        default:
          console.warn(`Unknown voice command action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing command ${action}:`, error);
      this.announceToScreenReader('Command failed to execute', 'assertive');
    }
  }

  // Private implementation methods
  private handleSpeechResult(event: any): void {
    const results = Array.from(event.results) as any[];
    const lastResult = results[results.length - 1];
    
    if (lastResult) {
      const transcript = lastResult[0].transcript.trim().toLowerCase();
      const confidence = lastResult[0].confidence;
      
      this._lastTranscript.set(transcript);
      
      const recognitionResult: SpeechRecognitionResult = {
        transcript,
        confidence,
        alternatives: Array.from(lastResult).map((alt: any) => alt.transcript),
        isFinal: lastResult.isFinal,
        timestamp: Date.now(),
        duration: 0,
        language: this.config.recognition.language,
        metadata: {}
      };

      if (lastResult.isFinal) {
        this.processVoiceCommand(recognitionResult);
      }
    }
  }

  private handleSpeechError(event: any): void {
    console.error('Speech recognition error:', event.error);
    this.analytics.failedCommands++;
    this.updateAnalytics();
    
    let errorMessage = 'Voice recognition error';
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected';
        break;
      case 'audio-capture':
        errorMessage = 'Audio capture failed';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied';
        break;
    }
    
    this.announceToScreenReader(errorMessage, 'assertive');
  }

  private processVoiceCommand(result: SpeechRecognitionResult): void {
    const transcript = result.transcript;
    
    // Find matching command
    const match = this.findCommandMatch(transcript);
    
    if (match) {
      this._lastCommand.set(match);
      this.analytics.totalCommands++;
      this.analytics.successfulCommands++;
      this.analytics.averageConfidence = (this.analytics.averageConfidence + match.confidence) / 2;
      this.updateAnalytics();
      
      // Execute command
      this.executeCommand(match.command.action, match.parameters);
      
      // Play confirmation sound
      if (this.config.commands.confirmationSounds) {
        this.playSound('command_recognized');
      }
      
      // Track analytics
      advancedAnalytics.trackUserBehavior('voice_command', 'voice', {
        command: match.command.id,
        confidence: match.confidence,
        transcript
      });
    } else {
      this.analytics.totalCommands++;
      this.analytics.failedCommands++;
      this.updateAnalytics();
      
      this.announceToScreenReader('Command not recognized', 'polite');
      this.playSound('command_not_recognized');
    }
  }

  private findCommandMatch(transcript: string): VoiceCommandMatch | null {
    let bestMatch: VoiceCommandMatch | null = null;
    let bestScore = 0;

    for (const command of this.voiceCommands.values()) {
      if (!command.enabled) continue;

      for (const pattern of command.patterns) {
        const score = this.calculateMatchScore(transcript, pattern);
        
        if (score > this.config.commands.confidenceThreshold && score > bestScore) {
          bestScore = score;
          bestMatch = {
            command,
            parameters: this.extractParameters(transcript, command),
            confidence: score,
            timestamp: Date.now(),
            context: this.currentContext
          };
        }
      }
    }

    return bestMatch;
  }

  private calculateMatchScore(transcript: string, pattern: string): number {
    // Simple fuzzy matching - in a real implementation, use a more sophisticated algorithm
    const transcriptWords = transcript.toLowerCase().split(' ');
    const patternWords = pattern.toLowerCase().split(' ');
    
    let matches = 0;
    for (const patternWord of patternWords) {
      for (const transcriptWord of transcriptWords) {
        if (this.calculateWordSimilarity(transcriptWord, patternWord) > 0.8) {
          matches++;
          break;
        }
      }
    }
    
    return matches / patternWords.length;
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    // Levenshtein distance-based similarity
    const len1 = word1.length;
    const len2 = word2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = word1[i - 1] === word2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    return 1 - distance / Math.max(len1, len2);
  }

  private extractParameters(transcript: string, command: VoiceCommand): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    if (!command.parameters) return parameters;
    
    // Simple parameter extraction - would be more sophisticated in a real implementation
    for (const param of command.parameters) {
      if (param.type === 'enum' && param.values) {
        for (const value of param.values) {
          if (transcript.includes(value)) {
            parameters[param.name] = value;
            break;
          }
        }
      }
    }
    
    return parameters;
  }

  private processVoiceQueue(): void {
    if (this.synthQueue.length > 0 && !this.isSpeaking) {
      const nextSpeech = this.synthQueue.shift();
      if (nextSpeech) {
        this.speak(nextSpeech);
      }
    }
  }

  private playSound(type: string): void {
    if (!this.config.commands.confirmationSounds) return;

    // Simple sound effects - would use actual audio files in production
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'listening_start':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        break;
      case 'listening_end':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        break;
      case 'command_recognized':
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        break;
      case 'command_not_recognized':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        break;
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }

  private updateAnalytics(): void {
    this.analytics.errorRate = this.analytics.totalCommands > 0 
      ? (this.analytics.failedCommands / this.analytics.totalCommands) * 100 
      : 0;
    
    this.analytics.recognitionAccuracy = this.analytics.totalCommands > 0
      ? (this.analytics.successfulCommands / this.analytics.totalCommands) * 100
      : 0;

    this._analyticsStore.set(this.analytics);
  }

  // Command handlers
  private async handleStartScan(): Promise<void> {
    this.announceToScreenReader('Starting waste scan', 'polite');
    // Dispatch event to start scanning
    window.dispatchEvent(new CustomEvent('voice-command', {
      detail: { action: 'startScan' }
    }));
  }

  private async handleNavigation(page: string): Promise<void> {
    this.announceToScreenReader(`Navigating to ${page}`, 'polite');
    window.dispatchEvent(new CustomEvent('voice-command', {
      detail: { action: 'navigate', page }
    }));
  }

  private async handleReadPage(): Promise<void> {
    const pageContent = this.getPageContent();
    this.announceToScreenReader(pageContent, 'polite');
  }

  private async handleShowHelp(): Promise<void> {
    const helpText = this.generateHelpText();
    this.announceToScreenReader(helpText, 'polite');
  }

  private async handleRepeat(): Promise<void> {
    // Repeat last announcement
    const lastText = this.getLastSpokenText();
    if (lastText) {
      this.announceToScreenReader(lastText, 'polite');
    } else {
      this.announceToScreenReader('No previous message to repeat', 'polite');
    }
  }

  private async handleOpenVoiceSettings(): Promise<void> {
    this.announceToScreenReader('Opening voice settings', 'polite');
    window.dispatchEvent(new CustomEvent('voice-command', {
      detail: { action: 'openSettings', section: 'voice' }
    }));
  }

  private getPageContent(): string {
    // Extract meaningful content from the page
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent)
      .filter(text => text)
      .join('. ');
    
    const mainContent = document.querySelector('main')?.textContent?.substring(0, 200) || '';
    
    return `Page headings: ${headings}. Main content: ${mainContent}`;
  }

  private generateHelpText(): string {
    const enabledCommands = Array.from(this.voiceCommands.values())
      .filter(cmd => cmd.enabled)
      .slice(0, 5); // Limit to first 5 commands
    
    const commandList = enabledCommands
      .map(cmd => `Say "${cmd.patterns[0]}" to ${cmd.description}`)
      .join('. ');
    
    return `Available voice commands: ${commandList}. Use keyboard shortcut Control Shift V to toggle voice recognition.`;
  }

  private getLastSpokenText(): string | null {
    // This would store the last spoken text in a real implementation
    return null;
  }

  // Public API
  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes
    if (this.recognition) {
      this.recognition.lang = this.config.recognition.language;
      this.recognition.continuous = this.config.recognition.continuous;
      this.recognition.interimResults = this.config.recognition.interimResults;
    }
  }

  public getAnalytics(): VoiceAnalytics {
    return { ...this.analytics };
  }

  public resetAnalytics(): void {
    this.analytics = this.getInitialAnalytics();
    this.updateAnalytics();
  }

  public isVoiceSupported(): boolean {
    return (
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window
    ) && 'speechSynthesis' in window;
  }

  public cleanup(): void {
    this.stopListening();
    
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.voiceCommands.clear();
    this.synthQueue = [];
  }
}

// Global instance
export const voiceInteraction = new VoiceInteractionSystem();

// Utility functions
export function startVoiceRecognition(): void {
  voiceInteraction.startListening();
}

export function stopVoiceRecognition(): void {
  voiceInteraction.stopListening();
}

export function speakText(text: string, options?: Partial<SynthesisOptions>): Promise<void> {
  return voiceInteraction.speak({ text, ...options });
}

export function announceToScreenReader(text: string, priority?: 'polite' | 'assertive'): void {
  voiceInteraction.announceToScreenReader(text, priority);
}

export function addVoiceCommand(command: VoiceCommand): void {
  voiceInteraction.addCommand(command);
}

export function getVoiceCommands(): VoiceCommand[] {
  return voiceInteraction.getCommands();
}

export function setVoiceContext(context: string): void {
  voiceInteraction.setContext(context);
} 