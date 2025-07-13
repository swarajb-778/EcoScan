<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    performanceOptimizer, 
    type PerformanceMetrics, 
    type OptimizationProfile,
    type PerformanceReport
  } from '$lib/utils/advanced-performance-optimizer';

  // Reactive stores
  let currentMetrics: PerformanceMetrics | null = null;
  let activeProfile: OptimizationProfile;
  let performanceReport: PerformanceReport | null = null;
  let metricsHistory: PerformanceMetrics[] = [];
  
  // Component state
  let isExpanded = false;
  let showAdvancedMetrics = false;
  let autoOptimizeEnabled = true;
  let selectedTab: 'metrics' | 'profile' | 'report' = 'metrics';
  
  // Chart data
  let fpsData: number[] = [];
  let inferenceData: number[] = [];
  let memoryData: number[] = [];
  
  // Unsubscribe functions
  let unsubscribeFunctions: (() => void)[] = [];

  onMount(() => {
    // Subscribe to performance stores
    const unsubscribeMetrics = performanceOptimizer.currentMetrics.subscribe(metrics => {
      currentMetrics = metrics;
      if (metrics) {
        updateChartData(metrics);
      }
    });
    
    const unsubscribeProfile = performanceOptimizer.activeProfile.subscribe(profile => {
      activeProfile = profile;
    });
    
    const unsubscribeReport = performanceOptimizer.performanceReport.subscribe(report => {
      performanceReport = report;
    });
    
    unsubscribeFunctions.push(unsubscribeMetrics, unsubscribeProfile, unsubscribeReport);
    
    // Start performance monitoring
    performanceOptimizer.startMonitoring();
    
    // Get initial metrics history
    metricsHistory = performanceOptimizer.getMetricsHistory();
  });

  onDestroy(() => {
    unsubscribeFunctions.forEach(fn => fn());
    performanceOptimizer.stopMonitoring();
  });

  function updateChartData(metrics: PerformanceMetrics) {
    fpsData = [...fpsData, metrics.fps].slice(-20);
    inferenceData = [...inferenceData, metrics.inferenceTime].slice(-20);
    memoryData = [...memoryData, metrics.memoryUsage].slice(-20);
  }

  function handleProfileChange(profileId: string) {
    performanceOptimizer.setOptimizationProfile(profileId);
  }

  function getPerformanceColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getStatusColor(value: number, threshold: number, inverted = false): string {
    const isGood = inverted ? value > threshold : value < threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
  }

  function formatNumber(value: number, decimals = 1): string {
    return value.toFixed(decimals);
  }

  function getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      default: return '📊';
    }
  }

  function exportPerformanceData() {
    const data = performanceOptimizer.exportPerformanceData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecoscan-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getBatteryIcon(level?: number): string {
    if (!level) return '🔋';
    if (level > 0.75) return '🔋';
    if (level > 0.5) return '🔋';
    if (level > 0.25) return '🪫';
    return '🪫';
  }

  function getNetworkIcon(speed: string): string {
    switch (speed) {
      case 'fast': return '📶';
      case 'slow': return '📶';
      default: return '📶';
    }
  }

  function getDeviceTierIcon(tier: string): string {
    switch (tier) {
      case 'high': return '🚀';
      case 'mid': return '⚡';
      case 'low': return '🐌';
      default: return '⚡';
    }
  }
</script>

<div class="performance-dashboard">
  <!-- Dashboard Header -->
  <div class="dashboard-header">
    <button 
      class="dashboard-toggle"
      on:click={() => isExpanded = !isExpanded}
      aria-expanded={isExpanded}
    >
      <span class="dashboard-icon">⚡</span>
      <span class="dashboard-title">Performance</span>
      <span class="dashboard-arrow" class:expanded={isExpanded}>▼</span>
    </button>
    
    {#if currentMetrics}
      <div class="quick-metrics">
        <span class="metric-item">
          <span class="metric-label">FPS:</span>
          <span class="metric-value" class:good={currentMetrics.fps >= 15}>
            {formatNumber(currentMetrics.fps, 0)}
          </span>
        </span>
        <span class="metric-item">
          <span class="metric-label">Inference:</span>
          <span class="metric-value" class:good={currentMetrics.inferenceTime <= 100}>
            {formatNumber(currentMetrics.inferenceTime, 0)}ms
          </span>
        </span>
        <span class="metric-item">
          <span class="metric-label">Memory:</span>
          <span class="metric-value" class:good={currentMetrics.memoryUsage <= 200}>
            {formatNumber(currentMetrics.memoryUsage, 0)}MB
          </span>
        </span>
      </div>
    {/if}
  </div>

  <!-- Expanded Dashboard -->
  {#if isExpanded}
    <div class="dashboard-content">
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          class="tab-button" 
          class:active={selectedTab === 'metrics'}
          on:click={() => selectedTab = 'metrics'}
        >
          📊 Metrics
        </button>
        <button 
          class="tab-button" 
          class:active={selectedTab === 'profile'}
          on:click={() => selectedTab = 'profile'}
        >
          ⚙️ Profile
        </button>
        <button 
          class="tab-button" 
          class:active={selectedTab === 'report'}
          on:click={() => selectedTab = 'report'}
        >
          📈 Report
        </button>
      </div>

      <!-- Metrics Tab -->
      {#if selectedTab === 'metrics'}
        <div class="metrics-tab">
          {#if currentMetrics}
            <div class="metrics-grid">
              <!-- Core Metrics -->
              <div class="metric-card">
                <div class="metric-header">
                  <span class="metric-icon">🎯</span>
                  <h3>Frame Rate</h3>
                </div>
                <div class="metric-value-large {getStatusColor(currentMetrics.fps, 15, true)}">
                  {formatNumber(currentMetrics.fps, 1)} FPS
                </div>
                <div class="metric-target">Target: {activeProfile.targetFPS} FPS</div>
              </div>

              <div class="metric-card">
                <div class="metric-header">
                  <span class="metric-icon">⚡</span>
                  <h3>Inference Time</h3>
                </div>
                <div class="metric-value-large {getStatusColor(currentMetrics.inferenceTime, 100)}">
                  {formatNumber(currentMetrics.inferenceTime, 0)}ms
                </div>
                <div class="metric-target">Target: {activeProfile.maxInferenceTime}ms</div>
              </div>

              <div class="metric-card">
                <div class="metric-header">
                  <span class="metric-icon">🧠</span>
                  <h3>Memory Usage</h3>
                </div>
                <div class="metric-value-large {getStatusColor(currentMetrics.memoryUsage, 200)}">
                  {formatNumber(currentMetrics.memoryUsage, 0)}MB
                </div>
                <div class="metric-target">Target: &lt;200MB</div>
              </div>

              <!-- System Info -->
              <div class="metric-card">
                <div class="metric-header">
                  <span class="metric-icon">📱</span>
                  <h3>Device Info</h3>
                </div>
                <div class="device-info">
                  <div class="device-item">
                    <span>{getDeviceTierIcon(currentMetrics.deviceTier)}</span>
                    <span>Tier: {currentMetrics.deviceTier}</span>
                  </div>
                  <div class="device-item">
                    <span>{getNetworkIcon(currentMetrics.networkSpeed)}</span>
                    <span>Network: {currentMetrics.networkSpeed}</span>
                  </div>
                  {#if currentMetrics.batteryLevel}
                    <div class="device-item">
                      <span>{getBatteryIcon(currentMetrics.batteryLevel)}</span>
                      <span>Battery: {Math.round(currentMetrics.batteryLevel * 100)}%</span>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Performance Charts -->
            {#if showAdvancedMetrics}
              <div class="charts-section">
                <h3>Performance Trends</h3>
                <div class="charts-grid">
                  <div class="chart-card">
                    <h4>FPS History</h4>
                    <div class="chart-placeholder">
                      <div class="chart-line">
                        {#each fpsData as fps, i}
                          <div class="chart-point" style="height: {Math.min(fps * 2, 60)}px"></div>
                        {/each}
                      </div>
                    </div>
                  </div>

                  <div class="chart-card">
                    <h4>Inference Time History</h4>
                    <div class="chart-placeholder">
                      <div class="chart-line">
                        {#each inferenceData as inference, i}
                          <div class="chart-point" style="height: {Math.min(inference / 2, 60)}px"></div>
                        {/each}
                      </div>
                    </div>
                  </div>

                  <div class="chart-card">
                    <h4>Memory Usage History</h4>
                    <div class="chart-placeholder">
                      <div class="chart-line">
                        {#each memoryData as memory, i}
                          <div class="chart-point" style="height: {Math.min(memory / 3, 60)}px"></div>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Advanced Metrics Toggle -->
            <div class="advanced-toggle">
              <button 
                class="toggle-button"
                on:click={() => showAdvancedMetrics = !showAdvancedMetrics}
              >
                {showAdvancedMetrics ? '📊 Hide Charts' : '📈 Show Charts'}
              </button>
            </div>
          {:else}
            <div class="loading-state">
              <span class="loading-icon">⏱️</span>
              <span>Collecting performance metrics...</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Profile Tab -->
      {#if selectedTab === 'profile'}
        <div class="profile-tab">
          <h3>Optimization Profile</h3>
          <div class="profile-grid">
            {#each performanceOptimizer.getOptimizationProfiles() as profile}
              <div class="profile-card" class:active={activeProfile.id === profile.id}>
                <div class="profile-header">
                  <input 
                    type="radio" 
                    name="profile" 
                    value={profile.id}
                    checked={activeProfile.id === profile.id}
                    on:change={() => handleProfileChange(profile.id)}
                  />
                  <h4>{profile.name}</h4>
                </div>
                <div class="profile-specs">
                  <div class="spec-item">
                    <span class="spec-label">Target FPS:</span>
                    <span class="spec-value">{profile.targetFPS}</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Max Inference:</span>
                    <span class="spec-value">{profile.maxInferenceTime}ms</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Confidence:</span>
                    <span class="spec-value">{profile.confidenceThreshold}</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Max Detections:</span>
                    <span class="spec-value">{profile.maxDetections}</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">WebGL:</span>
                    <span class="spec-value">{profile.useWebGL ? '✓' : '✗'}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Report Tab -->
      {#if selectedTab === 'report'}
        <div class="report-tab">
          {#if performanceReport}
            <div class="report-summary">
              <h3>Performance Report</h3>
              <div class="overall-score">
                <span class="score-label">Overall Score:</span>
                <span class="score-value {getPerformanceColor(performanceReport.overallScore)}">
                  {formatNumber(performanceReport.overallScore, 0)}/100
                </span>
                <span class="trend-indicator">
                  {getTrendIcon(performanceReport.trend)} {performanceReport.trend}
                </span>
              </div>
            </div>

            {#if performanceReport.bottlenecks.length > 0}
              <div class="bottlenecks-section">
                <h4>🚨 Bottlenecks</h4>
                <ul class="bottlenecks-list">
                  {#each performanceReport.bottlenecks as bottleneck}
                    <li class="bottleneck-item">{bottleneck}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if performanceReport.recommendations.length > 0}
              <div class="recommendations-section">
                <h4>💡 Recommendations</h4>
                <ul class="recommendations-list">
                  {#each performanceReport.recommendations as recommendation}
                    <li class="recommendation-item">{recommendation}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            <div class="optimization-impact">
              <h4>🎯 Optimization Impact</h4>
              <div class="impact-grid">
                {#each Object.entries(performanceReport.optimizationImpact) as [key, value]}
                  <div class="impact-item">
                    <span class="impact-label">{key.replace('-', ' ')}</span>
                    <span class="impact-value">+{formatNumber(value, 0)}%</span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="loading-state">
              <span class="loading-icon">📊</span>
              <span>Generating performance report...</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Dashboard Actions -->
      <div class="dashboard-actions">
        <button class="action-button" on:click={exportPerformanceData}>
          💾 Export Data
        </button>
        <button class="action-button" on:click={() => location.reload()}>
          🔄 Reset
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .performance-dashboard {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    min-width: 300px;
    max-width: 800px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .dashboard-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .dashboard-icon {
    font-size: 18px;
  }

  .dashboard-arrow {
    transition: transform 0.2s ease;
  }

  .dashboard-arrow.expanded {
    transform: rotate(180deg);
  }

  .quick-metrics {
    display: flex;
    gap: 16px;
    font-size: 12px;
  }

  .metric-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .metric-label {
    color: #6b7280;
  }

  .metric-value {
    font-weight: 600;
    color: #ef4444;
  }

  .metric-value.good {
    color: #10b981;
  }

  .dashboard-content {
    padding: 16px;
  }

  .tab-navigation {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .tab-button {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .tab-button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .metric-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .metric-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .metric-icon {
    font-size: 16px;
  }

  .metric-value-large {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .metric-target {
    font-size: 12px;
    color: #6b7280;
  }

  .device-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .device-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .charts-section {
    margin-top: 24px;
  }

  .charts-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  .chart-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
  }

  .chart-card h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .chart-placeholder {
    height: 80px;
    background: #f9fafb;
    border-radius: 4px;
    display: flex;
    align-items: end;
    padding: 8px;
  }

  .chart-line {
    display: flex;
    align-items: end;
    gap: 2px;
    width: 100%;
  }

  .chart-point {
    background: #3b82f6;
    width: 8px;
    border-radius: 2px;
    min-height: 2px;
    transition: all 0.2s ease;
  }

  .advanced-toggle {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .toggle-button {
    padding: 8px 16px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .toggle-button:hover {
    background: #f9fafb;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px;
    color: #6b7280;
    font-size: 14px;
  }

  .loading-icon {
    font-size: 18px;
  }

  .profile-tab h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  .profile-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .profile-card.active {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .profile-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .profile-specs {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .spec-item {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .spec-label {
    color: #6b7280;
  }

  .spec-value {
    font-weight: 600;
    color: #374151;
  }

  .report-tab {
    max-height: 400px;
    overflow-y: auto;
  }

  .report-summary {
    margin-bottom: 24px;
  }

  .report-summary h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  .overall-score {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  }

  .score-label {
    color: #6b7280;
  }

  .score-value {
    font-size: 18px;
    font-weight: 700;
  }

  .trend-indicator {
    font-size: 12px;
    color: #6b7280;
  }

  .bottlenecks-section, .recommendations-section {
    margin-bottom: 24px;
  }

  .bottlenecks-section h4, .recommendations-section h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .bottlenecks-list, .recommendations-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .bottleneck-item, .recommendation-item {
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 4px;
    font-size: 12px;
  }

  .bottleneck-item {
    background: #fef2f2;
    border-left: 3px solid #ef4444;
    color: #7f1d1d;
  }

  .recommendation-item {
    background: #f0f9ff;
    border-left: 3px solid #3b82f6;
    color: #1e3a8a;
  }

  .optimization-impact h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .impact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .impact-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f0fdf4;
    border-radius: 4px;
    font-size: 12px;
  }

  .impact-label {
    color: #166534;
    text-transform: capitalize;
  }

  .impact-value {
    font-weight: 600;
    color: #16a34a;
  }

  .dashboard-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .action-button {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .action-button:hover {
    background: #f9fafb;
  }

  .text-green-600 {
    color: #16a34a;
  }

  .text-yellow-600 {
    color: #ca8a04;
  }

  .text-red-600 {
    color: #dc2626;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .performance-dashboard {
      position: fixed;
      top: 10px;
      right: 10px;
      left: 10px;
      min-width: unset;
      max-width: unset;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .charts-grid {
      grid-template-columns: 1fr;
    }

    .profile-grid {
      grid-template-columns: 1fr;
    }

    .impact-grid {
      grid-template-columns: 1fr;
    }

    .quick-metrics {
      flex-direction: column;
      gap: 4px;
    }
  }
</style> 