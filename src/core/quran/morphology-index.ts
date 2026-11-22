import {
  MAQAM_TOKEN_POLICY,
  MAQAM_WORD_COUNT,
  type QuranMorphologySource,
  type QuranMorphWord,
  type QuranMorphOccurrence,
  type QuranMorphMode,
} from './morphology-evidence.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';

function fail(reason: string): never {
  throw new Error('Invalid published MAQAM morphology: ' + reason);
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return fail(name + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function safeString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    return fail(label + ' must be a nonempty string.');
  }
  return value;
}

function optionalString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return safeString(value, label);
}

export class QuranMorphologyIndex {
  readonly source: QuranMorphologySource;
  readonly wordCount: number;
  readonly taggedLemmaWords: number;
  readonly taggedRootWords: number;
  readonly lemmaCount: number;
  readonly rootCount: number;

  readonly #ayahs: readonly (readonly QuranMorphWord[])[];
  readonly #lemmas = new Map<string, QuranMorphOccurrence[]>();
  readonly #roots = new Map<string, QuranMorphOccurrence[]>();

  constructor(value: unknown, expected: QuranMorphologySource) {
    if (
      expected.id !== 'maqam-2026' ||
      !/^[a-f0-9]{64}$/.test(expected.sha256) ||
      !expected.license.includes('CC BY 4.0')
    ) {
      fail('The MAQAM source must be a verified CC BY 4.0 pin.');
    }
    const dataset = object(value, 'dataset');
    if (
      dataset['format'] !== 'quran-morphology' ||
      dataset['schemaVersion'] !== 1 ||
      dataset['versification'] !== CANONICAL_QURAN.id ||
      dataset['origin'] !== 'annotated' ||
      dataset['evidence'] !== 'maqam-lemma-root' ||
      dataset['tokenPolicy'] !== MAQAM_TOKEN_POLICY ||
      dataset['alignment'] !== 'surah-ayah-only'
    ) {
      fail('Version, evidence class or alignment policy differs from MAQAM.');
    }
    if (
      typeof dataset['tanzilNotice'] !== 'string' ||
      !dataset['tanzilNotice'].includes('Copyright (C) 2007-2021 Tanzil Project')
    ) {
      fail('The Tanzil reproduction notice is missing.');
    }
    const source = object(dataset['source'], 'source');
    for (const key of ['id', 'url', 'fileName', 'sha256', 'license', 'attribution', 'retrievedAt'] as const) {
      if (source[key] !== expected[key]) {
        fail('MAQAM source.' + key + ' differs from the pinned annotation.');
      }
    }
    if (
      dataset['ayahCount'] !== CANONICAL_QURAN.ayahCount ||
      dataset['wordCount'] !== MAQAM_WORD_COUNT
    ) {
      fail('The canonical Quran or MAQAM word count is incorrect.');
    }
    const entries = dataset['ayahs'];
    if (!Array.isArray(entries) || entries.length !== CANONICAL_QURAN.ayahCount) {
      fail('The evidence must cover every one of the 6,236 ayahs.');
    }
    let count = 0;
    let lemmaCount = 0;
    let rootCount = 0;
    const ayahs: QuranMorphWord[][] = [];
    for (const [ayah, raw] of entries.entries()) {
      if (!Array.isArray(raw) || raw.length === 0 || raw.length > 256) {
        fail('An ayah has no or implausibly many MAQAM word positions.');
      }
      const words: QuranMorphWord[] = [];
      for (const [position, sourceWord] of raw.entries()) {
        const annotated = object(sourceWord, 'annotated word');
        const word = safeString(annotated['word'], 'word');
        const lemma = optionalString(annotated['lemma'], 'lemma');
        const root = optionalString(annotated['root'], 'root');
        const pos = safeString(annotated['pos'], 'part of speech');
        const occurrence: QuranMorphOccurrence = { ayah, position, word, pos };
        if (lemma !== null) {
          lemmaCount += 1;
          const hits = this.#lemmas.get(lemma) ?? [];
          hits.push(occurrence);
          this.#lemmas.set(lemma, hits);
        }
        if (root !== null) {
          rootCount += 1;
          const hits = this.#roots.get(root) ?? [];
          hits.push(occurrence);
          this.#roots.set(root, hits);
        }
        words.push({ word, lemma, root, pos });
        count += 1;
      }
      ayahs.push(words);
    }
    if (
      count !== MAQAM_WORD_COUNT ||
      dataset['taggedLemmaWords'] !== lemmaCount ||
      dataset['taggedRootWords'] !== rootCount
    ) {
      fail('The annotation token statistics do not match their positions.');
    }
    this.source = expected;
    this.wordCount = count;
    this.taggedLemmaWords = lemmaCount;
    this.taggedRootWords = rootCount;
    this.lemmaCount = this.#lemmas.size;
    this.rootCount = this.#roots.size;
    this.#ayahs = ayahs;
  }

  forAyah(index: number): readonly QuranMorphWord[] {
    if (!CANONICAL_QURAN.isValidIndex(index)) throw new RangeError('Invalid morphology ayah.');
    return this.#ayahs[index] ?? [];
  }

  occurrences(mode: QuranMorphMode, term: string): readonly QuranMorphOccurrence[] {
    if (mode === 'root') return this.#roots.get(term) ?? [];
    return this.#lemmas.get(term) ?? [];
  }
}
