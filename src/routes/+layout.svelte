<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { currentView, errorMessage, loadPreferences } from '$lib/stores/appStore.js';

  onMount(() => {
    loadPreferences();
  });
</script>

<svelte:head>
  <title>EcoScan - AI Waste Classification</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-lg font-bold">🌱</span>
            </div>
            <h1 class="text-xl font-bold text-gray-900">EcoScan</h1>
          </div>
        </div>
        
        <!-- Navigation -->
        <nav class="hidden sm:flex space-x-1">
          <a 
            href="/" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
          >
            📸 Camera
          </a>
          <a 
            href="/upload" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/upload' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
          >
            📁 Upload
          </a>
          <a 
            href="/voice" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/voice' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}"
          >
            🎤 Voice
          </a>
        </nav>

        <!-- Mobile menu button -->
        <button class="sm:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Error Toast -->
  <div aria-live="assertive" class="sr-only">
    {$errorMessage}
  </div>
  {#if $errorMessage}
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bounce-in">
      <div class="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
        <span class="text-xl">⚠️</span>
        <span class="font-medium">{$errorMessage}</span>
        <button 
          on:click={() => errorMessage.set(null)}
          class="ml-2 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <main class="flex-1 flex flex-col">
    <slot />
  </main>

  <!-- Bottom Navigation (Mobile) -->
  <nav class="sm:hidden bg-white border-t border-gray-200 px-4 py-2">
    <div class="flex justify-around">
      <a 
        href="/" 
        class="flex flex-col items-center py-2 px-3 rounded-lg {$page.url.pathname === '/' ? 'text-green-600' : 'text-gray-600'}"
      >
        <span class="text-2xl mb-1">📸</span>
        <span class="text-xs font-medium">Camera</span>
      </a>
      <a 
        href="/upload" 
        class="flex flex-col items-center py-2 px-3 rounded-lg {$page.url.pathname === '/upload' ? 'text-green-600' : 'text-gray-600'}"
      >
        <span class="text-2xl mb-1">📁</span>
        <span class="text-xs font-medium">Upload</span>
      </a>
      <a 
        href="/voice" 
        class="flex flex-col items-center py-2 px-3 rounded-lg {$page.url.pathname === '/voice' ? 'text-green-600' : 'text-gray-600'}"
      >
        <span class="text-2xl mb-1">🎤</span>
        <span class="text-xs font-medium">Voice</span>
      </a>
    </div>
  </nav>
</div> 