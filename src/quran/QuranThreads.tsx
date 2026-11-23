import { useEffect, useMemo, useRef } from 'react';
import type { AyahRef } from '../core/quran/ayah-ref.ts';
import { collectQuranConnections, type QuranConnection } from '../core/quran/graph-adapters.ts';
import { formatIndexRange } from '../core/quran/reference.ts';
import type { QuranRelationshipScope } from '../core/quran/relationship-filter.ts';
import { getSurah } from '../core/quran/surahs.ts';
import type { QuranReaderData } from './model.ts';
import type { QuranDirection } from './location.ts';
import type { ReadingLanguage } from './reading-preferences.ts';
import styles from './QuranApp.module.css';

interface QuranThreadsProps {
  readonly data: QuranReaderData;
  readonly reference: AyahRef;
  readonly scope: QuranRelationshipScope;
  readonly direction: QuranDirection;
  readonly onNavigate: (reference: AyahRef) => void;
  readonly showCurated?: boolean;
  readonly readerOnly?: boolean;
  readonly displayLanguage?: ReadingLanguage;
}

function connectionLabel(connection: QuranConnection, data: QuranReaderData): string {
  return formatIndexRange(
    data.relationships.versification,
    connection.other.start,
    connection.other.end,
  );
}

export function QuranThreads({
  data,
  reference,
  scope,
  direction,
  onNavigate,
  showCurated = true,
  readerOnly = false,
  displayLanguage = 'bilingual',
}: QuranThreadsProps) {
  const { relationships: index, text } = data;
  const surah = getSurah(reference.surah);
  const range = index.versification.surahRange(reference.surah);
  const focused = index.versification.indexOf(reference) ?? range.start;
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const element = selectedRef.current;
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [reference.surah, reference.ayah, readerOnly]);
  const connections = useMemo(
    () => collectQuranConnections(index, { start: focused, end: focused }, { scope, surahs: null }),
    [index, focused, scope],
  );
  const visible = [
    ...(direction !== 'incoming' ? connections.outgoing : []),
    ...(direction !== 'outgoing' ? connections.incoming : []),
  ];
  const markers = visible.slice(0, 80);

  return (
    <section
      className={
        readerOnly
          ? styles.readingOnlyLayout
          : showCurated
            ? styles.threadsLayout
            : styles.expressionsReaderLayout
      }
      aria-label={
        readerOnly
          ? 'Distraction-free Quran reader'
          : showCurated
            ? 'Quran text and relationship threads'
            : 'Quran text and exact expressions'
      }
    >
      <div className={styles.reader}>
        <div className={styles.panelHeading}>
          <h2>
            {surah.name}{' '}
            {displayLanguage !== 'english' && (
              <span lang="ar" dir="rtl">
                {surah.arabicName}
              </span>
            )}
          </h2>
          <p>
            {surah.ayahCount} ayahs ·{' '}
            {readerOnly ? 'Select an ayah to continue reading' : 'Select any ayah to explore its connections'}
          </p>
        </div>
        <ol className={styles.ayahList} start={1}>
          {Array.from({ length: surah.ayahCount }, (_, offset) => {
            const ayah = offset + 1;
            const position = range.start + offset;
            const active = ayah === reference.ayah;
            return (
              <li
                key={ayah}
                ref={active ? selectedRef : null}
                id={'quran-ayah-' + String(reference.surah) + '-' + String(ayah)}
                className={active ? styles.selectedAyah : styles.ayah}
              >
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  className={styles.ayahButton}
                  onClick={() => {
                    onNavigate({ surah: reference.surah, ayah });
                  }}
                >
                  <span className={styles.ayahNumber}>
                    {reference.surah}:{ayah}
                  </span>
                  {displayLanguage !== 'english' && (
                    <span lang="ar" dir="rtl" className={styles.arabic}>
                      {text.arabic[position]}
                    </span>
                  )}
                  {displayLanguage !== 'arabic' && (
                    <span lang="en" dir="ltr" className={styles.english}>
                      {text.english[position]}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {!readerOnly && (
        <aside
        className={styles.threadPanel}
        aria-label="Selected ayah relationships"
        hidden={!showCurated}
      >
        <div className={styles.panelHeading}>
          <h2>
            Threads from {reference.surah}:{reference.ayah}
          </h2>
          <p>
            {visible.length} curated connections ·{' '}
            {direction === 'both' ? 'Both directions' : direction}
          </p>
        </div>
        {visible.length === 0 ? (
          <p className={styles.empty}>
            No relationships in this dataset match your current filters.
          </p>
        ) : (
          <>
            <svg
              viewBox="0 0 320 250"
              className={styles.threadMap}
              aria-label="Positions of related passages in the Quran"
              role="img"
            >
              <line x1="24" y1="10" x2="24" y2="240" className={styles.axis} />
              <line x1="296" y1="10" x2="296" y2="240" className={styles.axis} />
              {markers.map((connection) => {
                const other = (connection.other.start + connection.other.end) / 2;
                const y = 10 + (other / (index.ayahCount - 1)) * 230;
                const outgoing = connection.direction === 'outgoing';
                return (
                  <path
                    key={connection.direction + String(connection.link.id)}
                    d={`M 24 125 C 155 125 165 ${y} 296 ${y}`}
                    fill="none"
                    stroke={outgoing ? '#64c4b1' : '#d7ac7c'}
                    strokeWidth="1.6"
                    opacity="0.68"
                  />
                );
              })}
              <circle cx="24" cy="125" r="5" fill="#f2e5cb" />
              <text x="24" y="247" textAnchor="middle" className={styles.threadMapLabel}>
                Here
              </text>
            </svg>
            <ol className={styles.connectionList}>
              {visible.map((connection) => {
                const otherRef = index.versification.refAt(connection.other.start);
                return (
                  <li key={connection.direction + String(connection.link.id)}>
                    <button
                      type="button"
                      className={styles.connectionButton}
                      onClick={() => {
                        onNavigate(otherRef);
                      }}
                    >
                      <span className={styles.connectionHeading}>
                        <span>{connection.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}</span>
                        <strong>{connectionLabel(connection, data)}</strong>
                      </span>
                      <span className={styles.connectionPreview} lang="en" dir="ltr">
                        {text.english[connection.other.start]}
                      </span>
                      {connection.link.contextAfter > 0 && (
                        <small>Source context after: {connection.link.contextAfter} ayahs</small>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        </aside>
      )}
    </section>
  );
}
