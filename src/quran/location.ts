import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { parseReference } from '../core/quran/reference.ts';
import type { QuranRelationshipScope } from '../core/quran/relationship-filter.ts';

export type QuranView = 'arcs' | 'threads' | 'analytics' | 'network';
export type QuranNetworkMode = 'surah' | 'ayah';
export type QuranDirection = 'outgoing' | 'incoming' | 'both';
export type QuranEvidenceMode = 'curated' | 'exact';

export interface QuranLocation {
  readonly view: QuranView;
  readonly direction: QuranDirection;
  readonly scope: QuranRelationshipScope;
  readonly reference: AyahRef;
  readonly rangeEnd: AyahRef | null;
  readonly selectedLink: number | null;
  readonly evidence: QuranEvidenceMode;
  readonly selectedExpression: string | null;
  readonly networkMode: QuranNetworkMode;
  readonly networkDepth: 1 | 2;
}

export const DEFAULT_QURAN_LOCATION: QuranLocation = {
  view: 'arcs',
  direction: 'both',
  scope: 'all',
  reference: { surah: 2, ayah: 1 },
  rangeEnd: null,
  selectedLink: null,
  evidence: 'curated',
  selectedExpression: null,
  networkMode: 'surah',
  networkDepth: 1,
};

function parseSelectedLink(raw: string | null): number | null {
  if (raw === null || !/^(0|[1-9][0-9]{0,8})$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

export function parseQuranLocation(url: URL): QuranLocation {
  const params = url.searchParams;
  const ref = params.get('ref');
  const parsed = ref === null ? null : parseReference(ref);
  const reference = parsed?.ok ? parsed.reference : DEFAULT_QURAN_LOCATION.reference;
  const end = params.get('end');
  const parsedEnd = end === null ? null : parseReference(end);
  const rangeEnd =
    parsedEnd?.ok &&
    parsedEnd.reference.surah === reference.surah &&
    parsedEnd.reference.ayah > reference.ayah
      ? parsedEnd.reference
      : null;
  const rawView = params.get('view');
  const view: QuranView =
    rawView === 'threads' || rawView === 'analytics' || rawView === 'network' ? rawView : 'arcs';
  const direction = params.get('direction');
  const scope = params.get('scope');
  const evidence: QuranEvidenceMode =
    view !== 'network' && params.get('evidence') === 'exact' ? 'exact' : 'curated';
  const expression = params.get('expression');
  return {
    reference,
    rangeEnd,
    selectedLink: evidence === 'curated' ? parseSelectedLink(params.get('link')) : null,
    evidence,
    selectedExpression:
      evidence === 'exact' && expression !== null && /^exact:v1:[a-f0-9]{64}$/.test(expression)
        ? expression
        : null,
    view,
    networkMode: view === 'network' && params.get('network') === 'ayah' ? 'ayah' : 'surah',
    networkDepth:
      view === 'network' && params.get('network') === 'ayah' && params.get('depth') === '2' ? 2 : 1,
    direction: direction === 'incoming' || direction === 'outgoing' ? direction : 'both',
    scope: scope === 'same-surah' || scope === 'cross-surah' ? scope : 'all',
  };
}

export function quranLocationUrl(location: QuranLocation, base: string): string {
  const params = new URLSearchParams();
  params.set('ref', formatAyahId(location.reference));
  if (location.rangeEnd !== null) params.set('end', formatAyahId(location.rangeEnd));
  if (location.evidence === 'curated' && location.selectedLink !== null) {
    params.set('link', String(location.selectedLink));
  }
  if (location.evidence === 'exact') {
    params.set('evidence', 'exact');
    if (location.selectedExpression !== null) params.set('expression', location.selectedExpression);
  }
  if (location.view !== 'arcs') params.set('view', location.view);
  if (location.view === 'network' && location.networkMode === 'ayah') {
    params.set('network', 'ayah');
    if (location.networkDepth === 2) params.set('depth', '2');
  }
  if (location.direction !== 'both') params.set('direction', location.direction);
  if (location.scope !== 'all') params.set('scope', location.scope);
  return base + '?' + params.toString();
}
