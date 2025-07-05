<script lang="ts">
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/utils/analytics';

  onMount(() => {
    trackEvent('page_view', { page: 'help' });
  });

  let expandedFaq = new Set();

  function toggleFaq(index: number) {
    if (expandedFaq.has(index)) {
      expandedFaq.delete(index);
    } else {
      expandedFaq.add(index);
    }
    expandedFaq = new Set(expandedFaq);
    trackEvent('faq_toggle', { index, expanded: expandedFaq.has(index) });
  }

  const faqs = [
    {
      question: "How accurate is EcoScan's waste classification?",
      answer: "EcoScan achieves 95%+ accuracy using the advanced YOLOv8 neural network. The AI has been trained on thousands of waste items and continuously improves through usage patterns. However, for items you're unsure about, we recommend consulting local recycling guidelines."
    },
    {
      question: "Does EcoScan work offline?",
      answer: "Yes! EcoScan is designed to work completely offline. All AI processing happens locally on your device, so you don't need an internet connection for waste classification. The app downloads all necessary models and data during the initial setup."
    },
    {
      question: "What types of waste can EcoScan identify?",
      answer: "EcoScan can identify 160+ categories of common waste items including plastics, paper, glass, metals, electronics, organic waste, and hazardous materials. It covers most household items you'd typically need to dispose of."
    },
    {
      question: "Is my camera data private and secure?",
      answer: "Absolutely! All image processing happens locally on your device. Your photos never leave your phone or get uploaded to any servers. EcoScan prioritizes your privacy and data security above all else."
    },
    {
      question: "Why is the app slow to load initially?",
      answer: "The first load takes longer because EcoScan downloads the AI model (about 12MB) and waste classification database. This only happens once, and subsequent loads are much faster. The offline capability is worth the initial wait!"
    },
    {
      question: "Can I use voice input if I have an accent?",
      answer: "Yes! EcoScan uses your device's built-in speech recognition, which is designed to work with various accents and languages. If voice recognition isn't working well, try speaking clearly and ensure you're in a quiet environment."
    },
    {
      question: "What if EcoScan incorrectly identifies an item?",
      answer: "While EcoScan is highly accurate, misidentifications can occur. Always use your best judgment and consult local recycling guidelines when in doubt. You can also try different angles or lighting for better detection."
    },
    {
      question: "How do I install EcoScan as an app on my phone?",
      answer: "EcoScan is a Progressive Web App (PWA). On most browsers, you'll see an 'Install' button in the navigation bar. On mobile, look for 'Add to Home Screen' in your browser menu. This gives you a native app-like experience."
    },
    {
      question: "Does EcoScan work on all devices?",
      answer: "EcoScan works on modern smartphones, tablets, and computers with camera access. It requires a browser that supports WebRTC for camera access and WebGL for AI processing. Most devices from the last 5 years are supported."
    },
    {
      question: "How can I improve detection accuracy?",
      answer: "For best results: ensure good lighting, hold items clearly in view, avoid cluttered backgrounds, clean the camera lens, and try different angles if the first attempt doesn't work well."
    }
  ];

  const troubleshooting = [
    {
      issue: "Camera not working",
      solutions: [
        "Check if camera permissions are granted in browser settings",
        "Try refreshing the page or restarting the browser",
        "Ensure no other apps are using the camera",
        "Check if camera is physically blocked or damaged",
        "Try using a different browser or device"
      ]
    },
    {
      issue: "Voice input not responding",
      solutions: [
        "Check microphone permissions in browser settings",
        "Ensure you're in a quiet environment",
        "Speak clearly and at normal volume",
        "Try refreshing the page",
        "Check if microphone is working in other apps"
      ]
    },
    {
      issue: "App loading slowly",
      solutions: [
        "Check your internet connection for initial download",
        "Clear browser cache and reload",
        "Close other tabs to free up memory",
        "Try using a different browser",
        "Ensure device has sufficient storage space"
      ]
    },
    {
      issue: "Detection not working",
      solutions: [
        "Ensure good lighting conditions",
        "Hold item clearly in camera view",
        "Try different angles and distances",
        "Clean camera lens",
        "Check if WebGL is enabled in browser"
      ]
    },
    {
      issue: "App crashes or freezes",
      solutions: [
        "Refresh the page and try again",
        "Clear browser cache and data",
        "Close other apps to free up memory",
        "Restart your device",
        "Try using a different browser"
      ]
    }
  ];
</script>

<svelte:head>
  <title>Help & Support - EcoScan</title>
  <meta name="description" content="Get help with EcoScan - FAQ, troubleshooting, and support resources." />
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Hero Section -->
  <div class="text-center mb-12">
    <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
      <span class="text-2xl">❓</span>
    </div>
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Help & Support</h1>
    <p class="text-xl text-gray-600 max-w-3xl mx-auto">
      Find answers to common questions and troubleshooting guides for EcoScan
    </p>
  </div>

  <!-- Quick Start Guide -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Quick Start Guide</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">📱</span>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Open EcoScan</h3>
        <p class="text-gray-600 text-sm">
          Launch the app in your browser or from your home screen if installed as a PWA
        </p>
      </div>
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">📸</span>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Point & Scan</h3>
        <p class="text-gray-600 text-sm">
          Point your camera at the waste item, upload an image, or describe it with voice
        </p>
      </div>
      <div class="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">♻️</span>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Get Results</h3>
        <p class="text-gray-600 text-sm">
          Receive instant classification and disposal recommendations for your item
        </p>
      </div>
    </div>
  </div>

  <!-- Features Overview -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">How to Use Each Feature</h2>
    <div class="space-y-8">
      <!-- Camera Feature -->
      <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <div class="flex items-start space-x-6">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span class="text-xl">📷</span>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Camera Detection</h3>
            <p class="text-gray-600 mb-4">
              Real-time waste classification using your device's camera. Perfect for quick on-the-go identification.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Best Practices:</h4>
                <ul class="text-gray-600 space-y-1">
                  <li>• Ensure good lighting</li>
                  <li>• Hold item clearly in view</li>
                  <li>• Avoid cluttered backgrounds</li>
                  <li>• Try different angles</li>
                </ul>
              </div>
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Tips:</h4>
                <ul class="text-gray-600 space-y-1">
                  <li>• Clean camera lens</li>
                  <li>• Keep device steady</li>
                  <li>• Use natural light when possible</li>
                  <li>• Focus on single items</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Feature -->
      <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <div class="flex items-start space-x-6">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span class="text-xl">📤</span>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Image Upload</h3>
            <p class="text-gray-600 mb-4">
              Upload existing photos from your device for analysis. Great for items you've already photographed.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Supported Formats:</h4>
                <ul class="text-gray-600 space-y-1">
                  <li>• JPEG (.jpg, .jpeg)</li>
                  <li>• PNG (.png)</li>
                  <li>• WebP (.webp)</li>
                  <li>• Maximum size: 10MB</li>
                </ul>
              </div>
              <div>
                <h4 class="font-medium text-gray-900 mb-2">How to Upload:</h4>
                <ul class="text-gray-600 space-y-1">
                  <li>• Drag & drop files</li>
                  <li>• Click to browse</li>
                  <li>• Paste from clipboard</li>
                  <li>• Multiple images supported</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Voice Feature -->
      <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <div class="flex items-start space-x-6">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span class="text-xl">🎤</span>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Voice Input</h3>
            <p class="text-gray-600 mb-4">
              Describe waste items using voice commands. Ideal for accessibility and hands-free operation.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Voice Commands:</h4>
                <ul class="text-gray-600 space-y-1">
                  <li>• "Plastic water bottle"</li>
                  <li>• "Aluminum can"</li>
                  <li>• "Cardboard box"</li>
                  <li>• "Glass jar"</li>
                </ul>
              </div>
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Tips for Better Recognition:</h4>
                <ul class="text-gray-600 space-y-1">
                  <li>• Speak clearly and slowly</li>
                  <li>• Use quiet environment</li>
                  <li>• Be specific with descriptions</li>
                  <li>• Try rephrasing if not recognized</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- FAQ Section -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
    <div class="space-y-4">
      {#each faqs as faq, index}
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
            on:click={() => toggleFaq(index)}
          >
            <h3 class="text-lg font-semibold text-gray-900 pr-4">{faq.question}</h3>
            <svg 
              class="w-5 h-5 text-gray-500 transform transition-transform {expandedFaq.has(index) ? 'rotate-180' : ''}"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {#if expandedFaq.has(index)}
            <div class="px-6 pb-4">
              <p class="text-gray-600 leading-relaxed">{faq.answer}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Troubleshooting -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Troubleshooting</h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {#each troubleshooting as item}
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900 mb-4">🔧 {item.issue}</h3>
          <ul class="space-y-2">
            {#each item.solutions as solution}
              <li class="text-gray-600 text-sm flex items-start">
                <span class="text-green-500 mr-2 mt-0.5">•</span>
                <span>{solution}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>

  <!-- System Requirements -->
  <div class="mb-16">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">System Requirements</h2>
    <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-xl">📱</span>
          </div>
          <h4 class="font-semibold text-gray-900 mb-2">Mobile Devices</h4>
          <ul class="text-gray-600 text-sm space-y-1">
            <li>iOS 12+ (Safari)</li>
            <li>Android 8+ (Chrome)</li>
            <li>Camera access required</li>
            <li>2GB+ RAM recommended</li>
          </ul>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-xl">💻</span>
          </div>
          <h4 class="font-semibold text-gray-900 mb-2">Desktop</h4>
          <ul class="text-gray-600 text-sm space-y-1">
            <li>Chrome 80+</li>
            <li>Firefox 75+</li>
            <li>Safari 13+</li>
            <li>Edge 80+</li>
          </ul>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-xl">⚡</span>
          </div>
          <h4 class="font-semibold text-gray-900 mb-2">Performance</h4>
          <ul class="text-gray-600 text-sm space-y-1">
            <li>WebGL support</li>
            <li>WebRTC for camera</li>
            <li>15MB storage space</li>
            <li>Stable internet (initial)</li>
          </ul>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-xl">🔒</span>
          </div>
          <h4 class="font-semibold text-gray-900 mb-2">Security</h4>
          <ul class="text-gray-600 text-sm space-y-1">
            <li>HTTPS required</li>
            <li>Camera permissions</li>
            <li>Microphone (optional)</li>
            <li>Local storage access</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Contact Support -->
  <div class="text-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
    <h2 class="text-2xl font-bold mb-4">Still Need Help?</h2>
    <p class="text-blue-100 mb-6 max-w-2xl mx-auto">
      Can't find the answer you're looking for? Our support team is here to help you get the most out of EcoScan.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a 
        href="mailto:support@ecoscan.app" 
        class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        on:click={() => trackEvent('support_contact', { method: 'email' })}
      >
        📧 Email Support
      </a>
      <a 
        href="https://github.com/yourusername/ecoscan/issues" 
        target="_blank"
        rel="noopener noreferrer"
        class="bg-blue-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-300 transition-colors"
        on:click={() => trackEvent('support_contact', { method: 'github' })}
      >
        🐛 Report Issue
      </a>
    </div>
    <p class="text-blue-200 text-sm mt-4">Response time: Usually within 24 hours</p>
  </div>
</div> 