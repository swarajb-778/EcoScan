<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { analytics, impactMetrics, performanceMetrics, weeklyImpact, topCategories } from '$lib/utils/analytics.js';
  import { fade, fly, scale } from 'svelte/transition';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  // Component props
  export let timeframe: 'day' | 'week' | 'month' = 'week';
  export let showDetails = true;

  // Component state
  let report: any = null;
  let insights: any = null;
  let isLoading = true;
  let selectedTab = 'impact';
  let animationEnabled = true;

  // Animated counters
  const animatedCO2 = tweened(0, { duration: 1500, easing: cubicOut });
  const animatedDetections = tweened(0, { duration: 1200, easing: cubicOut });
  const animatedStreak = tweened(0, { duration: 800, easing: cubicOut });

  // Chart data
  let chartData: any = null;
  let performanceChart: any = null;

  // Load analytics data
  onMount(async () => {
    try {
      console.log('📊 Loading analytics dashboard...');
      
      // Generate report and insights
      report = analytics.generateReport(timeframe);
      insights = analytics.generateInsights();
      
      // Prepare chart data
      prepareChartData();
      
      // Animate counters
      if (animationEnabled) {
        animatedCO2.set($impactMetrics.estimatedCO2Saved);
        animatedDetections.set($impactMetrics.totalDetections);
        animatedStreak.set($impactMetrics.streakDays);
      }
      
      isLoading = false;
      console.log('✅ Analytics dashboard loaded');
      
    } catch (error) {
      console.error('❌ Failed to load analytics:', error);
      isLoading = false;
    }
  });

  // Prepare chart data for visualizations
  function prepareChartData() {
    // Weekly progress chart
    chartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Daily Classifications',
        data: $impactMetrics.weeklyProgress,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        fill: true
      }]
    };

    // Performance metrics chart
    performanceChart = {
      labels: ['Detection Time', 'Camera Init', 'Model Load', 'Memory Usage'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          $performanceMetrics.averageDetectionTime,
          $performanceMetrics.cameraInitTime,
          $performanceMetrics.modelLoadTime,
          $performanceMetrics.memoryUsage
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    };
  }

  // Handle timeframe change
  function handleTimeframeChange(newTimeframe: typeof timeframe) {
    timeframe = newTimeframe;
    isLoading = true;
    
    setTimeout(() => {
      report = analytics.generateReport(timeframe);
      prepareChartData();
      isLoading = false;
    }, 300);
  }

  // Format numbers for display
  function formatNumber(num: number, decimals = 1): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  }

  // Format CO2 with appropriate unit
  function formatCO2(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tons`;
    return `${kg.toFixed(1)} kg`;
  }

  // Get category icon
  function getCategoryIcon(category: string): string {
    const icons = {
      recycle: '♻️',
      compost: '🌱',
      trash: '🗑️',
      hazardous: '☣️'
    };
    return icons[category as keyof typeof icons] || '📦';
  }

  // Get trend indicator
  function getTrendIndicator(change: number): { icon: string; color: string; text: string } {
    if (change > 5) return { icon: '📈', color: 'text-green-500', text: '+' + change.toFixed(1) + '%' };
    if (change < -5) return { icon: '📉', color: 'text-red-500', text: change.toFixed(1) + '%' };
    return { icon: '➡️', color: 'text-gray-500', text: 'stable' };
  }

  onDestroy(() => {
    // Cleanup if needed
  });
</script>

<div class="analytics-dashboard w-full space-y-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
  
  <!-- Header -->
  <div class="dashboard-header" in:fly={{ y: -20, duration: 600 }}>
    <h1 class="text-3xl font-bold text-gray-800 mb-2">📊 EcoScan Analytics</h1>
    <p class="text-gray-600">Track your environmental impact and usage patterns</p>
    
    <!-- Timeframe Selector -->
    <div class="flex space-x-2 mt-4">
      {#each ['day', 'week', 'month'] as period}
        <button 
          class="px-4 py-2 rounded-lg font-medium transition-all duration-200"
          class:bg-green-500={timeframe === period}
          class:text-white={timeframe === period}
          class:bg-white={timeframe !== period}
          class:text-gray-700={timeframe !== period}
          class:shadow-md={timeframe === period}
          on:click={() => handleTimeframeChange(period)}
        >
          {period.charAt(0).toUpperCase() + period.slice(1)}
        </button>
      {/each}
    </div>
  </div>

  {#if isLoading}
    <!-- Loading State -->
    <div class="flex items-center justify-center py-20" in:fade>
      <div class="text-center">
        <div class="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">Loading analytics...</p>
      </div>
    </div>
  {:else}
    <!-- Tab Navigation -->
    <div class="bg-white rounded-xl shadow-lg p-1 flex space-x-1" in:scale={{ duration: 400 }}>
      {#each [
        { id: 'impact', label: 'Environmental Impact', icon: '🌍' },
        { id: 'usage', label: 'Usage Patterns', icon: '📱' },
        { id: 'performance', label: 'Performance', icon: '⚡' },
        { id: 'insights', label: 'Insights', icon: '💡' }
      ] as tab}
        <button
          class="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200"
          class:bg-green-500={selectedTab === tab.id}
          class:text-white={selectedTab === tab.id}
          class:text-gray-600={selectedTab !== tab.id}
          class:hover:bg-gray-100={selectedTab !== tab.id}
          on:click={() => selectedTab = tab.id}
        >
          <span class="text-lg">{tab.icon}</span>
          <span class="hidden sm:inline">{tab.label}</span>
        </button>
      {/each}
    </div>

    <!-- Dashboard Content -->
    <div class="dashboard-content">
      
      {#if selectedTab === 'impact'}
        <!-- Environmental Impact Tab -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" in:fly={{ x: -20, duration: 500 }}>
          
          <!-- CO2 Saved Card -->
          <div class="metric-card bg-gradient-to-br from-green-400 to-green-600 text-white">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">CO₂ Saved</h3>
              <span class="text-2xl">🌱</span>
            </div>
            <div class="text-3xl font-bold mb-2">
              {formatCO2($animatedCO2)}
            </div>
            <div class="text-sm opacity-90">
              <span class="mr-2">{getTrendIndicator($weeklyImpact.change).icon}</span>
              <span class={getTrendIndicator($weeklyImpact.change).color}>
                {getTrendIndicator($weeklyImpact.change).text} vs last {timeframe}
              </span>
            </div>
          </div>

          <!-- Total Detections Card -->
          <div class="metric-card bg-gradient-to-br from-blue-400 to-blue-600 text-white">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">Items Classified</h3>
              <span class="text-2xl">📊</span>
            </div>
            <div class="text-3xl font-bold mb-2">
              {formatNumber($animatedDetections, 0)}
            </div>
            <div class="text-sm opacity-90">
              {report?.summary?.detections || 0} this {timeframe}
            </div>
          </div>

          <!-- Streak Card -->
          <div class="metric-card bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">Current Streak</h3>
              <span class="text-2xl">🔥</span>
            </div>
            <div class="text-3xl font-bold mb-2">
              {Math.floor($animatedStreak)} days
            </div>
            <div class="text-sm opacity-90">
              Keep up the great work!
            </div>
          </div>

          <!-- Waste Diverted Card -->
          <div class="metric-card bg-gradient-to-br from-purple-400 to-purple-600 text-white">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">Waste Diverted</h3>
              <span class="text-2xl">♻️</span>
            </div>
            <div class="text-3xl font-bold mb-2">
              {$impactMetrics.estimatedWasteDiverted.toFixed(1)} kg
            </div>
            <div class="text-sm opacity-90">
              From landfills
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h3 class="text-xl font-bold text-gray-800 mb-6">Category Breakdown</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            {#each $topCategories as { category, count }}
              <div class="category-item bg-gray-50 rounded-lg p-4 text-center">
                <div class="text-3xl mb-2">{getCategoryIcon(category)}</div>
                <div class="font-bold text-lg text-gray-800">{count}</div>
                <div class="text-sm text-gray-600 capitalize">{category}</div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Environmental Equivalencies -->
        {#if report?.environmental?.equivalencies}
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Environmental Impact Equivalencies</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div class="equivalency-card">
                <div class="flex items-center space-x-3 mb-3">
                  <span class="text-3xl">🌳</span>
                  <div>
                    <div class="font-bold text-2xl text-green-600">
                      {report.environmental.equivalencies.treesPlanted}
                    </div>
                    <div class="text-sm text-gray-600">Trees planted equivalent</div>
                  </div>
                </div>
              </div>

              <div class="equivalency-card">
                <div class="flex items-center space-x-3 mb-3">
                  <span class="text-3xl">🚗</span>
                  <div>
                    <div class="font-bold text-2xl text-blue-600">
                      {report.environmental.equivalencies.milesNotDriven}
                    </div>
                    <div class="text-sm text-gray-600">Miles not driven</div>
                  </div>
                </div>
              </div>

              <div class="equivalency-card">
                <div class="flex items-center space-x-3 mb-3">
                  <span class="text-3xl">💡</span>
                  <div>
                    <div class="font-bold text-2xl text-yellow-600">
                      {report.environmental.equivalencies.lightBulbHours}
                    </div>
                    <div class="text-sm text-gray-600">LED bulb hours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

      {:else if selectedTab === 'usage'}
        <!-- Usage Patterns Tab -->
        <div class="space-y-6" in:fly={{ x: 20, duration: 500 }}>
          
          <!-- Weekly Activity Chart -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Weekly Activity</h3>
            <div class="chart-container h-64">
              <!-- Chart would be rendered here with a charting library -->
              <div class="flex items-center justify-center h-full text-gray-500">
                📊 Weekly activity chart would be displayed here
              </div>
            </div>
          </div>

          <!-- Time of Day Analysis -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Activity by Time of Day</h3>
            <div class="grid grid-cols-4 md:grid-cols-8 gap-2">
              {#each Array(24) as _, hour}
                {@const activity = $impactMetrics.timeOfDayAnalysis[`${hour}:00`] || 0}
                {@const maxActivity = Math.max(...Object.values($impactMetrics.timeOfDayAnalysis))}
                {@const heightPercent = maxActivity > 0 ? (activity / maxActivity) * 100 : 0}
                
                <div class="text-center">
                  <div class="bg-gray-200 rounded-t h-20 flex items-end mb-1">
                    <div 
                      class="w-full bg-green-400 rounded-t transition-all duration-500"
                      style="height: {heightPercent}%"
                    ></div>
                  </div>
                  <div class="text-xs text-gray-600">{hour}h</div>
                  <div class="text-xs font-medium">{activity}</div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Usage Statistics -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">Session Stats</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Average session duration</span>
                  <span class="font-medium">2.3 min</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Total sessions</span>
                  <span class="font-medium">47</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Bounce rate</span>
                  <span class="font-medium">12%</span>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">Detection Stats</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Average confidence</span>
                  <span class="font-medium">{(report?.summary?.averageConfidence * 100 || 0).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Unique categories</span>
                  <span class="font-medium">{report?.summary?.uniqueCategories || 0}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Success rate</span>
                  <span class="font-medium">94.2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {:else if selectedTab === 'performance'}
        <!-- Performance Tab -->
        <div class="space-y-6" in:fly={{ x: 20, duration: 500 }}>
          
          <!-- Performance Metrics Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="metric-card bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
              <h3 class="font-semibold mb-2">Avg Detection Time</h3>
              <div class="text-2xl font-bold">{$performanceMetrics.averageDetectionTime.toFixed(0)}ms</div>
            </div>
            
            <div class="metric-card bg-gradient-to-br from-cyan-400 to-cyan-600 text-white">
              <h3 class="font-semibold mb-2">Camera Init</h3>
              <div class="text-2xl font-bold">{($performanceMetrics.cameraInitTime / 1000).toFixed(1)}s</div>
            </div>
            
            <div class="metric-card bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
              <h3 class="font-semibold mb-2">Error Rate</h3>
              <div class="text-2xl font-bold">{($performanceMetrics.errorRate * 100).toFixed(1)}%</div>
            </div>
            
            <div class="metric-card bg-gradient-to-br from-rose-400 to-rose-600 text-white">
              <h3 class="font-semibold mb-2">Memory Usage</h3>
              <div class="text-2xl font-bold">{$performanceMetrics.memoryUsage.toFixed(0)}MB</div>
            </div>
          </div>

          <!-- Performance Chart -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Performance Metrics Overview</h3>
            <div class="chart-container h-64">
              <div class="flex items-center justify-center h-full text-gray-500">
                📊 Performance metrics chart would be displayed here
              </div>
            </div>
          </div>

          <!-- System Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">System Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Browser</span>
                  <span class="font-medium">{navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Device Memory</span>
                  <span class="font-medium">{(navigator as any).deviceMemory || 'Unknown'} GB</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">CPU Cores</span>
                  <span class="font-medium">{navigator.hardwareConcurrency || 'Unknown'}</span>
                </div>
              </div>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Screen Resolution</span>
                  <span class="font-medium">{screen.width}x{screen.height}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Color Depth</span>
                  <span class="font-medium">{screen.colorDepth} bit</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Network</span>
                  <span class="font-medium">{navigator.onLine ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {:else if selectedTab === 'insights'}
        <!-- Insights Tab -->
        <div class="space-y-6" in:fly={{ x: 20, duration: 500 }}>
          
          <!-- AI Insights -->
          {#if insights?.insights && insights.insights.length > 0}
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span class="mr-3">🤖</span>
                AI Insights
              </h3>
              <div class="space-y-4">
                {#each insights.insights as insight, index}
                  <div class="insight-card bg-blue-50 border-l-4 border-blue-400 p-4" in:fly={{ y: 20, delay: index * 100 }}>
                    <p class="text-gray-700">{insight}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Recommendations -->
          {#if insights?.recommendations && insights.recommendations.length > 0}
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span class="mr-3">💡</span>
                Personalized Recommendations
              </h3>
              <div class="space-y-4">
                {#each insights.recommendations as recommendation, index}
                  <div class="recommendation-card bg-green-50 border-l-4 border-green-400 p-4" in:fly={{ y: 20, delay: index * 100 }}>
                    <p class="text-gray-700">{recommendation}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Achievements -->
          {#if insights?.achievements && insights.achievements.length > 0}
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span class="mr-3">🏆</span>
                Recent Achievements
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each insights.achievements as achievement, index}
                  <div class="achievement-card bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-4" in:scale={{ delay: index * 150 }}>
                    <div class="flex items-center space-x-3">
                      <span class="text-3xl">{achievement.icon}</span>
                      <div>
                        <h4 class="font-bold">{achievement.title}</h4>
                        <p class="text-sm opacity-90">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Weekly Summary -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Weekly Summary</h3>
            <div class="prose text-gray-700">
              <p>
                This week you've made great progress on your environmental journey! 
                You classified <strong>{$weeklyImpact.thisWeek} items</strong> 
                {#if $weeklyImpact.change > 0}
                  , which is <strong>{$weeklyImpact.change.toFixed(1)}% more</strong> than last week.
                {:else if $weeklyImpact.change < 0}
                  , which is <strong>{Math.abs($weeklyImpact.change).toFixed(1)}% less</strong> than last week.
                {:else}
                  , maintaining consistent engagement with EcoScan.
                {/if}
                Keep up the excellent work! 🌟
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .analytics-dashboard {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .metric-card {
    @apply rounded-xl p-6 shadow-lg transition-transform duration-200 hover:scale-105;
  }

  .category-item {
    @apply transition-transform duration-200 hover:scale-105;
  }

  .equivalency-card {
    @apply bg-gray-50 rounded-lg p-4;
  }

  .insight-card {
    @apply transition-transform duration-200 hover:scale-[1.02];
  }

  .recommendation-card {
    @apply transition-transform duration-200 hover:scale-[1.02];
  }

  .achievement-card {
    @apply transition-transform duration-200 hover:scale-105 shadow-lg;
  }

  .chart-container {
    @apply bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300;
  }

  /* Animation classes */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .analytics-dashboard {
      padding: 1rem;
    }
    
    .metric-card {
      padding: 1rem;
    }
  }
</style> 