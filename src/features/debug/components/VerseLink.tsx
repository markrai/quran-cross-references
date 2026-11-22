import { formatAyahIndexRange } from '../../../core/quran/reference.ts';
import type { AyahIndex } from '../../../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../../../core/quran/quran-versification.ts';
import { enBooks } from '../../../i18n/surahs/en.ts';
import { useSelectVerse } from '../ayah-navigation.ts';
import styles from '../DebugPage.module.css';

interface VerseLinkProps {
  readonly ayah: AyahIndex;
  /** Last ayah of a range, if the link points to a range; the range's first ayah is opened. */
  readonly rangeEnd?: AyahIndex;
}

/** A ayah reference that opens the ayah in the inspector. */
export function VerseLink({ ayah, rangeEnd = ayah }: VerseLinkProps) {
  const selectVerse = useSelectVerse();
  return (
    <button
      type="button"
      className={styles.linkButton}
      onClick={() => {
        selectVerse(ayah);
      }}
    >
      {formatAyahIndexRange(CANONICAL_QURAN, enBooks, ayah, rangeEnd)}
    </button>
  );
}
