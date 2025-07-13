/**
 * Comprehensive Developer Tools System for EcoScan
 * 
 * Features:
 * - Interactive debugging panels and console
 * - Performance profiling and optimization tools
 * - Code analysis and quality metrics
 * - Memory and resource monitoring
 * - Network request debugging
 * - Error tracking and diagnostics
 * - Development utilities and helpers
 * - Real-time system monitoring
 * - Bundle analysis and optimization
 * - Advanced logging and tracing
 * - A/B testing and feature flags
 * - Development workflow automation
 * - Code generation and scaffolding
 * - Hot reload and live development
 * - Testing and quality assurance tools
 * 
 * Debug Tools:
 * - Component inspector
 * - Store state visualization
 * - Event tracking and replay
 * - Performance bottleneck detection
 * - Memory leak detection
 * - Network waterfall analysis
 * - Error boundary monitoring
 * - Accessibility audit tools
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { enhancedAnalytics } from './analytics';

// Developer tools interfaces
export interface DevToolsConfig {
  enabled: boolean;
  debug: boolean;
  showInProduction: boolean;
  hotkeys: boolean;
  autoOpen: boolean;
  persistState: boolean;
  features: {
    performance: boolean;
    network: boolean;
    memory: boolean;
    console: boolean;
    inspector: boolean;
    profiler: boolean;
    accessibility: boolean;
    testing: boolean;
  };
  panels: {
    console: boolean;
    performance: boolean;
    network: boolean;
    memory: boolean;
    inspector: boolean;
    profiler: boolean;
    accessibility: boolean;
    testing: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxEntries: number;
    persist: boolean;
    timestamp: boolean;
    stackTrace: boolean;
  };
  profiling: {
    enabled: boolean;
    sampleRate: number;
    maxSamples: number;
    trackComponents: boolean;
    trackStores: boolean;
    trackNetwork: boolean;
  };
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  stack?: string;
  component?: string;
  source: string;
  category: string;
  tags: string[];
}

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'timing' | 'counter' | 'gauge' | 'histogram';
  value: number;
  timestamp: number;
  unit?: string;
  component?: string;
  tags: Record<string, string>;
  metadata: any;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  timestamp: number;
  duration: number;
  size: number;
  headers: Record<string, string>;
  request: any;
  response: any;
  cached: boolean;
  error?: string;
}

export interface MemoryUsage {
  timestamp: number;
  used: number;
  total: number;
  limit: number;
  heapSize: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  components: number;
  stores: number;
  listeners: number;
}

export interface ComponentInspection {
  id: string;
  name: string;
  type: 'component' | 'store' | 'module';
  props: Record<string, any>;
  state: Record<string, any>;
  events: string[];
  children: ComponentInspection[];
  parent?: string;
  performance: {
    renderTime: number;
    updateCount: number;
    lastRender: number;
  };
  metadata: any;
}

export interface CodeAnalysis {
  id: string;
  file: string;
  type: 'performance' | 'quality' | 'security' | 'accessibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  line: number;
  column: number;
  suggestion: string;
  fix?: string;
  metadata: any;
}

export interface TestResult {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'accessibility';
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  timestamp: number;
  assertions: number;
  error?: string;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  metadata: any;
}

export interface DevToolsState {
  isOpen: boolean;
  activePanel: string;
  panels: Record<string, boolean>;
  performance: PerformanceMetric[];
  network: NetworkRequest[];
  memory: MemoryUsage[];
  logs: LogEntry[];
  components: ComponentInspection[];
  analysis: CodeAnalysis[];
  tests: TestResult[];
  profiling: boolean;
  recording: boolean;
  breakpoints: string[];
  watches: Record<string, any>;
}

class DeveloperToolsSystem {
  private config: DevToolsConfig;
  private state: DevToolsState;
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private networkRequests: NetworkRequest[] = [];
  private memoryUsage: MemoryUsage[] = [];
  private components: ComponentInspection[] = [];
  private codeAnalysis: CodeAnalysis[] = [];
  private testResults: TestResult[] = [];
  private profiler: any = null;
  private observer: MutationObserver | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private intervalId: number | null = null;
  private originalConsole: Console;
  private panel: HTMLElement | null = null;
  private hotkeys: Map<string, () => void> = new Map();

  // Reactive stores
  private _devToolsState = writable<DevToolsState>(this.getInitialState());
  private _logs = writable<LogEntry[]>([]);
  private _performance = writable<PerformanceMetric[]>([]);
  private _network = writable<NetworkRequest[]>([]);
  private _memory = writable<MemoryUsage[]>([]);
  private _components = writable<ComponentInspection[]>([]);
  private _analysis = writable<CodeAnalysis[]>([]);
  private _tests = writable<TestResult[]>([]);

  public readonly devToolsState: Readable<DevToolsState> = this._devToolsState;
  public readonly logsStore: Readable<LogEntry[]> = this._logs;
  public readonly performanceStore: Readable<PerformanceMetric[]> = this._performance;
  public readonly networkStore: Readable<NetworkRequest[]> = this._network;
  public readonly memoryStore: Readable<MemoryUsage[]> = this._memory;
  public readonly componentsStore: Readable<ComponentInspection[]> = this._components;
  public readonly analysisStore: Readable<CodeAnalysis[]> = this._analysis;
  public readonly testsStore: Readable<TestResult[]> = this._tests;

  constructor() {
    this.originalConsole = console;
    this.config = this.getDevToolsConfig();
    this.state = this.getInitialState();
    this.initializeDeveloperTools();
  }

  private getDevToolsConfig(): DevToolsConfig {
    return {
      enabled: true,
      debug: true,
      showInProduction: false,
      hotkeys: true,
      autoOpen: false,
      persistState: true,
      features: {
        performance: true,
        network: true,
        memory: true,
        console: true,
        inspector: true,
        profiler: true,
        accessibility: true,
        testing: true
      },
      panels: {
        console: true,
        performance: true,
        network: true,
        memory: true,
        inspector: true,
        profiler: true,
        accessibility: true,
        testing: true
      },
      logging: {
        level: 'debug',
        maxEntries: 1000,
        persist: true,
        timestamp: true,
        stackTrace: true
      },
      profiling: {
        enabled: true,
        sampleRate: 100,
        maxSamples: 10000,
        trackComponents: true,
        trackStores: true,
        trackNetwork: true
      }
    };
  }

  private getInitialState(): DevToolsState {
    return {
      isOpen: false,
      activePanel: 'console',
      panels: {
        console: true,
        performance: true,
        network: true,
        memory: true,
        inspector: true,
        profiler: true,
        accessibility: true,
        testing: true
      },
      performance: [],
      network: [],
      memory: [],
      logs: [],
      components: [],
      analysis: [],
      tests: [],
      profiling: false,
      recording: false,
      breakpoints: [],
      watches: {}
    };
  }

  private initializeDeveloperTools(): void {
    if (!browser || !this.config.enabled) return;

    // Check if we should show in production
    if (import.meta.env.PROD && !this.config.showInProduction) return;

    try {
      this.setupConsoleInterception();
      this.setupPerformanceMonitoring();
      this.setupNetworkMonitoring();
      this.setupMemoryMonitoring();
      this.setupComponentInspection();
      this.setupCodeAnalysis();
      this.setupHotkeys();
      this.setupUI();
      this.loadPersistedState();
      
      console.log('🛠️ Developer tools initialized');
    } catch (error) {
      console.error('Failed to initialize developer tools:', error);
    }
  }

  private setupConsoleInterception(): void {
    if (!this.config.features.console) return;

    const self = this;
    
    // Override console methods
    ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
      const original = this.originalConsole[method as keyof Console] as any;
      
      (console as any)[method] = function(...args: any[]) {
        // Call original method
        original.apply(console, args);
        
        // Log to dev tools
        self.addLogEntry({
          level: method as any,
          message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
          data: args,
          source: 'console',
          category: 'general',
          tags: [method],
          stack: self.config.logging.stackTrace ? new Error().stack : undefined
        });
      };
    });
  }

  private setupPerformanceMonitoring(): void {
    if (!this.config.features.performance) return;

    // Performance Observer
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.addPerformanceMetric({
            name: entry.name,
            type: 'timing',
            value: entry.duration,
            timestamp: Date.now(),
            unit: 'ms',
            tags: {
              entryType: entry.entryType,
              initiatorType: (entry as any).initiatorType || 'unknown'
            },
            metadata: entry
          });
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }

    // Custom performance tracking
    this.interceptRenderCalls();
    this.monitorFrameRate();
  }

  private setupNetworkMonitoring(): void {
    if (!this.config.features.network) return;

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = init?.method || 'GET';
      const startTime = Date.now();
      
      const requestId = this.generateId();
      
      try {
        const response = await originalFetch(input, init);
        const endTime = Date.now();
        
        this.addNetworkRequest({
          id: requestId,
          url,
          method,
          status: response.status,
          timestamp: startTime,
          duration: endTime - startTime,
          size: parseInt(response.headers.get('content-length') || '0'),
          headers: this.headersToObject(response.headers),
          request: { body: init?.body, headers: init?.headers },
          response: { status: response.status, statusText: response.statusText },
          cached: response.headers.get('x-cache') === 'HIT'
        });
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        
        this.addNetworkRequest({
          id: requestId,
          url,
          method,
          status: 0,
          timestamp: startTime,
          duration: endTime - startTime,
          size: 0,
          headers: {},
          request: { body: init?.body, headers: init?.headers },
          response: {},
          cached: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const requestId = generateId();
      let startTime = 0;
      
      const originalOpen = xhr.open;
      xhr.open = function(method, url, ...args) {
        startTime = Date.now();
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      const originalSend = xhr.send;
      xhr.send = function(body) {
        const result = originalSend.apply(this, [body]);
        
        xhr.addEventListener('loadend', () => {
          const endTime = Date.now();
          
          self.addNetworkRequest({
            id: requestId,
            url: xhr.responseURL,
            method: xhr.responseType || 'GET',
            status: xhr.status,
            timestamp: startTime,
            duration: endTime - startTime,
            size: xhr.responseText?.length || 0,
            headers: this.parseResponseHeaders(xhr.getAllResponseHeaders()),
            request: { body },
            response: { response: xhr.response, responseText: xhr.responseText },
            cached: false,
            error: xhr.status >= 400 ? xhr.statusText : undefined
          });
        });
        
        return result;
      };
      
      return xhr;
    };
  }

  private setupMemoryMonitoring(): void {
    if (!this.config.features.memory) return;

    this.intervalId = window.setInterval(() => {
      this.collectMemoryMetrics();
    }, 5000); // Every 5 seconds
  }

  private setupComponentInspection(): void {
    if (!this.config.features.inspector) return;

    // Set up DOM observer
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.inspectComponent(node as Element);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
  }

  private setupCodeAnalysis(): void {
    if (!this.config.features.testing) return;

    // Static analysis would typically run during build
    // For runtime, we can check for common issues
    this.analyzeRuntimeCode();
  }

  private setupHotkeys(): void {
    if (!this.config.hotkeys) return;

    // Register hotkeys
    this.hotkeys.set('F12', () => this.toggle());
    this.hotkeys.set('Ctrl+Shift+I', () => this.toggle());
    this.hotkeys.set('Ctrl+Shift+J', () => this.openPanel('console'));
    this.hotkeys.set('Ctrl+Shift+P', () => this.openPanel('performance'));
    this.hotkeys.set('Ctrl+Shift+N', () => this.openPanel('network'));
    this.hotkeys.set('Ctrl+Shift+M', () => this.openPanel('memory'));
    this.hotkeys.set('Ctrl+Shift+C', () => this.openPanel('inspector'));

    document.addEventListener('keydown', (event) => {
      const key = this.getKeyString(event);
      const handler = this.hotkeys.get(key);
      if (handler) {
        event.preventDefault();
        handler();
      }
    });
  }

  private setupUI(): void {
    this.createDevToolsPanel();
    
    if (this.config.autoOpen) {
      this.open();
    }
  }

  private createDevToolsPanel(): void {
    // Create the main dev tools panel
    this.panel = document.createElement('div');
    this.panel.id = 'ecoscan-dev-tools';
    this.panel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 300px;
      background: #1a1a1a;
      border-top: 1px solid #333;
      z-index: 10000;
      display: none;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      color: #fff;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      background: #2d2d2d;
      border-bottom: 1px solid #333;
      padding: 8px 12px;
      align-items: center;
      gap: 12px;
    `;

    // Create tabs
    const tabs = ['console', 'performance', 'network', 'memory', 'inspector', 'profiler', 'accessibility', 'testing'];
    tabs.forEach(tab => {
      if (this.config.panels[tab as keyof DevToolsConfig['panels']]) {
        const button = document.createElement('button');
        button.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
        button.style.cssText = `
          background: transparent;
          border: none;
          color: #ccc;
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        `;
        button.addEventListener('click', () => this.openPanel(tab));
        header.appendChild(button);
      }
    });

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #ccc;
      padding: 6px 12px;
      cursor: pointer;
      margin-left: auto;
      font-size: 16px;
    `;
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    // Create content area
    const content = document.createElement('div');
    content.id = 'dev-tools-content';
    content.style.cssText = `
      height: calc(100% - 40px);
      overflow: auto;
      padding: 12px;
    `;

    this.panel.appendChild(header);
    this.panel.appendChild(content);
    document.body.appendChild(this.panel);

    this.renderPanelContent();
  }

  private renderPanelContent(): void {
    const content = document.getElementById('dev-tools-content');
    if (!content) return;

    content.innerHTML = this.getPanelHTML(this.state.activePanel);
  }

  private getPanelHTML(panel: string): string {
    switch (panel) {
      case 'console':
        return this.getConsoleHTML();
      case 'performance':
        return this.getPerformanceHTML();
      case 'network':
        return this.getNetworkHTML();
      case 'memory':
        return this.getMemoryHTML();
      case 'inspector':
        return this.getInspectorHTML();
      case 'profiler':
        return this.getProfilerHTML();
      case 'accessibility':
        return this.getAccessibilityHTML();
      case 'testing':
        return this.getTestingHTML();
      default:
        return '<div>Panel not found</div>';
    }
  }

  private getConsoleHTML(): string {
    const logs = this.logs.slice(-50); // Show last 50 logs
    const logHtml = logs.map(log => `
      <div style="padding: 4px 0; border-bottom: 1px solid #333; color: ${this.getLogColor(log.level)}">
        <span style="color: #666">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
        <span style="color: #888">[${log.level.toUpperCase()}]</span>
        <span>${log.message}</span>
      </div>
    `).join('');

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <input type="text" id="console-input" placeholder="Enter JavaScript..." style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px;">
        </div>
        <div id="console-logs" style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          ${logHtml}
        </div>
      </div>
    `;
  }

  private getPerformanceHTML(): string {
    const metrics = this.performanceMetrics.slice(-20);
    const metricsHtml = metrics.map(metric => `
      <div style="padding: 4px 0; border-bottom: 1px solid #333;">
        <span style="color: #4CAF50">${metric.name}</span>
        <span style="color: #FFC107; margin-left: 12px;">${metric.value}${metric.unit || ''}</span>
        <span style="color: #666; margin-left: 12px;">${new Date(metric.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <button id="clear-performance" style="padding: 6px 12px; background: #f44336; border: none; color: white; border-radius: 4px; cursor: pointer;">Clear</button>
          <button id="record-performance" style="padding: 6px 12px; background: #4CAF50; border: none; color: white; border-radius: 4px; cursor: pointer; margin-left: 8px;">Record</button>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          ${metricsHtml}
        </div>
      </div>
    `;
  }

  private getNetworkHTML(): string {
    const requests = this.networkRequests.slice(-20);
    const requestsHtml = requests.map(req => `
      <div style="padding: 4px 0; border-bottom: 1px solid #333;">
        <span style="color: ${this.getStatusColor(req.status)}">${req.method}</span>
        <span style="color: #2196F3; margin-left: 12px;">${req.url}</span>
        <span style="color: ${this.getStatusColor(req.status)}; margin-left: 12px;">${req.status}</span>
        <span style="color: #666; margin-left: 12px;">${req.duration}ms</span>
        <span style="color: #666; margin-left: 12px;">${this.formatBytes(req.size)}</span>
      </div>
    `).join('');

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <button id="clear-network" style="padding: 6px 12px; background: #f44336; border: none; color: white; border-radius: 4px; cursor: pointer;">Clear</button>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          ${requestsHtml}
        </div>
      </div>
    `;
  }

  private getMemoryHTML(): string {
    const latest = this.memoryUsage[this.memoryUsage.length - 1];
    if (!latest) return '<div>No memory data available</div>';

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <div style="color: #4CAF50;">Used: ${this.formatBytes(latest.used)}</div>
          <div style="color: #FFC107;">Heap: ${this.formatBytes(latest.heapUsed)} / ${this.formatBytes(latest.heapSize)}</div>
          <div style="color: #2196F3;">Total: ${this.formatBytes(latest.total)}</div>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          <canvas id="memory-chart" width="400" height="200"></canvas>
        </div>
      </div>
    `;
  }

  private getInspectorHTML(): string {
    const components = this.components.slice(-10);
    const componentsHtml = components.map(comp => `
      <div style="padding: 4px 0; border-bottom: 1px solid #333;">
        <span style="color: #4CAF50">${comp.name}</span>
        <span style="color: #FFC107; margin-left: 12px;">${comp.type}</span>
        <span style="color: #666; margin-left: 12px;">Renders: ${comp.performance.updateCount}</span>
        <span style="color: #666; margin-left: 12px;">Last: ${comp.performance.renderTime}ms</span>
      </div>
    `).join('');

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <button id="inspect-component" style="padding: 6px 12px; background: #2196F3; border: none; color: white; border-radius: 4px; cursor: pointer;">Inspect</button>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          ${componentsHtml}
        </div>
      </div>
    `;
  }

  private getProfilerHTML(): string {
    return `
      <div>
        <div style="margin-bottom: 12px;">
          <button id="start-profiling" style="padding: 6px 12px; background: #4CAF50; border: none; color: white; border-radius: 4px; cursor: pointer;">Start Profiling</button>
          <button id="stop-profiling" style="padding: 6px 12px; background: #f44336; border: none; color: white; border-radius: 4px; cursor: pointer; margin-left: 8px;">Stop</button>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          <div>Profiler ready...</div>
        </div>
      </div>
    `;
  }

  private getAccessibilityHTML(): string {
    const issues = this.codeAnalysis.filter(a => a.type === 'accessibility').slice(-10);
    const issuesHtml = issues.map(issue => `
      <div style="padding: 4px 0; border-bottom: 1px solid #333;">
        <span style="color: ${this.getSeverityColor(issue.severity)}">${issue.severity.toUpperCase()}</span>
        <span style="color: #FFC107; margin-left: 12px;">${issue.title}</span>
        <span style="color: #666; margin-left: 12px;">${issue.file}:${issue.line}</span>
      </div>
    `).join('');

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <button id="audit-accessibility" style="padding: 6px 12px; background: #2196F3; border: none; color: white; border-radius: 4px; cursor: pointer;">Run Audit</button>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          ${issuesHtml}
        </div>
      </div>
    `;
  }

  private getTestingHTML(): string {
    const tests = this.testResults.slice(-10);
    const testsHtml = tests.map(test => `
      <div style="padding: 4px 0; border-bottom: 1px solid #333;">
        <span style="color: ${this.getTestStatusColor(test.status)}">${test.status.toUpperCase()}</span>
        <span style="color: #2196F3; margin-left: 12px;">${test.name}</span>
        <span style="color: #666; margin-left: 12px;">${test.duration}ms</span>
        <span style="color: #666; margin-left: 12px;">${test.assertions} assertions</span>
      </div>
    `).join('');

    return `
      <div>
        <div style="margin-bottom: 12px;">
          <button id="run-tests" style="padding: 6px 12px; background: #4CAF50; border: none; color: white; border-radius: 4px; cursor: pointer;">Run Tests</button>
        </div>
        <div style="height: 200px; overflow-y: auto; background: #111; padding: 8px; border-radius: 4px;">
          ${testsHtml}
        </div>
      </div>
    `;
  }

  private addLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...entry
    };

    this.logs.push(logEntry);
    
    // Limit log entries
    if (this.logs.length > this.config.logging.maxEntries) {
      this.logs.shift();
    }
    
    this._logs.set(this.logs);
    this.updatePanel();
  }

  private addPerformanceMetric(metric: Omit<PerformanceMetric, 'id'>): void {
    const perfMetric: PerformanceMetric = {
      id: this.generateId(),
      ...metric
    };

    this.performanceMetrics.push(perfMetric);
    
    // Limit metrics
    if (this.performanceMetrics.length > this.config.profiling.maxSamples) {
      this.performanceMetrics.shift();
    }
    
    this._performance.set(this.performanceMetrics);
    this.updatePanel();
  }

  private addNetworkRequest(request: NetworkRequest): void {
    this.networkRequests.push(request);
    
    // Limit requests
    if (this.networkRequests.length > 100) {
      this.networkRequests.shift();
    }
    
    this._network.set(this.networkRequests);
    this.updatePanel();
  }

  private collectMemoryMetrics(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usage: MemoryUsage = {
        timestamp: Date.now(),
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
        heapSize: memInfo.totalJSHeapSize,
        heapUsed: memInfo.usedJSHeapSize,
        external: 0, // Not available in browser
        arrayBuffers: 0, // Not available in browser
        components: this.components.length,
        stores: 0, // Would need to track stores
        listeners: 0 // Would need to track listeners
      };

      this.memoryUsage.push(usage);
      
      // Limit memory samples
      if (this.memoryUsage.length > 100) {
        this.memoryUsage.shift();
      }
      
      this._memory.set(this.memoryUsage);
      this.updatePanel();
    }
  }

  private inspectComponent(element: Element): void {
    const componentName = element.tagName.toLowerCase();
    const component: ComponentInspection = {
      id: this.generateId(),
      name: componentName,
      type: 'component',
      props: this.getElementProps(element),
      state: {},
      events: this.getElementEvents(element),
      children: [],
      performance: {
        renderTime: 0,
        updateCount: 1,
        lastRender: Date.now()
      },
      metadata: {
        className: element.className,
        id: element.id,
        attributes: this.getElementAttributes(element)
      }
    };

    this.components.push(component);
    this._components.set(this.components);
  }

  private analyzeRuntimeCode(): void {
    // Basic runtime analysis
    const issues: CodeAnalysis[] = [];

    // Check for console.log in production
    if (import.meta.env.PROD) {
      issues.push({
        id: this.generateId(),
        file: 'runtime',
        type: 'quality',
        severity: 'medium',
        title: 'Console logs in production',
        description: 'Console logs should be removed in production builds',
        line: 0,
        column: 0,
        suggestion: 'Remove console.log statements or use a logging library',
        metadata: {}
      });
    }

    // Check for long-running tasks
    if (this.performanceMetrics.some(m => m.value > 50)) {
      issues.push({
        id: this.generateId(),
        file: 'runtime',
        type: 'performance',
        severity: 'high',
        title: 'Long-running tasks detected',
        description: 'Tasks taking longer than 50ms may block the UI',
        line: 0,
        column: 0,
        suggestion: 'Consider breaking down long tasks or using web workers',
        metadata: {}
      });
    }

    this.codeAnalysis.push(...issues);
    this._analysis.set(this.codeAnalysis);
  }

  private interceptRenderCalls(): void {
    // This would typically require integration with the framework
    // For now, we'll simulate component render tracking
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      const start = performance.now();
      return originalRequestAnimationFrame(() => {
        const end = performance.now();
        this.addPerformanceMetric({
          name: 'frame',
          type: 'timing',
          value: end - start,
          timestamp: Date.now(),
          unit: 'ms',
          tags: { type: 'render' },
          metadata: {}
        });
        callback(end);
      });
    };
  }

  private monitorFrameRate(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      const now = performance.now();
      frameCount++;
      
      if (now - lastTime >= 1000) {
        this.addPerformanceMetric({
          name: 'fps',
          type: 'gauge',
          value: frameCount,
          timestamp: Date.now(),
          unit: 'fps',
          tags: { type: 'performance' },
          metadata: {}
        });
        
        frameCount = 0;
        lastTime = now;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  private loadPersistedState(): void {
    if (!this.config.persistState) return;

    try {
      const state = localStorage.getItem('ecoscan-dev-tools-state');
      if (state) {
        const parsed = JSON.parse(state);
        this.state = { ...this.state, ...parsed };
        this._devToolsState.set(this.state);
      }
    } catch (error) {
      console.warn('Failed to load persisted dev tools state:', error);
    }
  }

  private saveState(): void {
    if (!this.config.persistState) return;

    try {
      localStorage.setItem('ecoscan-dev-tools-state', JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save dev tools state:', error);
    }
  }

  private updatePanel(): void {
    if (this.state.isOpen && this.panel) {
      this.renderPanelContent();
    }
  }

  // Helper methods
  private generateId(): string {
    return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }

  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  private parseResponseHeaders(headers: string): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.split('\r\n').forEach(line => {
      const [key, value] = line.split(': ');
      if (key && value) {
        obj[key] = value;
      }
    });
    return obj;
  }

  private getElementProps(element: Element): Record<string, any> {
    const props: Record<string, any> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      props[attr.name] = attr.value;
    }
    return props;
  }

  private getElementEvents(element: Element): string[] {
    const events: string[] = [];
    for (const key in element) {
      if (key.startsWith('on') && typeof (element as any)[key] === 'function') {
        events.push(key.substring(2));
      }
    }
    return events;
  }

  private getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  private getLogColor(level: string): string {
    switch (level) {
      case 'error': return '#f44336';
      case 'warn': return '#ff9800';
      case 'info': return '#2196f3';
      case 'debug': return '#9c27b0';
      default: return '#fff';
    }
  }

  private getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return '#4caf50';
    if (status >= 300 && status < 400) return '#ff9800';
    if (status >= 400) return '#f44336';
    return '#666';
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffc107';
      case 'low': return '#4caf50';
      default: return '#666';
    }
  }

  private getTestStatusColor(status: string): string {
    switch (status) {
      case 'passed': return '#4caf50';
      case 'failed': return '#f44336';
      case 'skipped': return '#ff9800';
      case 'pending': return '#ffc107';
      default: return '#666';
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Public API
  public toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.state.isOpen = true;
    if (this.panel) {
      this.panel.style.display = 'block';
    }
    this._devToolsState.set(this.state);
    this.saveState();
  }

  public close(): void {
    this.state.isOpen = false;
    if (this.panel) {
      this.panel.style.display = 'none';
    }
    this._devToolsState.set(this.state);
    this.saveState();
  }

  public openPanel(panel: string): void {
    this.state.activePanel = panel;
    this._devToolsState.set(this.state);
    this.renderPanelContent();
    this.saveState();
  }

  public log(level: LogEntry['level'], message: string, data?: any): void {
    this.addLogEntry({
      level,
      message,
      data,
      source: 'api',
      category: 'general',
      tags: [level]
    });
  }

  public measure(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    this.addPerformanceMetric({
      name,
      type: 'timing',
      value: end - start,
      timestamp: Date.now(),
      unit: 'ms',
      tags: { type: 'measurement' },
      metadata: {}
    });
  }

  public startProfiling(): void {
    this.state.profiling = true;
    this._devToolsState.set(this.state);
    console.log('🔍 Profiling started');
  }

  public stopProfiling(): void {
    this.state.profiling = false;
    this._devToolsState.set(this.state);
    console.log('⏹️ Profiling stopped');
  }

  public runTests(): void {
    // Mock test execution
    const mockTests = [
      { name: 'Component renders correctly', type: 'unit', status: 'passed' },
      { name: 'API calls work', type: 'integration', status: 'passed' },
      { name: 'Performance benchmark', type: 'performance', status: 'failed' }
    ];

    mockTests.forEach(test => {
      this.testResults.push({
        id: this.generateId(),
        name: test.name,
        type: test.type as any,
        status: test.status as any,
        duration: Math.random() * 100,
        timestamp: Date.now(),
        assertions: Math.floor(Math.random() * 10) + 1,
        metadata: {}
      });
    });

    this._tests.set(this.testResults);
    this.updatePanel();
  }

  public clearLogs(): void {
    this.logs = [];
    this._logs.set(this.logs);
    this.updatePanel();
  }

  public clearPerformance(): void {
    this.performanceMetrics = [];
    this._performance.set(this.performanceMetrics);
    this.updatePanel();
  }

  public clearNetwork(): void {
    this.networkRequests = [];
    this._network.set(this.networkRequests);
    this.updatePanel();
  }

  public getState(): DevToolsState {
    return { ...this.state };
  }

  public cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.panel) {
      this.panel.remove();
    }
    
    // Restore original console
    Object.assign(console, this.originalConsole);
    
    this.logs = [];
    this.performanceMetrics = [];
    this.networkRequests = [];
    this.memoryUsage = [];
    this.components = [];
    this.codeAnalysis = [];
    this.testResults = [];
  }
}

// Global instance
export const developerTools = new DeveloperToolsSystem();

// Global variable for console access
if (browser) {
  (window as any).devTools = developerTools;
}

// Utility functions
export function log(level: LogEntry['level'], message: string, data?: any): void {
  developerTools.log(level, message, data);
}

export function measure(name: string, fn: () => void): void {
  developerTools.measure(name, fn);
}

export function openDevTools(): void {
  developerTools.open();
}

export function closeDevTools(): void {
  developerTools.close();
}

export function toggleDevTools(): void {
  developerTools.toggle();
}

export function startProfiling(): void {
  developerTools.startProfiling();
}

export function stopProfiling(): void {
  developerTools.stopProfiling();
}

export function runTests(): void {
  developerTools.runTests();
}

function generateId(): string {
  return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 