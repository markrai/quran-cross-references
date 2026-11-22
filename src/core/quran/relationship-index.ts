import { elementAt } from '../lib/array.ts';
import type { AyahIndex } from './ayah-ref.ts';
import { CANONICAL_QURAN, type AyahIndexRange, type QuranVersification } from './quran-versification.ts';

export interface QuranRelationship {
  readonly id: number;
  readonly source: AyahIndexRange;
  readonly target: AyahIndexRange;
  readonly contextAfter: number;
}

interface PostingList {
  readonly offsets: Int32Array;
  readonly ids: Int32Array;
}

export class QuranRelationshipIntegrityError extends Error {
  constructor(message: string) {
    super('Invalid Quran relationship data: ' + message);
    this.name = 'QuranRelationshipIntegrityError';
  }
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new QuranRelationshipIntegrityError(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new QuranRelationshipIntegrityError(label + ' must be a nonnegative integer.');
  }
  return value;
}

function parseRange(value: unknown, label: string, ayahCount: number): AyahIndexRange {
  const record = expectRecord(value, label);
  const start = nonNegativeInteger(record['start'], label + '.start');
  const end = nonNegativeInteger(record['end'], label + '.end');
  if (start > end || end >= ayahCount) {
    throw new QuranRelationshipIntegrityError(label + ' is outside canonical ayah boundaries.');
  }
  return Object.freeze({ start, end });
}

function parseRelationships(value: unknown, versification: QuranVersification): readonly QuranRelationship[] {
  const record = expectRecord(value, 'dataset');
  if (record['format'] !== 'quran-similar-passages' || record['schemaVersion'] !== 1) {
    throw new QuranRelationshipIntegrityError('unknown format or schema version.');
  }
  if (record['versification'] !== versification.id) {
    throw new QuranRelationshipIntegrityError('versification does not match the Quran index.');
  }
  nonNegativeInteger(record['sourceRowCount'], 'sourceRowCount');
  nonNegativeInteger(record['duplicateCount'], 'duplicateCount');
  nonNegativeInteger(record['repeatedRangeMemberCount'], 'repeatedRangeMemberCount');
  if (!Array.isArray(record['links'])) {
    throw new QuranRelationshipIntegrityError('links must be an array.');
  }

  const seen = new Set<string>();
  return (record['links'] as unknown[]).map((value, id) => {
    const label = 'links[' + String(id) + ']';
    const link = expectRecord(value, label);
    const source = parseRange(link['source'], label + '.source', versification.ayahCount);
    const target = parseRange(link['target'], label + '.target', versification.ayahCount);
    const contextAfter = nonNegativeInteger(link['contextAfter'], label + '.contextAfter');
    const key = [source.start, source.end, target.start, target.end].join(':');
    if (seen.has(key)) {
      throw new QuranRelationshipIntegrityError(label + ' duplicates an earlier relationship.');
    }
    seen.add(key);
    return Object.freeze({ id, source, target, contextAfter });
  });
}

function buildPostings(
  links: readonly QuranRelationship[],
  ayahCount: number,
  endpoint: 'source' | 'target',
): PostingList {
  const offsets = new Int32Array(ayahCount + 1);
  for (const link of links) {
    const range = link[endpoint];
    for (let ayah = range.start; ayah <= range.end; ayah += 1) {
      offsets[ayah + 1] = elementAt(offsets, ayah + 1) + 1;
    }
  }
  for (let ayah = 1; ayah <= ayahCount; ayah += 1) {
    offsets[ayah] = elementAt(offsets, ayah) + elementAt(offsets, ayah - 1);
  }

  const cursors = offsets.slice(0, ayahCount);
  const ids = new Int32Array(elementAt(offsets, ayahCount));
  for (const link of links) {
    const range = link[endpoint];
    for (let ayah = range.start; ayah <= range.end; ayah += 1) {
      const cursor = elementAt(cursors, ayah);
      ids[cursor] = link.id;
      cursors[ayah] = cursor + 1;
    }
  }
  return { offsets, ids };
}

export class QuranRelationshipIndex {
  readonly ayahCount: number;
  readonly linkCount: number;
  readonly versification: QuranVersification;

  readonly #links: readonly QuranRelationship[];
  readonly #outgoing: PostingList;
  readonly #incoming: PostingList;

  constructor(dataset: unknown, versification: QuranVersification = CANONICAL_QURAN) {
    this.versification = versification;
    this.ayahCount = versification.ayahCount;
    this.#links = parseRelationships(dataset, versification);
    this.linkCount = this.#links.length;
    this.#outgoing = buildPostings(this.#links, this.ayahCount, 'source');
    this.#incoming = buildPostings(this.#links, this.ayahCount, 'target');
  }

  link(id: number): QuranRelationship {
    if (!Number.isInteger(id) || id < 0 || id >= this.linkCount) {
      throw new RangeError('Invalid Quran relationship ID: ' + String(id));
    }
    return elementAt(this.#links, id);
  }

  outgoing(ayah: AyahIndex): readonly QuranRelationship[] {
    return this.#atAyah(this.#outgoing, ayah);
  }

  incoming(ayah: AyahIndex): readonly QuranRelationship[] {
    return this.#atAyah(this.#incoming, ayah);
  }

  outgoingCount(ayah: AyahIndex): number {
    return this.#countAt(this.#outgoing, ayah);
  }

  incomingCount(ayah: AyahIndex): number {
    return this.#countAt(this.#incoming, ayah);
  }

  outgoingInRange(range: AyahIndexRange): readonly QuranRelationship[] {
    return this.#inRange(this.#outgoing, range);
  }

  incomingInRange(range: AyahIndexRange): readonly QuranRelationship[] {
    return this.#inRange(this.#incoming, range);
  }

  #validateAyah(ayah: number): void {
    if (!this.versification.isValidIndex(ayah)) {
      throw new RangeError('Invalid Quran ayah index: ' + String(ayah));
    }
  }

  #validateRange(range: AyahIndexRange): void {
    this.#validateAyah(range.start);
    this.#validateAyah(range.end);
    if (range.start > range.end) {
      throw new RangeError('Quran ayah range must be ascending.');
    }
  }

  #countAt(postings: PostingList, ayah: number): number {
    this.#validateAyah(ayah);
    return elementAt(postings.offsets, ayah + 1) - elementAt(postings.offsets, ayah);
  }

  #atAyah(postings: PostingList, ayah: number): readonly QuranRelationship[] {
    this.#validateAyah(ayah);
    const start = elementAt(postings.offsets, ayah);
    const end = elementAt(postings.offsets, ayah + 1);
    return Array.from(postings.ids.subarray(start, end), (id) => this.link(id));
  }

  #inRange(postings: PostingList, range: AyahIndexRange): readonly QuranRelationship[] {
    this.#validateRange(range);
    const seen = new Uint8Array(this.linkCount);
    const ids: number[] = [];
    for (let ayah = range.start; ayah <= range.end; ayah += 1) {
      const start = elementAt(postings.offsets, ayah);
      const end = elementAt(postings.offsets, ayah + 1);
      for (let position = start; position < end; position += 1) {
        const id = elementAt(postings.ids, position);
        if (seen[id] === 0) {
          seen[id] = 1;
          ids.push(id);
        }
      }
    }
    ids.sort((a, b) => a - b);
    return ids.map((id) => this.link(id));
  }
}
