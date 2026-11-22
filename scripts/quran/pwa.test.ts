import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { offlineWorkerSource, pwaCacheFiles } from './pwa.ts';

describe('Quran offline release shell', () => {
  it('precaches only the Quran reader, verified data and generated app assets', () => {
    const files = [
      'assets/index-abc.js',
      'index.html',
      'quran/index.html',
      'data/quran/text.json',
      'data/quran/relationships.json',
      'data/quran/manifest.json',
      'manifest.webmanifest',
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
      'social-preview.png',
      'data/translations/kjv.json',
      'threads/index.html',
      'notes.txt',
    ];
    expect(pwaCacheFiles(files)).toEqual([
      'assets/index-abc.js',
      'data/quran/manifest.json',
      'data/quran/relationships.json',
      'data/quran/text.json',
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
      'index.html',
      'manifest.webmanifest',
      'quran/index.html',
      'social-preview.png',
    ]);
  });

  it('provides a scoped, atomic cache with separate navigation and resource handling', () => {
    const source = offlineWorkerSource(['index.html', 'data/quran/text.json'], 'revision-1');
    expect(source).toContain('quran-cross-references-shell-revision-1');
    expect(source).toContain('cache.addAll');
    expect(source).toContain('ignoreVary: true');
    expect(source).toContain("request.mode === 'navigate'");
    expect(source).toContain("alias ? 'quran/index.html' : 'index.html'");
    expect(source).toContain('url.origin !== root.origin');
    expect(source).toContain('self.clients.claim()');
    expect(source).not.toContain('bible-cross-references');
  });

  it('changes the cache key for a new release', () => {
    expect(offlineWorkerSource([], 'first')).not.toBe(offlineWorkerSource([], 'second'));
  });

  it('serves actual canonical and compatibility routes and Quran data without network', async () => {
    const scope = 'https://example.test/quran-cross-references/';
    const stored = new Map<string, { readonly path: string }>();
    const network = vi.fn(() => Promise.reject(new Error('Network unavailable')));
    const handlers = new Map<
      string,
      (event: {
        request?: { readonly method: string; readonly mode: string; readonly url: string };
        waitUntil?: (promise: Promise<unknown>) => void;
        respondWith?: (promise: Promise<unknown>) => void;
      }) => void
    >();
    const cache = {
      addAll(requests: readonly Request[]) {
        for (const request of requests) {
          stored.set(request.url, { path: new URL(request.url).pathname });
        }
        return Promise.resolve();
      },
      match(
        request: { readonly url: string } | URL,
        options?: { readonly ignoreSearch?: boolean; readonly ignoreVary?: boolean },
      ) {
        if (!options?.ignoreVary) return Promise.resolve(undefined);
        const url = new URL(request instanceof URL ? request.href : request.url);
        if (options?.ignoreSearch) url.search = '';
        return Promise.resolve(stored.get(url.href));
      },
    };
    const self = {
      registration: { scope },
      addEventListener(
        name: string,
        handler: (event: {
          request?: { readonly method: string; readonly mode: string; readonly url: string };
          waitUntil?: (promise: Promise<unknown>) => void;
          respondWith?: (promise: Promise<unknown>) => void;
        }) => void,
      ) {
        handlers.set(name, handler);
      },
      skipWaiting: () => Promise.resolve(undefined),
      clients: { claim: () => Promise.resolve(undefined) },
    };
    const caches = {
      open: () => Promise.resolve(cache),
      keys: () => Promise.resolve(['quran-cross-references-shell-revision-1']),
      delete: () => Promise.resolve(true),
    };
    runInNewContext(
      offlineWorkerSource(
        [
          'index.html',
          'quran/index.html',
          'assets/index-abc.js',
          'data/quran/text.json',
          'data/quran/relationships.json',
        ],
        'revision-1',
      ),
      { self, caches, Request, URL, fetch: network },
    );

    const install = handlers.get('install');
    expect(install).toBeDefined();
    let installation: Promise<unknown> = Promise.resolve();
    install?.({
      waitUntil(promise) {
        installation = promise;
      },
    });
    await installation;

    expect(stored.has(scope)).toBe(true);
    expect(stored.has(scope + 'quran/')).toBe(true);

    const onFetch = handlers.get('fetch');
    expect(onFetch).toBeDefined();
    function offlineFetch(path: string, mode: string) {
      let response: Promise<unknown> | undefined;
      onFetch?.({
        request: { method: 'GET', url: new URL(path, scope).href, mode },
        respondWith(promise) {
          response = promise;
        },
      });
      expect(response).toBeDefined();
      return response;
    }

    expect(await offlineFetch('?ref=2%3A255', 'navigate')).toEqual({
      path: '/quran-cross-references/',
    });
    expect(await offlineFetch('quran/?ref=114%3A6', 'navigate')).toEqual({
      path: '/quran-cross-references/quran/',
    });
    expect(await offlineFetch('data/quran/text.json', 'cors')).toEqual({
      path: '/quran-cross-references/data/quran/text.json',
    });
    expect(await offlineFetch('assets/index-abc.js', 'cors')).toEqual({
      path: '/quran-cross-references/assets/index-abc.js',
    });
    expect(network).not.toHaveBeenCalled();
  });
});
