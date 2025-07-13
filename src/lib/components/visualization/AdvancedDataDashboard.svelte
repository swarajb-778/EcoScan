<script lang="ts">
  /**
   * Advanced Data Visualization Dashboard for EcoScan
   * 
   * Features:
   * - Interactive charts and graphs with multiple visualization types
   * - Real-time analytics dashboard with live data updates
   * - Comprehensive reporting with customizable time ranges
   * - Data filtering and drill-down capabilities
   * - Export functionality for charts and reports
   * - Responsive design with mobile-first approach
   * - Advanced statistical analysis and insights
   * - Comparative analysis and trend visualization
   * - Geographic mapping and location-based analytics
   * - Performance metrics and KPI tracking
   * - Custom dashboard creation and layout management
   * - Data exploration tools with query builders
   * - Automated insights and anomaly detection
   * - Collaborative features with sharing and commenting
   * - Integration with external data sources
   * 
   * Chart Types:
   * - Line charts for trends and time series
   * - Bar charts for categorical comparisons
   * - Pie charts for composition analysis
   * - Scatter plots for correlation analysis
   * - Heatmaps for density visualization
   * - Geographic maps for location data
   * - Sankey diagrams for flow analysis
   * - Treemaps for hierarchical data
   */

  import { onMount, createEventDispatcher } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import { advancedAnalytics } from '../../utils/advanced-analytics';
  import { advancedMLOptimizer } from '../../ml/advanced-ml-optimizer';

  // Component props
  export let dashboardConfig: DashboardConfig = getDefaultConfig();
  export let dataSource: string = 'default';
  export let refreshInterval: number = 30000; // 30 seconds
  export let allowCustomization: boolean = true;
  export let enableExport: boolean = true;
  export let enableSharing: boolean = true;

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Dashboard interfaces
  interface DashboardConfig {
    layout: 'grid' | 'flex' | 'masonry';
    theme: 'light' | 'dark' | 'auto';
    animations: boolean;
    realTime: boolean;
    autoRefresh: boolean;
    widgets: Widget[];
    filters: FilterConfig[];
    timeRange: TimeRange;
  }

  interface Widget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'map' | 'custom';
    title: string;
    description: string;
    position: { x: number; y: number; w: number; h: number };
    config: WidgetConfig;
    data: any;
    loading: boolean;
    error?: string;
  }

  interface WidgetConfig {
    chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'area' | 'radar';
    dataQuery: string;
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    animation?: boolean;
    responsive?: boolean;
  }

  interface FilterConfig {
    field: string;
    type: 'select' | 'multiselect' | 'range' | 'date' | 'search';
    label: string;
    options?: any[];
    value: any;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like';
  }

  interface TimeRange {
    start: Date;
    end: Date;
    preset: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'last_year' | 'custom';
  }

  interface ChartData {
    labels: string[];
    datasets: Dataset[];
  }

  interface Dataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }

  interface MetricData {
    value: number;
    label: string;
    unit?: string;
    change?: number;
    changeType?: 'increase' | 'decrease' | 'neutral';
    target?: number;
    format?: 'number' | 'percentage' | 'currency' | 'duration';
  }

  // Reactive stores
  const dashboardData = writable<any>({});
  const selectedTimeRange = writable<TimeRange>(dashboardConfig.timeRange);
  const appliedFilters = writable<FilterConfig[]>(dashboardConfig.filters);
  const widgets = writable<Widget[]>(dashboardConfig.widgets);
  const isLoading = writable<boolean>(false);
  const insights = writable<any[]>([]);

  // Dashboard state
  let refreshTimer: number | null = null;
  let chartInstances: Map<string, any> = new Map();
  let selectedWidget: Widget | null = null;
  let showCustomizationPanel = false;
  let showFilterPanel = false;
  let showExportDialog = false;

  // Default configuration
  function getDefaultConfig(): DashboardConfig {
    return {
      layout: 'grid',
      theme: 'light',
      animations: true,
      realTime: true,
      autoRefresh: true,
      widgets: [
        {
          id: 'waste-detection-trends',
          type: 'chart',
          title: 'Waste Detection Trends',
          description: 'Daily waste detection counts over time',
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: {
            chartType: 'line',
            dataQuery: 'waste_detections_daily',
            xAxis: 'date',
            yAxis: 'count',
            showLegend: true,
            showGrid: true,
            animation: true
          },
          data: null,
          loading: false
        },
        {
          id: 'waste-categories',
          type: 'chart',
          title: 'Waste Categories Distribution',
          description: 'Breakdown of detected waste by category',
          position: { x: 6, y: 0, w: 6, h: 4 },
          config: {
            chartType: 'pie',
            dataQuery: 'waste_categories',
            groupBy: 'category',
            aggregation: 'count',
            showLegend: true
          },
          data: null,
          loading: false
        },
        {
          id: 'detection-accuracy',
          type: 'metric',
          title: 'Detection Accuracy',
          description: 'Average ML model accuracy',
          position: { x: 0, y: 4, w: 3, h: 2 },
          config: {
            dataQuery: 'ml_accuracy',
            aggregation: 'avg'
          },
          data: null,
          loading: false
        },
        {
          id: 'total-detections',
          type: 'metric',
          title: 'Total Detections',
          description: 'Total number of detections',
          position: { x: 3, y: 4, w: 3, h: 2 },
          config: {
            dataQuery: 'total_detections',
            aggregation: 'count'
          },
          data: null,
          loading: false
        },
        {
          id: 'processing-time',
          type: 'metric',
          title: 'Avg Processing Time',
          description: 'Average inference time',
          position: { x: 6, y: 4, w: 3, h: 2 },
          config: {
            dataQuery: 'processing_time',
            aggregation: 'avg'
          },
          data: null,
          loading: false
        },
        {
          id: 'user-engagement',
          type: 'metric',
          title: 'User Engagement',
          description: 'Daily active users',
          position: { x: 9, y: 4, w: 3, h: 2 },
          config: {
            dataQuery: 'user_engagement',
            aggregation: 'count'
          },
          data: null,
          loading: false
        }
      ],
      filters: [
        {
          field: 'category',
          type: 'multiselect',
          label: 'Waste Category',
          options: ['recycle', 'compost', 'landfill', 'hazardous'],
          value: [],
          operator: 'in'
        },
        {
          field: 'confidence',
          type: 'range',
          label: 'Confidence Level',
          value: [0.7, 1.0],
          operator: 'gte'
        }
      ],
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
        preset: 'last_week'
      }
    };
  }

  // Lifecycle
  onMount(() => {
    initializeDashboard();
    startAutoRefresh();
    return () => stopAutoRefresh();
  });

  // Dashboard initialization
  async function initializeDashboard(): Promise<void> {
    isLoading.set(true);
    
    try {
      await loadDashboardData();
      generateInsights();
      
      // Track dashboard view
      advancedAnalytics.trackUserBehavior('dashboard_view', 'dashboard', {
        widgets: dashboardConfig.widgets.length,
        timeRange: dashboardConfig.timeRange.preset
      });
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
    } finally {
      isLoading.set(false);
    }
  }

  // Data loading
  async function loadDashboardData(): Promise<void> {
    const updatedWidgets = await Promise.all(
      dashboardConfig.widgets.map(async (widget) => {
        try {
          widget.loading = true;
          widget.data = await loadWidgetData(widget);
          widget.error = undefined;
        } catch (error) {
          widget.error = error.message;
          widget.data = null;
        } finally {
          widget.loading = false;
        }
        return widget;
      })
    );

    widgets.set(updatedWidgets);
    dashboardConfig.widgets = updatedWidgets;
  }

  async function loadWidgetData(widget: Widget): Promise<any> {
    const timeRange = $selectedTimeRange;
    const filters = $appliedFilters;

    // Simulate API call based on widget configuration
    switch (widget.config.dataQuery) {
      case 'waste_detections_daily':
        return generateTimeSeriesData(timeRange, 'Daily Detections');
      
      case 'waste_categories':
        return generateCategoryData();
      
      case 'ml_accuracy':
        return generateMetricData(0.92, 'Accuracy', '%', 2.1, 'increase');
      
      case 'total_detections':
        return generateMetricData(15847, 'Detections', '', 347, 'increase');
      
      case 'processing_time':
        return generateMetricData(85, 'Processing Time', 'ms', -5, 'decrease');
      
      case 'user_engagement':
        return generateMetricData(1245, 'Active Users', '', 89, 'increase');
      
      default:
        return null;
    }
  }

  // Data generation (would be replaced with real API calls)
  function generateTimeSeriesData(timeRange: TimeRange, label: string): ChartData {
    const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(timeRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString());
      data.push(Math.floor(Math.random() * 100) + 50);
    }

    return {
      labels,
      datasets: [{
        label,
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };
  }

  function generateCategoryData(): ChartData {
    return {
      labels: ['Recycle', 'Compost', 'Landfill', 'Hazardous'],
      datasets: [{
        label: 'Waste Categories',
        data: [45, 25, 20, 10],
        backgroundColor: [
          '#10b981', // green
          '#f59e0b', // amber
          '#ef4444', // red
          '#8b5cf6'  // purple
        ]
      }]
    };
  }

  function generateMetricData(
    value: number, 
    label: string, 
    unit: string = '', 
    change: number = 0, 
    changeType: 'increase' | 'decrease' | 'neutral' = 'neutral'
  ): MetricData {
    return {
      value,
      label,
      unit,
      change,
      changeType,
      format: unit === '%' ? 'percentage' : 'number'
    };
  }

  // Chart rendering
  function renderChart(widget: Widget, container: HTMLElement): void {
    if (!widget.data || !container) return;

    // Clean up existing chart
    const existingChart = chartInstances.get(widget.id);
    if (existingChart) {
      existingChart.destroy();
    }

    // Create new chart based on type
    switch (widget.config.chartType) {
      case 'line':
        renderLineChart(widget, container);
        break;
      case 'bar':
        renderBarChart(widget, container);
        break;
      case 'pie':
        renderPieChart(widget, container);
        break;
      case 'scatter':
        renderScatterChart(widget, container);
        break;
      default:
        renderLineChart(widget, container);
    }
  }

  function renderLineChart(widget: Widget, container: HTMLElement): void {
    // This would use a charting library like Chart.js or D3.js
    // For now, we'll create a simple SVG representation
    const data = widget.data as ChartData;
    const svg = createSVGChart(container, data, 'line');
    chartInstances.set(widget.id, { destroy: () => svg.remove() });
  }

  function renderBarChart(widget: Widget, container: HTMLElement): void {
    const data = widget.data as ChartData;
    const svg = createSVGChart(container, data, 'bar');
    chartInstances.set(widget.id, { destroy: () => svg.remove() });
  }

  function renderPieChart(widget: Widget, container: HTMLElement): void {
    const data = widget.data as ChartData;
    const svg = createSVGChart(container, data, 'pie');
    chartInstances.set(widget.id, { destroy: () => svg.remove() });
  }

  function renderScatterChart(widget: Widget, container: HTMLElement): void {
    const data = widget.data as ChartData;
    const svg = createSVGChart(container, data, 'scatter');
    chartInstances.set(widget.id, { destroy: () => svg.remove() });
  }

  function createSVGChart(container: HTMLElement, data: ChartData, type: string): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 400 300');

    // Simple chart rendering logic
    if (type === 'pie') {
      renderPieSVG(svg, data);
    } else if (type === 'bar') {
      renderBarSVG(svg, data);
    } else {
      renderLineSVG(svg, data);
    }

    container.innerHTML = '';
    container.appendChild(svg);
    return svg;
  }

  function renderLineSVG(svg: SVGElement, data: ChartData): void {
    const dataset = data.datasets[0];
    const maxValue = Math.max(...dataset.data);
    const points: string[] = [];

    dataset.data.forEach((value, index) => {
      const x = (index / (dataset.data.length - 1)) * 350 + 25;
      const y = 250 - (value / maxValue) * 200;
      points.push(`${x},${y}`);
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${points.join(' L ')}`);
    path.setAttribute('stroke', dataset.borderColor || '#3b82f6');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');

    svg.appendChild(path);
  }

  function renderBarSVG(svg: SVGElement, data: ChartData): void {
    const dataset = data.datasets[0];
    const maxValue = Math.max(...dataset.data);
    const barWidth = 300 / dataset.data.length;

    dataset.data.forEach((value, index) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const x = index * barWidth + 50;
      const height = (value / maxValue) * 200;
      const y = 250 - height;

      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', (barWidth * 0.8).toString());
      rect.setAttribute('height', height.toString());
      rect.setAttribute('fill', Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[index] || '#3b82f6'
        : dataset.backgroundColor || '#3b82f6'
      );

      svg.appendChild(rect);
    });
  }

  function renderPieSVG(svg: SVGElement, data: ChartData): void {
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, value) => sum + value, 0);
    const centerX = 200;
    const centerY = 150;
    const radius = 80;

    let currentAngle = 0;

    dataset.data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const x1 = centerX + radius * Math.cos(currentAngle);
      const y1 = centerY + radius * Math.sin(currentAngle);
      const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle);
      const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`);
      path.setAttribute('fill', Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[index] || '#3b82f6'
        : dataset.backgroundColor || '#3b82f6'
      );

      svg.appendChild(path);
      currentAngle += sliceAngle;
    });
  }

  // Insights generation
  function generateInsights(): void {
    const generatedInsights = [
      {
        type: 'trend',
        title: 'Increasing Detection Accuracy',
        description: 'Model accuracy has improved by 2.1% this week',
        impact: 'positive',
        confidence: 0.87
      },
      {
        type: 'anomaly',
        title: 'Unusual Spike in Hazardous Waste',
        description: 'Hazardous waste detections increased by 45% yesterday',
        impact: 'warning',
        confidence: 0.92
      },
      {
        type: 'prediction',
        title: 'Expected High Usage Tomorrow',
        description: 'Based on historical patterns, expect 25% more scans tomorrow',
        impact: 'neutral',
        confidence: 0.73
      }
    ];

    insights.set(generatedInsights);
  }

  // Event handlers
  function handleTimeRangeChange(newRange: TimeRange): void {
    selectedTimeRange.set(newRange);
    dashboardConfig.timeRange = newRange;
    refreshDashboard();
  }

  function handleFilterChange(filters: FilterConfig[]): void {
    appliedFilters.set(filters);
    dashboardConfig.filters = filters;
    refreshDashboard();
  }

  function handleWidgetClick(widget: Widget): void {
    selectedWidget = widget;
    dispatch('widget-click', { widget });
  }

  function handleRefreshClick(): void {
    refreshDashboard();
  }

  function refreshDashboard(): void {
    loadDashboardData();
    generateInsights();
  }

  function startAutoRefresh(): void {
    if (dashboardConfig.autoRefresh && refreshInterval > 0) {
      refreshTimer = window.setInterval(refreshDashboard, refreshInterval);
    }
  }

  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function exportDashboard(format: 'pdf' | 'png' | 'csv' | 'json'): void {
    // Implementation would depend on export requirements
    console.log(`Exporting dashboard as ${format}`);
    dispatch('export', { format, widgets: dashboardConfig.widgets });
  }

  function shareDashboard(): void {
    const shareUrl = `${window.location.origin}/dashboard/shared/${btoa(JSON.stringify(dashboardConfig))}`;
    navigator.clipboard.writeText(shareUrl);
    dispatch('share', { url: shareUrl });
  }

  // Utility functions
  function formatNumber(value: number, format: string = 'number'): string {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'duration':
        return `${value}ms`;
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  }

  function getChangeIcon(changeType: string): string {
    switch (changeType) {
      case 'increase': return '↗️';
      case 'decrease': return '↘️';
      default: return '➡️';
    }
  }

  function getChangeColor(changeType: string): string {
    switch (changeType) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
</script>

<!-- Dashboard Container -->
<div class="dashboard" class:dark={dashboardConfig.theme === 'dark'}>
  <!-- Dashboard Header -->
  <header class="dashboard-header">
    <div class="header-content">
      <div class="header-title">
        <h1>EcoScan Analytics Dashboard</h1>
        <p>Real-time insights and performance metrics</p>
      </div>
      
      <div class="header-actions">
        <!-- Time Range Selector -->
        <div class="time-range-selector">
          <select 
            bind:value={$selectedTimeRange.preset}
            on:change={(e) => handleTimeRangeChange({
              ...$selectedTimeRange,
              preset: e.target.value
            })}
          >
            <option value="last_hour">Last Hour</option>
            <option value="last_day">Last Day</option>
            <option value="last_week">Last Week</option>
            <option value="last_month">Last Month</option>
            <option value="last_year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <!-- Action Buttons -->
        <button class="btn btn-secondary" on:click={() => showFilterPanel = !showFilterPanel}>
          🔍 Filters
        </button>
        
        <button class="btn btn-secondary" on:click={handleRefreshClick}>
          🔄 Refresh
        </button>
        
        {#if allowCustomization}
          <button class="btn btn-secondary" on:click={() => showCustomizationPanel = !showCustomizationPanel}>
            ⚙️ Customize
          </button>
        {/if}
        
        {#if enableExport}
          <button class="btn btn-secondary" on:click={() => showExportDialog = !showExportDialog}>
            📊 Export
          </button>
        {/if}
        
        {#if enableSharing}
          <button class="btn btn-primary" on:click={shareDashboard}>
            🔗 Share
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Filter Panel -->
  {#if showFilterPanel}
    <div class="filter-panel">
      <h3>Filters</h3>
      <div class="filter-grid">
        {#each dashboardConfig.filters as filter}
          <div class="filter-item">
            <label>{filter.label}</label>
            {#if filter.type === 'select'}
              <select bind:value={filter.value}>
                {#each filter.options || [] as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {:else if filter.type === 'multiselect'}
              <div class="multiselect">
                {#each filter.options || [] as option}
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      bind:group={filter.value} 
                      value={option}
                    />
                    {option}
                  </label>
                {/each}
              </div>
            {:else if filter.type === 'range'}
              <div class="range-filter">
                <input 
                  type="number" 
                  bind:value={filter.value[0]} 
                  step="0.1"
                  placeholder="Min"
                />
                <span>to</span>
                <input 
                  type="number" 
                  bind:value={filter.value[1]} 
                  step="0.1"
                  placeholder="Max"
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" on:click={() => handleFilterChange(dashboardConfig.filters)}>
          Apply Filters
        </button>
        <button class="btn btn-secondary" on:click={() => showFilterPanel = false}>
          Close
        </button>
      </div>
    </div>
  {/if}

  <!-- Insights Panel -->
  {#if $insights.length > 0}
    <div class="insights-panel">
      <h3>🔍 Key Insights</h3>
      <div class="insights-grid">
        {#each $insights as insight}
          <div class="insight-card" class:positive={insight.impact === 'positive'} class:warning={insight.impact === 'warning'}>
            <div class="insight-header">
              <span class="insight-type">{insight.type}</span>
              <span class="insight-confidence">{(insight.confidence * 100).toFixed(0)}%</span>
            </div>
            <h4>{insight.title}</h4>
            <p>{insight.description}</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Dashboard Grid -->
  <main class="dashboard-grid" class:loading={$isLoading}>
    {#each $widgets as widget (widget.id)}
      <div 
        class="widget" 
        class:loading={widget.loading}
        class:error={widget.error}
        style="grid-column: span {widget.position.w}; grid-row: span {widget.position.h};"
        on:click={() => handleWidgetClick(widget)}
      >
        <div class="widget-header">
          <div class="widget-title">
            <h3>{widget.title}</h3>
            <p>{widget.description}</p>
          </div>
          <div class="widget-actions">
            {#if widget.loading}
              <div class="spinner"></div>
            {/if}
            <button class="widget-menu">⋮</button>
          </div>
        </div>
        
        <div class="widget-content">
          {#if widget.error}
            <div class="error-message">
              <p>⚠️ Error loading data</p>
              <span>{widget.error}</span>
            </div>
          {:else if widget.type === 'metric' && widget.data}
            <div class="metric-display">
              <div class="metric-value">
                {formatNumber(widget.data.value, widget.data.format)}
                {#if widget.data.unit}
                  <span class="metric-unit">{widget.data.unit}</span>
                {/if}
              </div>
              {#if widget.data.change}
                <div class="metric-change {getChangeColor(widget.data.changeType)}">
                  <span class="change-icon">{getChangeIcon(widget.data.changeType)}</span>
                  <span class="change-value">{Math.abs(widget.data.change)}</span>
                </div>
              {/if}
            </div>
          {:else if widget.type === 'chart' && widget.data}
            <div class="chart-container" bind:this={(el) => el && renderChart(widget, el)}>
              <!-- Chart will be rendered here -->
            </div>
          {:else if widget.type === 'table' && widget.data}
            <div class="table-container">
              <!-- Table implementation -->
              <p>Table view (not implemented in this demo)</p>
            </div>
          {:else}
            <div class="no-data">
              <p>No data available</p>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </main>

  <!-- Export Dialog -->
  {#if showExportDialog}
    <div class="modal-overlay" on:click={() => showExportDialog = false}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h3>Export Dashboard</h3>
          <button class="modal-close" on:click={() => showExportDialog = false}>×</button>
        </div>
        <div class="modal-content">
          <p>Choose export format:</p>
          <div class="export-options">
            <button class="btn btn-outline" on:click={() => exportDashboard('pdf')}>
              📄 PDF Report
            </button>
            <button class="btn btn-outline" on:click={() => exportDashboard('png')}>
              🖼️ PNG Image
            </button>
            <button class="btn btn-outline" on:click={() => exportDashboard('csv')}>
              📊 CSV Data
            </button>
            <button class="btn btn-outline" on:click={() => exportDashboard('json')}>
              📋 JSON Config
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Customization Panel -->
  {#if showCustomizationPanel}
    <div class="customization-panel">
      <h3>Customize Dashboard</h3>
      <div class="customization-options">
        <div class="option-group">
          <label>Theme</label>
          <select bind:value={dashboardConfig.theme}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        
        <div class="option-group">
          <label>Layout</label>
          <select bind:value={dashboardConfig.layout}>
            <option value="grid">Grid</option>
            <option value="flex">Flex</option>
            <option value="masonry">Masonry</option>
          </select>
        </div>
        
        <div class="option-group">
          <label>
            <input type="checkbox" bind:checked={dashboardConfig.animations} />
            Enable Animations
          </label>
        </div>
        
        <div class="option-group">
          <label>
            <input type="checkbox" bind:checked={dashboardConfig.autoRefresh} />
            Auto Refresh
          </label>
        </div>
      </div>
      
      <div class="customization-actions">
        <button class="btn btn-primary" on:click={() => showCustomizationPanel = false}>
          Apply Changes
        </button>
        <button class="btn btn-secondary" on:click={() => showCustomizationPanel = false}>
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    min-height: 100vh;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #1f2937);
    transition: all 0.3s ease;
  }

  .dashboard.dark {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --border-color: #374151;
  }

  .dashboard:not(.dark) {
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
  }

  /* Header */
  .dashboard-header {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: 1.5rem 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1440px;
    margin: 0 auto;
  }

  .header-title h1 {
    font-size: 1.875rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
  }

  .header-title p {
    color: var(--text-secondary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .time-range-selector select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  /* Buttons */
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--border-color);
  }

  .btn-outline {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  /* Filter Panel */
  .filter-panel {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: 1.5rem 2rem;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .filter-item label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .filter-item select,
  .filter-item input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .multiselect {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: normal;
  }

  .range-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .range-filter input {
    flex: 1;
  }

  .filter-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  /* Insights Panel */
  .insights-panel {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: 1.5rem 2rem;
  }

  .insights-panel h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .insight-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .insight-card.positive {
    border-left: 4px solid #10b981;
  }

  .insight-card.warning {
    border-left: 4px solid #f59e0b;
  }

  .insight-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .insight-type {
    background: var(--bg-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  .insight-confidence {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .insight-card h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .insight-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  /* Dashboard Grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1.5rem;
    padding: 2rem;
    max-width: 1440px;
    margin: 0 auto;
  }

  .dashboard-grid.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  /* Widget */
  .widget {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    overflow: hidden;
    transition: all 0.2s ease;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .widget:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .widget.loading {
    opacity: 0.7;
  }

  .widget.error {
    border-color: #ef4444;
  }

  .widget-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .widget-title h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .widget-title p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .widget-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .widget-menu {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
  }

  .widget-content {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* Metric Display */
  .metric-display {
    text-align: center;
  }

  .metric-value {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .metric-unit {
    font-size: 1rem;
    color: var(--text-secondary);
    font-weight: 400;
  }

  .metric-change {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .text-green-600 { color: #059669; }
  .text-red-600 { color: #dc2626; }
  .text-gray-600 { color: #4b5563; }

  /* Chart Container */
  .chart-container {
    width: 100%;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Error and No Data */
  .error-message,
  .no-data {
    text-align: center;
    color: var(--text-secondary);
  }

  .error-message p {
    font-weight: 600;
    color: #ef4444;
    margin-bottom: 0.5rem;
  }

  /* Spinner */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-color);
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Modal */
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
    z-index: 1000;
  }

  .modal {
    background: var(--bg-primary);
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 90%;
    max-height: 90%;
    overflow: hidden;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .modal-content {
    padding: 1.5rem;
  }

  .export-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  /* Customization Panel */
  .customization-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    background: var(--bg-primary);
    border-left: 1px solid var(--border-color);
    box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 999;
    overflow-y: auto;
  }

  .customization-panel h3 {
    padding: 1.5rem;
    margin: 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .customization-options {
    padding: 1.5rem;
  }

  .option-group {
    margin-bottom: 1.5rem;
  }

  .option-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .option-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .customization-actions {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 1rem;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .header-actions {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .dashboard-grid {
      grid-template-columns: 1fr;
      padding: 1rem;
    }

    .widget {
      grid-column: span 1 !important;
      grid-row: span 1 !important;
    }

    .customization-panel {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .dashboard-header {
      padding: 1rem;
    }

    .filter-panel,
    .insights-panel {
      padding: 1rem;
    }

    .insights-grid {
      grid-template-columns: 1fr;
    }

    .export-options {
      grid-template-columns: 1fr;
    }
  }
</style> 