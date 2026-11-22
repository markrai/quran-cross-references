import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QURAN_LOCATION,
  parseQuranLocation,
  quranLocationUrl,
} from './location.ts';

describe('Quran-first canonical route', () => {
  it('defaults to a valid Quran passage and does not depend on Bible URLs', () => {
    const home = new URL('https://example.test/');
    const invalid = new URL('https://example.test/?ref=John.3.16');
    expect(parseQuranLocation(home)).toEqual(DEFAULT_QURAN_LOCATION);
    expect(parseQuranLocation(invalid)).toEqual(DEFAULT_QURAN_LOCATION);
  });

  it('accepts numeric and named surah references with explicit view and filters', () => {
    const url = new URL('https://example.test/');
    url.searchParams.set('ref', '2:255');
    url.searchParams.set('view', 'threads');
    url.searchParams.set('scope', 'cross-surah');
    url.searchParams.set('direction', 'incoming');
    expect(parseQuranLocation(url)).toEqual({
      view: 'threads',
      scope: 'cross-surah',
      direction: 'incoming',
      reference: { surah: 2, ayah: 255 },
    });
    const named = new URL('https://example.test/?ref=Al-Baqarah+255');
    expect(parseQuranLocation(named).reference).toEqual({ surah: 2, ayah: 255 });
    const invalid = new URL('https://example.test/?ref=2%3A287');
    expect(parseQuranLocation(invalid).reference).toEqual(DEFAULT_QURAN_LOCATION.reference);
  });

  it('rejects unknown filter and direction values rather than putting them into the UI', () => {
    const url = new URL('https://example.test/?view=no&scope=no&direction=no');
    expect(parseQuranLocation(url)).toEqual(DEFAULT_QURAN_LOCATION);
  });

  it('continues reading existing /quran/ deep links at the same reference', () => {
    const legacy = new URL('https://example.test/quran/?ref=2%3A255&view=threads');
    expect(parseQuranLocation(legacy)).toEqual({
      ...DEFAULT_QURAN_LOCATION,
      reference: { surah: 2, ayah: 255 },
      view: 'threads',
    });
  });

  it('round-trips canonical deep links under a deployment base', () => {
    const location = {
      reference: { surah: 114, ayah: 6 },
      view: 'threads' as const,
      scope: 'same-surah' as const,
      direction: 'outgoing' as const,
    };
    const href = quranLocationUrl(location, '/my-site/');
    expect(href).toContain('/my-site/?ref=114%3A6');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
    const defaultUrl = quranLocationUrl(DEFAULT_QURAN_LOCATION, '/my-site/');
    expect(defaultUrl).toBe('/my-site/?ref=2%3A1');
  });
});
