// LLM Worker for Advanced Waste Classification
// Provides intelligent waste categorization using language models

interface LLMClassificationRequest {
  id: string;
  objectName: string;
  context: {
    lighting: string;
    sceneType: string;
    imageDescription?: string;
    confidence: number;
  };
  previousClassifications?: string[];
}

interface LLMClassificationResult {
  id: string;
  success: boolean;
  classification?: {
    category: 'recycle' | 'compost' | 'landfill' | 'hazardous' | 'reuse';
    subcategory: string;
    confidence: number;
    reasoning: string;
    instructions: string;
    tips: string[];
    alternativeUses?: string[];
    environmentalImpact?: string;
  };
  error?: string;
  processingTime: number;
}

interface WasteClassificationDatabase {
  [key: string]: {
    category: 'recycle' | 'compost' | 'landfill' | 'hazardous' | 'reuse';
    subcategory: string;
    keywords: string[];
    materials: string[];
    instructions: string;
    tips: string[];
    reasoning: string;
    alternativeUses?: string[];
    environmentalImpact?: string;
    recyclingCode?: string;
    specialInstructions?: string;
  };
}

class LLMWorker {
  private isInitialized = false;
  private classificationDatabase: WasteClassificationDatabase;
  private fuzzyMatcher: FuzzyMatcher;
  private contextAnalyzer: ContextAnalyzer;

  constructor() {
    this.classificationDatabase = {};
    this.fuzzyMatcher = new FuzzyMatcher();
    this.contextAnalyzer = new ContextAnalyzer();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🧠 LLM Worker initializing...');
    
    // Load comprehensive waste classification database
    await this.loadClassificationDatabase();
    
    // Initialize fuzzy matching
    this.fuzzyMatcher.initialize(Object.keys(this.classificationDatabase));
    
    this.isInitialized = true;
    console.log('✅ LLM Worker initialized with', Object.keys(this.classificationDatabase).length, 'classifications');
  }

  private async loadClassificationDatabase(): Promise<void> {
    this.classificationDatabase = {
      // Plastic containers
      'bottle': {
        category: 'recycle',
        subcategory: 'plastic_container',
        keywords: ['bottle', 'water bottle', 'soda bottle', 'plastic bottle', 'beverage container'],
        materials: ['PET', 'HDPE', 'plastic'],
        instructions: 'Remove cap and label. Rinse thoroughly. Check recycling number on bottom.',
        tips: [
          'Look for recycling symbol (usually 1 or 2)',
          'Remove all labels and adhesive residue',
          'Rinse with warm water to remove sticky residues',
          'Caps can often be recycled separately'
        ],
        reasoning: 'Most plastic bottles are made from PET (#1) or HDPE (#2) which are highly recyclable',
        alternativeUses: ['Planters', 'Storage containers', 'Bird feeders'],
        environmentalImpact: 'Recycling one plastic bottle saves enough energy to power a 60W bulb for 3 hours',
        recyclingCode: 'Check bottom for numbers 1-7',
        specialInstructions: 'Never crush lengthwise - only top to bottom'
      },

      'plastic_bag': {
        category: 'recycle',
        subcategory: 'soft_plastic',
        keywords: ['plastic bag', 'shopping bag', 'grocery bag', 'polyethylene bag'],
        materials: ['LDPE', 'HDPE'],
        instructions: 'Take to special collection bins at grocery stores. Do not put in curbside recycling.',
        tips: [
          'Clean and dry completely before recycling',
          'Remove receipts and other materials',
          'Bundle with other plastic bags',
          'Look for collection bins at supermarkets'
        ],
        reasoning: 'Plastic bags jam sorting machinery at recycling facilities, requiring special collection',
        environmentalImpact: 'One reusable bag can replace 1000+ plastic bags over its lifetime'
      },

      // Organic waste
      'apple': {
        category: 'compost',
        subcategory: 'fruit_waste',
        keywords: ['apple', 'fruit', 'apple core', 'apple peel'],
        materials: ['organic matter'],
        instructions: 'Remove any stickers. Can be composted whole or chopped for faster decomposition.',
        tips: [
          'Remove produce stickers - they\'re not compostable',
          'Cut into smaller pieces for faster composting',
          'Apple peels add valuable nutrients to compost',
          'Worms love apple scraps'
        ],
        reasoning: 'Apples are 100% biodegradable and rich in nutrients for composting',
        alternativeUses: ['Animal feed (without seeds)', 'Natural bird food'],
        environmentalImpact: 'Composting reduces methane emissions compared to landfilling'
      },

      'banana': {
        category: 'compost',
        subcategory: 'fruit_waste',
        keywords: ['banana', 'banana peel', 'banana skin'],
        materials: ['organic matter', 'potassium'],
        instructions: 'Both peel and fruit can be composted. Peel decomposes faster when chopped.',
        tips: [
          'Banana peels are excellent for composting',
          'High in potassium - great for plants',
          'Chop peels for faster decomposition',
          'Can be buried directly in garden soil'
        ],
        reasoning: 'Bananas are rich in potassium and other nutrients beneficial for soil',
        alternativeUses: ['Natural fertilizer', 'Shoe polish (inside of peel)', 'Smoothie ingredient'],
        environmentalImpact: 'Banana peels can replace chemical fertilizers'
      },

      // Paper products
      'cardboard': {
        category: 'recycle',
        subcategory: 'paper_product',
        keywords: ['cardboard', 'corrugated cardboard', 'shipping box', 'packaging'],
        materials: ['recycled paper', 'wood pulp'],
        instructions: 'Remove tape, staples, and labels. Flatten boxes. Keep dry.',
        tips: [
          'Break down large boxes to save space',
          'Remove all plastic tape and metal staples',
          'Keep cardboard dry - wet cardboard can\'t be recycled',
          'Pizza boxes are OK if not too greasy'
        ],
        reasoning: 'Cardboard is made from paper fibers that can be recycled 5-7 times',
        alternativeUses: ['Garden mulch', 'Moving boxes', 'Kid\'s crafts', 'Drawer organizers'],
        environmentalImpact: 'Recycling cardboard uses 75% less energy than making new cardboard'
      },

      'newspaper': {
        category: 'recycle',
        subcategory: 'paper_product',
        keywords: ['newspaper', 'newsprint', 'magazine', 'paper'],
        materials: ['recycled paper', 'ink'],
        instructions: 'Keep dry. Remove plastic bags. Can be mixed with other paper.',
        tips: [
          'Newspaper can be recycled with other mixed paper',
          'Remove plastic delivery bags',
          'Glossy inserts are usually recyclable too',
          'Keep away from food waste to prevent contamination'
        ],
        reasoning: 'Newspaper is made from short paper fibers that can be recycled multiple times',
        alternativeUses: ['Gift wrapping', 'Packing material', 'Garden weed barrier', 'Pet bedding'],
        environmentalImpact: 'One ton of recycled paper saves 17 trees'
      },

      // Electronics
      'cell_phone': {
        category: 'hazardous',
        subcategory: 'electronics',
        keywords: ['cell phone', 'mobile phone', 'smartphone', 'iPhone', 'Android'],
        materials: ['lithium battery', 'precious metals', 'rare earth elements'],
        instructions: 'Take to electronics recycling center. Remove personal data first. Do not put in regular trash.',
        tips: [
          'Wipe all personal data before disposal',
          'Check manufacturer take-back programs',
          'Many retailers accept old phones for recycling',
          'Consider donating if still functional'
        ],
        reasoning: 'Phones contain valuable materials and toxic substances requiring special handling',
        alternativeUses: ['Donate to charity', 'Use as dedicated music player', 'Security camera'],
        environmentalImpact: 'One phone contains gold, silver, and rare earth metals worth several dollars',
        specialInstructions: 'Remove SIM card and memory cards'
      },

      'battery': {
        category: 'hazardous',
        subcategory: 'toxic_waste',
        keywords: ['battery', 'AA battery', 'lithium battery', 'rechargeable battery'],
        materials: ['lithium', 'acid', 'heavy metals'],
        instructions: 'Take to battery recycling collection point. Never put in regular trash.',
        tips: [
          'Many stores have battery collection boxes',
          'Tape terminals of lithium batteries',
          'Keep different battery types separated',
          'Car batteries can be returned to auto stores'
        ],
        reasoning: 'Batteries contain toxic materials that can contaminate soil and water',
        environmentalImpact: 'One battery can contaminate 20,000 liters of water',
        specialInstructions: 'Cover terminals with tape to prevent sparks'
      },

      // Glass
      'jar': {
        category: 'recycle',
        subcategory: 'glass_container',
        keywords: ['jar', 'glass jar', 'mason jar', 'pickle jar', 'jam jar'],
        materials: ['glass', 'metal lid'],
        instructions: 'Rinse clean. Remove metal lids (recycle separately). Can include in glass recycling.',
        tips: [
          'Remove metal lids and rings (recycle with metals)',
          'Rinse but don\'t need to remove labels',
          'Separate by color if required locally',
          'Small glass pieces should go in trash'
        ],
        reasoning: 'Glass can be recycled endlessly without quality loss',
        alternativeUses: ['Storage containers', 'Vases', 'Candle holders', 'Planters'],
        environmentalImpact: 'Glass recycling uses 40% less energy than making new glass'
      },

      // Metal
      'can': {
        category: 'recycle',
        subcategory: 'metal_container',
        keywords: ['can', 'aluminum can', 'tin can', 'food can', 'soda can'],
        materials: ['aluminum', 'steel', 'tin'],
        instructions: 'Rinse clean. Labels can stay on. Crush to save space.',
        tips: [
          'Rinse to remove food residue',
          'Labels don\'t need to be removed',
          'Crushing saves space but isn\'t required',
          'Steel and aluminum cans are both recyclable'
        ],
        reasoning: 'Metal cans are 100% recyclable and can become new cans in 60 days',
        environmentalImpact: 'Recycling aluminum cans uses 95% less energy than making new ones'
      },

      // Textiles
      'clothing': {
        category: 'reuse',
        subcategory: 'textile',
        keywords: ['clothing', 'shirt', 'pants', 'fabric', 'clothes'],
        materials: ['cotton', 'polyester', 'wool', 'synthetic fibers'],
        instructions: 'Donate if in good condition. Take to textile recycling if worn out.',
        tips: [
          'Donate wearable items to charity',
          'Some stores accept textiles for recycling',
          'Even worn-out clothes can be recycled into rags',
          'Shoes can often be recycled separately'
        ],
        reasoning: 'Textiles can be reused, repurposed, or recycled into new materials',
        alternativeUses: ['Cleaning rags', 'Pet bedding', 'Compost (natural fibers only)'],
        environmentalImpact: 'Textile production is very water-intensive - reuse saves resources'
      },

      // Food waste
      'food_scraps': {
        category: 'compost',
        subcategory: 'organic_waste',
        keywords: ['food scraps', 'vegetable peels', 'fruit scraps', 'coffee grounds'],
        materials: ['organic matter'],
        instructions: 'Compost in backyard bin or municipal program. Avoid meat and dairy in home compost.',
        tips: [
          'Mix green (nitrogen) and brown (carbon) materials',
          'Turn compost regularly for faster decomposition',
          'Keep compost moist but not soggy',
          'Avoid meat, dairy, and oils in home compost'
        ],
        reasoning: 'Food waste in landfills produces methane, a potent greenhouse gas',
        environmentalImpact: 'Composting reduces landfill waste and creates valuable soil amendment'
      }
    };
  }

  async processClassification(request: LLMClassificationRequest): Promise<LLMClassificationResult> {
    const startTime = performance.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Find best matches using fuzzy search
      const matches = this.fuzzyMatcher.search(request.objectName);
      
      let classification;
      
      if (matches.length > 0) {
        const bestMatch = matches[0];
        const baseClassification = this.classificationDatabase[bestMatch.item];
        
        // Enhance classification with context
        classification = await this.enhanceWithContext(baseClassification, request.context);
        
        // Adjust confidence based on match quality and context
        classification.confidence = this.calculateConfidence(bestMatch.score, request.context);
        
      } else {
        // Use advanced heuristics for unknown items
        classification = await this.classifyUnknownItem(request);
      }

      const processingTime = performance.now() - startTime;

      return {
        id: request.id,
        success: true,
        classification,
        processingTime
      };

    } catch (error: any) {
      const processingTime = performance.now() - startTime;
      
      return {
        id: request.id,
        success: false,
        error: error.message,
        processingTime
      };
    }
  }

  private async enhanceWithContext(
    baseClassification: any,
    context: any
  ): Promise<any> {
    let enhanced = { ...baseClassification };

    // Adjust instructions based on context
    if (context.lighting === 'dim' || context.lighting === 'dark') {
      enhanced.tips = [
        'Consider better lighting for accurate identification',
        ...enhanced.tips
      ];
    }

    if (context.sceneType === 'kitchen') {
      if (enhanced.category === 'compost') {
        enhanced.tips = [
          'Perfect for kitchen compost bin',
          ...enhanced.tips
        ];
      }
    }

    // Add confidence boost for clear, well-lit images
    if (context.lighting === 'bright' && context.confidence > 0.8) {
      enhanced.reasoning += ' High confidence due to clear image quality.';
    }

    return enhanced;
  }

  private calculateConfidence(matchScore: number, context: any): number {
    let baseConfidence = matchScore;
    
    // Adjust based on context
    if (context.lighting === 'bright') {
      baseConfidence *= 1.1;
    } else if (context.lighting === 'dim') {
      baseConfidence *= 0.9;
    } else if (context.lighting === 'dark') {
      baseConfidence *= 0.7;
    }

    // Adjust based on original detection confidence
    baseConfidence *= context.confidence;

    return Math.min(0.95, Math.max(0.1, baseConfidence));
  }

  private async classifyUnknownItem(request: LLMClassificationRequest): Promise<any> {
    const objectName = request.objectName.toLowerCase();
    
    // Apply heuristic rules for unknown items
    if (objectName.includes('plastic') || objectName.includes('bottle')) {
      return {
        category: 'recycle' as const,
        subcategory: 'unknown_plastic',
        confidence: 0.6,
        reasoning: 'Identified as plastic-like material. Most plastic containers are recyclable.',
        instructions: 'Check for recycling number on bottom. When in doubt, check local recycling guidelines.',
        tips: [
          'Look for recycling symbols',
          'Clean before recycling',
          'Check local recycling programs'
        ]
      };
    }

    if (objectName.includes('paper') || objectName.includes('cardboard')) {
      return {
        category: 'recycle' as const,
        subcategory: 'unknown_paper',
        confidence: 0.7,
        reasoning: 'Appears to be paper-based material, which is typically recyclable.',
        instructions: 'Keep dry and clean. Most paper products are recyclable.',
        tips: [
          'Remove any plastic components',
          'Keep dry for recycling',
          'Avoid wax-coated papers'
        ]
      };
    }

    if (objectName.includes('food') || objectName.includes('organic')) {
      return {
        category: 'compost' as const,
        subcategory: 'unknown_organic',
        confidence: 0.8,
        reasoning: 'Organic material suitable for composting.',
        instructions: 'Add to compost bin if available, otherwise dispose in organic waste.',
        tips: [
          'Great for home composting',
          'Chop into smaller pieces for faster decomposition',
          'Mix with other compost materials'
        ]
      };
    }

    if (objectName.includes('electronic') || objectName.includes('battery')) {
      return {
        category: 'hazardous' as const,
        subcategory: 'unknown_electronic',
        confidence: 0.9,
        reasoning: 'Electronic items require special disposal due to toxic materials.',
        instructions: 'Take to electronics recycling center. Do not put in regular trash.',
        tips: [
          'Check for manufacturer take-back programs',
          'Remove personal data if applicable',
          'Many retailers accept electronics for recycling'
        ]
      };
    }

    // Default classification for truly unknown items
    return {
      category: 'landfill' as const,
      subcategory: 'unknown_item',
      confidence: 0.3,
      reasoning: 'Unable to determine specific classification. When in doubt, check local guidelines.',
      instructions: 'Check with local waste management for guidance on this item.',
      tips: [
        'Contact local waste management',
        'Look for manufacturer disposal instructions',
        'Consider if item can be reused or repaired'
      ],
      alternativeUses: ['Check if item can be repaired', 'Consider donation if functional']
    };
  }
}

// Fuzzy matching implementation
class FuzzyMatcher {
  private items: string[] = [];
  private threshold = 0.6;

  initialize(items: string[]): void {
    this.items = items;
  }

  search(query: string): Array<{ item: string; score: number }> {
    const results: Array<{ item: string; score: number }> = [];
    const lowerQuery = query.toLowerCase();

    for (const item of this.items) {
      const score = this.calculateSimilarity(lowerQuery, item.toLowerCase());
      if (score >= this.threshold) {
        results.push({ item, score });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance based similarity
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    return (maxLength - distance) / maxLength;
  }
}

// Simple context analyzer for worker
class ContextAnalyzer {
  analyzeContext(context: any): any {
    // Simple context analysis within worker
    return {
      reliability: context.lighting === 'bright' ? 'high' : 'medium',
      complexity: context.sceneType === 'kitchen' ? 'familiar' : 'unknown'
    };
  }
}

// Worker instance
const llmWorker = new LLMWorker();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<LLMClassificationRequest>) => {
  const request = event.data;
  const result = await llmWorker.processClassification(request);
  self.postMessage(result);
};

// Export for TypeScript
export {}; 