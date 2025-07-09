<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { isBrowser, safeWindow } from '$lib/utils/browser.js';

  const dispatch = createEventDispatcher();

  export let disabled = false;
  export let hapticFeedback = true;
  export let visualFeedback = true;
  export let audioFeedback = false;
  export let intensity = 'medium'; // 'light', 'medium', 'heavy'
  export let feedbackType = 'impact'; // 'impact', 'selection', 'notification'

  let element: HTMLElement;
  let isPressed = false;
  let ripples: Array<{ x: number; y: number; id: number }> = [];
  let rippleCounter = 0;
  let mounted = false;
  let audioContext: AudioContext | null = null;
  let supportedFeatures = {
    vibration: false,
    audioContext: false,
    webAudio: false
  };

  onMount(() => {
    if (!isBrowser()) {
      console.warn('TouchFeedback skipping initialization during SSR');
      return;
    }
    
    mounted = true;
    detectSupportedFeatures();
    initializeAudioContext();
  });

  onDestroy(() => {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
  });

  function detectSupportedFeatures() {
    if (!mounted || !isBrowser()) return;

    const window = safeWindow();
    if (!window) return;

    // Check vibration API support
    supportedFeatures.vibration = !!(
      navigator.vibrate || 
      (navigator as any).webkitVibrate || 
      (navigator as any).mozVibrate
    );
    
    // Check Web Audio API support
    supportedFeatures.audioContext = !!(
      (window as any).AudioContext || 
      (window as any).webkitAudioContext
    );
    supportedFeatures.webAudio = supportedFeatures.audioContext;
  }

  function initializeAudioContext() {
    if (!mounted || !audioFeedback || !supportedFeatures.audioContext) return;

    try {
      const window = safeWindow();
      if (!window) return;

      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContext();
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      supportedFeatures.audioContext = false;
    }
  }

  function handleTouchStart(event: TouchEvent) {
    if (disabled || !mounted) return;

    isPressed = true;
    
    // Provide haptic feedback
    if (hapticFeedback) {
      triggerHapticFeedback();
    }

    // Visual feedback for touch
    if (visualFeedback && event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = element.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      createRipple(x, y);
    }

    // Audio feedback
    if (audioFeedback) {
      playTouchSound();
    }

    dispatch('touchstart', { originalEvent: event });
  }

  function handleTouchEnd(event: TouchEvent) {
    if (disabled || !mounted) return;

    isPressed = false;
    dispatch('touchend', { originalEvent: event });
  }

  function handleTouchCancel(event: TouchEvent) {
    if (disabled || !mounted) return;

    isPressed = false;
    dispatch('touchcancel', { originalEvent: event });
  }

  function handleClick(event: MouseEvent) {
    if (disabled || !mounted) return;

    // For mouse clicks, provide alternative feedback
    if (visualFeedback) {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      createRipple(x, y);
    }

    // Provide audio feedback for clicks too
    if (audioFeedback) {
      playTouchSound();
    }

    // Light haptic feedback for mouse clicks on supported devices
    if (hapticFeedback && supportedFeatures.vibration) {
      triggerHapticFeedback('light');
    }

    dispatch('click', { originalEvent: event });
  }

  function createRipple(x: number, y: number) {
    if (!mounted) return;

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

  function triggerHapticFeedback(forceIntensity?: string) {
    if (!mounted || !hapticFeedback || !supportedFeatures.vibration) return;

    const currentIntensity = forceIntensity || intensity;
    let vibrationPattern: number | number[];

    // Map feedback type and intensity to vibration patterns
    switch (feedbackType) {
      case 'impact':
        switch (currentIntensity) {
          case 'light': vibrationPattern = 10; break;
          case 'medium': vibrationPattern = 20; break;
          case 'heavy': vibrationPattern = 40; break;
          default: vibrationPattern = 20;
        }
        break;
      case 'selection':
        vibrationPattern = [5, 5, 10];
        break;
      case 'notification':
        vibrationPattern = [50, 30, 50, 30, 50];
        break;
      default:
        vibrationPattern = 20;
    }

    try {
      if (navigator.vibrate) {
        navigator.vibrate(vibrationPattern);
      } else if ((navigator as any).webkitVibrate) {
        (navigator as any).webkitVibrate(vibrationPattern);
      } else if ((navigator as any).mozVibrate) {
        (navigator as any).mozVibrate(vibrationPattern);
      }
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }

  async function playTouchSound() {
    if (!mounted || !audioFeedback || !audioContext || audioContext.state === 'closed') return;

    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return;
      }
    }

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different sounds for different feedback types
      let frequency: number;
      let duration: number;
      
      switch (feedbackType) {
        case 'impact':
          frequency = 800;
          duration = 0.1;
          break;
        case 'selection':
          frequency = 600;
          duration = 0.05;
          break;
        case 'notification':
          frequency = 1000;
          duration = 0.15;
          break;
        default:
          frequency = 800;
          duration = 0.1;
      }

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Could not play touch sound:', error);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (disabled || !mounted) return;
    
    // Trigger feedback on Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      isPressed = true;
      
      if (hapticFeedback) {
        triggerHapticFeedback('light');
      }
      
      if (audioFeedback) {
        playTouchSound();
      }
      
      dispatch('click', { originalEvent: event });
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (disabled || !mounted) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      isPressed = false;
    }
  }

  // Export feedback capabilities for external components
  export function triggerFeedback(type?: string, customIntensity?: string) {
    if (!mounted) return;

    const prevType = feedbackType;
    if (type) feedbackType = type as any;
    
    if (hapticFeedback) {
      triggerHapticFeedback(customIntensity);
    }
    
    if (audioFeedback) {
      playTouchSound();
    }
    
    feedbackType = prevType;
  }

  // Get support information
  export function getSupportInfo() {
    return { ...supportedFeatures };
  }
</script>

{#if mounted}
<div
  bind:this={element}
  class="touch-feedback"
  class:pressed={isPressed}
  class:disabled
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchCancel}
  on:click={handleClick}
  on:keydown={handleKeyDown}
  on:keyup={handleKeyUp}
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-pressed={isPressed}
  aria-disabled={disabled}
>
  <slot />
  
  <!-- Ripple effects -->
  {#if visualFeedback}
    {#each ripples as ripple (ripple.id)}
      <div
        class="ripple"
        style="left: {ripple.x}px; top: {ripple.y}px;"
      ></div>
    {/each}
  {/if}
</div>
{:else}
  <div class="touch-feedback-loading">
    <slot />
  </div>
{/if}

<style>
  .touch-feedback {
    position: relative;
    overflow: hidden;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s ease;
  }
  
  .touch-feedback:not(.disabled):focus {
    outline: 2px solid #007acc;
    outline-offset: 2px;
  }
  
  .touch-feedback.pressed {
    transform: scale(0.98);
  }
  
  .touch-feedback.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  .touch-feedback-loading {
    opacity: 0.8;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple-animation 0.6s ease-out;
  }
  
  @keyframes ripple-animation {
    to {
      transform: translate(-50%, -50%) scale(4);
      opacity: 0;
    }
  }
  
  /* Enhanced accessibility */
  @media (prefers-reduced-motion: reduce) {
    .touch-feedback {
      transition: none;
    }
    
    .touch-feedback.pressed {
      transform: none;
    }
    
    .ripple {
      animation: none;
      opacity: 0;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .ripple {
      background: rgba(0, 0, 0, 0.8);
    }
  }
</style> 