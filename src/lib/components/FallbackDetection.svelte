<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getFallbackDetectionEngine, fallback } from '$lib/utils/fallback-detection.js';
  import { isBrowser } from '$lib/utils/browser.js';
  import type { Detection } from '$lib/types/index.js';

  // Component props
  export let title = 'Alternative Detection Methods';
  export let subtitle = 'Choose an alternative method to classify your waste items';
  export let showTips = true;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    detection: { detections: Detection[]; method: string };
    error: { message: string; method: string };
    loading: { isLoading: boolean; method: string };
  }>();

  // Component state
  let isLoading = false;
  let currentMethod = '';
  let textInput = '';
  let voiceListening = false;
  let dragOver = false;

  // Get available methods
  $: availableMethods = isBrowser() ? fallback.getMethods() : [];
  $: detectionTips = isBrowser() ? fallback.getTips() : [];

  // File input handling
  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    await processImageFile(file, 'image-upload');
  }

  // Drag and drop handling
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      dispatch('error', {
        message: 'Please drop an image file',
        method: 'drag-drop'
      });
      return;
    }
    
    await processImageFile(file, 'drag-drop');
  }

  // Process image file
  async function processImageFile(file: File, method: string) {
    if (!file.type.startsWith('image/')) {
      dispatch('error', {
        message: 'Please select an image file',
        method
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      dispatch('error', {
        message: 'Image file too large (max 10MB)',
        method
      });
      return;
    }

    setLoading(true, method);

    try {
      const detections = await fallback.fromImage(file);
      dispatch('detection', { detections, method });
    } catch (error) {
      dispatch('error', {
        message: `Image processing failed: ${error}`,
        method
      });
    } finally {
      setLoading(false, method);
    }
  }

  // Voice input handling
  async function handleVoiceInput() {
    if (voiceListening) {
      // Stop listening
      voiceListening = false;
      return;
    }

    setLoading(true, 'voice');
    voiceListening = true;

    try {
      const detections = await fallback.fromVoice();
      dispatch('detection', { detections, method: 'voice' });
    } catch (error) {
      dispatch('error', {
        message: `Voice recognition failed: ${error}`,
        method: 'voice'
      });
    } finally {
      setLoading(false, 'voice');
      voiceListening = false;
    }
  }

  // Text input handling
  async function handleTextInput() {
    if (!textInput.trim()) {
      dispatch('error', {
        message: 'Please enter a description',
        method: 'text'
      });
      return;
    }

    setLoading(true, 'text');

    try {
      const detections = await fallback.fromText(textInput.trim());
      dispatch('detection', { detections, method: 'text' });
      textInput = ''; // Clear input after successful detection
    } catch (error) {
      dispatch('error', {
        message: `Text processing failed: ${error}`,
        method: 'text'
      });
    } finally {
      setLoading(false, 'text');
    }
  }

  // Clipboard handling
  async function handleClipboard() {
    setLoading(true, 'clipboard');

    try {
      const detections = await fallback.fromClipboard();
      dispatch('detection', { detections, method: 'clipboard' });
    } catch (error) {
      dispatch('error', {
        message: `Clipboard access failed: ${error}`,
        method: 'clipboard'
      });
    } finally {
      setLoading(false, 'clipboard');
    }
  }

  // Loading state management
  function setLoading(loading: boolean, method: string) {
    isLoading = loading;
    currentMethod = loading ? method : '';
    dispatch('loading', { isLoading: loading, method });
  }

  // Keyboard handling for text input
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleTextInput();
    }
  }
</script>

<div class="fallback-detection-container p-6 bg-gray-50 rounded-2xl">
  <!-- Header -->
  <div class="text-center mb-6">
    <h2 class="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
    <p class="text-gray-600">{subtitle}</p>
  </div>

  <!-- Alternative Methods Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    
    <!-- Image Upload -->
    {#if availableMethods.find(m => m.method === 'image')}
      <div class="method-card bg-white rounded-xl p-4 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
           class:border-blue-400={dragOver}
           class:bg-blue-50={dragOver}
           role="button"
           tabindex="0"
           aria-label="Upload image by dropping file or clicking to select"
           on:dragover={handleDragOver}
           on:dragleave={handleDragLeave}
           on:drop={handleDrop}>
        
        <div class="text-center">
          <div class="text-4xl mb-3">📷</div>
          <h3 class="font-semibold text-gray-800 mb-2">Upload Image</h3>
          <p class="text-sm text-gray-600 mb-4">Take a photo or select from device</p>
          
          <label class="btn btn-primary cursor-pointer">
            <input type="file" 
                   accept="image/*" 
                   class="hidden" 
                   on:change={handleImageUpload}
                   disabled={isLoading && currentMethod === 'image-upload'}>
            {#if isLoading && currentMethod === 'image-upload'}
              <span class="loading-spinner w-4 h-4 mr-2"></span>
              Processing...
            {:else}
              Choose Image
            {/if}
          </label>
          
          {#if dragOver}
            <p class="text-sm text-blue-600 mt-2">Drop image here!</p>
          {:else}
            <p class="text-xs text-gray-500 mt-2">Or drag and drop an image</p>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Voice Input -->
    {#if availableMethods.find(m => m.method === 'voice')}
      <div class="method-card bg-white rounded-xl p-4 border-2 border-gray-300">
        <div class="text-center">
          <div class="text-4xl mb-3">🎤</div>
          <h3 class="font-semibold text-gray-800 mb-2">Voice Input</h3>
          <p class="text-sm text-gray-600 mb-4">Describe the item using your voice</p>
          
          <button class="btn btn-secondary"
                  class:btn-error={voiceListening}
                  class:animate-pulse={voiceListening}
                  on:click={handleVoiceInput}
                  disabled={isLoading && currentMethod === 'voice'}>
            {#if isLoading && currentMethod === 'voice'}
              <span class="loading-spinner w-4 h-4 mr-2"></span>
              Listening...
            {:else if voiceListening}
              🔴 Stop
            {:else}
              🎤 Start
            {/if}
          </button>
          
          {#if voiceListening}
            <p class="text-sm text-red-600 mt-2">Listening... Speak now!</p>
          {:else}
            <p class="text-xs text-gray-500 mt-2">Click to start voice recognition</p>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Text Input -->
    {#if availableMethods.find(m => m.method === 'text')}
      <div class="method-card bg-white rounded-xl p-4 border-2 border-gray-300">
        <div class="text-center">
          <div class="text-4xl mb-3">⌨️</div>
          <h3 class="font-semibold text-gray-800 mb-2">Text Input</h3>
          <p class="text-sm text-gray-600 mb-4">Type a description of the item</p>
          
          <div class="space-y-3">
            <textarea 
              bind:value={textInput}
              placeholder="e.g., plastic water bottle, apple core, chip bag..."
              class="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              on:keydown={handleKeyDown}
              disabled={isLoading && currentMethod === 'text'}
            ></textarea>
            
            <button class="btn btn-primary w-full"
                    on:click={handleTextInput}
                    disabled={!textInput.trim() || (isLoading && currentMethod === 'text')}>
              {#if isLoading && currentMethod === 'text'}
                <span class="loading-spinner w-4 h-4 mr-2"></span>
                Processing...
              {:else}
                Classify Item
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Clipboard -->
    {#if availableMethods.find(m => m.method === 'clipboard')}
      <div class="method-card bg-white rounded-xl p-4 border-2 border-gray-300">
        <div class="text-center">
          <div class="text-4xl mb-3">📋</div>
          <h3 class="font-semibold text-gray-800 mb-2">Paste Image</h3>
          <p class="text-sm text-gray-600 mb-4">Paste an image from clipboard</p>
          
          <button class="btn btn-secondary"
                  on:click={handleClipboard}
                  disabled={isLoading && currentMethod === 'clipboard'}>
            {#if isLoading && currentMethod === 'clipboard'}
              <span class="loading-spinner w-4 h-4 mr-2"></span>
              Processing...
            {:else}
              📋 Paste Image
            {/if}
          </button>
          
          <p class="text-xs text-gray-500 mt-2">Copy an image first, then click paste</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Detection Tips -->
  {#if showTips && detectionTips.length > 0}
    <div class="tips-section bg-blue-50 rounded-xl p-4">
      <h4 class="font-semibold text-blue-800 mb-3 flex items-center">
        💡 Tips for Better Detection
      </h4>
      <ul class="space-y-2">
        {#each detectionTips as tip}
          <li class="text-sm text-blue-700 flex items-start">
            <span class="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
            {tip}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="loading-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 text-center">
        <div class="loading-spinner w-8 h-8 mx-auto mb-4"></div>
        <p class="text-gray-700">Processing your input...</p>
        <p class="text-sm text-gray-500 mt-1">Using {currentMethod} method</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .loading-spinner {
    border: 2px solid #f3f4f6;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .method-card {
    transition: all 0.2s ease;
  }
  
  .method-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200;
  }
  
  .btn-primary {
    @apply text-white bg-blue-500 hover:bg-blue-600;
  }
  
  .btn-secondary {
    @apply text-gray-700 bg-gray-200 hover:bg-gray-300;
  }
  
  .btn-error {
    @apply text-white bg-red-500 hover:bg-red-600;
  }
  
  .btn:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  
  .loading-overlay {
    backdrop-filter: blur(4px);
  }
</style> 