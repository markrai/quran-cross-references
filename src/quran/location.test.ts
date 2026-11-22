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

  it('accepts numeric and named references with explicit view and filters', () => {
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
      rangeEnd: null,
      selectedLink: null,
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
      ...DEFAULT_QURAN_LOCATION,
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

  it('restores a selected range and relationship ID from a shared URL', () => {
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      rangeEnd: { surah: 2, ayah: 5 },
      selectedLink: 0,
    };
    const href = quranLocationUrl(location, '/site/');
    expect(href).toBe('/site/?ref=2%3A1&end=2%3A5&link=0');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
  });

  it('discards invalid range ends and noncanonical relationship identifiers', () => {
    for (const query of [
      '?ref=2%3A5&end=2%3A4&link=-1',
      '?ref=2%3A5&end=3%3A1&link=1.2',
      '?ref=2%3A5&end=2%3A999&link=Infinity',
      '?ref=2%3A5&end=2%3A5&link=0001',
      '?ref=2%3A5&end=2%3A1&link=999999999999999999',
    ]) {
      const location = parseQuranLocation(new URL('https://example.test/' + query));
      expect(location.rangeEnd).toBeNull();
      expect(location.selectedLink).toBeNull();
    }
  });
});
