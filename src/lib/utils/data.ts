/**
 * Data processing utilities for EcoScan
 * Handles waste classification data, caching, and database operations
 */

import Fuse from 'fuse.js';
import type { WasteClassification, Detection } from '$lib/types';

export interface ExtendedWasteClassification extends WasteClassification {
  name: string;
  materials?: string[];
  aliases?: string[];
  description?: string;
}

export interface ExtendedDetection extends Detection {
  timestamp?: number;
}

export interface SearchResult {
  item: ExtendedWasteClassification;
  score: number;
  matches?: readonly any[];
}

export interface ClassificationStats {
  totalItems: number;
  categoryCounts: {
    recycle: number;
    compost: number;
    landfill: number;
  };
  confidenceDistribution: {
    high: number;    // > 0.8
    medium: number;  // 0.5 - 0.8
    low: number;     // < 0.5
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * In-memory cache with expiration
 */
export class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl: number = 300000): void { // 5 min default TTL
    // Clean expired entries before adding new one
    this.cleanup();

    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Waste classification database with fuzzy search
 */
export class WasteDatabase {
  private data: Record<string, ExtendedWasteClassification> = {};
  private fuse: Fuse<ExtendedWasteClassification> | null = null;
  private cache = new DataCache<SearchResult[]>(50);
  private keywords: Record<string, string[]> = {};

  async loadData(url: string = '/data/wasteData.json'): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load waste data: ${response.statusText}`);
      }

      const data = await response.json();
      this.data = data.objects || {};
      this.keywords = data.keywords || {};

      // Initialize fuzzy search
      this.initializeFuse();
    } catch (error) {
      console.error('Error loading waste data:', error);
      // Use fallback data in production
      this.loadFallbackData();
    }
  }

  private initializeFuse(): void {
    const items = Object.values(this.data);
    
    this.fuse = new Fuse(items, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'aliases', weight: 0.3 },
        { name: 'materials', weight: 0.2 },
        { name: 'description', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2
    });
  }

  private loadFallbackData(): void {
    // Minimal fallback data for offline operation
    this.data = {
      'plastic_bottle': {
        name: 'Plastic Bottle',
        category: 'recycle',
        confidence: 0.9,
        materials: ['plastic', 'PET'],
        aliases: ['water bottle', 'soda bottle'],
        description: 'Recyclable plastic container',
        instructions: 'Remove cap and label, rinse clean',
        tips: 'Check recycling number on bottom',
        color: '#10B981' // Green for recycle
      },
      'apple_core': {
        name: 'Apple Core',
        category: 'compost',
        confidence: 0.95,
        materials: ['organic'],
        aliases: ['apple', 'fruit core'],
        description: 'Compostable organic waste',
        instructions: 'Add to compost bin',
        tips: 'Great for home composting',
        color: '#84CC16' // Lime for compost
      },
      'electronics': {
        name: 'Electronics',
        category: 'landfill',
        confidence: 0.8,
        materials: ['electronic', 'metal', 'plastic'],
        aliases: ['phone', 'computer', 'gadget'],
        description: 'Electronic waste requiring special disposal',
        instructions: 'Take to electronics recycling center',
        tips: 'Never put in regular trash',
        color: '#EF4444' // Red for landfill
      }
    };

    this.initializeFuse();
  }

  search(query: string, limit: number = 10): SearchResult[] {
    const cacheKey = `${query.toLowerCase()}_${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.fuse) {
      return [];
    }

    // Search using Fuse.js
    const results = this.fuse.search(query, { limit });
    
    const searchResults: SearchResult[] = results.map(result => ({
      item: result.item,
      score: 1 - (result.score || 0), // Invert score so higher is better
      matches: result.matches
    }));

    // Also search keywords
    const keywordResults = this.searchKeywords(query);
    
    // Merge and deduplicate results
    const combined = [...searchResults, ...keywordResults];
    const unique = this.deduplicateResults(combined);
    const sorted = unique.sort((a, b) => b.score - a.score).slice(0, limit);

    this.cache.set(cacheKey, sorted);
    return sorted;
  }

  private searchKeywords(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [keyword, itemNames] of Object.entries(this.keywords)) {
      if (keyword.includes(lowerQuery) || lowerQuery.includes(keyword)) {
        for (const itemName of itemNames) {
          const item = this.data[itemName];
          if (item) {
            results.push({
              item,
              score: 0.7, // Keyword matches get decent score
              matches: [{
                indices: [[0, keyword.length - 1]],
                value: keyword,
                key: 'keyword',
                arrayIndex: 0
              }]
            });
          }
        }
      }
    }

    return results;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.item.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  getByName(name: string): WasteClassification | null {
    return this.data[name] || null;
  }

  getAll(): WasteClassification[] {
    return Object.values(this.data);
  }

  getStats(): ClassificationStats {
    const items = this.getAll();
    const stats: ClassificationStats = {
      totalItems: items.length,
      categoryCounts: {
        recycle: 0,
        compost: 0,
        landfill: 0
      },
      confidenceDistribution: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    for (const item of items) {
      // Count categories
      stats.categoryCounts[item.category]++;

      // Count confidence levels
      if (item.confidence > 0.8) {
        stats.confidenceDistribution.high++;
      } else if (item.confidence >= 0.5) {
        stats.confidenceDistribution.medium++;
      } else {
        stats.confidenceDistribution.low++;
      }
    }

    return stats;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Process detection results for display
 */
export function processDetections(detections: Detection[]): {
  processed: Detection[];
  summary: {
    total: number;
    categories: Record<string, number>;
    avgConfidence: number;
  };
} {
  const processed = detections
    .filter(d => d.confidence >= 0.3) // Filter low confidence
    .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
    .slice(0, 10); // Limit to top 10

  const summary = {
    total: processed.length,
    categories: processed.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avgConfidence: processed.length > 0 
      ? processed.reduce((sum, d) => sum + d.confidence, 0) / processed.length 
      : 0
  };

  return { processed, summary };
}

/**
 * Export detection data as CSV
 */
export function exportDetectionsCSV(detections: ExtendedDetection[]): string {
  const headers = ['Item', 'Category', 'Confidence', 'Timestamp'];
  const rows = detections.map(d => [
    `"${d.class}"`,
    d.category,
    d.confidence.toFixed(3),
    new Date(d.timestamp || Date.now()).toISOString()
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Import and validate waste data
 */
export function validateWasteData(data: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { valid: false, errors, warnings };
  }

  if (!data.objects || typeof data.objects !== 'object') {
    errors.push('Missing or invalid "objects" property');
  }

  if (!data.keywords || typeof data.keywords !== 'object') {
    warnings.push('Missing "keywords" property - search may be limited');
  }

  // Validate individual items
  for (const [key, item] of Object.entries(data.objects || {})) {
    if (!item || typeof item !== 'object') {
      errors.push(`Invalid item: ${key}`);
      continue;
    }

    const itemObj = item as any;

    if (!itemObj.name || typeof itemObj.name !== 'string') {
      errors.push(`Item ${key} missing or invalid name`);
    }

    if (!itemObj.category || !['recycle', 'compost', 'landfill'].includes(itemObj.category)) {
      errors.push(`Item ${key} has invalid category: ${itemObj.category}`);
    }

    if (typeof itemObj.confidence !== 'number' || itemObj.confidence < 0 || itemObj.confidence > 1) {
      errors.push(`Item ${key} has invalid confidence: ${itemObj.confidence}`);
    }

    if (!itemObj.instructions || typeof itemObj.instructions !== 'string') {
      warnings.push(`Item ${key} missing disposal instructions`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate waste classification report
 */
export function generateReport(detections: Detection[]): {
  summary: string;
  details: {
    recyclable: Detection[];
    compostable: Detection[];
    landfill: Detection[];
  };
  recommendations: string[];
} {
  const { processed, summary } = processDetections(detections);

  const details = {
    recyclable: processed.filter(d => d.category === 'recycle'),
    compostable: processed.filter(d => d.category === 'compost'),
    landfill: processed.filter(d => d.category === 'landfill')
  };

  const recommendations: string[] = [];

  // Generate recommendations based on detected items
  if (details.recyclable.length > 0) {
    recommendations.push('Remember to clean containers before recycling');
  }

  if (details.compostable.length > 0) {
    recommendations.push('Consider starting a home compost if you don\'t have one');
  }

  if (details.landfill.length > details.recyclable.length + details.compostable.length) {
    recommendations.push('Look for ways to reduce general waste - many items can be recycled or composted');
  }

  const summaryText = `Detected ${summary.total} items: ${details.recyclable.length} recyclable, ${details.compostable.length} compostable, ${details.landfill.length} general waste. Average confidence: ${(summary.avgConfidence * 100).toFixed(1)}%`;

  return {
    summary: summaryText,
    details,
    recommendations
  };
}

/**
 * Global waste database instance
 */
export const wasteDatabase = new WasteDatabase();

export async function loadWasteData(): Promise<any> {
  try {
    const resp = await fetch('/data/wasteData.json');
    if (!resp.ok) throw new Error('Failed to fetch waste data');
    const data = await resp.json();
    if (!data || !data.objects) throw new Error('Waste data missing required fields');
    return data;
  } catch (error) {
    console.error('❌ Failed to load waste data:', error);
    // Fallback to minimal dataset
    return {
      objects: {
        unknown: {
          category: 'landfill',
          confidence: 0.3,
          instructions: 'Unknown item - default to landfill',
          tips: 'Try updating the app or checking your connection.'
        }
      },
      keywords: {}
    };
  }
} 