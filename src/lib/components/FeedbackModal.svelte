<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { confidenceCalibration } from '$lib/utils/confidence-calibration';
  import type { UserFeedback } from '$lib/utils/confidence-calibration';
  
  const dispatch = createEventDispatcher();
  
  export let isOpen = false;
  export let detectedClass = '';
  export let confidence = 0;
  export let imageUrl = '';
  export let contextData: any = null;
  
  let userCorrection = '';
  let isCorrect = true;
  let additionalComments = '';
  let imageQuality = 5;
  let lightingCondition = 'good';
  let showAdvancedOptions = false;
  
  const wasteCategories = [
    'plastic_bottle', 'glass_bottle', 'aluminum_can', 'paper_cup', 'cardboard_box',
    'food_waste', 'electronic_device', 'battery', 'plastic_bag', 'coffee_pod',
    'milk_carton', 'newspaper', 'glass_jar', 'tin_can', 'styrofoam',
    'clothing', 'shoes', 'phone', 'tablet', 'laptop'
  ];
  
  function handleSubmit() {
    const feedback: UserFeedback = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      detectedClass,
      userCorrectedClass: isCorrect ? null : userCorrection,
      confidence,
      isCorrect,
      contextData: {
        imageQuality: imageQuality / 10,
        lightingCondition,
        objectSize: contextData?.objectSize || 0.5,
        backgroundComplexity: contextData?.backgroundComplexity || 0.5
      }
    };
    
    // Add feedback to calibration system
    confidenceCalibration.addFeedback(feedback);
    
    // Dispatch event for parent component
    dispatch('feedback-submitted', feedback);
    
    // Close modal
    closeModal();
  }
  
  function closeModal() {
    isOpen = false;
    resetForm();
  }
  
  function resetForm() {
    userCorrection = '';
    isCorrect = true;
    additionalComments = '';
    imageQuality = 5;
    lightingCondition = 'good';
    showAdvancedOptions = false;
  }
  
  function handleIncorrectToggle() {
    if (isCorrect) {
      userCorrection = '';
    }
  }
  
  $: displayClass = detectedClass.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">
            Improve Classification
          </h2>
          <button
            on:click={closeModal}
            class="text-gray-400 hover:text-gray-600"
            aria-label="Close feedback modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Detection Info -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-4">
            {#if imageUrl}
              <img src={imageUrl} alt="Detected object" class="w-16 h-16 object-cover rounded" />
            {/if}
            <div>
              <p class="font-medium text-gray-900">{displayClass}</p>
              <p class="text-sm text-gray-600">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            </div>
          </div>
        </div>
        
        <!-- Feedback Form -->
        <form on:submit|preventDefault={handleSubmit}>
          <!-- Correctness Check -->
          <div class="mb-4">
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                bind:checked={isCorrect}
                on:change={handleIncorrectToggle}
                class="form-checkbox h-4 w-4 text-green-600"
              />
              <span class="text-gray-700">This classification is correct</span>
            </label>
          </div>
          
          <!-- Correction Input -->
          {#if !isCorrect}
            <div class="mb-4">
              <label for="correction" class="block text-sm font-medium text-gray-700 mb-2">
                What should this be classified as?
              </label>
              <select
                id="correction"
                bind:value={userCorrection}
                required={!isCorrect}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select correct category...</option>
                {#each wasteCategories as category}
                  <option value={category}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                {/each}
              </select>
            </div>
          {/if}
          
          <!-- Advanced Options Toggle -->
          <div class="mb-4">
            <button
              type="button"
              on:click={() => showAdvancedOptions = !showAdvancedOptions}
              class="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>{showAdvancedOptions ? 'Hide' : 'Show'} advanced options</span>
              <svg 
                class="w-4 h-4 transform {showAdvancedOptions ? 'rotate-180' : ''}" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <!-- Advanced Options -->
          {#if showAdvancedOptions}
            <div class="mb-4 p-4 border border-gray-200 rounded-lg space-y-4">
              <!-- Image Quality -->
              <div>
                <label for="quality" class="block text-sm font-medium text-gray-700 mb-2">
                  Image Quality (1-10)
                </label>
                <input
                  id="quality"
                  type="range"
                  min="1"
                  max="10"
                  bind:value={imageQuality}
                  class="w-full"
                />
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Poor</span>
                  <span class="font-medium">{imageQuality}</span>
                  <span>Excellent</span>
                </div>
              </div>
              
              <!-- Lighting Condition -->
              <div>
                <label for="lighting" class="block text-sm font-medium text-gray-700 mb-2">
                  Lighting Condition
                </label>
                <select
                  id="lighting"
                  bind:value={lightingCondition}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="poor">Poor</option>
                  <option value="fair">Fair</option>
                  <option value="good">Good</option>
                  <option value="excellent">Excellent</option>
                </select>
              </div>
              
              <!-- Additional Comments -->
              <div>
                <label for="comments" class="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (optional)
                </label>
                <textarea
                  id="comments"
                  bind:value={additionalComments}
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Any additional context that might help improve the model..."
                ></textarea>
              </div>
            </div>
          {/if}
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button
              type="submit"
              class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              Submit Feedback
            </button>
            <button
              type="button"
              on:click={closeModal}
              class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
        
        <!-- Help Text -->
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <p class="text-xs text-blue-700">
            <strong>Your feedback helps improve accuracy!</strong>
            Classifications are continuously calibrated based on user corrections.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .form-checkbox:checked {
    background-color: #10b981;
    border-color: #10b981;
  }
</style> 