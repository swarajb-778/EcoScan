/**
 * Progressive Model Loader for EcoScan
 * Handles chunked model loading with recovery, integrity checks, and bandwidth adaptation
 */

export interface ModelChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  data?: ArrayBuffer;
  checksum?: string;
  retryCount: number;
  isLoaded: boolean;
}

export interface LoadingProgress {
  totalSize: number;
  loadedSize: number;
  percentage: number;
  chunksTotal: number;
  chunksLoaded: number;
  chunksFailed: number;
  currentSpeed: number; // bytes/second
  estimatedTimeRemaining: number; // seconds
  bandwidth: number; // bytes/second
}

export interface LoadingStrategy {
  chunkSize: number;
  maxConcurrentChunks: number;
  maxRetries: number;
  retryDelay: number;
  adaptiveBandwidth: boolean;
  integrityChecks: boolean;
  priorityLoading: boolean;
}

export class ProgressiveModelLoader {
  private chunks: ModelChunk[] = [];
  private progress: LoadingProgress;
  private strategy: LoadingStrategy;
  private loadingPromises: Map<number, Promise<ArrayBuffer>> = new Map();
  private abortController?: AbortController;
  private loadStartTime = 0;
  private speedHistory: number[] = [];
  private retryQueues: Set<number> = new Set();
  
  private readonly SPEED_HISTORY_LENGTH = 10;
  private readonly MIN_CHUNK_SIZE = 64 * 1024; // 64KB
  private readonly MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly INTEGRITY_CHECK_INTERVAL = 5; // Check every 5 chunks

  constructor(strategy?: Partial<LoadingStrategy>) {
    this.strategy = {
      chunkSize: 256 * 1024, // 256KB default
      maxConcurrentChunks: 4,
      maxRetries: 3,
      retryDelay: 1000,
      adaptiveBandwidth: true,
      integrityChecks: true,
      priorityLoading: true,
      ...strategy
    };
    
    this.progress = {
      totalSize: 0,
      loadedSize: 0,
      percentage: 0,
      chunksTotal: 0,
      chunksLoaded: 0,
      chunksFailed: 0,
      currentSpeed: 0,
      estimatedTimeRemaining: 0,
      bandwidth: 0
    };
  }

  async loadModel(modelUrl: string, progressCallback?: (progress: LoadingProgress) => void): Promise<ArrayBuffer> {
    console.log(`📥 Starting progressive model loading: ${modelUrl}`);
    this.loadStartTime = performance.now();
    
    try {
      // Initialize loading
      await this.initializeLoading(modelUrl);
      
      // Start loading chunks with adaptive strategy
      const modelData = await this.loadChunksProgressively(progressCallback);
      
      // Verify final integrity
      if (this.strategy.integrityChecks) {
        await this.verifyModelIntegrity(modelData);
      }
      
      console.log(`✅ Model loaded successfully: ${(modelData.byteLength / 1024 / 1024).toFixed(2)}MB`);
      return modelData;
      
    } catch (error) {
      console.error('❌ Progressive model loading failed:', error);
      this.cleanup();
      throw error;
    }
  }

  private async initializeLoading(modelUrl: string): Promise<void> {
    try {
      // Get model metadata
      const headResponse = await fetch(modelUrl, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw new Error(`Model not accessible: ${headResponse.status}`);
      }
      
      const contentLength = headResponse.headers.get('content-length');
      if (!contentLength) {
        throw new Error('Content-Length header missing - progressive loading not supported');
      }
      
      this.progress.totalSize = parseInt(contentLength, 10);
      
      // Check if server supports range requests
      const acceptRanges = headResponse.headers.get('accept-ranges');
      if (acceptRanges !== 'bytes') {
        console.warn('Server does not support range requests, falling back to single download');
        throw new Error('Range requests not supported - fallback to single download');
      }
      
      // Calculate optimal chunk configuration
      this.optimizeChunkConfiguration();
      
      // Create chunk map
      this.createChunkMap();
      
      console.log(`📊 Model loading initialized: ${this.progress.chunksTotal} chunks, ${(this.progress.totalSize / 1024 / 1024).toFixed(2)}MB`);
      
    } catch (error) {
      throw new Error(`Failed to initialize progressive loading: ${error}`);
    }
  }

  private async fallbackToSingleDownload(modelUrl: string): Promise<ArrayBuffer> {
    console.log('📥 Falling back to single model download');
    
    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`Model download failed: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }
    
    const chunks: Uint8Array[] = [];
    let loadedSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loadedSize += value.length;
        
        // Update progress
        this.progress.loadedSize = loadedSize;
        this.progress.percentage = (loadedSize / this.progress.totalSize) * 100;
        this.updateLoadingSpeed(loadedSize);
      }
    } finally {
      reader.releaseLock();
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }

  private optimizeChunkConfiguration(): void {
    // Adapt chunk size based on total model size and network conditions
    if (this.strategy.adaptiveBandwidth) {
      if (this.progress.totalSize < 5 * 1024 * 1024) { // < 5MB
        this.strategy.chunkSize = Math.max(this.MIN_CHUNK_SIZE, 128 * 1024);
      } else if (this.progress.totalSize > 50 * 1024 * 1024) { // > 50MB
        this.strategy.chunkSize = Math.min(this.MAX_CHUNK_SIZE, 1024 * 1024);
      }
    }
    
    // Adjust concurrent chunks based on model size
    if (this.progress.totalSize > 20 * 1024 * 1024) {
      this.strategy.maxConcurrentChunks = Math.min(8, this.strategy.maxConcurrentChunks);
    }
  }

  private createChunkMap(): void {
    const chunkCount = Math.ceil(this.progress.totalSize / this.strategy.chunkSize);
    this.chunks = [];
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * this.strategy.chunkSize;
      const end = Math.min(start + this.strategy.chunkSize - 1, this.progress.totalSize - 1);
      const size = end - start + 1;
      
      this.chunks.push({
        index: i,
        start,
        end,
        size,
        retryCount: 0,
        isLoaded: false
      });
    }
    
    this.progress.chunksTotal = chunkCount;
  }

  private async loadChunksProgressively(progressCallback?: (progress: LoadingProgress) => void): Promise<ArrayBuffer> {
    this.abortController = new AbortController();
    
    // Priority loading: start with first and last chunks
    const priorityChunks = this.strategy.priorityLoading ? 
      [0, this.chunks.length - 1, Math.floor(this.chunks.length / 2)] : 
      [];
    
    // Load priority chunks first
    if (priorityChunks.length > 0) {
      await this.loadChunksBatch(priorityChunks, progressCallback);
    }
    
    // Load remaining chunks with concurrency control
    const remainingChunks = this.chunks
      .map((_, index) => index)
      .filter(index => !this.chunks[index].isLoaded);
    
    await this.loadChunksBatch(remainingChunks, progressCallback);
    
    // Handle any failed chunks
    await this.retryFailedChunks(progressCallback);
    
    // Assemble final model
    return this.assembleModel();
  }

  private async loadChunksBatch(chunkIndices: number[], progressCallback?: (progress: LoadingProgress) => void): Promise<void> {
    const concurrentBatches = [];
    
    for (let i = 0; i < chunkIndices.length; i += this.strategy.maxConcurrentChunks) {
      const batch = chunkIndices.slice(i, i + this.strategy.maxConcurrentChunks);
      const batchPromises = batch.map(index => this.loadChunk(index));
      
      concurrentBatches.push(Promise.allSettled(batchPromises));
    }
    
    for (const batchPromise of concurrentBatches) {
      await batchPromise;
      this.updateProgress();
      progressCallback?.(this.progress);
      
      // Adaptive bandwidth adjustment
      if (this.strategy.adaptiveBandwidth) {
        this.adaptBandwidthStrategy();
      }
    }
  }

  private async loadChunk(chunkIndex: number): Promise<void> {
    const chunk = this.chunks[chunkIndex];
    if (chunk.isLoaded) return;
    
    const loadPromise = this.performChunkDownload(chunk);
    this.loadingPromises.set(chunkIndex, loadPromise);
    
    try {
      chunk.data = await loadPromise;
      chunk.isLoaded = true;
      
      // Integrity check for critical chunks
      if (this.strategy.integrityChecks && chunkIndex % this.INTEGRITY_CHECK_INTERVAL === 0) {
        await this.verifyChunkIntegrity(chunk);
      }
      
    } catch (error) {
      console.warn(`Chunk ${chunkIndex} failed:`, error);
      chunk.retryCount++;
      this.progress.chunksFailed++;
      
      if (chunk.retryCount < this.strategy.maxRetries) {
        this.retryQueues.add(chunkIndex);
      } else {
        throw new Error(`Chunk ${chunkIndex} failed after ${this.strategy.maxRetries} retries`);
      }
    } finally {
      this.loadingPromises.delete(chunkIndex);
    }
  }

  private async performChunkDownload(chunk: ModelChunk): Promise<ArrayBuffer> {
    const modelUrl = this.getModelUrl(); // Would need to store this
    const startTime = performance.now();
    
    const response = await fetch(modelUrl, {
      method: 'GET',
      headers: {
        'Range': `bytes=${chunk.start}-${chunk.end}`
      },
      signal: this.abortController?.signal
    });
    
    if (!response.ok) {
      throw new Error(`Chunk download failed: ${response.status}`);
    }
    
    const data = await response.arrayBuffer();
    const downloadTime = performance.now() - startTime;
    
    // Track download speed
    const speed = (data.byteLength / downloadTime) * 1000; // bytes/second
    this.updateSpeedHistory(speed);
    
    return data;
  }

  private async verifyChunkIntegrity(chunk: ModelChunk): Promise<void> {
    if (!chunk.data) return;
    
    // Simple size verification
    if (chunk.data.byteLength !== chunk.size) {
      throw new Error(`Chunk ${chunk.index} size mismatch: expected ${chunk.size}, got ${chunk.data.byteLength}`);
    }
    
    // Optional: Add checksum verification if available
    if (chunk.checksum) {
      const actualChecksum = await this.calculateChecksum(chunk.data);
      if (actualChecksum !== chunk.checksum) {
        throw new Error(`Chunk ${chunk.index} checksum mismatch`);
      }
    }
  }

  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async retryFailedChunks(progressCallback?: (progress: LoadingProgress) => void): Promise<void> {
    if (this.retryQueues.size === 0) return;
    
    console.log(`🔄 Retrying ${this.retryQueues.size} failed chunks`);
    
    for (const chunkIndex of this.retryQueues) {
      await new Promise(resolve => setTimeout(resolve, this.strategy.retryDelay));
      await this.loadChunk(chunkIndex);
      this.updateProgress();
      progressCallback?.(this.progress);
    }
    
    this.retryQueues.clear();
  }

  private assembleModel(): ArrayBuffer {
    // Verify all chunks are loaded
    const missingChunks = this.chunks.filter(chunk => !chunk.isLoaded);
    if (missingChunks.length > 0) {
      throw new Error(`Missing chunks: ${missingChunks.map(c => c.index).join(', ')}`);
    }
    
    // Calculate total size
    const totalSize = this.chunks.reduce((acc, chunk) => acc + chunk.size, 0);
    const result = new Uint8Array(totalSize);
    
    // Assemble chunks in order
    let offset = 0;
    for (const chunk of this.chunks) {
      if (chunk.data) {
        result.set(new Uint8Array(chunk.data), offset);
        offset += chunk.size;
      }
    }
    
    return result.buffer;
  }

  private updateProgress(): void {
    this.progress.chunksLoaded = this.chunks.filter(chunk => chunk.isLoaded).length;
    this.progress.loadedSize = this.chunks
      .filter(chunk => chunk.isLoaded)
      .reduce((acc, chunk) => acc + chunk.size, 0);
    
    this.progress.percentage = (this.progress.loadedSize / this.progress.totalSize) * 100;
    
    this.updateLoadingSpeed(this.progress.loadedSize);
    this.updateTimeEstimate();
  }

  private updateLoadingSpeed(loadedSize: number): void {
    const elapsedTime = (performance.now() - this.loadStartTime) / 1000;
    this.progress.currentSpeed = elapsedTime > 0 ? loadedSize / elapsedTime : 0;
    this.progress.bandwidth = this.calculateAverageBandwidth();
  }

  private updateSpeedHistory(speed: number): void {
    this.speedHistory.push(speed);
    if (this.speedHistory.length > this.SPEED_HISTORY_LENGTH) {
      this.speedHistory.shift();
    }
  }

  private calculateAverageBandwidth(): number {
    if (this.speedHistory.length === 0) return 0;
    return this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
  }

  private updateTimeEstimate(): void {
    const remainingSize = this.progress.totalSize - this.progress.loadedSize;
    if (this.progress.currentSpeed > 0) {
      this.progress.estimatedTimeRemaining = remainingSize / this.progress.currentSpeed;
    } else {
      this.progress.estimatedTimeRemaining = 0;
    }
  }

  private adaptBandwidthStrategy(): void {
    const avgBandwidth = this.calculateAverageBandwidth();
    
    // Adjust chunk size based on bandwidth
    if (avgBandwidth < 100 * 1024) { // < 100KB/s - slow connection
      this.strategy.chunkSize = Math.max(this.MIN_CHUNK_SIZE, 64 * 1024);
      this.strategy.maxConcurrentChunks = 2;
    } else if (avgBandwidth > 1024 * 1024) { // > 1MB/s - fast connection
      this.strategy.chunkSize = Math.min(this.MAX_CHUNK_SIZE, 512 * 1024);
      this.strategy.maxConcurrentChunks = 6;
    }
  }

  private async verifyModelIntegrity(modelData: ArrayBuffer): Promise<void> {
    // Verify ONNX model format
    const view = new Uint8Array(modelData);
    
    // Check ONNX magic bytes
    if (view.length < 8) {
      throw new Error('Model file too small');
    }
    
    // Basic ONNX format validation
    const magic = view.slice(0, 4);
    if (magic[0] !== 0x08 && !String.fromCharCode(...magic).includes('ONNX')) {
      throw new Error('Invalid ONNX model format');
    }
    
    console.log('✅ Model integrity verified');
  }

  private getModelUrl(): string {
    // This would be stored during initialization
    return ''; // Placeholder
  }

  private cleanup(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.loadingPromises.clear();
    this.retryQueues.clear();
    this.chunks = [];
    this.speedHistory = [];
  }

  // Public API
  getProgress(): LoadingProgress {
    return { ...this.progress };
  }

  getStrategy(): LoadingStrategy {
    return { ...this.strategy };
  }

  abort(): void {
    console.log('🛑 Aborting model loading');
    this.cleanup();
  }

  updateStrategy(newStrategy: Partial<LoadingStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy };
  }
} 