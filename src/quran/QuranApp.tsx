import { useCallback, useEffect, useState } from 'react';
import { formatAyahId, type AyahRef } from '../core/quran/ayah-ref.ts';
import { formatIndexRange, parseReference } from '../core/quran/reference.ts';
import { SURAHS, getSurah } from '../core/quran/surahs.ts';
import { QuranArcs } from './QuranArcs.tsx';
import { QuranThreads } from './QuranThreads.tsx';
import {
  DEFAULT_QURAN_LOCATION,
  parseQuranLocation,
  quranLocationUrl,
  type QuranLocation,
} from './location.ts';
import { loadQuranReaderData, type QuranReaderData } from './model.ts';
import styles from './QuranApp.module.css';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly data: QuranReaderData };

function useQuranLocation(): readonly [
  QuranLocation,
  (next: QuranLocation, replace?: boolean) => void,
] {
  const [location, setLocation] = useState(() => parseQuranLocation(new URL(window.location.href)));
  useEffect(() => {
    const onPopState = () => setLocation(parseQuranLocation(new URL(window.location.href)));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
  return { ...location, reference };
}

export function QuranApp() {
  const [location, navigate] = useQuranLocation();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<{ readonly id: number; readonly surah: number; readonly scope: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

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
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    document.title = getSurah(location.reference.surah).name + ' ' +
      formatAyahId(location.reference) + ' · Quran Cross-References';
  }, [location.reference]);

  const focus = (reference: AyahRef) => navigate(linkReference(location, reference));
  const changeSurah = (surah: number) => focus({ surah, ayah: 1 });
  const selectedId =
    selected?.surah === location.reference.surah && selected.scope === location.scope
      ? selected.id
      : null;
  const data = loadState.status === 'ready' ? loadState.data : null;
  const link = selectedId === null || !data ? null : data.relationships.link(selectedId);
  const activeIndex = data?.relationships.versification.indexOf(location.reference);
  const activeSurah = getSurah(location.reference.surah);
  const defaultLink = quranLocationUrl(DEFAULT_QURAN_LOCATION, import.meta.env.BASE_URL);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <a href={defaultLink} className={styles.brandLink}>Quran Cross-References</a>
          <span className={styles.previewLabel}>Preview · Phase 1C</span>
        </div>
        <a className={styles.legacyLink} href={import.meta.env.BASE_URL}>Bible Explorer</a>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.viewTabs} role="group" aria-label="Visualization">
            {(['arcs', 'threads'] as const).map((view) => (
              <button
                key={view}
                type="button"
                className={location.view === view ? styles.activeTab : styles.tab}
                aria-pressed={location.view === view}
                onClick={() => navigate({ ...location, view })}
              >
                {view === 'arcs' ? 'Arcs' : 'Threads & Reader'}
              </button>
            ))}
          </div>
          <div className={styles.toolbarFields}>
            <label className={styles.field}>
              <span>Surah</span>
              <select
                aria-label="Surah"
                value={location.reference.surah}
                onChange={(event) => changeSurah(Number(event.target.value))}
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
              <button className={styles.goButton} type="submit">Go</button>
            </form>
            <label className={styles.field}>
              <span>Relationships</span>
              <select
                aria-label="Relationship scope"
                value={location.scope}
                onChange={(event) => {
                  const scope = event.target.value;
                  if (scope === 'all' || scope === 'same-surah' || scope === 'cross-surah') {
                    navigate({ ...location, scope });
                  }
                }}
              >
                <option value="all">All curated links</option>
                <option value="same-surah">Within one surah</option>
                <option value="cross-surah">Across surahs</option>
              </select>
            </label>
            {location.view === 'threads' && (
              <label className={styles.field}>
                <span>Direction</span>
                <select
                  aria-label="Relationship direction"
                  value={location.direction}
                  onChange={(event) => {
                    const direction = event.target.value;
                    if (direction === 'incoming' || direction === 'outgoing' || direction === 'both') {
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
          {searchError && <p role="alert" className={styles.searchError}>{searchError}</p>}
        </div>

        {loadState.status === 'loading' && (
          <div className={styles.loading} role="status">Loading verified Quran text and relationships…</div>
        )}
        {loadState.status === 'error' && (
          <div className={styles.loading} role="alert">
            <p>{loadState.message}</p>
            <button type="button" className={styles.goButton} onClick={() => {
              setLoadState({ status: 'loading' });
              setAttempt((value) => value + 1);
            }}>Retry</button>
          </div>
        )}
        {data && (
          <>
            <section className={styles.focusCard} aria-label="Selected ayah">
              <div className={styles.focusHeading}>
                <div>
                  <p className={styles.eyebrow}>Selected passage</p>
                  <h1>{activeSurah.name} · {formatAyahId(location.reference)}</h1>
                </div>
                <div className={styles.stepper}>
                  <button type="button" aria-label="Previous ayah" disabled={activeIndex === 0} onClick={() => {
                    if (activeIndex !== undefined && activeIndex > 0) {
                      focus(data.relationships.versification.refAt(activeIndex - 1));
                    }
                  }}>‹</button>
                  <button type="button" aria-label="Next ayah" disabled={activeIndex === undefined || activeIndex === data.relationships.ayahCount - 1} onClick={() => {
                    if (activeIndex !== undefined && activeIndex < data.relationships.ayahCount - 1) {
                      focus(data.relationships.versification.refAt(activeIndex + 1));
                    }
                  }}>›</button>
                </div>
              </div>
              {activeIndex !== undefined && (
                <>
                  <p className={styles.focusArabic} lang="ar" dir="rtl">{data.text.arabic[activeIndex]}</p>
                  <p className={styles.focusEnglish} lang="en" dir="ltr">{data.text.english[activeIndex]}</p>
                </>
              )}
            </section>

            {location.view === 'arcs' ? (
              <>
                <QuranArcs
                  index={data.relationships}
                  surah={location.reference.surah}
                  scope={location.scope}
                  selectedId={selectedId}
                  onSelect={(id) => setSelected({ id, surah: location.reference.surah, scope: location.scope })}
                />
                {link && (
                  <section className={styles.linkDetail} aria-live="polite">
                    <h2>Selected relationship</h2>
                    <div className={styles.linkPair}>
                      <button type="button" onClick={() => focus(data.relationships.versification.refAt(link.source.start))}>
                        Source: {formatIndexRange(data.relationships.versification, link.source.start, link.source.end)}
                      </button>
                      <span aria-hidden="true">↔</span>
                      <button type="button" onClick={() => focus(data.relationships.versification.refAt(link.target.start))}>
                        Target: {formatIndexRange(data.relationships.versification, link.target.start, link.target.end)}
                      </button>
                    </div>
                    <p>Original dataset context-after value: {link.contextAfter}. No votes or similarity strength are inferred.</p>
                    <button className={styles.goButton} type="button" onClick={() =>
                      navigate({ ...location, view: 'threads', reference: data.relationships.versification.refAt(link.source.start) })
                    }>Read in Threads</button>
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
        <p>Arabic text © <a href="https://tanzil.net/docs/Text_License">Tanzil Project</a>, Uthmani v1.1, reproduced without modification.
          English: Marmaduke Pickthall (1930), Tanzil digital edition.
          Curated similar passages: <a href="https://github.com/Waqar144/Quran_Mutashabihat_Data">Waqar144 Mutashabihat Data</a> (CC0).</p>
        <p>Relationships indicate upstream textual similarities only, not verified theological interpretations. This is a preview; the Bible application remains the default.</p>
      </footer>
    </div>
  );
}
