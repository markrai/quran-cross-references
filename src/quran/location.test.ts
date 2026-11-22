import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QURAN_LOCATION,
  parseQuranLocation,
  quranLocationUrl,
} from './location.ts';

describe('standalone Quran route', () => {
  it('defaults to a valid Quran passage and does not depend on Bible URLs', () => {
    expect(parseQuranLocation(new URL('https://example.test/quran/'))).toEqual(
      DEFAULT_QURAN_LOCATION,
    );
    expect(parseQuranLocation(new URL('https://example.test/quran/?ref=John.3.16'))).toEqual(
      DEFAULT_QURAN_LOCATION,
    );
  });

  it('accepts numeric and named surah references with explicit view and filters', () => {
    expect(
      parseQuranLocation(new URL(
        'https://example.test/quran/?ref=2%3A255&view=threads&scope=cross-surah&direction=incoming',
      )),
    ).toEqual({
      view: 'threads',
      scope: 'cross-surah',
      direction: 'incoming',
      reference: { surah: 2, ayah: 255 },
    });
    expect(parseQuranLocation(new URL('https://example.test/quran/?ref=Al-Baqarah+255')).reference)
      .toEqual({ surah: 2, ayah: 255 });
    expect(parseQuranLocation(new URL('https://example.test/quran/?ref=2%3A287')).reference)
      .toEqual(DEFAULT_QURAN_LOCATION.reference);
  });

  it('rejects unknown filter and direction values rather than putting them into the UI', () => {
    expect(parseQuranLocation(new URL('https://example.test/quran/?view=no&scope=no&direction=no')))
      .toEqual(DEFAULT_QURAN_LOCATION);
  });

  it('round-trips canonical deep links under a deployment base', () => {
    const location = {
      reference: { surah: 114, ayah: 6 },
      view: 'threads' as const,
      scope: 'same-surah' as const,
      direction: 'outgoing' as const,
    };
    const href = quranLocationUrl(location, '/my-site/');
    expect(href).toContain('/my-site/quran/?ref=114%3A6');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
    expect(quranLocationUrl(DEFAULT_QURAN_LOCATION, '/my-site/'))
      .toBe('/my-site/quran/?ref=2%3A1');
  });
});
