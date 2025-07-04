/**
 * Build utilities for production optimization
 * Handles asset loading, chunking, and performance optimization
 */

import { config } from '$lib/config';

/**
 * Lazy load modules with error handling
 */
export async function lazyLoad<T>(
  importFn: () => Promise<T>,
  fallback?: T,
  retries = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  if (fallback !== undefined) {
    console.warn('Failed to load module, using fallback:', lastError);
    return fallback;
  }

  throw lastError!;
}

/**
 * Preload critical resources
 */
export async function preloadCriticalResources(): Promise<void> {
  const resources = [
    // Model file
    config.model.modelPath,
    // Waste data
    config.model.wasteDataPath,
    // Critical fonts (if any)
  ].filter(Boolean);

  const preloadPromises = resources.map(url => {
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      // Determine appropriate 'as' attribute
      if (url.endsWith('.onnx')) {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      } else if (url.endsWith('.json')) {
        link.as = 'fetch';
      } else if (url.includes('font')) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload ${url}`));
      
      document.head.appendChild(link);
    });
  });

  try {
    await Promise.allSettled(preloadPromises);
  } catch (error) {
    console.warn('Some resources failed to preload:', error);
  }
}

/**
 * Check if resource is cached
 */
export async function isResourceCached(url: string): Promise<boolean> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(url);
      if (response) return true;
    }
  }
  
  return false;
}

/**
 * Get resource loading priority
 */
export function getResourcePriority(url: string): 'high' | 'low' | 'auto' {
  if (url.includes('model') || url.endsWith('.onnx')) {
    return 'high';
  }
  
  if (url.includes('data') || url.endsWith('.json')) {
    return 'high';
  }
  
  if (url.includes('image') || url.includes('icon')) {
    return 'low';
  }
  
  return 'auto';
}

/**
 * Optimize image loading
 */
export function createOptimizedImageLoader() {
  const imageCache = new Map<string, HTMLImageElement>();
  
  return {
    load: async (src: string, crossOrigin?: string): Promise<HTMLImageElement> => {
      // Check cache first
      if (imageCache.has(src)) {
        return imageCache.get(src)!;
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        
        if (crossOrigin) {
          img.crossOrigin = crossOrigin;
        }
        
        img.onload = () => {
          imageCache.set(src, img);
          resolve(img);
        };
        
        img.onerror = () => {
          reject(new Error(`Failed to load image: ${src}`));
        };
        
        img.src = src;
      });
    },
    
    preload: (src: string, crossOrigin?: string): void => {
      // Start loading without waiting
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.src = src;
      imageCache.set(src, img);
    },
    
    clear: (): void => {
      imageCache.clear();
    }
  };
}

/**
 * Bundle size analyzer for development
 */
export function analyzeBundleSize(): void {
  if (!config.dev.isDevelopment) return;

  const scripts = Array.from(document.scripts);
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  console.group('📦 Bundle Analysis');
  
  scripts.forEach(script => {
    if (script.src) {
      fetch(script.src, { method: 'HEAD' })
        .then(response => {
          const size = response.headers.get('content-length');
          if (size) {
            const kb = Math.round(parseInt(size) / 1024);
            console.log(`JS: ${script.src.split('/').pop()} - ${kb}KB`);
          }
        })
        .catch(() => {});
    }
  });
  
  styles.forEach(link => {
    if (link.href) {
      fetch(link.href, { method: 'HEAD' })
        .then(response => {
          const size = response.headers.get('content-length');
          if (size) {
            const kb = Math.round(parseInt(size) / 1024);
            console.log(`CSS: ${link.href.split('/').pop()} - ${kb}KB`);
          }
        })
        .catch(() => {});
    }
  });
  
  console.groupEnd();
}

/**
 * Memory usage monitor
 */
export function createMemoryMonitor(warningThreshold = config.performance.memoryWarningThreshold) {
  let lastWarning = 0;
  
  return {
    check: (): number | null => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        // Warn if memory usage is high and we haven't warned recently
        if (usedMB > warningThreshold && Date.now() - lastWarning > 30000) {
          console.warn(`⚠️ High memory usage: ${usedMB.toFixed(1)}MB`);
          lastWarning = Date.now();
        }
        
        return usedMB;
      }
      
      return null;
    },
    
    cleanup: (): void => {
      // Force garbage collection if available (dev tools)
      if ('gc' in window) {
        (window as any).gc();
      }
    }
  };
}

/**
 * Performance budget checker
 */
export function checkPerformanceBudget(): void {
  if (!config.dev.isDevelopment) return;
  
  const budget = {
    javascript: 200, // KB
    css: 50, // KB
    images: 500, // KB
    fonts: 100, // KB
  };
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const sizes = { javascript: 0, css: 0, images: 0, fonts: 0 };
    
    entries.forEach(entry => {
      if (entry.name.includes('.js')) {
        sizes.javascript += (entry as any).transferSize || 0;
      } else if (entry.name.includes('.css')) {
        sizes.css += (entry as any).transferSize || 0;
      } else if (entry.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
        sizes.images += (entry as any).transferSize || 0;
      } else if (entry.name.match(/\.(woff|woff2|ttf|otf)$/)) {
        sizes.fonts += (entry as any).transferSize || 0;
      }
    });
    
    // Check against budget
    Object.entries(sizes).forEach(([type, size]) => {
      const sizeKB = Math.round(size / 1024);
      const budgetKB = budget[type as keyof typeof budget];
      
      if (sizeKB > budgetKB) {
        console.warn(`📊 Performance budget exceeded for ${type}: ${sizeKB}KB (budget: ${budgetKB}KB)`);
      }
    });
  });
  
  observer.observe({ entryTypes: ['resource'] });
}

/**
 * Critical resource hints
 */
export function addResourceHints(): void {
  const hints = [
    // DNS prefetch for external resources
    { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
    
    // Preconnect for critical origins
    { rel: 'preconnect', href: '//fonts.googleapis.com', crossorigin: true },
  ];
  
  hints.forEach(hint => {
    const link = document.createElement('link');
    Object.assign(link, hint);
    document.head.appendChild(link);
  });
} 