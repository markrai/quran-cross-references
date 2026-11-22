import { QuranMorphologyIndex } from '../core/quran/morphology-index.ts';
import type { QuranMorphologySource } from '../core/quran/morphology-evidence.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';

const MORPHOLOGY_PATH = 'data/quran/morphology.json';
const MANIFEST_PATH = 'data/quran/manifest.json';
const MAX_MORPHOLOGY_BYTES = 12 * 1024 * 1024;

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid ' + label + ' in the MAQAM publication.');
  }
  return value as Record<string, unknown>;
}

function sha(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('Invalid SHA-256 for MAQAM morphology.');
  }
  return value;
}

async function checkedFetch(path: string, signal?: AbortSignal): Promise<Response> {
  const result = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!result.ok) {
    throw new Error('Unable to load ' + path + ' (HTTP ' + String(result.status) + ').');
  }
  return result;
}

export async function loadQuranMorphology(signal?: AbortSignal): Promise<QuranMorphologyIndex> {
  const [manifestResponse, morphologyResponse] = await Promise.all([
    checkedFetch(MANIFEST_PATH, signal),
    checkedFetch(MORPHOLOGY_PATH, signal),
  ]);
  const manifest: unknown = await manifestResponse.json();
  const metadata = record(manifest, 'Quran publication manifest');
  if (
    metadata['format'] !== 'quran-foundation-manifest' ||
    metadata['schemaVersion'] !== 1 ||
    metadata['versification'] !== CANONICAL_QURAN.id
  ) {
    throw new Error('The Quran foundation manifest is incompatible with MAQAM.');
  }
  const outputs = record(metadata['outputs'], 'published output registry');
  const expectedSha = sha(outputs['morphology.json']);
  const sources = metadata['sources'];
  if (!Array.isArray(sources)) throw new Error('MAQAM source registry missing.');
  const match: unknown = (sources as unknown[]).find((entry) => {
    return (
      typeof entry === 'object' &&
      entry !== null &&
      !Array.isArray(entry) &&
      (entry as Record<string, unknown>)['id'] === 'maqam-2026'
    );
  });
  const selected = record(match, 'MAQAM source provenance');
  sha(selected['sha256']);
  if (
    typeof selected['license'] !== 'string' ||
    !selected['license'].includes('CC BY 4.0') ||
    typeof selected['id'] !== 'string' ||
    selected['id'] !== 'maqam-2026' ||
    typeof selected['url'] !== 'string' ||
    typeof selected['fileName'] !== 'string' ||
    typeof selected['attribution'] !== 'string' ||
    typeof selected['retrievedAt'] !== 'string'
  ) {
    throw new Error('The MAQAM CC BY 4.0 provenance is missing.');
  }
  const content = await morphologyResponse.text();
  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > MAX_MORPHOLOGY_BYTES) {
    throw new Error('The MAQAM report exceeds its 12 MiB transfer budget.');
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expectedSha) {
    throw new Error('The MAQAM morphology artifact failed its SHA-256 verification.');
  }
  const parsed: unknown = JSON.parse(content);
  return new QuranMorphologyIndex(parsed, selected as unknown as QuranMorphologySource);
}
