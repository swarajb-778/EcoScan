/**
 * Advanced ML Pipeline for EcoScan
 * 
 * Enhances the existing detection system with:
 * - Confidence calibration and adaptive thresholds
 * - Context analysis (lighting, angle, size)
 * - Multi-model ensemble with intelligent fallbacks
 * - Continuous learning from user feedback
 * - Performance metrics and reliability scoring
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { ObjectDetector } from './detector';
import { WasteClassifier } from './classifier';

// Enhanced interfaces for advanced ML pipeline
interface EnhancedDetection {
  id: string;
  bbox: [number, number, number, number];
  class: string;
  confidence: number;
  calibratedConfidence: number;
  contextScore: number;
  reliability: number;
  category: 'recycle' | 'compost' | 'landfill';
  timestamp: number;
  metadata: DetectionMetadata;
}

interface DetectionMetadata {
  lightingScore: number;
  angleScore: number;
  sizeScore: number;
  clarityScore: number;
  distanceScore: number;
  backgroundNoise: number;
  imageQuality: number;
}

interface ConfidenceCalibration {
  classThresholds: Record<string, number>;
  lightingAdjustments: Record<string, number>;
  sizeAdjustments: Record<string, number>;
  angleAdjustments: Record<string, number>;
  timeBasedAdjustments: Record<string, number>;
}

interface MLPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageConfidence: number;
  calibrationError: number;
  detectionRate: number;
  falsePositiveRate: number;
  avgProcessingTime: number;
  modelReliability: number;
}

interface FeedbackData {
  detectionId: string;
  userCorrection: string;
  originalPrediction: string;
  confidence: number;
  timestamp: number;
  context: DetectionMetadata;
}

interface ModelEnsemble {
  primaryModel: any;
  fallbackModels: any[];
  votingStrategy: 'majority' | 'weighted' | 'confidence';
  confidenceThreshold: number;
  performanceWeights: Record<string, number>;
}

// Stores for the advanced ML pipeline
export const enhancedDetections = writable<EnhancedDetection[]>([]);
export const mlPerformanceMetrics = writable<MLPerformanceMetrics>({
  accuracy: 0,
  precision: 0,
  recall: 0,
  f1Score: 0,
  averageConfidence: 0,
  calibrationError: 0,
  detectionRate: 0,
  falsePositiveRate: 0,
  avgProcessingTime: 0,
  modelReliability: 0
});

export const feedbackHistory = writable<FeedbackData[]>([]);
export const confidenceCalibration = writable<ConfidenceCalibration>({
  classThresholds: {},
  lightingAdjustments: {},
  sizeAdjustments: {},
  angleAdjustments: {},
  timeBasedAdjustments: {}
});

class AdvancedMLPipeline {
  private detector: ObjectDetector;
  private classifier: WasteClassifier;
  private modelEnsemble: ModelEnsemble;
  private isInitialized = false;
  private detectionHistory: EnhancedDetection[] = [];
  private feedbackData: FeedbackData[] = [];
  private performanceTracker: MLPerformanceTracker;
  private contextAnalyzer: ContextAnalyzer;
  private confidenceCalibrator: ConfidenceCalibrator;

  constructor() {
    this.detector = new ObjectDetector();
    this.classifier = new WasteClassifier();
    this.performanceTracker = new MLPerformanceTracker();
    this.contextAnalyzer = new ContextAnalyzer();
    this.confidenceCalibrator = new ConfidenceCalibrator();
    
    this.modelEnsemble = {
      primaryModel: null,
      fallbackModels: [],
      votingStrategy: 'weighted',
      confidenceThreshold: 0.5,
      performanceWeights: {}
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize core components
      await this.detector.initialize();
      await this.classifier.initialize();
      
      // Load existing calibration data
      await this.loadCalibrationData();
      
      // Load feedback history
      await this.loadFeedbackHistory();
      
      // Initialize performance tracking
      this.performanceTracker.initialize();
      
      this.isInitialized = true;
      console.log('Advanced ML Pipeline initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Advanced ML Pipeline:', error);
      throw error;
    }
  }

  async processImage(imageData: ImageData): Promise<EnhancedDetection[]> {
    if (!this.isInitialized) {
      throw new Error('ML Pipeline not initialized');
    }

    const startTime = performance.now();
    
    try {
      // Step 1: Context analysis
      const context = await this.contextAnalyzer.analyzeImage(imageData);
      
      // Step 2: Primary detection
      const rawDetections = await this.detector.detect(imageData);
      
      // Step 3: Ensemble processing (if multiple models available)
      const ensembleDetections = await this.processEnsemble(imageData, rawDetections);
      
      // Step 4: Confidence calibration
      const calibratedDetections = await this.calibrateConfidence(ensembleDetections, context);
      
      // Step 5: Context-aware filtering
      const contextFilteredDetections = this.applyContextFiltering(calibratedDetections, context);
      
      // Step 6: Enhance with metadata
      const enhancedDetections = this.enhanceDetections(contextFilteredDetections, context);
      
      // Step 7: Update performance metrics
      const processingTime = performance.now() - startTime;
      this.performanceTracker.updateMetrics(enhancedDetections, processingTime);
      
      // Step 8: Store for continuous learning
      this.storeDetectionHistory(enhancedDetections);
      
      // Update stores
      enhancedDetections.set(enhancedDetections);
      mlPerformanceMetrics.set(this.performanceTracker.getMetrics());
      
      return enhancedDetections;
      
    } catch (error) {
      console.error('Error processing image:', error);
      
      // Fallback to basic detection
      const fallbackDetections = await this.detector.detect(imageData);
      return this.enhanceDetections(fallbackDetections, await this.contextAnalyzer.analyzeImage(imageData));
    }
  }

  async processEnsemble(imageData: ImageData, primaryDetections: any[]): Promise<any[]> {
    if (this.modelEnsemble.fallbackModels.length === 0) {
      return primaryDetections;
    }

    const allDetections = [primaryDetections];
    
    // Run fallback models
    for (const model of this.modelEnsemble.fallbackModels) {
      try {
        const fallbackDetections = await model.detect(imageData);
        allDetections.push(fallbackDetections);
      } catch (error) {
        console.warn('Fallback model failed:', error);
      }
    }

    // Apply voting strategy
    return this.applyVotingStrategy(allDetections);
  }

  private applyVotingStrategy(detectionSets: any[][]): any[] {
    const { votingStrategy, performanceWeights } = this.modelEnsemble;
    
    switch (votingStrategy) {
      case 'majority':
        return this.majorityVoting(detectionSets);
      case 'weighted':
        return this.weightedVoting(detectionSets, performanceWeights);
      case 'confidence':
        return this.confidenceBasedVoting(detectionSets);
      default:
        return detectionSets[0] || [];
    }
  }

  private majorityVoting(detectionSets: any[][]): any[] {
    // Simple majority voting implementation
    const consensusDetections: any[] = [];
    const allDetections = detectionSets.flat();
    
    // Group similar detections
    const groupedDetections = this.groupSimilarDetections(allDetections);
    
    // Keep detections that appear in majority of models
    const threshold = Math.ceil(detectionSets.length / 2);
    
    groupedDetections.forEach(group => {
      if (group.length >= threshold) {
        consensusDetections.push(this.mergeDetections(group));
      }
    });
    
    return consensusDetections;
  }

  private weightedVoting(detectionSets: any[][], weights: Record<string, number>): any[] {
    // Weighted voting based on model performance
    const weightedDetections: any[] = [];
    
    detectionSets.forEach((detections, index) => {
      const weight = weights[`model_${index}`] || 1;
      
      detections.forEach(detection => {
        const weightedDetection = {
          ...detection,
          confidence: detection.confidence * weight,
          weight: weight
        };
        weightedDetections.push(weightedDetection);
      });
    });
    
    return this.mergeWeightedDetections(weightedDetections);
  }

  private confidenceBasedVoting(detectionSets: any[][]): any[] {
    // Select detections based on highest confidence
    const allDetections = detectionSets.flat();
    const groupedDetections = this.groupSimilarDetections(allDetections);
    
    return groupedDetections.map(group => {
      return group.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
    });
  }

  private groupSimilarDetections(detections: any[]): any[][] {
    const groups: any[][] = [];
    const iouThreshold = 0.5;
    
    detections.forEach(detection => {
      let addedToGroup = false;
      
      for (const group of groups) {
        const representative = group[0];
        const iou = this.calculateIOU(detection.bbox, representative.bbox);
        
        if (iou > iouThreshold && detection.class === representative.class) {
          group.push(detection);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([detection]);
      }
    });
    
    return groups;
  }

  private calculateIOU(bbox1: number[], bbox2: number[]): number {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    
    const left = Math.max(x1, x2);
    const top = Math.max(y1, y2);
    const right = Math.min(x1 + w1, x2 + w2);
    const bottom = Math.min(y1 + h1, y2 + h2);
    
    if (left >= right || top >= bottom) return 0;
    
    const intersection = (right - left) * (bottom - top);
    const union = w1 * h1 + w2 * h2 - intersection;
    
    return intersection / union;
  }

  private mergeDetections(detections: any[]): any {
    if (detections.length === 1) return detections[0];
    
    // Average bounding boxes and confidence
    const avgBbox = [0, 0, 0, 0];
    let avgConfidence = 0;
    
    detections.forEach(detection => {
      avgBbox[0] += detection.bbox[0];
      avgBbox[1] += detection.bbox[1];
      avgBbox[2] += detection.bbox[2];
      avgBbox[3] += detection.bbox[3];
      avgConfidence += detection.confidence;
    });
    
    const count = detections.length;
    return {
      ...detections[0],
      bbox: avgBbox.map(val => val / count),
      confidence: avgConfidence / count
    };
  }

  private mergeWeightedDetections(detections: any[]): any[] {
    const groupedDetections = this.groupSimilarDetections(detections);
    
    return groupedDetections.map(group => {
      let weightedBbox = [0, 0, 0, 0];
      let weightedConfidence = 0;
      let totalWeight = 0;
      
      group.forEach(detection => {
        const weight = detection.weight || 1;
        weightedBbox[0] += detection.bbox[0] * weight;
        weightedBbox[1] += detection.bbox[1] * weight;
        weightedBbox[2] += detection.bbox[2] * weight;
        weightedBbox[3] += detection.bbox[3] * weight;
        weightedConfidence += detection.confidence * weight;
        totalWeight += weight;
      });
      
      return {
        ...group[0],
        bbox: weightedBbox.map(val => val / totalWeight),
        confidence: weightedConfidence / totalWeight
      };
    });
  }

  private async calibrateConfidence(detections: any[], context: DetectionMetadata): Promise<any[]> {
    const calibrationData = get(confidenceCalibration);
    
    return detections.map(detection => {
      let calibratedConfidence = detection.confidence;
      
      // Apply class-specific adjustments
      const classAdjustment = calibrationData.classThresholds[detection.class] || 0;
      calibratedConfidence += classAdjustment;
      
      // Apply lighting adjustments
      const lightingAdjustment = this.getLightingAdjustment(context.lightingScore);
      calibratedConfidence *= lightingAdjustment;
      
      // Apply size adjustments
      const sizeAdjustment = this.getSizeAdjustment(context.sizeScore);
      calibratedConfidence *= sizeAdjustment;
      
      // Apply angle adjustments
      const angleAdjustment = this.getAngleAdjustment(context.angleScore);
      calibratedConfidence *= angleAdjustment;
      
      // Clamp to valid range
      calibratedConfidence = Math.max(0, Math.min(1, calibratedConfidence));
      
      return {
        ...detection,
        calibratedConfidence
      };
    });
  }

  private getLightingAdjustment(lightingScore: number): number {
    // Adjust confidence based on lighting conditions
    if (lightingScore > 0.8) return 1.1; // Good lighting
    if (lightingScore > 0.6) return 1.0; // Moderate lighting
    if (lightingScore > 0.4) return 0.9; // Poor lighting
    return 0.8; // Very poor lighting
  }

  private getSizeAdjustment(sizeScore: number): number {
    // Adjust confidence based on object size
    if (sizeScore > 0.7) return 1.1; // Large objects
    if (sizeScore > 0.4) return 1.0; // Medium objects
    return 0.9; // Small objects
  }

  private getAngleAdjustment(angleScore: number): number {
    // Adjust confidence based on viewing angle
    if (angleScore > 0.8) return 1.1; // Optimal angle
    if (angleScore > 0.6) return 1.0; // Good angle
    return 0.9; // Suboptimal angle
  }

  private applyContextFiltering(detections: any[], context: DetectionMetadata): any[] {
    const minReliabilityThreshold = 0.3;
    
    return detections.filter(detection => {
      const reliability = this.calculateReliability(detection, context);
      return reliability > minReliabilityThreshold;
    });
  }

  private calculateReliability(detection: any, context: DetectionMetadata): number {
    const confidenceWeight = 0.4;
    const contextWeight = 0.3;
    const historyWeight = 0.3;
    
    const confidenceScore = detection.calibratedConfidence || detection.confidence;
    const contextScore = (context.lightingScore + context.sizeScore + context.angleScore) / 3;
    const historyScore = this.getHistoricalAccuracy(detection.class);
    
    return confidenceScore * confidenceWeight + 
           contextScore * contextWeight + 
           historyScore * historyWeight;
  }

  private getHistoricalAccuracy(className: string): number {
    const feedback = this.feedbackData.filter(f => f.originalPrediction === className);
    if (feedback.length === 0) return 0.5; // Default
    
    const correct = feedback.filter(f => f.userCorrection === f.originalPrediction).length;
    return correct / feedback.length;
  }

  private enhanceDetections(detections: any[], context: DetectionMetadata): EnhancedDetection[] {
    return detections.map(detection => ({
      id: this.generateDetectionId(),
      bbox: detection.bbox,
      class: detection.class,
      confidence: detection.confidence,
      calibratedConfidence: detection.calibratedConfidence || detection.confidence,
      contextScore: (context.lightingScore + context.sizeScore + context.angleScore) / 3,
      reliability: this.calculateReliability(detection, context),
      category: this.classifier.getCategory(detection.class),
      timestamp: Date.now(),
      metadata: context
    }));
  }

  private generateDetectionId(): string {
    return `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeDetectionHistory(detections: EnhancedDetection[]): void {
    this.detectionHistory.push(...detections);
    
    // Keep only last 1000 detections
    if (this.detectionHistory.length > 1000) {
      this.detectionHistory = this.detectionHistory.slice(-1000);
    }
    
    // Store in localStorage for persistence
    if (browser) {
      localStorage.setItem('ecoscan_detection_history', JSON.stringify(this.detectionHistory));
    }
  }

  async addFeedback(feedback: FeedbackData): Promise<void> {
    this.feedbackData.push(feedback);
    
    // Update calibration based on feedback
    await this.updateCalibration(feedback);
    
    // Store feedback
    feedbackHistory.set(this.feedbackData);
    
    if (browser) {
      localStorage.setItem('ecoscan_feedback_history', JSON.stringify(this.feedbackData));
    }
    
    // Trigger recalibration
    await this.recalibrateModel();
  }

  private async updateCalibration(feedback: FeedbackData): Promise<void> {
    const calibrationData = get(confidenceCalibration);
    
    // Update class-specific thresholds
    if (feedback.userCorrection !== feedback.originalPrediction) {
      // Decrease threshold for incorrect prediction
      calibrationData.classThresholds[feedback.originalPrediction] = 
        (calibrationData.classThresholds[feedback.originalPrediction] || 0) - 0.01;
      
      // Increase threshold for correct class
      calibrationData.classThresholds[feedback.userCorrection] = 
        (calibrationData.classThresholds[feedback.userCorrection] || 0) + 0.01;
    }
    
    confidenceCalibration.set(calibrationData);
  }

  private async recalibrateModel(): Promise<void> {
    // Implement online learning adjustments
    console.log('Recalibrating model with new feedback...');
    
    // Update performance metrics
    this.performanceTracker.updateWithFeedback(this.feedbackData);
    mlPerformanceMetrics.set(this.performanceTracker.getMetrics());
  }

  private async loadCalibrationData(): Promise<void> {
    if (browser) {
      const stored = localStorage.getItem('ecoscan_calibration_data');
      if (stored) {
        const calibrationData = JSON.parse(stored);
        confidenceCalibration.set(calibrationData);
      }
    }
  }

  private async loadFeedbackHistory(): Promise<void> {
    if (browser) {
      const stored = localStorage.getItem('ecoscan_feedback_history');
      if (stored) {
        this.feedbackData = JSON.parse(stored);
        feedbackHistory.set(this.feedbackData);
      }
    }
  }

  getModelStatistics(): any {
    const metrics = this.performanceTracker.getMetrics();
    const detectionStats = this.calculateDetectionStats();
    
    return {
      ...metrics,
      ...detectionStats,
      totalDetections: this.detectionHistory.length,
      totalFeedback: this.feedbackData.length,
      calibrationStatus: this.confidenceCalibrator.getStatus()
    };
  }

  private calculateDetectionStats(): any {
    const classDistribution: Record<string, number> = {};
    const confidenceDistribution: Record<string, number> = {};
    
    this.detectionHistory.forEach(detection => {
      classDistribution[detection.class] = (classDistribution[detection.class] || 0) + 1;
      
      const confidenceBucket = Math.floor(detection.calibratedConfidence * 10) / 10;
      confidenceDistribution[confidenceBucket] = (confidenceDistribution[confidenceBucket] || 0) + 1;
    });
    
    return {
      classDistribution,
      confidenceDistribution,
      averageReliability: this.calculateAverageReliability()
    };
  }

  private calculateAverageReliability(): number {
    if (this.detectionHistory.length === 0) return 0;
    
    const totalReliability = this.detectionHistory.reduce((sum, detection) => sum + detection.reliability, 0);
    return totalReliability / this.detectionHistory.length;
  }
}

// Context Analysis Class
class ContextAnalyzer {
  async analyzeImage(imageData: ImageData): Promise<DetectionMetadata> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    return {
      lightingScore: this.analyzeLighting(imageData),
      angleScore: this.analyzeAngle(imageData),
      sizeScore: this.analyzeSize(imageData),
      clarityScore: this.analyzeClarity(imageData),
      distanceScore: this.analyzeDistance(imageData),
      backgroundNoise: this.analyzeBackgroundNoise(imageData),
      imageQuality: this.analyzeImageQuality(imageData)
    };
  }

  private analyzeLighting(imageData: ImageData): number {
    const { data } = imageData;
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
    
    const averageBrightness = totalBrightness / pixelCount;
    
    // Optimal brightness is around 128
    const optimalBrightness = 128;
    const deviation = Math.abs(averageBrightness - optimalBrightness);
    
    return Math.max(0, 1 - deviation / optimalBrightness);
  }

  private analyzeAngle(imageData: ImageData): number {
    // Simplified angle analysis based on edge detection
    const edges = this.detectEdges(imageData);
    const horizontalEdges = this.countHorizontalEdges(edges);
    const verticalEdges = this.countVerticalEdges(edges);
    
    // More balanced horizontal/vertical edges suggest better angle
    const ratio = Math.min(horizontalEdges, verticalEdges) / Math.max(horizontalEdges, verticalEdges);
    return ratio;
  }

  private analyzeSize(imageData: ImageData): number {
    // Estimate object size based on edge density
    const edges = this.detectEdges(imageData);
    const edgeDensity = this.calculateEdgeDensity(edges);
    
    // Moderate edge density suggests good object size
    const optimalDensity = 0.3;
    const deviation = Math.abs(edgeDensity - optimalDensity);
    
    return Math.max(0, 1 - deviation / optimalDensity);
  }

  private analyzeClarity(imageData: ImageData): number {
    // Analyze image sharpness using variance
    const variance = this.calculateVariance(imageData);
    
    // Higher variance suggests sharper image
    const maxVariance = 1000; // Approximate maximum
    return Math.min(variance / maxVariance, 1);
  }

  private analyzeDistance(imageData: ImageData): number {
    // Estimate distance based on object size and perspective
    const edges = this.detectEdges(imageData);
    const averageEdgeLength = this.calculateAverageEdgeLength(edges);
    
    // Normalize to 0-1 range
    const maxEdgeLength = 100;
    return Math.min(averageEdgeLength / maxEdgeLength, 1);
  }

  private analyzeBackgroundNoise(imageData: ImageData): number {
    // Analyze background complexity
    const entropy = this.calculateEntropy(imageData);
    
    // Lower entropy suggests cleaner background
    const maxEntropy = 8; // Approximate maximum
    return 1 - Math.min(entropy / maxEntropy, 1);
  }

  private analyzeImageQuality(imageData: ImageData): number {
    // Overall image quality score
    const sharpness = this.analyzeClarity(imageData);
    const noise = this.analyzeBackgroundNoise(imageData);
    const lighting = this.analyzeLighting(imageData);
    
    return (sharpness + noise + lighting) / 3;
  }

  private detectEdges(imageData: ImageData): number[] {
    // Simplified edge detection using Sobel operator
    const { data, width, height } = imageData;
    const edges: number[] = [];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale
        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Calculate gradients
        const gx = this.getGradientX(data, x, y, width);
        const gy = this.getGradientY(data, x, y, width);
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges.push(magnitude);
      }
    }
    
    return edges;
  }

  private getGradientX(data: Uint8ClampedArray, x: number, y: number, width: number): number {
    const getPixel = (px: number, py: number) => {
      const idx = (py * width + px) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };
    
    return getPixel(x + 1, y) - getPixel(x - 1, y);
  }

  private getGradientY(data: Uint8ClampedArray, x: number, y: number, width: number): number {
    const getPixel = (px: number, py: number) => {
      const idx = (py * width + px) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };
    
    return getPixel(x, y + 1) - getPixel(x, y - 1);
  }

  private countHorizontalEdges(edges: number[]): number {
    return edges.filter(edge => edge > 50).length; // Simplified
  }

  private countVerticalEdges(edges: number[]): number {
    return edges.filter(edge => edge > 50).length; // Simplified
  }

  private calculateEdgeDensity(edges: number[]): number {
    const significantEdges = edges.filter(edge => edge > 30);
    return significantEdges.length / edges.length;
  }

  private calculateVariance(imageData: ImageData): number {
    const { data } = imageData;
    const values: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      values.push(gray);
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  private calculateAverageEdgeLength(edges: number[]): number {
    if (edges.length === 0) return 0;
    return edges.reduce((sum, edge) => sum + edge, 0) / edges.length;
  }

  private calculateEntropy(imageData: ImageData): number {
    const { data } = imageData;
    const histogram: Record<number, number> = {};
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray] = (histogram[gray] || 0) + 1;
    }
    
    const totalPixels = data.length / 4;
    let entropy = 0;
    
    Object.values(histogram).forEach(count => {
      const probability = count / totalPixels;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });
    
    return entropy;
  }
}

// Performance Tracking Class
class MLPerformanceTracker {
  private metrics: MLPerformanceMetrics;
  private detectionTimes: number[] = [];
  private predictionHistory: any[] = [];

  constructor() {
    this.metrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      averageConfidence: 0,
      calibrationError: 0,
      detectionRate: 0,
      falsePositiveRate: 0,
      avgProcessingTime: 0,
      modelReliability: 0
    };
  }

  initialize(): void {
    // Load existing metrics if available
    if (browser) {
      const stored = localStorage.getItem('ecoscan_ml_metrics');
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    }
  }

  updateMetrics(detections: EnhancedDetection[], processingTime: number): void {
    this.detectionTimes.push(processingTime);
    
    // Keep only last 100 processing times
    if (this.detectionTimes.length > 100) {
      this.detectionTimes.shift();
    }
    
    // Update average processing time
    this.metrics.avgProcessingTime = this.detectionTimes.reduce((sum, time) => sum + time, 0) / this.detectionTimes.length;
    
    // Update detection rate
    this.metrics.detectionRate = detections.length > 0 ? 1 : 0;
    
    // Update average confidence
    if (detections.length > 0) {
      this.metrics.averageConfidence = detections.reduce((sum, det) => sum + det.calibratedConfidence, 0) / detections.length;
    }
    
    // Update model reliability
    this.metrics.modelReliability = this.calculateModelReliability(detections);
    
    this.saveMetrics();
  }

  updateWithFeedback(feedbackData: FeedbackData[]): void {
    if (feedbackData.length === 0) return;
    
    let correct = 0;
    let totalPredictions = 0;
    const classMetrics: Record<string, { tp: number; fp: number; fn: number; tn: number }> = {};
    
    feedbackData.forEach(feedback => {
      const isCorrect = feedback.originalPrediction === feedback.userCorrection;
      if (isCorrect) correct++;
      totalPredictions++;
      
      // Update class-specific metrics
      if (!classMetrics[feedback.originalPrediction]) {
        classMetrics[feedback.originalPrediction] = { tp: 0, fp: 0, fn: 0, tn: 0 };
      }
      
      if (isCorrect) {
        classMetrics[feedback.originalPrediction].tp++;
      } else {
        classMetrics[feedback.originalPrediction].fp++;
        
        // Update metrics for correct class
        if (!classMetrics[feedback.userCorrection]) {
          classMetrics[feedback.userCorrection] = { tp: 0, fp: 0, fn: 0, tn: 0 };
        }
        classMetrics[feedback.userCorrection].fn++;
      }
    });
    
    // Calculate overall accuracy
    this.metrics.accuracy = correct / totalPredictions;
    
    // Calculate precision, recall, and F1 score
    this.calculatePrecisionRecallF1(classMetrics);
    
    // Calculate calibration error
    this.metrics.calibrationError = this.calculateCalibrationError(feedbackData);
    
    // Calculate false positive rate
    this.metrics.falsePositiveRate = (totalPredictions - correct) / totalPredictions;
    
    this.saveMetrics();
  }

  private calculateModelReliability(detections: EnhancedDetection[]): number {
    if (detections.length === 0) return 0;
    
    const avgReliability = detections.reduce((sum, det) => sum + det.reliability, 0) / detections.length;
    const confidenceVariance = this.calculateConfidenceVariance(detections);
    
    // Higher reliability with lower variance is better
    return avgReliability * (1 - Math.min(confidenceVariance, 0.5));
  }

  private calculateConfidenceVariance(detections: EnhancedDetection[]): number {
    if (detections.length === 0) return 0;
    
    const avgConfidence = detections.reduce((sum, det) => sum + det.calibratedConfidence, 0) / detections.length;
    const variance = detections.reduce((sum, det) => sum + Math.pow(det.calibratedConfidence - avgConfidence, 2), 0) / detections.length;
    
    return variance;
  }

  private calculatePrecisionRecallF1(classMetrics: Record<string, { tp: number; fp: number; fn: number; tn: number }>): void {
    let totalPrecision = 0;
    let totalRecall = 0;
    let classCount = 0;
    
    Object.values(classMetrics).forEach(metrics => {
      const precision = metrics.tp / (metrics.tp + metrics.fp) || 0;
      const recall = metrics.tp / (metrics.tp + metrics.fn) || 0;
      
      totalPrecision += precision;
      totalRecall += recall;
      classCount++;
    });
    
    this.metrics.precision = totalPrecision / classCount;
    this.metrics.recall = totalRecall / classCount;
    this.metrics.f1Score = 2 * (this.metrics.precision * this.metrics.recall) / (this.metrics.precision + this.metrics.recall) || 0;
  }

  private calculateCalibrationError(feedbackData: FeedbackData[]): number {
    // Calculate Expected Calibration Error (ECE)
    const bins = 10;
    const binSize = 1.0 / bins;
    let totalError = 0;
    
    for (let i = 0; i < bins; i++) {
      const binMin = i * binSize;
      const binMax = (i + 1) * binSize;
      
      const binFeedback = feedbackData.filter(f => f.confidence >= binMin && f.confidence < binMax);
      
      if (binFeedback.length === 0) continue;
      
      const binAccuracy = binFeedback.filter(f => f.originalPrediction === f.userCorrection).length / binFeedback.length;
      const binConfidence = binFeedback.reduce((sum, f) => sum + f.confidence, 0) / binFeedback.length;
      
      totalError += Math.abs(binAccuracy - binConfidence) * (binFeedback.length / feedbackData.length);
    }
    
    return totalError;
  }

  private saveMetrics(): void {
    if (browser) {
      localStorage.setItem('ecoscan_ml_metrics', JSON.stringify(this.metrics));
    }
  }

  getMetrics(): MLPerformanceMetrics {
    return { ...this.metrics };
  }
}

// Confidence Calibration Class
class ConfidenceCalibrator {
  private calibrationStatus: string = 'ready';
  
  getStatus(): string {
    return this.calibrationStatus;
  }
  
  setStatus(status: string): void {
    this.calibrationStatus = status;
  }
}

// Create singleton instance
export const advancedMLPipeline = new AdvancedMLPipeline();

// Initialize when imported
if (browser) {
  advancedMLPipeline.initialize().catch(console.error);
}

// Derived stores
export const modelStatistics = derived(
  [enhancedDetections, mlPerformanceMetrics, feedbackHistory],
  () => advancedMLPipeline.getModelStatistics()
);

export const detectionReliability = derived(
  enhancedDetections,
  ($detections) => {
    if ($detections.length === 0) return 0;
    return $detections.reduce((sum, det) => sum + det.reliability, 0) / $detections.length;
  }
);

export const confidenceCalibrationStatus = derived(
  [mlPerformanceMetrics, feedbackHistory],
  ([$metrics, $feedback]) => ({
    calibrationError: $metrics.calibrationError,
    totalFeedback: $feedback.length,
    needsRecalibration: $metrics.calibrationError > 0.1 && $feedback.length > 10
  })
); 