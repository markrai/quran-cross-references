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
      selectedEmotion: 'all',
      inspector: null,
      themeAnalysis: 'browse',
      patternKind: 'root',
      selectedPattern: null,
      morphologyGrouping: 'lemma',
      selectedMorphTerm: null,
      selectedMorphWord: null,
      networkMode: 'surah',
      networkDepth: 1,
      verseSearch: null,
    });
    const named = new URL('https://example.test/?ref=Al-Baqarah+255');
    expect(parseQuranLocation(named).reference).toEqual({ surah: 2, ayah: 255 });
    const invalid = new URL('https://example.test/?ref=2%3A287');
    expect(parseQuranLocation(invalid).reference).toEqual(DEFAULT_QURAN_LOCATION.reference);
  });

  it('round-trips bilingual search filters only within Threads and preserves Unicode text', () => {
    const search = {
      ...DEFAULT_QURAN_LOCATION,
      view: 'threads' as const,
      verseSearch: {
        query: 'رَحْمَة',
        language: 'arabic' as const,
        mode: 'unmarked' as const,
        surah: 2,
      },
    };
    const href = quranLocationUrl(search, '/site/');
    expect(href).toContain('q=%D8%B1');
    expect(href).toContain('qlang=ar&qmatch=unmarked&qsurah=2');
    expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(search);
    const english = {
      ...search,
      verseSearch: {
        query: 'Mercy',
        language: 'english' as const,
        mode: 'literal' as const,
        surah: null,
      },
    };
    expect(
      parseQuranLocation(new URL(quranLocationUrl(english, '/site/'), 'https://example.test')),
    ).toEqual(english);
    expect(quranLocationUrl({ ...search, view: 'arcs' }, '/site/')).not.toContain('q=');
  });

  it('round-trips QAC root and lemma verse search without changing literal links', () => {
    for (const morphology of ['root', 'lemma'] as const) {
      const selected = {
        ...DEFAULT_QURAN_LOCATION,
        view: 'threads' as const,
        verseSearch: {
          query: morphology === 'root' ? 'رحم' : 'raHmAn',
          language: 'arabic' as const,
          mode: 'literal' as const,
          surah: 1,
          morphology,
        },
      };
      const href = quranLocationUrl(selected, '/site/');
      expect(href).toContain('view=threads&q=');
      expect(href).toContain('qlang=ar&qmode=' + morphology + '&qsurah=1');
      expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(selected);
      expect(quranLocationUrl({ ...selected, view: 'arcs' }, '/site/')).not.toContain('qmode=');
    }
  });

  it('fails closed on unrecognized morphology search modes and language conflicts', () => {
    for (const query of [
      'q=rHm&qlang=ar&qmode=unknown',
      'q=rHm&qlang=en&qmode=root',
      'q=rHm&qlang=ar&qmode=semantic',
      'q=%0ArHm&qlang=ar&qmode=lemma',
    ]) {
      const parsed = parseQuranLocation(
        new URL('https://example.test/?ref=2%3A1&view=threads&' + query),
      );
      expect(parsed.verseSearch).toBeNull();
    }
    const noLanguage = parseQuranLocation(
      new URL('https://example.test/?view=threads&q=rHm&qmode=root&qmatch=unmarked'),
    );
    expect(noLanguage.verseSearch).toEqual({
      query: 'rHm',
      language: 'arabic',
      mode: 'literal',
      morphology: 'root',
      surah: null,
    });
    expect(quranLocationUrl(noLanguage, '/site/')).toContain('qlang=ar&qmode=root');
  });

  it('drops malformed, unbounded and cross-view search URL parameters', () => {
    for (const raw of ['', '  ', 'x'.repeat(121), 'hello%0Aworld']) {
      const url = new URL('https://example.test/?view=threads&q=' + raw);
      expect(parseQuranLocation(url).verseSearch).toBeNull();
    }
    expect(
      parseQuranLocation(new URL('https://example.test/?view=threads&q=mercy&qlang=other'))
        .verseSearch,
    ).toBeNull();
    for (const view of ['arcs', 'analytics', 'network', 'themes', 'emotions']) {
      const url = new URL('https://example.test/?view=' + view + '&q=mercy&qlang=en');
      expect(parseQuranLocation(url).verseSearch).toBeNull();
    }
    const invalidSurah = parseQuranLocation(
      new URL('https://example.test/?view=threads&q=mercy&qsurah=115&qmatch=unmarked'),
    );
    expect(invalidSurah.verseSearch).toEqual({
      query: 'mercy',
      language: 'english',
      mode: 'literal',
      surah: null,
    });
  });

  it('round-trips each independent ayah inspector section under a deployment base', () => {
    for (const inspector of [
      'curated',
      'exact',
      'morphology',
      'themes',
      'emotions',
      'all',
    ] as const) {
      const location = {
        ...DEFAULT_QURAN_LOCATION,
        reference: { surah: 26, ayah: 8 },
        view: 'threads' as const,
        inspector,
      };
      const href = quranLocationUrl(location, '/quran-cross-references/');
      expect(href).toContain('ref=26%3A8');
      expect(href).toContain('view=threads&inspect=' + inspector);
      expect(parseQuranLocation(new URL(href, 'https://example.test'))).toEqual(location);
    }
  });

  it('rejects malformed or irrelevant inspector selections and never leaks one into non-reader tabs', () => {
    for (const raw of ['unknown', 'Curated', 'all%20', '%0D', 'none', 'curated%26link%3D1']) {
      expect(
        parseQuranLocation(new URL('https://example.test/?inspect=' + raw)).inspector,
      ).toBeNull();
    }
    for (const view of ['analytics', 'network', 'themes', 'emotions']) {
      const location = parseQuranLocation(
        new URL('https://example.test/?view=' + view + '&inspect=all'),
      );
      expect(location.inspector).toBeNull();
      expect(quranLocationUrl({ ...location, inspector: 'all' }, '/site/')).not.toContain(
        'inspect=',
      );
    }
    expect(quranLocationUrl(DEFAULT_QURAN_LOCATION, '/site/')).toBe('/site/?ref=2%3A1');
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

  it('round-trips bounded theme-language source and feature links independently of other views', () => {
    const root = {
      ...DEFAULT_QURAN_LOCATION,
      view: 'themes' as const,
      selectedTheme: 'Divine Mercy',
      themeAnalysis: 'language' as const,
      patternKind: 'root' as const,
      selectedPattern: 'rHm',
      reference: { surah: 2, ayah: 255 },
    };
    const url = quranLocationUrl(root, '/quran-cross-references/');
    expect(url).toContain('theme=Divine+Mercy&analysis=language&feature=rHm');
    expect(parseQuranLocation(new URL(url, 'https://example.test'))).toEqual(root);

    const expression = 'exact:v1:' + 'a'.repeat(64);
    const exact = {
      ...root,
      patternKind: 'exact' as const,
      selectedPattern: expression,
    };
    const exactUrl = quranLocationUrl(exact, '/site/');
    expect(exactUrl).toContain('pattern=exact&feature=exact%3Av1%3A');
    expect(parseQuranLocation(new URL(exactUrl, 'https://example.test'))).toEqual(exact);

    const lemma = { ...root, patternKind: 'lemma' as const, selectedPattern: 'raHm' };
    expect(
      parseQuranLocation(new URL(quranLocationUrl(lemma, '/site/'), 'https://example.test')),
    ).toEqual(lemma);
  });

  it('does not leak linguistics into other research tabs or accept untrusted malformed features', () => {
    const invalid = [
      'https://example.test/?view=threads&theme=Divine+Mercy&analysis=language&feature=rHm',
      'https://example.test/?view=emotions&theme=Divine+Mercy&analysis=language&pattern=exact',
      'https://example.test/?view=themes&theme=Divine+Mercy&analysis=unknown&feature=rHm',
    ];
    for (const url of invalid) {
      const result = parseQuranLocation(new URL(url));
      expect(result.themeAnalysis).toBe('browse');
      expect(result.patternKind).toBe('root');
      expect(result.selectedPattern).toBeNull();
      expect(quranLocationUrl(result, '/site/')).not.toContain('analysis=');
    }
    for (const bad of ['%20', 'rHm%0A', 'a'.repeat(129), 'exact:v1:bad']) {
      const result = parseQuranLocation(
        new URL('https://example.test/?view=themes&analysis=language&pattern=exact&feature=' + bad),
      );
      expect(result.selectedPattern).toBeNull();
    }
    const bogus = parseQuranLocation(
      new URL('https://example.test/?view=themes&analysis=language&pattern=unknown&feature=rHm'),
    );
    expect(bogus.patternKind).toBe('root');
    expect(bogus.selectedPattern).toBe('rHm');
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

  it('keeps the independent ELQV emotion annotation lens shareable without changing other evidence views', () => {
    const location = {
      ...DEFAULT_QURAN_LOCATION,
      view: 'emotions' as const,
      reference: { surah: 26, ayah: 8 },
      selectedEmotion: 'conflicts' as const,
      selectedTheme: 'Divine Mercy',
    };
    const url = quranLocationUrl(location, '/quran-cross-references/');
    expect(url).toContain('view=emotions');
    expect(url).toContain('theme=Divine+Mercy');
    expect(url).toContain('emotion=conflicts');
    expect(parseQuranLocation(new URL(url, 'https://example.test'))).toEqual(location);
    const old = parseQuranLocation(
      new URL('https://example.test/?view=arcs&emotion=fear&theme=Divine+Mercy'),
    );
    expect(old).toEqual(DEFAULT_QURAN_LOCATION);
    const malformed = parseQuranLocation(
      new URL('https://example.test/?view=emotions&emotion=undocumented&theme=%20'),
    );
    expect(malformed).toEqual({
      ...DEFAULT_QURAN_LOCATION,
      view: 'emotions',
    });
    const evidence = parseQuranLocation(
      new URL('https://example.test/?view=emotions&evidence=exact&emotion=joy&link=10'),
    );
    expect(evidence.evidence).toBe('curated');
    expect(evidence.selectedExpression).toBeNull();
    expect(evidence.selectedEmotion).toBe('joy');
    expect(quranLocationUrl(evidence, '/site/')).not.toContain('evidence=exact');
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
