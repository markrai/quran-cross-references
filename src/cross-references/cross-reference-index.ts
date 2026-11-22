import type { AyahIndex } from '../core/quran/ayah-ref.ts';
import type { CrossReferenceColumns } from '../core/datasets/formats.ts';
import { elementAt } from '../core/lib/array.ts';

/** A curated similar/repeated-passage relationship, preserving both upstream ranges. */
export interface CrossReferenceLink {
  readonly id: number;
  readonly sourceStart: AyahIndex;
  readonly sourceEnd: AyahIndex;
  readonly targetStart: AyahIndex;
  readonly targetEnd: AyahIndex;
  readonly contextAfter: number;
}

export class CrossReferenceIntegrityError extends Error {
  constructor(message: string) {
    super(`Invalid cross-reference data: ${message}`);
    this.name = 'CrossReferenceIntegrityError';
  }
}

/** CSR-backed relationship index with O(1) incoming and outgoing slice lookup. */
export class CrossReferenceIndex {
  readonly ayahCount: number;
  readonly linkCount: number;
  readonly sourceStarts: Int32Array;
  readonly sourceEnds: Int32Array;
  readonly targetStarts: Int32Array;
  readonly targetEnds: Int32Array;
  readonly contextAfter: Int32Array;
  readonly #outgoingOffsets: Int32Array;
  readonly #outgoingLinkIds: Int32Array;
  readonly #incomingOffsets: Int32Array;
  readonly #incomingLinkIds: Int32Array;

  constructor(columns: CrossReferenceColumns, ayahCount: number) {
    const linkCount = columns.targetStart.length;
    validateColumns(columns, ayahCount, linkCount);
    this.ayahCount = ayahCount;
    this.linkCount = linkCount;
    this.sourceEnds = Int32Array.from(columns.sourceEnd);
    this.targetStarts = Int32Array.from(columns.targetStart);
    this.targetEnds = Int32Array.from(columns.targetEnd);
    this.contextAfter = Int32Array.from(columns.contextAfter);

    const sourceStarts = new Int32Array(linkCount);
    for (let ayah = 0; ayah < ayahCount; ayah += 1) {
      sourceStarts.fill(ayah, elementAt(columns.offsets, ayah), elementAt(columns.offsets, ayah + 1));
    }
    this.sourceStarts = sourceStarts;
    [this.#outgoingOffsets, this.#outgoingLinkIds] = buildRangeIndex(sourceStarts, this.sourceEnds, ayahCount);
    [this.#incomingOffsets, this.#incomingLinkIds] = buildRangeIndex(this.targetStarts, this.targetEnds, ayahCount);
  }

  link(id: number): CrossReferenceLink {
    return {
      id,
      sourceStart: elementAt(this.sourceStarts, id),
      sourceEnd: elementAt(this.sourceEnds, id),
      targetStart: elementAt(this.targetStarts, id),
      targetEnd: elementAt(this.targetEnds, id),
      contextAfter: elementAt(this.contextAfter, id),
    };
  }

  outgoing(ayah: AyahIndex): CrossReferenceLink[] {
    return linksInSlice(this, this.#outgoingOffsets, this.#outgoingLinkIds, ayah);
  }

  incoming(ayah: AyahIndex): CrossReferenceLink[] {
    return linksInSlice(this, this.#incomingOffsets, this.#incomingLinkIds, ayah);
  }

  outgoingCount(ayah: AyahIndex): number {
    return elementAt(this.#outgoingOffsets, ayah + 1) - elementAt(this.#outgoingOffsets, ayah);
  }

  incomingCount(ayah: AyahIndex): number {
    return elementAt(this.#incomingOffsets, ayah + 1) - elementAt(this.#incomingOffsets, ayah);
  }
}

function linksInSlice(index: CrossReferenceIndex, offsets: Int32Array, ids: Int32Array, ayah: number) {
  const start = elementAt(offsets, ayah);
  const end = elementAt(offsets, ayah + 1);
  return Array.from(ids.subarray(start, end), (id) => index.link(id));
}

function buildRangeIndex(starts: ArrayLike<number>, ends: ArrayLike<number>, count: number): [Int32Array, Int32Array] {
  const offsets = new Int32Array(count + 1);
  for (let id = 0; id < starts.length; id += 1) {
    for (let ayah = elementAt(starts, id); ayah <= elementAt(ends, id); ayah += 1) offsets[ayah + 1] += 1;
  }
  for (let ayah = 0; ayah < count; ayah += 1) offsets[ayah + 1] += offsets[ayah];
  const cursors = offsets.slice(0, count);
  const ids = new Int32Array(elementAt(offsets, count));
  for (let id = 0; id < starts.length; id += 1) {
    for (let ayah = elementAt(starts, id); ayah <= elementAt(ends, id); ayah += 1) {
      const cursor = elementAt(cursors, ayah);
      ids[cursor] = id;
      cursors[ayah] = cursor + 1;
    }
  }
  return [offsets, ids];
}

function validateColumns(columns: CrossReferenceColumns, ayahCount: number, linkCount: number) {
  const lengths = [columns.sourceEnd.length, columns.targetEnd.length, columns.contextAfter.length];
  if (columns.offsets.length !== ayahCount + 1) throw new CrossReferenceIntegrityError('wrong offset count.');
  if (lengths.some((length) => length !== linkCount)) throw new CrossReferenceIntegrityError('link columns have different lengths.');
  if (columns.offsets[0] !== 0 || columns.offsets[ayahCount] !== linkCount) throw new CrossReferenceIntegrityError('offsets do not span every link.');
  let source = 0;
  for (let id = 0; id < linkCount; id += 1) {
    while ((columns.offsets[source + 1] ?? linkCount) <= id) source += 1;
    const sourceEnd = elementAt(columns.sourceEnd, id);
    const targetStart = elementAt(columns.targetStart, id);
    const targetEnd = elementAt(columns.targetEnd, id);
    if (sourceEnd < source || sourceEnd >= ayahCount || targetStart < 0 || targetEnd < targetStart || targetEnd >= ayahCount) {
      throw new CrossReferenceIntegrityError(`link ${String(id)} has an invalid range.`);
    }
  }
}
