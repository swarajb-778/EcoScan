<script lang="ts">
  import { onMount } from 'svelte';
  import { diagnostic, type DiagnosticReport } from '$lib/utils/diagnostic.js';
  import { browser } from '$app/environment';
  
  export let showPanel = false;
  
  let diagnosticReport: DiagnosticReport | null = null;
  let isGenerating = false;
  
  async function generateReport() {
    if (!browser) return;
    
    isGenerating = true;
    try {
      diagnosticReport = await diagnostic.generateReport();
    } catch (error) {
      console.error('Failed to generate diagnostic report:', error);
    } finally {
      isGenerating = false;
    }
  }
  
  function downloadReport() {
    if (!diagnosticReport) return;
    
    const dataStr = JSON.stringify(diagnosticReport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecoscan-diagnostic-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
  
  function copyReport() {
    if (!diagnosticReport) return;
    
    const reportText = JSON.stringify(diagnosticReport, null, 2);
    navigator.clipboard.writeText(reportText).then(() => {
      alert('Diagnostic report copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy report:', err);
    });
  }
  
  onMount(() => {
    if (showPanel) {
      generateReport();
    }
  });
  
  $: if (showPanel && browser) {
    generateReport();
  }
</script>

{#if showPanel}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-xl">🔧</span>
          <h2 class="text-xl font-bold">System Diagnostic</h2>
        </div>
        <button 
          on:click={() => showPanel = false}
          class="text-white hover:text-gray-200 text-xl"
        >
          ✕
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
        {#if isGenerating}
          <div class="text-center py-8">
            <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-gray-600">Generating diagnostic report...</p>
          </div>
        {:else if diagnosticReport}
          <!-- Action Buttons -->
          <div class="flex space-x-4 mb-6">
            <button 
              on:click={generateReport}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Refresh Report
            </button>
            <button 
              on:click={downloadReport}
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              💾 Download JSON
            </button>
            <button 
              on:click={copyReport}
              class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              📋 Copy to Clipboard
            </button>
          </div>
          
          <!-- Errors and Warnings -->
          {#if diagnosticReport.errors.length > 0 || diagnosticReport.warnings.length > 0}
            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-3 flex items-center">
                ⚠️ Issues Detected
              </h3>
              
              {#if diagnosticReport.errors.length > 0}
                <div class="mb-4">
                  <h4 class="font-medium text-red-700 mb-2">Errors ({diagnosticReport.errors.length})</h4>
                  <div class="space-y-2">
                    {#each diagnosticReport.errors as error}
                      <div class="bg-red-50 border border-red-200 rounded p-3 text-sm">
                        <code class="text-red-800">{error}</code>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if diagnosticReport.warnings.length > 0}
                <div class="mb-4">
                  <h4 class="font-medium text-yellow-700 mb-2">Warnings ({diagnosticReport.warnings.length})</h4>
                  <div class="space-y-2">
                    {#each diagnosticReport.warnings as warning}
                      <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                        <code class="text-yellow-800">{warning}</code>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- System Information -->
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Browser Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-semibold mb-3 flex items-center">
                🌐 Browser Information
              </h3>
              <div class="space-y-2 text-sm">
                <div><strong>Name:</strong> {diagnosticReport.browser.name}</div>
                <div><strong>Version:</strong> {diagnosticReport.browser.version}</div>
                <div><strong>Platform:</strong> {diagnosticReport.browser.platform}</div>
                <div><strong>User Agent:</strong> 
                  <code class="text-xs break-all">{diagnosticReport.browser.userAgent}</code>
                </div>
              </div>
            </div>
            
            <!-- Device Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-semibold mb-3 flex items-center">
                📱 Device Information
              </h3>
              <div class="space-y-2 text-sm">
                <div><strong>Memory:</strong> {diagnosticReport.device.memory}GB</div>
                <div><strong>CPU Cores:</strong> {diagnosticReport.device.cores}</div>
                <div><strong>Touch Points:</strong> {diagnosticReport.device.touchPoints}</div>
                <div><strong>Pixel Ratio:</strong> {diagnosticReport.device.pixelRatio}</div>
              </div>
            </div>
            
            <!-- Feature Support -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-semibold mb-3 flex items-center">
                ✨ Feature Support
              </h3>
              <div class="space-y-2 text-sm">
                {#each Object.entries(diagnosticReport.features) as [feature, supported]}
                  <div class="flex items-center justify-between">
                    <span class="capitalize">{feature}:</span>
                    <span class="px-2 py-1 rounded text-xs {supported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      {supported ? '✅ Supported' : '❌ Not Supported'}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
            
            <!-- Network Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-semibold mb-3 flex items-center">
                🌍 Network Information
              </h3>
              <div class="space-y-2 text-sm">
                <div><strong>Online:</strong> 
                  <span class="px-2 py-1 rounded text-xs {diagnosticReport.network.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {diagnosticReport.network.online ? '✅ Connected' : '❌ Offline'}
                  </span>
                </div>
                <div><strong>Connection:</strong> {diagnosticReport.network.connection}</div>
                <div><strong>Effective Type:</strong> {diagnosticReport.network.effectiveType}</div>
              </div>
            </div>
            
            <!-- Performance -->
            <div class="bg-gray-50 rounded-lg p-4 md:col-span-2">
              <h3 class="font-semibold mb-3 flex items-center">
                ⚡ Performance Metrics
              </h3>
              <div class="grid md:grid-cols-2 gap-4 text-sm">
                <div><strong>Load Time:</strong> {diagnosticReport.performance.loadTime}ms</div>
                <div><strong>Memory Usage:</strong> {diagnosticReport.performance.memoryUsage.toFixed(2)}MB</div>
              </div>
            </div>
          </div>
          
          <!-- Raw Data -->
          <div class="mt-6">
            <details class="bg-gray-50 rounded-lg">
              <summary class="p-4 cursor-pointer font-semibold">
                📄 Raw Diagnostic Data
              </summary>
              <div class="p-4 border-t">
                <pre class="text-xs overflow-x-auto bg-white p-4 rounded border">
{JSON.stringify(diagnosticReport, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        {:else}
          <div class="text-center py-8">
            <p class="text-gray-600 mb-4">No diagnostic data available</p>
            <button 
              on:click={generateReport}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  details[open] summary {
    border-bottom: 1px solid #e5e7eb;
  }
</style> 