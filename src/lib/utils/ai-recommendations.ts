/**
 * AI-Powered Recommendations System
 * Provides intelligent suggestions for waste reduction and environmental impact
 */

import { writable, derived } from 'svelte/store';
import type { Detection } from '../types/index.js';
import { isBrowser } from './browser.js';

export interface Recommendation {
  id: string;
  type: 'reduce' | 'reuse' | 'recycle' | 'alternative' | 'educational' | 'impact';
  title: string;
  description: string;
  actionText?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  confidence: number;
  tags: string[];
  estimatedImpact?: {
    co2Saved?: string;
    energySaved?: string;
    waterSaved?: string;
    costSaved?: string;
  };
}

export interface UserPattern {
  itemType: string;
  frequency: number;
  lastSeen: number;
  category: string;
  correctDisposals: number;
  totalDetections: number;
}

export interface EnvironmentalImpact {
  totalItemsScanned: number;
  recycledItems: number;
  compostedItems: number;
  estimatedCO2Saved: number;
  estimatedWaterSaved: number;
  streakDays: number;
  badgesEarned: string[];
}

// Stores for recommendations and user data
export const recommendations = writable<Recommendation[]>([]);
export const userPatterns = writable<Record<string, UserPattern>>({});
export const environmentalImpact = writable<EnvironmentalImpact>({
  totalItemsScanned: 0,
  recycledItems: 0,
  compostedItems: 0,
  estimatedCO2Saved: 0,
  estimatedWaterSaved: 0,
  streakDays: 0,
  badgesEarned: []
});

// Derived stores for analytics
export const topRecommendations = derived(recommendations, ($recommendations) =>
  $recommendations
    .filter(r => r.priority === 'high')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
);

export const weeklyStats = derived([userPatterns, environmentalImpact], ([$patterns, $impact]) => {
  const thisWeek = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weeklyItems = Object.values($patterns)
    .filter(p => p.lastSeen > thisWeek)
    .reduce((sum, p) => sum + p.frequency, 0);
  
  return {
    itemsThisWeek: weeklyItems,
    impactScore: $impact.estimatedCO2Saved,
    streak: $impact.streakDays,
    improvement: calculateImprovementScore($patterns)
  };
});

/**
 * AI Recommendations Engine
 */
export class AIRecommendationsEngine {
  private itemDatabase: Map<string, any> = new Map();
  private sustainabilityTips: any[] = [];
  private localAlternatives: any[] = [];

  constructor() {
    this.initializeDatabase();
    this.loadUserPatterns();
  }

  /**
   * Generate recommendations based on detected item
   */
  async generateRecommendations(detection: Detection): Promise<Recommendation[]> {
    const itemRecommendations: Recommendation[] = [];
    
    // Update user patterns
    this.updateUserPattern(detection);
    
    // Get item-specific recommendations
    const itemSpecific = await this.getItemSpecificRecommendations(detection);
    itemRecommendations.push(...itemSpecific);
    
    // Get pattern-based recommendations
    const patternBased = await this.getPatternBasedRecommendations(detection);
    itemRecommendations.push(...patternBased);
    
    // Get educational content
    const educational = await this.getEducationalRecommendations(detection);
    itemRecommendations.push(...educational);
    
    // Get local alternatives
    const alternatives = await this.getLocalAlternatives(detection);
    itemRecommendations.push(...alternatives);
    
    // Score and rank recommendations
    const rankedRecommendations = this.rankRecommendations(itemRecommendations, detection);
    
    // Update recommendations store
    recommendations.set(rankedRecommendations);
    
    return rankedRecommendations;
  }

  /**
   * Get item-specific recommendations
   */
  private async getItemSpecificRecommendations(detection: Detection): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const itemType = detection.label.toLowerCase();
    
    // Plastic bottles
    if (itemType.includes('bottle') && itemType.includes('plastic')) {
      recommendations.push({
        id: `reduce-plastic-bottles-${Date.now()}`,
        type: 'reduce',
        title: 'Switch to Reusable Water Bottle',
        description: 'Reduce plastic waste by using a reusable water bottle. A single reusable bottle can replace hundreds of plastic ones.',
        actionText: 'Shop Reusable Bottles',
        actionUrl: '/alternatives/water-bottles',
        priority: 'high',
        category: 'plastic',
        confidence: 0.9,
        tags: ['plastic', 'reduction', 'sustainable'],
        estimatedImpact: {
          co2Saved: '156kg CO₂/year',
          waterSaved: '1,500L/year',
          costSaved: '$400/year'
        }
      });

      recommendations.push({
        id: `recycle-plastic-bottles-${Date.now()}`,
        type: 'recycle',
        title: 'Proper Recycling Steps',
        description: 'Remove labels and caps, rinse thoroughly, and place in recycling bin. Check if your area accepts caps separately.',
        priority: 'medium',
        category: 'plastic',
        confidence: 0.8,
        tags: ['recycling', 'instructions'],
        estimatedImpact: {
          co2Saved: '2.3kg CO₂ per bottle'
        }
      });
    }

    // Food waste
    if (itemType.includes('apple') || itemType.includes('banana') || itemType.includes('food')) {
      recommendations.push({
        id: `compost-food-waste-${Date.now()}`,
        type: 'recycle',
        title: 'Start Home Composting',
        description: 'Turn food scraps into nutrient-rich soil for gardening. Composting reduces methane emissions from landfills.',
        actionText: 'Learn Composting',
        actionUrl: '/guides/composting',
        priority: 'high',
        category: 'organic',
        confidence: 0.85,
        tags: ['composting', 'gardening', 'methane-reduction'],
        estimatedImpact: {
          co2Saved: '1.1kg CO₂ per kg composted',
          costSaved: '$200/year on fertilizer'
        }
      });

      recommendations.push({
        id: `food-planning-${Date.now()}`,
        type: 'reduce',
        title: 'Meal Planning to Reduce Waste',
        description: 'Plan meals and portion sizes to minimize food waste. Food waste is responsible for 8% of global greenhouse gas emissions.',
        actionText: 'Get Meal Planning Tips',
        priority: 'medium',
        category: 'organic',
        confidence: 0.75,
        tags: ['planning', 'food-waste', 'budgeting']
      });
    }

    // Coffee cups
    if (itemType.includes('cup') && itemType.includes('coffee')) {
      recommendations.push({
        id: `reusable-coffee-cup-${Date.now()}`,
        type: 'alternative',
        title: 'Bring Your Own Cup',
        description: 'Most coffee shops offer discounts for bringing reusable cups. Many disposable cups aren\'t recyclable due to plastic lining.',
        actionText: 'Find Coffee Discounts',
        priority: 'high',
        category: 'plastic',
        confidence: 0.9,
        tags: ['reusable', 'coffee', 'discount'],
        estimatedImpact: {
          costSaved: '$100/year in discounts',
          co2Saved: '15kg CO₂/year'
        }
      });
    }

    // Aluminum cans
    if (itemType.includes('can') && (itemType.includes('aluminum') || itemType.includes('soda'))) {
      recommendations.push({
        id: `aluminum-recycling-${Date.now()}`,
        type: 'educational',
        title: 'Aluminum: Infinitely Recyclable',
        description: 'Aluminum cans can be recycled indefinitely without losing quality. Recycling one can saves enough energy to power a TV for 3 hours.',
        priority: 'medium',
        category: 'aluminum',
        confidence: 0.8,
        tags: ['aluminum', 'infinite-recycling', 'energy-saving'],
        estimatedImpact: {
          energySaved: '95% vs new aluminum'
        }
      });
    }

    return recommendations;
  }

  /**
   * Get pattern-based recommendations
   */
  private async getPatternBasedRecommendations(detection: Detection): Promise<Recommendation[]> {
    const patterns = this.getUserPatterns();
    const itemType = detection.label.toLowerCase();
    const pattern = patterns[itemType];
    
    const recommendations: Recommendation[] = [];
    
    if (pattern && pattern.frequency >= 3) {
      // Frequent item detected
      recommendations.push({
        id: `frequent-item-${itemType}-${Date.now()}`,
        type: 'reduce',
        title: `Reduce ${detection.label} Usage`,
        description: `You've scanned ${pattern.frequency} ${detection.label}s recently. Consider sustainable alternatives to reduce your environmental impact.`,
        priority: 'high',
        category: detection.category,
        confidence: 0.8,
        tags: ['frequent-use', 'pattern-based', 'reduction']
      });
    }
    
    if (pattern && pattern.correctDisposals / pattern.totalDetections < 0.7) {
      // Incorrect disposal pattern
      recommendations.push({
        id: `disposal-education-${itemType}-${Date.now()}`,
        type: 'educational',
        title: 'Improve Disposal Accuracy',
        description: `Learn the correct way to dispose of ${detection.label}s. Proper disposal is crucial for effective recycling.`,
        actionText: 'Learn Proper Disposal',
        priority: 'medium',
        category: detection.category,
        confidence: 0.9,
        tags: ['education', 'disposal', 'accuracy']
      });
    }
    
    return recommendations;
  }

  /**
   * Get educational recommendations
   */
  private async getEducationalRecommendations(detection: Detection): Promise<Recommendation[]> {
    const educationalContent = [
      {
        category: 'plastic',
        title: 'The Plastic Recycling Numbers',
        description: 'Learn what the numbers on plastic containers mean and which are recyclable in your area.',
        actionText: 'Learn Plastic Codes',
        actionUrl: '/education/plastic-codes'
      },
      {
        category: 'organic',
        title: 'Composting 101',
        description: 'Understand what can and cannot be composted, and how to maintain a healthy compost system.',
        actionText: 'Start Composting',
        actionUrl: '/education/composting'
      },
      {
        category: 'recycle',
        title: 'Local Recycling Guidelines',
        description: 'Recycling rules vary by location. Learn your local guidelines for maximum impact.',
        actionText: 'Find Local Rules',
        actionUrl: '/local/recycling-rules'
      }
    ];
    
    const relevantContent = educationalContent.filter(content => 
      content.category === detection.category || content.category === 'recycle'
    );
    
    return relevantContent.map(content => ({
      id: `education-${content.category}-${Date.now()}`,
      type: 'educational' as const,
      title: content.title,
      description: content.description,
      actionText: content.actionText,
      actionUrl: content.actionUrl,
      priority: 'low' as const,
      category: content.category,
      confidence: 0.7,
      tags: ['education', 'guidelines', 'local']
    }));
  }

  /**
   * Get local alternatives
   */
  private async getLocalAlternatives(detection: Detection): Promise<Recommendation[]> {
    // This would integrate with local databases in a real implementation
    const localAlternatives = [
      {
        itemType: 'plastic bottle',
        alternative: 'Bulk water dispensers at local grocery stores',
        location: 'Whole Foods, Sprouts',
        savings: '$200/year'
      },
      {
        itemType: 'coffee cup',
        alternative: 'Coffee shops with bring-your-own-cup discounts',
        location: 'Starbucks, Blue Bottle, Local cafes',
        savings: '10-15% discount'
      }
    ];
    
    const relevantAlternatives = localAlternatives.filter(alt =>
      detection.label.toLowerCase().includes(alt.itemType.split(' ')[0])
    );
    
    return relevantAlternatives.map(alt => ({
      id: `alternative-${alt.itemType.replace(' ', '-')}-${Date.now()}`,
      type: 'alternative' as const,
      title: `Local Alternative: ${alt.alternative}`,
      description: `Available at: ${alt.location}. Potential savings: ${alt.savings}`,
      priority: 'medium' as const,
      category: detection.category,
      confidence: 0.6,
      tags: ['local', 'alternative', 'savings']
    }));
  }

  /**
   * Rank recommendations by relevance and impact
   */
  private rankRecommendations(recs: Recommendation[], detection: Detection): Recommendation[] {
    return recs
      .map(rec => {
        // Boost confidence based on various factors
        let adjustedConfidence = rec.confidence;
        
        // Boost high-impact recommendations
        if (rec.estimatedImpact?.co2Saved) {
          adjustedConfidence += 0.1;
        }
        
        // Boost actionable recommendations
        if (rec.actionUrl) {
          adjustedConfidence += 0.05;
        }
        
        // Boost category-specific recommendations
        if (rec.category === detection.category) {
          adjustedConfidence += 0.1;
        }
        
        return { ...rec, confidence: Math.min(1, adjustedConfidence) };
      })
      .sort((a, b) => {
        // Sort by priority first, then confidence
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Update user patterns based on detection
   */
  private updateUserPattern(detection: Detection): void {
    const patterns = this.getUserPatterns();
    const itemType = detection.label.toLowerCase();
    
    if (patterns[itemType]) {
      patterns[itemType].frequency++;
      patterns[itemType].lastSeen = Date.now();
      patterns[itemType].totalDetections++;
    } else {
      patterns[itemType] = {
        itemType,
        frequency: 1,
        lastSeen: Date.now(),
        category: detection.category,
        correctDisposals: 0,
        totalDetections: 1
      };
    }
    
    this.saveUserPatterns(patterns);
    userPatterns.set(patterns);
  }

  /**
   * Record correct disposal action
   */
  recordCorrectDisposal(itemType: string): void {
    const patterns = this.getUserPatterns();
    if (patterns[itemType]) {
      patterns[itemType].correctDisposals++;
      this.saveUserPatterns(patterns);
      userPatterns.set(patterns);
    }
  }

  /**
   * Update environmental impact
   */
  updateEnvironmentalImpact(detection: Detection, correctlyDisposed: boolean): void {
    environmentalImpact.update(impact => {
      const newImpact = { ...impact };
      
      newImpact.totalItemsScanned++;
      
      if (correctlyDisposed) {
        if (detection.category === 'recycle') {
          newImpact.recycledItems++;
          newImpact.estimatedCO2Saved += this.calculateCO2Savings(detection);
        } else if (detection.category === 'compost') {
          newImpact.compostedItems++;
          newImpact.estimatedCO2Saved += 1.1; // Average CO2 saved per composted item
        }
      }
      
      // Update streak
      const lastScan = this.getLastScanDate();
      const today = new Date();
      if (this.isSameDay(lastScan, today) || this.isConsecutiveDay(lastScan, today)) {
        if (!this.isSameDay(lastScan, today)) {
          newImpact.streakDays++;
        }
      } else {
        newImpact.streakDays = 1;
      }
      
      // Update badges
      newImpact.badgesEarned = this.calculateBadges(newImpact);
      
      this.saveLastScanDate(today);
      
      return newImpact;
    });
  }

  /**
   * Calculate CO2 savings for different items
   */
  private calculateCO2Savings(detection: Detection): number {
    const co2Savings: Record<string, number> = {
      'plastic bottle': 2.3,
      'aluminum can': 3.2,
      'cardboard': 1.1,
      'paper': 0.9,
      'glass bottle': 0.8
    };
    
    const itemType = detection.label.toLowerCase();
    for (const [key, savings] of Object.entries(co2Savings)) {
      if (itemType.includes(key.split(' ')[0])) {
        return savings;
      }
    }
    
    return 0.5; // Default savings
  }

  /**
   * Calculate earned badges
   */
  private calculateBadges(impact: EnvironmentalImpact): string[] {
    const badges = [];
    
    if (impact.totalItemsScanned >= 10) badges.push('Eco Explorer');
    if (impact.totalItemsScanned >= 50) badges.push('Waste Warrior');
    if (impact.totalItemsScanned >= 100) badges.push('Sustainability Champion');
    
    if (impact.streakDays >= 7) badges.push('Week Streak');
    if (impact.streakDays >= 30) badges.push('Month Master');
    
    if (impact.recycledItems >= 25) badges.push('Recycling Hero');
    if (impact.compostedItems >= 25) badges.push('Compost Champion');
    
    if (impact.estimatedCO2Saved >= 50) badges.push('Carbon Saver');
    if (impact.estimatedCO2Saved >= 200) badges.push('Climate Hero');
    
    return badges;
  }

  /**
   * Initialize item database
   */
  private initializeDatabase(): void {
    // This would be populated from a comprehensive database
    // For now, basic initialization
    console.log('🤖 AI Recommendations Engine initialized');
  }

  /**
   * Get user patterns from storage
   */
  private getUserPatterns(): Record<string, UserPattern> {
    if (!isBrowser()) return {};
    
    try {
      const stored = localStorage.getItem('ecoscan-user-patterns');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save user patterns to storage
   */
  private saveUserPatterns(patterns: Record<string, UserPattern>): void {
    if (!isBrowser()) return;
    
    try {
      localStorage.setItem('ecoscan-user-patterns', JSON.stringify(patterns));
    } catch (error) {
      console.warn('Failed to save user patterns:', error);
    }
  }

  /**
   * Load user patterns from storage
   */
  private loadUserPatterns(): void {
    const patterns = this.getUserPatterns();
    userPatterns.set(patterns);
  }

  /**
   * Get last scan date
   */
  private getLastScanDate(): Date {
    if (!isBrowser()) return new Date();
    
    try {
      const stored = localStorage.getItem('ecoscan-last-scan');
      return stored ? new Date(stored) : new Date(0);
    } catch {
      return new Date(0);
    }
  }

  /**
   * Save last scan date
   */
  private saveLastScanDate(date: Date): void {
    if (!isBrowser()) return;
    
    try {
      localStorage.setItem('ecoscan-last-scan', date.toISOString());
    } catch (error) {
      console.warn('Failed to save last scan date:', error);
    }
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Check if date2 is the day after date1
   */
  private isConsecutiveDay(date1: Date, date2: Date): boolean {
    const nextDay = new Date(date1);
    nextDay.setDate(nextDay.getDate() + 1);
    return this.isSameDay(nextDay, date2);
  }
}

/**
 * Calculate improvement score based on patterns
 */
function calculateImprovementScore(patterns: Record<string, UserPattern>): number {
  const patternValues = Object.values(patterns);
  if (patternValues.length === 0) return 0;
  
  const totalAccuracy = patternValues.reduce((sum, p) => 
    sum + (p.correctDisposals / p.totalDetections), 0
  );
  
  return Math.round((totalAccuracy / patternValues.length) * 100);
}

// Global AI recommendations engine instance
let globalAIEngine: AIRecommendationsEngine | null = null;

/**
 * Get or create global AI recommendations engine
 */
export function getAIRecommendationsEngine(): AIRecommendationsEngine {
  if (!globalAIEngine) {
    globalAIEngine = new AIRecommendationsEngine();
  }
  return globalAIEngine;
}

/**
 * Quick access functions
 */
export const aiRecommendations = {
  generate: (detection: Detection) => getAIRecommendationsEngine().generateRecommendations(detection),
  recordCorrect: (itemType: string) => getAIRecommendationsEngine().recordCorrectDisposal(itemType),
  updateImpact: (detection: Detection, correct: boolean) => 
    getAIRecommendationsEngine().updateEnvironmentalImpact(detection, correct),
  getEngine: () => getAIRecommendationsEngine()
}; 