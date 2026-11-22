import { useRef, useState, type PointerEvent } from 'react';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import type { QuranPublishedExpression } from '../core/quran/expression-browser.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import {
  DEFAULT_GRAPH_VIEWPORT,
  dragGraphViewport,
  GRAPH_AXIS_LEFT,
  GRAPH_AXIS_WIDTH,
  GRAPH_AXIS_Y,
  GRAPH_WIDTH,
  graphXOfAyah,
  MAX_GRAPH_ZOOM,
  panGraphViewport,
  zoomGraphViewport,
} from './graph-viewport.ts';
import styles from './QuranApp.module.css';

const GRAPH_PAGE_SIZE = 32;

interface QuranExpressionGraphProps {
  readonly expression: QuranPublishedExpression;
  readonly ayahIndex: number;
  readonly onNavigate: (ayahIndex: number) => void;
}

interface Drag {
  readonly pointerId: number;
  readonly originX: number;
  lastX: number;
  moved: boolean;
}

export function QuranExpressionGraph({
  expression,
  ayahIndex,
  onNavigate,
}: QuranExpressionGraphProps) {
  const [viewport, setViewport] = useState(DEFAULT_GRAPH_VIEWPORT);
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const graphRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const anchors = expression.occurrences.filter((site) => site.ayah === ayahIndex);
  const anchor = anchors[0] ?? expression.occurrences[0];
  if (!anchor) return null;
  const targets = [
    ...new Set(
      expression.occurrences.filter((site) => site.ayah !== anchor.ayah).map((site) => site.ayah),
    ),
  ];
  const pageCount = Math.max(1, Math.ceil(targets.length / GRAPH_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const display = targets.slice(currentPage * GRAPH_PAGE_SIZE, (currentPage + 1) * GRAPH_PAGE_SIZE);
  const x1 = graphXOfAyah(anchor.ayah, CANONICAL_QURAN.ayahCount);
  const zoom = GRAPH_WIDTH / viewport.width;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      lastX: event.clientX,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId) return;
    const width = graphRef.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) return;
    if (!active.moved && Math.abs(event.clientX - active.originX) < 6) return;
    const difference = event.clientX - active.lastX;
    active.lastX = event.clientX;
    active.moved = true;
    setViewport((current) => dragGraphViewport(current, difference, width));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  return (
    <section className={styles.graphCard} aria-label="Computed expression graph">
      <div className={styles.graphIntro}>
        <div>
          <h2>Exact phrase occurrence graph</h2>
          <p>
            Each curve joins the current source ayah to one other ayah with the identical Arabic
            phrase. No pairwise mesh or relevance ranking is inferred.
          </p>
        </div>
        <strong>{String(targets.length)} other ayahs</strong>
      </div>
      <div className={styles.graphControls} role="group" aria-label="Expression graph navigation">
        <button
          type="button"
          aria-label="Zoom in expression graph"
          disabled={zoom >= MAX_GRAPH_ZOOM}
          onClick={() => {
            setViewport((current) => zoomGraphViewport(current, 1.8));
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out expression graph"
          disabled={zoom <= 1}
          onClick={() => {
            setViewport((current) => zoomGraphViewport(current, 1 / 1.8));
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Pan expression graph left"
          disabled={viewport.x <= 0}
          onClick={() => {
            setViewport((current) => panGraphViewport(current, -current.width * 0.35));
          }}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Pan expression graph right"
          disabled={viewport.x >= GRAPH_WIDTH - viewport.width}
          onClick={() => {
            setViewport((current) => panGraphViewport(current, current.width * 0.35));
          }}
        >
          →
        </button>
        <button
          type="button"
          aria-label="Reset expression graph"
          onClick={() => {
            setViewport(DEFAULT_GRAPH_VIEWPORT);
          }}
        >
          Reset
        </button>
        <span className={styles.graphZoom}>{zoom.toFixed(1)}×</span>
        <button
          type="button"
          aria-label="Previous expression graph targets"
          disabled={currentPage === 0}
          onClick={() => {
            setPage((value) => Math.max(0, value - 1));
          }}
        >
          Previous targets
        </button>
        <button
          type="button"
          aria-label="Next expression graph targets"
          disabled={currentPage >= pageCount - 1}
          onClick={() => {
            setPage((value) => Math.min(pageCount - 1, value + 1));
          }}
        >
          Next targets
        </button>
      </div>
      <div className={styles.graphScroll}>
        <svg
          ref={graphRef}
          className={styles.graph}
          viewBox={String(viewport.x) + ' 0 ' + String(viewport.width) + ' 400'}
          preserveAspectRatio="none"
          role="group"
          aria-label="Exact expression occurrences along the 6,236-ayah Quran"
        >
          <rect x="0" y="0" width={GRAPH_WIDTH} height="400" fill="transparent" />
          <line
            x1={GRAPH_AXIS_LEFT}
            x2={GRAPH_AXIS_LEFT + GRAPH_AXIS_WIDTH}
            y1={GRAPH_AXIS_Y}
            y2={GRAPH_AXIS_Y}
            className={styles.axis}
          />
          {display.map((target) => {
            const x2 = graphXOfAyah(target, CANONICAL_QURAN.ayahCount);
            const distance = Math.abs(x2 - x1);
            const peak = Math.min(325, Math.max(30, Math.sqrt(distance) * 14));
            const path =
              'M ' +
              String(x1) +
              ' ' +
              String(GRAPH_AXIS_Y) +
              ' Q ' +
              String((x1 + x2) / 2) +
              ' ' +
              String(GRAPH_AXIS_Y - peak * 2) +
              ' ' +
              String(x2) +
              ' ' +
              String(GRAPH_AXIS_Y);
            return (
              <g
                key={target}
                role="button"
                tabIndex={0}
                className={styles.arcFocused}
                aria-label={
                  formatAyahId(CANONICAL_QURAN.refAt(anchor.ayah)) +
                  ' exact phrase also in ' +
                  formatAyahId(CANONICAL_QURAN.refAt(target))
                }
                onClick={() => {
                  onNavigate(target);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onNavigate(target);
                  }
                }}
              >
                <path d={path} className={styles.arcStroke} />
                <path d={path} className={styles.arcHit} />
              </g>
            );
          })}
          <circle cx={x1} cy={GRAPH_AXIS_Y} r="5" className={styles.expressionAnchor} />
        </svg>
      </div>
      <div
        className={styles.graphPanHandle}
        role="group"
        aria-label="Drag expression graph horizontally"
        data-dragging={dragging ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <span aria-hidden="true">↔</span>{' '}
        {zoom <= 1 ? 'Drag here to zoom and pan the graph' : 'Drag here to pan the graph'}
      </div>
      <p className={styles.graphNote}>
        Showing {String(currentPage * GRAPH_PAGE_SIZE + 1)}–
        {String(currentPage * GRAPH_PAGE_SIZE + display.length)} of {String(targets.length)}{' '}
        distinct target ayahs · anchor {formatAyahId(CANONICAL_QURAN.refAt(anchor.ayah))}. Select
        any curve to read that ayah.
      </p>
    </section>
  );
}
