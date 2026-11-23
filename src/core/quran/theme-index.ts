import { CANONICAL_QURAN } from './quran-versification.ts';
import {
  QSAC_AYAH_COUNT,
  QSAC_CATEGORY_COUNT,
  QSAC_DOMAIN_COUNT,
  QSAC_TAG_COUNT,
  type QuranThemeDataset,
  type QuranThemeTag,
} from './theme-types.ts';

function invalid(message: string): never {
  throw new Error('Invalid published QSAC annotations: ' + message);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) invalid(label + ' must be an array.');
  return value as readonly unknown[];
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    invalid(label + ' must be canonical nonempty text.');
  }
  return value;
}

export class QuranThemeIndex {
  readonly dataset: QuranThemeDataset;
  readonly #ids = new Map<string, number>();
  readonly #postings: number[][];

  constructor(
    input: unknown,
    expected: { readonly annotations: string; readonly ontology: string },
  ) {
    const dataset = object(input, 'Dataset');
    const source = object(dataset['source'], 'Source');
    if (
      dataset['format'] !== 'quran-external-themes' ||
      dataset['schemaVersion'] !== 1 ||
      dataset['versification'] !== CANONICAL_QURAN.id ||
      dataset['origin'] !== 'external-llm-assisted-annotation' ||
      dataset['authority'] !== 'exploratory-not-tafsir' ||
      source['revision'] !== 'cb3852b127bfdda6668c5eec9e5c1d9cdcde3810' ||
      source['license'] !== 'CC BY 4.0' ||
      source['annotationsSha256'] !== expected.annotations ||
      source['ontologySha256'] !== expected.ontology
    ) {
      invalid('Schema, evidence classification or immutable provenance changed.');
    }
    if (
      !/^[a-f0-9]{64}$/.test(expected.annotations) ||
      !/^[a-f0-9]{64}$/.test(expected.ontology) ||
      !string(source['attribution'], 'Source attribution').includes('QSAC')
    ) {
      invalid('Unverifiable source hashes or attribution.');
    }
    const tags = array(dataset['tags'], 'Tag ontology');
    const ayahs = array(dataset['ayahs'], 'Ayah annotations');
    if (tags.length !== QSAC_TAG_COUNT || ayahs.length !== QSAC_AYAH_COUNT) {
      invalid('Expected 338 tags and 6,236 canonical ayahs.');
    }
    const domains = new Set<string>();
    const categories = new Set<string>();
    this.#postings = Array.from({ length: tags.length }, () => []);
    for (const [id, item] of tags.entries()) {
      const tag = object(item, 'Tag');
      const name = string(tag['name'], 'Tag name');
      const domain = string(tag['domain'], 'Domain name');
      const category = string(tag['category'], 'Category name');
      string(tag['description'], 'Tag description');
      if (
        this.#ids.has(name) ||
        !Number.isSafeInteger(tag['count']) ||
        (tag['count'] as number) < 0 ||
        (tag['count'] as number) > QSAC_AYAH_COUNT
      ) {
        invalid('Duplicated or malformed tag metadata.');
      }
      this.#ids.set(name, id);
      domains.add(domain);
      categories.add(domain + ':' + category);
    }
    if (domains.size !== QSAC_DOMAIN_COUNT || categories.size !== QSAC_CATEGORY_COUNT) {
      invalid('Ontology hierarchy no longer matches the pinned dataset.');
    }
    let total = 0;
    for (const [ayah, raw] of ayahs.entries()) {
      const ids = array(raw, 'Ayah labels');
      if (ids.length < 1 || ids.length > 6) {
        invalid('Expected 1–6 annotations per canonical ayah.');
      }
      const seen = new Set<number>();
      for (const id of ids) {
        if (
          typeof id !== 'number' ||
          !Number.isInteger(id) ||
          id < 0 ||
          id >= tags.length ||
          seen.has(id)
        ) {
          invalid('Unknown or duplicated numeric tag ID.');
        }
        seen.add(id);
        this.#postings[id]?.push(ayah);
        total += 1;
      }
    }
    if (!Number.isSafeInteger(dataset['annotationCount']) || dataset['annotationCount'] !== total) {
      invalid('Tag assignment total differs from per-ayah evidence.');
    }
    if (
      !Number.isSafeInteger(dataset['sourceAssignmentCount']) ||
      !Number.isSafeInteger(dataset['duplicateAssignmentCount']) ||
      (dataset['duplicateAssignmentCount'] as number) < 0 ||
      dataset['sourceAssignmentCount'] !== total + (dataset['duplicateAssignmentCount'] as number)
    ) {
      invalid(
        'Raw source totals must distinguish duplicate annotations from unique verse memberships.',
      );
    }
    for (const [id, raw] of tags.entries()) {
      const tag = object(raw, 'Tag');
      if (tag['count'] !== this.#postings[id]?.length) {
        invalid('Tag frequency disagrees with the source postings.');
      }
    }
    this.dataset = input as QuranThemeDataset;
  }

  find(name: string): QuranThemeTag | null {
    const id = this.#ids.get(name);
    return id === undefined ? null : (this.dataset.tags[id] ?? null);
  }

  forAyah(ayah: number): readonly QuranThemeTag[] {
    if (!CANONICAL_QURAN.isValidIndex(ayah)) throw new RangeError('Invalid canonical ayah.');
    return (this.dataset.ayahs[ayah] ?? []).map((id) => {
      const tag = this.dataset.tags[id];
      if (!tag) throw new Error('Missing validated theme tag.');
      return tag;
    });
  }

  occurrences(name: string): readonly number[] {
    const id = this.#ids.get(name);
    return id === undefined ? [] : (this.#postings[id] ?? []);
  }

  frequencyBySurah(name: string): readonly { surah: number; count: number }[] {
    const counts = new Uint16Array(CANONICAL_QURAN.surahCount);
    for (const index of this.occurrences(name)) {
      const surah = CANONICAL_QURAN.refAt(index).surah;
      counts[surah - 1] = (counts[surah - 1] ?? 0) + 1;
    }
    return Array.from({ length: CANONICAL_QURAN.surahCount }, (_, index) => ({
      surah: index + 1,
      count: counts[index] ?? 0,
    }));
  }

  rankedTags(): readonly QuranThemeTag[] {
    return [...this.dataset.tags].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'),
    );
  }
}
