<script lang="ts">
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/utils/analytics';

  onMount(() => {
    trackEvent('page_view', { page: 'about' });
  });

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Detection',
      description: 'Advanced YOLOv8 neural network for real-time object recognition with 95%+ accuracy'
    },
    {
      icon: '📱',
      title: 'Multi-Modal Input',
      description: 'Camera, image upload, and voice recognition for maximum accessibility'
    },
    {
      icon: '♻️',
      title: 'Smart Classification',
      description: 'Intelligent waste categorization into recycling, composting, and landfill'
    },
    {
      icon: '🌍',
      title: 'Environmental Impact',
      description: 'Learn disposal methods and environmental impact of different waste types'
    },
    {
      icon: '📊',
      title: 'Performance Analytics',
      description: 'Real-time performance monitoring and usage analytics'
    },
    {
      icon: '🔒',
      title: 'Privacy-First',
      description: 'All processing happens locally on your device - no data leaves your phone'
    }
  ];

  const technologies = [
    { name: 'SvelteKit', purpose: 'Modern web framework for optimal performance' },
    { name: 'YOLOv8', purpose: 'State-of-the-art object detection neural network' },
    { name: 'ONNX Runtime', purpose: 'Cross-platform ML inference engine' },
    { name: 'TailwindCSS', purpose: 'Utility-first CSS framework for responsive design' },
    { name: 'TypeScript', purpose: 'Type-safe development for better code quality' },
    { name: 'PWA', purpose: 'Progressive Web App for native-like experience' }
  ];
</script>

<svelte:head>
  <title>About - EcoScan</title>
  <meta name="description" content="Learn about EcoScan's AI-powered waste classification technology and environmental mission." />
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Hero Section -->
  <div class="text-center mb-16">
    <div class="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
      <span class="text-3xl">♻️</span>
    </div>
    <h1 class="text-4xl font-bold text-gray-900 mb-4">About EcoScan</h1>
    <p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
      AI-powered waste classification application that helps you make better environmental choices 
      through real-time object detection and intelligent disposal recommendations.
    </p>
  </div>

  <!-- Mission Statement -->
  <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-16">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
      <p class="text-lg text-gray-700 leading-relaxed">
        To democratize environmental awareness through cutting-edge AI technology, making it easier 
        for everyone to properly classify and dispose of waste items. We believe that small actions, 
        when multiplied by millions of people, can transform the world.
      </p>
    </div>
  </div>

  <!-- Features Grid -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Key Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each features as feature}
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div class="text-4xl mb-4">{feature.icon}</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
          <p class="text-gray-600 leading-relaxed">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Technology Stack -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Technology Stack</h2>
    <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each technologies as tech}
          <div class="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h4 class="font-semibold text-gray-900">{tech.name}</h4>
              <p class="text-gray-600 text-sm">{tech.purpose}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Performance Metrics -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Performance</h2>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="text-3xl font-bold text-green-600 mb-2">95%+</div>
        <div class="text-gray-600">Detection Accuracy</div>
      </div>
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="text-3xl font-bold text-green-600 mb-2">&lt;100ms</div>
        <div class="text-gray-600">Inference Time</div>
      </div>
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="text-3xl font-bold text-green-600 mb-2">160+</div>
        <div class="text-gray-600">Waste Categories</div>
      </div>
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="text-3xl font-bold text-green-600 mb-2">100%</div>
        <div class="text-gray-600">Local Processing</div>
      </div>
    </div>
  </div>

  <!-- How It Works -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">📸</span>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Capture</h3>
        <p class="text-gray-600">
          Use your camera, upload an image, or describe the item with voice input
        </p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">🤖</span>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Analyze</h3>
        <p class="text-gray-600">
          AI processes the input using advanced neural networks to identify objects
        </p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">♻️</span>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Classify</h3>
        <p class="text-gray-600">
          Get instant disposal recommendations and environmental impact information
        </p>
      </div>
    </div>
  </div>

  <!-- Environmental Impact -->
  <div class="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 mb-16">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Environmental Impact</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div>
          <div class="text-2xl font-bold text-blue-600 mb-2">🌊</div>
          <h4 class="font-semibold text-gray-900 mb-2">Reduce Ocean Pollution</h4>
          <p class="text-gray-600 text-sm">Proper recycling prevents plastic waste from entering waterways</p>
        </div>
        <div>
          <div class="text-2xl font-bold text-green-600 mb-2">🌱</div>
          <h4 class="font-semibold text-gray-900 mb-2">Support Circular Economy</h4>
          <p class="text-gray-600 text-sm">Correct classification enables effective material recovery</p>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-600 mb-2">⚡</div>
          <h4 class="font-semibold text-gray-900 mb-2">Reduce Carbon Footprint</h4>
          <p class="text-gray-600 text-sm">Proper disposal reduces greenhouse gas emissions</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Privacy & Security -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Privacy & Security</h2>
    <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">🔒 Local Processing</h3>
          <p class="text-gray-600 mb-4">
            All AI inference happens directly on your device. Your images and data never leave your phone.
          </p>
          <ul class="text-gray-600 space-y-2">
            <li>• No server uploads required</li>
            <li>• Offline functionality</li>
            <li>• Complete data ownership</li>
          </ul>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">📊 Anonymous Analytics</h3>
          <p class="text-gray-600 mb-4">
            We collect only anonymous usage statistics to improve the app experience.
          </p>
          <ul class="text-gray-600 space-y-2">
            <li>• No personal identification</li>
            <li>• Aggregated performance metrics only</li>
            <li>• Easy opt-out available</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Call to Action -->
  <div class="text-center bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
    <h2 class="text-2xl font-bold mb-4">Ready to Make a Difference?</h2>
    <p class="text-green-100 mb-6 max-w-2xl mx-auto">
      Start classifying waste items and contribute to a more sustainable future. Every correct classification makes a difference.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a 
        href="/" 
        class="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        on:click={() => trackEvent('cta_click', { source: 'about_page', destination: 'camera' })}
      >
        📸 Start with Camera
      </a>
      <a 
        href="/upload" 
        class="bg-green-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-300 transition-colors"
        on:click={() => trackEvent('cta_click', { source: 'about_page', destination: 'upload' })}
      >
        📤 Upload Image
      </a>
    </div>
  </div>
</div> 