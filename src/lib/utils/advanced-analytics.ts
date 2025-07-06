/**
 * Advanced Analytics and Business Intelligence System
 * Comprehensive data analysis with predictive modeling and real-time insights
 */

export interface AnalyticsConfig {
  enableRealTimeAnalytics: boolean;
  enablePredictiveModeling: boolean;
  enableAnomalyDetection: boolean;
  dataRetentionPeriod: number; // days
  samplingRate: number; // 0-1
  privacyMode: boolean;
  aggregationInterval: number; // minutes
}

export interface MetricDefinition {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'rate' | 'percentage';
  category: 'performance' | 'user' | 'business' | 'technical' | 'environmental';
  unit: string;
  description: string;
  tags: string[];
  aggregations: ('sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile')[];
}

export interface DataPoint {
  metricId: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  sessionId?: string;
  userId?: string;
  location?: { lat: number; lng: number };
}

export interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'correlation' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  evidence: any[];
  actionable: boolean;
  recommendations?: string[];
  timestamp: number;
  expiresAt?: number;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
  filters: Filter[];
  refreshInterval: number;
  isPublic: boolean;
  createdBy: string;
}

export interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap' | 'gauge' | 'alert';
  title: string;
  config: {
    metrics: string[];
    chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
    timeRange: string;
    aggregation: string;
    groupBy?: string[];
    filters?: Filter[];
  };
  position: { x: number; y: number; width: number; height: number };
}

export interface Filter {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'linear' | 'polynomial' | 'exponential' | 'neural' | 'arima';
  targetMetric: string;
  features: string[];
  accuracy: number;
  lastTrained: number;
  predictions: Array<{ timestamp: number; value: number; confidence: number }>;
}

export interface AnomalyDetection {
  algorithm: 'zscore' | 'isolation_forest' | 'local_outlier' | 'statistical';
  threshold: number;
  sensitivity: number;
  minSamples: number;
}

class AdvancedAnalytics {
  private config: AnalyticsConfig;
  private metrics: Map<string, MetricDefinition> = new Map();
  private dataPoints: DataPoint[] = [];
  private insights: Insight[] = [];
  private dashboards: Map<string, Dashboard> = new Map();
  private models: Map<string, PredictionModel> = new Map();
  
  // Real-time processing
  private realtimeBuffer: DataPoint[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  private anomalyDetector: AnomalyDetection | null = null;
  
  // Statistical calculations
  private statisticsCache: Map<string, {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    count: number;
    percentiles: Record<number, number>;
    timestamp: number;
  }> = new Map();
  
  // Callbacks
  private onInsightCallback: ((insight: Insight) => void) | null = null;
  private onAnomalyCallback: ((anomaly: DataPoint) => void) | null = null;
  private onModelUpdateCallback: ((model: PredictionModel) => void) | null = null;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableRealTimeAnalytics: true,
      enablePredictiveModeling: true,
      enableAnomalyDetection: true,
      dataRetentionPeriod: 90,
      samplingRate: 1.0,
      privacyMode: false,
      aggregationInterval: 5,
      ...config
    };

    this.initializeAnalytics();
  }

  /**
   * Initialize analytics system
   */
  private initializeAnalytics(): void {
    this.defineStandardMetrics();
    this.setupAnomalyDetection();
    
    if (this.config.enableRealTimeAnalytics) {
      this.startRealtimeProcessing();
    }
    
    // Start background tasks
    this.startDataRetentionCleanup();
    this.startStatisticsCalculation();
    
    console.log('[AdvancedAnalytics] Analytics system initialized');
  }

  /**
   * Define standard metrics
   */
  private defineStandardMetrics(): void {
    const standardMetrics: MetricDefinition[] = [
      {
        id: 'scan_count',
        name: 'Scan Count',
        type: 'counter',
        category: 'user',
        unit: 'scans',
        description: 'Total number of waste scans performed',
        tags: ['scanning', 'user-activity'],
        aggregations: ['sum', 'count']
      },
      {
        id: 'scan_accuracy',
        name: 'Scan Accuracy',
        type: 'percentage',
        category: 'performance',
        unit: '%',
        description: 'Accuracy of waste classification',
        tags: ['ml', 'accuracy'],
        aggregations: ['avg', 'min', 'max', 'percentile']
      },
      {
        id: 'response_time',
        name: 'Response Time',
        type: 'histogram',
        category: 'performance',
        unit: 'ms',
        description: 'Time taken for ML inference',
        tags: ['performance', 'latency'],
        aggregations: ['avg', 'percentile']
      },
      {
        id: 'user_engagement',
        name: 'User Engagement',
        type: 'gauge',
        category: 'user',
        unit: 'score',
        description: 'User engagement score based on activity',
        tags: ['engagement', 'user-behavior'],
        aggregations: ['avg', 'sum']
      },
      {
        id: 'waste_categories',
        name: 'Waste Categories',
        type: 'counter',
        category: 'environmental',
        unit: 'items',
        description: 'Distribution of waste categories detected',
        tags: ['environment', 'waste-types'],
        aggregations: ['sum', 'count']
      },
      {
        id: 'recycling_rate',
        name: 'Recycling Rate',
        type: 'percentage',
        category: 'environmental',
        unit: '%',
        description: 'Percentage of recyclable items identified',
        tags: ['recycling', 'sustainability'],
        aggregations: ['avg', 'sum']
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        type: 'rate',
        category: 'technical',
        unit: 'errors/min',
        description: 'Rate of errors occurring in the system',
        tags: ['errors', 'reliability'],
        aggregations: ['avg', 'max', 'sum']
      },
      {
        id: 'memory_usage',
        name: 'Memory Usage',
        type: 'gauge',
        category: 'technical',
        unit: 'MB',
        description: 'Memory consumption of the application',
        tags: ['performance', 'resources'],
        aggregations: ['avg', 'max']
      }
    ];

    standardMetrics.forEach(metric => {
      this.metrics.set(metric.id, metric);
    });
  }

  /**
   * Setup anomaly detection
   */
  private setupAnomalyDetection(): void {
    if (!this.config.enableAnomalyDetection) return;

    this.anomalyDetector = {
      algorithm: 'zscore',
      threshold: 2.5,
      sensitivity: 0.8,
      minSamples: 10
    };
  }

  /**
   * Start real-time processing
   */
  private startRealtimeProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processRealtimeData();
    }, this.config.aggregationInterval * 60 * 1000);
  }

  /**
   * Record a data point
   */
  recordDataPoint(
    metricId: string,
    value: number,
    tags: Record<string, string> = {},
    metadata?: { sessionId?: string; userId?: string; location?: { lat: number; lng: number } }
  ): void {
    // Apply sampling rate
    if (Math.random() > this.config.samplingRate) return;

    const dataPoint: DataPoint = {
      metricId,
      value,
      timestamp: Date.now(),
      tags: this.config.privacyMode ? this.anonymizeTags(tags) : tags,
      ...metadata
    };

    this.dataPoints.push(dataPoint);
    
    if (this.config.enableRealTimeAnalytics) {
      this.realtimeBuffer.push(dataPoint);
    }

    // Check for anomalies
    if (this.config.enableAnomalyDetection) {
      this.checkForAnomalies(dataPoint);
    }
  }

  /**
   * Anonymize tags for privacy
   */
  private anonymizeTags(tags: Record<string, string>): Record<string, string> {
    const anonymized: Record<string, string> = {};
    
    Object.entries(tags).forEach(([key, value]) => {
      // Hash sensitive values
      if (['userId', 'sessionId', 'ip', 'email'].includes(key)) {
        anonymized[key] = this.hashValue(value);
      } else {
        anonymized[key] = value;
      }
    });

    return anonymized;
  }

  /**
   * Hash sensitive values
   */
  private hashValue(value: string): string {
    // Simple hash function for demo - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Process real-time data
   */
  private processRealtimeData(): void {
    if (this.realtimeBuffer.length === 0) return;

    const bufferCopy = [...this.realtimeBuffer];
    this.realtimeBuffer = [];

    // Group by metric and calculate aggregations
    const metricGroups = this.groupDataPointsByMetric(bufferCopy);
    
    metricGroups.forEach((dataPoints, metricId) => {
      this.calculateRealtimeAggregations(metricId, dataPoints);
      this.detectTrends(metricId, dataPoints);
    });

    // Generate insights
    this.generateInsights(bufferCopy);
  }

  /**
   * Group data points by metric
   */
  private groupDataPointsByMetric(dataPoints: DataPoint[]): Map<string, DataPoint[]> {
    const groups = new Map<string, DataPoint[]>();
    
    dataPoints.forEach(point => {
      if (!groups.has(point.metricId)) {
        groups.set(point.metricId, []);
      }
      groups.get(point.metricId)!.push(point);
    });

    return groups;
  }

  /**
   * Calculate real-time aggregations
   */
  private calculateRealtimeAggregations(metricId: string, dataPoints: DataPoint[]): void {
    const values = dataPoints.map(p => p.value);
    
    if (values.length === 0) return;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // Calculate percentiles
    const percentiles: Record<number, number> = {};
    [50, 75, 90, 95, 99].forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      percentiles[p] = sorted[Math.max(0, index)];
    });

    this.statisticsCache.set(metricId, {
      mean,
      median: percentiles[50],
      std,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      percentiles,
      timestamp: Date.now()
    });
  }

  /**
   * Detect trends in data
   */
  private detectTrends(metricId: string, dataPoints: DataPoint[]): void {
    if (dataPoints.length < 5) return;

    const timeSeries = dataPoints
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(p => ({ x: p.timestamp, y: p.value }));

    // Simple linear regression
    const n = timeSeries.length;
    const sumX = timeSeries.reduce((sum, point) => sum + point.x, 0);
    const sumY = timeSeries.reduce((sum, point) => sum + point.y, 0);
    const sumXY = timeSeries.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = timeSeries.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend significance
    const metric = this.metrics.get(metricId);
    if (!metric) return;

    const trendThreshold = this.getTrendThreshold(metric.type);
    
    if (Math.abs(slope) > trendThreshold) {
      const trendType = slope > 0 ? 'increasing' : 'decreasing';
      
      this.generateInsight({
        type: 'trend',
        severity: 'medium',
        title: `${metric.name} ${trendType} trend detected`,
        description: `${metric.name} shows a ${trendType} trend with slope ${slope.toFixed(4)}`,
        confidence: Math.min(0.9, Math.abs(slope) / trendThreshold),
        evidence: [{ slope, intercept, dataPoints: timeSeries.length }],
        actionable: true,
        recommendations: this.getTrendRecommendations(metricId, trendType)
      });
    }
  }

  /**
   * Get trend threshold for metric type
   */
  private getTrendThreshold(metricType: MetricDefinition['type']): number {
    const thresholds = {
      counter: 0.1,
      gauge: 0.05,
      histogram: 0.02,
      rate: 0.15,
      percentage: 0.01
    };
    
    return thresholds[metricType] || 0.1;
  }

  /**
   * Get trend recommendations
   */
  private getTrendRecommendations(metricId: string, trendType: string): string[] {
    const recommendations: Record<string, Record<string, string[]>> = {
      response_time: {
        increasing: [
          'Consider optimizing ML model inference',
          'Check for memory leaks or resource contention',
          'Implement caching for frequently scanned items'
        ],
        decreasing: [
          'Monitor for continued improvement',
          'Document optimization techniques used'
        ]
      },
      error_rate: {
        increasing: [
          'Investigate recent changes or deployments',
          'Check system resources and dependencies',
          'Review error logs for patterns'
        ],
        decreasing: [
          'Continue monitoring stability improvements'
        ]
      },
      scan_accuracy: {
        increasing: [
          'Validate model improvements',
          'Consider expanding to more complex scenarios'
        ],
        decreasing: [
          'Review recent model changes',
          'Check data quality and preprocessing',
          'Consider retraining with additional data'
        ]
      }
    };

    return recommendations[metricId]?.[trendType] || [
      `Monitor ${metricId} ${trendType} trend`,
      'Investigate underlying causes'
    ];
  }

  /**
   * Check for anomalies
   */
  private checkForAnomalies(dataPoint: DataPoint): void {
    if (!this.anomalyDetector) return;

    const recentPoints = this.getRecentDataPoints(
      dataPoint.metricId,
      this.anomalyDetector.minSamples
    );

    if (recentPoints.length < this.anomalyDetector.minSamples) return;

    const values = recentPoints.map(p => p.value);
    const isAnomaly = this.detectAnomaly(dataPoint.value, values);

    if (isAnomaly) {
      this.onAnomalyCallback?.(dataPoint);
      
      this.generateInsight({
        type: 'anomaly',
        severity: 'high',
        title: `Anomaly detected in ${dataPoint.metricId}`,
        description: `Value ${dataPoint.value} is significantly different from recent values`,
        confidence: 0.8,
        evidence: [{ value: dataPoint.value, recentValues: values }],
        actionable: true,
        recommendations: [`Investigate cause of anomalous ${dataPoint.metricId} value`]
      });
    }
  }

  /**
   * Detect anomaly using specified algorithm
   */
  private detectAnomaly(value: number, historicalValues: number[]): boolean {
    if (!this.anomalyDetector) return false;

    switch (this.anomalyDetector.algorithm) {
      case 'zscore':
        return this.zScoreAnomaly(value, historicalValues);
      case 'isolation_forest':
        return this.isolationForestAnomaly(value, historicalValues);
      case 'statistical':
        return this.statisticalAnomaly(value, historicalValues);
      default:
        return false;
    }
  }

  /**
   * Z-score based anomaly detection
   */
  private zScoreAnomaly(value: number, values: number[]): boolean {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    if (std === 0) return false;
    
    const zScore = Math.abs((value - mean) / std);
    return zScore > this.anomalyDetector!.threshold;
  }

  /**
   * Statistical anomaly detection using IQR
   */
  private statisticalAnomaly(value: number, values: number[]): boolean {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return value < lowerBound || value > upperBound;
  }

  /**
   * Simplified isolation forest anomaly detection
   */
  private isolationForestAnomaly(value: number, values: number[]): boolean {
    // Simplified version - real implementation would use proper isolation forest
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
    
    if (range === 0) return false;
    
    const normalizedValue = (value - min) / range;
    return normalizedValue < 0.05 || normalizedValue > 0.95;
  }

  /**
   * Get recent data points for a metric
   */
  private getRecentDataPoints(metricId: string, count: number): DataPoint[] {
    return this.dataPoints
      .filter(p => p.metricId === metricId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Generate insights from data
   */
  private generateInsights(dataPoints: DataPoint[]): void {
    // Generate correlation insights
    this.generateCorrelationInsights(dataPoints);
    
    // Generate performance insights
    this.generatePerformanceInsights(dataPoints);
    
    // Generate business insights
    this.generateBusinessInsights(dataPoints);
  }

  /**
   * Generate correlation insights
   */
  private generateCorrelationInsights(dataPoints: DataPoint[]): void {
    const metricGroups = this.groupDataPointsByMetric(dataPoints);
    const metricIds = Array.from(metricGroups.keys());
    
    // Check correlations between metrics
    for (let i = 0; i < metricIds.length; i++) {
      for (let j = i + 1; j < metricIds.length; j++) {
        const correlation = this.calculateCorrelation(
          metricGroups.get(metricIds[i])!,
          metricGroups.get(metricIds[j])!
        );
        
        if (Math.abs(correlation) > 0.7) {
          this.generateInsight({
            type: 'correlation',
            severity: 'medium',
            title: `Strong correlation detected`,
            description: `${metricIds[i]} and ${metricIds[j]} show ${correlation > 0 ? 'positive' : 'negative'} correlation (${correlation.toFixed(3)})`,
            confidence: Math.abs(correlation),
            evidence: [{ metric1: metricIds[i], metric2: metricIds[j], correlation }],
            actionable: true,
            recommendations: [
              `Investigate relationship between ${metricIds[i]} and ${metricIds[j]}`,
              'Consider optimization opportunities based on this correlation'
            ]
          });
        }
      }
    }
  }

  /**
   * Calculate correlation between two metric series
   */
  private calculateCorrelation(series1: DataPoint[], series2: DataPoint[]): number {
    if (series1.length === 0 || series2.length === 0) return 0;
    
    const values1 = series1.map(p => p.value);
    const values2 = series2.map(p => p.value);
    
    const n = Math.min(values1.length, values2.length);
    if (n < 2) return 0;
    
    const mean1 = values1.slice(0, n).reduce((sum, v) => sum + v, 0) / n;
    const mean2 = values2.slice(0, n).reduce((sum, v) => sum + v, 0) / n;
    
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate performance insights
   */
  private generatePerformanceInsights(dataPoints: DataPoint[]): void {
    const responseTimePoints = dataPoints.filter(p => p.metricId === 'response_time');
    const memoryPoints = dataPoints.filter(p => p.metricId === 'memory_usage');
    
    if (responseTimePoints.length > 0) {
      const avgResponseTime = responseTimePoints.reduce((sum, p) => sum + p.value, 0) / responseTimePoints.length;
      
      if (avgResponseTime > 1000) { // 1 second threshold
        this.generateInsight({
          type: 'recommendation',
          severity: 'medium',
          title: 'Response time optimization opportunity',
          description: `Average response time is ${avgResponseTime.toFixed(0)}ms, which may impact user experience`,
          confidence: 0.8,
          evidence: [{ avgResponseTime, threshold: 1000 }],
          actionable: true,
          recommendations: [
            'Consider model optimization or quantization',
            'Implement response time caching',
            'Profile application for bottlenecks'
          ]
        });
      }
    }
  }

  /**
   * Generate business insights
   */
  private generateBusinessInsights(dataPoints: DataPoint[]): void {
    const scanPoints = dataPoints.filter(p => p.metricId === 'scan_count');
    const accuracyPoints = dataPoints.filter(p => p.metricId === 'scan_accuracy');
    
    if (scanPoints.length > 0 && accuracyPoints.length > 0) {
      const totalScans = scanPoints.reduce((sum, p) => sum + p.value, 0);
      const avgAccuracy = accuracyPoints.reduce((sum, p) => sum + p.value, 0) / accuracyPoints.length;
      
      this.generateInsight({
        type: 'recommendation',
        severity: 'low',
        title: 'User engagement analysis',
        description: `${totalScans} scans performed with ${avgAccuracy.toFixed(1)}% average accuracy`,
        confidence: 0.9,
        evidence: [{ totalScans, avgAccuracy }],
        actionable: true,
        recommendations: [
          'Monitor user retention and scanning patterns',
          'Consider gamification to increase engagement'
        ]
      });
    }
  }

  /**
   * Generate insight
   */
  private generateInsight(insightData: Omit<Insight, 'id' | 'timestamp'>): void {
    const insight: Insight = {
      id: this.generateInsightId(),
      timestamp: Date.now(),
      ...insightData
    };

    this.insights.push(insight);
    this.onInsightCallback?.(insight);
  }

  /**
   * Start data retention cleanup
   */
  private startDataRetentionCleanup(): void {
    setInterval(() => {
      const cutoffTime = Date.now() - (this.config.dataRetentionPeriod * 24 * 60 * 60 * 1000);
      
      this.dataPoints = this.dataPoints.filter(p => p.timestamp > cutoffTime);
      this.insights = this.insights.filter(i => !i.expiresAt || i.expiresAt > Date.now());
      
      console.log(`[AdvancedAnalytics] Cleaned up old data. Current data points: ${this.dataPoints.length}`);
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Start statistics calculation
   */
  private startStatisticsCalculation(): void {
    setInterval(() => {
      this.calculateStatistics();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Calculate statistics for all metrics
   */
  private calculateStatistics(): void {
    const metricGroups = this.groupDataPointsByMetric(this.dataPoints);
    
    metricGroups.forEach((dataPoints, metricId) => {
      if (dataPoints.length > 0) {
        this.calculateRealtimeAggregations(metricId, dataPoints);
      }
    });
  }

  /**
   * Generate unique insight ID
   */
  private generateInsightId(): string {
    return 'insight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    totalDataPoints: number;
    totalInsights: number;
    activeMetrics: number;
    topMetrics: Array<{ metricId: string; count: number }>;
    recentInsights: Insight[];
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const metricCounts = new Map<string, number>();
    
    this.dataPoints.forEach(point => {
      metricCounts.set(point.metricId, (metricCounts.get(point.metricId) || 0) + 1);
    });

    const topMetrics = Array.from(metricCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([metricId, count]) => ({ metricId, count }));

    const recentInsights = this.insights
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    const criticalInsights = this.insights.filter(i => i.severity === 'critical').length;
    const systemHealth = criticalInsights > 0 ? 'critical' : 
                        this.insights.filter(i => i.severity === 'high').length > 5 ? 'warning' : 'healthy';

    return {
      totalDataPoints: this.dataPoints.length,
      totalInsights: this.insights.length,
      activeMetrics: metricCounts.size,
      topMetrics,
      recentInsights,
      systemHealth
    };
  }

  /**
   * Get metric statistics
   */
  getMetricStatistics(metricId: string): any {
    return this.statisticsCache.get(metricId) || null;
  }

  /**
   * Query data points with filters
   */
  queryDataPoints(filters: {
    metricIds?: string[];
    startTime?: number;
    endTime?: number;
    tags?: Record<string, string>;
    limit?: number;
  }): DataPoint[] {
    let filtered = this.dataPoints;

    if (filters.metricIds) {
      filtered = filtered.filter(p => filters.metricIds!.includes(p.metricId));
    }

    if (filters.startTime) {
      filtered = filtered.filter(p => p.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filtered = filtered.filter(p => p.timestamp <= filters.endTime!);
    }

    if (filters.tags) {
      filtered = filtered.filter(p => {
        return Object.entries(filters.tags!).every(([key, value]) => p.tags[key] === value);
      });
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  /**
   * Set callbacks
   */
  setCallbacks(
    onInsight: (insight: Insight) => void,
    onAnomaly: (anomaly: DataPoint) => void,
    onModelUpdate: (model: PredictionModel) => void
  ): void {
    this.onInsightCallback = onInsight;
    this.onAnomalyCallback = onAnomaly;
    this.onModelUpdateCallback = onModelUpdate;
  }

  /**
   * Export analytics data
   */
  exportData(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify({
        config: this.config,
        metrics: Object.fromEntries(this.metrics),
        dataPoints: this.dataPoints,
        insights: this.insights,
        statistics: Object.fromEntries(this.statisticsCache)
      }, null, 2);
    } else {
      // CSV export
      const headers = ['timestamp', 'metricId', 'value', 'tags'];
      const rows = this.dataPoints.map(point => [
        point.timestamp,
        point.metricId,
        point.value,
        JSON.stringify(point.tags)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    this.dataPoints = [];
    this.insights = [];
    this.realtimeBuffer = [];
    this.statisticsCache.clear();

    console.log('[AdvancedAnalytics] Analytics system disposed');
  }
}

export const advancedAnalytics = new AdvancedAnalytics();
export default AdvancedAnalytics; 