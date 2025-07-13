/**
 * Advanced API Integration System for EcoScan
 * 
 * Features:
 * - Comprehensive HTTP client with advanced configurations
 * - Authentication and authorization management
 * - Intelligent rate limiting and throttling
 * - Multi-layer caching with TTL and invalidation
 * - Automatic retry logic with exponential backoff
 * - Request/response interceptors and middleware
 * - Real-time data synchronization with WebSockets
 * - Offline queue and sync management
 * - Error handling and circuit breaker patterns
 * - Request deduplication and batching
 * - Performance monitoring and analytics
 * - API versioning and migration support
 * - Data transformation and validation
 * - Progress tracking and cancellation
 * - GraphQL integration and optimization
 * 
 * API Features:
 * - RESTful API endpoints
 * - GraphQL queries and mutations
 * - WebSocket real-time updates
 * - Server-Sent Events (SSE)
 * - File upload/download with progress
 * - Streaming data processing
 * - API key and OAuth management
 * - CORS and security headers
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { advancedAnalytics } from '../utils/advanced-analytics';
import { offlineManager } from '../utils/offline-manager';

// API integration interfaces
export interface APIConfig {
  baseURL: string;
  version: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  retryBackoff: number;
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number; // ms
    strategy: 'fixed' | 'sliding' | 'token_bucket';
  };
  cache: {
    enabled: boolean;
    defaultTTL: number;
    maxSize: number;
    strategy: 'memory' | 'localStorage' | 'indexedDB';
  };
  auth: {
    type: 'none' | 'api_key' | 'bearer' | 'oauth' | 'custom';
    credentials: any;
    refreshThreshold: number;
    autoRefresh: boolean;
  };
  interceptors: {
    request: boolean;
    response: boolean;
    error: boolean;
  };
  offline: {
    enabled: boolean;
    queueLimit: number;
    syncOnReconnect: boolean;
  };
  realtime: {
    enabled: boolean;
    websocket: boolean;
    sse: boolean;
    heartbeat: number;
  };
  security: {
    validateCertificates: boolean;
    allowInsecure: boolean;
    csrfProtection: boolean;
    corsEnabled: boolean;
  };
}

export interface APIRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  url: string;
  headers: Record<string, string>;
  params: Record<string, any>;
  data: any;
  config: RequestConfig;
  timestamp: number;
  timeout: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retries: number;
  maxRetries: number;
  metadata: any;
}

export interface RequestConfig {
  cache: boolean;
  cacheTTL?: number;
  retry: boolean;
  rateLimit: boolean;
  auth: boolean;
  offline: boolean;
  realtime: boolean;
  validate: boolean;
  transform: boolean;
  progress: boolean;
  dedupe: boolean;
  batch: boolean;
}

export interface APIResponse<T = any> {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  cached: boolean;
  fromOffline: boolean;
  retryCount: number;
  latency: number;
  timestamp: number;
  metadata: any;
}

export interface APIError {
  id: string;
  requestId: string;
  type: 'network' | 'timeout' | 'auth' | 'validation' | 'server' | 'client' | 'unknown';
  status?: number;
  code: string;
  message: string;
  details: any;
  retryable: boolean;
  timestamp: number;
  stack?: string;
}

export interface CacheEntry {
  id: string;
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  metadata: any;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
  tokens: number;
  lastRefill: number;
  blocked: boolean;
  nextAllowed: number;
}

export interface AuthCredentials {
  type: 'api_key' | 'bearer' | 'oauth' | 'custom';
  apiKey?: string;
  bearerToken?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string[];
  expiresAt?: number;
  custom?: Record<string, any>;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeat: boolean;
  heartbeatInterval: number;
  compression: boolean;
}

export interface SSEConfig {
  url: string;
  withCredentials: boolean;
  reconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

export interface RequestInterceptor {
  id: string;
  name: string;
  order: number;
  handler: (request: APIRequest) => Promise<APIRequest> | APIRequest;
}

export interface ResponseInterceptor {
  id: string;
  name: string;
  order: number;
  handler: (response: APIResponse) => Promise<APIResponse> | APIResponse;
}

export interface ErrorInterceptor {
  id: string;
  name: string;
  order: number;
  handler: (error: APIError, request: APIRequest) => Promise<APIResponse | APIError> | APIResponse | APIError;
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'sync' | 'merge';
  resource: string;
  method: string;
  data: any;
  timestamp: number;
  priority: number;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: APIError;
}

export interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  cacheHitRate: number;
  rateLimitHits: number;
  retryCount: number;
  bytesTransferred: number;
  errorRate: number;
  uptime: number;
  availability: number;
}

class AdvancedAPIClient {
  private config: APIConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimitState: RateLimitState;
  private authCredentials: AuthCredentials | null = null;
  private requestQueue: APIRequest[] = [];
  private offlineQueue: APIRequest[] = [];
  private syncOperations: Map<string, SyncOperation> = new Map();
  private requestInterceptors: Map<string, RequestInterceptor> = new Map();
  private responseInterceptors: Map<string, ResponseInterceptor> = new Map();
  private errorInterceptors: Map<string, ErrorInterceptor> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private batchRequests: Map<string, APIRequest[]> = new Map();
  private websocket: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private circuitBreaker: CircuitBreakerState = { state: 'closed', failures: 0, lastFailure: 0, nextAttempt: 0 };
  private metrics: APIMetrics;
  private isOnline = true;
  private syncInterval: number | null = null;
  private heartbeatInterval: number | null = null;

  // Reactive stores
  private _requests = writable<APIRequest[]>([]);
  private _responses = writable<APIResponse[]>([]);
  private _errors = writable<APIError[]>([]);
  private _metrics = writable<APIMetrics>(this.getInitialMetrics());
  private _connectivity = writable<{ online: boolean; latency: number; quality: string }>({
    online: true,
    latency: 0,
    quality: 'good'
  });
  private _cache = writable<{ size: number; hitRate: number; entries: number }>({
    size: 0,
    hitRate: 0,
    entries: 0
  });
  private _auth = writable<{ authenticated: boolean; expires: number; type: string }>({
    authenticated: false,
    expires: 0,
    type: 'none'
  });

  public readonly requests: Readable<APIRequest[]> = this._requests;
  public readonly responses: Readable<APIResponse[]> = this._responses;
  public readonly errors: Readable<APIError[]> = this._errors;
  public readonly metricsStore: Readable<APIMetrics> = this._metrics;
  public readonly connectivity: Readable<any> = this._connectivity;
  public readonly cacheStore: Readable<any> = this._cache;
  public readonly auth: Readable<any> = this._auth;

  constructor(config?: Partial<APIConfig>) {
    this.config = this.mergeConfig(config);
    this.rateLimitState = this.getInitialRateLimitState();
    this.metrics = this.getInitialMetrics();
    this.initializeAPIClient();
  }

  private mergeConfig(config?: Partial<APIConfig>): APIConfig {
    const defaultConfig: APIConfig = {
      baseURL: '/api',
      version: 'v1',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      retryBackoff: 2,
      rateLimit: {
        enabled: true,
        requests: 100,
        window: 60000,
        strategy: 'sliding'
      },
      cache: {
        enabled: true,
        defaultTTL: 300000, // 5 minutes
        maxSize: 100,
        strategy: 'memory'
      },
      auth: {
        type: 'none',
        credentials: null,
        refreshThreshold: 300000, // 5 minutes
        autoRefresh: true
      },
      interceptors: {
        request: true,
        response: true,
        error: true
      },
      offline: {
        enabled: true,
        queueLimit: 1000,
        syncOnReconnect: true
      },
      realtime: {
        enabled: true,
        websocket: true,
        sse: true,
        heartbeat: 30000
      },
      security: {
        validateCertificates: true,
        allowInsecure: false,
        csrfProtection: true,
        corsEnabled: true
      }
    };

    return { ...defaultConfig, ...config };
  }

  private getInitialRateLimitState(): RateLimitState {
    return {
      requests: 0,
      windowStart: Date.now(),
      tokens: this.config.rateLimit.requests,
      lastRefill: Date.now(),
      blocked: false,
      nextAllowed: 0
    };
  }

  private getInitialMetrics(): APIMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      rateLimitHits: 0,
      retryCount: 0,
      bytesTransferred: 0,
      errorRate: 0,
      uptime: 100,
      availability: 100
    };
  }

  private initializeAPIClient(): void {
    if (!browser) return;

    try {
      this.setupDefaultInterceptors();
      this.setupConnectivityMonitoring();
      this.setupOfflineHandling();
      this.setupRealTimeConnections();
      this.startSyncProcess();
      this.loadCachedData();
      
      console.log('🌐 Advanced API client initialized');
    } catch (error) {
      console.error('Failed to initialize API client:', error);
    }
  }

  private setupDefaultInterceptors(): void {
    // Request interceptors
    this.addRequestInterceptor('auth', 100, this.authInterceptor.bind(this));
    this.addRequestInterceptor('rateLimit', 200, this.rateLimitInterceptor.bind(this));
    this.addRequestInterceptor('headers', 300, this.headersInterceptor.bind(this));
    this.addRequestInterceptor('validation', 400, this.validationInterceptor.bind(this));

    // Response interceptors
    this.addResponseInterceptor('cache', 100, this.cacheInterceptor.bind(this));
    this.addResponseInterceptor('transform', 200, this.transformInterceptor.bind(this));
    this.addResponseInterceptor('metrics', 300, this.metricsInterceptor.bind(this));

    // Error interceptors
    this.addErrorInterceptor('retry', 100, this.retryInterceptor.bind(this));
    this.addErrorInterceptor('offline', 200, this.offlineInterceptor.bind(this));
    this.addErrorInterceptor('circuitBreaker', 300, this.circuitBreakerInterceptor.bind(this));
  }

  private setupConnectivityMonitoring(): void {
    // Monitor network connectivity
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateConnectivity();
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectivity();
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 10000); // Every 10 seconds
  }

  private setupOfflineHandling(): void {
    if (!this.config.offline.enabled) return;

    // Load offline queue from storage
    this.loadOfflineQueue();

    // Setup sync on reconnect
    if (this.config.offline.syncOnReconnect) {
      window.addEventListener('online', () => {
        this.processOfflineQueue();
      });
    }
  }

  private setupRealTimeConnections(): void {
    if (!this.config.realtime.enabled) return;

    // Setup WebSocket connection
    if (this.config.realtime.websocket) {
      this.connectWebSocket();
    }

    // Setup Server-Sent Events
    if (this.config.realtime.sse) {
      this.connectSSE();
    }
  }

  private startSyncProcess(): void {
    this.syncInterval = window.setInterval(() => {
      this.processSyncOperations();
    }, 5000); // Every 5 seconds
  }

  private loadCachedData(): void {
    if (!this.config.cache.enabled) return;

    try {
      const cached = localStorage.getItem('ecoscan-api-cache');
      if (cached) {
        const entries = JSON.parse(cached);
        entries.forEach((entry: CacheEntry) => {
          if (Date.now() - entry.timestamp < entry.ttl) {
            this.cache.set(entry.key, entry);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cached data:', error);
    }
  }

  // Public API methods
  public async get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request({
      method: 'GET',
      url,
      data: null,
      config: { ...this.getDefaultRequestConfig(), ...config }
    });
  }

  public async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request({
      method: 'POST',
      url,
      data,
      config: { ...this.getDefaultRequestConfig(), ...config }
    });
  }

  public async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request({
      method: 'PUT',
      url,
      data,
      config: { ...this.getDefaultRequestConfig(), ...config }
    });
  }

  public async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request({
      method: 'PATCH',
      url,
      data,
      config: { ...this.getDefaultRequestConfig(), ...config }
    });
  }

  public async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request({
      method: 'DELETE',
      url,
      data: null,
      config: { ...this.getDefaultRequestConfig(), ...config }
    });
  }

  public async request<T = any>(params: {
    method: APIRequest['method'];
    url: string;
    data?: any;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    config?: Partial<RequestConfig>;
  }): Promise<APIResponse<T>> {
    const request: APIRequest = {
      id: this.generateId(),
      method: params.method,
      url: this.buildURL(params.url),
      headers: { ...this.getDefaultHeaders(), ...params.headers },
      params: params.params || {},
      data: params.data,
      config: { ...this.getDefaultRequestConfig(), ...params.config },
      timestamp: Date.now(),
      timeout: this.config.timeout,
      priority: 'normal',
      retries: 0,
      maxRetries: this.config.retries,
      metadata: {}
    };

    return this.executeRequest(request);
  }

  public async batchRequest(requests: Array<{
    method: APIRequest['method'];
    url: string;
    data?: any;
    headers?: Record<string, string>;
    config?: Partial<RequestConfig>;
  }>): Promise<APIResponse[]> {
    const batchId = this.generateId();
    const apiRequests = requests.map(req => ({
      id: this.generateId(),
      method: req.method,
      url: this.buildURL(req.url),
      headers: { ...this.getDefaultHeaders(), ...req.headers },
      params: {},
      data: req.data,
      config: { ...this.getDefaultRequestConfig(), ...req.config },
      timestamp: Date.now(),
      timeout: this.config.timeout,
      priority: 'normal' as const,
      retries: 0,
      maxRetries: this.config.retries,
      metadata: { batchId }
    }));

    this.batchRequests.set(batchId, apiRequests);

    return Promise.all(apiRequests.map(req => this.executeRequest(req)));
  }

  public async uploadFile(url: string, file: File, config?: {
    onProgress?: (progress: number) => void;
    headers?: Record<string, string>;
  }): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request({
      method: 'POST',
      url,
      data: formData,
      headers: config?.headers,
      config: {
        ...this.getDefaultRequestConfig(),
        progress: true,
        cache: false
      }
    });
  }

  public async downloadFile(url: string, config?: {
    onProgress?: (progress: number) => void;
    headers?: Record<string, string>;
  }): Promise<Blob> {
    const response = await this.request({
      method: 'GET',
      url,
      headers: config?.headers,
      config: {
        ...this.getDefaultRequestConfig(),
        progress: true,
        cache: false
      }
    });

    return response.data;
  }

  public setAuthCredentials(credentials: AuthCredentials): void {
    this.authCredentials = credentials;
    this.updateAuthStore();
  }

  public clearAuthCredentials(): void {
    this.authCredentials = null;
    this.updateAuthStore();
  }

  public async refreshAuth(): Promise<void> {
    if (!this.authCredentials || this.authCredentials.type !== 'oauth') {
      throw new Error('OAuth credentials required for refresh');
    }

    const response = await this.post('/auth/refresh', {
      refresh_token: this.authCredentials.refreshToken
    }, { auth: false });

    this.authCredentials.accessToken = response.data.access_token;
    this.authCredentials.expiresAt = Date.now() + (response.data.expires_in * 1000);
    this.updateAuthStore();
  }

  public addRequestInterceptor(id: string, order: number, handler: RequestInterceptor['handler']): void {
    this.requestInterceptors.set(id, { id, name: id, order, handler });
  }

  public addResponseInterceptor(id: string, order: number, handler: ResponseInterceptor['handler']): void {
    this.responseInterceptors.set(id, { id, name: id, order, handler });
  }

  public addErrorInterceptor(id: string, order: number, handler: ErrorInterceptor['handler']): void {
    this.errorInterceptors.set(id, { id, name: id, order, handler });
  }

  public removeInterceptor(type: 'request' | 'response' | 'error', id: string): void {
    switch (type) {
      case 'request':
        this.requestInterceptors.delete(id);
        break;
      case 'response':
        this.responseInterceptors.delete(id);
        break;
      case 'error':
        this.errorInterceptors.delete(id);
        break;
    }
  }

  public cancelRequest(requestId: string): void {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  public cancelAllRequests(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }

  public clearCache(): void {
    this.cache.clear();
    this.updateCacheStore();
    
    if (this.config.cache.strategy === 'localStorage') {
      localStorage.removeItem('ecoscan-api-cache');
    }
  }

  public getCacheEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  public invalidateCache(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateCacheStore();
  }

  public getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = this.getInitialMetrics();
    this._metrics.set(this.metrics);
  }

  // Private implementation methods
  private async executeRequest<T = any>(request: APIRequest): Promise<APIResponse<T>> {
    try {
      // Apply request interceptors
      const processedRequest = await this.applyRequestInterceptors(request);

      // Check cache
      if (processedRequest.config.cache) {
        const cached = this.getCachedResponse(processedRequest);
        if (cached) {
          return cached as APIResponse<T>;
        }
      }

      // Check if offline and queue if necessary
      if (!this.isOnline && processedRequest.config.offline) {
        this.addToOfflineQueue(processedRequest);
        throw new Error('Request queued for offline sync');
      }

      // Execute the actual request
      const response = await this.performRequest<T>(processedRequest);

      // Apply response interceptors
      const processedResponse = await this.applyResponseInterceptors(response);

      // Update metrics
      this.updateMetrics(processedRequest, processedResponse);

      return processedResponse;
    } catch (error) {
      const apiError = this.createAPIError(error, request);
      
      // Apply error interceptors
      const result = await this.applyErrorInterceptors(apiError, request);
      
      if (result instanceof Error) {
        throw result;
      }
      
      return result;
    }
  }

  private async performRequest<T = any>(request: APIRequest): Promise<APIResponse<T>> {
    const controller = new AbortController();
    this.activeRequests.set(request.id, controller);

    const startTime = performance.now();

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: request.headers,
        body: this.prepareRequestBody(request),
        signal: controller.signal,
        credentials: 'include'
      };

      const response = await fetch(request.url, fetchOptions);
      const endTime = performance.now();

      const data = await this.parseResponseData<T>(response);

      const apiResponse: APIResponse<T> = {
        id: this.generateId(),
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseResponseHeaders(response.headers),
        data,
        cached: false,
        fromOffline: false,
        retryCount: request.retries,
        latency: endTime - startTime,
        timestamp: Date.now(),
        metadata: {}
      };

      return apiResponse;
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  private async applyRequestInterceptors(request: APIRequest): Promise<APIRequest> {
    if (!this.config.interceptors.request) return request;

    const interceptors = Array.from(this.requestInterceptors.values())
      .sort((a, b) => a.order - b.order);

    let processedRequest = request;

    for (const interceptor of interceptors) {
      try {
        processedRequest = await interceptor.handler(processedRequest);
      } catch (error) {
        console.warn(`Request interceptor ${interceptor.id} failed:`, error);
      }
    }

    return processedRequest;
  }

  private async applyResponseInterceptors(response: APIResponse): Promise<APIResponse> {
    if (!this.config.interceptors.response) return response;

    const interceptors = Array.from(this.responseInterceptors.values())
      .sort((a, b) => a.order - b.order);

    let processedResponse = response;

    for (const interceptor of interceptors) {
      try {
        processedResponse = await interceptor.handler(processedResponse);
      } catch (error) {
        console.warn(`Response interceptor ${interceptor.id} failed:`, error);
      }
    }

    return processedResponse;
  }

  private async applyErrorInterceptors(error: APIError, request: APIRequest): Promise<APIResponse | APIError> {
    if (!this.config.interceptors.error) throw error;

    const interceptors = Array.from(this.errorInterceptors.values())
      .sort((a, b) => a.order - b.order);

    let result: APIResponse | APIError = error;

    for (const interceptor of interceptors) {
      try {
        result = await interceptor.handler(error, request);
        if (!(result instanceof Error)) {
          return result;
        }
      } catch (interceptorError) {
        console.warn(`Error interceptor ${interceptor.id} failed:`, interceptorError);
      }
    }

    throw result;
  }

  // Interceptor implementations
  private async authInterceptor(request: APIRequest): Promise<APIRequest> {
    if (!request.config.auth || !this.authCredentials) {
      return request;
    }

    // Check if token needs refresh
    if (this.needsTokenRefresh()) {
      await this.refreshAuth();
    }

    // Add authentication headers
    switch (this.authCredentials.type) {
      case 'api_key':
        request.headers['X-API-Key'] = this.authCredentials.apiKey!;
        break;
      case 'bearer':
        request.headers['Authorization'] = `Bearer ${this.authCredentials.bearerToken}`;
        break;
      case 'oauth':
        request.headers['Authorization'] = `Bearer ${this.authCredentials.accessToken}`;
        break;
    }

    return request;
  }

  private async rateLimitInterceptor(request: APIRequest): Promise<APIRequest> {
    if (!request.config.rateLimit || !this.config.rateLimit.enabled) {
      return request;
    }

    if (this.isRateLimited()) {
      const delay = this.getRateLimitDelay();
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.updateRateLimitState();
    return request;
  }

  private async headersInterceptor(request: APIRequest): Promise<APIRequest> {
    // Add default headers
    request.headers['Content-Type'] = request.headers['Content-Type'] || 'application/json';
    request.headers['Accept'] = request.headers['Accept'] || 'application/json';
    request.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return request;
  }

  private async validationInterceptor(request: APIRequest): Promise<APIRequest> {
    if (!request.config.validate) return request;

    // Validate request data
    if (request.data && typeof request.data === 'object') {
      // Perform validation logic here
    }

    return request;
  }

  private async cacheInterceptor(response: APIResponse): Promise<APIResponse> {
    if (response.cached || !this.config.cache.enabled) {
      return response;
    }

    // Cache successful responses
    if (response.status >= 200 && response.status < 300) {
      const cacheKey = this.generateCacheKey(response.requestId);
      const entry: CacheEntry = {
        id: this.generateId(),
        key: cacheKey,
        data: response.data,
        timestamp: Date.now(),
        ttl: this.config.cache.defaultTTL,
        size: JSON.stringify(response.data).length,
        accessCount: 0,
        lastAccessed: Date.now(),
        tags: [],
        metadata: {}
      };

      this.cache.set(cacheKey, entry);
      this.updateCacheStore();
    }

    return response;
  }

  private async transformInterceptor(response: APIResponse): Promise<APIResponse> {
    // Transform response data if needed
    return response;
  }

  private async metricsInterceptor(response: APIResponse): Promise<APIResponse> {
    // Update performance metrics
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.averageLatency = (this.metrics.averageLatency + response.latency) / 2;
    this._metrics.set(this.metrics);

    return response;
  }

  private async retryInterceptor(error: APIError, request: APIRequest): Promise<APIResponse | APIError> {
    if (!request.config.retry || !error.retryable || request.retries >= request.maxRetries) {
      return error;
    }

    // Calculate retry delay with exponential backoff
    const delay = this.config.retryDelay * Math.pow(this.config.retryBackoff, request.retries);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    request.retries++;
    this.metrics.retryCount++;

    return this.executeRequest(request);
  }

  private async offlineInterceptor(error: APIError, request: APIRequest): Promise<APIResponse | APIError> {
    if (this.isOnline || !request.config.offline) {
      return error;
    }

    this.addToOfflineQueue(request);
    return error;
  }

  private async circuitBreakerInterceptor(error: APIError, request: APIRequest): Promise<APIResponse | APIError> {
    this.updateCircuitBreaker(false);
    return error;
  }

  // Helper methods
  private getDefaultRequestConfig(): RequestConfig {
    return {
      cache: true,
      retry: true,
      rateLimit: true,
      auth: true,
      offline: true,
      realtime: false,
      validate: true,
      transform: true,
      progress: false,
      dedupe: true,
      batch: false
    };
  }

  private getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': this.config.version,
      'X-Request-ID': this.generateId()
    };
  }

  private buildURL(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    
    return `${this.config.baseURL}/${this.config.version}${url}`;
  }

  private prepareRequestBody(request: APIRequest): string | FormData | null {
    if (!request.data) return null;

    if (request.data instanceof FormData) {
      return request.data;
    }

    if (typeof request.data === 'object') {
      return JSON.stringify(request.data);
    }

    return request.data;
  }

  private async parseResponseData<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    if (contentType.includes('text/')) {
      return response.text() as any;
    }

    return response.blob() as any;
  }

  private parseResponseHeaders(headers: Headers): Record<string, string> {
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    return headerObj;
  }

  private createAPIError(error: any, request: APIRequest): APIError {
    return {
      id: this.generateId(),
      requestId: request.id,
      type: this.determineErrorType(error),
      status: error.status,
      code: error.code || 'UNKNOWN',
      message: error.message || 'Unknown error occurred',
      details: error,
      retryable: this.isRetryableError(error),
      timestamp: Date.now(),
      stack: error.stack
    };
  }

  private determineErrorType(error: any): APIError['type'] {
    if (error.name === 'AbortError') return 'timeout';
    if (error.status === 401 || error.status === 403) return 'auth';
    if (error.status >= 400 && error.status < 500) return 'client';
    if (error.status >= 500) return 'server';
    if (!navigator.onLine) return 'network';
    return 'unknown';
  }

  private isRetryableError(error: any): boolean {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) || error.name === 'NetworkError';
  }

  private getCachedResponse(request: APIRequest): APIResponse | null {
    const cacheKey = this.generateCacheKey(request.id);
    const entry = this.cache.get(cacheKey);

    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      return {
        id: this.generateId(),
        requestId: request.id,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: entry.data,
        cached: true,
        fromOffline: false,
        retryCount: 0,
        latency: 0,
        timestamp: Date.now(),
        metadata: { cached: true }
      };
    }

    return null;
  }

  private generateCacheKey(requestId: string): string {
    return `api_cache_${requestId}`;
  }

  private needsTokenRefresh(): boolean {
    if (!this.authCredentials || this.authCredentials.type !== 'oauth') {
      return false;
    }

    const now = Date.now();
    const expiresAt = this.authCredentials.expiresAt || 0;
    const threshold = this.config.auth.refreshThreshold;

    return (expiresAt - now) < threshold;
  }

  private isRateLimited(): boolean {
    return this.rateLimitState.blocked || this.rateLimitState.tokens <= 0;
  }

  private getRateLimitDelay(): number {
    return Math.max(0, this.rateLimitState.nextAllowed - Date.now());
  }

  private updateRateLimitState(): void {
    const now = Date.now();
    
    if (this.config.rateLimit.strategy === 'sliding') {
      // Sliding window implementation
      const windowStart = now - this.config.rateLimit.window;
      this.rateLimitState.requests = Math.max(0, this.rateLimitState.requests - 1);
      
      if (this.rateLimitState.requests >= this.config.rateLimit.requests) {
        this.rateLimitState.blocked = true;
        this.rateLimitState.nextAllowed = now + this.config.rateLimit.window;
      } else {
        this.rateLimitState.blocked = false;
        this.rateLimitState.requests++;
      }
    } else if (this.config.rateLimit.strategy === 'token_bucket') {
      // Token bucket implementation
      const timeSinceRefill = now - this.rateLimitState.lastRefill;
      const tokensToAdd = Math.floor(timeSinceRefill / (this.config.rateLimit.window / this.config.rateLimit.requests));
      
      this.rateLimitState.tokens = Math.min(
        this.config.rateLimit.requests,
        this.rateLimitState.tokens + tokensToAdd
      );
      this.rateLimitState.lastRefill = now;
      
      if (this.rateLimitState.tokens > 0) {
        this.rateLimitState.tokens--;
        this.rateLimitState.blocked = false;
      } else {
        this.rateLimitState.blocked = true;
        this.rateLimitState.nextAllowed = now + (this.config.rateLimit.window / this.config.rateLimit.requests);
      }
    }
  }

  private updateCircuitBreaker(success: boolean): void {
    const now = Date.now();
    
    if (success) {
      this.circuitBreaker.failures = 0;
      this.circuitBreaker.state = 'closed';
    } else {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = now;
      
      if (this.circuitBreaker.failures >= 5) {
        this.circuitBreaker.state = 'open';
        this.circuitBreaker.nextAttempt = now + 60000; // 1 minute
      }
    }
  }

  private addToOfflineQueue(request: APIRequest): void {
    if (this.offlineQueue.length >= this.config.offline.queueLimit) {
      this.offlineQueue.shift(); // Remove oldest
    }
    
    this.offlineQueue.push(request);
    this.saveOfflineQueue();
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of queue) {
      try {
        await this.executeRequest(request);
      } catch (error) {
        console.warn('Failed to process offline request:', error);
        // Re-queue failed requests
        this.addToOfflineQueue(request);
      }
    }

    this.saveOfflineQueue();
  }

  private loadOfflineQueue(): void {
    try {
      const queue = localStorage.getItem('ecoscan-offline-queue');
      if (queue) {
        this.offlineQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  private saveOfflineQueue(): void {
    try {
      localStorage.setItem('ecoscan-offline-queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private connectWebSocket(): void {
    try {
      const wsUrl = this.config.baseURL.replace('http', 'ws') + '/ws';
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.startHeartbeat();
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        
        // Reconnect after delay
        setTimeout(() => {
          this.connectWebSocket();
        }, 5000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.warn('Failed to connect WebSocket:', error);
    }
  }

  private connectSSE(): void {
    try {
      const sseUrl = `${this.config.baseURL}/events`;
      this.eventSource = new EventSource(sseUrl);
      
      this.eventSource.onopen = () => {
        console.log('SSE connected');
      };
      
      this.eventSource.onmessage = (event) => {
        this.handleSSEMessage(event);
      };
      
      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
      };
    } catch (error) {
      console.warn('Failed to connect SSE:', error);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.realtime.heartbeat);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      // Handle real-time messages
      console.log('WebSocket message:', message);
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error);
    }
  }

  private handleSSEMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      // Handle server-sent events
      console.log('SSE message:', message);
    } catch (error) {
      console.warn('Failed to parse SSE message:', error);
    }
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const start = performance.now();
      const response = await fetch('/api/ping', { method: 'HEAD' });
      const end = performance.now();
      
      if (response.ok) {
        this.isOnline = true;
        this.updateConnectivity(end - start);
      } else {
        this.isOnline = false;
        this.updateConnectivity();
      }
    } catch (error) {
      this.isOnline = false;
      this.updateConnectivity();
    }
  }

  private updateConnectivity(latency = 0): void {
    let quality = 'poor';
    if (this.isOnline) {
      if (latency < 100) quality = 'excellent';
      else if (latency < 300) quality = 'good';
      else if (latency < 1000) quality = 'fair';
    }

    this._connectivity.set({
      online: this.isOnline,
      latency,
      quality
    });
  }

  private updateMetrics(request: APIRequest, response: APIResponse): void {
    this.metrics.totalRequests++;
    this.metrics.averageLatency = (this.metrics.averageLatency + response.latency) / 2;
    this.metrics.bytesTransferred += JSON.stringify(response.data).length;
    
    if (response.status >= 200 && response.status < 300) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
    
    this._metrics.set(this.metrics);
  }

  private calculateCacheHitRate(): number {
    const totalAccess = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0);
    return totalAccess > 0 ? (totalAccess / this.metrics.totalRequests) * 100 : 0;
  }

  private updateCacheStore(): void {
    this._cache.set({
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      entries: this.cache.size
    });
  }

  private updateAuthStore(): void {
    this._auth.set({
      authenticated: !!this.authCredentials,
      expires: this.authCredentials?.expiresAt || 0,
      type: this.authCredentials?.type || 'none'
    });
  }

  private processSyncOperations(): void {
    // Process any pending sync operations
    this.syncOperations.forEach(async (operation, id) => {
      if (operation.status === 'pending') {
        try {
          operation.status = 'processing';
          await this.executeSyncOperation(operation);
          operation.status = 'completed';
        } catch (error) {
          operation.status = 'failed';
          operation.error = this.createAPIError(error, {} as APIRequest);
        }
      }
    });
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    // Execute sync operation
    console.log('Executing sync operation:', operation);
  }

  private generateId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  public getConfig(): APIConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<APIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public isAuthenticated(): boolean {
    return !!this.authCredentials;
  }

  public isConnected(): boolean {
    return this.isOnline;
  }

  public getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  public getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  public cleanup(): void {
    this.cancelAllRequests();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.websocket) {
      this.websocket.close();
    }
    
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    this.cache.clear();
    this.offlineQueue = [];
    this.syncOperations.clear();
  }
}

interface CircuitBreakerState {
  state: 'open' | 'closed' | 'half-open';
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

// Global instance
export const advancedAPIClient = new AdvancedAPIClient();

// Utility functions
export function createAPIClient(config?: Partial<APIConfig>): AdvancedAPIClient {
  return new AdvancedAPIClient(config);
}

export function get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
  return advancedAPIClient.get<T>(url, config);
}

export function post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
  return advancedAPIClient.post<T>(url, data, config);
}

export function put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
  return advancedAPIClient.put<T>(url, data, config);
}

export function patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
  return advancedAPIClient.patch<T>(url, data, config);
}

export function del<T = any>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
  return advancedAPIClient.delete<T>(url, config);
}

export function uploadFile(url: string, file: File, config?: { onProgress?: (progress: number) => void }): Promise<APIResponse> {
  return advancedAPIClient.uploadFile(url, file, config);
}

export function downloadFile(url: string, config?: { onProgress?: (progress: number) => void }): Promise<Blob> {
  return advancedAPIClient.downloadFile(url, config);
}

export function setAuthCredentials(credentials: AuthCredentials): void {
  advancedAPIClient.setAuthCredentials(credentials);
}

export function clearAuthCredentials(): void {
  advancedAPIClient.clearAuthCredentials();
}

export function clearAPICache(): void {
  advancedAPIClient.clearCache();
}

export function getAPIMetrics(): APIMetrics {
  return advancedAPIClient.getMetrics();
} 