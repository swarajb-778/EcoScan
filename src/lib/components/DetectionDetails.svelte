<script lang="ts">
  import { selectedDetection, detections } from '$lib/stores/appStore.js';
  import { WasteClassifier } from '$lib/ml/classifier.js';
  import type { WasteClassification } from '$lib/types/index.js';

  let classifier: WasteClassifier | null = null;
  let detailedClassification: WasteClassification | null = null;
  let colorBlindMode = false;

  // Initialize classifier
  $: if ($selectedDetection && !classifier) {
    initClassifier();
  }

  // Get detailed classification when detection changes
  $: if ($selectedDetection && classifier) {
    detailedClassification = classifier.classify($selectedDetection.class);
  }

  async function initClassifier() {
    try {
      classifier = new WasteClassifier();
      await classifier.initialize();
    } catch (error) {
      console.error('Failed to initialize classifier:', error);
    }
  }

  function closeDetails() {
    selectedDetection.set(null);
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
    if (colorBlindMode) {
      switch (category) {
        case 'recycle': return 'from-blue-500 to-blue-700';
        case 'compost': return 'from-yellow-500 to-yellow-700';
        case 'landfill': return 'from-gray-500 to-gray-700';
        default: return 'from-gray-500 to-gray-600';
      }
    }
    switch (category) {
      case 'recycle': return 'from-green-500 to-emerald-600';
      case 'compost': return 'from-lime-500 to-green-600';
      case 'landfill': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  }

  function validateBoundingBox(bbox: [number, number, number, number], imageWidth: number, imageHeight: number): boolean {
    const [x, y, width, height] = bbox;
    if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight) {
      console.warn('Bounding box is outside image bounds.');
      return false;
    }
    return true;
  }
</script>

{#if $selectedDetection}
  <!-- Modal backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="detection-title"
  >
    <!-- Close button for backdrop -->
    <button
      class="absolute inset-0 w-full h-full cursor-default"
      on:click={closeDetails}
      aria-label="Close modal by clicking outside"
    ></button>
    
    <!-- Modal content -->
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-10" 
      role="document"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r {getCategoryColor($selectedDetection.category)} p-6 text-white rounded-t-2xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-3xl">{getCategoryIcon($selectedDetection.category)}</span>
            <div>
              <h3 id="detection-title" class="text-xl font-bold capitalize">{$selectedDetection.class}</h3>
              <p class="text-sm opacity-90">
                {($selectedDetection.confidence * 100).toFixed(0)}% confidence
              </p>
            </div>
          </div>
          <button 
            on:click={closeDetails}
            class="text-white hover:text-gray-200 transition-colors p-1 rounded-lg"
            aria-label="Close detection details"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Category Information -->
        <div class="bg-gray-50 rounded-xl p-4">
          <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
            <span class="text-lg mr-2">{getCategoryIcon($selectedDetection.category)}</span>
            Category: {$selectedDetection.category.charAt(0).toUpperCase() + $selectedDetection.category.slice(1)}
          </h4>
          {#if classifier}
            {@const categoryInfo = classifier.getCategoryInfo($selectedDetection.category)}
            <p class="text-gray-600 text-sm">{categoryInfo.description}</p>
          {/if}
        </div>

        <!-- Disposal Instructions -->
        {#if detailedClassification}
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
                <span class="text-lg mr-2">📋</span>
                Disposal Instructions
              </h4>
              <p class="text-gray-700 bg-blue-50 p-3 rounded-lg">
                {detailedClassification.instructions}
              </p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
                <span class="text-lg mr-2">💡</span>
                Tips
              </h4>
              <p class="text-gray-700 bg-yellow-50 p-3 rounded-lg">
                {detailedClassification.tips}
              </p>
            </div>
          </div>
        {:else}
          <div class="text-center py-4">
            <div class="loading-spinner w-8 h-8 mx-auto mb-2"></div>
            <p class="text-gray-500">Loading classification details...</p>
          </div>
        {/if}

        <!-- Quick Actions -->
        <div class="flex space-x-3">
          <button class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl transition-colors">
            📤 Share
          </button>
          <button class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-3 px-4 rounded-xl transition-colors">
            📚 Learn More
          </button>
        </div>

        <!-- Detection Metadata -->
        <div class="border-t pt-4">
          <details class="text-sm text-gray-600">
            <summary class="cursor-pointer font-medium mb-2">Technical Details</summary>
            <div class="space-y-1 ml-4">
              <p>Confidence: {($selectedDetection.confidence * 100).toFixed(1)}%</p>
              <p>Bounding Box: [{$selectedDetection.bbox.map(n => n.toFixed(0)).join(', ')}]</p>
              <p>Object Class: {$selectedDetection.class}</p>
              <p>Category: {$selectedDetection.category}</p>
            </div>
          </details>
        </div>
        
        <!-- Keyboard navigation hint -->
        <div class="text-xs text-gray-500 text-center">
          Press Escape to close
        </div>
      </div>
    </div>
  </div>
{/if} 