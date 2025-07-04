<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { vibrate } from '$lib/utils/device';

  const dispatch = createEventDispatcher();

  export let hapticFeedback = true;
  export let visualFeedback = true;
  export let soundFeedback = false;
  export let disabled = false;
  export let variant: 'light' | 'medium' | 'heavy' = 'light';

  let element: HTMLElement;
  let isPressed = false;
  let ripples: Array<{ x: number; y: number; id: number }> = [];
  let rippleCounter = 0;

  // Haptic feedback patterns
  const hapticPatterns = {
    light: 10,
    medium: [50, 30, 50],
    heavy: [100, 50, 100]
  };

  function handleTouchStart(event: TouchEvent) {
    if (disabled) return;

    isPressed = true;
    
    // Haptic feedback
    if (hapticFeedback) {
      vibrate(hapticPatterns[variant]);
    }

    // Visual feedback (ripple effect)
    if (visualFeedback) {
      const touch = event.touches[0];
      const rect = element.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const ripple = {
        x,
        y,
        id: rippleCounter++
      };
      
      ripples = [...ripples, ripple];
      
      // Remove ripple after animation
      setTimeout(() => {
        ripples = ripples.filter(r => r.id !== ripple.id);
      }, 600);
    }

    // Sound feedback
    if (soundFeedback) {
      playTouchSound();
    }

    dispatch('touchstart', { originalEvent: event });
  }

  function handleTouchEnd(event: TouchEvent) {
    if (disabled) return;

    isPressed = false;
    dispatch('touchend', { originalEvent: event });
  }

  function handleTouchCancel(event: TouchEvent) {
    if (disabled) return;

    isPressed = false;
    dispatch('touchcancel', { originalEvent: event });
  }

  function handleClick(event: MouseEvent) {
    if (disabled) return;

    // For mouse clicks, provide alternative feedback
    if (visualFeedback) {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const ripple = {
        x,
        y,
        id: rippleCounter++
      };
      
      ripples = [...ripples, ripple];
      
      setTimeout(() => {
        ripples = ripples.filter(r => r.id !== ripple.id);
      }, 600);
    }

    dispatch('click', { originalEvent: event });
  }

  function playTouchSound() {
    // Create a simple beep sound using Web Audio API
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.warn('Could not play touch sound:', e);
      }
    }
  }
</script>

<div
  bind:this={element}
  class="touch-feedback"
  class:pressed={isPressed}
  class:disabled
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchCancel}
  on:click={handleClick}
  role="button"
  tabindex={disabled ? -1 : 0}
>
  <!-- Ripple effects -->
  {#if visualFeedback}
    <div class="ripple-container">
      {#each ripples as ripple (ripple.id)}
        <div
          class="ripple"
          style="left: {ripple.x}px; top: {ripple.y}px;"
        ></div>
      {/each}
    </div>
  {/if}

  <!-- Content slot -->
  <slot />
</div>

<style>
  .touch-feedback {
    position: relative;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s ease;
  }

  .touch-feedback:active,
  .touch-feedback.pressed {
    transform: scale(0.95);
  }

  .touch-feedback.disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  .ripple-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .ripple {
    position: absolute;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    margin-top: -10px;
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }

  @keyframes ripple-animation {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  /* Focus styles for keyboard navigation */
  .touch-feedback:focus {
    outline: 2px solid #22c55e;
    outline-offset: 2px;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .touch-feedback {
      transition: none;
    }
    
    .touch-feedback:active,
    .touch-feedback.pressed {
      transform: none;
    }
    
    .ripple {
      animation: none;
      opacity: 0.3;
    }
  }
</style> 