<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { performanceMonitor } from '$lib/utils/performance';
  import { isBrowser, safeNavigator } from '$lib/utils/browser';

  const dispatch = createEventDispatcher();

  export let title = 'Something went wrong';
  export let message = 'An unexpected error occurred. Please try refreshing the page.';
  export let error: Error | null = null;
  export let showDetails = false;
  export let allowRetry = true;
  export let context = 'app';

  let errorDetails = '';
  let expanded = false;
  let canCopyToClipboard = false;

  onMount(() => {
    if (!isBrowser()) {
      console.warn('ErrorBoundary skipping browser-specific initialization during SSR');
      return;
    }

    // Check if clipboard API is available
    canCopyToClipboard = !!(navigator.clipboard && navigator.clipboard.writeText);

    if (error) {
      // Record error for analytics
      try {
        console.error('ErrorBoundary caught error:', error, context);
      } catch (monitorError) {
        console.warn('Failed to record error in performance monitor:', monitorError);
      }
      
      // Format error details
      formatErrorDetails();
    }
  });

  function formatErrorDetails() {
    if (!error) return;

    const navigator = safeNavigator();
    const browserInfo = navigator ? {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    } : null;

    errorDetails = `Error: ${error.name}: ${error.message}

Context: ${context}
Timestamp: ${new Date().toISOString()}

Stack trace:
${error.stack || 'No stack trace available'}

${browserInfo ? `Browser Information:
User Agent: ${browserInfo.userAgent}
Platform: ${browserInfo.platform}
Language: ${browserInfo.language}
Cookies Enabled: ${browserInfo.cookieEnabled}
Online: ${browserInfo.onLine}` : 'Browser info not available'}

URL: ${isBrowser() && window.location ? window.location.href : 'N/A'}`;
  }

  function handleRetry() {
    dispatch('retry');
  }

  function handleDismiss() {
    dispatch('dismiss');
  }

  async function copyErrorDetails() {
    if (!canCopyToClipboard || !isBrowser()) {
      console.warn('Clipboard not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(errorDetails);
      // Show success feedback (could be enhanced with a toast)
      console.log('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  function toggleDetails() {
    expanded = !expanded;
  }

  function getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'medium';
    
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Critical errors
    if (errorName.includes('security') || errorMessage.includes('cors')) {
      return 'critical';
    }
    
    // High severity
    if (errorName.includes('type') || errorMessage.includes('network') || errorMessage.includes('permission')) {
      return 'high';
    }
    
    // Low severity
    if (errorMessage.includes('warning') || errorMessage.includes('deprecated')) {
      return 'low';
    }
    
    return 'medium';
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  }

  $: severity = getErrorSeverity();
  $: severityColor = getSeverityColor(severity);
</script>

<div class="error-boundary p-6 rounded-lg border-l-4 {severityColor}">
  <!-- Error Header -->
  <div class="flex items-start justify-between mb-4">
    <div class="flex items-center">
      <div class="mr-3">
        {#if severity === 'critical'}
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        {:else if severity === 'high'}
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        {/if}
      </div>
      <div>
        <h3 class="text-lg font-semibold">{title}</h3>
        <p class="text-sm opacity-75 capitalize">Severity: {severity}</p>
      </div>
    </div>
    
    <button 
      on:click={handleDismiss} 
      class="text-current opacity-50 hover:opacity-75 transition-opacity"
      aria-label="Dismiss error"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>

  <!-- Error Message -->
  <div class="mb-4">
    <p class="text-sm">{message}</p>
    {#if error}
      <p class="text-xs mt-2 font-mono opacity-75">{error.name}: {error.message}</p>
    {/if}
  </div>

  <!-- Action Buttons -->
  <div class="flex flex-wrap gap-2 mb-4">
    {#if allowRetry}
      <button 
        on:click={handleRetry}
        class="px-4 py-2 bg-current text-white rounded hover:opacity-90 transition-opacity text-sm"
      >
        Try Again
      </button>
    {/if}
    
    {#if showDetails && error}
      <button 
        on:click={toggleDetails}
        class="px-4 py-2 border border-current rounded hover:bg-current hover:text-white transition-colors text-sm"
      >
        {expanded ? 'Hide' : 'Show'} Details
      </button>
      
      {#if canCopyToClipboard && errorDetails}
        <button 
          on:click={copyErrorDetails}
          class="px-4 py-2 border border-current rounded hover:bg-current hover:text-white transition-colors text-sm"
        >
          Copy Error
        </button>
      {/if}
    {/if}
  </div>

  <!-- Error Details -->
  {#if showDetails && expanded && errorDetails}
    <div class="mt-4 p-4 bg-black bg-opacity-10 rounded text-xs">
      <pre class="whitespace-pre-wrap overflow-x-auto">{errorDetails}</pre>
    </div>
  {/if}
</div>

<style>
  .error-boundary {
    max-width: 100%;
    word-wrap: break-word;
  }
  
  pre {
    font-family: 'Courier New', Courier, monospace;
    line-height: 1.4;
  }
</style> 