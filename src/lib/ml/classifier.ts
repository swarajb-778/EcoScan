import Fuse from 'fuse.js';
import type { WasteClassification, ClassificationData } from '../types/index.js';

export class WasteClassifier {
  private classificationData: ClassificationData | null = null;
  private fuse: Fuse<string> | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Load the waste classification database
      const response = await fetch('/data/wasteData.json');
      if (!response.ok) {
        throw new Error(`Failed to load waste data: ${response.statusText}`);
      }
      
      this.classificationData = await response.json();
      
      // Initialize fuzzy search for keyword matching
      if (this.classificationData) {
        const keywords = Object.keys(this.classificationData.keywords);
        this.fuse = new Fuse(keywords, {
        threshold: 0.4, // 60% similarity required
        distance: 100,
        minMatchCharLength: 2,
        keys: ['']
        });
      }
      
      this.isInitialized = true;
      console.log('🗃️ Waste classification database loaded');
    } catch (error) {
      console.error('❌ Failed to load classification data:', error);
      throw new Error(`Classification initialization failed: ${error}`);
    }
  }

  classify(objectName: string): WasteClassification | null {
    if (!this.isInitialized || !this.classificationData) {
      console.warn('Classifier not initialized');
      return null;
    }

    // Direct match in classifications
    const normalizedName = objectName.toLowerCase().trim();
    if (this.classificationData.classifications[normalizedName]) {
      return this.classificationData.classifications[normalizedName];
    }

    // Try keyword matching with fuzzy search
    const keywordMatch = this.findKeywordMatch(normalizedName);
    if (keywordMatch) {
      return keywordMatch;
    }

    // Return default classification for unknown items
    return {
      category: 'landfill',
      confidence: 0.3,
      instructions: 'Unknown item - when in doubt, dispose in regular trash',
      tips: 'Consider researching proper disposal methods for this item',
      color: '#6b7280'
    };
  }

  classifyVoiceInput(transcript: string): WasteClassification | null {
    if (!this.isInitialized || !this.classificationData || !this.fuse) {
      return null;
    }

    const words = transcript.toLowerCase().split(' ');
    
    // Try each word in the transcript
    for (const word of words) {
      // Direct classification match
      if (this.classificationData.classifications[word]) {
        return this.classificationData.classifications[word];
      }
      
      // Fuzzy keyword search
      const results = this.fuse.search(word);
      if (results.length > 0) {
        const bestMatch = results[0].item;
        const matchedObjects = this.classificationData.keywords[bestMatch];
        
        if (matchedObjects && matchedObjects.length > 0) {
          const firstObject = matchedObjects[0];
          const classification = this.classificationData.classifications[firstObject];
          if (classification) {
            return {
              ...classification,
              confidence: Math.max(0.5, classification.confidence - 0.2) // Reduce confidence for fuzzy match
            };
          }
        }
      }
    }

    // Try multi-word phrases
    const fullPhrase = transcript.toLowerCase().trim();
    const phraseResults = this.fuse.search(fullPhrase);
    if (phraseResults.length > 0) {
      const bestMatch = phraseResults[0].item;
      const matchedObjects = this.classificationData.keywords[bestMatch];
      
      if (matchedObjects && matchedObjects.length > 0) {
        const firstObject = matchedObjects[0];
        const classification = this.classificationData.classifications[firstObject];
        if (classification) {
          return classification;
        }
      }
    }

    return null;
  }

  private findKeywordMatch(objectName: string): WasteClassification | null {
    if (!this.classificationData || !this.fuse) {
      return null;
    }

    // Search for keyword matches
    const results = this.fuse.search(objectName);
    
    if (results.length > 0) {
      const bestMatch = results[0].item;
      const matchedObjects = this.classificationData.keywords[bestMatch];
      
      if (matchedObjects && matchedObjects.length > 0) {
        // Find the best matching object
        for (const obj of matchedObjects) {
          if (this.classificationData.classifications[obj]) {
            return {
              ...this.classificationData.classifications[obj],
              confidence: Math.max(0.6, this.classificationData.classifications[obj].confidence - 0.1)
            };
          }
        }
      }
    }

    return null;
  }

  getAllCategories(): Array<{ category: string; color: string; count: number }> {
    if (!this.classificationData) {
      return [];
    }

    const categoryStats = {
      recycle: { color: '#22c55e', count: 0 },
      compost: { color: '#84cc16', count: 0 },
      landfill: { color: '#ef4444', count: 0 }
    };

    // Count items in each category
    Object.values(this.classificationData.classifications).forEach(item => {
      if (categoryStats[item.category]) {
        categoryStats[item.category].count++;
      }
    });

    return Object.entries(categoryStats).map(([category, data]) => ({
      category,
      color: data.color,
      count: data.count
    }));
  }

  searchItems(query: string): Array<{ name: string; classification: WasteClassification }> {
    if (!this.classificationData || !query.trim()) {
      return [];
    }

    const results: Array<{ name: string; classification: WasteClassification }> = [];
    const searchTerm = query.toLowerCase();

    // Search in object names
    Object.entries(this.classificationData.classifications).forEach(([name, classification]) => {
      if (name.includes(searchTerm)) {
        results.push({ name, classification });
      }
    });

    // Search in keywords
    Object.entries(this.classificationData.keywords).forEach(([keyword, objects]) => {
      if (keyword.includes(searchTerm)) {
        objects.forEach(objName => {
          const classification = this.classificationData!.classifications[objName];
          if (classification && !results.find(r => r.name === objName)) {
            results.push({ name: objName, classification });
          }
        });
      }
    });

    return results.slice(0, 10); // Limit results
  }

  getCategoryInfo(category: 'recycle' | 'compost' | 'landfill'): { color: string; description: string; icon: string } {
    const categoryInfo = {
      recycle: {
        color: '#22c55e',
        description: 'Clean containers, paper, and recyclable materials',
        icon: '♻️'
      },
      compost: {
        color: '#84cc16', 
        description: 'Organic waste like food scraps and yard waste',
        icon: '🌱'
      },
      landfill: {
        color: '#ef4444',
        description: 'General waste and non-recyclable items',
        icon: '🗑️'
      }
    };

    return categoryInfo[category];
  }
} 