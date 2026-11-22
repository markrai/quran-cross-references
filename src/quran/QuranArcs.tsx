import { useMemo } from 'react';
import { elementAt } from '../core/lib/array.ts';
import { buildQuranArcGeometry, selectQuranRelationshipIds } from '../core/quran/graph-adapters.ts';
import { formatIndexRange } from '../core/quran/reference.ts';
import type { QuranRelationshipScope } from '../core/quran/relationship-filter.ts';
import type { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { SURAHS } from '../core/quran/surahs.ts';
import styles from './QuranApp.module.css';

interface QuranArcsProps {
  readonly index: QuranRelationshipIndex;
  readonly surah: number;
  readonly scope: QuranRelationshipScope;
  readonly selectedId: number | null;
  readonly onSelect: (id: number) => void;
}

const AXIS_LEFT = 35;
const AXIS_WIDTH = 1130;
const AXIS_Y = 355;

function xOf(index: number, count: number): number {
  return AXIS_LEFT + (index / count) * AXIS_WIDTH;
}

export function QuranArcs({ index, surah, scope, selectedId, onSelect }: QuranArcsProps) {
  const ids = useMemo(
    () => selectQuranRelationshipIds(index, { scope, surahs: new Set([surah]) }),
    [index, surah, scope],
  );
  const geometry = useMemo(() => buildQuranArcGeometry(index, ids), [index, ids]);
  const range = index.versification.surahRange(surah);
  const left = xOf(range.start, index.ayahCount);
  const right = xOf(range.end + 1, index.ayahCount);

  return (
    <section className={styles.graphCard} aria-label="Quran relationship arcs">
      <div className={styles.graphIntro}>
        <div>
          <h2>Arcs across the Quran</h2>
          <p>Each curve represents one curated similar-passage relationship. Select an arc to explore both passages.</p>
        </div>
        <strong aria-live="polite">{ids.length.toLocaleString('en')} visible links</strong>
      </div>
      <div className={styles.graphScroll}>
        <svg className={styles.graph} viewBox="0 0 1200 400" role="group" aria-label="Relationships along the 6,236-ayah Quran">
          <rect x={left} y="8" width={Math.max(2, right - left)} height="352" className={styles.activeSurah} />
          {Array.from(geometry.linkIds, (id, position) => {
            const source = elementAt(geometry.endpoints, position * 2);
            const target = elementAt(geometry.endpoints, position * 2 + 1);
            const x1 = xOf(source, index.ayahCount);
            const x2 = xOf(target, index.ayahCount);
            const distance = Math.abs(x2 - x1);
            const peak = Math.min(325, Math.max(30, Math.sqrt(distance) * 14));
            const d = `M ${x1} ${AXIS_Y} Q ${(x1 + x2) / 2} ${AXIS_Y - peak * 2} ${x2} ${AXIS_Y}`;
            const link = index.link(id);
            const label = formatIndexRange(index.versification, link.source.start, link.source.end) +
              ' to ' + formatIndexRange(index.versification, link.target.start, link.target.end);
            const active = selectedId === id;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={active}
                className={active ? styles.arcActive : styles.arc}
                onClick={() => {
                  onSelect(id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(id);
                  }
                }}
              >
                <title>{label}</title>
                <path d={d} className={styles.arcStroke} />
                <path d={d} className={styles.arcHit} />
              </g>
            );
          })}
          <line x1={AXIS_LEFT} x2={AXIS_LEFT + AXIS_WIDTH} y1={AXIS_Y} y2={AXIS_Y} className={styles.axis} />
          {SURAHS.filter((item) => item.number === 1 || item.number % 10 === 0 || item.number === 114).map((item) => {
            const x = xOf(index.versification.surahRange(item.number).start, index.ayahCount);
            return (
              <g key={item.number}>
                <line x1={x} x2={x} y1={AXIS_Y} y2={AXIS_Y + 8} className={styles.axis} />
                <text x={x} y={AXIS_Y + 24} className={styles.axisText} textAnchor="middle">{item.number}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className={styles.graphNote}>Highlighted band: Surah {surah}. Curves are positioned by canonical ayah number, not by inferred similarity strength.</p>
    </section>
  );
}
