import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { parseReference } from '../core/quran/reference.ts';
import type { QuranRelationshipScope } from '../core/quran/relationship-filter.ts';

export type QuranView = 'arcs' | 'threads';
export type QuranDirection = 'outgoing' | 'incoming' | 'both';

export interface QuranLocation {
  readonly view: QuranView;
  readonly direction: QuranDirection;
  readonly scope: QuranRelationshipScope;
  readonly reference: AyahRef;
}

export const DEFAULT_QURAN_LOCATION: QuranLocation = {
  view: 'arcs',
  direction: 'both',
  scope: 'all',
  reference: { surah: 2, ayah: 1 },
};

export function parseQuranLocation(url: URL): QuranLocation {
  const params = url.searchParams;
  const ref = params.get('ref');
  const parsed = ref === null ? null : parseReference(ref);
  const view = params.get('view');
  const direction = params.get('direction');
  const scope = params.get('scope');
  return {
    reference: parsed?.ok ? parsed.reference : DEFAULT_QURAN_LOCATION.reference,
    view: view === 'threads' ? 'threads' : 'arcs',
    direction: direction === 'incoming' || direction === 'outgoing' ? direction : 'both',
    scope: scope === 'same-surah' || scope === 'cross-surah' ? scope : 'all',
  };
}

export function quranLocationUrl(location: QuranLocation, base: string): string {
  const params = new URLSearchParams();
  params.set('ref', formatAyahId(location.reference));
  if (location.view !== 'arcs') params.set('view', location.view);
  if (location.direction !== 'both') params.set('direction', location.direction);
  if (location.scope !== 'all') params.set('scope', location.scope);
  return base + '?' + params.toString();
}
