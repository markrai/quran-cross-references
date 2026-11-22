import {
  QURAN_ANALYTICS_TOP_LIMIT,
  type QuranAnalyticsDataset,
} from '../core/quran/analytics-types.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import type { QuranReaderData } from './model.ts';

const ANALYTICS_FILE = 'data/quran/analytics.json';
const MANIFEST_FILE = 'data/quran/manifest.json';
const MAX_ANALYTICS_BYTES = 256 * 1024;

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(label + ' must be an array.');
  return value as readonly unknown[];
}

function count(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + ' must be a nonnegative integer.');
  }
  return value;
}

function rate(value: unknown, label: string, numerator: number, denominator: number): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value !== Math.round((numerator / denominator) * 10_000) / 100
  ) {
    throw new Error(label + ' does not match its denominator.');
  }
}

function location(value: unknown, start: number, end: number, hasData: boolean): void {
  if (!hasData && value === null) return;
  const index = count(value, 'First evidence ayah');
  if (!hasData || index < start || index > end) {
    throw new Error('First evidence ayah is outside the source surah.');
  }
}

export function parseQuranAnalytics(
  input: unknown,
  expectedHashes: { readonly arabic: string; readonly curated: string },
  curatedLinkCount: number,
): QuranAnalyticsDataset {
  const dataset = object(input, 'Analytics dataset');
  const hashes = object(dataset['sourceHashes'], 'Analytics provenance');
  const evidence = object(dataset['evidence'], 'Analytics classification');
  if (
    dataset['format'] !== 'quran-analytics' ||
    dataset['schemaVersion'] !== 1 ||
    dataset['versification'] !== CANONICAL_QURAN.id ||
    evidence['curated'] !== 'curated-similar-passage' ||
    evidence['computed'] !== 'exact-repeated-expression' ||
    hashes['arabic'] !== expectedHashes.arabic ||
    hashes['curated'] !== expectedHashes.curated
  ) {
    throw new Error('Incompatible Quran analytics schema, classification or source pin.');
  }
  if (
    typeof dataset['tanzilNotice'] !== 'string' ||
    !dataset['tanzilNotice'].includes('Copyright (C) 2007-2021 Tanzil Project')
  ) {
    throw new Error('Analytics evidence is missing the Tanzil copyright notice.');
  }

  const totals = object(dataset['totals'], 'Analytics totals');
  const curTotal = count(totals['curatedLinks'], 'Curated links');
  const curWithin = count(totals['curatedWithin'], 'Curated within-surah links');
  const curAcross = count(totals['curatedAcross'], 'Curated cross-surah links');
  const exactTotal = count(totals['exactExpressions'], 'Exact expressions');
  const exactWithin = count(totals['exactWithinSurahExpressions'], 'Exact within-surah phrases');
  const exactAcross = count(totals['exactCrossSurahExpressions'], 'Exact cross-surah phrases');
  const spansTotal = count(totals['exactSpans'], 'Exact source spans');
  if (
    count(totals['surahs'], 'Surahs') !== CANONICAL_QURAN.surahCount ||
    count(totals['ayahs'], 'Ayahs') !== CANONICAL_QURAN.ayahCount ||
    curTotal !== curatedLinkCount ||
    curWithin + curAcross !== curTotal ||
    exactWithin + exactAcross !== exactTotal
  ) {
    throw new Error('Analytics totals contradict their evidence types.');
  }

  const rows = array(dataset['surahs'], 'Surah analytics');
  if (rows.length !== CANONICAL_QURAN.surahCount) {
    throw new Error('Analytics must cover all 114 surahs.');
  }
  let spans = 0;
  let incident = 0;
  for (const [position, raw] of rows.entries()) {
    const row = object(raw, 'Surah analytics row');
    const surah = position + 1;
    const range = CANONICAL_QURAN.surahRange(surah);
    const ayahCount = count(row['ayahCount'], 'Ayah count');
    const links = count(row['curatedLinks'], 'Curated incidences');
    const within = count(row['curatedWithin'], 'Within-surah incidences');
    const across = count(row['curatedAcross'], 'Cross-surah incidences');
    const expressions = count(row['exactExpressions'], 'Surah expression groups');
    const occurrences = count(row['exactSpans'], 'Surah expression spans');
    const crossExpressions = count(
      row['exactCrossSurahExpressions'],
      'Surah cross-surah expression groups',
    );
    if (
      count(row['surah'], 'Surah number') !== surah ||
      ayahCount !== range.end - range.start + 1 ||
      links !== within + across ||
      within > curWithin ||
      across > curAcross ||
      crossExpressions > expressions ||
      expressions > exactTotal ||
      occurrences < expressions
    ) {
      throw new Error('Analytics surah aggregation is inconsistent.');
    }
    location(row['firstCuratedAyah'], range.start, range.end, links > 0);
    location(row['firstExactAyah'], range.start, range.end, occurrences > 0);
    rate(row['curatedPer100Ayahs'], 'Curated incidence rate', links, ayahCount);
    rate(row['exactSpansPer100Ayahs'], 'Exact span rate', occurrences, ayahCount);
    incident += links;
    spans += occurrences;
  }
  if (spans !== spansTotal || incident < curTotal) {
    throw new Error('Analytics evidence totals do not match the surah bins.');
  }

  const top = array(dataset['topExpressions'], 'Ranked exact expressions');
  if (top.length > QURAN_ANALYTICS_TOP_LIMIT || top.length > exactTotal) {
    throw new Error('The ranked expression projection exceeds its 32-item budget.');
  }
  const ids = new Set<string>();
  let previous = Number.POSITIVE_INFINITY;
  for (const raw of top) {
    const expression = object(raw, 'Ranked expression');
    const words = array(expression['words'], 'Exact Arabic phrase words');
    const wordCount = count(expression['wordCount'], 'Exact phrase length');
    const spanCount = count(expression['spanCount'], 'Phrase span count');
    const distinctAyahs = count(expression['distinctAyahCount'], 'Distinct ayah count');
    const surahCount = count(expression['surahCount'], 'Phrase surah count');
    const first = count(expression['firstAyah'], 'First phrase ayah');
    const id = expression['id'];
    if (
      typeof id !== 'string' ||
      !/^exact:v1:[a-f0-9]{64}$/.test(id) ||
      ids.has(id) ||
      wordCount < 3 ||
      wordCount > 8 ||
      words.length !== wordCount ||
      !words.every((word) => typeof word === 'string' && word.length > 0 && !/\s/u.test(word)) ||
      spanCount < 2 ||
      spanCount > previous ||
      distinctAyahs < 2 ||
      distinctAyahs > spanCount ||
      surahCount < 1 ||
      surahCount > distinctAyahs ||
      first >= CANONICAL_QURAN.ayahCount
    ) {
      throw new Error('Invalid computed-expression analytics ranking.');
    }
    previous = spanCount;
    ids.add(id);
  }
  return input as QuranAnalyticsDataset;
}

async function fetchChecked(path: string, signal?: AbortSignal): Promise<Response> {
  const result = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!result.ok) {
    throw new Error('Unable to load ' + path + ' (HTTP ' + String(result.status) + ').');
  }
  return result;
}

export async function loadQuranAnalytics(
  data: QuranReaderData,
  signal?: AbortSignal,
): Promise<QuranAnalyticsDataset> {
  const [manifestResponse, analyticsResponse] = await Promise.all([
    fetchChecked(MANIFEST_FILE, signal),
    fetchChecked(ANALYTICS_FILE, signal),
  ]);
  const manifest: unknown = await manifestResponse.json();
  const record = object(manifest, 'Quran publication manifest');
  const outputs = object(record['outputs'], 'Published output hashes');
  const digest = outputs['analytics.json'];
  const pins = array(record['sources'], 'Pinned source registry');
  const source = (id: string): string => {
    const found = pins.find((raw) => object(raw, 'Source pin')['id'] === id);
    const sha = object(found, 'Source pin')['sha256'];
    if (typeof sha !== 'string' || !/^[a-f0-9]{64}$/.test(sha)) {
      throw new Error('Quran analytics source pin is invalid.');
    }
    return sha;
  };
  if (
    record['format'] !== 'quran-foundation-manifest' ||
    record['schemaVersion'] !== 1 ||
    record['versification'] !== CANONICAL_QURAN.id ||
    typeof digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(digest)
  ) {
    throw new Error('Quran analytics publication manifest is incompatible.');
  }
  const expectedHashes = {
    arabic: source('tanzil-uthmani'),
    curated: source('mutashabihat'),
  };
  const body = await analyticsResponse.text();
  const bytes = new TextEncoder().encode(body);
  if (bytes.byteLength > MAX_ANALYTICS_BYTES) {
    throw new Error('Analytics artifact exceeds the 256 KiB transfer budget.');
  }
  const sha = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(sha), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  if (actual !== digest) throw new Error('Analytics artifact failed its SHA-256 verification.');
  const parsed: unknown = JSON.parse(body);
  return parseQuranAnalytics(parsed, expectedHashes, data.relationships.linkCount);
}
