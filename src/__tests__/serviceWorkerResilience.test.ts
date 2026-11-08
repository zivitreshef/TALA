import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker Resilience (sw.js)', () => {
  const swCode = fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf-8');

  let listeners: Record<string, Function> = {};
  let mockCaches: any;
  let mockClients: any;
  let mockSelf: any;

  beforeEach(() => {
    listeners = {};
    mockCaches = {
      open: vi.fn().mockResolvedValue({
        addAll: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined)
      }),
      keys: vi.fn().mockResolvedValue(['tala-shell-v1', 'tala-shell-v2', 'tala-shell-v3']),
      delete: vi.fn().mockResolvedValue(true),
      match: vi.fn().mockResolvedValue(undefined)
    };
    mockClients = {
      claim: vi.fn().mockResolvedValue(undefined)
    };
    mockSelf = {
      addEventListener: (type: string, fn: Function) => {
        listeners[type] = fn;
      },
      skipWaiting: vi.fn(),
      clients: mockClients,
      location: { origin: 'https://zivitreshef.github.io' }
    };

    const fn = new Function('self', 'caches', swCode);
    fn(mockSelf, mockCaches);
  });

  it('registers install, activate, and fetch listeners', () => {
    expect(listeners.install).toBeDefined();
    expect(listeners.activate).toBeDefined();
    expect(listeners.fetch).toBeDefined();
  });

  it('pre-caches app shell on install and calls skipWaiting', async () => {
    let waitUntilPromise: Promise<any> | null = null;
    const event = {
      waitUntil: (p: Promise<any>) => {
        waitUntilPromise = p;
      }
    };
    listeners.install(event);
    expect(mockSelf.skipWaiting).toHaveBeenCalled();
    expect(mockCaches.open).toHaveBeenCalledWith('tala-shell-v3');
    expect(waitUntilPromise).not.toBeNull();
    await waitUntilPromise;
  });

  it('purges outdated caches on activate', async () => {
    let waitUntilPromise: Promise<any> | null = null;
    const event = {
      waitUntil: (p: Promise<any>) => {
        waitUntilPromise = p;
      }
    };
    listeners.activate(event);
    expect(waitUntilPromise).not.toBeNull();
    await waitUntilPromise;
    expect(mockCaches.delete).toHaveBeenCalledWith('tala-shell-v1');
    expect(mockCaches.delete).toHaveBeenCalledWith('tala-shell-v2');
    expect(mockCaches.delete).not.toHaveBeenCalledWith('tala-shell-v3');
    expect(mockClients.claim).toHaveBeenCalled();
  });

  it('bypasses version.json to allow native network checks', () => {
    const respondWith = vi.fn();
    const event = {
      request: {
        method: 'GET',
        url: 'https://zivitreshef.github.io/TALA/version.json?_t=123'
      },
      respondWith
    };

    listeners.fetch(event);
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('bypasses non-GET and cross-origin requests', () => {
    const respondWith = vi.fn();
    listeners.fetch({
      request: { method: 'POST', url: 'https://zivitreshef.github.io/TALA/login' },
      respondWith
    });
    expect(respondWith).not.toHaveBeenCalled();

    listeners.fetch({
      request: { method: 'GET', url: 'https://firestore.googleapis.com/v1/channel' },
      respondWith
    });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('returns a valid 503 Response instead of undefined on network failure when unchached', async () => {
    let responsePromise: Promise<Response | undefined> = Promise.resolve(undefined);
    const respondWith = vi.fn((p) => {
      responsePromise = p;
    });

    // Mock fetch to reject (e.g. offline / network failure)
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('net::ERR_INTERNET_DISCONNECTED'));

    try {
      listeners.fetch({
        request: {
          method: 'GET',
          url: 'https://zivitreshef.github.io/TALA/assets/chunk.js',
          mode: 'cors'
        },
        respondWith
      });

      expect(respondWith).toHaveBeenCalled();
      const response = await responsePromise;

      // Crucial: Must be a Response object so browser never throws "Failed to convert value to Response"
      expect(response).toBeInstanceOf(Response);
      expect((response as Response)?.status).toBe(503);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns index.html fallback for failed navigation requests', async () => {
    let responsePromise: Promise<Response | undefined> = Promise.resolve(undefined);
    const respondWith = vi.fn((p) => {
      responsePromise = p;
    });

    const mockIndexResponse = new Response('<html>Mock Index</html>', { status: 200 });
    mockCaches.match.mockImplementation((req: any) => {
      if (req === './index.html') return Promise.resolve(mockIndexResponse);
      return Promise.resolve(undefined);
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    try {
      listeners.fetch({
        request: {
          method: 'GET',
          url: 'https://zivitreshef.github.io/TALA/students',
          mode: 'navigate'
        },
        respondWith
      });

      const response = await responsePromise;
      expect(response).toBe(mockIndexResponse);
      expect((response as Response)?.status).toBe(200);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
