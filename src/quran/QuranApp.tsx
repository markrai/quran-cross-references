import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { formatIndexRange, parseReference } from '../core/quran/reference.ts';
import { passesQuranRelationshipFilter } from '../core/quran/relationship-filter.ts';
import { SURAHS, getSurah } from '../core/quran/surahs.ts';
import { QuranArcs } from './QuranArcs.tsx';
import { QuranAnalytics } from './QuranAnalytics.tsx';
import { QuranTopology } from './QuranTopology.tsx';
import { loadQuranTopology } from './topology.ts';
import type { QuranTopologyDataset } from './topology-model.ts';
import { loadQuranAnalytics } from './analytics.ts';
import type { QuranAnalyticsDataset } from '../core/quran/analytics-types.ts';
import { QuranExpressionGraph } from './QuranExpressionGraph.tsx';
import { QuranExpressions } from './QuranExpressions.tsx';
import { QuranMorphology } from './QuranMorphology.tsx';
import { QuranThemes } from './QuranThemes.tsx';
import { QuranThemeLanguage } from './QuranThemeLanguage.tsx';
import type { ThemeLanguageFeature } from '../core/quran/theme-language.ts';
import { QuranEmotions } from './QuranEmotions.tsx';
import { loadQuranEmotions } from './emotions.ts';
import type { QuranEmotionIndex } from '../core/quran/emotion-index.ts';
import { loadQuranThemes } from './themes.ts';
import type { QuranThemeIndex } from '../core/quran/theme-index.ts';
import { loadQacMorphology } from './qac.ts';
import type { QacMorphologyIndex } from '../core/quran/qac-index.ts';
import { QuranThreads } from './QuranThreads.tsx';
import { QuranVerseSearch } from './QuranVerseSearch.tsx';
import { QuranReadingControls } from './QuranReadingControls.tsx';
import {
  readReadingPreferences,
  saveReadingPreferences,
  readingTextStyles,
} from './reading-preferences.ts';
import { QuranAyahEvidence } from './QuranAyahEvidence.tsx';
import type { QuranInspectorSource } from './location.ts';
import {
  DEFAULT_QURAN_LOCATION,
  parseQuranLocation,
  quranLocationUrl,
  type QuranLocation,
} from './location.ts';
import { loadQuranReaderData, type QuranReaderData } from './model.ts';
import { loadQuranExpressions } from './expressions.ts';
import type { QuranExpressionIndex } from '../core/quran/expression-browser.ts';
import { shareQuranReference } from './share.ts';
import styles from './QuranApp.module.css';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly data: QuranReaderData };

type AnalyticsLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly report: QuranAnalyticsDataset };

type TopologyLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly report: QuranTopologyDataset };

type MorphologyLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly index: QacMorphologyIndex };

type ThemeLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly index: QuranThemeIndex };

type EmotionLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly index: QuranEmotionIndex };

type ExpressionLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly index: QuranExpressionIndex };

function useQuranLocation(): readonly [
  QuranLocation,
  (next: QuranLocation, replace?: boolean) => void,
] {
  const [location, setLocation] = useState(() => parseQuranLocation(new URL(window.location.href)));
  useEffect(() => {
    const onPopState = () => {
      setLocation(parseQuranLocation(new URL(window.location.href)));
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);
  const navigate = useCallback((next: QuranLocation, replace = false) => {
    const href = quranLocationUrl(next, import.meta.env.BASE_URL);
    if (replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
    setLocation(next);
  }, []);
  return [location, navigate];
}

function linkReference(location: QuranLocation, reference: AyahRef): QuranLocation {
  return {
    ...location,
    reference,
    rangeEnd: null,
    selectedLink: null,
    selectedExpression: null,
    selectedMorphTerm: null,
    selectedMorphWord: null,
  };
}

export function QuranApp() {
  const [location, navigate] = useQuranLocation();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [readingPreferences, setReadingPreferences] = useState(readReadingPreferences);
  const [expressionState, setExpressionState] = useState<ExpressionLoadState>({ status: 'idle' });
  const [expressionAttempt, setExpressionAttempt] = useState(0);
  const expressionCache = useRef<QuranExpressionIndex | null>(null);
  const [analyticsState, setAnalyticsState] = useState<AnalyticsLoadState>({ status: 'idle' });
  const [analyticsAttempt, setAnalyticsAttempt] = useState(0);
  const analyticsCache = useRef<QuranAnalyticsDataset | null>(null);
  const [topologyState, setTopologyState] = useState<TopologyLoadState>({ status: 'idle' });
  const [topologyAttempt, setTopologyAttempt] = useState(0);
  const topologyCache = useRef<QuranTopologyDataset | null>(null);
  const [morphologyState, setMorphologyState] = useState<MorphologyLoadState>({ status: 'idle' });
  const [morphologyAttempt, setMorphologyAttempt] = useState(0);
  const morphologyCache = useRef<QacMorphologyIndex | null>(null);
  const [themesState, setThemesState] = useState<ThemeLoadState>({ status: 'idle' });
  const [themesAttempt, setThemesAttempt] = useState(0);
  const themesCache = useRef<QuranThemeIndex | null>(null);
  const [comparisonRequested, setComparisonRequested] = useState(false);
  const [emotionsState, setEmotionsState] = useState<EmotionLoadState>({ status: 'idle' });
  const [emotionsAttempt, setEmotionsAttempt] = useState(0);
  const emotionsCache = useRef<QuranEmotionIndex | null>(null);

  useEffect(() => {
    saveReadingPreferences(readingPreferences);
  }, [readingPreferences]);

  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadQuranReaderData(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setLoadState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load Quran data.',
          });
        }
      });
    return () => {
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    document.title =
      getSurah(location.reference.surah).name +
      ' ' +
      formatAyahId(location.reference) +
      ' · Quran Cross-References';
  }, [location.reference]);

  const focus = (reference: AyahRef) => {
    setSearchError(null);
    setShareMessage(null);
    navigate(linkReference(location, reference));
  };
  const changeSurah = (surah: number) => {
    focus({ surah, ayah: 1 });
  };
  const data = loadState.status === 'ready' ? loadState.data : null;
  const readingMode = location.view === 'threads' && readingPreferences.readingMode;
  const readingStyle =
    location.view === 'threads'
      ? (readingTextStyles(readingPreferences) as CSSProperties)
      : undefined;

  useEffect(() => {
    if (readingMode) return;
    const reader = location.view === 'arcs' || location.view === 'threads';
    const themeAnalysis =
      location.view === 'themes' &&
      location.themeAnalysis === 'language' &&
      location.patternKind === 'exact';
    if (
      !data ||
      (!reader && !themeAnalysis) ||
      (!themeAnalysis &&
        location.evidence !== 'exact' &&
        location.inspector !== 'exact' &&
        location.inspector !== 'all')
    )
      return;
    if (expressionCache.current) {
      setExpressionState({ status: 'ready', index: expressionCache.current });
      return;
    }
    const controller = new AbortController();
    setExpressionState({ status: 'loading' });
    void loadQuranExpressions(data.text.arabic, controller.signal)
      .then((index) => {
        if (controller.signal.aborted) return;
        expressionCache.current = index;
        setExpressionState({ status: 'ready', index });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setExpressionState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify expressions.',
        });
      });
    return () => {
      controller.abort();
    };
  }, [
    data,
    location.evidence,
    location.view,
    location.inspector,
    location.themeAnalysis,
    location.patternKind,
    expressionAttempt,
    readingMode,
  ]);

  useEffect(() => {
    if (!data || location.view !== 'analytics') return;
    if (analyticsCache.current) {
      setAnalyticsState({ status: 'ready', report: analyticsCache.current });
      return;
    }
    const controller = new AbortController();
    setAnalyticsState({ status: 'loading' });
    void loadQuranAnalytics(data, controller.signal)
      .then((report) => {
        if (controller.signal.aborted) return;
        analyticsCache.current = report;
        setAnalyticsState({ status: 'ready', report });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAnalyticsState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify analytics.',
        });
      });
    return () => {
      controller.abort();
    };
  }, [data, location.view, analyticsAttempt]);

  useEffect(() => {
    if (!data || location.view !== 'network') return;
    if (topologyCache.current) {
      setTopologyState({ status: 'ready', report: topologyCache.current });
      return;
    }
    const controller = new AbortController();
    setTopologyState({ status: 'loading' });
    void loadQuranTopology(data, controller.signal)
      .then((report) => {
        if (controller.signal.aborted) return;
        topologyCache.current = report;
        setTopologyState({ status: 'ready', report });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setTopologyState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify Quran topology.',
        });
      });
    return () => {
      controller.abort();
    };
  }, [data, location.view, topologyAttempt]);

  useEffect(() => {
    if (readingMode) return;
    const reader = location.view === 'arcs' || location.view === 'threads';
    const themeAnalysis =
      location.view === 'themes' &&
      location.themeAnalysis === 'language' &&
      location.patternKind !== 'exact';
    if (
      !data ||
      (!reader && !themeAnalysis) ||
      (!themeAnalysis &&
        location.evidence !== 'morphology' &&
        location.inspector !== 'morphology' &&
        location.inspector !== 'all')
    )
      return;
    if (morphologyCache.current) {
      setMorphologyState({ status: 'ready', index: morphologyCache.current });
      return;
    }
    const controller = new AbortController();
    setMorphologyState({ status: 'loading' });
    void loadQacMorphology(controller.signal)
      .then((index) => {
        if (controller.signal.aborted) return;
        morphologyCache.current = index;
        setMorphologyState({ status: 'ready', index });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMorphologyState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify QAC morphology.',
        });
      });
    return () => {
      controller.abort();
    };
  }, [
    data,
    location.view,
    location.evidence,
    location.inspector,
    location.themeAnalysis,
    location.patternKind,
    morphologyAttempt,
    readingMode,
  ]);

  useEffect(() => {
    if (readingMode) return;
    const inspecting =
      (location.view === 'arcs' || location.view === 'threads') &&
      (location.inspector === 'themes' || location.inspector === 'all');
    if (
      !data ||
      (location.view !== 'themes' &&
        !inspecting &&
        !(location.view === 'emotions' && (comparisonRequested || location.selectedTheme !== null)))
    )
      return;
    if (themesCache.current) {
      setThemesState({ status: 'ready', index: themesCache.current });
      return;
    }
    const controller = new AbortController();
    setThemesState({ status: 'loading' });
    void loadQuranThemes(controller.signal)
      .then((index) => {
        if (controller.signal.aborted) return;
        themesCache.current = index;
        setThemesState({ status: 'ready', index });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setThemesState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify thematic evidence.',
        });
      });
    return () => {
      controller.abort();
    };
  }, [
    data,
    location.view,
    location.inspector,
    location.selectedTheme,
    comparisonRequested,
    themesAttempt,
    readingMode,
  ]);

  useEffect(() => {
    if (readingMode) return;
    const inspecting =
      (location.view === 'arcs' || location.view === 'threads') &&
      (location.inspector === 'emotions' || location.inspector === 'all');
    if (!data || (location.view !== 'emotions' && !inspecting)) return;
    if (emotionsCache.current) {
      setEmotionsState({ status: 'ready', index: emotionsCache.current });
      return;
    }
    const controller = new AbortController();
    setEmotionsState({ status: 'loading' });
    void loadQuranEmotions(controller.signal)
      .then((index) => {
        if (controller.signal.aborted) return;
        emotionsCache.current = index;
        setEmotionsState({ status: 'ready', index });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setEmotionsState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify ELQV annotations.',
        });
      });
    return () => {
      controller.abort();
    };
  }, [data, location.view, location.inspector, emotionsAttempt, readingMode]);

  const expressionIndex = expressionState.status === 'ready' ? expressionState.index : null;
  const candidate =
    data && location.selectedLink !== null && location.selectedLink < data.relationships.linkCount
      ? data.relationships.link(location.selectedLink)
      : null;
  const link =
    candidate &&
    data &&
    passesQuranRelationshipFilter(
      candidate,
      { scope: location.scope, surahs: new Set([location.reference.surah]) },
      data.relationships.versification,
    )
      ? candidate
      : null;
  const activeIndex = data?.relationships.versification.indexOf(location.reference);
  const focusStart = activeIndex ?? 0;
  const focusEnd =
    data && location.rangeEnd
      ? (data.relationships.versification.indexOf(location.rangeEnd) ?? focusStart)
      : focusStart;
  const focusedRange = useMemo(
    () => ({ start: focusStart, end: focusEnd }),
    [focusStart, focusEnd],
  );
  const selectedExpression =
    expressionIndex?.find(location.selectedExpression) ??
    expressionIndex?.forAyah(focusStart)[0]?.expression ??
    null;
  const navigateExpressionOccurrence = (ayahIndex: number) => {
    if (!data) return;
    navigate({
      ...location,
      reference: data.relationships.versification.refAt(ayahIndex),
      rangeEnd: null,
      selectedLink: null,
      selectedExpression: selectedExpression?.id ?? null,
    });
  };
  const activeSurah = getSurah(location.reference.surah);
  const defaultLink = quranLocationUrl(DEFAULT_QURAN_LOCATION, import.meta.env.BASE_URL);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#quran-main">
        Skip to Quran content
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <a href={defaultLink} className={styles.brandLink}>
            Quran Cross-References
          </a>
        </div>
        {offline && (
          <span className={styles.offlineLabel} role="status">
            Offline
          </span>
        )}
      </header>

      <main id="quran-main" className={styles.main} style={readingStyle}>
        <div className={styles.toolbar}>
          {!readingMode && (
            <div className={styles.viewTabs} role="group" aria-label="Visualization">
              {(['arcs', 'threads', 'analytics', 'network', 'themes', 'emotions'] as const).map(
                (view) => (
                  <button
                    key={view}
                    type="button"
                    className={location.view === view ? styles.activeTab : styles.tab}
                    aria-pressed={location.view === view}
                    onClick={() => {
                      if (view === location.view) return;
                      const isResearch =
                        view === 'network' || view === 'themes' || view === 'emotions';
                      navigate({
                        ...location,
                        view,
                        selectedTheme: view === 'emotions' ? null : location.selectedTheme,
                        themeAnalysis: view === 'themes' ? 'browse' : location.themeAnalysis,
                        selectedPattern: null,
                        evidence: isResearch ? 'curated' : location.evidence,
                        selectedExpression: isResearch ? null : location.selectedExpression,
                        selectedMorphTerm: isResearch ? null : location.selectedMorphTerm,
                        selectedMorphWord: isResearch ? null : location.selectedMorphWord,
                        selectedLink: isResearch ? null : location.selectedLink,
                        rangeEnd: isResearch ? null : location.rangeEnd,
                      });
                    }}
                  >
                    {view === 'arcs'
                      ? 'Arcs'
                      : view === 'threads'
                        ? 'Threads & Reader'
                        : view === 'analytics'
                          ? 'Analytics'
                          : view === 'network'
                            ? 'Network'
                            : view === 'themes'
                              ? 'Themes'
                              : 'Emotions'}
                  </button>
                ),
              )}
            </div>
          )}
          <div className={styles.toolbarFields}>
            {!readingMode &&
              location.view !== 'analytics' &&
              location.view !== 'network' &&
              location.view !== 'themes' &&
              location.view !== 'emotions' && (
                <label className={styles.field}>
                  <span>Evidence type</span>
                  <select
                    aria-label="Evidence type"
                    value={location.evidence}
                    onChange={(event) => {
                      const evidence = event.target.value;
                      if (
                        evidence === 'curated' ||
                        evidence === 'exact' ||
                        evidence === 'morphology'
                      ) {
                        navigate({
                          ...location,
                          evidence,
                          selectedLink: null,
                          selectedExpression: null,
                          selectedMorphTerm: null,
                          selectedMorphWord: null,
                          morphologyGrouping: 'lemma',
                        });
                      }
                    }}
                  >
                    <option value="curated">Curated similar passages</option>
                    <option value="exact">Computed exact Arabic phrases</option>
                    <option value="morphology">QAC annotated lemmas, roots and grammar</option>
                  </select>
                </label>
              )}
            <label className={styles.field}>
              <span>Surah</span>
              <select
                aria-label="Surah"
                value={location.reference.surah}
                onChange={(event) => {
                  changeSurah(Number(event.target.value));
                }}
              >
                {SURAHS.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.name}
                  </option>
                ))}
              </select>
            </label>
            <form
              className={styles.referenceForm}
              onSubmit={(event) => {
                event.preventDefault();
                const raw = new FormData(event.currentTarget).get('ref');
                const input = typeof raw === 'string' ? raw : '';
                const parsed = parseReference(input);
                if (!parsed.ok) {
                  setSearchError('Use a valid reference such as 2:255 or Al-Baqarah 255.');
                  return;
                }
                setSearchError(null);
                focus(parsed.reference);
              }}
            >
              <label className={styles.field}>
                <span>Ayah reference</span>
                <input
                  key={formatAyahId(location.reference)}
                  name="ref"
                  type="search"
                  aria-label="Ayah reference"
                  defaultValue={formatAyahId(location.reference)}
                  placeholder="2:255"
                />
              </label>
              <button className={styles.goButton} type="submit">
                Go
              </button>
            </form>
            {location.view === 'arcs' && location.evidence === 'curated' && (
              <label className={styles.field}>
                <span>Graph focus through ayah</span>
                <select
                  aria-label="Graph focus end ayah"
                  value={location.rangeEnd?.ayah ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    const rangeEnd =
                      value === ''
                        ? null
                        : { surah: location.reference.surah, ayah: Number(value) };
                    navigate({ ...location, rangeEnd, selectedLink: null });
                  }}
                >
                  <option value="">Selected ayah only</option>
                  {Array.from(
                    { length: activeSurah.ayahCount - location.reference.ayah },
                    (_, offset) => {
                      const ayah = location.reference.ayah + offset + 1;
                      return (
                        <option key={ayah} value={ayah}>
                          Through {ayah}
                        </option>
                      );
                    },
                  )}
                </select>
              </label>
            )}
            {!readingMode &&
              location.view !== 'analytics' &&
              location.view !== 'network' &&
              location.view !== 'themes' &&
              location.view !== 'emotions' &&
              location.evidence === 'curated' && (
                <label className={styles.field}>
                  <span>Relationships</span>
                  <select
                    aria-label="Relationship scope"
                    value={location.scope}
                    onChange={(event) => {
                      const scope = event.target.value;
                      if (scope === 'all' || scope === 'same-surah' || scope === 'cross-surah') {
                        navigate({ ...location, scope, selectedLink: null });
                      }
                    }}
                  >
                    <option value="all">All curated links</option>
                    <option value="same-surah">Within one surah</option>
                    <option value="cross-surah">Across surahs</option>
                  </select>
                </label>
              )}
            {!readingMode && location.view === 'threads' && location.evidence === 'curated' && (
              <label className={styles.field}>
                <span>Direction</span>
                <select
                  aria-label="Relationship direction"
                  value={location.direction}
                  onChange={(event) => {
                    const direction = event.target.value;
                    if (
                      direction === 'incoming' ||
                      direction === 'outgoing' ||
                      direction === 'both'
                    ) {
                      navigate({ ...location, direction });
                    }
                  }}
                >
                  <option value="both">Both</option>
                  <option value="outgoing">Outgoing</option>
                  <option value="incoming">Incoming</option>
                </select>
              </label>
            )}
          </div>
          {searchError && (
            <p role="alert" className={styles.searchError}>
              {searchError}
            </p>
          )}
        </div>

        {loadState.status === 'loading' && (
          <div className={styles.loading} role="status">
            Loading verified Quran text and relationships…
          </div>
        )}
        {loadState.status === 'error' && (
          <div className={styles.loading} role="alert">
            <p>{loadState.message}</p>
            <button
              type="button"
              className={styles.goButton}
              onClick={() => {
                setLoadState({ status: 'loading' });
                setAttempt((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        )}
        {data && (
          <>
            {location.view === 'threads' && (
              <QuranReadingControls
                preferences={readingPreferences}
                onChange={setReadingPreferences}
              />
            )}
            {readingMode && (
              <div className={styles.readingHeading}>
                <h1>
                  {activeSurah.name} · {formatAyahId(location.reference)}
                </h1>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    aria-label="Previous ayah"
                    disabled={activeIndex === undefined || activeIndex === 0}
                    onClick={() => {
                      if (activeIndex !== undefined && activeIndex > 0) {
                        focus(data.relationships.versification.refAt(activeIndex - 1));
                      }
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next ayah"
                    disabled={
                      activeIndex === undefined || activeIndex === data.relationships.ayahCount - 1
                    }
                    onClick={() => {
                      if (
                        activeIndex !== undefined &&
                        activeIndex < data.relationships.ayahCount - 1
                      ) {
                        focus(data.relationships.versification.refAt(activeIndex + 1));
                      }
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
            {location.view === 'threads' && !readingMode && (
              <QuranVerseSearch
                key={location.verseSearch ? JSON.stringify(location.verseSearch) : 'empty'}
                data={data}
                search={location.verseSearch}
                selectedAyah={activeIndex ?? null}
                onSearch={(verseSearch) => {
                  navigate({ ...location, verseSearch });
                }}
                onNavigate={focus}
              />
            )}
            {!readingMode &&
              location.view !== 'analytics' &&
              location.view !== 'network' &&
              location.view !== 'themes' &&
              location.view !== 'emotions' && (
                <section className={styles.focusCard} aria-label="Selected ayah">
                  <div className={styles.focusHeading}>
                    <div>
                      <p className={styles.eyebrow}>Selected passage</p>
                      <h1>
                        {activeSurah.name} · {formatAyahId(location.reference)}
                      </h1>
                    </div>
                    <div className={styles.focusActions}>
                      <button
                        className={styles.shareButton}
                        type="button"
                        aria-label="Share ayah"
                        onClick={() => {
                          const url = new URL(
                            quranLocationUrl(location, import.meta.env.BASE_URL),
                            window.location.origin,
                          ).href;
                          void shareQuranReference(
                            url,
                            activeSurah.name + ' ' + formatAyahId(location.reference),
                          ).then((result) => {
                            if (result === 'cancelled') return;
                            if (result === 'copied') setShareMessage('Ayah link copied');
                            else if (result === 'shared') setShareMessage('Ayah link shared');
                            else setShareMessage('Share this link: ' + url);
                          });
                        }}
                      >
                        Share ayah
                      </button>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label="Previous ayah"
                          disabled={activeIndex === 0}
                          onClick={() => {
                            if (activeIndex !== undefined && activeIndex > 0) {
                              focus(data.relationships.versification.refAt(activeIndex - 1));
                            }
                          }}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          aria-label="Next ayah"
                          disabled={
                            activeIndex === undefined ||
                            activeIndex === data.relationships.ayahCount - 1
                          }
                          onClick={() => {
                            if (
                              activeIndex !== undefined &&
                              activeIndex < data.relationships.ayahCount - 1
                            ) {
                              focus(data.relationships.versification.refAt(activeIndex + 1));
                            }
                          }}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  </div>
                  {shareMessage && (
                    <p className={styles.shareStatus} role="status">
                      {shareMessage}
                    </p>
                  )}
                  {activeIndex !== undefined && (
                    <>
                      {(location.view !== 'threads' ||
                        readingPreferences.language !== 'english') && (
                        <p className={styles.focusArabic} lang="ar" dir="rtl">
                          {data.text.arabic[activeIndex]}
                        </p>
                      )}
                      {(location.view !== 'threads' ||
                        readingPreferences.language !== 'arabic') && (
                        <p className={styles.focusEnglish} lang="en" dir="ltr">
                          {data.text.english[activeIndex]}
                        </p>
                      )}
                    </>
                  )}
                </section>
              )}
            {!readingMode &&
              (location.view === 'arcs' || location.view === 'threads') &&
              activeIndex !== undefined && (
                <QuranAyahEvidence
                  data={data}
                  ayahIndex={activeIndex}
                  section={location.inspector}
                  expressions={expressionState}
                  morphology={morphologyState}
                  themes={themesState}
                  emotions={emotionsState}
                  onSection={(inspector) => {
                    navigate({ ...location, inspector });
                  }}
                  onRetry={(source: Exclude<QuranInspectorSource, 'curated'>) => {
                    if (source === 'exact') {
                      setExpressionState({ status: 'loading' });
                      setExpressionAttempt((value) => value + 1);
                    } else if (source === 'morphology') {
                      setMorphologyState({ status: 'loading' });
                      setMorphologyAttempt((value) => value + 1);
                    } else if (source === 'themes') {
                      setThemesState({ status: 'loading' });
                      setThemesAttempt((value) => value + 1);
                    } else {
                      setEmotionsState({ status: 'loading' });
                      setEmotionsAttempt((value) => value + 1);
                    }
                  }}
                  onCuratedLink={(selectedLink) => {
                    navigate({
                      ...location,
                      view: 'arcs',
                      evidence: 'curated',
                      inspector: null,
                      scope: 'all',
                      rangeEnd: null,
                      selectedLink,
                      selectedExpression: null,
                      selectedMorphTerm: null,
                      selectedMorphWord: null,
                    });
                  }}
                  onExactExpression={(selectedExpression) => {
                    navigate({
                      ...location,
                      view: 'arcs',
                      evidence: 'exact',
                      inspector: null,
                      rangeEnd: null,
                      selectedLink: null,
                      selectedExpression,
                      selectedMorphTerm: null,
                      selectedMorphWord: null,
                    });
                  }}
                  onMorphologyWord={(selectedMorphWord, lemma, root) => {
                    navigate({
                      ...location,
                      view: 'arcs',
                      evidence: 'morphology',
                      inspector: null,
                      rangeEnd: null,
                      selectedLink: null,
                      selectedExpression: null,
                      morphologyGrouping: lemma === null && root !== null ? 'root' : 'lemma',
                      selectedMorphTerm: lemma ?? root,
                      selectedMorphWord,
                    });
                  }}
                  onTheme={(selectedTheme) => {
                    navigate({
                      ...location,
                      view: 'themes',
                      evidence: 'curated',
                      inspector: null,
                      rangeEnd: null,
                      selectedLink: null,
                      selectedExpression: null,
                      selectedMorphTerm: null,
                      selectedMorphWord: null,
                      selectedTheme,
                    });
                  }}
                  onEmotion={(selectedEmotion) => {
                    navigate({
                      ...location,
                      view: 'emotions',
                      evidence: 'curated',
                      inspector: null,
                      rangeEnd: null,
                      selectedLink: null,
                      selectedExpression: null,
                      selectedMorphTerm: null,
                      selectedMorphWord: null,
                      selectedTheme: null,
                      selectedEmotion,
                    });
                  }}
                />
              )}
            {location.view === 'analytics' && (
              <>
                {(analyticsState.status === 'loading' || analyticsState.status === 'idle') && (
                  <p className={styles.loading} role="status">
                    Loading verified Quran analytics…
                  </p>
                )}
                {analyticsState.status === 'error' && (
                  <section className={styles.analyticsPanel} role="alert">
                    <p className={styles.empty}>{analyticsState.message}</p>
                    <button
                      type="button"
                      className={styles.goButton}
                      onClick={() => {
                        setAnalyticsState({ status: 'loading' });
                        setAnalyticsAttempt((value) => value + 1);
                      }}
                    >
                      Retry analytics
                    </button>
                  </section>
                )}
                {analyticsState.status === 'ready' && (
                  <QuranAnalytics
                    report={analyticsState.report}
                    selectedSurah={location.reference.surah}
                    onOpenSurah={(_surah, metric, firstAyah) => {
                      navigate({
                        ...location,
                        view: 'arcs',
                        evidence: metric === 'curated' ? 'curated' : 'exact',
                        reference: data.relationships.versification.refAt(firstAyah),
                        rangeEnd: null,
                        selectedLink: null,
                        selectedExpression: null,
                        scope: 'all',
                      });
                    }}
                    onOpenExpression={(id, firstAyah) => {
                      navigate({
                        ...location,
                        view: 'arcs',
                        evidence: 'exact',
                        reference: data.relationships.versification.refAt(firstAyah),
                        rangeEnd: null,
                        selectedLink: null,
                        selectedExpression: id,
                        scope: 'all',
                      });
                    }}
                  />
                )}
              </>
            )}
            {location.view === 'themes' && (
              <>
                {(themesState.status === 'idle' || themesState.status === 'loading') && (
                  <p className={styles.loading} role="status">
                    Loading independently pinned experimental Quran themes…
                  </p>
                )}
                {themesState.status === 'error' && (
                  <section className={styles.analyticsPanel} role="alert">
                    <p className={styles.empty}>{themesState.message}</p>
                    <button
                      type="button"
                      className={styles.goButton}
                      onClick={() => {
                        setThemesState({ status: 'loading' });
                        setThemesAttempt((value) => value + 1);
                      }}
                    >
                      Retry themes
                    </button>
                  </section>
                )}
                {themesState.status === 'ready' &&
                  (location.themeAnalysis === 'language' ? (
                    <QuranThemeLanguage
                      themes={themesState.index}
                      data={data}
                      selectedTheme={location.selectedTheme}
                      kind={location.patternKind}
                      featureId={location.selectedPattern}
                      morphology={morphologyState}
                      expressions={expressionState}
                      onTheme={(selectedTheme) => {
                        navigate({ ...location, selectedTheme, selectedPattern: null });
                      }}
                      onKind={(patternKind) => {
                        navigate({ ...location, patternKind, selectedPattern: null });
                      }}
                      onFeature={(selectedPattern) => {
                        navigate({ ...location, selectedPattern });
                      }}
                      onOpenSource={(feature: ThemeLanguageFeature, ayah: number) => {
                        const exact = location.patternKind === 'exact';
                        navigate({
                          ...location,
                          view: exact ? 'arcs' : 'threads',
                          evidence: exact ? 'exact' : 'morphology',
                          inspector: null,
                          reference: data.relationships.versification.refAt(ayah),
                          rangeEnd: null,
                          selectedLink: null,
                          selectedExpression: exact ? feature.id : null,
                          morphologyGrouping: location.patternKind === 'root' ? 'root' : 'lemma',
                          selectedMorphTerm: exact ? null : feature.id,
                          selectedMorphWord: null,
                        });
                      }}
                      onOpenAyah={(ayah) => {
                        navigate({
                          ...location,
                          view: 'threads',
                          evidence: 'curated',
                          inspector: null,
                          reference: data.relationships.versification.refAt(ayah),
                          rangeEnd: null,
                          selectedLink: null,
                          selectedExpression: null,
                          selectedMorphTerm: null,
                          selectedMorphWord: null,
                        });
                      }}
                      onBack={() => {
                        navigate({ ...location, themeAnalysis: 'browse', selectedPattern: null });
                      }}
                      onRetry={() => {
                        if (location.patternKind === 'exact') {
                          setExpressionState({ status: 'loading' });
                          setExpressionAttempt((value) => value + 1);
                        } else {
                          setMorphologyState({ status: 'loading' });
                          setMorphologyAttempt((value) => value + 1);
                        }
                      }}
                    />
                  ) : (
                    <QuranThemes
                      index={themesState.index}
                      data={data}
                      selectedName={location.selectedTheme}
                      focusSurah={location.reference.surah}
                      onSelect={(selectedTheme) => {
                        navigate({ ...location, selectedTheme });
                      }}
                      onAnalyze={(selectedTheme) => {
                        navigate({
                          ...location,
                          selectedTheme,
                          themeAnalysis: 'language',
                          patternKind: 'root',
                          selectedPattern: null,
                        });
                      }}
                      onOpenAyah={(ayah) => {
                        navigate({
                          ...location,
                          view: 'threads',
                          evidence: 'curated',
                          reference: data.relationships.versification.refAt(ayah),
                          rangeEnd: null,
                          selectedLink: null,
                          selectedExpression: null,
                          selectedMorphTerm: null,
                          selectedMorphWord: null,
                        });
                      }}
                    />
                  ))}
              </>
            )}
            {location.view === 'emotions' && (
              <>
                {(emotionsState.status === 'idle' || emotionsState.status === 'loading') && (
                  <p className={styles.loading} role="status">
                    Loading independently verified ELQV research annotations…
                  </p>
                )}
                {emotionsState.status === 'error' && (
                  <section className={styles.analyticsPanel} role="alert">
                    <p className={styles.empty}>{emotionsState.message}</p>
                    <button
                      type="button"
                      className={styles.goButton}
                      onClick={() => {
                        setEmotionsState({ status: 'loading' });
                        setEmotionsAttempt((value) => value + 1);
                      }}
                    >
                      Retry emotion data
                    </button>
                  </section>
                )}
                {emotionsState.status === 'ready' && (
                  <QuranEmotions
                    index={emotionsState.index}
                    data={data}
                    filter={location.selectedEmotion}
                    selectedTheme={location.selectedTheme}
                    themeIndex={themesState.status === 'ready' ? themesState.index : null}
                    themeLoading={themesState.status === 'loading'}
                    themeError={themesState.status === 'error' ? themesState.message : null}
                    focusSurah={location.reference.surah}
                    onRequestThemes={() => {
                      setComparisonRequested(true);
                      if (themesState.status === 'error') {
                        setThemesState({ status: 'loading' });
                        setThemesAttempt((value) => value + 1);
                      }
                    }}
                    onChangeFilter={(selectedEmotion) => {
                      navigate({ ...location, selectedEmotion });
                    }}
                    onChangeTheme={(selectedTheme) => {
                      navigate({ ...location, selectedTheme });
                    }}
                    onOpenAyah={(ayah) => {
                      navigate({
                        ...location,
                        view: 'threads',
                        evidence: 'curated',
                        reference: data.relationships.versification.refAt(ayah),
                        rangeEnd: null,
                        selectedLink: null,
                        selectedExpression: null,
                        selectedMorphTerm: null,
                        selectedMorphWord: null,
                      });
                    }}
                  />
                )}
              </>
            )}
            {location.view === 'network' && (
              <>
                {(topologyState.status === 'loading' || topologyState.status === 'idle') && (
                  <p className={styles.loading} role="status">
                    Loading verified curated graph topology…
                  </p>
                )}
                {topologyState.status === 'error' && (
                  <section className={styles.topologyPanel} role="alert">
                    <p className={styles.empty}>{topologyState.message}</p>
                    <button
                      type="button"
                      className={styles.goButton}
                      onClick={() => {
                        setTopologyState({ status: 'loading' });
                        setTopologyAttempt((value) => value + 1);
                      }}
                    >
                      Retry network
                    </button>
                  </section>
                )}
                {topologyState.status === 'ready' && (
                  <QuranTopology
                    report={topologyState.report}
                    relationships={data.relationships}
                    focus={focusStart}
                    direction={location.direction}
                    mode={location.networkMode}
                    depth={location.networkDepth}
                    onDirection={(direction) => {
                      navigate({ ...location, direction });
                    }}
                    onMode={(networkMode) => {
                      navigate({
                        ...location,
                        networkMode,
                        networkDepth: networkMode === 'surah' ? 1 : location.networkDepth,
                      });
                    }}
                    onDepth={(networkDepth) => {
                      navigate({ ...location, networkMode: 'ayah', networkDepth });
                    }}
                    onFocusSurah={(surah) => {
                      navigate({
                        ...location,
                        reference: { surah, ayah: 1 },
                        rangeEnd: null,
                        selectedLink: null,
                      });
                    }}
                    onFocusAyah={(ayah) => {
                      navigate({
                        ...location,
                        networkMode: 'ayah',
                        reference: data.relationships.versification.refAt(ayah),
                        rangeEnd: null,
                        selectedLink: null,
                      });
                    }}
                    onOpenLink={(id) => {
                      const selected = data.relationships.link(id);
                      navigate({
                        ...location,
                        view: 'arcs',
                        evidence: 'curated',
                        scope: 'all',
                        reference: data.relationships.versification.refAt(selected.source.start),
                        rangeEnd: null,
                        selectedLink: id,
                        selectedExpression: null,
                      });
                    }}
                    onReadAyah={(ayah) => {
                      navigate({
                        ...location,
                        view: 'threads',
                        evidence: 'curated',
                        reference: data.relationships.versification.refAt(ayah),
                        rangeEnd: null,
                        selectedLink: null,
                        selectedExpression: null,
                      });
                    }}
                    onOpenExact={() => {
                      navigate({
                        ...location,
                        view: 'arcs',
                        evidence: 'exact',
                        selectedLink: null,
                        selectedExpression: null,
                        rangeEnd: null,
                      });
                    }}
                    surahHref={(surah) =>
                      quranLocationUrl(
                        {
                          ...location,
                          reference: { surah, ayah: 1 },
                          rangeEnd: null,
                          selectedLink: null,
                        },
                        import.meta.env.BASE_URL,
                      )
                    }
                    ayahHref={(ayah) =>
                      quranLocationUrl(
                        {
                          ...location,
                          networkMode: 'ayah',
                          reference: data.relationships.versification.refAt(ayah),
                          rangeEnd: null,
                          selectedLink: null,
                        },
                        import.meta.env.BASE_URL,
                      )
                    }
                  />
                )}
              </>
            )}
            {!readingMode &&
              location.view !== 'analytics' &&
              location.view !== 'network' &&
              location.view !== 'themes' &&
              location.view !== 'emotions' &&
              location.evidence === 'morphology' && (
                <>
                  {(morphologyState.status === 'idle' || morphologyState.status === 'loading') && (
                    <p className={styles.loading} role="status">
                      Loading and verifying Quranic Arabic Corpus morphology…
                    </p>
                  )}
                  {morphologyState.status === 'error' && (
                    <section className={styles.qacPanel} role="alert">
                      <p className={styles.empty}>{morphologyState.message}</p>
                      <button
                        type="button"
                        className={styles.goButton}
                        onClick={() => {
                          setMorphologyState({ status: 'loading' });
                          setMorphologyAttempt((value) => value + 1);
                        }}
                      >
                        Retry morphology
                      </button>
                    </section>
                  )}
                  {morphologyState.status === 'ready' && (
                    <QuranMorphology
                      index={morphologyState.index}
                      ayahIndex={focusStart}
                      grouping={location.morphologyGrouping}
                      selectedTerm={location.selectedMorphTerm}
                      selectedWord={location.selectedMorphWord}
                      onGroup={(morphologyGrouping) => {
                        navigate({
                          ...location,
                          morphologyGrouping,
                          selectedMorphTerm: null,
                          selectedMorphWord: null,
                        });
                      }}
                      onSelect={(selectedMorphTerm, selectedMorphWord) => {
                        navigate({
                          ...location,
                          selectedMorphTerm,
                          selectedMorphWord,
                          selectedExpression: null,
                          selectedLink: null,
                        });
                      }}
                      onOccurrence={(ayah, word) => {
                        navigate({
                          ...location,
                          reference: data.relationships.versification.refAt(ayah),
                          selectedMorphWord: word,
                          rangeEnd: null,
                          selectedLink: null,
                          selectedExpression: null,
                        });
                      }}
                    />
                  )}
                </>
              )}
            {!readingMode &&
              location.view !== 'analytics' &&
              location.view !== 'network' &&
              location.view !== 'themes' &&
              location.view !== 'emotions' &&
              location.evidence === 'exact' && (
                <>
                  {(expressionState.status === 'idle' || expressionState.status === 'loading') && (
                    <p className={styles.loading} role="status">
                      Loading and checking exact Arabic expression evidence…
                    </p>
                  )}
                  {expressionState.status === 'error' && (
                    <section className={styles.expressionCard} role="alert">
                      <p className={styles.empty}>{expressionState.message}</p>
                      <button
                        type="button"
                        className={styles.goButton}
                        onClick={() => {
                          setExpressionState({ status: 'loading' });
                          setExpressionAttempt((value) => value + 1);
                        }}
                      >
                        Retry expressions
                      </button>
                    </section>
                  )}
                  {expressionIndex && (
                    <QuranExpressions
                      index={expressionIndex}
                      ayahIndex={focusStart}
                      selected={selectedExpression}
                      onSelect={(id) => {
                        navigate({ ...location, selectedExpression: id, selectedLink: null });
                      }}
                      onNavigate={navigateExpressionOccurrence}
                    />
                  )}
                </>
              )}

            {location.view !== 'analytics' &&
              location.view !== 'network' &&
              location.view !== 'themes' &&
              location.view !== 'emotions' &&
              (readingMode ? (
                <QuranThreads
                  data={data}
                  reference={location.reference}
                  scope={location.scope}
                  direction={location.direction}
                  onNavigate={focus}
                  readerOnly
                  displayLanguage={readingPreferences.language}
                />
              ) : location.evidence === 'morphology' ? (
                location.view === 'threads' ? (
                  <QuranThreads
                    data={data}
                    reference={location.reference}
                    scope={location.scope}
                    direction={location.direction}
                    onNavigate={focus}
                    showCurated={false}
                    displayLanguage={readingPreferences.language}
                  />
                ) : null
              ) : location.evidence === 'exact' ? (
                location.view === 'arcs' ? (
                  selectedExpression && (
                    <QuranExpressionGraph
                      key={selectedExpression.id}
                      expression={selectedExpression}
                      ayahIndex={focusStart}
                      onNavigate={navigateExpressionOccurrence}
                    />
                  )
                ) : (
                  <QuranThreads
                    data={data}
                    reference={location.reference}
                    scope={location.scope}
                    direction={location.direction}
                    onNavigate={focus}
                    showCurated={false}
                    displayLanguage={readingPreferences.language}
                  />
                )
              ) : location.view === 'arcs' ? (
                <>
                  <QuranArcs
                    index={data.relationships}
                    surah={location.reference.surah}
                    scope={location.scope}
                    focus={focusedRange}
                    selectedId={link?.id ?? null}
                    onSelect={(id) => {
                      navigate({ ...location, selectedLink: id });
                    }}
                    onNavigate={focus}
                  />
                  {link && (
                    <section className={styles.linkDetail} aria-live="polite">
                      <h2>Selected relationship</h2>
                      <div className={styles.linkPair}>
                        <button
                          type="button"
                          onClick={() => {
                            focus(data.relationships.versification.refAt(link.source.start));
                          }}
                        >
                          Source:{' '}
                          {formatIndexRange(
                            data.relationships.versification,
                            link.source.start,
                            link.source.end,
                          )}
                        </button>
                        <span aria-hidden="true">→</span>
                        <button
                          type="button"
                          onClick={() => {
                            focus(data.relationships.versification.refAt(link.target.start));
                          }}
                        >
                          Target:{' '}
                          {formatIndexRange(
                            data.relationships.versification,
                            link.target.start,
                            link.target.end,
                          )}
                        </button>
                      </div>
                      <p>
                        Original dataset context-after value: {link.contextAfter}. No votes or
                        similarity strength are inferred.
                      </p>
                      <button
                        className={styles.goButton}
                        type="button"
                        onClick={() => {
                          navigate({
                            ...location,
                            view: 'threads',
                            reference: data.relationships.versification.refAt(link.source.start),
                            rangeEnd: null,
                            selectedLink: null,
                          });
                        }}
                      >
                        Read in Threads
                      </button>
                    </section>
                  )}
                </>
              ) : (
                <QuranThreads
                  data={data}
                  reference={location.reference}
                  scope={location.scope}
                  direction={location.direction}
                  onNavigate={focus}
                  displayLanguage={readingPreferences.language}
                />
              ))}
          </>
        )}
      </main>
      <footer className={styles.footer}>
        <p>
          Arabic text © <a href="https://tanzil.net/docs/Text_License">Tanzil Project</a>, Uthmani
          v1.1, reproduced without modification. English: Marmaduke Pickthall (1930), Tanzil digital
          edition. Curated similar passages:{' '}
          <a href="https://github.com/Waqar144/Quran_Mutashabihat_Data">
            Waqar144 Mutashabihat Data
          </a>{' '}
          (CC0). Original Arabic morphology:{' '}
          <a href="https://corpus.quran.com">Quranic Arabic Corpus © 2011 Kais Dukes</a> (v0.4
          annotation).
          <a href={import.meta.env.BASE_URL + 'data/quran/manifest.json'}>
            {' '}
            Verified dataset provenance
          </a>
          .
        </p>
        <p>
          Relationships indicate upstream textual similarities only, not verified theological
          interpretations.
        </p>
      </footer>
    </div>
  );
}
