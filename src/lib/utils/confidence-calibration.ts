/**
 * Confidence Calibration System
 * Learns from user feedback to improve classification accuracy
 */

export interface UserFeedback {
  id: string;
  timestamp: number;
  detectedClass: string;
  userCorrectedClass: string | null;
  confidence: number;
  isCorrect: boolean;
  contextData?: {
    imageQuality: number;
    lightingCondition: string;
    objectSize: number;
    backgroundComplexity: number;
  };
}

export interface ConfidenceMetrics {
  class: string;
  totalPredictions: number;
  correctPredictions: number;
  averageConfidence: number;
  calibrationError: number;
  reliability: number;
  lastUpdated: number;
}

export interface CalibrationBin {
  minConfidence: number;
  maxConfidence: number;
  predictions: number;
  correct: number;
  accuracy: number;
  expectedAccuracy: number;
}

class ConfidenceCalibration {
  private feedbackHistory: UserFeedback[] = [];
  private confidenceMetrics: Map<string, ConfidenceMetrics> = new Map();
  private calibrationBins: CalibrationBin[] = [];
  private readonly maxFeedbackHistory = 10000;
  private readonly numBins = 10;
  
  constructor() {
    this.initializeCalibrationBins();
    this.loadFeedbackHistory();
  }

  /**
   * Initialize confidence calibration bins
   */
  private initializeCalibrationBins(): void {
    this.calibrationBins = [];
    const binSize = 1.0 / this.numBins;
    
    for (let i = 0; i < this.numBins; i++) {
      this.calibrationBins.push({
        minConfidence: i * binSize,
        maxConfidence: (i + 1) * binSize,
        predictions: 0,
        correct: 0,
        accuracy: 0,
        expectedAccuracy: (i * binSize + (i + 1) * binSize) / 2
      });
    }
  }

  /**
   * Add user feedback for a classification
   */
  addFeedback(feedback: UserFeedback): void {
    this.feedbackHistory.push(feedback);
    
    // Prune old feedback if exceeding max history
    if (this.feedbackHistory.length > this.maxFeedbackHistory) {
      this.feedbackHistory = this.feedbackHistory.slice(-this.maxFeedbackHistory);
    }
    
    // Update calibration metrics
    this.updateCalibrationMetrics(feedback);
    this.updateCalibrationBins(feedback);
    
    // Persist feedback
    this.saveFeedbackHistory();
    
    console.log(`[ConfidenceCalibration] Added feedback: ${feedback.detectedClass} -> ${feedback.userCorrectedClass} (confidence: ${feedback.confidence.toFixed(3)})`);
  }

  /**
   * Update calibration metrics for a class
   */
  private updateCalibrationMetrics(feedback: UserFeedback): void {
    const className = feedback.detectedClass;
    let metrics = this.confidenceMetrics.get(className);
    
    if (!metrics) {
      metrics = {
        class: className,
        totalPredictions: 0,
        correctPredictions: 0,
        averageConfidence: 0,
        calibrationError: 0,
        reliability: 0,
        lastUpdated: Date.now()
      };
      this.confidenceMetrics.set(className, metrics);
    }
    
    // Update running averages
    const oldTotal = metrics.totalPredictions;
    metrics.totalPredictions++;
    
    if (feedback.isCorrect) {
      metrics.correctPredictions++;
    }
    
    // Update average confidence with running average
    metrics.averageConfidence = (metrics.averageConfidence * oldTotal + feedback.confidence) / metrics.totalPredictions;
    
    // Calculate calibration error (difference between confidence and actual accuracy)
    const actualAccuracy = metrics.correctPredictions / metrics.totalPredictions;
    metrics.calibrationError = Math.abs(metrics.averageConfidence - actualAccuracy);
    
    // Calculate reliability (inverse of calibration error)
    metrics.reliability = 1 - metrics.calibrationError;
    metrics.lastUpdated = Date.now();
  }

  /**
   * Update calibration bins
   */
  private updateCalibrationBins(feedback: UserFeedback): void {
    const binIndex = Math.min(
      Math.floor(feedback.confidence * this.numBins),
      this.numBins - 1
    );
    
    const bin = this.calibrationBins[binIndex];
    bin.predictions++;
    
    if (feedback.isCorrect) {
      bin.correct++;
    }
    
    bin.accuracy = bin.correct / bin.predictions;
  }

  /**
   * Calibrate confidence score based on historical performance
   */
  calibrateConfidence(detectedClass: string, rawConfidence: number, contextData?: any): number {
    const metrics = this.confidenceMetrics.get(detectedClass);
    
    if (!metrics || metrics.totalPredictions < 10) {
      // Not enough data for calibration, return raw confidence
      return rawConfidence;
    }
    
    // Apply Platt scaling-like calibration
    const reliability = metrics.reliability;
    const calibrationFactor = this.calculateCalibrationFactor(rawConfidence);
    
    let calibratedConfidence = rawConfidence * reliability * calibrationFactor;
    
    // Apply contextual adjustments if available
    if (contextData) {
      calibratedConfidence = this.applyContextualCalibration(
        calibratedConfidence,
        contextData,
        detectedClass
      );
    }
    
    // Ensure confidence stays within valid bounds
    return Math.max(0.1, Math.min(0.99, calibratedConfidence));
  }

  /**
   * Calculate calibration factor based on bin performance
   */
  private calculateCalibrationFactor(confidence: number): number {
    const binIndex = Math.min(
      Math.floor(confidence * this.numBins),
      this.numBins - 1
    );
    
    const bin = this.calibrationBins[binIndex];
    
    if (bin.predictions < 5) {
      return 1.0; // Not enough data in this bin
    }
    
    // Factor based on how well-calibrated this confidence range is
    const calibrationRatio = bin.accuracy / bin.expectedAccuracy;
    return Math.max(0.5, Math.min(1.5, calibrationRatio));
  }

  /**
   * Apply contextual adjustments to confidence
   */
  private applyContextualCalibration(
    confidence: number,
    contextData: any,
    detectedClass: string
  ): number {
    let adjustment = 1.0;
    
    // Poor image quality reduces confidence
    if (contextData.imageQuality < 0.7) {
      adjustment *= 0.8;
    }
    
    // Poor lighting reduces confidence
    if (contextData.lightingCondition === 'poor') {
      adjustment *= 0.85;
    } else if (contextData.lightingCondition === 'excellent') {
      adjustment *= 1.1;
    }
    
    // Very small objects are harder to classify
    if (contextData.objectSize < 0.1) {
      adjustment *= 0.7;
    }
    
    // Complex backgrounds reduce confidence
    if (contextData.backgroundComplexity > 0.8) {
      adjustment *= 0.9;
    }
    
    return confidence * adjustment;
  }

  /**
   * Get confidence threshold for a class based on desired accuracy
   */
  getConfidenceThreshold(detectedClass: string, targetAccuracy: number = 0.9): number {
    const metrics = this.confidenceMetrics.get(detectedClass);
    
    if (!metrics || metrics.totalPredictions < 20) {
      return 0.7; // Default threshold
    }
    
    // Find threshold that achieves target accuracy
    const classFeedback = this.feedbackHistory.filter(f => f.detectedClass === detectedClass);
    classFeedback.sort((a, b) => b.confidence - a.confidence);
    
    let correctCount = 0;
    let totalCount = 0;
    
    for (const feedback of classFeedback) {
      totalCount++;
      if (feedback.isCorrect) {
        correctCount++;
      }
      
      const currentAccuracy = correctCount / totalCount;
      if (currentAccuracy >= targetAccuracy && totalCount >= 10) {
        return Math.max(0.5, feedback.confidence);
      }
    }
    
    return 0.8; // Conservative fallback
  }

  /**
   * Generate calibration report
   */
  generateCalibrationReport(): {
    overallCalibration: number;
    classMetrics: ConfidenceMetrics[];
    binAnalysis: CalibrationBin[];
    recommendations: string[];
  } {
    const classMetrics = Array.from(this.confidenceMetrics.values());
    
    // Calculate overall calibration error
    const totalPredictions = classMetrics.reduce((sum, m) => sum + m.totalPredictions, 0);
    const weightedCalibrationError = classMetrics.reduce(
      (sum, m) => sum + (m.calibrationError * m.totalPredictions), 0
    ) / totalPredictions;
    
    const overallCalibration = 1 - weightedCalibrationError;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(classMetrics);
    
    return {
      overallCalibration,
      classMetrics: classMetrics.sort((a, b) => b.totalPredictions - a.totalPredictions),
      binAnalysis: [...this.calibrationBins],
      recommendations
    };
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(classMetrics: ConfidenceMetrics[]): string[] {
    const recommendations: string[] = [];
    
    // Find poorly calibrated classes
    const poorlyCalibrated = classMetrics.filter(m => 
      m.calibrationError > 0.2 && m.totalPredictions > 50
    );
    
    if (poorlyCalibrated.length > 0) {
      recommendations.push(
        `Classes with poor calibration: ${poorlyCalibrated.map(m => m.class).join(', ')}. Consider adjusting confidence thresholds.`
      );
    }
    
    // Find overconfident classes
    const overconfident = classMetrics.filter(m => 
      m.averageConfidence > (m.correctPredictions / m.totalPredictions) + 0.15
    );
    
    if (overconfident.length > 0) {
      recommendations.push(
        `Overconfident classes: ${overconfident.map(m => m.class).join(', ')}. Model confidence should be reduced.`
      );
    }
    
    // Find underconfident classes
    const underconfident = classMetrics.filter(m => 
      m.averageConfidence < (m.correctPredictions / m.totalPredictions) - 0.15
    );
    
    if (underconfident.length > 0) {
      recommendations.push(
        `Underconfident classes: ${underconfident.map(m => m.class).join(', ')}. Model confidence could be increased.`
      );
    }
    
    // Check if we need more data
    const lowDataClasses = classMetrics.filter(m => m.totalPredictions < 50);
    if (lowDataClasses.length > 0) {
      recommendations.push(
        `Need more feedback data for: ${lowDataClasses.map(m => m.class).join(', ')}.`
      );
    }
    
    return recommendations;
  }

  /**
   * Get class-specific statistics
   */
  getClassStatistics(className: string): ConfidenceMetrics | null {
    return this.confidenceMetrics.get(className) || null;
  }

  /**
   * Reset calibration for a specific class
   */
  resetClassCalibration(className: string): void {
    this.confidenceMetrics.delete(className);
    this.feedbackHistory = this.feedbackHistory.filter(f => f.detectedClass !== className);
    this.saveFeedbackHistory();
    console.log(`[ConfidenceCalibration] Reset calibration for class: ${className}`);
  }

  /**
   * Export calibration data for analysis
   */
  exportCalibrationData(): {
    feedbackHistory: UserFeedback[];
    classMetrics: Record<string, ConfidenceMetrics>;
    calibrationBins: CalibrationBin[];
  } {
    const classMetricsObj: Record<string, ConfidenceMetrics> = {};
    this.confidenceMetrics.forEach((value, key) => {
      classMetricsObj[key] = value;
    });
    
    return {
      feedbackHistory: [...this.feedbackHistory],
      classMetrics: classMetricsObj,
      calibrationBins: [...this.calibrationBins]
    };
  }

  /**
   * Load feedback history from localStorage
   */
  private loadFeedbackHistory(): void {
    try {
      const stored = localStorage.getItem('ecoscan_feedback_history');
      if (stored) {
        const data = JSON.parse(stored);
        this.feedbackHistory = data.feedbackHistory || [];
        
        // Rebuild metrics from history
        this.feedbackHistory.forEach(feedback => {
          this.updateCalibrationMetrics(feedback);
          this.updateCalibrationBins(feedback);
        });
        
        console.log(`[ConfidenceCalibration] Loaded ${this.feedbackHistory.length} feedback entries`);
      }
    } catch (error) {
      console.error('[ConfidenceCalibration] Failed to load feedback history:', error);
    }
  }

  /**
   * Save feedback history to localStorage
   */
  private saveFeedbackHistory(): void {
    try {
      const data = {
        feedbackHistory: this.feedbackHistory.slice(-this.maxFeedbackHistory),
        lastSaved: Date.now()
      };
      localStorage.setItem('ecoscan_feedback_history', JSON.stringify(data));
    } catch (error) {
      console.error('[ConfidenceCalibration] Failed to save feedback history:', error);
    }
  }

  /**
   * Clear all calibration data
   */
  clearCalibrationData(): void {
    this.feedbackHistory = [];
    this.confidenceMetrics.clear();
    this.initializeCalibrationBins();
    localStorage.removeItem('ecoscan_feedback_history');
    console.log('[ConfidenceCalibration] Cleared all calibration data');
  }
}

export const confidenceCalibration = new ConfidenceCalibration();
export default ConfidenceCalibration; 