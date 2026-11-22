import { describe, expect, it } from 'vitest';
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
    expect(source).toContain("request.mode === 'navigate'");
    expect(source).toContain("alias ? 'quran/index.html' : 'index.html'");
    expect(source).toContain('url.origin !== root.origin');
    expect(source).toContain('self.clients.claim()');
    expect(source).not.toContain('bible-cross-references');
  });

  it('changes the cache key for a new release', () => {
    expect(offlineWorkerSource([], 'first')).not.toBe(offlineWorkerSource([], 'second'));
  });
});
