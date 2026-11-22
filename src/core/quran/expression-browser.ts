import { tokenizeQuranArabic, QURAN_EXACT_TOKEN_POLICY } from './arabic-tokens.ts';
import {
  EXACT_EXPRESSION_MAX_WORDS,
  EXACT_EXPRESSION_MIN_WORDS,
  type ExactExpressionOccurrence,
} from './expression-index.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';
import type { QuranEvidenceSource } from './relationship-evidence.ts';

export interface QuranPublishedExpression {
  readonly id: string;
  readonly words: readonly string[];
  readonly occurrences: readonly ExactExpressionOccurrence[];
}

export interface QuranExpressionMatch {
  readonly expression: QuranPublishedExpression;
  readonly start: number;
  readonly end: number;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function natural(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + ' must be a nonnegative integer.');
  }
  return value;
}

export class QuranExpressionIndex {
  readonly expressions: readonly QuranPublishedExpression[];
  readonly occurrenceCount: number;
  readonly source: QuranEvidenceSource;
  private readonly postings: readonly (readonly QuranExpressionMatch[])[];
  private readonly ids: ReadonlyMap<string, QuranPublishedExpression>;

  constructor(value: unknown, arabic: readonly string[], expectedSource: QuranEvidenceSource) {
    const dataset = object(value, 'Exact expression dataset');
    if (
      dataset['format'] !== 'quran-exact-expressions' ||
      dataset['schemaVersion'] !== 1 ||
      dataset['versification'] !== CANONICAL_QURAN.id ||
      dataset['tokenPolicy'] !== QURAN_EXACT_TOKEN_POLICY ||
      dataset['minWords'] !== EXACT_EXPRESSION_MIN_WORDS ||
      dataset['maxWords'] !== EXACT_EXPRESSION_MAX_WORDS
    ) {
      throw new Error('Incompatible exact expression dataset or tokenization policy.');
    }
    const source = object(dataset['source'], 'Expression source');
    for (const field of [
      'id',
      'fileName',
      'url',
      'sha256',
      'license',
      'attribution',
      'retrievedAt',
    ] as const) {
      if (source[field] !== expectedSource[field]) {
        throw new Error('Expression source does not match the pinned Tanzil source.');
      }
    }
    if (
      expectedSource.id !== 'tanzil-uthmani' ||
      !/^[a-f0-9]{64}$/.test(expectedSource.sha256)
    ) {
      throw new Error('The expected Arabic source pin is invalid.');
    }
    if (arabic.length !== CANONICAL_QURAN.ayahCount) {
      throw new Error('The Arabic corpus does not match the Quran versification.');
    }
    const stats = object(dataset['statistics'], 'Expression statistics');
    const declaredCount = natural(stats['emittedExpressions'], 'Expression count');
    const declaredOccurrences = natural(stats['emittedOccurrences'], 'Occurrence count');
    const raw = dataset['expressions'];
    if (!Array.isArray(raw) || raw.length !== declaredCount) {
      throw new Error('Expression records do not match the declared count.');
    }
    const tokens = tokenizeQuranArabic(arabic);
    if (
      natural(stats['ayahCount'], 'Ayah count') !== arabic.length ||
      natural(stats['tokenCount'], 'Token count') !==
        tokens.reduce((sum, verse) => sum + verse.length, 0)
    ) {
      throw new Error('Expression statistics do not match the Arabic corpus.');
    }

    const postings: QuranExpressionMatch[][] = Array.from(
      { length: arabic.length },
      () => [],
    );
    const expressions: QuranPublishedExpression[] = [];
    const ids = new Map<string, QuranPublishedExpression>();
    let occurrenceCount = 0;
    let maxFrequency = 0;
    for (const [position, rawEntry] of raw.entries()) {
      const entry = object(rawEntry, 'Expression ' + String(position));
      const words = entry['words'];
      if (
        entry['kind'] !== 'exact-repeated-expression' ||
        entry['origin'] !== 'computed' ||
        typeof entry['id'] !== 'string' ||
        !/^exact:v1:[a-f0-9]{64}$/.test(entry['id']) ||
        ids.has(entry['id']) ||
        !Array.isArray(words) ||
        words.length < EXACT_EXPRESSION_MIN_WORDS ||
        words.length > EXACT_EXPRESSION_MAX_WORDS ||
        !words.every(
          (word: unknown) => typeof word === 'string' && word.length > 0 && !/\s/u.test(word),
        )
      ) {
        throw new Error('Invalid or duplicate computed expression.');
      }
      const rawOccurrences = entry['occurrences'];
      if (!Array.isArray(rawOccurrences) || rawOccurrences.length < 2) {
        throw new Error('An exact expression needs occurrences in multiple ayahs.');
      }
      const occurrences: ExactExpressionOccurrence[] = [];
      let lastAyah = -1;
      let lastStart = -1;
      let distinct = 0;
      for (const siteValue of rawOccurrences) {
        const site = object(siteValue, 'Expression occurrence');
        const ayah = natural(site['ayah'], 'Occurrence ayah');
        const start = natural(site['start'], 'Occurrence start');
        const end = natural(site['end'], 'Occurrence end');
        const verse = tokens[ayah];
        if (
          !verse ||
          end !== start + words.length ||
          end > verse.length ||
          ayah < lastAyah ||
          (ayah === lastAyah && start <= lastStart)
        ) {
          throw new Error('Invalid, duplicated or out-of-order expression occurrence.');
        }
        for (let index = 0; index < words.length; index += 1) {
          if (verse[start + index]?.text !== words[index]) {
            throw new Error('An exact expression differs from its Arabic source span.');
          }
        }
        if (ayah !== lastAyah) distinct += 1;
        occurrences.push({ ayah, start, end });
        lastAyah = ayah;
        lastStart = start;
      }
      if (distinct < 2) throw new Error('Expression is repeated in only one ayah.');
      const expression = {
        id: entry['id'],
        words: words as string[],
        occurrences,
      };
      expressions.push(expression);
      ids.set(expression.id, expression);
      for (const site of occurrences) {
        postings[site.ayah]?.push({
          expression,
          start: site.start,
          end: site.end,
        });
      }
      occurrenceCount += occurrences.length;
      maxFrequency = Math.max(maxFrequency, occurrences.length);
    }
    if (
      occurrenceCount !== declaredOccurrences ||
      maxFrequency !== natural(stats['mostFrequentExpression'], 'Maximum frequency') ||
      natural(stats['repeatedCandidates'], 'Repeated candidates') !==
        natural(stats['redundantCandidates'], 'Redundant candidates') + expressions.length
    ) {
      throw new Error('Exact expression evidence statistics are inconsistent.');
    }
    for (const matches of postings) {
      matches.sort(
        (a, b) =>
          b.expression.words.length - a.expression.words.length ||
          a.start - b.start ||
          a.expression.id.localeCompare(b.expression.id),
      );
    }
    this.expressions = expressions;
    this.occurrenceCount = occurrenceCount;
    this.source = expectedSource;
    this.postings = postings;
    this.ids = ids;
  }

  forAyah(index: number): readonly QuranExpressionMatch[] {
    return this.postings[index] ?? [];
  }

  find(id: string | null): QuranPublishedExpression | null {
    return id === null ? null : (this.ids.get(id) ?? null);
  }
}
