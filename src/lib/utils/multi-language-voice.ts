/**
 * Multi-Language Voice Recognition System
 * Supports multiple languages with intelligent fallbacks and regional dialects
 */

// TypeScript interfaces for Speech Recognition API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

export interface LanguageConfig {
  code: string;
  name: string;
  region?: string;
  wasteKeywords: Record<string, string[]>;
  commonPhrases: Record<string, string>;
  fallbackLanguages: string[];
  confidence: number;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  language: string;
  detectedItems: string[];
  alternativeTranscripts?: string[];
}

export interface SpeechSettings {
  primaryLanguage: string;
  enableAutoDetection: boolean;
  fallbackLanguages: string[];
  confidenceThreshold: number;
  maxAlternatives: number;
  continuousRecognition: boolean;
  noiseSuppression: boolean;
}

class MultiLanguageVoice {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private settings: SpeechSettings;
  private languages: Map<string, LanguageConfig> = new Map();
  private currentLanguage = 'en-US';
  private isListening = false;
  private recognitionAttempts = 0;
  private maxAttempts = 3;
  
  // Language detection patterns
  private languagePatterns: Map<string, RegExp[]> = new Map();
  
  // Callbacks
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeLanguages();
    this.initializeSpeechRecognition();
    this.initializeLanguageDetection();
  }

  /**
   * Initialize supported languages and their configurations
   */
  private initializeLanguages(): void {
    const languageConfigs: LanguageConfig[] = [
      {
        code: 'en-US',
        name: 'English (US)',
        region: 'US',
        wasteKeywords: {
          plastic: ['plastic', 'bottle', 'container', 'cup', 'bag', 'wrapper'],
          glass: ['glass', 'bottle', 'jar', 'wine', 'beer'],
          metal: ['can', 'aluminum', 'tin', 'metal', 'foil'],
          paper: ['paper', 'cardboard', 'box', 'newspaper', 'magazine'],
          organic: ['food', 'banana', 'apple', 'leftovers', 'compost'],
          electronic: ['phone', 'computer', 'battery', 'cable', 'device'],
          hazardous: ['paint', 'chemical', 'medicine', 'toxic', 'dangerous']
        },
        commonPhrases: {
          'what is this': 'identify this object',
          'how do I dispose': 'disposal instructions',
          'where does this go': 'classification request',
          'is this recyclable': 'recycling question'
        },
        fallbackLanguages: ['en-GB', 'en-CA'],
        confidence: 0.9
      },
      {
        code: 'es-ES',
        name: 'Spanish (Spain)',
        region: 'ES',
        wasteKeywords: {
          plastic: ['plástico', 'botella', 'envase', 'bolsa', 'recipiente'],
          glass: ['vidrio', 'cristal', 'botella', 'frasco', 'vaso'],
          metal: ['lata', 'aluminio', 'metal', 'hojalata'],
          paper: ['papel', 'cartón', 'caja', 'periódico', 'revista'],
          organic: ['comida', 'orgánico', 'restos', 'banana', 'manzana'],
          electronic: ['teléfono', 'ordenador', 'batería', 'cable', 'electrónico'],
          hazardous: ['pintura', 'químico', 'medicina', 'tóxico', 'peligroso']
        },
        commonPhrases: {
          'qué es esto': 'identify this object',
          'cómo se desecha': 'disposal instructions',
          'dónde va esto': 'classification request',
          'es reciclable': 'recycling question'
        },
        fallbackLanguages: ['es-MX', 'es-AR'],
        confidence: 0.85
      },
      {
        code: 'fr-FR',
        name: 'French (France)',
        region: 'FR',
        wasteKeywords: {
          plastic: ['plastique', 'bouteille', 'emballage', 'sac', 'récipient'],
          glass: ['verre', 'bouteille', 'bocal', 'cristal'],
          metal: ['métal', 'canette', 'aluminium', 'boîte'],
          paper: ['papier', 'carton', 'boîte', 'journal', 'magazine'],
          organic: ['nourriture', 'organique', 'reste', 'banane', 'pomme'],
          electronic: ['téléphone', 'ordinateur', 'batterie', 'câble', 'électronique'],
          hazardous: ['peinture', 'chimique', 'médicament', 'toxique', 'dangereux']
        },
        commonPhrases: {
          'qu\'est-ce que c\'est': 'identify this object',
          'comment jeter': 'disposal instructions',
          'où va ceci': 'classification request',
          'est-ce recyclable': 'recycling question'
        },
        fallbackLanguages: ['fr-CA', 'fr-BE'],
        confidence: 0.85
      },
      {
        code: 'de-DE',
        name: 'German',
        region: 'DE',
        wasteKeywords: {
          plastic: ['plastik', 'flasche', 'verpackung', 'tüte', 'behälter'],
          glass: ['glas', 'flasche', 'glas', 'kristall'],
          metal: ['metall', 'dose', 'aluminium', 'blech'],
          paper: ['papier', 'karton', 'schachtel', 'zeitung', 'magazin'],
          organic: ['essen', 'organisch', 'reste', 'banane', 'apfel'],
          electronic: ['telefon', 'computer', 'batterie', 'kabel', 'elektronik'],
          hazardous: ['farbe', 'chemikalie', 'medizin', 'giftig', 'gefährlich']
        },
        commonPhrases: {
          'was ist das': 'identify this object',
          'wie entsorgen': 'disposal instructions',
          'wohin damit': 'classification request',
          'ist das recycelbar': 'recycling question'
        },
        fallbackLanguages: ['de-AT', 'de-CH'],
        confidence: 0.85
      },
      {
        code: 'zh-CN',
        name: 'Chinese (Simplified)',
        region: 'CN',
        wasteKeywords: {
          plastic: ['塑料', '瓶子', '包装', '袋子', '容器'],
          glass: ['玻璃', '瓶子', '罐子', '水晶'],
          metal: ['金属', '罐头', '铝', '锡'],
          paper: ['纸', '纸板', '盒子', '报纸', '杂志'],
          organic: ['食物', '有机', '剩菜', '香蕉', '苹果'],
          electronic: ['电话', '电脑', '电池', '电缆', '电子'],
          hazardous: ['油漆', '化学', '药物', '有毒', '危险']
        },
        commonPhrases: {
          '这是什么': 'identify this object',
          '怎么处理': 'disposal instructions',
          '放哪里': 'classification request',
          '可以回收吗': 'recycling question'
        },
        fallbackLanguages: ['zh-TW', 'zh-HK'],
        confidence: 0.8
      },
      {
        code: 'ja-JP',
        name: 'Japanese',
        region: 'JP',
        wasteKeywords: {
          plastic: ['プラスチック', 'ボトル', '包装', '袋', '容器'],
          glass: ['ガラス', 'ボトル', '瓶', 'クリスタル'],
          metal: ['金属', '缶', 'アルミ', 'ブリキ'],
          paper: ['紙', '段ボール', '箱', '新聞', '雑誌'],
          organic: ['食べ物', '有機', '残り物', 'バナナ', 'りんご'],
          electronic: ['電話', 'コンピュータ', '電池', 'ケーブル', '電子機器'],
          hazardous: ['ペンキ', '化学物質', '薬', '毒性', '危険']
        },
        commonPhrases: {
          'これは何ですか': 'identify this object',
          'どう捨てる': 'disposal instructions',
          'どこに行く': 'classification request',
          'リサイクル可能': 'recycling question'
        },
        fallbackLanguages: [],
        confidence: 0.8
      }
    ];

    languageConfigs.forEach(config => {
      this.languages.set(config.code, config);
    });

    console.log(`[MultiLanguageVoice] Initialized ${this.languages.size} languages`);
  }

  /**
   * Initialize speech recognition
   */
  private initializeSpeechRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('[MultiLanguageVoice] Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    if (this.recognition) {
      this.recognition.continuous = this.settings.continuousRecognition;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = this.settings.maxAlternatives;
      this.recognition.lang = this.settings.primaryLanguage;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStatusCallback?.('listening');
        console.log('[MultiLanguageVoice] Started listening');
      };

      this.recognition.onresult = (event) => {
        this.handleSpeechResult(event);
      };

      this.recognition.onerror = (event) => {
        this.handleSpeechError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStatusCallback?.('stopped');
        console.log('[MultiLanguageVoice] Stopped listening');
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Initialize language detection patterns
   */
  private initializeLanguageDetection(): void {
    // Common words and patterns for each language
    this.languagePatterns.set('en', [
      /\b(the|and|or|but|with|from|they|this|that|have|been|will|their|said|each|which|what|where|when|how)\b/i,
      /\b(bottle|plastic|glass|can|paper|trash|garbage|waste|recycle)\b/i
    ]);

    this.languagePatterns.set('es', [
      /\b(el|la|los|las|de|del|que|y|a|en|un|una|por|con|no|una|para|esto|eso|como|donde|cuando)\b/i,
      /\b(botella|plástico|vidrio|lata|papel|basura|residuo|reciclar)\b/i
    ]);

    this.languagePatterns.set('fr', [
      /\b(le|la|les|de|du|des|et|à|en|un|une|pour|avec|ne|pas|ce|qui|que|où|quand|comment)\b/i,
      /\b(bouteille|plastique|verre|boîte|papier|déchet|poubelle|recycler)\b/i
    ]);

    this.languagePatterns.set('de', [
      /\b(der|die|das|den|dem|des|und|oder|aber|mit|von|sie|ist|sind|haben|wird|ihre|wie|was|wo|wann)\b/i,
      /\b(flasche|plastik|glas|dose|papier|müll|abfall|recyceln)\b/i
    ]);

    this.languagePatterns.set('zh', [
      /[\u4e00-\u9fff]+/,
      /\b(的|是|在|有|我|你|他|她|这|那|什么|哪里|怎么|可以)\b/
    ]);

    this.languagePatterns.set('ja', [
      /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]+/,
      /\b(です|ます|した|する|ある|この|その|どこ|何|どう|できる)\b/
    ]);
  }

  /**
   * Handle speech recognition result
   */
  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    const results = Array.from(event.results);
    const finalResults = results.filter(result => result.isFinal);
    
    if (finalResults.length === 0) return;

    const latestResult = finalResults[finalResults.length - 1];
    const transcript = latestResult[0].transcript.trim();
    const confidence = latestResult[0].confidence;

    // Get alternative transcripts
    const alternatives = Array.from(latestResult).slice(1, this.settings.maxAlternatives)
      .map(alternative => alternative.transcript.trim());

    // Detect language if auto-detection is enabled
    let detectedLanguage = this.currentLanguage;
    if (this.settings.enableAutoDetection) {
      detectedLanguage = this.detectLanguage(transcript) || this.currentLanguage;
    }

    // Process the transcript for waste classification
    const detectedItems = this.processTranscript(transcript, detectedLanguage);

    const result: VoiceRecognitionResult = {
      transcript,
      confidence,
      language: detectedLanguage,
      detectedItems,
      alternativeTranscripts: alternatives
    };

    // If confidence is low, try fallback languages
    if (confidence < this.settings.confidenceThreshold) {
      this.tryFallbackLanguages(transcript, result);
    } else {
      this.onResultCallback?.(result);
    }
  }

  /**
   * Detect language from transcript
   */
  private detectLanguage(transcript: string): string | null {
    const scores = new Map<string, number>();

    this.languagePatterns.forEach((patterns, langCode) => {
      let score = 0;
      patterns.forEach(pattern => {
        const matches = transcript.match(pattern);
        if (matches) {
          score += matches.length;
        }
      });
      scores.set(langCode, score);
    });

    // Find the language with the highest score
    let bestLanguage: string | null = null;
    let bestScore = 0;

    scores.forEach((score, language) => {
      if (score > bestScore) {
        bestScore = score;
        bestLanguage = language;
      }
    });

    // Convert language code to full locale
    if (bestLanguage) {
      const languageMap: Record<string, string> = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'zh': 'zh-CN',
        'ja': 'ja-JP'
      };
      return languageMap[bestLanguage] || bestLanguage;
    }

    return null;
  }

  /**
   * Process transcript for waste classification
   */
  private processTranscript(transcript: string, language: string): string[] {
    const languageConfig = this.languages.get(language);
    if (!languageConfig) return [];

    const detectedItems: string[] = [];
    const lowerTranscript = transcript.toLowerCase();

    // Check for common phrases first
    Object.entries(languageConfig.commonPhrases).forEach(([phrase, intent]) => {
      if (lowerTranscript.includes(phrase.toLowerCase())) {
        detectedItems.push(`intent:${intent}`);
      }
    });

    // Check for waste keywords
    Object.entries(languageConfig.wasteKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerTranscript.includes(keyword.toLowerCase())) {
          detectedItems.push(`${category}:${keyword}`);
        }
      });
    });

    return detectedItems;
  }

  /**
   * Try fallback languages for better recognition
   */
  private async tryFallbackLanguages(originalTranscript: string, originalResult: VoiceRecognitionResult): Promise<void> {
    const currentLangConfig = this.languages.get(this.currentLanguage);
    if (!currentLangConfig || currentLangConfig.fallbackLanguages.length === 0) {
      this.onResultCallback?.(originalResult);
      return;
    }

    console.log(`[MultiLanguageVoice] Trying fallback languages for low confidence result`);

    for (const fallbackLang of currentLangConfig.fallbackLanguages) {
      try {
        const fallbackResult = await this.recognizeWithLanguage(originalTranscript, fallbackLang);
        if (fallbackResult && fallbackResult.confidence > originalResult.confidence) {
          this.onResultCallback?.(fallbackResult);
          return;
        }
      } catch (error) {
        console.warn(`[MultiLanguageVoice] Fallback language ${fallbackLang} failed:`, error);
      }
    }

    // If no fallback worked, return original result
    this.onResultCallback?.(originalResult);
  }

  /**
   * Recognize speech with specific language
   */
  private async recognizeWithLanguage(transcript: string, language: string): Promise<VoiceRecognitionResult | null> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        resolve(null);
        return;
      }

      // Create a temporary recognition instance for the fallback language
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const tempRecognition = new SpeechRecognition();

      tempRecognition.lang = language;
      tempRecognition.continuous = false;
      tempRecognition.interimResults = false;
      tempRecognition.maxAlternatives = 1;

      tempRecognition.onresult = (event: SpeechRecognitionEvent) => {
        if (event.results.length > 0) {
          const result = event.results[0][0];
          const detectedItems = this.processTranscript(result.transcript, language);

          resolve({
            transcript: result.transcript,
            confidence: result.confidence,
            language,
            detectedItems
          });
        } else {
          resolve(null);
        }
      };

      tempRecognition.onerror = () => {
        resolve(null);
      };

      tempRecognition.onend = () => {
        // Timeout fallback
        setTimeout(() => resolve(null), 1000);
      };

      // This is a simplified approach - in a real implementation,
      // you'd need to re-process the audio with the new language
      // For now, we'll just reprocess the transcript
      const detectedItems = this.processTranscript(transcript, language);
      resolve({
        transcript,
        confidence: 0.5, // Assume medium confidence for fallback
        language,
        detectedItems
      });
    });
  }

  /**
   * Handle speech recognition errors
   */
  private handleSpeechError(error: string): void {
    console.error('[MultiLanguageVoice] Speech recognition error:', error);
    
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try speaking again.',
      'audio-capture': 'Microphone access denied. Please allow microphone access.',
      'not-allowed': 'Microphone permission denied.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Speech recognition was aborted.',
      'bad-grammar': 'Speech recognition grammar error.'
    };

    const userMessage = errorMessages[error] || `Speech recognition error: ${error}`;
    this.onErrorCallback?.(userMessage);

    // Try to restart recognition if it was an intermittent error
    if (['network', 'aborted'].includes(error) && this.recognitionAttempts < this.maxAttempts) {
      this.recognitionAttempts++;
      setTimeout(() => {
        this.startListening();
      }, 1000);
    }
  }

  /**
   * Start listening for speech
   */
  startListening(): void {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition not available');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognitionAttempts = 0;
    this.recognition.lang = this.currentLanguage;
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('[MultiLanguageVoice] Failed to start recognition:', error);
      this.onErrorCallback?.('Failed to start speech recognition');
    }
  }

  /**
   * Stop listening for speech
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Switch to a different language
   */
  switchLanguage(languageCode: string): boolean {
    if (!this.languages.has(languageCode)) {
      console.error(`[MultiLanguageVoice] Language ${languageCode} not supported`);
      return false;
    }

    this.currentLanguage = languageCode;
    this.settings.primaryLanguage = languageCode;
    this.saveSettings();

    if (this.recognition) {
      this.recognition.lang = languageCode;
    }

    console.log(`[MultiLanguageVoice] Switched to language: ${languageCode}`);
    return true;
  }

  /**
   * Speak text in the current language
   */
  speak(text: string, language?: string): void {
    if (!this.synthesis) {
      console.error('[MultiLanguageVoice] Speech synthesis not available');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || this.currentLanguage;
    utterance.rate = 0.8;
    utterance.volume = 0.7;

    // Try to find a voice for the specified language
    const voices = this.synthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    if (voice) {
      utterance.voice = voice;
    }

    this.synthesis.speak(utterance);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languages.values());
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Set callbacks
   */
  setCallbacks(
    onResult: (result: VoiceRecognitionResult) => void,
    onError: (error: string) => void,
    onStatus: (status: string) => void
  ): void {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStatusCallback = onStatus;
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<SpeechSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Apply new settings to recognition
    if (this.recognition) {
      this.recognition.continuous = this.settings.continuousRecognition;
      this.recognition.maxAlternatives = this.settings.maxAlternatives;
      this.recognition.lang = this.settings.primaryLanguage;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): SpeechSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): SpeechSettings {
    try {
      const stored = localStorage.getItem('ecoscan_speech_settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[MultiLanguageVoice] Failed to load settings:', error);
    }
    return this.getDefaultSettings();
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('ecoscan_speech_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('[MultiLanguageVoice] Failed to save settings:', error);
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): SpeechSettings {
    return {
      primaryLanguage: 'en-US',
      enableAutoDetection: true,
      fallbackLanguages: ['en-GB', 'en-CA'],
      confidenceThreshold: 0.7,
      maxAlternatives: 3,
      continuousRecognition: false,
      noiseSuppression: true
    };
  }
}

// Global type definitions for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const multiLanguageVoice = new MultiLanguageVoice();
export default MultiLanguageVoice; 