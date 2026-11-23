import { QuranThemeIndex } from '../core/quran/theme-index.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';

const DATA_FILE = 'data/quran/themes.json';
const MANIFEST_FILE = 'data/quran/manifest.json';
const MAX_BYTES = 512 * 1024;

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid ' + label + ' in the QSAC publication.');
  }
  return value as Record<string, unknown>;
}

function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('QSAC SHA-256 source pin is invalid.');
  }
  return value;
}

async function checkedFetch(path: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error('Unable to load ' + path + ' (HTTP ' + String(response.status) + ').');
  }
  return response;
}

export async function loadQuranThemes(signal?: AbortSignal): Promise<QuranThemeIndex> {
  const [manifestResponse, dataResponse] = await Promise.all([
    checkedFetch(MANIFEST_FILE, signal),
    checkedFetch(DATA_FILE, signal),
  ]);
  const metadata: unknown = await manifestResponse.json();
  const manifest = object(metadata, 'Quran foundation manifest');
  if (
    manifest['format'] !== 'quran-foundation-manifest' ||
    manifest['schemaVersion'] !== 1 ||
    manifest['versification'] !== CANONICAL_QURAN.id
  ) {
    throw new Error('QSAC themes require the canonical Quran publication manifest.');
  }
  const expected = digest(object(manifest['outputs'], 'outputs')['themes.json']);
  const sources = manifest['sources'];
  if (!Array.isArray(sources)) throw new Error('QSAC source pins are missing.');
  const pin = (id: string): string => {
    const found: unknown = (sources as unknown[]).find((item) => {
      return (
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        (item as Record<string, unknown>)['id'] === id
      );
    });
    const record = object(found, 'QSAC input source');
    if (
      typeof record['url'] !== 'string' ||
      !record['url'].includes('/cb3852b127bfdda6668c5eec9e5c1d9cdcde3810/') ||
      typeof record['attribution'] !== 'string' ||
      !record['attribution'].includes('QSAC')
    ) {
      throw new Error('Untrusted or missing QSAC annotation provenance.');
    }
    return digest(record['sha256']);
  };
  const hashes = {
    annotations: pin('qsac-verse-tags-v1'),
    ontology: pin('qsac-ontology-v1'),
  };
  const content = await dataResponse.text();
  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error('The QSAC thematic projection exceeds its 512 KiB data budget.');
  }
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== expected) {
    throw new Error('QSAC thematic evidence failed the published SHA-256 checksum.');
  }
  const parsed: unknown = JSON.parse(content);
  return new QuranThemeIndex(parsed, hashes);
}
