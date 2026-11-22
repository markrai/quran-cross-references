import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import type { AyahRef } from '../core/quran/ayah-ref.ts';
import { buildQuranArcGeometry, selectQuranRelationshipIds } from '../core/quran/graph-adapters.ts';
import type { AyahIndexRange } from '../core/quran/quran-versification.ts';
import { formatIndexRange } from '../core/quran/reference.ts';
import type { QuranRelationshipScope } from '../core/quran/relationship-filter.ts';
import type { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import { SURAHS } from '../core/quran/surahs.ts';
import { arcTouchesRange, arcVisibleInViewport, buildQuranGraphPaths } from './graph-layout.ts';
import {
  centerGraphViewport,
  DEFAULT_GRAPH_VIEWPORT,
  GRAPH_AXIS_LEFT,
  GRAPH_AXIS_WIDTH,
  GRAPH_AXIS_Y,
  GRAPH_WIDTH,
  graphAyahAtWorldX,
  graphWorldXAtClientX,
  graphXOfAyah,
  MAX_GRAPH_ZOOM,
  panGraphViewport,
  zoomGraphViewport,
} from './graph-viewport.ts';
import styles from './QuranApp.module.css';

interface QuranArcsProps {
  readonly index: QuranRelationshipIndex;
  readonly surah: number;
  readonly scope: QuranRelationshipScope;
  readonly focus: AyahIndexRange;
  readonly selectedId: number | null;
  readonly onSelect: (id: number) => void;
  readonly onNavigate: (reference: AyahRef) => void;
}

interface ActiveDrag {
  readonly pointerId: number;
  lastX: number;
}

export function QuranArcs({
  index,
  surah,
  scope,
  focus,
  selectedId,
  onSelect,
  onNavigate,
}: QuranArcsProps) {
  const [viewport, setViewport] = useState(DEFAULT_GRAPH_VIEWPORT);
  const [focusOnly, setFocusOnly] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<ActiveDrag | null>(null);
  const graphRef = useRef<SVGSVGElement | null>(null);
  const ids = useMemo(
    () => selectQuranRelationshipIds(index, { scope, surahs: new Set([surah]) }),
    [index, surah, scope],
  );
  const geometry = useMemo(() => buildQuranArcGeometry(index, ids), [index, ids]);
  const arcs = useMemo(() => buildQuranGraphPaths(index, geometry), [index, geometry]);
  const focusedArcs = useMemo(
    () => arcs.filter((arc) => arcTouchesRange(arc, focus)),
    [arcs, focus],
  );
  const displayedArcs = useMemo(() => {
    const pool = focusOnly ? focusedArcs : arcs;
    return pool.filter((arc) => arcVisibleInViewport(arc, viewport));
  }, [arcs, focusedArcs, focusOnly, viewport]);
  const focusedIds = useMemo(() => new Set(focusedArcs.map((arc) => arc.id)), [focusedArcs]);

  const focusedCenter = graphXOfAyah((focus.start + focus.end + 1) / 2, index.ayahCount);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setViewport((current) =>
        current.width === GRAPH_WIDTH ? current : centerGraphViewport(current, focusedCenter),
      );
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [focusedCenter]);

  useEffect(() => {
    const selectedArc = arcs.find((arc) => arc.id === selectedId);
    if (!selectedArc) return;
    const frame = window.requestAnimationFrame(() => {
      setViewport((current) =>
        current.width === GRAPH_WIDTH
          ? current
          : centerGraphViewport(current, (selectedArc.left + selectedArc.right) / 2),
      );
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [arcs, selectedId]);

  const surahRange = index.versification.surahRange(surah);
  const surahLeft = graphXOfAyah(surahRange.start, index.ayahCount);
  const surahRight = graphXOfAyah(surahRange.end + 1, index.ayahCount);
  const focusLeft = graphXOfAyah(focus.start, index.ayahCount);
  const focusRight = graphXOfAyah(focus.end + 1, index.ayahCount);
  const firstVisible = index.versification.refAt(graphAyahAtWorldX(viewport.x, index.ayahCount));
  const lastVisible = index.versification.refAt(
    graphAyahAtWorldX(viewport.x + viewport.width, index.ayahCount),
  );
  const zoom = GRAPH_WIDTH / viewport.width;

  const selectFromWorldX = (worldX: number) => {
    const ayah = graphAyahAtWorldX(worldX, index.ayahCount);
    onNavigate(index.versification.refAt(ayah));
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement | HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('[data-graph-interactive]'))
    ) {
      return;
    }
    drag.current = { pointerId: event.pointerId, lastX: event.clientX };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement | HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    const width = graphRef.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) return;
    const difference = event.clientX - drag.current.lastX;
    drag.current.lastX = event.clientX;
    setViewport((current) => panGraphViewport(current, (-difference / width) * current.width));
  };

  const endDrag = (event: PointerEvent<SVGSVGElement | HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fraction = (event.clientX - rect.left) / rect.width;
    setViewport((current) => zoomGraphViewport(current, event.deltaY < 0 ? 1.25 : 0.8, fraction));
  };

  return (
    <section className={styles.graphCard} aria-label="Quran relationship arcs">
      <div className={styles.graphIntro}>
        <div>
          <h2>Explore connections across the Quran</h2>
          <p>
            Zoom or drag to navigate, select a curve to inspect its passages, or select an ayah on
            the axis.
          </p>
        </div>
        <strong aria-live="polite">{ids.length.toLocaleString('en')} visible links</strong>
      </div>
      <div className={styles.graphControls} role="group" aria-label="Graph navigation">
        <button
          type="button"
          aria-label="Zoom in graph"
          disabled={zoom >= MAX_GRAPH_ZOOM}
          onClick={() => {
            setViewport((current) => zoomGraphViewport(current, 1.8));
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out graph"
          disabled={zoom <= 1}
          onClick={() => {
            setViewport((current) => zoomGraphViewport(current, 1 / 1.8));
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Pan graph left"
          disabled={viewport.x <= 0}
          onClick={() => {
            setViewport((current) => panGraphViewport(current, -current.width * 0.35));
          }}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Pan graph right"
          disabled={viewport.x >= GRAPH_WIDTH - viewport.width}
          onClick={() => {
            setViewport((current) => panGraphViewport(current, current.width * 0.35));
          }}
        >
          →
        </button>
        <button
          type="button"
          aria-label="Reset graph view"
          onClick={() => {
            setViewport(DEFAULT_GRAPH_VIEWPORT);
          }}
        >
          Reset
        </button>
        <span className={styles.graphZoom} aria-live="polite">
          {zoom.toFixed(1)}×
        </span>
        <label className={styles.graphFocusToggle}>
          <input
            type="checkbox"
            checked={focusOnly}
            onChange={(event) => {
              setFocusOnly(event.target.checked);
            }}
          />
          Only links touching selected passage
        </label>
      </div>
      <p id="quran-graph-help" className={styles.graphHelp}>
        Drag the handle below the graph or open space to pan; Ctrl or Cmd + wheel to zoom. Click the
        horizontal axis to choose an ayah. Use its arrow keys to move one ayah at a time.
      </p>
      <div className={styles.graphScroll}>
        <svg
          ref={graphRef}
          className={dragging ? styles.graphDragging : styles.graph}
          viewBox={`${viewport.x} 0 ${viewport.width} 400`}
          preserveAspectRatio="none"
          role="group"
          aria-label="Relationships along the 6,236-ayah Quran"
          aria-describedby="quran-graph-help"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onWheel={onWheel}
        >
          <rect x="0" y="0" width={GRAPH_WIDTH} height="400" fill="transparent" />
          <rect
            x={surahLeft}
            y="8"
            width={Math.max(2, surahRight - surahLeft)}
            height="352"
            className={styles.activeSurah}
          />
          <rect
            x={focusLeft}
            y="8"
            width={Math.max(2, focusRight - focusLeft)}
            height="352"
            className={styles.focusedPassage}
          />
          {displayedArcs.map((arc) => {
            const selected = selectedId === arc.id;
            const touching = focusedIds.has(arc.id);
            const className = selected
              ? styles.arcActive
              : touching
                ? styles.arcFocused
                : styles.arcMuted;
            return (
              <g
                key={arc.id}
                role="button"
                tabIndex={0}
                aria-label={arc.label}
                aria-pressed={selected}
                className={className}
                data-graph-interactive=""
                onClick={() => {
                  onSelect(arc.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(arc.id);
                  }
                }}
              >
                <title>{arc.label}</title>
                <path d={arc.path} className={styles.arcStroke} />
                <path d={arc.path} className={styles.arcHit} />
              </g>
            );
          })}
          <line
            x1={GRAPH_AXIS_LEFT}
            x2={GRAPH_AXIS_LEFT + GRAPH_AXIS_WIDTH}
            y1={GRAPH_AXIS_Y}
            y2={GRAPH_AXIS_Y}
            className={styles.axis}
          />
          {SURAHS.filter(
            (item) => item.number === 1 || item.number % 10 === 0 || item.number === 114,
          ).map((item) => {
            const x = graphXOfAyah(
              index.versification.surahRange(item.number).start,
              index.ayahCount,
            );
            return (
              <g key={item.number}>
                <line
                  x1={x}
                  x2={x}
                  y1={GRAPH_AXIS_Y}
                  y2={GRAPH_AXIS_Y + 8}
                  className={styles.axis}
                />
                {zoom <= 1.5 && (
                  <text x={x} y={GRAPH_AXIS_Y + 24} className={styles.axisText} textAnchor="middle">
                    {item.number}
                  </text>
                )}
              </g>
            );
          })}
          <rect
            x="0"
            y="380"
            width={GRAPH_WIDTH}
            height="20"
            fill="transparent"
            data-graph-pan-surface=""
          />
          <rect
            x={GRAPH_AXIS_LEFT}
            y={GRAPH_AXIS_Y - 5}
            width={GRAPH_AXIS_WIDTH}
            height="13"
            fill="transparent"
            data-graph-interactive=""
            className={styles.graphAxisPick}
            role="button"
            tabIndex={0}
            aria-label="Select ayah on Quran axis"
            onClick={(event) => {
              const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
              if (!rect || rect.width <= 0) return;
              selectFromWorldX(
                graphWorldXAtClientX(viewport, event.clientX, rect.left, rect.width),
              );
            }}
            onKeyDown={(event) => {
              const current = focus.start;
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                const offset = event.key === 'ArrowRight' ? 1 : -1;
                const next = Math.max(0, Math.min(index.ayahCount - 1, current + offset));
                onNavigate(index.versification.refAt(next));
              } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectFromWorldX(viewport.x + viewport.width / 2);
              }
            }}
          />
        </svg>
      </div>
      <div
        className={styles.graphPanHandle}
        role="group"
        aria-label="Drag graph horizontally"
        data-graph-pan-handle=""
        data-dragging={dragging ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <span aria-hidden="true">↔</span> Drag here to pan the graph
      </div>
      <div className={styles.graphSummary}>
        <p>
          Focused passage: {formatIndexRange(index.versification, focus.start, focus.end)} ·{' '}
          {focusedArcs.length.toLocaleString('en')} related links
        </p>
        <p>
          Viewport: {firstVisible.surah}:{firstVisible.ayah} to {lastVisible.surah}:
          {lastVisible.ayah} · {displayedArcs.length.toLocaleString('en')} arcs drawn
        </p>
      </div>
      <p className={styles.graphNote}>
        Curves use canonical ayah positions, not inferred relevance or similarity strength.
      </p>
    </section>
  );
}
