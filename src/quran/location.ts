import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { parseReference } from '../core/quran/reference.ts';
import type { QuranRelationshipScope } from '../core/quran/relationship-filter.ts';

export type QuranView = 'arcs' | 'threads' | 'analytics' | 'network' | 'themes';
export type QuranNetworkMode = 'surah' | 'ayah';
export type QuranDirection = 'outgoing' | 'incoming' | 'both';
export type QuranEvidenceMode = 'curated' | 'exact' | 'morphology';
export type QuranMorphGrouping = 'lemma' | 'root';

export interface QuranLocation {
  readonly view: QuranView;
  readonly direction: QuranDirection;
  readonly scope: QuranRelationshipScope;
  readonly reference: AyahRef;
  readonly rangeEnd: AyahRef | null;
  readonly selectedLink: number | null;
  readonly evidence: QuranEvidenceMode;
  readonly selectedExpression: string | null;
  readonly selectedTheme: string | null;
  readonly morphologyGrouping: QuranMorphGrouping;
  readonly selectedMorphTerm: string | null;
  readonly selectedMorphWord: number | null;
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
  selectedTheme: null,
  morphologyGrouping: 'lemma',
  selectedMorphTerm: null,
  selectedMorphWord: null,
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
    rawView === 'threads' || rawView === 'analytics' || rawView === 'network' || rawView === 'themes' ? rawView : 'arcs';
  const direction = params.get('direction');
  const scope = params.get('scope');
  const requestedEvidence = params.get('evidence');
  const evidence: QuranEvidenceMode =
    view === 'network' || view === 'themes'
      ? 'curated'
      : requestedEvidence === 'exact' || requestedEvidence === 'morphology'
        ? requestedEvidence
        : 'curated';
  const morphologyGrouping: QuranMorphGrouping =
    evidence === 'morphology' && params.get('morph') === 'root' ? 'root' : 'lemma';
  const rawTerm = params.get('term');
  const selectedMorphTerm =
    evidence === 'morphology' &&
    rawTerm !== null &&
    rawTerm.length > 0 &&
    rawTerm.length <= 128 &&
    rawTerm.trim() === rawTerm &&
    !Array.from(rawTerm).some((character) => character.charCodeAt(0) < 32)
      ? rawTerm
      : null;
  const rawWord = params.get('word');
  const selectedMorphWord =
    evidence === 'morphology' &&
    rawWord !== null &&
    /^(?:[1-9]|[1-9][0-9]|[12][0-9][0-9]|300)$/u.test(rawWord)
      ? Number(rawWord)
      : null;
  const expression = params.get('expression');
  const rawTheme = params.get('theme');
  const selectedTheme =
    view === 'themes' &&
    rawTheme !== null &&
    rawTheme.length > 0 &&
    rawTheme.length <= 80 &&
    rawTheme.trim() === rawTheme &&
    !Array.from(rawTheme).some((character) => character.charCodeAt(0) < 32)
      ? rawTheme
      : null;
  return {
    reference,
    rangeEnd,
    selectedLink: evidence === 'curated' ? parseSelectedLink(params.get('link')) : null,
    morphologyGrouping,
    selectedMorphTerm,
    selectedMorphWord,
    evidence,
    selectedTheme,
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
  if (location.evidence === 'morphology') {
    params.set('evidence', 'morphology');
    if (location.morphologyGrouping === 'root') params.set('morph', 'root');
    if (location.selectedMorphTerm !== null) params.set('term', location.selectedMorphTerm);
    if (location.selectedMorphWord !== null) params.set('word', String(location.selectedMorphWord));
  }
  if (location.evidence === 'exact') {
    params.set('evidence', 'exact');
    if (location.selectedExpression !== null) params.set('expression', location.selectedExpression);
  }
  if (location.view !== 'arcs') params.set('view', location.view);
  if (location.view === 'themes' && location.selectedTheme !== null) {
    params.set('theme', location.selectedTheme);
  }
  if (location.view === 'network' && location.networkMode === 'ayah') {
    params.set('network', 'ayah');
    if (location.networkDepth === 2) params.set('depth', '2');
  }
  if (location.direction !== 'both') params.set('direction', location.direction);
  if (location.scope !== 'all') params.set('scope', location.scope);
  return base + '?' + params.toString();
}
