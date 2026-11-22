import { createContext, useContext } from 'react';
import type { AyahIndex } from '../../core/quran/ayah-ref.ts';

/** Lets any ayah link on the debug page open that ayah in the inspector. */
export const VerseNavigationContext = createContext<((ayah: AyahIndex) => void) | null>(null);

export function useSelectVerse(): (ayah: AyahIndex) => void {
  const selectVerse = useContext(VerseNavigationContext);
  if (!selectVerse) {
    throw new Error('useSelectVerse must be used inside VerseNavigationContext.');
  }
  return selectVerse;
}
