import { SURAHS } from '../../core/quran/surahs.ts';
import { GENRES, getSurahGenre, getGenreSurahs } from '../../core/quran/genres.ts';
import type { GenreId } from '../../core/quran/genres.ts';
import type { AyahIndexRange, QuranVersification } from '../../core/quran/quran-versification.ts';
import type { SurahNames } from '../../i18n/surahs/types.ts';
import { elementAt } from '../../core/lib/array.ts';
import { GENRE_HEX } from '../shared/palette.ts';
import { verseToAlong, type ArcLayout } from './arc-layout.ts';
import type { AxisView } from './axis-view.ts';

export interface AxisPaint {
  readonly layout: ArcLayout;
  readonly view: AxisView;
  readonly versification: QuranVersification;
  /** Surah and genre names in the reader's language: the axis is read, not only looked at. */
  readonly names: SurahNames;
  readonly genreNames: Readonly<Record<GenreId, string>>;
  readonly focus: AyahIndexRange | null;
  readonly hover: AyahIndexRange | null;
  /** A passage a previewed link points to: a band quieter than hover's, under the focus. */
  readonly passage: AyahIndexRange | null;
}

const TEXT = '#ecebe6';
const MUTED = '#9a9890';
const AXIS = '#3a3935';
const BAR_OFFSET = 3;
const BAR_THICKNESS = 8;
const LABEL_FONT = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
const GENRE_FONT = '600 10px system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Fills a rectangle given in along/across coordinates. "Across" values grow away from the arcs:
 * downward when the axis is horizontal, leftward (mirrored around the axis) when it is vertical.
 */
function fillAlong(
  context: CanvasRenderingContext2D,
  layout: ArcLayout,
  alongFrom: number,
  alongTo: number,
  acrossFrom: number,
  acrossTo: number,
): void {
  if (layout.orientation === 'horizontal') {
    context.fillRect(alongFrom, acrossFrom, alongTo - alongFrom, acrossTo - acrossFrom);
    return;
  }
  const mirroredLeft = 2 * layout.baseline - acrossTo;
  context.fillRect(mirroredLeft, alongFrom, acrossTo - acrossFrom, alongTo - alongFrom);
}

/**
 * Paints the axis overlay: genre-colored surah bars, surah ticks, labels that fit, the hover and
 * focus markers, and an overview strip with the visible window when zoomed in.
 */
export function paintAxis(context: CanvasRenderingContext2D, paint: AxisPaint): void {
  const { layout, view, versification } = paint;
  context.clearRect(0, 0, layout.width, layout.height);
  const along = (ayah: number) => verseToAlong(layout, view, ayah);
  const visible = (from: number, to: number) => to >= layout.axisStart && from <= layout.axisEnd;
  const clampAlong = (value: number) => Math.min(Math.max(value, layout.axisStart), layout.axisEnd);
  const barFrom = layout.baseline + BAR_OFFSET;
  const barTo = barFrom + BAR_THICKNESS;

  // Axis line.
  context.fillStyle = AXIS;
  fillAlong(
    context,
    layout,
    layout.axisStart,
    layout.axisEnd,
    layout.baseline,
    layout.baseline + 1,
  );

  // Surah bars; alternate surahs of a genre are dimmer so neighbors stay distinguishable.
  for (const surah of SURAHS) {
    const range = versification.surahRange(surah.id);
    const from = along(range.start);
    const to = along(range.end + 1);
    if (!visible(from, to)) continue;
    const gap = to - from > 4 ? 1 : 0;
    context.globalAlpha = surah.ordinal % 2 === 0 ? 1 : 0.72;
    context.fillStyle = elementAt(GENRE_HEX, getSurahGenre(surah.id).ordinal);
    fillAlong(context, layout, clampAlong(from) + gap, clampAlong(to) - gap, barFrom, barTo);
  }
  context.globalAlpha = 1;

  // Surah ticks once surahs are wide enough to tell apart.
  const chapterPixels = ((layout.axisEnd - layout.axisStart) / (view.end - view.start)) * 26;
  if (chapterPixels > 10) {
    context.fillStyle = MUTED;
    for (const surah of SURAHS) {
      for (let surah = 1; surah <= versification.chapterCountOf(surah.id); surah += 1) {
        const start = versification.chapterRange(surah.id, surah)?.start ?? 0;
        const position = along(start);
        if (position >= layout.axisStart && position <= layout.axisEnd) {
          fillAlong(context, layout, position, position + 1, barTo + 1, barTo + 4);
        }
      }
    }
  }

  const highlight = (range: AyahIndexRange | null, color: string, width: number) => {
    if (!range) return;
    const from = along(range.start);
    const to = along(range.end + 1);
    if (!visible(from, to)) return;
    context.fillStyle = color;
    const center = (clampAlong(from) + clampAlong(to)) / 2;
    const half = Math.max((clampAlong(to) - clampAlong(from)) / 2, width);
    fillAlong(context, layout, center - half, center + half, barFrom - 2, barTo + 2);
  };
  highlight(paint.passage, 'rgb(236 235 230 / 0.3)', 1.5);
  highlight(paint.hover, 'rgb(236 235 230 / 0.45)', 1.5);
  highlight(paint.focus, TEXT, 2);

  paintBookLabels(context, paint, along);
  if (layout.orientation === 'horizontal') {
    paintGenreLabels(context, paint, along);
  }
  paintOverview(context, paint);
}

function paintBookLabels(
  context: CanvasRenderingContext2D,
  { layout, versification, names, focus, hover, passage }: AxisPaint,
  along: (ayah: number) => number,
): void {
  const horizontal = layout.orientation === 'horizontal';
  const labelOffset = BAR_OFFSET + BAR_THICKNESS;
  // Vertical axis: labels sit left of the bar, in the band between the stage edge and the axis.
  const sideRoom = layout.baseline - labelOffset - 8;
  context.font = LABEL_FONT;
  context.textBaseline = 'middle';
  context.textAlign = horizontal ? 'center' : 'right';
  const touches = (range: AyahIndexRange | null, start: number, end: number) =>
    range !== null && range.start <= end && range.end >= start;

  for (const surah of SURAHS) {
    const range = versification.surahRange(surah.id);
    const from = Math.max(along(range.start), layout.axisStart);
    const to = Math.min(along(range.end + 1), layout.axisEnd);
    const room = to - from;
    if (room <= 0) continue;
    const short = names[surah.id].abbreviation ?? surah.id;
    const candidates = [names[surah.id].name, short];
    const label = horizontal
      ? candidates.find((text) => context.measureText(text).width + 8 <= room)
      : room >= 12
        ? candidates.find((text) => context.measureText(text).width <= sideRoom)
        : undefined;
    if (label === undefined) continue;
    const isActive =
      touches(focus, range.start, range.end) ||
      touches(hover, range.start, range.end) ||
      touches(passage, range.start, range.end);
    context.fillStyle = isActive ? TEXT : MUTED;
    const center = (from + to) / 2;
    if (horizontal) {
      context.fillText(label, center, layout.baseline + labelOffset + 12);
    } else {
      context.fillText(label, layout.baseline - labelOffset - 5, center);
    }
  }
}

function paintGenreLabels(
  context: CanvasRenderingContext2D,
  { layout, versification, genreNames }: AxisPaint,
  along: (ayah: number) => number,
): void {
  context.font = GENRE_FONT;
  context.textAlign = 'center';
  const y = layout.baseline + BAR_OFFSET + BAR_THICKNESS + 32;
  for (const genre of GENRES) {
    const surahs = getGenreSurahs(genre.id);
    const first = surahs[0];
    const last = surahs.at(-1);
    if (!first || !last) continue;
    const from = Math.max(along(versification.surahRange(first).start), layout.axisStart);
    const to = Math.min(along(versification.surahRange(last).end + 1), layout.axisEnd);
    const label = genreNames[genre.id].toUpperCase();
    if (to - from < context.measureText(label).width + 16) continue;
    const center = (from + to) / 2;
    const textWidth = context.measureText(label).width;
    context.fillStyle = elementAt(GENRE_HEX, genre.ordinal);
    context.fillRect(center - textWidth / 2 - 12, y - 1, 8, 2);
    context.fillStyle = MUTED;
    context.fillText(label, center + 2, y);
  }
}

function paintOverview(
  context: CanvasRenderingContext2D,
  { layout, view, versification }: AxisPaint,
): void {
  const total = versification.ayahCount;
  if (view.end - view.start >= total - 0.5) return;
  const horizontal = layout.orientation === 'horizontal';
  const length = horizontal ? layout.width - 64 : layout.height - 64;
  const offset = 32;
  const position = (ayah: number) => offset + (ayah / total) * length;
  for (const genre of GENRES) {
    const surahs = getGenreSurahs(genre.id);
    const first = surahs[0];
    const last = surahs.at(-1);
    if (!first || !last) continue;
    const from = position(versification.surahRange(first).start);
    const to = position(versification.surahRange(last).end + 1);
    context.fillStyle = elementAt(GENRE_HEX, genre.ordinal);
    if (horizontal) context.fillRect(from, 6, to - from, 3);
    else context.fillRect(layout.width - 9, from, 3, to - from);
  }
  context.strokeStyle = TEXT;
  context.lineWidth = 1;
  const from = position(view.start);
  const to = position(view.end);
  if (horizontal) context.strokeRect(from - 0.5, 2.5, Math.max(to - from, 3) + 1, 10);
  else context.strokeRect(layout.width - 13.5, from - 0.5, 10, Math.max(to - from, 3) + 1);
}
