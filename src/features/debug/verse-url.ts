import { parseOsisId, toOsisId, type AyahIndex } from '../../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../../core/quran/quran-versification.ts';

/** URL query parameter holding the inspected ayah as an OSIS ID, e.g. `?ayah=John.3.16`. */
const VERSE_PARAM = 'ayah';

export function readVerseFromUrl(): AyahIndex | undefined {
  const osisId = new URLSearchParams(window.location.search).get(VERSE_PARAM);
  const ref = osisId === null ? undefined : parseOsisId(osisId);
  return ref && CANONICAL_QURAN.indexOf(ref);
}

export function writeVerseToUrl(ayah: AyahIndex): void {
  const url = new URL(window.location.href);
  url.searchParams.set(VERSE_PARAM, toOsisId(CANONICAL_QURAN.refAt(ayah)));
  window.history.replaceState(null, '', url);
}
