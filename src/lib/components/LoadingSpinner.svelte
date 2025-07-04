<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let message = '';
  export let progress: number | null = null;
  export let type: 'spinner' | 'pulse' | 'dots' = 'spinner';
  export let overlay = false;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };
</script>

<div 
  class="loading-container {overlay ? 'loading-overlay' : ''} {containerClasses[size]}"
  class:flex={!overlay}
  class:fixed={overlay}
>
  {#if type === 'spinner'}
    <!-- Spinning circle -->
    <div class="spinner {sizeClasses[size]}">
      <div class="spinner-circle"></div>
    </div>
  {:else if type === 'pulse'}
    <!-- Pulsing circle -->
    <div class="pulse {sizeClasses[size]}">
      <div class="pulse-circle"></div>
    </div>
  {:else if type === 'dots'}
    <!-- Three dots -->
    <div class="dots {sizeClasses[size]}">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  {/if}

  {#if message}
    <p class="loading-message" class:text-sm={size === 'sm'} class:text-base={size === 'md'} class:text-lg={size === 'lg'}>
      {message}
    </p>
  {/if}

  {#if progress !== null}
    <div class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          style="width: {Math.max(0, Math.min(100, progress))}%"
        ></div>
      </div>
      <span class="progress-text text-sm">
        {Math.round(progress)}%
      </span>
    </div>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .loading-overlay {
    inset: 0;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 50;
    backdrop-filter: blur(2px);
  }

  .loading-message {
    color: #6b7280;
    text-align: center;
    font-weight: 500;
  }

  /* Spinner Animation */
  .spinner {
    position: relative;
    display: inline-block;
  }

  .spinner-circle {
    width: 100%;
    height: 100%;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #22c55e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Pulse Animation */
  .pulse {
    position: relative;
    display: inline-block;
  }

  .pulse-circle {
    width: 100%;
    height: 100%;
    background-color: #22c55e;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  /* Dots Animation */
  .dots {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
  }

  .dot {
    width: 25%;
    height: 25%;
    background-color: #22c55e;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }
  .dot:nth-child(3) { animation-delay: 0s; }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Progress Bar */
  .progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    max-width: 200px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    color: #6b7280;
    font-weight: 500;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .loading-overlay {
      padding: 1rem;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .spinner-circle,
    .pulse-circle,
    .dot {
      animation-duration: 2s;
    }
  }
</style> 