import type { QuranReaderData } from './model.ts';
import { buildQuranTopology, type QuranTopologyDataset } from './topology-model.ts';

const REPORT_FILE = 'data/quran/topology.json';
const MANIFEST_FILE = 'data/quran/manifest.json';
const MAX_TOPOLOGY_BYTES = 512 * 1024;

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Quran topology publication.');
  }
  return value as Record<string, unknown>;
}

function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('Quran topology SHA-256 is invalid.');
  }
  return value;
}

export function verifyQuranTopology(
  input: unknown,
  data: QuranReaderData,
  sourceSha256: string,
): QuranTopologyDataset {
  const parsed = record(input);
  const expected = buildQuranTopology(data.relationships, sourceSha256);
  if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
    throw new Error('Curated graph topology does not match the verified source relationships.');
  }
  return expected;
}

async function checkedFetch(path: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error('Unable to load ' + path + ' (HTTP ' + String(response.status) + ').');
  }
  return response;
}

export async function loadQuranTopology(
  data: QuranReaderData,
  signal?: AbortSignal,
): Promise<QuranTopologyDataset> {
  const [manifestResponse, topologyResponse] = await Promise.all([
    checkedFetch(MANIFEST_FILE, signal),
    checkedFetch(REPORT_FILE, signal),
  ]);
  const manifest: unknown = await manifestResponse.json();
  const metadata = record(manifest);
  if (
    metadata['format'] !== 'quran-foundation-manifest' ||
    metadata['schemaVersion'] !== 1 ||
    metadata['versification'] !== data.relationships.versification.id
  ) {
    throw new Error('Incompatible Quran topology publication manifest.');
  }
  const outputs = record(metadata['outputs']);
  const expectedDigest = digest(outputs['topology.json']);
  const pins = metadata['sources'];
  if (!Array.isArray(pins)) throw new Error('Missing Quran source registry.');
  const source = pins.find((entry: unknown) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false;
    return (entry as Record<string, unknown>)['id'] === 'mutashabihat';
  });
  const sourceSha = digest(record(source)['sha256']);
  const content = await topologyResponse.text();
  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength > MAX_TOPOLOGY_BYTES) {
    throw new Error('The curated topology report exceeds its 512 KiB transfer budget.');
  }
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expectedDigest) {
    throw new Error('Curated topology failed its SHA-256 publication checksum.');
  }
  const parsed: unknown = JSON.parse(content);
  return verifyQuranTopology(parsed, data, sourceSha);
}
