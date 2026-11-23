import { CANONICAL_QURAN } from './quran-versification.ts';
import {
  ELQV_CONFLICT_AYAH_COUNT,
  ELQV_DISTINCT_AYAH_COUNT,
  ELQV_IDENTICAL_DUPLICATE_COUNT,
  ELQV_LABELS,
  ELQV_MEMBERSHIP_COUNT,
  ELQV_ROW_COUNT,
  ELQV_UNIQUE_LABEL_COUNTS,
  type QuranEmotionDataset,
  type QuranEmotionFilter,
  type QuranEmotionLabel,
} from './emotion-types.ts';

const SOURCE_REVISION = '364cdccf6518e35003db51ccf856d9328dbb7ff3';

function invalid(reason: string): never {
  throw new Error('Invalid published ELQV research evidence: ' + reason);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) invalid(label + ' must be an array.');
  return value as readonly unknown[];
}

export class QuranEmotionIndex {
  readonly dataset: QuranEmotionDataset;
  readonly #byAyah = new Map<number, readonly QuranEmotionLabel[]>();
  readonly #byEmotion: number[][] = ELQV_LABELS.map(() => []);
  readonly #conflicts: number[] = [];
  readonly #all: number[] = [];

  constructor(input: unknown, sha256: string) {
    const dataset = record(input, 'Dataset');
    const source = record(dataset['source'], 'Source attribution');
    if (
      dataset['format'] !== 'quran-external-emotions' ||
      dataset['schemaVersion'] !== 1 ||
      dataset['versification'] !== CANONICAL_QURAN.id ||
      dataset['origin'] !== 'external-specialist-annotated-emotions' ||
      dataset['authority'] !== 'exploratory-not-tafsir' ||
      source['revision'] !== SOURCE_REVISION ||
      source['license'] !== 'CC0-1.0' ||
      source['sha256'] !== sha256
    ) {
      invalid('Schema, provenance or evidence classification mismatch.');
    }
    if (
      !/^[a-f0-9]{64}$/.test(sha256) ||
      typeof source['attribution'] !== 'string' ||
      !source['attribution'].includes('ELQV') ||
      !source['attribution'].includes('Almarzoqi')
    ) {
      invalid('Missing reviewed ELQV attribution or SHA-256 source pin.');
    }
    const labels = array(dataset['labels'], 'Label list');
    if (
      labels.length !== ELQV_LABELS.length ||
      !labels.every((label, index) => label === ELQV_LABELS[index])
    ) {
      invalid('Emotion label vocabulary or ordering mismatch.');
    }
    const counts = array(dataset['labelCounts'], 'Label histogram');
    if (
      counts.length !== ELQV_LABELS.length ||
      !counts.every((count, index) => count === ELQV_UNIQUE_LABEL_COUNTS[index])
    ) {
      invalid('Published label histogram differs from audited ELQV counts.');
    }
    if (
      dataset['rowCount'] !== ELQV_ROW_COUNT ||
      dataset['distinctAyahCount'] !== ELQV_DISTINCT_AYAH_COUNT ||
      dataset['membershipCount'] !== ELQV_MEMBERSHIP_COUNT ||
      dataset['identicalDuplicateCount'] !== ELQV_IDENTICAL_DUPLICATE_COUNT ||
      dataset['conflictedAyahCount'] !== ELQV_CONFLICT_AYAH_COUNT
    ) {
      invalid('Published source audit totals are incompatible.');
    }
    const entries = array(dataset['entries'], 'Source verse memberships');
    if (entries.length !== ELQV_DISTINCT_AYAH_COUNT) {
      invalid('Source coverage must contain exactly 2,087 distinct verses.');
    }
    let last = -1;
    let memberships = 0;
    for (const entry of entries) {
      const tuple = array(entry, 'Verse membership');
      if (tuple.length !== 2) invalid('Source verse must have one canonical index and label set.');
      const ayah = tuple[0];
      const ids = array(tuple[1], 'Verse labels');
      if (
        typeof ayah !== 'number' ||
        !CANONICAL_QURAN.isValidIndex(ayah) ||
        ayah <= last ||
        ids.length < 1 ||
        ids.length > ELQV_LABELS.length
      ) {
        invalid('Source verses must be sorted, unique, canonical and nonempty.');
      }
      let previousId = -1;
      const emotions: QuranEmotionLabel[] = [];
      for (const id of ids) {
        if (typeof id !== 'number' || !Number.isInteger(id) || id <= previousId || id >= ELQV_LABELS.length) {
          invalid('Emotion class IDs must be distinct, ordered and within the vocabulary.');
        }
        const emotion = ELQV_LABELS[id];
        if (emotion === undefined) invalid('Missing canonical emotion class.');
        emotions.push(emotion);
        this.#byEmotion[id]?.push(ayah);
        previousId = id;
        memberships += 1;
      }
      this.#byAyah.set(ayah, emotions);
      this.#all.push(ayah);
      if (ids.length > 1) this.#conflicts.push(ayah);
      last = ayah;
    }
    if (
      memberships !== ELQV_MEMBERSHIP_COUNT ||
      this.#conflicts.length !== ELQV_CONFLICT_AYAH_COUNT ||
      !this.#byEmotion.every((occurrences, index) => occurrences.length === counts[index])
    ) {
      invalid('Evidence memberships, class histogram or conflicts do not reconcile.');
    }
    this.dataset = input as QuranEmotionDataset;
  }

  forAyah(ayah: number): readonly QuranEmotionLabel[] {
    if (!CANONICAL_QURAN.isValidIndex(ayah)) throw new RangeError('Invalid Quran ayah.');
    return this.#byAyah.get(ayah) ?? [];
  }

  occurrences(filter: QuranEmotionFilter): readonly number[] {
    if (filter === 'all') return this.#all;
    if (filter === 'conflicts') return this.#conflicts;
    const id = ELQV_LABELS.indexOf(filter);
    return id < 0 ? [] : (this.#byEmotion[id] ?? []);
  }

  distribution(filter: QuranEmotionFilter): readonly { surah: number; count: number }[] {
    const counts = new Uint16Array(CANONICAL_QURAN.surahCount);
    for (const ayah of this.occurrences(filter)) {
      const surah = CANONICAL_QURAN.refAt(ayah).surah;
      counts[surah - 1] = (counts[surah - 1] ?? 0) + 1;
    }
    return Array.from({ length: CANONICAL_QURAN.surahCount }, (_, index) => ({
      surah: index + 1,
      count: counts[index] ?? 0,
    }));
  }

  overlaps(ayahs: readonly number[]): {
    readonly distinctAyahs: number;
    readonly labelCounts: readonly number[];
  } {
    const selection = new Set(ayahs);
    const countByEmotion = this.#byEmotion.map((occurrences) =>
      occurrences.reduce((total, ayah) => total + Number(selection.has(ayah)), 0),
    );
    return {
      distinctAyahs: this.#all.reduce((total, ayah) => total + Number(selection.has(ayah)), 0),
      labelCounts: countByEmotion,
    };
  }
}
