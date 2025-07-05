<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initializeAnalytics, trackEvent } from '$lib/utils/analytics';
  import { isLoading, hasDetections } from '$lib/stores/appStore';
  import '../app.css';

  let showMobileMenu = false;
  let installPrompt: any = null;
  let isInstallable = false;

  onMount(() => {
    // Initialize analytics
    initializeAnalytics();
    
    // Track page views
    trackEvent('page_view', { path: $page.url.pathname });
    
    // Set up PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
      isInstallable = true;
    });

    // Track app installation
    window.addEventListener('appinstalled', () => {
      trackEvent('app_installed');
      isInstallable = false;
    });
  });

  function toggleMobileMenu() {
    showMobileMenu = !showMobileMenu;
    trackEvent('navigation_toggle', { action: showMobileMenu ? 'open' : 'close' });
  }

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      trackEvent('install_prompt_result', { choice: result.outcome });
      installPrompt = null;
      isInstallable = false;
    }
  }

  // Navigation items
  const navItems = [
    { href: '/', label: 'Camera', icon: '📷' },
    { href: '/upload', label: 'Upload', icon: '📤' },
    { href: '/voice', label: 'Voice', icon: '🎤' },
    { href: '/about', label: 'About', icon: 'ℹ️' }
  ];

  $: currentPath = $page.url.pathname;
</script>

<svelte:head>
  <meta name="theme-color" content="#22c55e" />
  <link rel="manifest" href="/manifest.json" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-sm font-bold">♻</span>
            </div>
            <span class="text-xl font-bold text-gray-900">EcoScan</span>
          </a>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex space-x-8">
          {#each navItems as item}
            <a 
              href={item.href}
              class="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                     {currentPath === item.href 
                       ? 'text-green-600 bg-green-50' 
                       : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'}"
              on:click={() => trackEvent('navigation_click', { destination: item.href })}
            >
              <span class="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          {/each}
        </nav>

        <!-- Actions -->
        <div class="flex items-center space-x-4">
          <!-- Install App Button -->
          {#if isInstallable}
            <button
              on:click={installApp}
              class="hidden sm:flex items-center space-x-1 px-3 py-2 text-sm font-medium text-green-600 
                     hover:text-green-700 border border-green-300 rounded-md hover:bg-green-50 transition-colors"
            >
              <span>📱</span>
              <span>Install App</span>
            </button>
          {/if}

          <!-- Mobile menu button -->
          <button
            on:click={toggleMobileMenu}
            class="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Toggle mobile menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if showMobileMenu}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    {#if showMobileMenu}
      <div class="md:hidden border-t border-gray-200 bg-white">
        <div class="px-2 pt-2 pb-3 space-y-1">
          {#each navItems as item}
            <a
              href={item.href}
              class="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors
                     {currentPath === item.href 
                       ? 'text-green-600 bg-green-50' 
                       : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'}"
              on:click={() => {
                showMobileMenu = false;
                trackEvent('mobile_navigation_click', { destination: item.href });
              }}
            >
              <span class="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          {/each}
          
          {#if isInstallable}
            <button
              on:click={() => {
                showMobileMenu = false;
                installApp();
              }}
              class="w-full flex items-center space-x-2 px-3 py-2 text-base font-medium text-green-600 
                     hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
            >
              <span class="text-xl">📱</span>
              <span>Install App</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </header>

  <!-- Loading Overlay -->
  {#if $isLoading}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Loading AI Models</h3>
        <p class="text-gray-600">Please wait while we initialize the detection system...</p>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <main class="flex-1 flex flex-col">
    <slot />
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-gray-200 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
        <div class="flex items-center space-x-4 text-sm text-gray-600">
          <span>© 2024 EcoScan</span>
          <span>•</span>
          <span>AI-Powered Waste Classification</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- Status Indicators -->
          <div class="flex items-center space-x-2 text-xs text-gray-500">
            {#if $hasDetections}
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Active</span>
              </div>
            {:else}
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Ready</span>
              </div>
            {/if}
          </div>

          <!-- Links -->
          <div class="flex items-center space-x-3 text-sm">
            <a href="/privacy" class="text-gray-600 hover:text-green-600 transition-colors">Privacy</a>
            <a href="/help" class="text-gray-600 hover:text-green-600 transition-colors">Help</a>
            <a 
              href="https://github.com/yourusername/ecoscan" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-gray-600 hover:text-green-600 transition-colors"
              on:click={() => trackEvent('external_link_click', { destination: 'github' })}
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</div>

<!-- Offline Indicator -->
<div class="fixed bottom-4 left-4 z-40">
  {#if !navigator.onLine}
    <div class="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <span class="text-sm">📡</span>
      <span class="text-sm font-medium">Offline Mode</span>
    </div>
  {/if}
</div>

<style>
  /* Ensure smooth transitions */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Custom scrollbar */
  :global(::-webkit-scrollbar) {
    width: 8px;
  }

  :global(::-webkit-scrollbar-track) {
    background: #f1f5f9;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: #cbd5e1;
    border-radius: 4px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: #94a3b8;
  }

  /* Focus styles for accessibility */
  :global(button:focus, a:focus, input:focus, select:focus, textarea:focus) {
    outline: 2px solid #22c55e;
    outline-offset: 2px;
  }

  /* Print styles */
  @media print {
    header, footer {
      display: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :global(.bg-gray-50) {
      background-color: white;
    }
    
    :global(.text-gray-600) {
      color: black;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    :global(.animate-spin) {
      animation: none;
    }
    
    :global(.animate-pulse) {
      animation: none;
    }
    
    * {
      transition-duration: 0.01ms !important;
    }
  }
</style> 