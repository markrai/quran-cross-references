import type { SurahNumber } from '../../core/quran/surahs.ts';
import { ayahPassage, formatPassage } from '../../core/quran/passage.ts';
import type { AyahIndex } from '../../core/quran/ayah-ref.ts';
import type { Localization } from '../../i18n/use-locale.tsx';
import { collectConnections } from './connections.ts';
import type { LinkFilter } from './link-filter.ts';
import { GENRE_HEX } from './palette.ts';
import { quotePassage } from './passage-quote.ts';
import type { VerseCardInput } from './ayah-card.ts';
import type { PassageQuote } from './passage-quote.ts';
import type { VizData } from './viz-data.ts';

/** Everything the share dialog needs, gathered where the ayah was clicked. */
export interface VerseShareRequest extends VerseCardInput {
  /** The ayah's address on the published site. */
  readonly url: string;
  /** The same ayah as text, for the reader who wants the words rather than the picture. */
  readonly quote: PassageQuote;
}

/** How many surahs a card names. Beyond this the labels crowd the line they sit under. */
const MAX_LANDMARKS = 4;

/**
 * Everything a share card needs, gathered from the same places the app draws from.
 *
 * The links are collected with `collectConnections`, which is what `ArcsStage` feeds to the GPU
 * when a ayah is focused — so the card's arcs are that focus layer, not a second idea of which
 * links matter. A filtered-out link is missing from both, which is the point: the picture should
 * agree with the screen it was taken from.
 */
export function buildVerseShareRequest({
  data,
  filter,
  ayah,
  url,
  localization,
}: {
  readonly data: VizData;
  readonly filter: LinkFilter;
  readonly ayah: AyahIndex;
  /** The ayah's address on the published site. */
  readonly url: string;
  readonly localization: Localization;
}): VerseShareRequest {
  const { versification, translation, crossReferences, verseGenres } = data;
  const { t, surahs, n, locale } = localization;
  const connections = collectConnections(
    crossReferences.index,
    { start: ayah, end: ayah },
    filter,
    verseGenres,
  );
  const links = [...connections.outgoing, ...connections.incoming];
  // Where each link lands, as one point: a link to a range is drawn to the middle of it, the
  // same simplification the arc diagram makes.
  const targets = links.map(({ otherStart, otherEnd }) => Math.floor((otherStart + otherEnd) / 2));
  const reference = formatPassage(ayahPassage(ayah), versification, surahs);

  // Which surahs the arcs reach, most-reached first. Ten genre colors cannot be told apart by
  // eye alone — `palette.ts` says as much, and asks every visualization to name them too — and
  // naming the surahs a ayah actually lands in says something about this ayah rather than
  // reprinting the table of contents.
  const landings = new Map<SurahNumber, number>();
  for (const target of targets) {
    const surah = versification.surahAt(target).id;
    landings.set(surah, (landings.get(surah) ?? 0) + 1);
  }
  const landmarks = [...landings]
    .sort(([bookA, a], [bookB, b]) => b - a || bookA.localeCompare(bookB))
    .slice(0, MAX_LANDMARKS)
    .map(([surah]) => {
      const { start, end } = versification.surahRange(surah);
      return {
        label: surahs[surah].abbreviation ?? surah,
        ayah: Math.floor((start + end) / 2),
        genre: start < verseGenres.length ? (verseGenres[start] ?? 0) : 0,
      };
    })
    .sort((a, b) => a.ayah - b.ayah);

  return {
    reference,
    localeTag: locale.tag,
    text: translation.verseText(ayah),
    ayah,
    targets,
    verseGenres,
    totalVerses: versification.ayahCount,
    genreHex: GENRE_HEX,
    landmarks,
    // Where the New Testament begins, as one tick: "does this reach past Malachi" is the
    // question the shape of the arcs most often raises.
    testamentAt: versification.surahRange('Matt').start,
    countLabel: t('share.crossReferences')(n(links.length), links.length),
    // The translation's own attribution, in the reader's language, and not a short form built
    // here. CC BY and CC BY-SA ask for the creators, the licence, the URI the licensor
    // designated and a note that the text was changed; the manifests carry exactly that, and
    // the picture is the one copy of the text that travels without the page around it. A card
    // naming only "VBL · CC BY-SA 4.0" would redistribute it on worse terms than the licence.
    attribution: t(`attribution.${translation.manifest.id}`),
    site: siteOf(url),
    url,
    quote: quotePassage({
      translation,
      versification,
      names: surahs,
      start: ayah,
      end: ayah,
      url,
    }),
  };
}

/**
 * The app's address as people retype it: no scheme, no query, no trailing slash.
 *
 * It keeps the language segment, so a Portuguese card sends a reader to the Portuguese app.
 */
export function siteOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.replace(/\/+$/u, '');
  } catch {
    return url;
  }
}
