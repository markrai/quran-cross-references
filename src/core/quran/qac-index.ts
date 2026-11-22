import {
  QAC_MORPHOLOGY_POLICY,
  QAC_SEGMENT_COUNT,
  QAC_STEM_COUNT,
  QAC_WORD_COUNT,
  type QacOccurrence,
  type QacGrouping,
  type QacSource,
  type QacWordAnalysis,
  type QacSegment,
} from './qac-types.ts';
import { CANONICAL_QURAN } from './quran-versification.ts';

const buckwalter: Readonly<Record<string, string>> = {
  "'": 'ء',
  '|': 'آ',
  '>': 'أ',
  '&': 'ؤ',
  '<': 'إ',
  '}': 'ئ',
  A: 'ا',
  b: 'ب',
  p: 'ة',
  t: 'ت',
  v: 'ث',
  j: 'ج',
  H: 'ح',
  x: 'خ',
  d: 'د',
  '*': 'ذ',
  r: 'ر',
  z: 'ز',
  s: 'س',
  $: 'ش',
  S: 'ص',
  D: 'ض',
  T: 'ط',
  Z: 'ظ',
  E: 'ع',
  g: 'غ',
  _: 'ـ',
  f: 'ف',
  q: 'ق',
  k: 'ك',
  l: 'ل',
  m: 'م',
  n: 'ن',
  h: 'ه',
  w: 'و',
  Y: 'ى',
  y: 'ي',
  F: 'ً',
  N: 'ٌ',
  K: 'ٍ',
  a: 'َ',
  u: 'ُ',
  i: 'ِ',
  '~': 'ّ',
  o: 'ْ',
  '^': 'ٓ',
  '#': 'ٔ',
  '\x60': 'ٰ',
  '{': 'ٱ',
};

const arabicToBw = new Map(Object.entries(buckwalter).map(([symbol, arabic]) => [arabic, symbol]));

function arabicToBuckwalter(value: string): string {
  return Array.from(value, (symbol) => arabicToBw.get(symbol) ?? symbol).join('');
}

export function buckwalterToArabic(value: string): string {
  return Array.from(value, (symbol) => buckwalter[symbol] ?? symbol).join('');
}

function invalid(message: string): never {
  throw new Error('Invalid published QAC morphology: ' + message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    return invalid(label + ' must be a nonempty string.');
  }
  return value;
}

function featureValue(features: string, prefix: string): string | null {
  const item = features.split('|').find((part) => part.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

function add(index: Map<string, QacOccurrence[]>, term: string, occurrence: QacOccurrence): void {
  const matches = index.get(term) ?? [];
  matches.push(occurrence);
  index.set(term, matches);
}

export class QacMorphologyIndex {
  readonly source: QacSource;
  readonly wordCount: number;
  readonly segmentCount: number;
  readonly stemCount: number;
  readonly lemmaCount: number;
  readonly rootCount: number;
  readonly qacNotice: string;

  readonly #ayahs: readonly (readonly QacWordAnalysis[])[];
  readonly #lemmas = new Map<string, QacOccurrence[]>();
  readonly #roots = new Map<string, QacOccurrence[]>();

  constructor(value: unknown, source: QacSource) {
    if (source.id !== 'qac-morphology-v04' || !/^[a-f0-9]{64}$/.test(source.sha256)) {
      invalid('The source must be the reviewed pinned QAC v0.4 snapshot.');
    }
    const dataset = record(value, 'dataset');
    if (
      dataset['format'] !== 'quran-qac-morphology' ||
      dataset['schemaVersion'] !== 1 ||
      dataset['versification'] !== CANONICAL_QURAN.id ||
      dataset['origin'] !== 'annotated' ||
      dataset['evidence'] !== 'qac-segment-lemma-root' ||
      dataset['tokenPolicy'] !== QAC_MORPHOLOGY_POLICY
    ) {
      invalid('The schema, versification or linguistic evidence class is incorrect.');
    }
    const notice = string(dataset['qacNotice'], 'original QAC notice');
    if (
      !notice.includes('Copyright (C) 2011 Kais Dukes') ||
      !notice.includes('GNU General Public License') ||
      !notice.includes('Tanzil Quran Text (Uthmani, version 1.0.2)')
    ) {
      invalid('The original copyright and Tanzil notices are missing.');
    }
    if (
      !string(dataset['tanzilNotice'], 'Tanzil v1.1 notice').includes(
        'Copyright (C) 2007-2021 Tanzil Project',
      )
    ) {
      invalid('The displayed Tanzil Quran text notice is missing.');
    }
    const pin = record(dataset['source'], 'source');
    for (const key of [
      'id',
      'url',
      'fileName',
      'sha256',
      'license',
      'attribution',
      'retrievedAt',
    ] as const) {
      if (pin[key] !== source[key])
        invalid('The ' + key + ' provenance field does not match the source pin.');
    }
    if (
      dataset['ayahCount'] !== CANONICAL_QURAN.ayahCount ||
      dataset['wordCount'] !== QAC_WORD_COUNT ||
      dataset['segmentCount'] !== QAC_SEGMENT_COUNT ||
      dataset['stemCount'] !== QAC_STEM_COUNT
    ) {
      invalid('The expected corpus counts do not match QAC v0.4.');
    }
    const ayahs = dataset['ayahs'];
    if (!Array.isArray(ayahs) || ayahs.length !== CANONICAL_QURAN.ayahCount) {
      invalid('All canonical 6,236 ayahs must have annotation positions.');
    }
    let segmentCount = 0;
    let stemCount = 0;
    let wordCount = 0;
    const converted: QacWordAnalysis[][] = [];
    for (const [ayah, words] of ayahs.entries()) {
      if (!Array.isArray(words) || words.length < 1 || words.length > 300) {
        invalid('A QAC ayah has missing or implausible word positions.');
      }
      const entries: QacWordAnalysis[] = [];
      for (const [word, segments] of words.entries()) {
        if (!Array.isArray(segments) || segments.length < 1 || segments.length > 16) {
          invalid('A QAC word has missing or implausible segments.');
        }
        const annotated: QacSegment[] = [];
        const lemmas = new Set<string>();
        const roots = new Set<string>();
        const pos = new Set<string>();
        for (const raw of segments) {
          if (!Array.isArray(raw) || raw.length !== 3) {
            invalid('Each QAC segment requires a form, tag and features.');
          }
          const form = raw[0];
          if (typeof form !== 'string') invalid('QAC segment form must be a string.');
          const tag = string(raw[1], 'segment tag');
          const features = string(raw[2], 'segment features');
          const kind = features.split('|', 1)[0];
          if (kind !== 'PREFIX' && kind !== 'STEM' && kind !== 'SUFFIX') {
            invalid('Unknown QAC segment type.');
          }
          if (kind === 'STEM') {
            stemCount += 1;
            const lemma = featureValue(features, 'LEM:');
            const root = featureValue(features, 'ROOT:');
            const partOfSpeech = featureValue(features, 'POS:') ?? tag;
            if (lemma) lemmas.add(lemma);
            if (root) roots.add(root);
            pos.add(partOfSpeech);
          }
          annotated.push([form, tag, features]);
          segmentCount += 1;
        }
        const form = buckwalterToArabic(annotated.map((segment) => segment[0]).join(''));
        const occurrence: QacOccurrence = {
          ayah,
          word,
          form,
          pos: [...pos].join(', ') || 'unclassified',
        };
        for (const lemma of lemmas) add(this.#lemmas, lemma, occurrence);
        for (const root of roots) add(this.#roots, root, occurrence);
        entries.push({
          form,
          lemmas: [...lemmas],
          roots: [...roots],
          pos: [...pos],
          segments: annotated,
        });
        wordCount += 1;
      }
      converted.push(entries);
    }
    if (
      wordCount !== QAC_WORD_COUNT ||
      segmentCount !== QAC_SEGMENT_COUNT ||
      stemCount !== QAC_STEM_COUNT
    ) {
      invalid('The published segments do not reproduce the canonical QAC counts.');
    }
    this.source = source;
    this.wordCount = wordCount;
    this.segmentCount = segmentCount;
    this.stemCount = stemCount;
    this.lemmaCount = this.#lemmas.size;
    this.rootCount = this.#roots.size;
    this.qacNotice = notice;
    this.#ayahs = converted;
  }

  wordsAt(ayah: number): readonly QacWordAnalysis[] {
    if (!CANONICAL_QURAN.isValidIndex(ayah)) throw new RangeError('Invalid QAC ayah index.');
    return this.#ayahs[ayah] ?? [];
  }

  resolve(grouping: QacGrouping, input: string): string | null {
    const registry = grouping === 'root' ? this.#roots : this.#lemmas;
    const trimmed = input.trim();
    if (registry.has(trimmed)) return trimmed;
    const normalized =
      grouping === 'root'
        ? trimmed.replaceAll('.', '').replaceAll('·', '').replaceAll(' ', '')
        : trimmed;
    const converted = arabicToBuckwalter(normalized);
    return registry.has(converted) ? converted : null;
  }

  occurrences(grouping: QacGrouping, term: string): readonly QacOccurrence[] {
    return grouping === 'root' ? (this.#roots.get(term) ?? []) : (this.#lemmas.get(term) ?? []);
  }
}
