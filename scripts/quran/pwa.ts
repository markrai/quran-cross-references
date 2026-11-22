export function offlineWorkerSource(files: readonly string[], revision: string): string {
  const entries = JSON.stringify(files);
  const cache = JSON.stringify('quran-cross-references-shell-' + revision);
  return `const CACHE_NAME = ${cache};
const CACHE_PREFIX = 'quran-cross-references-shell-';
const FILES = ${entries};
const NAVIGATIONS = ['', 'quran/'];
const scope = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...FILES, ...NAVIGATIONS].map((file) =>
        new Request(new URL(file, scope), { cache: 'reload' })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const root = new URL(scope);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;

  if (request.mode === 'navigate') {
    const alias = url.pathname === root.pathname + 'quran/' ||
      url.pathname === root.pathname + 'quran/index.html';
    const destination = new URL(alias ? 'quran/index.html' : 'index.html', scope);
    event.respondWith(caches.open(CACHE_NAME)
      .then(async (cache) =>
        (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ||
        (await cache.match(destination, { ignoreVary: true })) ||
        fetch(request)
      )
    );
    return;
  }

  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) => cache.match(request, { ignoreSearch: true, ignoreVary: true }))
    .then((response) => response || fetch(request))
  );
});
`;
}

export function pwaCacheFiles(files: readonly string[]): string[] {
  return files
    .filter(
      (file) =>
        file === 'index.html' ||
        file === 'quran/index.html' ||
        file === 'manifest.webmanifest' ||
        file.startsWith('assets/') ||
        (file.startsWith('data/quran/') &&
          file !== 'data/quran/expressions.json' &&
          file !== 'data/quran/morphology.json') ||
        file.startsWith('icons/') ||
        file === 'social-preview.png',
    )
    .sort();
}
