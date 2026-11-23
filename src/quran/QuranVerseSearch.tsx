import { useMemo, useState, type ReactNode } from 'react';
import type { QacMorphologyIndex } from '../core/quran/qac-index.ts';
import { searchQacVerses } from '../core/quran/qac-verse-search.ts';
import type { QacGrouping } from '../core/quran/qac-types.ts';
import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { SURAHS, getSurah } from '../core/quran/surahs.ts';
import {
  createVerseSearchIndex,
  searchQuranVerses,
  MAX_VERSE_SEARCH_QUERY,
  VERSE_SEARCH_PAGE_SIZE,
  type VerseSearchOptions,
  type VerseSearchSpan,
} from '../core/quran/verse-search.ts';
import type { QuranReaderData } from './model.ts';
import styles from './QuranApp.module.css';

interface QuranVerseSearchProps {
  readonly data: QuranReaderData;
  readonly search: VerseSearchOptions | null;
  readonly selectedAyah: number | null;
  readonly morphology:
    | { readonly status: 'idle' | 'loading' }
    | { readonly status: 'error'; readonly message: string }
    | { readonly status: 'ready'; readonly index: QacMorphologyIndex };
  readonly onRetryMorphology: () => void;
  readonly onInspectMorphology: (
    reference: AyahRef,
    grouping: QacGrouping,
    term: string,
    word: number,
  ) => void;
  readonly onSearch: (search: VerseSearchOptions | null) => void;
  readonly onNavigate: (reference: AyahRef) => void;
}

function highlighted(text: string, spans: readonly VerseSearchSpan[]): ReactNode {
  const nodes: ReactNode[] = [];
  let offset = 0;
  for (const span of spans) {
    nodes.push(text.slice(offset, span.start));
    nodes.push(
      <mark key={span.start} className={styles.verseSearchMark}>
        {text.slice(span.start, span.end)}
      </mark>,
    );
    offset = span.end;
  }
  nodes.push(text.slice(offset));
  return nodes;
}

export function QuranVerseSearch({
  data,
  search,
  selectedAyah,
  morphology,
  onRetryMorphology,
  onInspectMorphology,
  onSearch,
  onNavigate,
}: QuranVerseSearchProps) {
  const [query, setQuery] = useState(search?.query ?? '');
  const [language, setLanguage] = useState(search?.language ?? 'english');
  const [mode, setMode] = useState(search?.mode ?? 'literal');
  const [searchType, setSearchType] = useState<'text' | QacGrouping>(search?.morphology ?? 'text');
  const [surah, setSurah] = useState<number | null>(search?.surah ?? null);
  const [page, setPage] = useState(0);

  const index = useMemo(() => createVerseSearchIndex(data.text), [data.text]);
  const literalHits = useMemo(
    () => (search && search.morphology === undefined ? searchQuranVerses(index, search) : []),
    [index, search],
  );
  const qacResult = useMemo(
    () =>
      search?.morphology !== undefined && morphology.status === 'ready'
        ? searchQacVerses(morphology.index, search.morphology, search.query, search.surah)
        : null,
    [morphology, search],
  );
  const hits = search?.morphology !== undefined ? (qacResult?.hits ?? []) : literalHits;
  const morphologyPending = search?.morphology !== undefined && morphology.status !== 'ready';
  const pages = Math.ceil(hits.length / VERSE_SEARCH_PAGE_SIZE);
  const visible = hits.slice(page * VERSE_SEARCH_PAGE_SIZE, (page + 1) * VERSE_SEARCH_PAGE_SIZE);

  return (
    <section className={styles.verseSearchCard} aria-label="Bilingual Quran verse search">
      <div className={styles.verseSearchIntro}>
        <div>
          <h2>Search Quran verses</h2>
          <p>
            Search verified Tanzil/Pickthall verse text or find annotated Quranic Arabic Corpus
            roots and lemmas. Every result opens its canonical ayah.
          </p>
        </div>
        {search && (
          <button
            type="button"
            className={styles.goButton}
            onClick={() => {
              onSearch(null);
            }}
          >
            Clear search
          </button>
        )}
      </div>
      <form
        className={styles.verseSearchForm}
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          onSearch(
            trimmed
              ? {
                  query: trimmed,
                  language: searchType === 'text' ? language : 'arabic',
                  mode: searchType === 'text' && language === 'arabic' ? mode : 'literal',
                  surah,
                  ...(searchType === 'text' ? {} : { morphology: searchType }),
                }
              : null,
          );
        }}
      >
        <label className={styles.field}>
          <span>Verse text</span>
          <input
            type="search"
            aria-label="Verse text"
            value={query}
            maxLength={MAX_VERSE_SEARCH_QUERY}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Enter Arabic or English words"
            dir="auto"
          />
        </label>
        <label className={styles.field}>
          <span>Search type</span>
          <select
            aria-label="Search type"
            value={searchType}
            onChange={(event) => {
              if (
                event.target.value === 'text' ||
                event.target.value === 'root' ||
                event.target.value === 'lemma'
              ) {
                setSearchType(event.target.value);
              }
            }}
          >
            <option value="text">Literal verse text</option>
            <option value="root">QAC annotated root</option>
            <option value="lemma">QAC annotated lemma</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Language</span>
          <select
            aria-label="Search language"
            value={searchType === 'text' ? language : 'arabic'}
            disabled={searchType !== 'text'}
            onChange={(event) => {
              const next = event.target.value;
              if (next === 'arabic' || next === 'english') {
                setLanguage(next);
                if (next === 'english') setMode('literal');
              }
            }}
          >
            <option value="english">English (case-insensitive)</option>
            <option value="arabic">Arabic</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Arabic matching</span>
          <select
            aria-label="Arabic matching"
            disabled={searchType !== 'text' || language !== 'arabic'}
            value={mode}
            onChange={(event) => {
              if (event.target.value === 'literal' || event.target.value === 'unmarked') {
                setMode(event.target.value);
              }
            }}
          >
            <option value="literal">Exact codepoints</option>
            <option value="unmarked">Ignore vocalization marks</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Surah filter</span>
          <select
            aria-label="Search surah filter"
            value={surah ?? ''}
            onChange={(event) => {
              setSurah(event.target.value === '' ? null : Number(event.target.value));
            }}
          >
            <option value="">All 114 surahs</option>
            {SURAHS.map((entry) => (
              <option key={entry.number} value={entry.number}>
                {entry.number}. {entry.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.goButton}>
          Search verses
        </button>
      </form>
      <p className={styles.verseSearchNote}>
        {searchType === 'text'
          ? 'Literal matching never modifies Quran text. Ignoring marks affects comparison only and does not perform morphological or semantic matching.'
          : 'QAC v0.4 root and lemma results are original linguistic annotations, not literal Tanzil character matches, curated links, or interpretations. The displayed Quran text is never rewritten or position-highlighted using unverified corpus alignment.'}
      </p>
      {search && (
        <div className={styles.verseSearchResults}>
          {search.morphology !== undefined && morphology.status === 'error' && (
            <div role="alert">
              <p>Unable to verify Quranic Arabic Corpus: {morphology.message}</p>
              <button type="button" className={styles.goButton} onClick={onRetryMorphology}>
                Retry QAC data
              </button>
            </div>
          )}
          {search.morphology !== undefined &&
            (morphology.status === 'idle' || morphology.status === 'loading') && (
              <p role="status">Loading and verifying the pinned QAC v0.4 morphology source…</p>
            )}
          {!morphologyPending && (
            <p role="status" className={styles.verseSearchCount}>
              {hits.length} matching {hits.length === 1 ? 'ayah' : 'ayahs'} ·{' '}
              {search.morphology !== undefined
                ? 'QAC annotated ' + search.morphology
                : search.language === 'arabic'
                  ? 'Arabic literal'
                  : 'English literal'}
              {search.surah !== null ? ' · ' + getSurah(search.surah).name : ''}
            </p>
          )}
          {!morphologyPending && hits.length === 0 ? (
            <p>
              No annotated or literal verses match this query. Try a different spelling, Buckwalter
              transliteration, or another search type.
            </p>
          ) : !morphologyPending ? (
            <>
              <ol className={styles.verseSearchList} start={page * VERSE_SEARCH_PAGE_SIZE + 1}>
                {visible.map((hit, i) => {
                  const reference = CANONICAL_QURAN.refAt(hit.ayahIndex);
                  const annotations =
                    qacResult?.hits[page * VERSE_SEARCH_PAGE_SIZE + i]?.annotations ?? [];
                  return (
                    <li key={hit.ayahIndex}>
                      <button
                        type="button"
                        className={styles.verseSearchResult}
                        aria-current={selectedAyah === hit.ayahIndex ? 'true' : undefined}
                        onClick={() => {
                          onNavigate(reference);
                        }}
                      >
                        <strong>
                          {getSurah(reference.surah).name} · {formatAyahId(reference)}
                        </strong>
                        <span lang="ar" dir="rtl" className={styles.verseSearchArabic}>
                          {search.morphology === undefined && search.language === 'arabic'
                            ? highlighted(data.text.arabic[hit.ayahIndex] ?? '', hit.spans)
                            : data.text.arabic[hit.ayahIndex]}
                        </span>
                        <span lang="en" dir="ltr" className={styles.verseSearchEnglish}>
                          {search.morphology === undefined && search.language === 'english'
                            ? highlighted(data.text.english[hit.ayahIndex] ?? '', hit.spans)
                            : data.text.english[hit.ayahIndex]}
                        </span>
                      </button>
                      {search.morphology !== undefined && qacResult?.term && (
                        <div className={styles.verseSearchAnnotation}>
                          <p>
                            QAC v0.4 · {annotations.length} annotated{' '}
                            {annotations.length === 1 ? 'word' : 'words'}
                          </p>
                          <ul>
                            {annotations.map((occurrence) => (
                              <li key={occurrence.word}>
                                <span lang="ar" dir="rtl">
                                  {occurrence.form}
                                </span>
                                <span>
                                  Word {occurrence.word + 1} · {occurrence.pos}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {annotations[0] && (
                            <button
                              type="button"
                              className={styles.goButton}
                              onClick={() => {
                                const first = annotations[0];
                                const grouping = search.morphology;
                                const term = qacResult.term;
                                if (first && grouping && term) {
                                  onInspectMorphology(reference, grouping, term, first.word + 1);
                                }
                              }}
                            >
                              Inspect QAC annotation
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
              {pages > 1 && (
                <div className={styles.verseSearchPagination}>
                  <button
                    type="button"
                    className={styles.goButton}
                    disabled={page === 0}
                    onClick={() => {
                      setPage((n) => Math.max(0, n - 1));
                    }}
                  >
                    Previous matches
                  </button>
                  <span>
                    Page {page + 1} of {pages}
                  </span>
                  <button
                    type="button"
                    className={styles.goButton}
                    disabled={page >= pages - 1}
                    onClick={() => {
                      setPage((n) => Math.min(pages - 1, n + 1));
                    }}
                  >
                    Next matches
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
