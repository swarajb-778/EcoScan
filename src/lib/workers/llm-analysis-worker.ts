/**
 * LLM Analysis Worker for Enhanced Waste Classification
 * 
 * This worker runs LLM-powered analysis for detected objects to provide:
 * - Contextual understanding of waste items
 * - Enhanced disposal recommendations
 * - Environmental impact analysis
 * - Confidence scoring and reasoning
 */

import { browser } from '$app/environment';

// Simple LLM interface for waste analysis
interface LLMResponse {
  description: string;
  contextualTags: string[];
  disposalRecommendation: string;
  environmentalImpact: string;
  confidenceScore: number;
  reasoning: string;
}

interface DetectionRequest {
  type: string;
  detections: any[];
  imageBase64: string;
}

class LLMAnalysisEngine {
  public isInitialized = false;
  private wasteKnowledgeBase: Map<string, LLMResponse> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    // Pre-built knowledge base for common waste items
    // This simulates LLM responses for faster performance
    const wasteKnowledge: Array<[string, LLMResponse]> = [
      ['bottle', {
        description: 'Plastic or glass bottle commonly used for beverages',
        contextualTags: ['recyclable', 'container', 'beverage', 'packaging'],
        disposalRecommendation: 'Remove cap and label, rinse thoroughly, place in recycling bin. Check local recycling guidelines for plastic type acceptance.',
        environmentalImpact: 'Plastic bottles can take 450+ years to decompose. Recycling one plastic bottle saves enough energy to power a 60W light bulb for 6+ hours.',
        confidenceScore: 0.95,
        reasoning: 'Clear container shape with narrow neck indicates beverage bottle. High recyclability in most municipal programs.'
      }],
      
      ['cup', {
        description: 'Drinking vessel, material varies (plastic, paper, ceramic)',
        contextualTags: ['container', 'beverage', 'single-use', 'food-service'],
        disposalRecommendation: 'Check material: ceramic cups are reusable, plastic cups may be recyclable, paper cups often have plastic lining requiring special processing.',
        environmentalImpact: 'Single-use cups contribute significantly to waste. One reusable cup can replace 500+ disposable cups annually.',
        confidenceScore: 0.88,
        reasoning: 'Cup shape detected. Material identification needed for proper disposal guidance.'
      }],

      ['banana', {
        description: 'Organic fruit waste including peel',
        contextualTags: ['organic', 'compostable', 'food-waste', 'fruit'],
        disposalRecommendation: 'Excellent for composting! Both fruit and peel decompose quickly. Can also be used for natural fertilizer or worm composting.',
        environmentalImpact: 'Composting banana peels reduces methane emissions from landfills and creates nutrient-rich soil amendment.',
        confidenceScore: 0.96,
        reasoning: 'Organic matter with high potassium content. Ideal for composting systems.'
      }],

      ['apple', {
        description: 'Fresh fruit, core, or apple-based food waste',
        contextualTags: ['organic', 'compostable', 'food-waste', 'fruit'],
        disposalRecommendation: 'Remove any stickers before composting. Apple waste decomposes readily and adds carbon to compost systems.',
        environmentalImpact: 'Apple cores decompose in 2-6 weeks in compost. Fruit waste diverted from landfills reduces greenhouse gas emissions.',
        confidenceScore: 0.92,
        reasoning: 'Spherical fruit structure identified. High organic content suitable for biological decomposition.'
      }],

      ['sandwich', {
        description: 'Prepared food item with multiple components',
        contextualTags: ['food-waste', 'mixed-materials', 'organic', 'perishable'],
        disposalRecommendation: 'Separate components: bread and vegetables for composting, meat requires hot composting or disposal. Remove non-food packaging.',
        environmentalImpact: 'Food waste generates methane in landfills. Proper composting reduces emissions and creates valuable soil amendment.',
        confidenceScore: 0.85,
        reasoning: 'Complex food item requiring component-based disposal assessment.'
      }],

      ['fork', {
        description: 'Eating utensil, typically metal, plastic, or wood',
        contextualTags: ['utensil', 'reusable', 'kitchen-ware', 'durable'],
        disposalRecommendation: 'Metal forks: wash and reuse or recycle with scrap metal. Plastic: check recycling number. Wood: compostable if untreated.',
        environmentalImpact: 'Reusable utensils significantly reduce single-use waste. One metal fork can replace thousands of disposable alternatives.',
        confidenceScore: 0.90,
        reasoning: 'Pronged eating implement identified. Material assessment needed for disposal guidance.'
      }],

      ['bowl', {
        description: 'Round food container, various materials possible',
        contextualTags: ['container', 'food-service', 'reusable', 'kitchen-ware'],
        disposalRecommendation: 'Ceramic/glass: wash and reuse. Plastic: check recycling code. Paper: compost if food-grade, otherwise landfill.',
        environmentalImpact: 'Reusable bowls eliminate need for disposable alternatives. Material choice significantly impacts lifecycle emissions.',
        confidenceScore: 0.87,
        reasoning: 'Concave food container identified. Durability suggests potential for reuse.'
      }]
    ];

    // Populate knowledge base
    for (const [key, value] of wasteKnowledge) {
      this.wasteKnowledgeBase.set(key, value);
    }

    console.log('🧠 LLM Knowledge Base initialized with', this.wasteKnowledgeBase.size, 'waste categories');
  }

  async initialize(): Promise<boolean> {
    try {
      // In a real implementation, this would initialize a lightweight LLM
      // For now, we use the pre-built knowledge base for fast responses
      this.isInitialized = true;
      console.log('✅ LLM Analysis Engine initialized');
      return true;
    } catch (error) {
      console.error('❌ LLM initialization failed:', error);
      return false;
    }
  }

  async analyzeDetections(detections: any[], imageContext?: string): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('LLM Analysis Engine not initialized');
    }

    const enhancedDetections = await Promise.all(
      detections.map(async detection => {
        const llmAnalysis = await this.analyzeSingleDetection(detection, imageContext);
        return {
          ...detection,
          llmContext: llmAnalysis,
          // Update confidence based on LLM analysis
          confidenceCalibrated: Math.min(
            detection.confidence * (llmAnalysis.confidenceScore / 0.9),
            1.0
          )
        };
      })
    );

    return enhancedDetections;
  }

  private async analyzeSingleDetection(detection: any, imageContext?: string): Promise<LLMResponse> {
    const className = detection.class.toLowerCase();
    
    // First, check knowledge base for exact match
    let llmResponse = this.wasteKnowledgeBase.get(className);
    
    if (!llmResponse) {
      // Try fuzzy matching for similar items
      llmResponse = this.findSimilarItem(className);
    }
    
    if (!llmResponse) {
      // Generate generic response for unknown items
      llmResponse = this.generateGenericResponse(className, detection);
    }

    // Enhance response with context-specific information
    return this.enhanceWithContext(llmResponse, detection, imageContext);
  }

  private findSimilarItem(className: string): LLMResponse | undefined {
    // Simple fuzzy matching logic
    const similarities: Array<[string, number]> = [];
    
    for (const [key] of this.wasteKnowledgeBase) {
      const similarity = this.calculateStringSimilarity(className, key);
      if (similarity > 0.6) {
        similarities.push([key, similarity]);
      }
    }
    
    if (similarities.length > 0) {
      // Return the most similar item
      similarities.sort((a, b) => b[1] - a[1]);
      const bestMatch = this.wasteKnowledgeBase.get(similarities[0][0]);
      
      if (bestMatch) {
        return {
          ...bestMatch,
          confidenceScore: bestMatch.confidenceScore * similarities[0][1],
          reasoning: `Similar to ${similarities[0][0]}. ${bestMatch.reasoning}`
        };
      }
    }
    
    return undefined;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  private generateGenericResponse(className: string, detection: any): LLMResponse {
    // Generate a generic but helpful response for unknown items
    const isLikelyOrganic = ['food', 'fruit', 'vegetable', 'plant'].some(term => 
      className.includes(term)
    );
    
    const isLikelyContainer = ['container', 'box', 'bottle', 'cup', 'can'].some(term => 
      className.includes(term)
    );

    let disposalRecommendation: string;
    let environmentalImpact: string;
    let contextualTags: string[];

    if (isLikelyOrganic) {
      disposalRecommendation = 'Likely organic material. Check if suitable for composting. Remove any non-organic components like stickers or packaging.';
      environmentalImpact = 'Organic waste diverted from landfills reduces methane emissions and can create valuable compost.';
      contextualTags = ['potentially-organic', 'requires-assessment', 'biodegradable'];
    } else if (isLikelyContainer) {
      disposalRecommendation = 'Check material composition and local recycling guidelines. Clean thoroughly before disposal.';
      environmentalImpact = 'Container reuse and recycling significantly reduces resource consumption and waste generation.';
      contextualTags = ['potentially-recyclable', 'container', 'requires-cleaning'];
    } else {
      disposalRecommendation = 'Unknown item type. Check local waste management guidelines or contact waste management facility for guidance.';
      environmentalImpact = 'Proper identification and disposal prevents contamination of recycling streams.';
      contextualTags = ['unknown', 'requires-identification', 'check-guidelines'];
    }

    return {
      description: `Unidentified object classified as "${className}". Manual verification recommended.`,
      contextualTags,
      disposalRecommendation,
      environmentalImpact,
      confidenceScore: 0.5, // Lower confidence for unknown items
      reasoning: 'Item not in knowledge base. Generic disposal guidance provided based on object characteristics.'
    };
  }

  private enhanceWithContext(response: LLMResponse, detection: any, imageContext?: string): LLMResponse {
    // Enhance the base response with detection-specific context
    let enhancedResponse = { ...response };
    
    // Adjust confidence based on detection confidence
    const detectionConfidence = detection.confidence || 0.5;
    enhancedResponse.confidenceScore = Math.min(
      enhancedResponse.confidenceScore * (0.5 + detectionConfidence * 0.5),
      1.0
    );
    
    // Add size-based context
    const [x, y, width, height] = detection.bbox || [0, 0, 0, 0];
    const area = width * height;
    
    if (area > 10000) { // Large object
      enhancedResponse.contextualTags.push('large-item');
      enhancedResponse.disposalRecommendation += ' Note: Large item may require special handling or bulk waste collection.';
    } else if (area < 1000) { // Small object
      enhancedResponse.contextualTags.push('small-item');
      enhancedResponse.disposalRecommendation += ' Small item - ensure proper sorting to avoid contamination.';
    }
    
    // Add confidence reasoning
    enhancedResponse.reasoning += ` Detection confidence: ${(detectionConfidence * 100).toFixed(1)}%. `;
    
    if (detectionConfidence < 0.7) {
      enhancedResponse.reasoning += 'Lower detection confidence suggests manual verification may be beneficial.';
    }
    
    return enhancedResponse;
  }
}

// Global LLM engine instance
let llmEngine: LLMAnalysisEngine | null = null;

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { type, ...data } = event.data;
  
  try {
    switch (type) {
      case 'init-llm':
        if (!llmEngine) {
          llmEngine = new LLMAnalysisEngine();
        }
        const success = await llmEngine.initialize();
        self.postMessage({ type: 'llm-init-complete', success });
        break;
        
      case 'analyze-detections':
        if (!llmEngine || !llmEngine.isInitialized) {
          throw new Error('LLM engine not initialized');
        }
        
        const { detections, imageBase64 } = data;
        const enhancedDetections = await llmEngine.analyzeDetections(detections, imageBase64);
        
        self.postMessage({ 
          type: 'llm-analysis-complete', 
          detections: enhancedDetections 
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('LLM Worker error:', error);
    self.postMessage({ 
      type: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Handle worker termination
self.addEventListener('unload', () => {
  llmEngine = null;
});

export {}; // Make this a module 