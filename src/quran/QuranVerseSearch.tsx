import { useMemo, useState, type ReactNode } from 'react';
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
  onSearch,
  onNavigate,
}: QuranVerseSearchProps) {
  const [query, setQuery] = useState(search?.query ?? '');
  const [language, setLanguage] = useState(search?.language ?? 'english');
  const [mode, setMode] = useState(search?.mode ?? 'literal');
  const [surah, setSurah] = useState<number | null>(search?.surah ?? null);
  const [page, setPage] = useState(0);

  const index = useMemo(() => createVerseSearchIndex(data.text), [data.text]);
  const hits = useMemo(() => (search ? searchQuranVerses(index, search) : []), [index, search]);
  const pages = Math.ceil(hits.length / VERSE_SEARCH_PAGE_SIZE);
  const visible = hits.slice(page * VERSE_SEARCH_PAGE_SIZE, (page + 1) * VERSE_SEARCH_PAGE_SIZE);

  return (
    <section className={styles.verseSearchCard} aria-label="Bilingual Quran verse search">
      <div className={styles.verseSearchIntro}>
        <div>
          <h2>Search Quran verses</h2>
          <p>
            Search the verified Tanzil Arabic or Pickthall English text, then open any matching
            ayah.
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
                  language,
                  mode: language === 'arabic' ? mode : 'literal',
                  surah,
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
          <span>Language</span>
          <select
            aria-label="Search language"
            value={language}
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
            disabled={language !== 'arabic'}
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
        Arabic matching never modifies the original text. Ignoring marks removes combining
        vocalization signs and tatweel from comparison only; it does not equate different forms of
        alif or perform root or semantic matching.
      </p>
      {search && (
        <div className={styles.verseSearchResults}>
          <p role="status" className={styles.verseSearchCount}>
            {hits.length} matching {hits.length === 1 ? 'ayah' : 'ayahs'} ·{' '}
            {search.language === 'arabic' ? 'Arabic' : 'English'}
            {search.surah !== null ? ' · ' + getSurah(search.surah).name : ''}
          </p>
          {hits.length === 0 ? (
            <p>
              No verses match this exact text query. Try another spelling or a different Arabic
              matching mode.
            </p>
          ) : (
            <>
              <ol className={styles.verseSearchList} start={page * VERSE_SEARCH_PAGE_SIZE + 1}>
                {visible.map((hit) => {
                  const reference = CANONICAL_QURAN.refAt(hit.ayahIndex);
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
                          {search.language === 'arabic'
                            ? highlighted(data.text.arabic[hit.ayahIndex] ?? '', hit.spans)
                            : data.text.arabic[hit.ayahIndex]}
                        </span>
                        <span lang="en" dir="ltr" className={styles.verseSearchEnglish}>
                          {search.language === 'english'
                            ? highlighted(data.text.english[hit.ayahIndex] ?? '', hit.spans)
                            : data.text.english[hit.ayahIndex]}
                        </span>
                      </button>
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
          )}
        </div>
      )}
    </section>
  );
}
