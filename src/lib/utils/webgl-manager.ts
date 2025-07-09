/**
 * WebGL Context Manager for EcoScan
 * Handles WebGL context loss, recovery, and GPU memory management
 */

import { isBrowser, safeCreateCanvas, safeDocument, safeWindow, safeNavigator } from './browser.js';

export interface WebGLContextConfig {
  maxTextureSize: number;
  maxVertexAttribs: number;
  maxVaryingVectors: number;
  maxFragmentUniforms: number;
  memoryLimit: number; // in MB
}

export interface WebGLState {
  isContextLost: boolean;
  contextLossCount: number;
  lastContextLoss: number;
  lastRecovery: number;
  memoryUsage: number;
  isRecovering: boolean;
}

export class WebGLContextManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private state: WebGLState;
  private config: WebGLContextConfig;
  private extensions: Map<string, any> = new Map();
  private eventListeners: Map<string, EventListener> = new Map();
  private recoveryCallbacks: Set<() => Promise<void>> = new Set();
  private memoryMonitorInterval?: NodeJS.Timeout;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || this.createCanvas();
    this.state = {
      isContextLost: false,
      contextLossCount: 0,
      lastContextLoss: 0,
      lastRecovery: 0,
      memoryUsage: 0,
      isRecovering: false
    };
    
    this.config = {
      maxTextureSize: 2048,
      maxVertexAttribs: 16,
      maxVaryingVectors: 8,
      maxFragmentUniforms: 16,
      memoryLimit: 512 // 512MB GPU memory limit
    };

    this.initializeContext();
    this.setupEventListeners();
    this.startMemoryMonitoring();
  }

  private createCanvas(): HTMLCanvasElement {
    if (!isBrowser()) {
      throw new Error('Cannot create canvas during SSR');
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    return canvas;
  }

  private initializeContext(): boolean {
    try {
      // Try WebGL2 first, fallback to WebGL1
      this.gl = this.canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      }) as WebGL2RenderingContext;

      if (!this.gl) {
        this.gl = this.canvas.getContext('webgl', {
          antialias: false,
          alpha: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false
        }) as WebGLRenderingContext;
      }

      if (!this.gl) {
        console.error('WebGL not supported');
        return false;
      }

      this.loadExtensions();
      this.validateCapabilities();
      this.state.isContextLost = false;
      
      console.log('✅ WebGL context initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGL context:', error);
      return false;
    }
  }

  private loadExtensions(): void {
    if (!this.gl) return;

    const extensionNames = [
      'WEBGL_lose_context',
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_etc1',
      'EXT_texture_filter_anisotropic',
      'WEBGL_debug_renderer_info'
    ];

    extensionNames.forEach(name => {
      try {
        const extension = this.gl!.getExtension(name);
        if (extension) {
          this.extensions.set(name, extension);
          console.log(`✅ Loaded WebGL extension: ${name}`);
        }
      } catch (error) {
        console.warn(`Failed to load extension ${name}:`, error);
      }
    });
  }

  private validateCapabilities(): void {
    if (!this.gl) return;

    try {
      // Check maximum texture size
      const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
      if (maxTextureSize < this.config.maxTextureSize) {
        console.warn(`Limited texture size: ${maxTextureSize} < ${this.config.maxTextureSize}`);
        this.config.maxTextureSize = maxTextureSize;
      }

      // Check vertex attributes
      const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
      if (maxVertexAttribs < this.config.maxVertexAttribs) {
        console.warn(`Limited vertex attributes: ${maxVertexAttribs}`);
        this.config.maxVertexAttribs = maxVertexAttribs;
      }

      // Get renderer info for debugging
      const debugExtension = this.extensions.get('WEBGL_debug_renderer_info');
      if (debugExtension) {
        const renderer = this.gl.getParameter(debugExtension.UNMASKED_RENDERER_WEBGL);
        const vendor = this.gl.getParameter(debugExtension.UNMASKED_VENDOR_WEBGL);
        console.log(`GPU: ${vendor} ${renderer}`);
      }

    } catch (error) {
      console.error('Failed to validate WebGL capabilities:', error);
    }
  }

  private setupEventListeners(): void {
    if (!isBrowser()) {
      console.warn('Skipping event listeners setup during SSR');
      return;
    }

    // WebGL context lost event
    const contextLostListener = (event: Event) => {
      event.preventDefault();
      this.handleContextLoss();
    };

    // WebGL context restored event
    const contextRestoredListener = () => {
      this.handleContextRestore();
    };

    this.canvas.addEventListener('webglcontextlost', contextLostListener);
    this.canvas.addEventListener('webglcontextrestored', contextRestoredListener);

    this.eventListeners.set('webglcontextlost', contextLostListener);
    this.eventListeners.set('webglcontextrestored', contextRestoredListener);

    const navigator = safeNavigator();
    const window = safeWindow();
    const document = safeDocument();

    // Memory pressure event (if available)
    if (navigator && 'memory' in navigator && window) {
      window.addEventListener('memory', () => {
        this.handleMemoryPressure();
      });
    }

    // Page visibility change
    if (document && window) {
      const visibilityChangeListener = () => {
        if (document.hidden) {
          this.handlePageHidden();
        } else {
          this.handlePageVisible();
        }
      };

      document.addEventListener('visibilitychange', visibilityChangeListener);
      this.eventListeners.set('visibilitychange', visibilityChangeListener);
    }
  }

  private handleContextLoss(): void {
    console.warn('🔥 WebGL context lost detected');
    this.state.isContextLost = true;
    this.state.contextLossCount++;
    this.state.lastContextLoss = Date.now();
    this.gl = null;

    // Clear any ongoing operations
    this.clearOperations();

    // Notify applications
    const window = safeWindow();
    if (window) {
      window.dispatchEvent(new CustomEvent('webgl-context-lost', {
        detail: { manager: this, state: this.state }
      }));
    }
  }

  private async handleContextRestore(): Promise<void> {
    console.log('🔄 WebGL context restore detected');
    this.state.isRecovering = true;

    try {
      // Wait a bit to ensure context is stable
      await this.delay(100);

      // Reinitialize context
      if (this.initializeContext()) {
        this.state.lastRecovery = Date.now();
        this.state.isContextLost = false;

        // Execute recovery callbacks
        const recoveryPromises = Array.from(this.recoveryCallbacks).map(callback => 
          callback().catch(error => console.error('Recovery callback failed:', error))
        );

        await Promise.allSettled(recoveryPromises);

        console.log('✅ WebGL context restored successfully');
        
        // Notify applications
        const window = safeWindow();
        if (window) {
          window.dispatchEvent(new CustomEvent('webgl-context-restored', {
            detail: { manager: this, state: this.state }
          }));
        }
      } else {
        throw new Error('Failed to reinitialize WebGL context');
      }
    } catch (error) {
      console.error('Context restoration failed:', error);
    } finally {
      this.state.isRecovering = false;
    }
  }

  private handleMemoryPressure(): void {
    console.warn('🔥 GPU memory pressure detected');
    
    // Clear unused resources
    this.clearUnusedTextures();
    this.reduceTextureQuality();
    
    // Force garbage collection if available
    const window = safeWindow();
    if (window && 'gc' in window) {
      (window as any).gc();
    }

    // Notify applications to reduce memory usage
    if (window) {
      window.dispatchEvent(new CustomEvent('gpu-memory-pressure', {
        detail: { memoryUsage: this.state.memoryUsage, limit: this.config.memoryLimit }
      }));
    }
  }

  private handlePageHidden(): void {
    // Reduce GPU usage when page is not visible
    this.pauseOperations();
  }

  private handlePageVisible(): void {
    // Resume operations when page becomes visible
    this.resumeOperations();
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      this.updateMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  private updateMemoryUsage(): void {
    if (!this.gl) return;

    try {
      // Estimate GPU memory usage
      const memInfo = (this.gl as any).getExtension('WEBGL_debug_renderer_info');
      if (memInfo) {
        // This is an approximation - actual memory usage is hard to measure
        this.state.memoryUsage = this.estimateMemoryUsage();
        
        if (this.state.memoryUsage > this.config.memoryLimit * 0.9) {
          this.handleMemoryPressure();
        }
      }
    } catch (error) {
      console.warn('Memory monitoring failed:', error);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation based on texture count and canvas size
    const textureMemory = this.canvas.width * this.canvas.height * 4; // RGBA
    return Math.round(textureMemory / (1024 * 1024)); // Convert to MB
  }

  private clearOperations(): void {
    // Clear any pending WebGL operations
    if (this.gl) {
      try {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.flush();
      } catch (error) {
        console.warn('Failed to clear operations:', error);
      }
    }
  }

  private clearUnusedTextures(): void {
    // Implementation depends on specific application needs
    console.log('Clearing unused textures');
  }

  private reduceTextureQuality(): void {
    // Reduce texture resolution to save memory
    this.config.maxTextureSize = Math.max(512, this.config.maxTextureSize / 2);
    console.log(`Reduced max texture size to: ${this.config.maxTextureSize}`);
  }

  private pauseOperations(): void {
    console.log('Pausing GPU operations');
  }

  private resumeOperations(): void {
    console.log('Resuming GPU operations');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods

  getContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
    return this.gl;
  }

  getState(): WebGLState {
    return { ...this.state };
  }

  getConfig(): WebGLContextConfig {
    return { ...this.config };
  }

  isContextAvailable(): boolean {
    return this.gl !== null && !this.state.isContextLost;
  }

  addRecoveryCallback(callback: () => Promise<void>): void {
    this.recoveryCallbacks.add(callback);
  }

  removeRecoveryCallback(callback: () => Promise<void>): void {
    this.recoveryCallbacks.delete(callback);
  }

  // Manual context loss for testing
  forceContextLoss(): void {
    const loseContext = this.extensions.get('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
  }

  // Manual context restore for testing
  restoreContext(): void {
    const loseContext = this.extensions.get('WEBGL_lose_context');
    if (loseContext) {
      loseContext.restoreContext();
    }
  }

  dispose(): void {
    // Clear memory monitoring
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    const document = safeDocument();

    // Remove event listeners
    this.eventListeners.forEach((listener, event) => {
      if (event === 'visibilitychange' && document) {
        document.removeEventListener(event, listener);
      } else {
        this.canvas.removeEventListener(event, listener);
      }
    });

    // Clear callbacks
    this.recoveryCallbacks.clear();

    // Remove canvas if we created it
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.gl = null;
    console.log('WebGL context manager disposed');
  }
}

// Lazy singleton instance for browser-only access
let _webglManager: WebGLContextManager | null = null;

export function getWebGLManager(): WebGLContextManager | null {
  if (typeof window === 'undefined') {
    // Return null during SSR
    return null;
  }
  
  if (!_webglManager) {
    try {
      _webglManager = new WebGLContextManager();
    } catch (error) {
      console.error('Failed to create WebGL manager:', error);
      return null;
    }
  }
  
  return _webglManager;
}

// Utility functions
export function isWebGLSupported(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const canvas = safeCreateCanvas();
    if (!canvas) return false;
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

export function getWebGLCapabilities(): {
  webgl1: boolean;
  webgl2: boolean;
  maxTextureSize: number;
  maxVertexAttribs: number;
  extensions: string[];
} {
  const defaultResult = {
    webgl1: false,
    webgl2: false,
    maxTextureSize: 0,
    maxVertexAttribs: 0,
    extensions: [] as string[]
  };

  if (!isBrowser()) return defaultResult;

  try {
    const canvas = safeCreateCanvas();
    if (!canvas) return defaultResult;
    
    const gl1 = canvas.getContext('webgl');
    const gl2 = canvas.getContext('webgl2');
    
    const result = {
      webgl1: !!gl1,
      webgl2: !!gl2,
      maxTextureSize: 0,
      maxVertexAttribs: 0,
      extensions: [] as string[]
    };

    const gl = gl2 || gl1;
    if (gl) {
      result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      result.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      result.extensions = gl.getSupportedExtensions() || [];
    }

    return result;
  } catch {
    return defaultResult;
  }
} 