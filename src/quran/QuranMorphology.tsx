import { useEffect, useState } from 'react';
import type { QuranMorphologyIndex } from '../core/quran/morphology-index.ts';
import {
  MORPHOLOGY_OCCURRENCE_PAGE_SIZE,
  type QuranMorphMode,
} from '../core/quran/morphology-evidence.ts';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import styles from './QuranApp.module.css';

interface QuranMorphologyProps {
  readonly index: QuranMorphologyIndex;
  readonly ayahIndex: number;
  readonly mode: QuranMorphMode;
  readonly selectedTerm: string | null;
  readonly onSelect: (mode: QuranMorphMode, term: string) => void;
  readonly onNavigate: (ayah: number) => void;
}

export function QuranMorphology({
  index,
  ayahIndex,
  mode,
  selectedTerm,
  onSelect,
  onNavigate,
}: QuranMorphologyProps) {
  const words = index.forAyah(ayahIndex);
  const [page, setPage] = useState(0);
  const firstTerm = words.find((word) => word[mode] !== null)?.[mode] ?? null;
  const term = selectedTerm ?? firstTerm;
  const hits = term === null ? [] : index.occurrences(mode, term);
  const totalPages = Math.max(1, Math.ceil(hits.length / MORPHOLOGY_OCCURRENCE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const shown = hits.slice(
    currentPage * MORPHOLOGY_OCCURRENCE_PAGE_SIZE,
    (currentPage + 1) * MORPHOLOGY_OCCURRENCE_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [mode, selectedTerm]);

  return (
    <section className={styles.morphologyPanel} aria-label="MAQAM morphological evidence">
      <header className={styles.panelHeading}>
        <p className={styles.eyebrow}>Phase 2B.4 · Annotated morphology</p>
        <h2>Explore Quranic Arabic lemmas and roots</h2>
        <p>
          {index.wordCount.toLocaleString('en')} annotated word positions ·{' '}
          {index.lemmaCount.toLocaleString('en')} lemmas ·{' '}
          {index.rootCount.toLocaleString('en')} roots. These are linguistic annotations from
          MAQAM, not curated passage connections or exact 3–8-word repetitions.
        </p>
      </header>

      <div className={styles.morphologyControls}>
        <label className={styles.field}>
          <span>Morphological grouping</span>
          <select
            aria-label="Morphology grouping"
            value={mode}
            onChange={(event) => {
              const next: QuranMorphMode = event.target.value === 'root' ? 'root' : 'lemma';
              const first = words.find((word) => word[next] !== null)?.[next];
              if (first) onSelect(next, first);
            }}
          >
            <option value="lemma">Shared lemma (inflectional grouping)</option>
            <option value="root">Shared root (derivational grouping)</option>
          </select>
        </label>
      </div>

      <div className={styles.morphologyColumns}>
        <section className={styles.morphologySection} aria-label="Annotated words in selected ayah">
          <h3>
            {formatAyahId(CANONICAL_QURAN.refAt(ayahIndex))} · {String(words.length)} annotated word positions
          </h3>
          <div className={styles.morphologyWords}>
            {words.map((word, position) => {
              const label = word[mode];
              return (
                <button
                  type="button"
                  key={position}
                  disabled={label === null}
                  aria-pressed={label !== null && label === term}
                  aria-label={
                    'Inspect ' + mode + ' for word ' + String(position + 1) + ': ' + word.word
                  }
                  onClick={() => {
                    if (label !== null) onSelect(mode, label);
                  }}
                >
                  <span lang="ar" dir="rtl">{word.word}</span>
                  <small>{String(position + 1)} · {word.pos}</small>
                  <strong lang="ar" dir="rtl">{label ?? 'Not annotated'}</strong>
                </button>
              );
            })}
          </div>
        </section>
        <section className={styles.morphologySection} aria-label="Morphological occurrence evidence">
          {term === null ? (
            <p className={styles.empty}>No {mode} annotation is available in this ayah.</p>
          ) : (
            <>
              <h3>
                {mode === 'lemma' ? 'Lemma' : 'Root'}{' '}
                <span lang="ar" dir="rtl">{term}</span>
              </h3>
              <p>
                {hits.length.toLocaleString('en')} MAQAM annotated word occurrences.
                Click any source location to inspect its Quran verse.
              </p>
              <div className={styles.morphologyHits}>
                {shown.map((item) => (
                  <button
                    type="button"
                    key={String(item.ayah) + ':' + String(item.position)}
                    onClick={() => {
                      onNavigate(item.ayah);
                    }}
                    aria-label={
                      'Open annotated source ' +
                      formatAyahId(CANONICAL_QURAN.refAt(item.ayah)) +
                      ' word ' +
                      String(item.position + 1)
                    }
                  >
                    <span>{formatAyahId(CANONICAL_QURAN.refAt(item.ayah))}</span>
                    <span lang="ar" dir="rtl">{item.word}</span>
                    <small>word {String(item.position + 1)} · {item.pos}</small>
                  </button>
                ))}
              </div>
              <nav className={styles.morphologyPager} aria-label="Morphology evidence pages">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => {
                    setPage(currentPage - 1);
                  }}
                >
                  Previous occurrences
                </button>
                <span>Page {String(currentPage + 1)} of {String(totalPages)}</span>
                <button
                  type="button"
                  disabled={currentPage + 1 >= totalPages}
                  onClick={() => {
                    setPage(currentPage + 1);
                  }}
                >
                  Next occurrences
                </button>
              </nav>
            </>
          )}
        </section>
      </div>
      <p className={styles.morphologyNote}>
        Annotation positions follow MAQAM's independently tokenized word sequence, not the
        Tanzil whitespace tokenizer used for exact expressions. Navigation is guaranteed at
        the ayah level; an individual word is not claimed to be position-aligned with the
        displayed Tanzil text. A root can group different lemmas and meanings. MAQAM is
        supplied under CC BY 4.0 with source attribution.
      </p>
      <p className={styles.morphologyNote}>
        Morphological annotations: <a href="https://github.com/CAMeL-Lab/MAQAM-Quranic-Corpus">
          MAQAM, CAMeL Lab, New York University Abu Dhabi
        </a>. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
        Annotation fields have been projected into a separate location-indexed research view;
        the original Quran text has not been altered.
      </p>
    </section>
  );
}
