import type { QuranRelationship } from '../core/quran/relationship-index.ts';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { CANONICAL_QURAN, type AyahIndexRange } from '../core/quran/quran-versification.ts';

export const TOPOLOGY_SURAH_PAGE_SIZE = 12;
export const TOPOLOGY_FIRST_HOP_LIMIT = 12;
export const TOPOLOGY_SECOND_HOP_LIMIT = 24;
export const TOPOLOGY_EVIDENCE_PAGE_SIZE = 12;
export const TOPOLOGY_RANKED_AYAH_LIMIT = 32;

export type TopologyDirection = 'outgoing' | 'incoming' | 'both';

export interface QuranTopologySurah {
  readonly surah: number;
  readonly outgoing: number;
  readonly incoming: number;
  readonly touching: number;
  readonly reciprocal: number;
}

export interface QuranTopologyEdge {
  readonly source: number;
  readonly target: number;
  readonly ids: readonly number[];
}

export interface QuranTopologyAyah {
  readonly ayah: number;
  readonly outgoing: number;
  readonly incoming: number;
  readonly uniqueLinks: number;
}

export interface QuranTopologyDataset {
  readonly format: 'quran-curated-topology';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly origin: 'curated';
  readonly sourceSha256: string;
  readonly linkCount: number;
  readonly directedPairIncidences: number;
  readonly surahs: readonly QuranTopologySurah[];
  readonly edges: readonly QuranTopologyEdge[];
  readonly topAyahs: readonly QuranTopologyAyah[];
}

export interface QuranTopologyNeighbor {
  readonly surah: number;
  readonly incoming: number;
  readonly outgoing: number;
  readonly ids: readonly number[];
  readonly strength: number;
}

export interface QuranNeighborhoodEdge {
  readonly id: number;
  readonly via: number;
  readonly neighbor: number;
  readonly direction: 'incoming' | 'outgoing';
  readonly hop: 1 | 2;
}

export interface QuranNeighborhood {
  readonly first: readonly QuranNeighborhoodEdge[];
  readonly second: readonly QuranNeighborhoodEdge[];
  readonly firstCount: number;
  readonly secondCount: number;
  readonly pages: number;
}

function touchedSurahs(range: AyahIndexRange): readonly number[] {
  const first = CANONICAL_QURAN.refAt(range.start).surah;
  const last = CANONICAL_QURAN.refAt(range.end).surah;
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
}

export function buildQuranTopology(
  index: QuranRelationshipIndex,
  sourceSha256: string,
): QuranTopologyDataset {
  if (index.ayahCount !== CANONICAL_QURAN.ayahCount) {
    throw new Error('Curated graph topology requires the canonical Quran versification.');
  }
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) {
    throw new Error('Curated graph topology requires a pinned source SHA-256.');
  }
  const outgoing = new Uint32Array(CANONICAL_QURAN.ayahCount);
  const incoming = new Uint32Array(CANONICAL_QURAN.ayahCount);
  const overlap = new Uint32Array(CANONICAL_QURAN.ayahCount);
  const rows = Array.from({ length: CANONICAL_QURAN.surahCount }, (_, position) => ({
    surah: position + 1,
    outgoing: 0,
    incoming: 0,
    touching: 0,
    reciprocal: 0,
  }));
  const pairs = new Map<string, { source: number; target: number; ids: number[] }>();
  for (let id = 0; id < index.linkCount; id += 1) {
    const link = index.link(id);
    for (let ayah = link.source.start; ayah <= link.source.end; ayah += 1) outgoing[ayah] = (outgoing[ayah] ?? 0) + 1;
    for (let ayah = link.target.start; ayah <= link.target.end; ayah += 1) incoming[ayah] = (incoming[ayah] ?? 0) + 1;
    for (let ayah = Math.max(link.source.start, link.target.start); ayah <= Math.min(link.source.end, link.target.end); ayah += 1) {
      overlap[ayah] = (overlap[ayah] ?? 0) + 1;
    }
    const sources = touchedSurahs(link.source);
    const targets = touchedSurahs(link.target);
    const sourceSet = new Set(sources);
    const targetSet = new Set(targets);
    for (const surah of sources) {
      const row = rows[surah - 1];
      if (!row) throw new Error('Out-of-range curated source surah.');
      row.outgoing += 1;
    }
    for (const surah of targets) {
      const row = rows[surah - 1];
      if (!row) throw new Error('Out-of-range curated target surah.');
      row.incoming += 1;
    }
    for (const surah of new Set([...sources, ...targets])) {
      const row = rows[surah - 1];
      if (!row) throw new Error('Out-of-range curated incident surah.');
      row.touching += 1;
      if (sourceSet.has(surah) && targetSet.has(surah)) row.reciprocal += 1;
    }
    for (const source of sources) {
      for (const target of targets) {
        const key = source + ':' + target;
        const pair = pairs.get(key);
        if (pair) pair.ids.push(id);
        else pairs.set(key, { source, target, ids: [id] });
      }
    }
  }
  const edges = [...pairs.values()].sort((a, b) => a.source - b.source || a.target - b.target);
  const topAyahs: QuranTopologyAyah[] = Array.from(
    { length: CANONICAL_QURAN.ayahCount },
    (_, ayah) => ({
      ayah,
      outgoing: outgoing[ayah] ?? 0,
      incoming: incoming[ayah] ?? 0,
      uniqueLinks: (outgoing[ayah] ?? 0) + (incoming[ayah] ?? 0) - (overlap[ayah] ?? 0),
    }),
  )
    .filter((row) => row.uniqueLinks > 0)
    .sort((a, b) => b.uniqueLinks - a.uniqueLinks || a.ayah - b.ayah)
    .slice(0, TOPOLOGY_RANKED_AYAH_LIMIT);
  return {
    format: 'quran-curated-topology',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    origin: 'curated',
    sourceSha256,
    linkCount: index.linkCount,
    directedPairIncidences: edges.reduce((sum, pair) => sum + pair.ids.length, 0),
    surahs: rows,
    edges,
    topAyahs,
  };
}

export function topologyNeighbors(
  report: QuranTopologyDataset,
  surah: number,
  direction: TopologyDirection,
  minimum: number,
): readonly QuranTopologyNeighbor[] {
  if (!Number.isInteger(surah) || surah < 1 || surah > CANONICAL_QURAN.surahCount) {
    throw new RangeError('Invalid topology focus surah.');
  }
  if (!Number.isInteger(minimum) || minimum < 1) {
    throw new RangeError('Invalid topology connection threshold.');
  }
  const partners = new Map<number, { surah: number; incoming: number; outgoing: number; ids: Set<number> }>();
  for (const edge of report.edges) {
    if (edge.source === edge.target) continue;
    const outgoing = edge.source === surah && direction !== 'incoming';
    const incoming = edge.target === surah && direction !== 'outgoing';
    if (!outgoing && !incoming) continue;
    const partner = outgoing ? edge.target : edge.source;
    const row = partners.get(partner) ?? { surah: partner, incoming: 0, outgoing: 0, ids: new Set<number>() };
    if (outgoing) row.outgoing += edge.ids.length;
    if (incoming) row.incoming += edge.ids.length;
    for (const id of edge.ids) row.ids.add(id);
    partners.set(partner, row);
  }
  return [...partners.values()]
    .map((row) => ({
      surah: row.surah,
      incoming: row.incoming,
      outgoing: row.outgoing,
      ids: [...row.ids].sort((a, b) => a - b),
      strength: row.incoming + row.outgoing,
    }))
    .filter((row) => row.strength >= minimum)
    .sort((a, b) => b.strength - a.strength || a.surah - b.surah);
}

function directEdges(index: QuranRelationshipIndex, ayah: number, direction: TopologyDirection, hop: 1 | 2): QuranNeighborhoodEdge[] {
  const result: QuranNeighborhoodEdge[] = [];
  if (direction !== 'incoming') {
    for (const link of index.outgoing(ayah)) {
      result.push({ id: link.id, via: ayah, neighbor: link.target.start, direction: 'outgoing', hop });
    }
  }
  if (direction !== 'outgoing') {
    for (const link of index.incoming(ayah)) {
      result.push({ id: link.id, via: ayah, neighbor: link.source.start, direction: 'incoming', hop });
    }
  }
  return result.sort((a, b) => a.id - b.id || a.direction.localeCompare(b.direction));
}

export function curatedNeighborhood(
  index: QuranRelationshipIndex,
  focus: number,
  direction: TopologyDirection,
  depth: 1 | 2,
  page: number,
): QuranNeighborhood {
  if (!index.versification.isValidIndex(focus)) throw new RangeError('Invalid neighborhood ayah.');
  if (!Number.isInteger(page) || page < 0) throw new RangeError('Invalid neighborhood page.');
  const candidates = directEdges(index, focus, direction, 1);
  const pages = Math.max(1, Math.ceil(candidates.length / TOPOLOGY_FIRST_HOP_LIMIT));
  const first = candidates.slice(page * TOPOLOGY_FIRST_HOP_LIMIT, (page + 1) * TOPOLOGY_FIRST_HOP_LIMIT);
  const second: QuranNeighborhoodEdge[] = [];
  let secondCount = 0;
  if (depth === 2) {
    const seen = new Set(first.map((edge) => edge.id + ':' + edge.direction));
    for (const neighbor of new Set(first.map((edge) => edge.neighbor))) {
      for (const edge of directEdges(index, neighbor, direction, 2)) {
        const key = edge.id + ':' + edge.direction;
        if (edge.neighbor === focus || seen.has(key)) continue;
        seen.add(key);
        secondCount += 1;
        if (second.length < TOPOLOGY_SECOND_HOP_LIMIT) second.push(edge);
      }
    }
  }
  return { first, second, firstCount: candidates.length, secondCount, pages };
}

export function curatedLinkLabel(link: QuranRelationship): string {
  const source = CANONICAL_QURAN.refAt(link.source.start);
  const target = CANONICAL_QURAN.refAt(link.target.start);
  return source.surah + ':' + source.ayah + ' → ' + target.surah + ':' + target.ayah;
}
