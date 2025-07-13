export interface SearchIndex {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  searchableFields: string[];
  boost: number;
  language: string;
  score?: number;
  highlights?: SearchHighlight[];
}

export interface SearchQuery {
  q: string;
  filters: SearchFilter[];
  facets: string[];
  sort: SortOption[];
  pagination: PaginationOptions;
  highlighting: HighlightOptions;
  suggestions: boolean;
  analytics: boolean;
  language?: string;
  boost?: BoostOptions;
  fuzzy?: FuzzyOptions;
  proximity?: ProximityOptions;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'range' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'regex' | 'geo_distance' | 'geo_bounding_box';
  value: any;
  boost?: number;
  required?: boolean;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  type?: 'string' | 'number' | 'date' | 'relevance';
  missing?: 'first' | 'last';
}

export interface PaginationOptions {
  page: number;
  size: number;
  offset?: number;
  limit?: number;
}

export interface HighlightOptions {
  enabled: boolean;
  fields: string[];
  preTag: string;
  postTag: string;
  maxLength: number;
  fragmentSize: number;
  numberOfFragments: number;
}

export interface BoostOptions {
  titleBoost: number;
  contentBoost: number;
  tagBoost: number;
  authorBoost: number;
  recentBoost: number;
  popularityBoost: number;
}

export interface FuzzyOptions {
  enabled: boolean;
  minSimilarity: number;
  prefixLength: number;
  maxExpansions: number;
  unicode: boolean;
}

export interface ProximityOptions {
  enabled: boolean;
  distance: number;
  inOrder: boolean;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  size: number;
  facets: SearchFacet[];
  suggestions: SearchSuggestion[];
  queryTime: number;
  totalTime: number;
  hasMore: boolean;
  aggregations: SearchAggregation[];
  debug?: SearchDebugInfo;
}

export interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  score: number;
  highlights: SearchHighlight[];
  metadata: Record<string, any>;
  explanation?: ScoreExplanation;
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
  matchedTerms: string[];
}

export interface SearchFacet {
  field: string;
  name: string;
  values: FacetValue[];
  type: 'terms' | 'range' | 'date' | 'numeric' | 'geo';
  missing?: number;
}

export interface FacetValue {
  value: any;
  count: number;
  selected: boolean;
  label?: string;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  frequency: number;
  type: 'term' | 'phrase' | 'completion';
  highlighted?: string;
}

export interface SearchAggregation {
  name: string;
  type: 'terms' | 'range' | 'date_histogram' | 'stats' | 'cardinality' | 'percentiles';
  values: AggregationValue[];
  metadata?: Record<string, any>;
}

export interface AggregationValue {
  key: any;
  value: number;
  metadata?: Record<string, any>;
}

export interface ScoreExplanation {
  value: number;
  description: string;
  details: ScoreExplanation[];
}

export interface SearchDebugInfo {
  queryStructure: any;
  executionTime: number;
  indexStats: IndexStats;
  performance: PerformanceStats;
}

export interface IndexStats {
  totalDocuments: number;
  indexSize: number;
  lastUpdate: Date;
  fields: FieldStats[];
}

export interface FieldStats {
  field: string;
  type: string;
  cardinality: number;
  coverage: number;
  avgLength: number;
}

export interface PerformanceStats {
  queryTime: number;
  fetchTime: number;
  highlightTime: number;
  facetTime: number;
  suggestionTime: number;
  totalTime: number;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  avgResponseTime: number;
  topQueries: QueryAnalytics[];
  topTerms: TermAnalytics[];
  noResultsQueries: string[];
  clickThroughRate: number;
  conversionRate: number;
  userBehavior: UserBehaviorAnalytics;
  performance: PerformanceAnalytics;
}

export interface QueryAnalytics {
  query: string;
  count: number;
  avgScore: number;
  clickThroughRate: number;
  conversionRate: number;
  noResults: boolean;
  lastSearched: Date;
}

export interface TermAnalytics {
  term: string;
  frequency: number;
  documents: number;
  avgScore: number;
  trending: boolean;
}

export interface UserBehaviorAnalytics {
  searchSessions: number;
  avgSearchesPerSession: number;
  bounceRate: number;
  refinementRate: number;
  filterUsage: Record<string, number>;
  facetUsage: Record<string, number>;
}

export interface PerformanceAnalytics {
  avgQueryTime: number;
  avgFetchTime: number;
  slowQueries: QueryAnalytics[];
  indexPerformance: IndexPerformanceMetrics;
}

export interface IndexPerformanceMetrics {
  indexingRate: number;
  searchRate: number;
  errorRate: number;
  availability: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface SearchConfiguration {
  indexing: IndexingConfig;
  search: SearchConfig;
  analytics: AnalyticsConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

export interface IndexingConfig {
  batchSize: number;
  refreshInterval: number;
  analyzers: AnalyzerConfig[];
  fieldMappings: FieldMappingConfig[];
  synonyms: SynonymConfig[];
  stopWords: string[];
  stemming: boolean;
  phonetic: boolean;
}

export interface AnalyzerConfig {
  name: string;
  type: 'standard' | 'keyword' | 'simple' | 'whitespace' | 'stop' | 'pattern' | 'custom';
  tokenizer?: string;
  filters: string[];
  charFilters: string[];
  language?: string;
}

export interface FieldMappingConfig {
  field: string;
  type: 'text' | 'keyword' | 'number' | 'date' | 'boolean' | 'geo' | 'object' | 'nested';
  analyzer?: string;
  searchAnalyzer?: string;
  boost?: number;
  store?: boolean;
  index?: boolean;
  facet?: boolean;
  suggest?: boolean;
}

export interface SynonymConfig {
  name: string;
  synonyms: string[][];
  expand: boolean;
}

export interface SearchConfig {
  defaultOperator: 'and' | 'or';
  minimumShouldMatch: number;
  defaultSize: number;
  maxSize: number;
  defaultSort: SortOption[];
  highlighting: HighlightOptions;
  fuzzy: FuzzyOptions;
  proximity: ProximityOptions;
  boost: BoostOptions;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackQueries: boolean;
  trackClicks: boolean;
  trackConversions: boolean;
  retention: number;
  sampling: number;
  realtime: boolean;
}

export interface PerformanceConfig {
  caching: boolean;
  cacheSize: number;
  cacheTTL: number;
  timeout: number;
  retries: number;
  parallelization: boolean;
  optimization: boolean;
}

export interface SecurityConfig {
  authentication: boolean;
  authorization: boolean;
  encryption: boolean;
  auditLogging: boolean;
  rateLimiting: RateLimitConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  burst: number;
}

export class AdvancedSearchSystem {
  private indices: Map<string, SearchIndex[]>;
  private config: SearchConfiguration;
  private analytics: SearchAnalytics;
  private cache: Map<string, SearchResult>;
  private synonyms: Map<string, string[]>;
  private stopWords: Set<string>;
  private stemmer: PorterStemmer;
  private isInitialized: boolean;

  constructor(config?: Partial<SearchConfiguration>) {
    this.indices = new Map();
    this.config = this.mergeConfig(config);
    this.analytics = this.initializeAnalytics();
    this.cache = new Map();
    this.synonyms = new Map();
    this.stopWords = new Set();
    this.stemmer = new PorterStemmer();
    this.isInitialized = false;
    
    this.initialize();
  }

  private mergeConfig(config?: Partial<SearchConfiguration>): SearchConfiguration {
    const defaultConfig: SearchConfiguration = {
      indexing: {
        batchSize: 1000,
        refreshInterval: 1000,
        analyzers: [
          {
            name: 'standard',
            type: 'standard',
            filters: ['lowercase', 'stop', 'stemmer'],
            charFilters: ['html_strip']
          }
        ],
        fieldMappings: [
          { field: 'title', type: 'text', analyzer: 'standard', boost: 2.0, facet: true },
          { field: 'content', type: 'text', analyzer: 'standard', boost: 1.0 },
          { field: 'tags', type: 'keyword', facet: true, suggest: true },
          { field: 'category', type: 'keyword', facet: true },
          { field: 'author', type: 'keyword', facet: true },
          { field: 'createdAt', type: 'date', facet: true },
          { field: 'type', type: 'keyword', facet: true }
        ],
        synonyms: [],
        stopWords: ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by'],
        stemming: true,
        phonetic: false
      },
      search: {
        defaultOperator: 'and',
        minimumShouldMatch: 1,
        defaultSize: 10,
        maxSize: 100,
        defaultSort: [{ field: '_score', direction: 'desc', type: 'relevance' }],
        highlighting: {
          enabled: true,
          fields: ['title', 'content'],
          preTag: '<mark>',
          postTag: '</mark>',
          maxLength: 200,
          fragmentSize: 100,
          numberOfFragments: 3
        },
        fuzzy: {
          enabled: true,
          minSimilarity: 0.7,
          prefixLength: 2,
          maxExpansions: 50,
          unicode: true
        },
        proximity: {
          enabled: true,
          distance: 10,
          inOrder: false
        },
        boost: {
          titleBoost: 2.0,
          contentBoost: 1.0,
          tagBoost: 1.5,
          authorBoost: 1.2,
          recentBoost: 1.1,
          popularityBoost: 1.3
        }
      },
      analytics: {
        enabled: true,
        trackQueries: true,
        trackClicks: true,
        trackConversions: true,
        retention: 90,
        sampling: 1.0,
        realtime: true
      },
      performance: {
        caching: true,
        cacheSize: 1000,
        cacheTTL: 300000,
        timeout: 5000,
        retries: 3,
        parallelization: true,
        optimization: true
      },
      security: {
        authentication: false,
        authorization: false,
        encryption: false,
        auditLogging: true,
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          burst: 10
        }
      }
    };

    return this.deepMerge(defaultConfig, config || {});
  }

  private deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  private initializeAnalytics(): SearchAnalytics {
    const stored = localStorage.getItem('search_analytics');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    }

    return {
      totalSearches: 0,
      uniqueQueries: 0,
      avgResponseTime: 0,
      topQueries: [],
      topTerms: [],
      noResultsQueries: [],
      clickThroughRate: 0,
      conversionRate: 0,
      userBehavior: {
        searchSessions: 0,
        avgSearchesPerSession: 0,
        bounceRate: 0,
        refinementRate: 0,
        filterUsage: {},
        facetUsage: {}
      },
      performance: {
        avgQueryTime: 0,
        avgFetchTime: 0,
        slowQueries: [],
        indexPerformance: {
          indexingRate: 0,
          searchRate: 0,
          errorRate: 0,
          availability: 100,
          resourceUsage: {
            cpu: 0,
            memory: 0,
            disk: 0,
            network: 0
          }
        }
      }
    };
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadIndices();
      await this.loadSynonyms();
      await this.loadStopWords();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize search system:', error);
    }
  }

  private async loadIndices(): Promise<void> {
    const indicesData = localStorage.getItem('search_indices');
    if (indicesData) {
      try {
        const indices = JSON.parse(indicesData);
        this.indices = new Map(indices);
      } catch (error) {
        console.error('Failed to load indices:', error);
      }
    }
  }

  private async saveIndices(): Promise<void> {
    const indicesArray = Array.from(this.indices.entries());
    localStorage.setItem('search_indices', JSON.stringify(indicesArray));
  }

  private async loadSynonyms(): Promise<void> {
    this.config.indexing.synonyms.forEach(synonymConfig => {
      synonymConfig.synonyms.forEach(synonymGroup => {
        synonymGroup.forEach(synonym => {
          if (!this.synonyms.has(synonym)) {
            this.synonyms.set(synonym, []);
          }
          this.synonyms.get(synonym)!.push(...synonymGroup.filter(s => s !== synonym));
        });
      });
    });
  }

  private async loadStopWords(): Promise<void> {
    this.config.indexing.stopWords.forEach(word => {
      this.stopWords.add(word.toLowerCase());
    });
  }

  public async indexDocument(document: Partial<SearchIndex>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const index: SearchIndex = {
      id: document.id || crypto.randomUUID(),
      title: document.title || '',
      content: document.content || '',
      type: document.type || 'document',
      category: document.category || 'general',
      tags: document.tags || [],
      author: document.author || 'anonymous',
      createdAt: document.createdAt || new Date(),
      updatedAt: document.updatedAt || new Date(),
      metadata: document.metadata || {},
      searchableFields: document.searchableFields || ['title', 'content', 'tags'],
      boost: document.boost || 1.0,
      language: document.language || 'en'
    };

    // Process document for search
    await this.processDocument(index);

    // Add to index
    const indexName = this.getIndexName(index.type);
    if (!this.indices.has(indexName)) {
      this.indices.set(indexName, []);
    }

    const indexArray = this.indices.get(indexName)!;
    const existingIndex = indexArray.findIndex(item => item.id === index.id);
    
    if (existingIndex >= 0) {
      indexArray[existingIndex] = index;
    } else {
      indexArray.push(index);
    }

    await this.saveIndices();
  }

  private async processDocument(index: SearchIndex): Promise<void> {
    // Analyze text fields
    index.title = await this.analyzeText(index.title);
    index.content = await this.analyzeText(index.content);
    
    // Process tags
    index.tags = index.tags.map(tag => tag.toLowerCase().trim());
    
    // Extract additional searchable content
    const searchableContent = index.searchableFields
      .map(field => this.getFieldValue(index, field))
      .filter(value => value)
      .join(' ');
    
    index.metadata.searchableContent = searchableContent;
    index.metadata.processed = true;
    index.metadata.processedAt = new Date();
  }

  private async analyzeText(text: string): Promise<string> {
    if (!text) return '';
    
    // Basic text analysis
    let processed = text.toLowerCase();
    
    // Remove HTML tags
    processed = processed.replace(/<[^>]*>/g, '');
    
    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Handle synonyms
    const words = processed.split(' ');
    const expandedWords = words.flatMap(word => {
      const synonyms = this.synonyms.get(word) || [];
      return [word, ...synonyms];
    });
    
    return expandedWords.join(' ');
  }

  private getFieldValue(index: SearchIndex, field: string): string {
    switch (field) {
      case 'title':
        return index.title;
      case 'content':
        return index.content;
      case 'tags':
        return index.tags.join(' ');
      case 'category':
        return index.category;
      case 'author':
        return index.author;
      default:
        return index.metadata[field] || '';
    }
  }

  private getIndexName(type: string): string {
    return `search_${type}`;
  }

  public async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = performance.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache
    const cacheKey = this.getCacheKey(query);
    if (this.config.performance.caching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      cached.totalTime = performance.now() - startTime;
      return cached;
    }

    try {
      // Build search query
      const searchQuery = await this.buildSearchQuery(query);
      
      // Execute search
      const searchResults = await this.executeSearch(searchQuery);
      
      // Apply filters
      const filteredResults = await this.applyFilters(searchResults, query.filters);
      
      // Calculate relevance scores
      const scoredResults = await this.calculateScores(filteredResults, query);
      
      // Sort results
      const sortedResults = await this.sortResults(scoredResults, query.sort);
      
      // Apply pagination
      const paginatedResults = await this.applyPagination(sortedResults, query.pagination);
      
      // Generate facets
      const facets = await this.generateFacets(filteredResults, query.facets);
      
      // Generate suggestions
      const suggestions = query.suggestions ? await this.generateSuggestions(query.q) : [];
      
      // Generate highlights
      const highlights = query.highlighting.enabled ? await this.generateHighlights(paginatedResults, query) : [];
      
      // Build result
      const result: SearchResult = {
        items: paginatedResults.map((item, index) => ({
          ...item,
          highlights: highlights[index] || []
        })),
        total: filteredResults.length,
        page: query.pagination.page,
        size: query.pagination.size,
        facets,
        suggestions,
        queryTime: performance.now() - startTime,
        totalTime: 0,
        hasMore: (query.pagination.page * query.pagination.size) < filteredResults.length,
        aggregations: []
      };

      result.totalTime = performance.now() - startTime;

      // Cache result
      if (this.config.performance.caching) {
        this.cache.set(cacheKey, result);
        setTimeout(() => this.cache.delete(cacheKey), this.config.performance.cacheTTL);
      }

      // Track analytics
      if (this.config.analytics.enabled) {
        await this.trackSearch(query, result);
      }

      return result;
      
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  private async buildSearchQuery(query: SearchQuery): Promise<ProcessedQuery> {
    const terms = await this.tokenizeQuery(query.q);
    const expandedTerms = await this.expandQuery(terms);
    
    return {
      originalQuery: query.q,
      terms,
      expandedTerms,
      filters: query.filters,
      boost: query.boost || this.config.search.boost,
      fuzzy: query.fuzzy || this.config.search.fuzzy,
      proximity: query.proximity || this.config.search.proximity
    };
  }

  private async tokenizeQuery(query: string): Promise<string[]> {
    if (!query) return [];
    
    // Basic tokenization
    const tokens = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0)
      .filter(token => !this.stopWords.has(token));
    
    // Apply stemming if enabled
    if (this.config.indexing.stemming) {
      return tokens.map(token => this.stemmer.stem(token));
    }
    
    return tokens;
  }

  private async expandQuery(terms: string[]): Promise<string[]> {
    const expanded = new Set(terms);
    
    terms.forEach(term => {
      const synonyms = this.synonyms.get(term) || [];
      synonyms.forEach(synonym => expanded.add(synonym));
    });
    
    return Array.from(expanded);
  }

  private async executeSearch(query: ProcessedQuery): Promise<SearchIndex[]> {
    const allResults: SearchIndex[] = [];
    
    // Search across all indices
    for (const [indexName, indexItems] of this.indices) {
      const results = await this.searchIndex(indexItems, query);
      allResults.push(...results);
    }
    
    return allResults;
  }

  private async searchIndex(items: SearchIndex[], query: ProcessedQuery): Promise<SearchIndex[]> {
    const results: SearchIndex[] = [];
    
    for (const item of items) {
      const score = await this.calculateItemScore(item, query);
      if (score > 0) {
        results.push({ ...item, score });
      }
    }
    
    return results;
  }

  private async calculateItemScore(item: SearchIndex, query: ProcessedQuery): Promise<number> {
    let score = 0;
    
    // Title matching
    const titleScore = this.calculateFieldScore(item.title, query.expandedTerms);
    score += titleScore * query.boost.titleBoost;
    
    // Content matching
    const contentScore = this.calculateFieldScore(item.content, query.expandedTerms);
    score += contentScore * query.boost.contentBoost;
    
    // Tag matching
    const tagScore = this.calculateFieldScore(item.tags.join(' '), query.expandedTerms);
    score += tagScore * query.boost.tagBoost;
    
    // Author matching
    const authorScore = this.calculateFieldScore(item.author, query.expandedTerms);
    score += authorScore * query.boost.authorBoost;
    
    // Apply boosts
    score *= item.boost;
    
    // Recent content boost
    const daysSinceCreated = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      score *= query.boost.recentBoost;
    }
    
    // Fuzzy matching
    if (query.fuzzy.enabled && score === 0) {
      score = this.calculateFuzzyScore(item, query.terms, query.fuzzy);
    }
    
    return score;
  }

  private calculateFieldScore(fieldValue: string, terms: string[]): number {
    if (!fieldValue) return 0;
    
    const fieldLower = fieldValue.toLowerCase();
    let score = 0;
    
    terms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // Exact match
      if (fieldLower.includes(termLower)) {
        score += 1.0;
      }
      
      // Word boundary match
      const wordRegex = new RegExp(`\\b${this.escapeRegex(termLower)}\\b`, 'i');
      if (wordRegex.test(fieldValue)) {
        score += 1.5;
      }
      
      // Prefix match
      if (fieldLower.startsWith(termLower)) {
        score += 1.2;
      }
    });
    
    return score;
  }

  private calculateFuzzyScore(item: SearchIndex, terms: string[], fuzzyOptions: FuzzyOptions): number {
    let score = 0;
    
    terms.forEach(term => {
      const titleSimilarity = this.calculateStringSimilarity(item.title, term);
      const contentSimilarity = this.calculateStringSimilarity(item.content, term);
      
      if (titleSimilarity >= fuzzyOptions.minSimilarity) {
        score += titleSimilarity * 2.0;
      }
      
      if (contentSimilarity >= fuzzyOptions.minSimilarity) {
        score += contentSimilarity * 1.0;
      }
    });
    
    return score;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
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
    
    return matrix[str2.length][str1.length];
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async applyFilters(results: SearchIndex[], filters: SearchFilter[]): Promise<SearchIndex[]> {
    if (!filters || filters.length === 0) return results;
    
    return results.filter(item => {
      return filters.every(filter => this.evaluateFilter(item, filter));
    });
  }

  private evaluateFilter(item: SearchIndex, filter: SearchFilter): boolean {
    const fieldValue = this.getFieldValue(item, filter.field);
    
    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value;
      case 'not_equals':
        return fieldValue !== filter.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'range':
        return fieldValue >= filter.value.min && fieldValue <= filter.value.max;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null || fieldValue === '';
      case 'regex':
        return new RegExp(filter.value).test(String(fieldValue));
      default:
        return true;
    }
  }

  private async calculateScores(results: SearchIndex[], query: SearchQuery): Promise<SearchIndex[]> {
    // Scores are already calculated in executeSearch
    return results;
  }

  private async sortResults(results: SearchIndex[], sortOptions: SortOption[]): Promise<SearchIndex[]> {
    if (!sortOptions || sortOptions.length === 0) {
      return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    
    return results.sort((a, b) => {
      for (const sort of sortOptions) {
        let aValue = this.getSortValue(a, sort.field);
        let bValue = this.getSortValue(b, sort.field);
        
        if (sort.type === 'number') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else if (sort.type === 'date') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        if (sort.direction === 'desc') {
          comparison = -comparison;
        }
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }

  private getSortValue(item: SearchIndex, field: string): any {
    switch (field) {
      case '_score':
        return item.score || 0;
      case 'title':
        return item.title;
      case 'createdAt':
        return item.createdAt;
      case 'updatedAt':
        return item.updatedAt;
      default:
        return this.getFieldValue(item, field);
    }
  }

  private async applyPagination(results: SearchIndex[], pagination: PaginationOptions): Promise<SearchIndex[]> {
    const start = (pagination.page - 1) * pagination.size;
    const end = start + pagination.size;
    return results.slice(start, end);
  }

  private async generateFacets(results: SearchIndex[], facetFields: string[]): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];
    
    facetFields.forEach(field => {
      const values = new Map<string, number>();
      
      results.forEach(item => {
        const value = this.getFieldValue(item, field);
        if (value) {
          const key = String(value);
          values.set(key, (values.get(key) || 0) + 1);
        }
      });
      
      const facetValues: FacetValue[] = Array.from(values.entries())
        .map(([value, count]) => ({ value, count, selected: false }))
        .sort((a, b) => b.count - a.count);
      
      facets.push({
        field,
        name: field,
        values: facetValues,
        type: 'terms'
      });
    });
    
    return facets;
  }

  private async generateSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    // Generate term suggestions based on indexed content
    const terms = await this.tokenizeQuery(query);
    const allTerms = new Set<string>();
    
    this.indices.forEach(indexItems => {
      indexItems.forEach(item => {
        const itemTerms = this.tokenizeQuery(item.title + ' ' + item.content);
        itemTerms.forEach(term => allTerms.add(term));
      });
    });
    
    terms.forEach(term => {
      Array.from(allTerms).forEach(indexedTerm => {
        const similarity = this.calculateStringSimilarity(term, indexedTerm);
        if (similarity > 0.6 && similarity < 1.0) {
          suggestions.push({
            text: indexedTerm,
            score: similarity,
            frequency: 1,
            type: 'term'
          });
        }
      });
    });
    
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private async generateHighlights(results: SearchIndex[], query: SearchQuery): Promise<SearchHighlight[][]> {
    const highlights: SearchHighlight[][] = [];
    const terms = await this.tokenizeQuery(query.q);
    
    results.forEach(item => {
      const itemHighlights: SearchHighlight[] = [];
      
      query.highlighting.fields.forEach(field => {
        const fieldValue = this.getFieldValue(item, field);
        if (fieldValue) {
          const fragments = this.highlightField(fieldValue, terms, query.highlighting);
          if (fragments.length > 0) {
            itemHighlights.push({
              field,
              fragments,
              matchedTerms: terms.filter(term => fieldValue.toLowerCase().includes(term.toLowerCase()))
            });
          }
        }
      });
      
      highlights.push(itemHighlights);
    });
    
    return highlights;
  }

  private highlightField(fieldValue: string, terms: string[], options: HighlightOptions): string[] {
    let highlighted = fieldValue;
    
    terms.forEach(term => {
      const regex = new RegExp(`\\b(${this.escapeRegex(term)})\\b`, 'gi');
      highlighted = highlighted.replace(regex, `${options.preTag}$1${options.postTag}`);
    });
    
    // Extract fragments
    const fragments: string[] = [];
    const sentences = highlighted.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      if (sentence.includes(options.preTag)) {
        const fragment = sentence.trim().substring(0, options.fragmentSize);
        if (fragment.length > 0) {
          fragments.push(fragment);
        }
      }
    });
    
    return fragments.slice(0, options.numberOfFragments);
  }

  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify(query);
  }

  private async trackSearch(query: SearchQuery, result: SearchResult): Promise<void> {
    this.analytics.totalSearches++;
    this.analytics.avgResponseTime = 
      (this.analytics.avgResponseTime * (this.analytics.totalSearches - 1) + result.totalTime) / 
      this.analytics.totalSearches;
    
    // Track query
    const existingQuery = this.analytics.topQueries.find(q => q.query === query.q);
    if (existingQuery) {
      existingQuery.count++;
      existingQuery.lastSearched = new Date();
    } else {
      this.analytics.topQueries.push({
        query: query.q,
        count: 1,
        avgScore: result.items.reduce((sum, item) => sum + item.score, 0) / result.items.length || 0,
        clickThroughRate: 0,
        conversionRate: 0,
        noResults: result.items.length === 0,
        lastSearched: new Date()
      });
    }
    
    // Track no results
    if (result.items.length === 0) {
      this.analytics.noResultsQueries.push(query.q);
    }
    
    // Save analytics
    this.saveAnalytics();
  }

  private saveAnalytics(): void {
    localStorage.setItem('search_analytics', JSON.stringify(this.analytics));
  }

  public async deleteFromIndex(id: string, type?: string): Promise<void> {
    if (type) {
      const indexName = this.getIndexName(type);
      const indexItems = this.indices.get(indexName);
      if (indexItems) {
        const filtered = indexItems.filter(item => item.id !== id);
        this.indices.set(indexName, filtered);
      }
    } else {
      // Delete from all indices
      this.indices.forEach((indexItems, indexName) => {
        const filtered = indexItems.filter(item => item.id !== id);
        this.indices.set(indexName, filtered);
      });
    }
    
    await this.saveIndices();
  }

  public async clearIndex(type?: string): Promise<void> {
    if (type) {
      const indexName = this.getIndexName(type);
      this.indices.delete(indexName);
    } else {
      this.indices.clear();
    }
    
    await this.saveIndices();
  }

  public async reindex(): Promise<void> {
    // This would typically rebuild the entire index
    console.log('Reindexing...');
    await this.saveIndices();
  }

  public getAnalytics(): SearchAnalytics {
    return { ...this.analytics };
  }

  public getConfiguration(): SearchConfiguration {
    return { ...this.config };
  }

  public updateConfiguration(config: Partial<SearchConfiguration>): void {
    this.config = this.deepMerge(this.config, config);
  }

  public getIndexStats(): IndexStats {
    let totalDocuments = 0;
    let indexSize = 0;
    let lastUpdate = new Date(0);
    
    this.indices.forEach(indexItems => {
      totalDocuments += indexItems.length;
      indexItems.forEach(item => {
        indexSize += JSON.stringify(item).length;
        if (item.updatedAt > lastUpdate) {
          lastUpdate = item.updatedAt;
        }
      });
    });
    
    return {
      totalDocuments,
      indexSize,
      lastUpdate,
      fields: [] // Would calculate field statistics
    };
  }

  public exportIndex(): string {
    return JSON.stringify({
      indices: Array.from(this.indices.entries()),
      config: this.config,
      analytics: this.analytics
    }, null, 2);
  }

  public importIndex(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.indices) {
        this.indices = new Map(parsed.indices);
        this.saveIndices();
      }
      
      if (parsed.config) {
        this.config = parsed.config;
      }
      
      if (parsed.analytics) {
        this.analytics = parsed.analytics;
        this.saveAnalytics();
      }
      
    } catch (error) {
      console.error('Failed to import index:', error);
    }
  }

  public destroy(): void {
    this.indices.clear();
    this.cache.clear();
    this.synonyms.clear();
    this.stopWords.clear();
    this.isInitialized = false;
  }
}

// Simple Porter Stemmer implementation
class PorterStemmer {
  stem(word: string): string {
    // Simplified stemming - in production, use a proper stemmer
    const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 's'];
    
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.substring(0, word.length - suffix.length);
      }
    }
    
    return word;
  }
}

interface ProcessedQuery {
  originalQuery: string;
  terms: string[];
  expandedTerms: string[];
  filters: SearchFilter[];
  boost: BoostOptions;
  fuzzy: FuzzyOptions;
  proximity: ProximityOptions;
}

export const advancedSearchSystem = new AdvancedSearchSystem(); 