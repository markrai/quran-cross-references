import { describe, expect, it } from 'vitest';
import {
  centerGraphViewport,
  constrainGraphViewport,
  DEFAULT_GRAPH_VIEWPORT,
  dragGraphViewport,
  graphAyahAtWorldX,
  graphWorldXAtClientX,
  graphXOfAyah,
  GRAPH_WIDTH,
  MAX_GRAPH_ZOOM,
  panGraphViewport,
  zoomGraphViewport,
} from './graph-viewport.ts';

describe('Quran graph viewport', () => {
  it('starts at the full 6,236-ayah coordinate system', () => {
    expect(DEFAULT_GRAPH_VIEWPORT).toEqual({ x: 0, width: GRAPH_WIDTH });
    expect(graphAyahAtWorldX(graphXOfAyah(0, 6236), 6236)).toBe(0);
    expect(graphAyahAtWorldX(graphXOfAyah(6235, 6236), 6236)).toBe(6235);
    expect(graphAyahAtWorldX(graphXOfAyah(7, 6236), 6236)).toBe(7);
  });

  it('zooms around the cursor without moving the anchored location', () => {
    const before = DEFAULT_GRAPH_VIEWPORT;
    const fraction = 0.25;
    const after = zoomGraphViewport(before, 2, fraction);
    expect(after.width).toBe(600);
    expect(after.x).toBe(150);
    expect(before.x + before.width * fraction).toBe(after.x + after.width * fraction);
  });

  it('clamps zoom, dragging and centering at both Quran ends', () => {
    const deep = zoomGraphViewport(DEFAULT_GRAPH_VIEWPORT, 1000);
    expect(deep.width).toBe(GRAPH_WIDTH / MAX_GRAPH_ZOOM);
    expect(panGraphViewport(deep, -1e6).x).toBe(0);
    expect(panGraphViewport(deep, 1e6).x).toBe(GRAPH_WIDTH - deep.width);
    expect(centerGraphViewport(deep, -200)).toEqual({ x: 0, width: deep.width });
    expect(centerGraphViewport(deep, 5000)).toEqual({
      x: GRAPH_WIDTH - deep.width,
      width: deep.width,
    });
    expect(zoomGraphViewport(deep, 0.00001)).toEqual(DEFAULT_GRAPH_VIEWPORT);
  });

  it('turns the first overview drag into a zoom and a real horizontal pan', () => {
    const draggedLeft = dragGraphViewport(DEFAULT_GRAPH_VIEWPORT, -80, 400);
    const draggedRight = dragGraphViewport(DEFAULT_GRAPH_VIEWPORT, 80, 400);
    expect(draggedLeft.width).toBeCloseTo(GRAPH_WIDTH / 1.8);
    expect(draggedLeft.x).toBeCloseTo(400);
    expect(draggedRight.width).toBeCloseTo(draggedLeft.width);
    expect(draggedRight.x).toBeCloseTo(133.33333333333334);
    expect(draggedLeft.x).toBeGreaterThan(draggedRight.x);
    const continued = dragGraphViewport(draggedLeft, 80, 400);
    expect(continued.width).toBeCloseTo(draggedLeft.width);
    expect(continued.x).toBeCloseTo(draggedLeft.x - draggedLeft.width * 0.2);
  });

  it('does not zoom on a stationary or malformed pointer movement', () => {
    expect(dragGraphViewport(DEFAULT_GRAPH_VIEWPORT, 0, 400)).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(dragGraphViewport(DEFAULT_GRAPH_VIEWPORT, 80, 0)).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(dragGraphViewport(DEFAULT_GRAPH_VIEWPORT, NaN, 400)).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(dragGraphViewport(DEFAULT_GRAPH_VIEWPORT, 80, Infinity)).toEqual(DEFAULT_GRAPH_VIEWPORT);
  });

  it('handles nonfinite viewport or invalid zoom factors conservatively', () => {
    expect(constrainGraphViewport({ x: NaN, width: Infinity })).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(zoomGraphViewport(DEFAULT_GRAPH_VIEWPORT, -2)).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(zoomGraphViewport(DEFAULT_GRAPH_VIEWPORT, Infinity)).toEqual(DEFAULT_GRAPH_VIEWPORT);
  });

  it('maps pointer offsets through the zoomed coordinate system', () => {
    const zoomed = { x: 300, width: 600 };
    expect(graphWorldXAtClientX(zoomed, 125, 25, 400)).toBe(450);
    expect(graphWorldXAtClientX(zoomed, -10, 25, 400)).toBe(300);
    expect(graphWorldXAtClientX(zoomed, 500, 25, 400)).toBe(900);
    expect(graphWorldXAtClientX(zoomed, 100, 25, 0)).toBe(600);
    expect(graphAyahAtWorldX(-100, 6236)).toBe(0);
    expect(graphAyahAtWorldX(10000, 6236)).toBe(6235);
  });
});
