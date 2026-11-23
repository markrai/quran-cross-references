import { QuranEmotionIndex } from '../core/quran/emotion-index.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';

const DATA_PATH = 'data/quran/emotions.json';
const MANIFEST_PATH = 'data/quran/manifest.json';
const MAX_BYTES = 128 * 1024;
const REVISION = '364cdccf6518e35003db51ccf856d9328dbb7ff3';
const SOURCE_URL = 'https://raw.githubusercontent.com/Arwaalmrzoqi/ELQV/' + REVISION + '/ELQV.csv';

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid ' + label + ' in the ELQV publication.');
  }
  return value as Record<string, unknown>;
}

function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('Invalid SHA-256 checksum in the ELQV publication.');
  }
  return value;
}

async function checkedFetch(path: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error('Unable to retrieve ' + path + ' (HTTP ' + String(response.status) + ').');
  }
  return response;
}

export async function loadQuranEmotions(signal?: AbortSignal): Promise<QuranEmotionIndex> {
  const [metadata, evidence] = await Promise.all([
    checkedFetch(MANIFEST_PATH, signal),
    checkedFetch(DATA_PATH, signal),
  ]);
  const parsedManifest: unknown = await metadata.json();
  const manifest = record(parsedManifest, 'canonical Quran manifest');
  if (
    manifest['format'] !== 'quran-foundation-manifest' ||
    manifest['schemaVersion'] !== 1 ||
    manifest['versification'] !== CANONICAL_QURAN.id
  ) {
    throw new Error('ELQV research labels require the canonical Quran publication manifest.');
  }
  const expected = digest(record(manifest['outputs'], 'manifest outputs')['emotions.json']);
  const sources = manifest['sources'];
  if (!Array.isArray(sources)) throw new Error('Original ELQV source registration is missing.');
  const rawPin: unknown = (sources as unknown[]).find(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (item as Record<string, unknown>)['id'] === 'elqv-2025-expert-emotions',
  );
  const pin = record(rawPin, 'ELQV original source pin');
  if (
    pin['url'] !== SOURCE_URL ||
    pin['fileName'] !== 'ELQV.csv' ||
    typeof pin['attribution'] !== 'string' ||
    !pin['attribution'].includes('ELQV')
  ) {
    throw new Error('ELQV source provenance was not verified.');
  }
  const sha256 = digest(pin['sha256']);
  const content = await evidence.text();
  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error('The optional ELQV evidence exceeds its 128 KiB budget.');
  }
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expected) {
    throw new Error('ELQV evidence failed the published output SHA-256 checksum.');
  }
  const parsed: unknown = JSON.parse(content);
  return new QuranEmotionIndex(parsed, sha256);
}
