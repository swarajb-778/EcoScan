<script lang="ts">
  import { onMount } from 'svelte';
  import { WasteClassifier } from '$lib/ml/classifier.js';
  import { 
    isListening, 
    voiceSupported, 
    lastTranscript,
    selectedDetection,
    setError 
  } from '$lib/stores/appStore.js';
  import type { WasteClassification } from '$lib/types/index.js';
  import { isBrowser, isSpeechRecognitionSupported, isUserMediaSupported } from '$lib/utils/browser.js';

  let recognition: SpeechRecognition | null = null;
  let classifier: WasteClassifier | null = null;
  let currentClassification: WasteClassification | null = null;
  let confidence = 0;
  let isInitializing = false;

  onMount(async () => {
    if (!isBrowser()) {
      console.warn('VoiceInput skipping initialization during SSR');
      return;
    }
    
    await initializeVoiceRecognition();
    await initializeClassifier();
  });

  async function initializeVoiceRecognition() {
    if (!isBrowser()) return;
    
    // Check for browser support using our utility
    if (!isSpeechRecognitionSupported()) {
      voiceSupported.set(false);
      setError('Voice recognition not supported in this browser.');
      return;
    }

    // Check for microphone
    if (!isUserMediaSupported()) {
      setError('Microphone access is not supported in this browser.');
      voiceSupported.set(false);
      return;
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      if (audioInputs.length === 0) {
        setError('No microphone device found. Please connect a microphone and try again.');
        voiceSupported.set(false);
        return;
      }
    } catch (error) {
      console.error('Error checking microphone devices:', error);
      voiceSupported.set(false);
      return;
    }

    voiceSupported.set(true);
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    if (recognition) {
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Check if selected language is supported
      const supportedLangs = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'zh-CN', 'ja-JP'];
      if (!supportedLangs.includes(recognition.lang)) {
        setError('Selected language is not supported for speech recognition. Defaulting to English.');
        recognition.lang = 'en-US';
      }

      recognition.onstart = () => {
        isListening.set(true);
        console.log('🎤 Voice recognition started');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.length < 2) {
          setError('Utterance too short. Please speak a complete item name.');
          return;
        }
        if (transcript.length > 100) {
          setError('Utterance too long. Please keep your description concise.');
          return;
        }
        lastTranscript.set(transcript);
        
        // If result is final, classify it
        if (event.results[event.results.length - 1].isFinal) {
          classifyVoiceInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        setError('Speech-to-text error: ' + event.error);
        isListening.set(false);
      };

      recognition.onend = () => {
        isListening.set(false);
        console.log('🎤 Voice recognition ended');
      };

      recognition.onspeechend = () => {
        if (!$lastTranscript) {
          setError('No speech detected. Please try speaking more clearly.');
        }
      };

      recognition.onnomatch = () => {
        setError('Could not recognize speech. Try again or use text input.');
      };
    }
  }

  async function initializeClassifier() {
    if (!classifier) {
      isInitializing = true;
      try {
        classifier = new WasteClassifier();
        await classifier.initialize();
      } catch (error) {
        setError('Failed to load classification system');
        console.error('Classifier initialization error:', error);
      } finally {
        isInitializing = false;
      }
    }
  }

  function startListening() {
    if (!isBrowser() || !recognition || !$voiceSupported) {
      setError('Voice recognition not available');
      return;
    }

    if ($isListening) {
      stopListening();
      return;
    }

    currentClassification = null;
    lastTranscript.set('');
    
    try {
      if (recognition) {
        recognition.start();
      }
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setError('Failed to start voice recognition');
    }
  }

  function stopListening() {
    if (recognition && $isListening) {
      recognition.stop();
    }
  }

  function classifyVoiceInput(transcript: string) {
    if (!classifier) return;

    console.log('🔍 Classifying voice input:', transcript);
    
    const classification = classifier.classifyVoiceInput(transcript);
    
    if (classification) {
      currentClassification = classification;
      confidence = classification.confidence;
      
      // Create a mock detection for the voice input
      const mockDetection = {
        bbox: [0, 0, 0, 0] as [number, number, number, number],
        class: transcript.toLowerCase().trim(),
        confidence: classification.confidence,
        category: classification.category,
        label: transcript.charAt(0).toUpperCase() + transcript.slice(1),
        instructions: classification.instructions || 'Detected via voice input'
      };
      
      selectedDetection.set(mockDetection);
    } else {
      setError(`Couldn't identify "${transcript}". Try saying a specific item name.`);
    }
  }

  function clearResults() {
    currentClassification = null;
    lastTranscript.set('');
    selectedDetection.set(null);
    confidence = 0;
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'recycle': return '♻️';
      case 'compost': return '🌱';
      case 'landfill': return '🗑️';
      default: return '❓';
    }
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'recycle': return 'bg-green-500';
      case 'compost': return 'bg-lime-500';
      case 'landfill': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-6">
  <!-- Voice Input Interface -->
  <div class="card text-center">
    <h2 class="text-2xl font-bold mb-4 flex items-center justify-center">
      <span class="text-2xl mr-2">🎤</span>
      Voice Classification
    </h2>
    <p class="text-gray-600 mb-6">
      Say the name of a waste item to get disposal instructions
    </p>

    <!-- Microphone Button -->
    <div class="relative inline-block mb-6">
      <button
        on:click={startListening}
        disabled={!$voiceSupported || isInitializing}
        class="w-24 h-24 rounded-full {$isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} 
               text-white text-3xl shadow-lg transition-all duration-200 transform hover:scale-105 
               disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
      >
        {#if $isListening}
          🔴
        {:else}
          🎤
        {/if}
      </button>

      <!-- Pulse animation when listening -->
      {#if $isListening}
        <div class="absolute inset-0 rounded-full bg-red-500 opacity-30 pulse-ring"></div>
        <div class="absolute inset-0 rounded-full bg-red-500 opacity-20 pulse-ring" style="animation-delay: 0.5s;"></div>
      {/if}
    </div>

    <div class="text-center">
      {#if isInitializing}
        <p class="text-gray-600">Initializing voice recognition...</p>
      {:else if !$voiceSupported}
        <p class="text-red-600">Voice recognition not supported in this browser</p>
      {:else if $isListening}
        <p class="text-blue-600 font-medium">Listening... Tap to stop</p>
        
        <!-- Voice waveform animation -->
        <div class="voice-waveform justify-center mt-4">
          {#each Array(5) as _, i}
            <div class="wave-bar h-2" style="animation-delay: {i * 0.1}s;"></div>
          {/each}
        </div>
      {:else}
        <p class="text-gray-600">Tap the microphone to start</p>
      {/if}
    </div>
  </div>

  <!-- Current Transcript -->
  {#if $lastTranscript}
    <div class="card">
      <h3 class="font-semibold mb-2 flex items-center">
        <span class="text-lg mr-2">💬</span>
        You said:
      </h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-lg italic">"{$lastTranscript}"</p>
      </div>
    </div>
  {/if}

  <!-- Classification Results -->
  {#if currentClassification}
    <div class="card">
      <h3 class="font-semibold mb-4 flex items-center">
        <span class="text-lg mr-2">🔍</span>
        Classification Result
      </h3>
      
      <div class="bg-gradient-to-r from-{currentClassification.category === 'recycle' ? 'green' : currentClassification.category === 'compost' ? 'lime' : 'red'}-500 to-{currentClassification.category === 'recycle' ? 'emerald' : currentClassification.category === 'compost' ? 'green' : 'pink'}-600 text-white p-6 rounded-xl">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <span class="text-3xl">{getCategoryIcon(currentClassification.category)}</span>
            <div>
              <h4 class="text-xl font-bold capitalize">{currentClassification.category}</h4>
              <p class="text-sm opacity-90">{(confidence * 100).toFixed(0)}% confidence</p>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <h5 class="font-semibold mb-1">Instructions:</h5>
            <p class="text-sm opacity-90">{currentClassification.instructions}</p>
          </div>
          <div>
            <h5 class="font-semibold mb-1">Tips:</h5>
            <p class="text-sm opacity-90">{currentClassification.tips}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Quick Examples -->
  <div class="card">
    <h3 class="font-semibold mb-4 flex items-center">
      <span class="text-lg mr-2">💡</span>
      Try saying these items:
    </h3>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
      <button 
        on:click={() => classifyVoiceInput('plastic bottle')}
        class="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
      >
        <span class="font-medium">Plastic bottle</span><br>
        <span class="text-gray-500">♻️ Recycle</span>
      </button>
      <button 
        on:click={() => classifyVoiceInput('apple')}
        class="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
      >
        <span class="font-medium">Apple</span><br>
        <span class="text-gray-500">🌱 Compost</span>
      </button>
      <button 
        on:click={() => classifyVoiceInput('cell phone')}
        class="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
      >
        <span class="font-medium">Cell phone</span><br>
        <span class="text-gray-500">🗑️ E-waste</span>
      </button>
      <button 
        on:click={() => classifyVoiceInput('banana')}
        class="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
      >
        <span class="font-medium">Banana</span><br>
        <span class="text-gray-500">🌱 Compost</span>
      </button>
      <button 
        on:click={() => classifyVoiceInput('wine glass')}
        class="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
      >
        <span class="font-medium">Wine glass</span><br>
        <span class="text-gray-500">♻️ Glass</span>
      </button>
      <button 
        on:click={() => classifyVoiceInput('toothbrush')}
        class="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
      >
        <span class="font-medium">Toothbrush</span><br>
        <span class="text-gray-500">🗑️ Landfill</span>
      </button>
    </div>
  </div>

  <!-- Clear Results -->
  {#if currentClassification || $lastTranscript}
    <div class="text-center">
      <button 
        on:click={clearResults}
        class="btn-secondary"
      >
        🔄 Try Another Item
      </button>
    </div>
  {/if}
</div>

<style>
  .wave-bar:nth-child(1) { height: 8px; }
  .wave-bar:nth-child(2) { height: 16px; }
  .wave-bar:nth-child(3) { height: 24px; }
  .wave-bar:nth-child(4) { height: 16px; }
  .wave-bar:nth-child(5) { height: 8px; }
</style> 