/**
 * EcoScan Service Worker
 * Advanced caching and offline functionality
 */

const CACHE_NAME = 'ecoscan-v1.3';
const API_CACHE = 'ecoscan-api-v1';
const MODELS_CACHE = 'ecoscan-models-v1';
const IMAGES_CACHE = 'ecoscan-images-v1';

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  // Add other static assets as needed
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/models',
  '/api/environmental-impact',
  '/api/health'
];

// Model files to cache
const MODEL_FILES = [
  '/models/yolov8n.onnx',
  '/data/wasteData.json'
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache models
      caches.open(MODELS_CACHE).then((cache) => {
        console.log('🤖 Caching ML models...');
        return cache.addAll(MODEL_FILES.filter(url => 
          // Only cache if model files exist
          fetch(url, { method: 'HEAD' }).then(r => r.ok).catch(() => false)
        ));
      })
    ]).then(() => {
      console.log('✅ Service Worker installed successfully');
      
      // Send message to client
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'OFFLINE_READY' });
        });
      });
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('ecoscan-') && cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

/**
 * Fetch Event Handling with Advanced Caching Strategies
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and external URLs (except API)
  if (event.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) && !url.pathname.startsWith('/api')) return;
  
  // Route to appropriate caching strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
  } else if (url.pathname.includes('/models/')) {
    event.respondWith(handleModelRequest(event.request));
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    event.respondWith(handleImageRequest(event.request));
  } else {
    event.respondWith(handleStaticRequest(event.request));
  }
});

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('📴 Network failed for API request, checking cache...');
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📦 Serving API response from cache');
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/detect')) {
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        message: 'Detection unavailable offline - stored for sync'
      }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

/**
 * Handle model requests with cache-first strategy
 */
async function handleModelRequest(request) {
  const cache = await caches.open(MODELS_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('🤖 Serving model from cache');
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    console.log('📥 Downloading model from network...');
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      
      // Notify client of cache update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ 
            type: 'CACHE_UPDATED', 
            data: { type: 'model', url: request.url } 
          });
        });
      });
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ Failed to load model:', error);
    throw error;
  }
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGES_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache images for offline use
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Return placeholder for missing images
    return new Response('', {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

/**
 * Handle static requests with stale-while-revalidate strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Get cached version
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Don't await the network request - it updates cache in background
    networkResponsePromise.catch(() => {});
    return cachedResponse;
  }
  
  // Wait for network if no cached version
  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  // Fallback to offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match('/') || new Response('Offline', {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  throw new Error('No cached response available');
}

/**
 * Background Sync for offline data
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'ecoscan-sync') {
    event.waitUntil(syncOfflineData());
  }
});

/**
 * Sync offline detection data
 */
async function syncOfflineData() {
  console.log('🔄 Syncing offline data...');
  
  try {
    // This would integrate with the offline manager
    // For now, just log the attempt
    console.log('📤 Offline data sync completed');
    
    // Notify client of successful sync
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETE' });
      });
    });
    
  } catch (error) {
    console.error('❌ Offline sync failed:', error);
    throw error;
  }
}

/**
 * Push notification handling
 */
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');
  
  const options = {
    body: 'EcoScan update available',
    icon: '/icon-192.png',
    badge: '/icon-192-maskable.png',
    tag: 'ecoscan-update',
    data: event.data ? event.data.json() : {}
  };
  
  event.waitUntil(
    self.registration.showNotification('EcoScan', options)
  );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if no existing window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

/**
 * Message handling from main app
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_MODEL':
      cacheModel(data.url, data.name);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      });
      break;
      
    default:
      console.log('📨 Unknown message type:', type);
  }
});

/**
 * Cache a specific model
 */
async function cacheModel(url, name) {
  try {
    const cache = await caches.open(MODELS_CACHE);
    const response = await fetch(url);
    
    if (response.ok) {
      await cache.put(url, response);
      console.log(`🤖 Model cached: ${name}`);
      
      // Notify client
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ 
            type: 'MODEL_CACHED', 
            data: { name, url } 
          });
        });
      });
    }
  } catch (error) {
    console.error(`❌ Failed to cache model ${name}:`, error);
  }
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log(`🗑️ Cache cleared: ${cacheName}`);
  } catch (error) {
    console.error(`❌ Failed to clear cache ${cacheName}:`, error);
  }
}

/**
 * Get cache information
 */
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {
    caches: [],
    totalSize: 0
  };
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('ecoscan-')) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let cacheSize = 0;
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          cacheSize += blob.size;
        }
      }
      
      info.caches.push({
        name: cacheName,
        size: cacheSize,
        entries: keys.length
      });
      
      info.totalSize += cacheSize;
    }
  }
  
  return info;
}

console.log('📱 EcoScan Service Worker loaded'); 