import { useEffect, useState } from 'react';
import { buckwalterToArabic, type QacMorphologyIndex } from '../core/quran/qac-index.ts';
import { QAC_OCCURRENCE_PAGE_SIZE, type QacGrouping } from '../core/quran/qac-types.ts';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import styles from './QuranApp.module.css';

interface Props {
  readonly index: QacMorphologyIndex;
  readonly ayahIndex: number;
  readonly grouping: QacGrouping;
  readonly selectedTerm: string | null;
  readonly selectedWord: number | null;
  readonly onGroup: (grouping: QacGrouping) => void;
  readonly onSelect: (term: string | null, word: number | null) => void;
  readonly onOccurrence: (ayah: number, word: number) => void;
}

export function QuranMorphology({
  index,
  ayahIndex,
  grouping,
  selectedTerm,
  selectedWord,
  onGroup,
  onSelect,
  onOccurrence,
}: Props) {
  const words = index.wordsAt(ayahIndex);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const currentWord =
    selectedWord !== null && selectedWord > 0 ? words[selectedWord - 1] : undefined;
  const fallbackWord = words.findIndex(
    (word) => word[grouping === 'root' ? 'roots' : 'lemmas'].length > 0,
  );
  const first = fallbackWord >= 0 ? words[fallbackWord] : undefined;
  const initial = grouping === 'root' ? first?.roots[0] : first?.lemmas[0];
  const term = selectedTerm ?? initial ?? null;
  const hits = term === null ? [] : index.occurrences(grouping, term);
  const count = Math.max(1, Math.ceil(hits.length / QAC_OCCURRENCE_PAGE_SIZE));
  const currentPage = Math.min(page, count - 1);
  const occurrences = hits.slice(
    currentPage * QAC_OCCURRENCE_PAGE_SIZE,
    (currentPage + 1) * QAC_OCCURRENCE_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
    setSearchError(null);
  }, [grouping, selectedTerm]);

  const selectWord = (position: number) => {
    const word = words[position];
    if (!word) return;
    const values = grouping === 'root' ? word.roots : word.lemmas;
    onSelect(values[0] ?? null, position + 1);
  };

  return (
    <section className={styles.qacPanel} aria-label="Quranic Arabic Corpus morphology">
      <div className={styles.panelHeading}>
        <p className={styles.eyebrow}>Phase 2B.4 · Original corpus annotation</p>
        <h2>Arabic lemmas, roots, and grammar</h2>
        <p>
          {index.wordCount.toLocaleString('en')} annotated words ·{' '}
          {index.segmentCount.toLocaleString('en')} morphological segments ·{' '}
          {index.rootCount.toLocaleString('en')} roots · {index.lemmaCount.toLocaleString('en')}{' '}
          lemmas.
        </p>
        <p>
          Prefixes, stems and suffixes come from the manually reviewed Quranic Arabic Corpus v0.4.
          This evidence is linguistic annotation, not curated similarity, verbatim phrase
          repetition, or an interpretation of verse meaning.
        </p>
      </div>
      <div className={styles.qacControls}>
        <label className={styles.field}>
          <span>Grouping</span>
          <select
            aria-label="Morphology grouping"
            value={grouping}
            onChange={(event) => {
              onGroup(event.target.value === 'root' ? 'root' : 'lemma');
            }}
          >
            <option value="lemma">Lemma (inflectional family)</option>
            <option value="root">Root (derivational family)</option>
          </select>
        </label>
        <form
          className={styles.qacSearch}
          onSubmit={(event) => {
            event.preventDefault();
            const resolved = index.resolve(grouping, search.trim());
            if (!resolved) {
              setSearchError('No exact annotated ' + grouping + ' matches that term.');
              return;
            }
            setSearchError(null);
            onSelect(resolved, null);
          }}
        >
          <label className={styles.field}>
            <span>Search exact Arabic or Buckwalter {grouping}</span>
            <input
              aria-label="Search morphology term"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={grouping === 'root' ? 'رحم or rHm' : 'Arabic or Buckwalter'}
            />
          </label>
          <button type="submit" className={styles.goButton}>
            Find
          </button>
        </form>
      </div>
      {searchError && (
        <p role="alert" className={styles.qacNote}>
          {searchError}
        </p>
      )}
      <div className={styles.qacColumns}>
        <section className={styles.qacSection} aria-label="Annotated words at selected ayah">
          <h3>
            {formatAyahId(CANONICAL_QURAN.refAt(ayahIndex))} · {String(words.length)} source words
          </h3>
          <div className={styles.qacWords}>
            {words.map((word, position) => {
              const entries = grouping === 'root' ? word.roots : word.lemmas;
              return (
                <button
                  key={position}
                  type="button"
                  aria-label={'Inspect annotated word ' + String(position + 1)}
                  aria-pressed={selectedWord === position + 1}
                  onClick={() => selectWord(position)}
                >
                  <span lang="ar" dir="rtl" className={styles.qacArabic}>
                    {word.form || '…'}
                  </span>
                  <small>
                    Word {String(position + 1)} · {word.pos.join(', ') || 'unclassified'}
                  </small>
                  <span lang="ar" dir="rtl">
                    {entries.map(buckwalterToArabic).join('، ') || 'Unannotated'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.qacSegments} aria-label="Original word segment analysis">
            <h3>Segment-level analysis</h3>
            {!currentWord ? (
              <p>Select a word above to inspect its actual prefixes, stems and suffixes.</p>
            ) : (
              <>
                <p>
                  Word {String(selectedWord)} · {String(currentWord.segments.length)} segments
                </p>
                {currentWord.segments.map(([form, tag, features], position) => (
                  <div key={position} className={styles.qacSegment}>
                    <strong>{features.split('|')[0]}</strong>
                    <span lang="ar" dir="rtl">
                      {buckwalterToArabic(form) || '∅'}
                    </span>
                    <span>{tag}</span>
                    <small>{features.split('|').slice(1).join(' · ')}</small>
                  </div>
                ))}
                {currentWord.lemmas.length > 0 && <p>Lemma: {currentWord.lemmas.join(', ')}</p>}
                {currentWord.roots.length > 0 && <p>Root: {currentWord.roots.join(', ')}</p>}
              </>
            )}
          </div>
        </section>
        <section className={styles.qacSection} aria-label="Morphology occurrence evidence">
          <h3>
            {grouping === 'root' ? 'Root' : 'Lemma'}{' '}
            {term && (
              <span lang="ar" dir="rtl">
                {buckwalterToArabic(term)}
              </span>
            )}
          </h3>
          {term === null ? (
            <p className={styles.empty}>
              No annotation is available for this grouping in this ayah.
            </p>
          ) : (
            <>
              <p>
                <strong>{hits.length.toLocaleString('en')}</strong> original corpus word occurrences
                matching <code>{term}</code>. Each result identifies the annotated source verse and
                word position.
              </p>
              {hits.length === 0 && (
                <p className={styles.empty}>No occurrence matches this exact corpus annotation.</p>
              )}
              <div className={styles.qacHits}>
                {occurrences.map((site) => (
                  <button
                    type="button"
                    key={String(site.ayah) + ':' + String(site.word)}
                    onClick={() => {
                      onOccurrence(site.ayah, site.word + 1);
                    }}
                    aria-label={
                      'Open morphology source ' +
                      formatAyahId(CANONICAL_QURAN.refAt(site.ayah)) +
                      ' word ' +
                      String(site.word + 1)
                    }
                  >
                    <strong>{formatAyahId(CANONICAL_QURAN.refAt(site.ayah))}</strong>
                    <span lang="ar" dir="rtl" className={styles.qacArabic}>
                      {site.form}
                    </span>
                    <small>
                      word {String(site.word + 1)} · {site.pos}
                    </small>
                  </button>
                ))}
              </div>
              <nav className={styles.qacPager} aria-label="Morphology occurrence pages">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous occurrences
                </button>
                <span>
                  Page {String(currentPage + 1)} of {String(count)}
                </span>
                <button
                  type="button"
                  disabled={currentPage + 1 >= count}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next occurrences
                </button>
              </nav>
            </>
          )}
        </section>
      </div>
      <div className={styles.qacNotes}>
        <p>
          QAC word positions are derived from the original corpus's Tanzil Uthmani v1.0.2
          annotation, not the newer v1.1 text shown in the reader. Verse references are canonical,
          but identical word token boundaries across editions are not assumed.
        </p>
        <p>
          Some words have multiple stems or no lemma/root annotation. Both are preserved: multiple
          values appear separately, and absent values are not guessed. A shared root can encompass
          different lemmas and meanings.
        </p>
        <p>
          Morphology © 2011 Kais Dukes,{' '}
          <a href="https://corpus.quran.com" target="_blank" rel="noreferrer">
            Quranic Arabic Corpus
          </a>
          . The original copyright block is included in the derived evidence file.
        </p>
      </div>
    </section>
  );
}
