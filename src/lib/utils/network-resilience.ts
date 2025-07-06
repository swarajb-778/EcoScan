/**
 * Network Resilience System for EcoScan
 * Handles network failures, adaptive retries, circuit breakers, and intelligent fallbacks
 */

export interface NetworkState {
  isOnline: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  lastCheck: number;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryCount?: number;
  circuitBreaker?: boolean;
  fallbackResponse?: any;
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  nextAttemptTime: number;
}

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryCondition: (error: any, attempt: number) => boolean;
}

export class NetworkResilienceManager {
  private networkState: NetworkState;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private requestCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private requestQueue: RequestConfig[] = [];
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private offlineRequests: Set<string> = new Set();
  
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    this.networkState = {
      isOnline: navigator.onLine,
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      lastCheck: Date.now()
    };
    
    this.initialize();
  }

  private initialize(): void {
    this.setupNetworkMonitoring();
    this.setupDefaultRetryStrategies();
    this.setupRequestQueue();
    
    console.log('🌐 Network resilience manager initialized');
  }

  private setupNetworkMonitoring(): void {
    // Monitor online/offline state
    window.addEventListener('online', () => {
      this.networkState.isOnline = true;
      this.networkState.lastCheck = Date.now();
      this.processQueuedRequests();
      console.log('🌐 Network connection restored');
    });
    
    window.addEventListener('offline', () => {
      this.networkState.isOnline = false;
      this.networkState.lastCheck = Date.now();
      console.log('📵 Network connection lost');
    });
    
    // Monitor network quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        this.networkState.effectiveType = connection.effectiveType || 'unknown';
        this.networkState.downlink = connection.downlink || 0;
        this.networkState.rtt = connection.rtt || 0;
        this.networkState.saveData = connection.saveData || false;
        this.networkState.lastCheck = Date.now();
      };
      
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
    }
    
    // Periodic network quality check
    setInterval(() => {
      this.checkNetworkQuality();
    }, 30000); // Check every 30 seconds
  }

  private async checkNetworkQuality(): Promise<void> {
    if (!this.networkState.isOnline) return;
    
    try {
      const start = performance.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const end = performance.now();
      
      if (response.ok) {
        this.networkState.rtt = end - start;
        this.networkState.lastCheck = Date.now();
      }
    } catch (error) {
      console.warn('Network quality check failed:', error);
    }
  }

  private setupDefaultRetryStrategies(): void {
    // Default strategy for API calls
    this.retryStrategies.set('default', {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryCondition: (error, attempt) => {
        // Retry on network errors, 5xx errors, and timeouts
        return attempt < 3 && (
          error.name === 'TypeError' || // Network error
          (error.status >= 500 && error.status < 600) || // Server error
          error.name === 'TimeoutError'
        );
      }
    });
    
    // Strategy for analytics/non-critical requests
    this.retryStrategies.set('analytics', {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryCondition: (error, attempt) => attempt < 5
    });
    
    // Strategy for critical model downloads
    this.retryStrategies.set('model-download', {
      maxRetries: 10,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
      jitterEnabled: true,
      retryCondition: (error, attempt) => attempt < 10
    });
  }

  private setupRequestQueue(): void {
    // Process queued requests when network becomes available
    setInterval(() => {
      if (this.networkState.isOnline && this.requestQueue.length > 0) {
        this.processQueuedRequests();
      }
    }, 5000);
  }

  private async processQueuedRequests(): Promise<void> {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    console.log(`🔄 Processing ${queue.length} queued requests`);
    
    for (const request of queue) {
      try {
        await this.makeRequest(request);
      } catch (error) {
        console.warn('Queued request failed:', error);
      }
    }
  }

  async makeRequest(config: RequestConfig): Promise<any> {
    const strategy = this.retryStrategies.get('default')!;
    const cacheKey = this.getCacheKey(config);
    
    // Check cache first if strategy allows
    if (config.cacheStrategy === 'cache-first') {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Check circuit breaker
    if (config.circuitBreaker !== false && this.isCircuitBreakerOpen(config.url)) {
      if (config.fallbackResponse) {
        return config.fallbackResponse;
      }
      throw new Error('Circuit breaker is open');
    }
    
    // Queue request if offline
    if (!this.networkState.isOnline) {
      if (!this.offlineRequests.has(cacheKey)) {
        this.requestQueue.push(config);
        this.offlineRequests.add(cacheKey);
      }
      
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
      
      throw new Error('Offline and no cached response available');
    }
    
    return this.executeRequestWithRetry(config, strategy);
  }

  private async executeRequestWithRetry(config: RequestConfig, strategy: RetryStrategy): Promise<any> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(config);
        
        // Success - update circuit breaker
        this.recordCircuitBreakerSuccess(config.url);
        
        // Cache response if appropriate
        if (config.cacheStrategy !== 'network-first') {
          this.cacheResponse(this.getCacheKey(config), response);
        }
        
        return response;
        
      } catch (error) {
        lastError = error;
        
        // Record circuit breaker failure
        this.recordCircuitBreakerFailure(config.url);
        
        // Check if we should retry
        if (attempt < strategy.maxRetries && strategy.retryCondition(error, attempt)) {
          const delay = this.calculateRetryDelay(strategy, attempt);
          console.log(`🔄 Retrying request in ${delay}ms (attempt ${attempt + 1}/${strategy.maxRetries + 1})`);
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }
    
    // All retries failed
    if (config.fallbackResponse) {
      console.warn('Using fallback response after all retries failed');
      return config.fallbackResponse;
    }
    
    throw lastError;
  }

  private async executeRequest(config: RequestConfig): Promise<any> {
    const timeout = config.timeout || this.getAdaptiveTimeout();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const fetchConfig: RequestInit = {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      };
      
      const response = await fetch(config.url, fetchConfig);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getAdaptiveTimeout(): number {
    // Adapt timeout based on network conditions
    const baseTimeout = this.DEFAULT_TIMEOUT;
    
    if (this.networkState.effectiveType === 'slow-2g') {
      return baseTimeout * 3;
    } else if (this.networkState.effectiveType === '2g') {
      return baseTimeout * 2;
    } else if (this.networkState.effectiveType === '3g') {
      return baseTimeout * 1.5;
    }
    
    return baseTimeout;
  }

  private calculateRetryDelay(strategy: RetryStrategy, attempt: number): number {
    let delay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt);
    delay = Math.min(delay, strategy.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (strategy.jitterEnabled) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private isCircuitBreakerOpen(url: string): boolean {
    const breaker = this.circuitBreakers.get(url);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      if (Date.now() > breaker.nextAttemptTime) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }
    
    return false;
  }

  private recordCircuitBreakerFailure(url: string): void {
    let breaker = this.circuitBreakers.get(url);
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        nextAttemptTime: 0
      };
      this.circuitBreakers.set(url, breaker);
    }
    
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      console.warn(`🔌 Circuit breaker opened for ${url}`);
    }
  }

  private recordCircuitBreakerSuccess(url: string): void {
    const breaker = this.circuitBreakers.get(url);
    if (!breaker) return;
    
    if (breaker.state === 'half-open') {
      breaker.successCount++;
      if (breaker.successCount >= 2) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        breaker.successCount = 0;
        console.log(`✅ Circuit breaker closed for ${url}`);
      }
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  private getCacheKey(config: RequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.body || {})}`;
  }

  private getCachedResponse(key: string): any {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    if (cached) {
      this.requestCache.delete(key);
    }
    
    return null;
  }

  private cacheResponse(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    // Limit cache size
    if (this.requestCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.requestCache.keys())[0];
      this.requestCache.delete(oldestKey);
    }
    
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  addRetryStrategy(name: string, strategy: RetryStrategy): void {
    this.retryStrategies.set(name, strategy);
  }

  clearCache(): void {
    this.requestCache.clear();
    console.log('🧹 Request cache cleared');
  }

  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  resetCircuitBreaker(url: string): void {
    const breaker = this.circuitBreakers.get(url);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.nextAttemptTime = 0;
      console.log(`🔄 Circuit breaker reset for ${url}`);
    }
  }

  async get(url: string, options?: Partial<RequestConfig>): Promise<any> {
    return this.makeRequest({
      url,
      method: 'GET',
      ...options
    });
  }

  async post(url: string, data: any, options?: Partial<RequestConfig>): Promise<any> {
    return this.makeRequest({
      url,
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });
  }

  dispose(): void {
    this.requestCache.clear();
    this.circuitBreakers.clear();
    this.requestQueue = [];
    this.offlineRequests.clear();
    console.log('🌐 Network resilience manager disposed');
  }
}

// Global instance for easy access
export const networkManager = new NetworkResilienceManager(); 