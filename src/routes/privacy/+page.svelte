<script lang="ts">
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/utils/analytics';

  onMount(() => {
    trackEvent('page_view', { page: 'privacy' });
  });
</script>

<svelte:head>
  <title>Privacy Policy - EcoScan</title>
  <meta name="description" content="EcoScan privacy policy - Learn how we protect your data and privacy." />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
    <p class="text-lg text-gray-600">
      Your privacy is our priority. Learn how EcoScan protects your data.
    </p>
    <p class="text-sm text-gray-500 mt-2">Last updated: December 2024</p>
  </div>

  <div class="prose prose-lg max-w-none">
    <!-- Overview -->
    <div class="bg-green-50 rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">🔒 Privacy-First Approach</h2>
      <p class="text-gray-700 leading-relaxed">
        EcoScan is designed with privacy at its core. All AI processing happens locally on your device, 
        meaning your images and personal data never leave your phone. We believe in complete transparency 
        about what data we collect and how it's used.
      </p>
    </div>

    <!-- Data Collection -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">What Data We Collect</h2>
      
      <div class="space-y-6">
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-3">📸 Images and Camera Data</h3>
          <ul class="text-gray-600 space-y-2">
            <li>• <strong>Processing:</strong> All images are processed locally on your device</li>
            <li>• <strong>Storage:</strong> Images are not stored permanently unless you explicitly save them</li>
            <li>• <strong>Transmission:</strong> No images are sent to external servers</li>
            <li>• <strong>Access:</strong> Camera access is only used when you actively use the detection feature</li>
          </ul>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-3">🎤 Voice Data</h3>
          <ul class="text-gray-600 space-y-2">
            <li>• <strong>Processing:</strong> Voice recognition happens locally using Web Speech API</li>
            <li>• <strong>Storage:</strong> Voice data is not recorded or stored</li>
            <li>• <strong>Transmission:</strong> No audio data leaves your device</li>
            <li>• <strong>Access:</strong> Microphone access only when voice feature is actively used</li>
          </ul>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-3">📊 Anonymous Analytics</h3>
          <ul class="text-gray-600 space-y-2">
            <li>• <strong>Performance metrics:</strong> App load times, detection accuracy, error rates</li>
            <li>• <strong>Usage statistics:</strong> Feature usage frequency, session duration</li>
            <li>• <strong>Device information:</strong> Browser type, screen size, device capabilities</li>
            <li>• <strong>No personal data:</strong> No names, emails, or personally identifiable information</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Data Usage -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">How We Use Your Data</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-blue-50 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">✅ What We Do</h3>
          <ul class="text-gray-600 space-y-2 text-sm">
            <li>• Process images locally for waste classification</li>
            <li>• Collect anonymous performance metrics</li>
            <li>• Store user preferences locally on your device</li>
            <li>• Improve app performance and accuracy</li>
            <li>• Provide offline functionality</li>
          </ul>
        </div>

        <div class="bg-red-50 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">❌ What We Don't Do</h3>
          <ul class="text-gray-600 space-y-2 text-sm">
            <li>• Upload your images to servers</li>
            <li>• Store personal information</li>
            <li>• Track your location</li>
            <li>• Share data with third parties</li>
            <li>• Use data for advertising</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Local Storage -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Local Data Storage</h2>
      
      <div class="bg-white border border-gray-200 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">📱 What's Stored on Your Device</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-medium text-gray-900 mb-2">Application Data</h4>
            <ul class="text-gray-600 text-sm space-y-1">
              <li>• ML model files (ONNX format)</li>
              <li>• Waste classification database</li>
              <li>• App preferences and settings</li>
              <li>• Cached UI components</li>
            </ul>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 mb-2">User Data</h4>
            <ul class="text-gray-600 text-sm space-y-1">
              <li>• Anonymous session identifiers</li>
              <li>• Performance metrics (optional)</li>
              <li>• Feature usage statistics</li>
              <li>• Error logs (no personal data)</li>
            </ul>
          </div>
        </div>
        
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">
            <strong>Note:</strong> All locally stored data can be cleared by clearing your browser data 
            or uninstalling the app. No data recovery is possible as we don't maintain backups.
          </p>
        </div>
      </div>
    </section>

    <!-- Third-Party Services -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Third-Party Services</h2>
      
      <div class="space-y-4">
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">🌐 Content Delivery Network (CDN)</h3>
          <p class="text-gray-600 text-sm mb-2">
            We use CDNs to deliver the app and ML models efficiently. No personal data is shared.
          </p>
          <ul class="text-gray-600 text-sm space-y-1">
            <li>• Static asset delivery only</li>
            <li>• No user tracking</li>
            <li>• Standard web protocols</li>
          </ul>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">📊 Analytics (Optional)</h3>
          <p class="text-gray-600 text-sm mb-2">
            Anonymous usage analytics help us improve the app. You can opt out at any time.
          </p>
          <ul class="text-gray-600 text-sm space-y-1">
            <li>• No personally identifiable information</li>
            <li>• Aggregated metrics only</li>
            <li>• Easy opt-out available</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Your Rights -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Your Rights and Controls</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">🎛️ Data Control</h3>
          <ul class="text-gray-600 text-sm space-y-2">
            <li>• <strong>Access:</strong> View all locally stored data</li>
            <li>• <strong>Delete:</strong> Clear all app data anytime</li>
            <li>• <strong>Export:</strong> Download your analytics data</li>
            <li>• <strong>Opt-out:</strong> Disable analytics collection</li>
          </ul>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">🔧 Privacy Settings</h3>
          <ul class="text-gray-600 text-sm space-y-2">
            <li>• <strong>Camera:</strong> Grant/revoke access anytime</li>
            <li>• <strong>Microphone:</strong> Control voice feature access</li>
            <li>• <strong>Analytics:</strong> Enable/disable usage tracking</li>
            <li>• <strong>Storage:</strong> Manage local data storage</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Security -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Security Measures</h2>
      
      <div class="bg-white border border-gray-200 rounded-xl p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="text-xl">🔒</span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">Local Processing</h4>
            <p class="text-gray-600 text-sm">All sensitive data processing happens on your device</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="text-xl">🛡️</span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">HTTPS Encryption</h4>
            <p class="text-gray-600 text-sm">All data transmission uses secure protocols</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="text-xl">🔐</span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-2">No Data Collection</h4>
            <p class="text-gray-600 text-sm">The best security is not collecting sensitive data</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Updates -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Policy Updates</h2>
      
      <div class="bg-yellow-50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">📋 Changes to This Policy</h3>
        <p class="text-gray-600 text-sm mb-4">
          We may update this privacy policy to reflect changes in our practices or for legal reasons. 
          When we make changes:
        </p>
        <ul class="text-gray-600 text-sm space-y-2">
          <li>• We'll update the "Last updated" date at the top of this page</li>
          <li>• Significant changes will be highlighted in the app</li>
          <li>• You'll be notified of major changes affecting your privacy</li>
          <li>• Continued use of the app constitutes acceptance of changes</li>
        </ul>
      </div>
    </section>

    <!-- Contact -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
      
      <div class="bg-white border border-gray-200 rounded-xl p-6">
        <p class="text-gray-600 mb-4">
          If you have questions about this privacy policy or our data practices, please contact us:
        </p>
        <div class="space-y-2 text-sm">
          <p><strong>Email:</strong> privacy@ecoscan.app</p>
          <p><strong>GitHub:</strong> <a href="https://github.com/yourusername/ecoscan/issues" class="text-green-600 hover:text-green-700">Report an issue</a></p>
          <p><strong>Response time:</strong> We aim to respond within 48 hours</p>
        </div>
      </div>
    </section>

    <!-- Summary -->
    <div class="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white text-center">
      <h2 class="text-2xl font-bold mb-4">Privacy Summary</h2>
      <p class="text-green-100 mb-6 max-w-2xl mx-auto">
        EcoScan processes all your data locally, collects only anonymous analytics, 
        and puts you in complete control of your privacy.
      </p>
      <a 
        href="/" 
        class="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
        on:click={() => trackEvent('privacy_cta_click', { destination: 'home' })}
      >
        Start Using EcoScan
      </a>
    </div>
  </div>
</div> 