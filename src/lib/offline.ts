import { get, set, del } from 'idb-keyval';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline-requests-queue';

export async function queueRequest(url: string, method: string, body: any, headers: Record<string, string> = {}) {
  const queue: QueuedRequest[] = (await get(QUEUE_KEY)) || [];
  const token = localStorage.getItem('auth_token');
  const newRequest: QueuedRequest = {
    id: crypto.randomUUID(),
    url,
    method,
    headers: {
      ...headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body,
    timestamp: Date.now(),
  };
  queue.push(newRequest);
  await set(QUEUE_KEY, queue);
  
  // Register for background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      // @ts-ignore
      await registration.sync.register('sync-requests');
      console.log('Background sync registered');
    } catch (err) {
      console.warn('Background sync registration failed, will retry manually', err);
    }
  }
}

export async function processQueue() {
  const queue: QueuedRequest[] = (await get(QUEUE_KEY)) || [];
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} queued requests...`);
  const remaining: QueuedRequest[] = [];

  for (const req of queue) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: {
          ...req.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      console.log(`Successfully processed queued request: ${req.url}`);
    } catch (err) {
      console.error(`Failed to process queued request: ${req.url}`, err);
      remaining.push(req);
    }
  }

  if (remaining.length > 0) {
    await set(QUEUE_KEY, remaining);
  } else {
    await del(QUEUE_KEY);
  }
}

// Listen for online event to trigger processing
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processQueue();
  });
}
