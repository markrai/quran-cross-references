export const GRAPH_WIDTH = 1200;
export const GRAPH_AXIS_LEFT = 35;
export const GRAPH_AXIS_WIDTH = 1130;
export const GRAPH_AXIS_Y = 355;
export const MAX_GRAPH_ZOOM = 12;

export interface GraphViewport {
  readonly x: number;
  readonly width: number;
}

export const DEFAULT_GRAPH_VIEWPORT: GraphViewport = { x: 0, width: GRAPH_WIDTH };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function constrainGraphViewport(viewport: GraphViewport): GraphViewport {
  const width = Number.isFinite(viewport.width)
    ? clamp(viewport.width, GRAPH_WIDTH / MAX_GRAPH_ZOOM, GRAPH_WIDTH)
    : GRAPH_WIDTH;
  const x = Number.isFinite(viewport.x) ? clamp(viewport.x, 0, GRAPH_WIDTH - width) : 0;
  return { x, width };
}

export function zoomGraphViewport(
  viewport: GraphViewport,
  multiplier: number,
  fraction = 0.5,
): GraphViewport {
  const normalized = constrainGraphViewport(viewport);
  if (!Number.isFinite(multiplier) || multiplier <= 0) return normalized;
  const anchor = clamp(fraction, 0, 1);
  const width = clamp(normalized.width / multiplier, GRAPH_WIDTH / MAX_GRAPH_ZOOM, GRAPH_WIDTH);
  return constrainGraphViewport({
    x: normalized.x + normalized.width * anchor - width * anchor,
    width,
  });
}

export function panGraphViewport(viewport: GraphViewport, delta: number): GraphViewport {
  const normalized = constrainGraphViewport(viewport);
  return constrainGraphViewport({ x: normalized.x + delta, width: normalized.width });
}

export function dragGraphViewport(
  viewport: GraphViewport,
  deltaPixels: number,
  graphWidthPixels: number,
): GraphViewport {
  const normalized = constrainGraphViewport(viewport);
  if (
    !Number.isFinite(deltaPixels) ||
    !Number.isFinite(graphWidthPixels) ||
    graphWidthPixels <= 0 ||
    deltaPixels === 0
  ) {
    return normalized;
  }
  const next = normalized.width === GRAPH_WIDTH ? zoomGraphViewport(normalized, 1.8) : normalized;
  return panGraphViewport(next, (-deltaPixels / graphWidthPixels) * next.width);
}

export function centerGraphViewport(viewport: GraphViewport, worldX: number): GraphViewport {
  const normalized = constrainGraphViewport(viewport);
  return constrainGraphViewport({ x: worldX - normalized.width / 2, width: normalized.width });
}

export function graphXOfAyah(index: number, ayahCount: number): number {
  return GRAPH_AXIS_LEFT + (index / ayahCount) * GRAPH_AXIS_WIDTH;
}

export function graphAyahAtWorldX(worldX: number, ayahCount: number): number {
  const raw = Math.floor(((worldX - GRAPH_AXIS_LEFT) / GRAPH_AXIS_WIDTH) * ayahCount + 1e-9);
  return clamp(raw, 0, ayahCount - 1);
}

export function graphWorldXAtClientX(
  viewport: GraphViewport,
  clientX: number,
  rectLeft: number,
  rectWidth: number,
): number {
  const ratio = rectWidth > 0 ? clamp((clientX - rectLeft) / rectWidth, 0, 1) : 0.5;
  return viewport.x + viewport.width * ratio;
}
