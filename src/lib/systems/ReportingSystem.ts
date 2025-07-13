export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  type: 'dashboard' | 'chart' | 'table' | 'kpi' | 'map' | 'custom';
  category: string;
  tags: string[];
  datasource: DataSource;
  visualization: VisualizationConfig;
  filters: ReportFilter[];
  parameters: ReportParameter[];
  scheduling: SchedulingConfig;
  access: AccessConfig;
  metadata: ReportMetadata;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  version: number;
  isPublic: boolean;
  isTemplate: boolean;
}

export interface DataSource {
  type: 'sql' | 'api' | 'file' | 'realtime' | 'aggregated' | 'custom';
  connection: ConnectionConfig;
  query: QueryConfig;
  cache: CacheConfig;
  refresh: RefreshConfig;
  transformation: TransformationConfig;
}

export interface ConnectionConfig {
  // SQL connection
  sql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    timeout: number;
  };
  
  // API connection
  api?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    authentication: AuthenticationConfig;
    timeout: number;
  };
  
  // File connection
  file?: {
    path: string;
    format: 'csv' | 'json' | 'xml' | 'excel' | 'parquet';
    delimiter?: string;
    encoding?: string;
    hasHeader?: boolean;
  };
  
  // Realtime connection
  realtime?: {
    type: 'websocket' | 'sse' | 'polling';
    url: string;
    interval?: number;
    authentication?: AuthenticationConfig;
  };
}

export interface AuthenticationConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'apikey';
  credentials: Record<string, string>;
}

export interface QueryConfig {
  // SQL query
  sql?: string;
  
  // API query
  api?: {
    path: string;
    params: Record<string, any>;
    body?: any;
  };
  
  // File query
  file?: {
    sheet?: string;
    range?: string;
    filter?: string;
  };
  
  // Aggregation query
  aggregation?: {
    groupBy: string[];
    aggregations: AggregationFunction[];
    having?: string;
    orderBy?: string;
    limit?: number;
  };
}

export interface AggregationFunction {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'stddev' | 'variance' | 'percentile';
  alias?: string;
  parameters?: Record<string, any>;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  key?: string;
  invalidation: 'time' | 'manual' | 'dependency';
}

export interface RefreshConfig {
  enabled: boolean;
  interval: number; // Refresh interval in seconds
  schedule?: string; // Cron expression
  onDemand: boolean;
  autoRefresh: boolean;
}

export interface TransformationConfig {
  enabled: boolean;
  steps: TransformationStep[];
}

export interface TransformationStep {
  type: 'filter' | 'map' | 'reduce' | 'sort' | 'group' | 'join' | 'pivot' | 'aggregate' | 'calculate' | 'custom';
  config: Record<string, any>;
  condition?: string;
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'histogram' | 'heatmap' | 'treemap' | 'gauge' | 'table' | 'kpi' | 'map' | 'custom';
  title: string;
  subtitle?: string;
  axes: AxisConfig[];
  series: SeriesConfig[];
  formatting: FormattingConfig;
  interactivity: InteractivityConfig;
  styling: StylingConfig;
  responsive: ResponsiveConfig;
  animation: AnimationConfig;
}

export interface AxisConfig {
  position: 'left' | 'right' | 'top' | 'bottom';
  label: string;
  type: 'linear' | 'logarithmic' | 'datetime' | 'category';
  min?: number;
  max?: number;
  format?: string;
  ticks?: TickConfig;
  grid?: GridConfig;
}

export interface TickConfig {
  count?: number;
  interval?: number;
  format?: string;
  rotation?: number;
}

export interface GridConfig {
  enabled: boolean;
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface SeriesConfig {
  name: string;
  type: 'line' | 'bar' | 'area' | 'scatter' | 'bubble';
  data: string; // Field name or expression
  color?: string;
  size?: number;
  style?: SeriesStyle;
  markers?: MarkerConfig;
  labels?: LabelConfig;
  tooltip?: TooltipConfig;
}

export interface SeriesStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  opacity?: number;
}

export interface MarkerConfig {
  enabled: boolean;
  type: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'cross';
  size?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface LabelConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  format?: string;
  rotation?: number;
  offset?: number;
}

export interface TooltipConfig {
  enabled: boolean;
  format?: string;
  template?: string;
  position?: 'mouse' | 'fixed';
  delay?: number;
}

export interface FormattingConfig {
  numberFormat?: string;
  dateFormat?: string;
  currency?: string;
  precision?: number;
  thousands?: string;
  decimal?: string;
  percentage?: boolean;
}

export interface InteractivityConfig {
  zoom: boolean;
  pan: boolean;
  selection: boolean;
  crossfilter: boolean;
  drill: DrillConfig;
  onClick?: string;
  onHover?: string;
}

export interface DrillConfig {
  enabled: boolean;
  levels: DrillLevel[];
  backButton: boolean;
  breadcrumbs: boolean;
}

export interface DrillLevel {
  field: string;
  label: string;
  target?: string;
}

export interface StylingConfig {
  theme: 'light' | 'dark' | 'custom';
  colorScheme: string[];
  background?: string;
  border?: string;
  font?: FontConfig;
  layout?: LayoutConfig;
}

export interface FontConfig {
  family: string;
  size: number;
  weight: 'normal' | 'bold' | 'lighter' | 'bolder';
  style: 'normal' | 'italic' | 'oblique';
  color: string;
}

export interface LayoutConfig {
  margin: MarginConfig;
  padding: PaddingConfig;
  spacing: number;
  alignment: 'left' | 'center' | 'right';
}

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResponsiveConfig {
  enabled: boolean;
  breakpoints: BreakpointConfig[];
  aspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface BreakpointConfig {
  width: number;
  height?: number;
  config: Partial<VisualizationConfig>;
}

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
  stagger?: number;
}

export interface ReportFilter {
  id: string;
  field: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'range' | 'boolean' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater' | 'less' | 'between' | 'is_null' | 'is_not_null';
  value?: any;
  options?: FilterOption[];
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
  dependent?: string[];
  cascade?: boolean;
}

export interface FilterOption {
  value: any;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  value: any;
  description?: string;
  required?: boolean;
  validation?: ValidationRule[];
}

export interface SchedulingConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  timezone: string;
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'image';
  delivery: DeliveryConfig;
  conditions?: SchedulingCondition[];
}

export interface DeliveryConfig {
  method: 'email' | 'ftp' | 'sftp' | 'webhook' | 'storage' | 'print';
  config: Record<string, any>;
  recipients?: string[];
  subject?: string;
  message?: string;
}

export interface SchedulingCondition {
  type: 'data_change' | 'threshold' | 'custom';
  config: Record<string, any>;
}

export interface AccessConfig {
  public: boolean;
  users: string[];
  groups: string[];
  permissions: Permission[];
  sharing: SharingConfig;
}

export interface Permission {
  type: 'view' | 'edit' | 'delete' | 'share' | 'export' | 'schedule';
  granted: boolean;
  condition?: string;
}

export interface SharingConfig {
  enabled: boolean;
  expiration?: Date;
  password?: string;
  downloadable: boolean;
  embeddable: boolean;
  publicLink?: string;
}

export interface ReportMetadata {
  description: string;
  documentation: string;
  examples: string[];
  dependencies: string[];
  performance: PerformanceMetrics;
  usage: UsageMetrics;
  quality: QualityMetrics;
}

export interface PerformanceMetrics {
  avgExecutionTime: number;
  avgDataSize: number;
  cacheHitRate: number;
  errorRate: number;
  optimization: OptimizationInfo;
}

export interface UsageMetrics {
  totalViews: number;
  uniqueUsers: number;
  avgSessionTime: number;
  popularFilters: Record<string, number>;
  exportCount: number;
  lastAccessed: Date;
}

export interface QualityMetrics {
  dataFreshness: number;
  accuracy: number;
  completeness: number;
  consistency: number;
  reliability: number;
}

export interface OptimizationInfo {
  suggestions: string[];
  bottlenecks: string[];
  improvements: string[];
  lastAnalyzed: Date;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: GlobalFilter[];
  settings: DashboardSettings;
  metadata: DashboardMetadata;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  version: number;
  isPublic: boolean;
  isTemplate: boolean;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'tabs' | 'accordion' | 'custom';
  columns: number;
  rows: number;
  gap: number;
  responsive: boolean;
  breakpoints: LayoutBreakpoint[];
}

export interface LayoutBreakpoint {
  width: number;
  columns: number;
  gap?: number;
}

export interface DashboardWidget {
  id: string;
  reportId: string;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  filters: WidgetFilter[];
  interactivity: WidgetInteractivity;
  styling: WidgetStyling;
  visible: boolean;
  loading: boolean;
  error?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfig {
  refreshInterval?: number;
  autoRefresh?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  showBorder?: boolean;
  showControls?: boolean;
  exportable?: boolean;
  fullscreen?: boolean;
}

export interface WidgetFilter {
  field: string;
  value: any;
  operator: string;
  active: boolean;
}

export interface WidgetInteractivity {
  clickable: boolean;
  hoverable: boolean;
  selectable: boolean;
  filterable: boolean;
  crossfilter: boolean;
  drilldown: boolean;
}

export interface WidgetStyling {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: string;
  opacity?: number;
  animation?: string;
}

export interface GlobalFilter {
  id: string;
  field: string;
  label: string;
  type: string;
  value: any;
  targets: string[]; // Widget IDs
  active: boolean;
}

export interface DashboardSettings {
  theme: 'light' | 'dark' | 'custom';
  colorScheme: string[];
  autoRefresh: boolean;
  refreshInterval: number;
  fullscreen: boolean;
  navigation: NavigationConfig;
  export: ExportConfig;
  print: PrintConfig;
}

export interface NavigationConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  showTabs: boolean;
  showBreadcrumbs: boolean;
  showSearch: boolean;
}

export interface ExportConfig {
  enabled: boolean;
  formats: string[];
  quality: 'low' | 'medium' | 'high';
  includeTables: boolean;
  includeCharts: boolean;
  includeFilters: boolean;
}

export interface PrintConfig {
  enabled: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  margins: MarginConfig;
  scale: number;
  headers: boolean;
  footers: boolean;
}

export interface DashboardMetadata {
  description: string;
  documentation: string;
  tags: string[];
  category: string;
  permissions: AccessConfig;
  analytics: DashboardAnalytics;
}

export interface DashboardAnalytics {
  totalViews: number;
  uniqueUsers: number;
  avgSessionTime: number;
  bounceRate: number;
  interactionRate: number;
  popularWidgets: Record<string, number>;
  usage: UsagePattern[];
}

export interface UsagePattern {
  timestamp: Date;
  userId: string;
  sessionId: string;
  action: string;
  widgetId?: string;
  duration: number;
  metadata: Record<string, any>;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  parameters: Record<string, any>;
  filters: Record<string, any>;
  result?: ReportResult;
  error?: ExecutionError;
  metadata: ExecutionMetadata;
}

export interface ReportResult {
  data: any[];
  columns: ColumnInfo[];
  totalRows: number;
  executionTime: number;
  dataSize: number;
  cached: boolean;
  freshness: Date;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  foreignKey?: string;
  format?: string;
  description?: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  details: string;
  timestamp: Date;
  stack?: string;
  context?: Record<string, any>;
}

export interface ExecutionMetadata {
  userId: string;
  sessionId: string;
  userAgent: string;
  ip: string;
  referer?: string;
  environment: string;
  version: string;
}

export class ReportingSystem {
  private reports: Map<string, ReportDefinition>;
  private dashboards: Map<string, Dashboard>;
  private executions: Map<string, ReportExecution>;
  private cache: Map<string, any>;
  private config: ReportingConfig;
  private analytics: ReportingAnalytics;
  private scheduler: ReportScheduler;

  constructor(config?: Partial<ReportingConfig>) {
    this.reports = new Map();
    this.dashboards = new Map();
    this.executions = new Map();
    this.cache = new Map();
    this.config = this.mergeConfig(config);
    this.analytics = this.initializeAnalytics();
    this.scheduler = new ReportScheduler(this);
    
    this.loadReports();
    this.loadDashboards();
    this.initializeSystem();
  }

  private mergeConfig(config?: Partial<ReportingConfig>): ReportingConfig {
    const defaultConfig: ReportingConfig = {
      maxConcurrentExecutions: 5,
      executionTimeout: 300000, // 5 minutes
      cacheEnabled: true,
      cacheSize: 1000,
      cacheTTL: 3600, // 1 hour
      schedulingEnabled: true,
      analyticsEnabled: true,
      exportEnabled: true,
      securityEnabled: true,
      performanceOptimization: true,
      realTimeUpdates: true,
      maxDataSize: 10000000, // 10MB
      maxExecutionHistory: 1000,
      defaultPageSize: 100,
      maxPageSize: 1000
    };

    return { ...defaultConfig, ...config };
  }

  private initializeAnalytics(): ReportingAnalytics {
    const stored = localStorage.getItem('reporting_analytics');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    }

    return {
      totalExecutions: 0,
      totalReports: 0,
      totalDashboards: 0,
      avgExecutionTime: 0,
      successRate: 0,
      cacheHitRate: 0,
      popularReports: [],
      performanceMetrics: {
        avgQueryTime: 0,
        avgRenderTime: 0,
        avgDataSize: 0,
        errorRate: 0,
        throughput: 0
      },
      userActivity: {
        activeUsers: 0,
        totalSessions: 0,
        avgSessionTime: 0,
        bounceRate: 0,
        engagementScore: 0
      }
    };
  }

  private loadReports(): void {
    const reportsData = localStorage.getItem('reporting_reports');
    if (reportsData) {
      try {
        const reports = JSON.parse(reportsData);
        this.reports = new Map(reports);
      } catch (error) {
        console.error('Failed to load reports:', error);
      }
    }
  }

  private saveReports(): void {
    const reportsArray = Array.from(this.reports.entries());
    localStorage.setItem('reporting_reports', JSON.stringify(reportsArray));
  }

  private loadDashboards(): void {
    const dashboardsData = localStorage.getItem('reporting_dashboards');
    if (dashboardsData) {
      try {
        const dashboards = JSON.parse(dashboardsData);
        this.dashboards = new Map(dashboards);
      } catch (error) {
        console.error('Failed to load dashboards:', error);
      }
    }
  }

  private saveDashboards(): void {
    const dashboardsArray = Array.from(this.dashboards.entries());
    localStorage.setItem('reporting_dashboards', JSON.stringify(dashboardsArray));
  }

  private initializeSystem(): void {
    // Start scheduled reports
    if (this.config.schedulingEnabled) {
      this.scheduler.start();
    }
    
    // Start cache cleanup
    if (this.config.cacheEnabled) {
      this.startCacheCleanup();
    }
    
    // Start analytics collection
    if (this.config.analyticsEnabled) {
      this.startAnalyticsCollection();
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 300000); // Every 5 minutes
  }

  private cleanupCache(): void {
    const now = Date.now();
    const ttlMs = this.config.cacheTTL * 1000;
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > ttlMs) {
        this.cache.delete(key);
      }
    });
  }

  private startAnalyticsCollection(): void {
    setInterval(() => {
      this.updateAnalytics();
    }, 60000); // Every minute
  }

  private updateAnalytics(): void {
    // Update analytics metrics
    this.analytics.totalReports = this.reports.size;
    this.analytics.totalDashboards = this.dashboards.size;
    
    // Calculate success rate
    const executions = Array.from(this.executions.values());
    const completed = executions.filter(e => e.status === 'completed').length;
    this.analytics.successRate = executions.length > 0 ? (completed / executions.length) * 100 : 0;
    
    // Calculate cache hit rate
    const cacheHits = Array.from(this.cache.values()).filter(v => v.hits > 0).length;
    this.analytics.cacheHitRate = this.cache.size > 0 ? (cacheHits / this.cache.size) * 100 : 0;
    
    this.saveAnalytics();
  }

  private saveAnalytics(): void {
    localStorage.setItem('reporting_analytics', JSON.stringify(this.analytics));
  }

  public async createReport(definition: Partial<ReportDefinition>): Promise<ReportDefinition> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const report: ReportDefinition = {
      id,
      name: definition.name || 'Untitled Report',
      description: definition.description || '',
      type: definition.type || 'chart',
      category: definition.category || 'general',
      tags: definition.tags || [],
      datasource: definition.datasource || {
        type: 'sql',
        connection: { sql: { host: '', port: 5432, database: '', username: '', password: '', ssl: false, timeout: 30000 } },
        query: { sql: '' },
        cache: { enabled: true, ttl: 3600, invalidation: 'time' },
        refresh: { enabled: true, interval: 300, onDemand: true, autoRefresh: false },
        transformation: { enabled: false, steps: [] }
      },
      visualization: definition.visualization || {
        type: 'line',
        title: 'Chart Title',
        axes: [],
        series: [],
        formatting: {},
        interactivity: { zoom: false, pan: false, selection: false, crossfilter: false, drill: { enabled: false, levels: [], backButton: false, breadcrumbs: false } },
        styling: { theme: 'light', colorScheme: [], font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal', color: '#000' }, layout: { margin: { top: 20, right: 20, bottom: 20, left: 20 }, padding: { top: 10, right: 10, bottom: 10, left: 10 }, spacing: 10, alignment: 'center' } },
        responsive: { enabled: true, breakpoints: [] },
        animation: { enabled: true, duration: 1000, easing: 'ease' }
      },
      filters: definition.filters || [],
      parameters: definition.parameters || [],
      scheduling: definition.scheduling || {
        enabled: false,
        schedule: '0 0 * * *',
        timezone: 'UTC',
        format: 'pdf',
        delivery: { method: 'email', config: {} }
      },
      access: definition.access || {
        public: false,
        users: [],
        groups: [],
        permissions: [],
        sharing: { enabled: false, downloadable: false, embeddable: false }
      },
      metadata: definition.metadata || {
        description: '',
        documentation: '',
        examples: [],
        dependencies: [],
        performance: { avgExecutionTime: 0, avgDataSize: 0, cacheHitRate: 0, errorRate: 0, optimization: { suggestions: [], bottlenecks: [], improvements: [], lastAnalyzed: now } },
        usage: { totalViews: 0, uniqueUsers: 0, avgSessionTime: 0, popularFilters: {}, exportCount: 0, lastAccessed: now },
        quality: { dataFreshness: 0, accuracy: 0, completeness: 0, consistency: 0, reliability: 0 }
      },
      createdAt: now,
      updatedAt: now,
      author: definition.author || 'system',
      version: 1,
      isPublic: definition.isPublic || false,
      isTemplate: definition.isTemplate || false
    };

    // Validate report
    const validation = await this.validateReport(report);
    if (!validation.valid) {
      throw new Error(`Report validation failed: ${validation.errors.join(', ')}`);
    }

    // Save report
    this.reports.set(id, report);
    this.saveReports();

    return report;
  }

  public async createDashboard(dashboard: Partial<Dashboard>): Promise<Dashboard> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const newDashboard: Dashboard = {
      id,
      name: dashboard.name || 'Untitled Dashboard',
      description: dashboard.description || '',
      layout: dashboard.layout || {
        type: 'grid',
        columns: 12,
        rows: 20,
        gap: 10,
        responsive: true,
        breakpoints: []
      },
      widgets: dashboard.widgets || [],
      filters: dashboard.filters || [],
      settings: dashboard.settings || {
        theme: 'light',
        colorScheme: [],
        autoRefresh: false,
        refreshInterval: 300,
        fullscreen: false,
        navigation: { enabled: true, position: 'top', showTabs: true, showBreadcrumbs: true, showSearch: true },
        export: { enabled: true, formats: ['pdf', 'excel'], quality: 'medium', includeTables: true, includeCharts: true, includeFilters: true },
        print: { enabled: true, orientation: 'landscape', pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 }, scale: 1, headers: true, footers: true }
      },
      metadata: dashboard.metadata || {
        description: '',
        documentation: '',
        tags: [],
        category: 'general',
        permissions: { public: false, users: [], groups: [], permissions: [], sharing: { enabled: false, downloadable: false, embeddable: false } },
        analytics: { totalViews: 0, uniqueUsers: 0, avgSessionTime: 0, bounceRate: 0, interactionRate: 0, popularWidgets: {}, usage: [] }
      },
      createdAt: now,
      updatedAt: now,
      author: dashboard.author || 'system',
      version: 1,
      isPublic: dashboard.isPublic || false,
      isTemplate: dashboard.isTemplate || false
    };

    // Save dashboard
    this.dashboards.set(id, newDashboard);
    this.saveDashboards();

    return newDashboard;
  }

  public async executeReport(reportId: string, parameters: Record<string, any> = {}, filters: Record<string, any> = {}): Promise<ReportExecution> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const executionId = crypto.randomUUID();
    const execution: ReportExecution = {
      id: executionId,
      reportId,
      status: 'running',
      startTime: new Date(),
      parameters,
      filters,
      metadata: {
        userId: 'current-user',
        sessionId: crypto.randomUUID(),
        userAgent: navigator.userAgent,
        ip: 'localhost',
        environment: 'production',
        version: '1.0.0'
      }
    };

    this.executions.set(executionId, execution);

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(reportId, parameters, filters);
      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        execution.result = cached.result;
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        return execution;
      }

      // Execute data source query
      const result = await this.executeDataSource(report.datasource, parameters, filters);
      
      // Apply transformations
      const transformedData = await this.applyTransformations(result, report.datasource.transformation);
      
      // Create report result
      execution.result = {
        data: transformedData,
        columns: this.inferColumns(transformedData),
        totalRows: transformedData.length,
        executionTime: Date.now() - execution.startTime.getTime(),
        dataSize: JSON.stringify(transformedData).length,
        cached: false,
        freshness: new Date()
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, {
          result: execution.result,
          timestamp: Date.now(),
          hits: 0
        });
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Update analytics
      this.analytics.totalExecutions++;
      this.analytics.avgExecutionTime = 
        (this.analytics.avgExecutionTime * (this.analytics.totalExecutions - 1) + execution.duration!) / 
        this.analytics.totalExecutions;

    } catch (error) {
      execution.status = 'failed';
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack || '' : '',
        timestamp: new Date()
      };
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    }

    return execution;
  }

  private async executeDataSource(datasource: DataSource, parameters: Record<string, any>, filters: Record<string, any>): Promise<any[]> {
    switch (datasource.type) {
      case 'sql':
        return this.executeSQLQuery(datasource, parameters, filters);
      case 'api':
        return this.executeAPIQuery(datasource, parameters, filters);
      case 'file':
        return this.executeFileQuery(datasource, parameters, filters);
      case 'aggregated':
        return this.executeAggregatedQuery(datasource, parameters, filters);
      default:
        throw new Error(`Unsupported datasource type: ${datasource.type}`);
    }
  }

  private async executeSQLQuery(datasource: DataSource, parameters: Record<string, any>, filters: Record<string, any>): Promise<any[]> {
    // Simulate SQL execution
    console.log('Executing SQL query:', datasource.query.sql);
    
    // Generate sample data
    const sampleData = [];
    for (let i = 0; i < 100; i++) {
      sampleData.push({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 100,
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        active: Math.random() > 0.5
      });
    }
    
    return sampleData;
  }

  private async executeAPIQuery(datasource: DataSource, parameters: Record<string, any>, filters: Record<string, any>): Promise<any[]> {
    // Simulate API execution
    console.log('Executing API query:', datasource.query.api);
    
    // Generate sample data
    return [
      { metric: 'users', value: 1250, change: 5.2 },
      { metric: 'sessions', value: 3420, change: -2.1 },
      { metric: 'revenue', value: 15780, change: 8.7 },
      { metric: 'conversion', value: 3.45, change: 1.2 }
    ];
  }

  private async executeFileQuery(datasource: DataSource, parameters: Record<string, any>, filters: Record<string, any>): Promise<any[]> {
    // Simulate file execution
    console.log('Executing file query:', datasource.query.file);
    
    // Generate sample data
    return [
      { product: 'Product A', sales: 150, profit: 45 },
      { product: 'Product B', sales: 200, profit: 60 },
      { product: 'Product C', sales: 120, profit: 35 },
      { product: 'Product D', sales: 180, profit: 55 }
    ];
  }

  private async executeAggregatedQuery(datasource: DataSource, parameters: Record<string, any>, filters: Record<string, any>): Promise<any[]> {
    // Simulate aggregated query execution
    console.log('Executing aggregated query:', datasource.query.aggregation);
    
    // Generate sample aggregated data
    return [
      { period: '2024-01', total: 1250, average: 41.7 },
      { period: '2024-02', total: 1420, average: 47.3 },
      { period: '2024-03', total: 1680, average: 54.2 },
      { period: '2024-04', total: 1520, average: 50.7 }
    ];
  }

  private async applyTransformations(data: any[], transformation: TransformationConfig): Promise<any[]> {
    if (!transformation.enabled || transformation.steps.length === 0) {
      return data;
    }

    let result = data;
    
    for (const step of transformation.steps) {
      result = await this.applyTransformationStep(result, step);
    }
    
    return result;
  }

  private async applyTransformationStep(data: any[], step: TransformationStep): Promise<any[]> {
    switch (step.type) {
      case 'filter':
        return data.filter(item => this.evaluateCondition(item, step.condition || 'true'));
      case 'map':
        return data.map(item => this.applyMapping(item, step.config));
      case 'sort':
        return data.sort((a, b) => this.compareValues(a, b, step.config));
      case 'group':
        return this.groupData(data, step.config);
      case 'aggregate':
        return this.aggregateData(data, step.config);
      default:
        return data;
    }
  }

  private evaluateCondition(item: any, condition: string): boolean {
    // Simple condition evaluation
    try {
      return new Function('item', `return ${condition}`)(item);
    } catch {
      return true;
    }
  }

  private applyMapping(item: any, config: Record<string, any>): any {
    const mapped = { ...item };
    
    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const expression = value.slice(2, -1);
        try {
          mapped[key] = new Function('item', `return ${expression}`)(item);
        } catch {
          mapped[key] = value;
        }
      } else {
        mapped[key] = value;
      }
    });
    
    return mapped;
  }

  private compareValues(a: any, b: any, config: Record<string, any>): number {
    const field = config.field || 'id';
    const order = config.order || 'asc';
    
    const aValue = a[field];
    const bValue = b[field];
    
    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;
    
    return order === 'desc' ? -comparison : comparison;
  }

  private groupData(data: any[], config: Record<string, any>): any[] {
    const groupBy = config.groupBy || 'category';
    const grouped = new Map();
    
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(item);
    });
    
    return Array.from(grouped.entries()).map(([key, items]) => ({
      [groupBy]: key,
      items,
      count: items.length
    }));
  }

  private aggregateData(data: any[], config: Record<string, any>): any[] {
    const aggregations = config.aggregations || [];
    const result = {};
    
    aggregations.forEach((agg: any) => {
      const field = agg.field;
      const func = agg.function;
      const values = data.map(item => item[field]).filter(v => v !== undefined);
      
      switch (func) {
        case 'sum':
          result[agg.alias || field] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          result[agg.alias || field] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          result[agg.alias || field] = values.length;
          break;
        case 'min':
          result[agg.alias || field] = Math.min(...values);
          break;
        case 'max':
          result[agg.alias || field] = Math.max(...values);
          break;
      }
    });
    
    return [result];
  }

  private inferColumns(data: any[]): ColumnInfo[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).map(key => ({
      name: key,
      type: this.inferType(sample[key]),
      nullable: data.some(item => item[key] === null || item[key] === undefined),
      unique: false,
      primaryKey: false,
      format: this.inferFormat(sample[key])
    }));
  }

  private inferType(value: any): 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private inferFormat(value: any): string | undefined {
    if (typeof value === 'number') {
      return value % 1 === 0 ? '0' : '0.00';
    }
    if (value instanceof Date) {
      return 'YYYY-MM-DD';
    }
    return undefined;
  }

  private getCacheKey(reportId: string, parameters: Record<string, any>, filters: Record<string, any>): string {
    return `${reportId}:${JSON.stringify(parameters)}:${JSON.stringify(filters)}`;
  }

  private async validateReport(report: ReportDefinition): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!report.name || report.name.trim().length === 0) {
      errors.push('Report name is required');
    }
    
    if (!report.datasource || !report.datasource.type) {
      errors.push('Datasource is required');
    }
    
    if (!report.visualization || !report.visualization.type) {
      errors.push('Visualization configuration is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  public getReport(id: string): ReportDefinition | undefined {
    return this.reports.get(id);
  }

  public getReports(): ReportDefinition[] {
    return Array.from(this.reports.values());
  }

  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  public getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getExecution(id: string): ReportExecution | undefined {
    return this.executions.get(id);
  }

  public getExecutions(reportId?: string): ReportExecution[] {
    const executions = Array.from(this.executions.values());
    return reportId ? executions.filter(e => e.reportId === reportId) : executions;
  }

  public getAnalytics(): ReportingAnalytics {
    return { ...this.analytics };
  }

  public getSystemStatus(): {
    totalReports: number;
    totalDashboards: number;
    totalExecutions: number;
    cacheSize: number;
    avgExecutionTime: number;
    successRate: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  } {
    const systemHealth = this.analytics.successRate > 95 ? 'healthy' : 
                        this.analytics.successRate > 80 ? 'warning' : 'error';
    
    return {
      totalReports: this.reports.size,
      totalDashboards: this.dashboards.size,
      totalExecutions: this.executions.size,
      cacheSize: this.cache.size,
      avgExecutionTime: this.analytics.avgExecutionTime,
      successRate: this.analytics.successRate,
      systemHealth
    };
  }

  public exportConfiguration(): string {
    return JSON.stringify({
      reports: Array.from(this.reports.entries()),
      dashboards: Array.from(this.dashboards.entries()),
      config: this.config,
      analytics: this.analytics
    }, null, 2);
  }

  public importConfiguration(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.reports) {
        this.reports = new Map(parsed.reports);
        this.saveReports();
      }
      
      if (parsed.dashboards) {
        this.dashboards = new Map(parsed.dashboards);
        this.saveDashboards();
      }
      
      if (parsed.config) {
        this.config = parsed.config;
      }
      
      if (parsed.analytics) {
        this.analytics = parsed.analytics;
        this.saveAnalytics();
      }
      
    } catch (error) {
      console.error('Failed to import configuration:', error);
    }
  }

  public destroy(): void {
    this.scheduler.stop();
    this.reports.clear();
    this.dashboards.clear();
    this.executions.clear();
    this.cache.clear();
  }
}

// Report Scheduler
class ReportScheduler {
  private reportingSystem: ReportingSystem;
  private scheduledTasks: Map<string, NodeJS.Timeout>;
  private isRunning: boolean;

  constructor(reportingSystem: ReportingSystem) {
    this.reportingSystem = reportingSystem;
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleReports();
  }

  public stop(): void {
    this.isRunning = false;
    this.scheduledTasks.forEach(taskId => clearInterval(taskId));
    this.scheduledTasks.clear();
  }

  private scheduleReports(): void {
    const reports = this.reportingSystem.getReports();
    
    reports.forEach(report => {
      if (report.scheduling.enabled) {
        this.scheduleReport(report);
      }
    });
  }

  private scheduleReport(report: ReportDefinition): void {
    // Simple scheduling - in production, use a proper cron library
    const interval = this.parseCronExpression(report.scheduling.schedule);
    if (interval) {
      const taskId = setInterval(() => {
        this.executeScheduledReport(report);
      }, interval);
      
      this.scheduledTasks.set(report.id, taskId);
    }
  }

  private parseCronExpression(cron: string): number | null {
    // Simplified cron parsing
    if (cron === '0 0 * * *') return 86400000; // Daily
    if (cron === '0 * * * *') return 3600000; // Hourly
    if (cron === '* * * * *') return 60000; // Every minute
    
    return null;
  }

  private async executeScheduledReport(report: ReportDefinition): Promise<void> {
    try {
      const execution = await this.reportingSystem.executeReport(report.id);
      
      if (execution.status === 'completed' && execution.result) {
        await this.deliverReport(report, execution.result);
      }
    } catch (error) {
      console.error(`Scheduled report execution failed: ${report.id}`, error);
    }
  }

  private async deliverReport(report: ReportDefinition, result: ReportResult): Promise<void> {
    const delivery = report.scheduling.delivery;
    
    switch (delivery.method) {
      case 'email':
        await this.sendEmailReport(report, result, delivery);
        break;
      case 'webhook':
        await this.sendWebhookReport(report, result, delivery);
        break;
      default:
        console.log(`Unsupported delivery method: ${delivery.method}`);
    }
  }

  private async sendEmailReport(report: ReportDefinition, result: ReportResult, delivery: DeliveryConfig): Promise<void> {
    // Simulate email sending
    console.log(`Sending email report: ${report.name}`, {
      recipients: delivery.recipients,
      subject: delivery.subject || `Report: ${report.name}`,
      data: result.data
    });
  }

  private async sendWebhookReport(report: ReportDefinition, result: ReportResult, delivery: DeliveryConfig): Promise<void> {
    // Simulate webhook sending
    console.log(`Sending webhook report: ${report.name}`, {
      url: delivery.config.url,
      data: result.data
    });
  }
}

// Interfaces for configuration and analytics
interface ReportingConfig {
  maxConcurrentExecutions: number;
  executionTimeout: number;
  cacheEnabled: boolean;
  cacheSize: number;
  cacheTTL: number;
  schedulingEnabled: boolean;
  analyticsEnabled: boolean;
  exportEnabled: boolean;
  securityEnabled: boolean;
  performanceOptimization: boolean;
  realTimeUpdates: boolean;
  maxDataSize: number;
  maxExecutionHistory: number;
  defaultPageSize: number;
  maxPageSize: number;
}

interface ReportingAnalytics {
  totalExecutions: number;
  totalReports: number;
  totalDashboards: number;
  avgExecutionTime: number;
  successRate: number;
  cacheHitRate: number;
  popularReports: string[];
  performanceMetrics: {
    avgQueryTime: number;
    avgRenderTime: number;
    avgDataSize: number;
    errorRate: number;
    throughput: number;
  };
  userActivity: {
    activeUsers: number;
    totalSessions: number;
    avgSessionTime: number;
    bounceRate: number;
    engagementScore: number;
  };
}

export const reportingSystem = new ReportingSystem(); 