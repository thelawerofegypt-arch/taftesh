/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20 }),
    ],
  })
);

// API requests - NetworkFirst
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// Background Sync
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncRequests());
  }
});

async function syncRequests() {
  // We'll import the logic or just use a simple fetch here
  // Since we can't easily import from src/lib/offline.ts directly into SW without bundling
  // We'll use a simpler approach or ensure the SW is bundled correctly.
  console.log('Background sync triggered in SW');
  // The actual processing is handled in the main thread when 'online' event fires,
  // but we can also trigger it here if we want true background sync.
}
