/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `ecoscan-cache-${version}`;
const STATIC_CACHE = `ecoscan-static-${version}`;
const ML_CACHE = `ecoscan-ml-${version}`;

// Static assets to cache
const STATIC_ASSETS = [
  ...build,
  ...files,
  '/data/wasteData.json'
];

// ML models and large assets
const ML_ASSETS = [
  '/models/yolov8n.onnx'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache ML models separately (larger files)
      caches.open(ML_CACHE).then((cache) => {
        console.log('🤖 Caching ML models');
        return cache.addAll(ML_ASSETS);
      })
    ]).then(() => {
      console.log('✅ Service Worker installed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => 
            cacheName.startsWith('ecoscan-') && 
            cacheName !== STATIC_CACHE && 
            cacheName !== ML_CACHE &&
            cacheName !== CACHE_NAME
          )
          .map((cacheName) => {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        console.log(`📋 Serving from cache: ${url.pathname}`);
        return cached;
      }

      console.log(`🌐 Fetching from network: ${url.pathname}`);
      
      return fetch(request).then((response) => {
        // Don't cache error responses
        if (!response.ok) {
          return response;
        }

        // Clone response for caching
        const responseClone = response.clone();

        // Determine cache strategy based on file type
        let targetCache = CACHE_NAME;
        
        if (url.pathname.endsWith('.onnx')) {
          targetCache = ML_CACHE;
        } else if (
          STATIC_ASSETS.some(asset => url.pathname === asset) ||
          url.pathname.includes('/data/')
        ) {
          targetCache = STATIC_CACHE;
        }

        // Cache the response
        caches.open(targetCache).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch((error) => {
        console.error(`❌ Network error for ${url.pathname}:`, error);
        
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/').then(offline => 
            offline || new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          );
        }
        
        throw error;
      });
    })
  );
});

// Background sync for analytics/metrics
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'background-metrics') {
    event.waitUntil(syncMetrics());
  }
});

async function syncMetrics() {
  // Send cached performance metrics when online
  try {
    const cache = await caches.open('metrics-cache');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        await fetch('/api/metrics', {
          method: 'POST',
          body: await response.text()
        });
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('Metrics sync failed:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        data: data.url
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data)
    );
  }
}); 