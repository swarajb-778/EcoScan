<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { performanceMonitor } from '$lib/utils/performance';

  const dispatch = createEventDispatcher();

  export let title = 'Something went wrong';
  export let message = 'An unexpected error occurred. Please try refreshing the page.';
  export let error: Error | null = null;
  export let showDetails = false;
  export let allowRetry = true;
  export let context = 'app';

  let errorDetails = '';
  let expanded = false;

  onMount(() => {
    if (error) {
      // Record error for analytics
      performanceMonitor.recordError(error, context);
      
      // Format error details
      errorDetails = `${error.name}: ${error.message}\n\nStack trace:\n${error.stack || 'No stack trace available'}`;
    }
  });

  function handleRetry() {
    dispatch('retry');
  }

  function handleDismiss() {
    dispatch('dismiss');
  }

  function copyErrorDetails() {
    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Error details copied to clipboard');
    });
  }

  function toggleDetails() {
    expanded = !expanded;
  }
</script>

<div class="error-boundary bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
  <!-- Error Icon -->
  <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
    <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  </div>

  <!-- Error Title -->
  <h3 class="text-lg font-semibold text-red-800 text-center mb-2">
    {title}
  </h3>

  <!-- Error Message -->
  <p class="text-red-700 text-center mb-4">
    {message}
  </p>

  <!-- Error Actions -->
  <div class="flex flex-col gap-2">
    {#if allowRetry}
      <button 
        class="btn btn-primary btn-sm"
        on:click={handleRetry}
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Try Again
      </button>
    {/if}

    <button 
      class="btn btn-ghost btn-sm"
      on:click={handleDismiss}
    >
      Dismiss
    </button>

    {#if error && showDetails}
      <button 
        class="btn btn-ghost btn-sm text-xs"
        on:click={toggleDetails}
      >
        {expanded ? 'Hide' : 'Show'} Details
      </button>
    {/if}
  </div>

  <!-- Error Details -->
  {#if error && showDetails && expanded}
    <div class="mt-4 p-3 bg-red-100 rounded border">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-medium text-red-700">Error Details</span>
        <button 
          class="text-xs text-red-600 hover:text-red-800"
          on:click={copyErrorDetails}
          title="Copy error details"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <pre class="text-xs text-red-800 overflow-auto max-h-32 whitespace-pre-wrap">{errorDetails}</pre>
    </div>
  {/if}
</div>

<style>
  .error-boundary {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style> 