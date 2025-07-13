<!--
  Performance Dashboard Component
  Displays real-time performance metrics, device information, and optimization controls
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    performanceMetrics, 
    currentProfile, 
    performanceScore, 
    performanceTrend, 
    deviceInfo,
    optimizationRecommendations,
    advancedPerformanceOptimizer 
  } from '$lib/utils/advanced-performance-optimizer';

  // Component state
  let activeTab = 'metrics';
  let isMinimized = false;
  let showExportModal = false;
  let chartData: any[] = [];
  let updateInterval: NodeJS.Timeout;

  // Performance data for charts
  let fpsHistory: number[] = [];
  let inferenceHistory: number[] = [];
  let memoryHistory: number[] = [];
  let cpuHistory: number[] = [];

  // Reactive values
  $: score = $performanceScore;
  $: trend = $performanceTrend;
  $: metrics = $performanceMetrics;
  $: profile = $currentProfile;
  $: device = $deviceInfo;
  $: recommendations = $optimizationRecommendations;

  // Color scheme based on performance score
  $: scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  $: trendColor = trend.trend === 'improving' ? '#10b981' : trend.trend === 'degrading' ? '#ef4444' : '#6b7280';

  onMount(() => {
    // Update charts every second
    updateInterval = setInterval(() => {
      updateChartData();
    }, 1000);

    // Listen for profile changes
    const handleProfileChange = (event: CustomEvent) => {
      console.log('Profile changed:', event.detail);
    };

    window.addEventListener('profile-changed', handleProfileChange as EventListener);

    return () => {
      clearInterval(updateInterval);
      window.removeEventListener('profile-changed', handleProfileChange as EventListener);
    };
  });

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  function updateChartData() {
    // Update history arrays (keep last 50 data points)
    fpsHistory = [...fpsHistory.slice(-49), metrics.fps];
    inferenceHistory = [...inferenceHistory.slice(-49), metrics.inferenceTime];
    memoryHistory = [...memoryHistory.slice(-49), metrics.memoryUsage * 100];
    cpuHistory = [...cpuHistory.slice(-49), metrics.cpuUsage * 100];
  }

  function switchProfile(profileName: string) {
    advancedPerformanceOptimizer.switchToProfile(profileName);
  }

  function applyRecommendation(recommendation: any) {
    recommendation.action();
  }

  function exportData() {
    const data = {
      timestamp: new Date().toISOString(),
      currentMetrics: metrics,
      performanceScore: score,
      trend: trend,
      deviceInfo: device,
      fpsHistory,
      inferenceHistory,
      memoryHistory,
      cpuHistory
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecoscan-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showExportModal = false;
  }

  // Chart rendering function (simplified SVG charts)
  function renderChart(data: number[], width: number, height: number, color: string) {
    if (data.length < 2) return '';
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    let path = '';
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      path += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    
    return `<path d="${path}" stroke="${color}" stroke-width="2" fill="none" />`;
  }

  // Format utilities
  function formatNumber(num: number, decimals = 1): string {
    return num.toFixed(decimals);
  }

  function formatPercentage(num: number): string {
    return `${Math.round(num * 100)}%`;
  }

  function formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  function getBatteryIcon(level: number): string {
    if (level > 0.75) return '🔋';
    if (level > 0.5) return '🔋';
    if (level > 0.25) return '🪫';
    return '🪫';
  }

  function getNetworkIcon(speed: number): string {
    if (speed > 10) return '📶';
    if (speed > 5) return '📶';
    if (speed > 1) return '📶';
    return '📶';
  }
</script>

<div class="performance-dashboard" class:minimized={isMinimized}>
  <!-- Header -->
  <div class="dashboard-header">
    <div class="header-left">
      <h3>⚡ Performance Dashboard</h3>
      <div class="score-badge" style="background: {scoreColor}20; color: {scoreColor}; border-color: {scoreColor};">
        Score: {score}/100
      </div>
      <div class="trend-badge" style="color: {trendColor};">
        {trend.trend === 'improving' ? '📈' : trend.trend === 'degrading' ? '📉' : '➡️'}
        {trend.trend}
      </div>
    </div>
    <div class="header-right">
      <button class="btn btn-sm" on:click={() => showExportModal = true}>
        📊 Export
      </button>
      <button class="btn btn-sm" on:click={() => isMinimized = !isMinimized}>
        {isMinimized ? '⬆️' : '⬇️'}
      </button>
    </div>
  </div>

  {#if !isMinimized}
    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" class:active={activeTab === 'metrics'} on:click={() => activeTab = 'metrics'}>
        📊 Metrics
      </button>
      <button class="tab" class:active={activeTab === 'profiles'} on:click={() => activeTab = 'profiles'}>
        ⚙️ Profiles
      </button>
      <button class="tab" class:active={activeTab === 'recommendations'} on:click={() => activeTab = 'recommendations'}>
        💡 Recommendations
      </button>
      <button class="tab" class:active={activeTab === 'device'} on:click={() => activeTab = 'device'}>
        📱 Device
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      {#if activeTab === 'metrics'}
        <div class="metrics-tab">
          <!-- Performance Score Circle -->
          <div class="score-circle">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" stroke-width="8"/>
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                fill="none" 
                stroke="{scoreColor}" 
                stroke-width="8"
                stroke-dasharray="314.16"
                stroke-dashoffset="{314.16 - (score / 100) * 314.16}"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="65" text-anchor="middle" class="score-text">{score}</text>
            </svg>
          </div>

          <!-- Real-time Metrics -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-icon">🎯</span>
                <span class="metric-title">FPS</span>
              </div>
              <div class="metric-value">{formatNumber(metrics.fps)}</div>
              <div class="metric-chart">
                <svg width="200" height="40" viewBox="0 0 200 40">
                  {@html renderChart(fpsHistory, 200, 40, '#10b981')}
                </svg>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-icon">⚡</span>
                <span class="metric-title">Inference Time</span>
              </div>
              <div class="metric-value">{formatNumber(metrics.inferenceTime)}ms</div>
              <div class="metric-chart">
                <svg width="200" height="40" viewBox="0 0 200 40">
                  {@html renderChart(inferenceHistory, 200, 40, '#3b82f6')}
                </svg>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-icon">🧠</span>
                <span class="metric-title">Memory Usage</span>
              </div>
              <div class="metric-value">{formatPercentage(metrics.memoryUsage)}</div>
              <div class="metric-chart">
                <svg width="200" height="40" viewBox="0 0 200 40">
                  {@html renderChart(memoryHistory, 200, 40, '#f59e0b')}
                </svg>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-icon">💻</span>
                <span class="metric-title">CPU Usage</span>
              </div>
              <div class="metric-value">{formatPercentage(metrics.cpuUsage)}</div>
              <div class="metric-chart">
                <svg width="200" height="40" viewBox="0 0 200 40">
                  {@html renderChart(cpuHistory, 200, 40, '#ef4444')}
                </svg>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'profiles'}
        <div class="profiles-tab">
          <div class="current-profile">
            <h4>Current Profile: {profile.name}</h4>
            <div class="profile-details">
              <div class="detail">Resolution: {profile.maxResolution}p</div>
              <div class="detail">Max FPS: {profile.maxFPS}</div>
              <div class="detail">Confidence: {profile.confidenceThreshold}</div>
              <div class="detail">GPU: {profile.enableGPUAcceleration ? 'Enabled' : 'Disabled'}</div>
              <div class="detail">Quality: {profile.qualityLevel}</div>
            </div>
          </div>

          <div class="profile-options">
            <h4>Available Profiles</h4>
            <div class="profile-grid">
              {#each advancedPerformanceOptimizer.getAllProfiles() as profileOption}
                <div class="profile-card" class:active={profileOption.name === profile.name}>
                  <div class="profile-name">{profileOption.name}</div>
                  <div class="profile-specs">
                    <div>🎯 {profileOption.maxFPS} FPS</div>
                    <div>📺 {profileOption.maxResolution}p</div>
                    <div>🎚️ {profileOption.confidenceThreshold} threshold</div>
                    <div>⚡ {profileOption.enableGPUAcceleration ? 'GPU' : 'CPU'}</div>
                  </div>
                  <button 
                    class="btn btn-sm" 
                    disabled={profileOption.name === profile.name}
                    on:click={() => switchProfile(profileOption.name.toLowerCase().replace(/\s+/g, '-'))}
                  >
                    {profileOption.name === profile.name ? 'Active' : 'Switch'}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'recommendations'}
        <div class="recommendations-tab">
          {#if recommendations.length > 0}
            <h4>Optimization Recommendations</h4>
            <div class="recommendations-list">
              {#each recommendations as recommendation}
                <div class="recommendation-card" class:critical={recommendation.priority === 'critical'}>
                  <div class="recommendation-header">
                    <span class="recommendation-icon">
                      {#if recommendation.type === 'performance'}🚀
                      {:else if recommendation.type === 'battery'}🔋
                      {:else if recommendation.type === 'memory'}🧠
                      {:else if recommendation.type === 'quality'}✨
                      {:else}💡{/if}
                    </span>
                    <span class="recommendation-title">{recommendation.title}</span>
                    <span class="priority-badge priority-{recommendation.priority}">{recommendation.priority}</span>
                  </div>
                  <div class="recommendation-description">{recommendation.description}</div>
                  <div class="recommendation-footer">
                    <div class="improvement-estimate">
                      📈 +{formatPercentage(recommendation.estimatedImprovement)} improvement
                    </div>
                    <button class="btn btn-sm" on:click={() => applyRecommendation(recommendation)}>
                      Apply
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-recommendations">
              <div class="no-recommendations-icon">✅</div>
              <h4>All Good!</h4>
              <p>No optimization recommendations at the moment. Your system is running smoothly.</p>
            </div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'device'}
        <div class="device-tab">
          <div class="device-info">
            <h4>Device Information</h4>
            <div class="device-grid">
              <div class="device-card">
                <div class="device-icon">📱</div>
                <div class="device-label">Device Tier</div>
                <div class="device-value">{device.tier}</div>
              </div>
              
              <div class="device-card">
                <div class="device-icon">{getBatteryIcon(device.batteryLevel)}</div>
                <div class="device-label">Battery</div>
                <div class="device-value">{formatPercentage(device.batteryLevel)}</div>
              </div>
              
              <div class="device-card">
                <div class="device-icon">{getNetworkIcon(device.networkSpeed)}</div>
                <div class="device-label">Network</div>
                <div class="device-value">{formatNumber(device.networkSpeed)} Mbps</div>
              </div>
              
              <div class="device-card">
                <div class="device-icon">💾</div>
                <div class="device-label">Memory</div>
                <div class="device-value">{formatPercentage(device.memoryUsage)}</div>
              </div>
              
              <div class="device-card">
                <div class="device-icon">⚙️</div>
                <div class="device-label">CPU</div>
                <div class="device-value">{formatPercentage(device.cpuUsage)}</div>
              </div>
            </div>
          </div>

          <div class="system-info">
            <h4>System Capabilities</h4>
            <div class="capabilities-list">
              <div class="capability">
                <span class="capability-icon">🎮</span>
                <span class="capability-label">WebGL Support</span>
                <span class="capability-status supported">✅ Supported</span>
              </div>
              <div class="capability">
                <span class="capability-icon">🎤</span>
                <span class="capability-label">Speech Recognition</span>
                <span class="capability-status supported">✅ Supported</span>
              </div>
              <div class="capability">
                <span class="capability-icon">📷</span>
                <span class="capability-label">Camera Access</span>
                <span class="capability-status supported">✅ Supported</span>
              </div>
              <div class="capability">
                <span class="capability-icon">🔧</span>
                <span class="capability-label">Web Workers</span>
                <span class="capability-status supported">✅ Supported</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Export Modal -->
{#if showExportModal}
  <div class="modal-overlay" on:click={() => showExportModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>📊 Export Performance Data</h3>
        <button class="btn btn-sm" on:click={() => showExportModal = false}>✕</button>
      </div>
      <div class="modal-content">
        <p>Export current performance metrics and history as JSON file.</p>
        <div class="export-info">
          <div>📊 Current Score: {score}/100</div>
          <div>📈 Trend: {trend.trend}</div>
          <div>⚙️ Profile: {profile.name}</div>
          <div>📱 Device: {device.tier}-tier</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showExportModal = false}>
          Cancel
        </button>
        <button class="btn btn-primary" on:click={exportData}>
          📥 Export Data
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .performance-dashboard {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: all 0.3s ease;
  }

  .performance-dashboard.minimized {
    width: 300px;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-left h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .score-badge, .trend-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid;
  }

  .header-right {
    display: flex;
    gap: 8px;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .tab {
    flex: 1;
    padding: 12px 16px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    transition: all 0.2s;
  }

  .tab.active {
    color: #1f2937;
    background: white;
    border-bottom: 2px solid #3b82f6;
  }

  .tab-content {
    padding: 20px;
    max-height: 500px;
    overflow-y: auto;
  }

  .metrics-tab {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .score-circle {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  .score-text {
    font-size: 24px;
    font-weight: 600;
    fill: #1f2937;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .metric-card {
    background: #f9fafb;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #e5e7eb;
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .metric-icon {
    font-size: 16px;
  }

  .metric-title {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
  }

  .metric-value {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 12px;
  }

  .metric-chart {
    width: 100%;
    height: 40px;
  }

  .profiles-tab {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .current-profile {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    padding: 16px;
  }

  .current-profile h4 {
    margin: 0 0 12px 0;
    color: #0369a1;
  }

  .profile-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 14px;
  }

  .detail {
    color: #374151;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .profile-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s;
  }

  .profile-card.active {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .profile-name {
    font-weight: 600;
    margin-bottom: 8px;
  }

  .profile-specs {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 12px;
  }

  .profile-specs div {
    margin-bottom: 4px;
  }

  .recommendations-tab {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .recommendation-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
  }

  .recommendation-card.critical {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .recommendation-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .recommendation-title {
    font-weight: 600;
    flex: 1;
  }

  .priority-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .priority-high {
    background: #fef2f2;
    color: #ef4444;
  }

  .priority-medium {
    background: #fef3c7;
    color: #f59e0b;
  }

  .priority-low {
    background: #f0f9ff;
    color: #0ea5e9;
  }

  .priority-critical {
    background: #450a0a;
    color: #fef2f2;
  }

  .recommendation-description {
    color: #6b7280;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .recommendation-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .improvement-estimate {
    font-size: 12px;
    color: #10b981;
    font-weight: 500;
  }

  .no-recommendations {
    text-align: center;
    color: #6b7280;
    padding: 40px 20px;
  }

  .no-recommendations-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .device-tab {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .device-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .device-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .device-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .device-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .device-value {
    font-weight: 600;
    color: #1f2937;
  }

  .capabilities-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .capability {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .capability-icon {
    font-size: 18px;
  }

  .capability-label {
    flex: 1;
    font-weight: 500;
  }

  .capability-status {
    font-size: 12px;
    font-weight: 500;
  }

  .capability-status.supported {
    color: #10b981;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
  }

  .modal-content {
    padding: 20px;
  }

  .export-info {
    background: #f9fafb;
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
  }

  .export-info div {
    margin-bottom: 8px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-sm {
    padding: 4px 8px;
    font-size: 12px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .performance-dashboard {
      width: 350px;
      right: 10px;
      top: 10px;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .profile-grid {
      grid-template-columns: 1fr;
    }

    .device-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 