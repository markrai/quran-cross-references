import { QacMorphologyIndex } from '../core/quran/qac-index.ts';
import type { QacSource } from '../core/quran/qac-types.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';

const FILE = 'data/quran/morphology.json';
const MANIFEST = 'data/quran/manifest.json';
const MAX_BYTES = 14 * 1024 * 1024;

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid ' + label + ' in the QAC publication.');
  }
  return value as Record<string, unknown>;
}

function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error('The QAC publication SHA-256 is invalid.');
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

export async function loadQacMorphology(signal?: AbortSignal): Promise<QacMorphologyIndex> {
  const [manifestResponse, dataResponse] = await Promise.all([
    checkedFetch(MANIFEST, signal),
    checkedFetch(FILE, signal),
  ]);
  const metadata: unknown = await manifestResponse.json();
  const manifest = object(metadata, 'Quran foundation manifest');
  if (
    manifest['format'] !== 'quran-foundation-manifest' ||
    manifest['schemaVersion'] !== 1 ||
    manifest['versification'] !== CANONICAL_QURAN.id
  ) {
    throw new Error('QAC morphology requires the canonical Quran publication manifest.');
  }
  const outputs = object(manifest['outputs'], 'manifest outputs');
  const expected = digest(outputs['morphology.json']);
  const pins = manifest['sources'];
  if (!Array.isArray(pins)) throw new Error('The QAC source registry is missing.');
  const source: unknown = (pins as unknown[]).find((entry) => {
    return (
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      (entry as Record<string, unknown>)['id'] === 'qac-morphology-v04'
    );
  });
  const pin = object(source, 'QAC source pin');
  digest(pin['sha256']);
  for (const key of ['id', 'url', 'fileName', 'license', 'attribution', 'retrievedAt']) {
    if (typeof pin[key] !== 'string' || pin[key].length === 0) {
      throw new Error('Missing QAC provenance field ' + key + '.');
    }
  }
  const content = await dataResponse.text();
  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error('QAC morphology exceeds the 14 MiB optional data budget.');
  }
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== expected) {
    throw new Error('QAC morphology failed the published SHA-256 checksum.');
  }
  const payload: unknown = JSON.parse(content);
  return new QacMorphologyIndex(payload, pin as unknown as QacSource);
}
