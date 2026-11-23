import { useMemo, useState } from 'react';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import { ELQV_LABELS, ELQV_PAGE_SIZE, type QuranEmotionFilter } from '../core/quran/emotion-types.ts';
import type { QuranEmotionIndex } from '../core/quran/emotion-index.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { getSurah } from '../core/quran/surahs.ts';
import type { QuranThemeIndex } from '../core/quran/theme-index.ts';
import type { QuranReaderData } from './model.ts';
import styles from './QuranApp.module.css';

interface Props {
  readonly index: QuranEmotionIndex;
  readonly data: QuranReaderData;
  readonly filter: QuranEmotionFilter;
  readonly focusSurah: number;
  readonly selectedTheme: string | null;
  readonly themeIndex: QuranThemeIndex | null;
  readonly themeLoading: boolean;
  readonly themeError: string | null;
  readonly onChangeFilter: (filter: QuranEmotionFilter) => void;
  readonly onRequestThemes: () => void;
  readonly onChangeTheme: (theme: string | null) => void;
  readonly onOpenAyah: (ayah: number) => void;
}

export function QuranEmotions({
  index,
  data,
  filter,
  focusSurah,
  selectedTheme,
  themeIndex,
  themeLoading,
  themeError,
  onChangeFilter,
  onRequestThemes,
  onChangeTheme,
  onOpenAyah,
}: Props) {
  const [page, setPage] = useState(0);
  const [pageKey, setPageKey] = useState('');
  const [surahOnly, setSurahOnly] = useState(false);

  const topics = useMemo(() => themeIndex?.rankedTags() ?? [], [themeIndex]);
  const topic = selectedTheme === null ? null : (themeIndex?.find(selectedTheme) ?? null);
  const topicMatches = selectedTheme === null ? null : new Set(themeIndex?.occurrences(selectedTheme) ?? []);
  const selected = useMemo(() => {
    return index
      .occurrences(filter)
      .filter((ayah) =>
        (!surahOnly || CANONICAL_QURAN.refAt(ayah).surah === focusSurah) &&
        (topicMatches === null || topicMatches.has(ayah)),
      );
  }, [index, filter, surahOnly, focusSurah, selectedTheme, themeIndex]);
  const activeKey = filter + ':' + (selectedTheme ?? '') + ':' + (surahOnly ? String(focusSurah) : 'all');
  const pageCount = Math.max(1, Math.ceil(selected.length / ELQV_PAGE_SIZE));
  const visiblePage = pageKey === activeKey ? Math.min(page, pageCount - 1) : 0;
  const visible = selected.slice(visiblePage * ELQV_PAGE_SIZE, (visiblePage + 1) * ELQV_PAGE_SIZE);
  const distribution = useMemo(() => {
    const counts = new Uint16Array(CANONICAL_QURAN.surahCount);
    for (const ayah of selected) {
      const surah = CANONICAL_QURAN.refAt(ayah).surah;
      counts[surah - 1] = (counts[surah - 1] ?? 0) + 1;
    }
    return [...counts]
      .map((count, index) => ({ surah: index + 1, count }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.surah - b.surah)
      .slice(0, 12);
  }, [selected]);
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));
  const overlap = topic ? index.overlaps(themeIndex?.occurrences(topic.name) ?? []) : null;

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setPageKey(activeKey);
  };

  return (
    <section className={styles.themesDashboard} aria-label="Independent Quran emotion annotations">
      <header className={styles.analyticsIntro}>
        <p className={styles.eyebrow}>Phase 2D.2 · Independent expert-annotated research sample</p>
        <h1>Emotion labels and thematic intersections</h1>
        <p>
          Explore the ELQV research dataset across fear, joy, anger and sadness. Its 2,100 source
          rows cover 2,087 distinct ayahs, not the entire 6,236-ayah Quran. These labels reflect
          the research annotation task, not authoritative Quranic interpretation or the emotional
          state of a reader.
        </p>
        <p className={styles.themesCredit}>
          ELQV by Arwa Almarzoqi and Mohammed Alsuhaibani (2025), CC0 1.0. Specialist annotation
          and human verification informed the research; LLMs were also part of its methodology.
          Source Arabic and translation columns are not republished here.
          <a href="https://github.com/Arwaalmrzoqi/ELQV" target="_blank" rel="noreferrer">
            Original ELQV source
          </a>
          <a href="https://doi.org/10.1007/s44443-025-00269-y" target="_blank" rel="noreferrer">
            Research paper and methodology
          </a>
        </p>
      </header>

      <div className={styles.emotionStats} aria-label="ELQV source coverage audit">
        <div><strong>2,100</strong><span>Original dataset rows</span></div>
        <div><strong>2,087</strong><span>Distinct annotated ayahs</span></div>
        <div><strong>2,092</strong><span>Unique ayah–emotion memberships</span></div>
        <div><strong>4</strong><span>Ayahs with conflicting labels</span></div>
      </div>

      <div className={styles.emotionColumns}>
        <section className={styles.analyticsPanel} aria-label="Emotion research controls">
          <div className={styles.panelHeading}>
            <h2>Explore the sample</h2>
            <p>Eight duplicate source rows repeat an identical verse-label pair. They are not double-counted.</p>
          </div>
          <div className={styles.emotionLabels}>
            {ELQV_LABELS.map((label, id) => (
              <button
                key={label}
                type="button"
                aria-pressed={filter === label}
                onClick={() => {
                  setPage(0);
                  setPageKey('');
                  onChangeFilter(label);
                }}
              >
                <strong>{label.charAt(0).toUpperCase() + label.slice(1)}</strong>
                <span>{index.dataset.labelCounts[id]?.toLocaleString('en')} unique memberships</span>
              </button>
            ))}
          </div>
          <div className={styles.themesFilters}>
            <label className={styles.field}>
              <span>Emotion filter</span>
              <select
                aria-label="Emotion research filter"
                value={filter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === 'all' ||
                    value === 'conflicts' ||
                    ELQV_LABELS.some((label) => label === value)
                  ) {
                    setPage(0);
                    setPageKey('');
                    onChangeFilter(value as QuranEmotionFilter);
                  }
                }}
              >
                <option value="all">All 2,087 annotated ayahs</option>
                {ELQV_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </option>
                ))}
                <option value="conflicts">Conflicting source labels (4 ayahs)</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Surah scope</span>
              <select
                aria-label="Emotion research surah scope"
                value={surahOnly ? 'surah' : 'all'}
                onChange={(event) => {
                  setPage(0);
                  setPageKey('');
                  setSurahOnly(event.target.value === 'surah');
                }}
              >
                <option value="all">All sampled surahs</option>
                <option value="surah">Current surah: {getSurah(focusSurah).name}</option>
              </select>
            </label>
          </div>
          <div className={styles.panelHeading}>
            <h2>Independent QSAC cross-tab</h2>
            <p>
              Find where a topic label from QSAC appears on the same ayah as an ELQV emotion.
              This measures overlap between different taxonomies, not annotator agreement or
              statistical evidence for theological relationships.
            </p>
          </div>
          {themeIndex === null && !themeLoading && (
            <div className={styles.emotionCompareAction}>
              <button type="button" className={styles.goButton} onClick={() => { onRequestThemes(); }}>
                Load QSAC topics for comparison
              </button>
            </div>
          )}
          {themeLoading && <p className={styles.loading} role="status">Verifying independent QSAC source…</p>}
          {themeError !== null && (
            <p className={styles.empty} role="alert">
              Unable to verify QSAC topics: {themeError}
            </p>
          )}
          {themeIndex !== null && (
            <div className={styles.themesFilters}>
              <label className={styles.field}>
                <span>Intersect with QSAC topic</span>
                <select
                  aria-label="Compare with QSAC topic"
                  value={topic?.name ?? ''}
                  onChange={(event) => {
                    setPage(0);
                    setPageKey('');
                    onChangeTheme(event.target.value === '' ? null : event.target.value);
                  }}
                >
                  <option value="">No topic intersection</option>
                  {topics.map((tag) => (
                    <option key={tag.name} value={tag.name}>
                      {tag.name} · {tag.count} Quran ayahs
                    </option>
                  ))}
                </select>
              </label>
              {selectedTheme !== null && topic === null && (
                <p className={styles.empty} role="alert">This QSAC topic is not present in the verified ontology.</p>
              )}
            </div>
          )}
          {overlap !== null && (
            <div className={styles.emotionIntersection} aria-label="Independent source intersections">
              <p>
                <strong>{overlap.distinctAyahs}</strong> of the 2,087 ELQV-annotated ayahs also
                carry the QSAC topic <strong>{topic?.name}</strong>.
              </p>
              <div className={styles.emotionIntersectionGrid}>
                {ELQV_LABELS.map((label, id) => (
                  <div key={label}>
                    <strong>{overlap.labelCounts[id]}</strong>
                    <span>{label} memberships</span>
                  </div>
                ))}
              </div>
              <p>
                Only the ELQV-covered sample is considered. The four multiply labeled ayahs may
                contribute to multiple emotion categories. The category totals should not be
                compared with the whole Quran or interpreted as consensus.
              </p>
            </div>
          )}
        </section>

        <div className={styles.themesDetails}>
          <section className={styles.analyticsPanel} aria-label="Source-annotated emotion verses">
            <div className={styles.panelHeading}>
              <h2>Annotated passages</h2>
              <p>Every result links to the original bilingual Quran reader for context.</p>
            </div>
            <p className={styles.topologyCaption} role="status">
              {selected.length.toLocaleString('en')} distinct matching ayahs · Page {visiblePage + 1} of {pageCount}
            </p>
            <div className={styles.themesOccurrences} aria-label="Emotion evidence verse list">
              {visible.map((ayah) => {
                const ref = CANONICAL_QURAN.refAt(ayah);
                const emotions = index.forAyah(ayah);
                return (
                  <button
                    type="button"
                    key={ayah}
                    aria-label={'Read emotion-annotated Quran ayah ' + formatAyahId(ref)}
                    onClick={() => { onOpenAyah(ayah); }}
                  >
                    <strong>{getSurah(ref.surah).name} · {formatAyahId(ref)}</strong>
                    <span>{data.text.english[ayah]}</span>
                    <small>
                      ELQV: {emotions.join(', ')}
                      {emotions.length > 1 ? ' · Conflicting annotations' : ''}
                    </small>
                  </button>
                );
              })}
              {visible.length === 0 && (
                <p className={styles.empty}>No verses in this intersection and surah selection.</p>
              )}
            </div>
            <div className={styles.topologyPager}>
              <button
                type="button"
                disabled={visiblePage === 0}
                onClick={() => { changePage(visiblePage - 1); }}
              >
                Previous annotated verses
              </button>
              <span>{visiblePage + 1} / {pageCount}</span>
              <button
                type="button"
                disabled={visiblePage + 1 >= pageCount}
                onClick={() => { changePage(visiblePage + 1); }}
              >
                Next annotated verses
              </button>
            </div>
          </section>
          <section className={styles.analyticsPanel} aria-label="Emotion sample distribution by surah">
            <div className={styles.panelHeading}>
              <h2>Sample distribution by surah</h2>
              <p>
                Top twelve surahs by matching distinct ayah count. These are raw research sample
                counts, not Quran-wide prevalence or normalized semantic rankings.
              </p>
            </div>
            <div className={styles.themesDistribution}>
              {distribution.map((row) => (
                <div className={styles.themesDistributionRow} key={row.surah}>
                  <span>{row.surah}. {getSurah(row.surah).name}</span>
                  <span className={styles.analyticsBarTrack}>
                    <span className={styles.analyticsCuratedFill} style={{ width: String((row.count / maxCount) * 100) + '%' }} />
                  </span>
                  <strong>{row.count}</strong>
                </div>
              ))}
              {distribution.length === 0 && <p className={styles.empty}>No sampled verses for this selection.</p>}
            </div>
          </section>
        </div>
      </div>
      <p className={styles.analyticsFootnote}>
        A verse outside ELQV is unannotated in this sample, not emotionally neutral. Conflicting
        labels are preserved and displayed, not resolved by voting. Neither ELQV emotions nor QSAC
        themes alter the independently curated cross-reference graph.
      </p>
    </section>
  );
}
