import { createHash } from 'node:crypto';
import { tokenizeQuranArabic } from '../../src/core/quran/arabic-tokens.ts';
import {
  detectExactArabicExpressions,
  EXACT_EXPRESSION_MAX_WORDS,
  EXACT_EXPRESSION_MIN_WORDS,
  type ExactExpressionOccurrence,
  type ExactExpressionStatistics,
} from '../../src/core/quran/expression-index.ts';
import { QURAN_EXACT_TOKEN_POLICY } from '../../src/core/quran/arabic-tokens.ts';
import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import type { QuranEvidenceSource } from '../../src/core/quran/relationship-evidence.ts';

export interface QuranExactExpression {
  readonly id: string;
  readonly kind: 'exact-repeated-expression';
  readonly origin: 'computed';
  readonly words: readonly string[];
  readonly occurrences: readonly ExactExpressionOccurrence[];
}

export interface QuranExactExpressionDataset {
  readonly format: 'quran-exact-expressions';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly tokenPolicy: string;
  readonly minWords: number;
  readonly maxWords: number;
  readonly source: QuranEvidenceSource;
  readonly statistics: ExactExpressionStatistics;
  readonly expressions: readonly QuranExactExpression[];
}

function fail(message: string): never {
  throw new Error('Invalid exact Quran expression evidence: ' + message);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return fail(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return fail(label + ' must be a nonnegative safe integer.');
  }
  return value;
}

function validateSource(source: QuranEvidenceSource): void {
  if (
    source.id !== 'tanzil-uthmani' ||
    !source.fileName ||
    !source.url.startsWith('https://') ||
    !/^[a-f0-9]{64}$/.test(source.sha256) ||
    !source.license ||
    !source.attribution ||
    !/^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt)
  ) {
    fail('source must be the complete pinned Tanzil Uthmani record.');
  }
}

export function exactExpressionId(words: readonly string[]): string {
  if (
    words.length < EXACT_EXPRESSION_MIN_WORDS ||
    words.length > EXACT_EXPRESSION_MAX_WORDS ||
    words.some((word) => !word || /\s/u.test(word))
  ) {
    return fail('expression identity requires 3–8 exact nonempty word tokens.');
  }
  const hash = createHash('sha256')
    .update(QURAN_EXACT_TOKEN_POLICY)
    .update('\0')
    .update(JSON.stringify(words))
    .digest('hex');
  return 'exact:v1:' + hash;
}

export function createExactExpressionEvidence(
  arabic: readonly string[],
  source: QuranEvidenceSource,
): QuranExactExpressionDataset {
  validateSource(source);
  const scan = detectExactArabicExpressions(arabic);
  return {
    format: 'quran-exact-expressions',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    tokenPolicy: QURAN_EXACT_TOKEN_POLICY,
    minWords: EXACT_EXPRESSION_MIN_WORDS,
    maxWords: EXACT_EXPRESSION_MAX_WORDS,
    source,
    statistics: scan.statistics,
    expressions: scan.expressions.map((entry) => ({
      id: exactExpressionId(entry.words),
      kind: 'exact-repeated-expression',
      origin: 'computed',
      words: entry.words,
      occurrences: entry.occurrences,
    })),
  };
}

export function validateExactExpressionEvidence(
  value: unknown,
  arabic: readonly string[],
  expectedSource: QuranEvidenceSource,
): QuranExactExpressionDataset {
  validateSource(expectedSource);
  const dataset = object(value, 'dataset');
  if (dataset['format'] !== 'quran-exact-expressions' || dataset['schemaVersion'] !== 1) {
    fail('unknown expression format or schema version.');
  }
  if (
    dataset['versification'] !== CANONICAL_QURAN.id ||
    dataset['tokenPolicy'] !== QURAN_EXACT_TOKEN_POLICY ||
    dataset['minWords'] !== EXACT_EXPRESSION_MIN_WORDS ||
    dataset['maxWords'] !== EXACT_EXPRESSION_MAX_WORDS
  ) {
    fail('versification or tokenization policy mismatch.');
  }

  const source = object(dataset['source'], 'source');
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
      fail('source.' + field + ' differs from the pinned Tanzil record.');
    }
  }
  const tokenized = tokenizeQuranArabic(arabic);
  const stats = object(dataset['statistics'], 'statistics');
  const fields = [
    'ayahCount',
    'tokenCount',
    'candidateOccurrences',
    'repeatedCandidates',
    'redundantCandidates',
    'emittedExpressions',
    'emittedOccurrences',
    'mostFrequentExpression',
  ] as const;
  for (const field of fields) integer(stats[field], 'statistics.' + field);
  if (
    stats['ayahCount'] !== CANONICAL_QURAN.ayahCount ||
    stats['tokenCount'] !== tokenized.reduce((n, tokens) => n + tokens.length, 0)
  ) {
    fail('statistics do not match the pinned Arabic text.');
  }

  const rows = dataset['expressions'];
  if (!Array.isArray(rows) || rows.length !== stats['emittedExpressions']) {
    fail('expressions must match the declared generated count.');
  }
  const seen = new Set<string>();
  let occurrences = 0;
  let highest = 0;
  let previousFirstAyah = -1;
  let previousFirstStart = -1;
  let previousLength = Number.POSITIVE_INFINITY;
  for (const [position, raw] of rows.entries()) {
    const label = 'expressions[' + String(position) + ']';
    const item = object(raw, label);
    const words = item['words'];
    if (!Array.isArray(words) || !words.every((word: unknown) => typeof word === 'string')) {
      fail(label + '.words must contain exact strings.');
    }
    const exactWords = words as string[];
    if (
      item['id'] !== exactExpressionId(exactWords) ||
      item['origin'] !== 'computed' ||
      item['kind'] !== 'exact-repeated-expression'
    ) {
      fail(label + ' has invalid identity, origin or evidence kind.');
    }
    const id = item['id'] as string;
    if (seen.has(id)) fail(label + ' duplicates an expression ID.');
    seen.add(id);

    const sites = item['occurrences'];
    if (!Array.isArray(sites) || sites.length < 2) {
      fail(label + ' requires at least two recorded occurrences.');
    }
    let lastAyah = -1;
    let lastStart = -1;
    let distinct = 0;
    let firstAyah = -1;
    let firstStart = -1;
    for (const [offset, rawSite] of sites.entries()) {
      const site = object(rawSite, label + '.occurrences[' + String(offset) + ']');
      const ayah = integer(site['ayah'], 'occurrence.ayah');
      const start = integer(site['start'], 'occurrence.start');
      const end = integer(site['end'], 'occurrence.end');
      const verse = tokenized[ayah];
      if (!verse || end !== start + exactWords.length || end > verse.length) {
        fail(label + ' has an out-of-range word span.');
      }
      if (ayah < lastAyah || (ayah === lastAyah && start <= lastStart)) {
        fail(label + ' occurrences must be unique and ordered.');
      }
      if (ayah !== lastAyah) distinct += 1;
      if (offset === 0) {
        firstAyah = ayah;
        firstStart = start;
      }
      for (let word = 0; word < exactWords.length; word += 1) {
        if (verse[start + word]?.text !== exactWords[word]) {
          fail(label + ' word span differs from the source text.');
        }
      }
      lastAyah = ayah;
      lastStart = start;
    }
    if (distinct < 2) fail(label + ' occurs in only one ayah.');
    if (
      firstAyah < previousFirstAyah ||
      (firstAyah === previousFirstAyah && firstStart < previousFirstStart) ||
      (firstAyah === previousFirstAyah &&
        firstStart === previousFirstStart &&
        exactWords.length > previousLength)
    ) {
      fail(label + ' is not in stable source-location order.');
    }
    previousFirstAyah = firstAyah;
    previousFirstStart = firstStart;
    previousLength = exactWords.length;
    occurrences += sites.length;
    highest = Math.max(highest, sites.length);
  }
  if (
    stats['emittedOccurrences'] !== occurrences ||
    stats['mostFrequentExpression'] !== highest ||
    (stats['repeatedCandidates'] as number) !==
      (stats['redundantCandidates'] as number) + rows.length
  ) {
    fail('statistics do not agree with expression evidence.');
  }
  return value as QuranExactExpressionDataset;
}
