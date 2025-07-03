<script lang="ts">
  import CameraView from '$lib/components/CameraView.svelte';
  import DetectionDetails from '$lib/components/DetectionDetails.svelte';
  import { 
    detections, 
    selectedDetection, 
    hasDetections,
    isLoading,
    performanceMetrics 
  } from '$lib/stores/appStore.js';

  let showStats = false;
</script>

<svelte:head>
  <title>EcoScan - Camera Detection</title>
  <meta name="description" content="Real-time waste classification using your camera" />
</svelte:head>

<div class="flex-1 flex flex-col lg:flex-row gap-6 p-6">
  <!-- Main Camera Section -->
  <div class="flex-1 flex flex-col">
    <div class="mb-4">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Real-Time Detection</h2>
      <p class="text-gray-600">Point your camera at waste items to classify them instantly</p>
    </div>
    
    <!-- Camera View -->
    <div class="flex-1 min-h-[500px]">
      <CameraView />
    </div>

    <!-- Performance Stats (Development) -->
    {#if showStats}
      <div class="mt-4 p-4 bg-gray-100 rounded-xl">
        <h3 class="font-semibold mb-2">Performance Metrics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Model Load:</span>
            <span class="font-mono">{$performanceMetrics.modelLoadTime.toFixed(0)}ms</span>
          </div>
          <div>
            <span class="text-gray-600">Inference:</span>
            <span class="font-mono">{$performanceMetrics.inferenceTime.toFixed(0)}ms</span>
          </div>
          <div>
            <span class="text-gray-600">Frame Rate:</span>
            <span class="font-mono">{$performanceMetrics.frameRate} FPS</span>
          </div>
          <div>
            <span class="text-gray-600">Detections:</span>
            <span class="font-mono">{$detections.length}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Sidebar Information -->
  <div class="lg:w-80 space-y-6">
    <!-- Loading State -->
    {#if $isLoading}
      <div class="card">
        <div class="text-center">
          <div class="loading-spinner w-12 h-12 mx-auto mb-4"></div>
          <h3 class="text-lg font-semibold mb-2">Loading AI Models</h3>
          <p class="text-gray-600">Initializing detection system...</p>
        </div>
      </div>
    {/if}

    <!-- Quick Guide -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4 flex items-center">
        <span class="text-xl mr-2">📖</span>
        Quick Guide
      </h3>
      <div class="space-y-3 text-sm">
        <div class="flex items-start space-x-3">
          <span class="text-lg">🎯</span>
          <div>
            <p class="font-medium">Point & Detect</p>
            <p class="text-gray-600">Aim your camera at waste items</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <span class="text-lg">👆</span>
          <div>
            <p class="font-medium">Tap for Details</p>
            <p class="text-gray-600">Click on detected items for disposal info</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <span class="text-lg">🔄</span>
          <div>
            <p class="font-medium">Real-time Updates</p>
            <p class="text-gray-600">Detection happens automatically</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Detection Summary -->
    {#if $hasDetections}
      <div class="card">
        <h3 class="text-lg font-semibold mb-4 flex items-center">
          <span class="text-xl mr-2">📊</span>
          Current Detections
        </h3>
        <div class="space-y-2">
          {#each $detections as detection, index}
            <button 
              on:click={() => selectedDetection.set(detection)}
              class="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-lg">
                    {detection.category === 'recycle' ? '♻️' : detection.category === 'compost' ? '🌱' : '🗑️'}
                  </span>
                  <span class="font-medium">{detection.class}</span>
                </div>
                <span class="text-sm text-gray-500">
                  {(detection.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if !$isLoading}
      <div class="card text-center">
        <span class="text-4xl mb-3 block">🔍</span>
        <h3 class="text-lg font-semibold mb-2">No Items Detected</h3>
        <p class="text-gray-600 text-sm">
          Point your camera at waste items to see real-time classification results.
        </p>
      </div>
    {/if}

    <!-- Category Legend -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4 flex items-center">
        <span class="text-xl mr-2">🏷️</span>
        Categories
      </h3>
      <div class="space-y-3">
        <div class="flex items-center space-x-3">
          <div class="w-4 h-4 bg-green-500 rounded"></div>
          <div>
            <p class="font-medium text-green-700">♻️ Recycle</p>
            <p class="text-xs text-gray-600">Containers, paper, metals</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <div class="w-4 h-4 bg-lime-500 rounded"></div>
          <div>
            <p class="font-medium text-lime-700">🌱 Compost</p>
            <p class="text-xs text-gray-600">Food scraps, organic waste</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <div class="w-4 h-4 bg-red-500 rounded"></div>
          <div>
            <p class="font-medium text-red-700">🗑️ Landfill</p>
            <p class="text-xs text-gray-600">General waste, electronics</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle Stats (Development) -->
    <button 
      on:click={() => showStats = !showStats}
      class="w-full text-left text-xs text-gray-500 hover:text-gray-700 p-2"
    >
      {showStats ? 'Hide' : 'Show'} Performance Stats
    </button>
  </div>
</div>

<!-- Detection Details Modal -->
<DetectionDetails />
