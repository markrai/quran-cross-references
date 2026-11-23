import { describe, expect, it } from 'vitest';
import { DEFAULT_QURAN_LOCATION, parseQuranLocation, quranLocationUrl } from './location.ts';

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
      evidence: 'curated',
      selectedExpression: null,
      selectedTheme: null,
      morphologyGrouping: 'lemma',
      selectedMorphTerm: null,
      selectedMorphWord: null,
      networkMode: 'surah',
      networkDepth: 1,
    });
    const named = new URL('https://example.test/?ref=Al-Baqarah+255');
    expect(parseQuranLocation(named).reference).toEqual({ surah: 2, ayah: 255 });
    const invalid = new URL('https://example.test/?ref=2%3A287');
    expect(parseQuranLocation(invalid).reference).toEqual(DEFAULT_QURAN_LOCATION.reference);
  });

  it('round-trips QAC root and word-position links without mixing evidence classes', () => {
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      reference: { surah: 1, ayah: 3 },
      evidence: 'morphology' as const,
      morphologyGrouping: 'root' as const,
      selectedMorphTerm: 'rHm',
      selectedMorphWord: 2,
    };
    const href = quranLocationUrl(location, '/site/');
    expect(href).toContain('evidence=morphology');
    expect(href).toContain('morph=root');
    expect(href).toContain('term=rHm');
    expect(href).toContain('word=2');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
    const wrong = parseQuranLocation(
      new URL('https://example.test/?view=network&evidence=morphology&term=rHm&word=2'),
    );
    expect(wrong.evidence).toBe('curated');
    expect(wrong.selectedMorphTerm).toBeNull();
    expect(wrong.selectedMorphWord).toBeNull();
  });

  it('discards noncanonical morphology word selectors and incomplete terms', () => {
    for (const bad of ['0', '0004', '301', '1.5', '-1']) {
      const url = new URL('https://example.test/?evidence=morphology&word=' + bad);
      expect(parseQuranLocation(url).selectedMorphWord).toBeNull();
    }
    expect(
      parseQuranLocation(new URL('https://example.test/?evidence=morphology&term=%20'))
        .selectedMorphTerm,
    ).toBeNull();
  });

  it('round-trips independent thematic annotations without mixing them into curated or exact evidence', () => {
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      view: 'themes' as const,
      selectedTheme: 'Divine Mercy',
      reference: { surah: 55, ayah: 13 },
    };
    const href = quranLocationUrl(location, '/quran-cross-references/');
    expect(href).toContain('view=themes&theme=Divine+Mercy');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
    expect(
      parseQuranLocation(new URL('https://example.test/?view=arcs&theme=Divine+Mercy')),
    ).toEqual(DEFAULT_QURAN_LOCATION);
    expect(parseQuranLocation(new URL('https://example.test/?view=themes&theme=%20'))).toEqual({
      ...DEFAULT_QURAN_LOCATION,
      view: 'themes',
    });
  });

  it('round-trips analytics URLs while preserving their selected ayah', () => {
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      view: 'analytics' as const,
      reference: { surah: 55, ayah: 13 },
    };
    const href = quranLocationUrl(location, '/site/');
    expect(href).toBe('/site/?ref=55%3A13&view=analytics');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
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
  it('round-trips bounded neighborhood state and preserves selected ayah', () => {
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      reference: { surah: 2, ayah: 255 },
      view: 'network' as const,
      networkMode: 'ayah' as const,
      networkDepth: 2 as const,
      direction: 'incoming' as const,
    };
    const href = quranLocationUrl(location, '/quran-cross-references/');
    expect(href).toContain('view=network');
    expect(href).toContain('network=ayah');
    expect(href).toContain('depth=2');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
  });

  it('defaults malformed graph settings and never mixes exact-expression links with curated topology', () => {
    const wrong = new URL(
      'https://example.test/?view=network&evidence=exact&expression=exact:v1:' +
        'a'.repeat(64) +
        '&network=other&depth=999&link=7',
    );
    expect(parseQuranLocation(wrong)).toEqual({
      ...DEFAULT_QURAN_LOCATION,
      view: 'network',
      selectedLink: 7,
    });
    const stale = new URL('https://example.test/?view=arcs&network=ayah&depth=2');
    expect(parseQuranLocation(stale)).toEqual(DEFAULT_QURAN_LOCATION);
  });

  it('round-trips computed evidence and its stable SHA expression deep link', () => {
    const expression = 'exact:v1:' + 'a'.repeat(64);
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      evidence: 'exact' as const,
      selectedExpression: expression,
      reference: { surah: 2, ayah: 255 },
    };
    const url = quranLocationUrl(location, '/quran-cross-references/');
    expect(url).toContain('evidence=exact');
    expect(url).toContain('expression=exact%3Av1%3A');
    expect(parseQuranLocation(new URL(url, 'https://example.test'))).toEqual(location);
    expect(parseQuranLocation(new URL('https://example.test/?expression=' + expression))).toEqual(
      DEFAULT_QURAN_LOCATION,
    );
  });

  it('rejects malformed expression IDs and never combines curated link IDs with computed evidence', () => {
    for (const invalid of ['exact:v1:1234', 'curated:0', 'exact:v1:' + 'g'.repeat(64)]) {
      const url = new URL(
        'https://example.test/?evidence=exact&link=7&expression=' + encodeURIComponent(invalid),
      );
      const location = parseQuranLocation(url);
      expect(location.evidence).toBe('exact');
      expect(location.selectedLink).toBeNull();
      expect(location.selectedExpression).toBeNull();
    }
  });
});
