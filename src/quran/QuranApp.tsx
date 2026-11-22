import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { formatIndexRange, parseReference } from '../core/quran/reference.ts';
import { passesQuranRelationshipFilter } from '../core/quran/relationship-filter.ts';
import { SURAHS, getSurah } from '../core/quran/surahs.ts';
import { QuranArcs } from './QuranArcs.tsx';
import { QuranExpressionGraph } from './QuranExpressionGraph.tsx';
import { QuranExpressions } from './QuranExpressions.tsx';
import { QuranThreads } from './QuranThreads.tsx';
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
  return { ...location, reference, rangeEnd: null, selectedLink: null, selectedExpression: null };
}

export function QuranApp() {
  const [location, navigate] = useQuranLocation();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [expressionState, setExpressionState] = useState<ExpressionLoadState>({ status: 'idle' });
  const [expressionAttempt, setExpressionAttempt] = useState(0);

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

  useEffect(() => {
    if (!data || location.evidence !== 'exact') return;
    const controller = new AbortController();
    void loadQuranExpressions(data.text.arabic, controller.signal)
      .then((index) => {
        if (!controller.signal.aborted) setExpressionState({ status: 'ready', index });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setExpressionState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to verify expressions.',
          });
        }
      });
    return () => {
      controller.abort();
    };
  }, [data, location.evidence, expressionAttempt]);

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

      <main id="quran-main" className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.viewTabs} role="group" aria-label="Visualization">
            {(['arcs', 'threads'] as const).map((view) => (
              <button
                key={view}
                type="button"
                className={location.view === view ? styles.activeTab : styles.tab}
                aria-pressed={location.view === view}
                onClick={() => {
                  navigate({ ...location, view });
                }}
              >
                {view === 'arcs' ? 'Arcs' : 'Threads & Reader'}
              </button>
            ))}
          </div>
          <div className={styles.toolbarFields}>
            <label className={styles.field}>
              <span>Evidence type</span>
              <select
                aria-label="Evidence type"
                value={location.evidence}
                onChange={(event) => {
                  const evidence = event.target.value;
                  if (evidence === 'curated' || evidence === 'exact') {
                    setExpressionState({ status: 'idle' });
                    navigate({
                      ...location,
                      evidence,
                      selectedLink: null,
                      selectedExpression: null,
                    });
                  }
                }}
              >
                <option value="curated">Curated similar passages</option>
                <option value="exact">Computed exact Arabic phrases</option>
              </select>
            </label>
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
            {location.evidence === 'curated' && (
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
            {location.view === 'threads' && location.evidence === 'curated' && (
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
                  <p className={styles.focusArabic} lang="ar" dir="rtl">
                    {data.text.arabic[activeIndex]}
                  </p>
                  <p className={styles.focusEnglish} lang="en" dir="ltr">
                    {data.text.english[activeIndex]}
                  </p>
                </>
              )}
            </section>

            {location.evidence === 'exact' && (
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

            {location.evidence === 'exact' ? (
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
              />
            )}
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
          (CC0).
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
