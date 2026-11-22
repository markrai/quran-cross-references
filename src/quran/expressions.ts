import { QuranExpressionIndex } from '../core/quran/expression-browser.ts';
import type { QuranEvidenceSource } from '../core/quran/relationship-evidence.ts';

const EXPRESSION_FILE = 'data/quran/expressions.json';
const MANIFEST_FILE = 'data/quran/manifest.json';
const MAX_EXPRESSION_BYTES = 4 * 1024 * 1024;

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid expression publication manifest.');
  }
  return value as Record<string, unknown>;
}

async function response(path: string, signal?: AbortSignal): Promise<Response> {
  const result = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!result.ok) {
    throw new Error('Unable to load ' + path + ' (HTTP ' + String(result.status) + ').');
  }
  return result;
}

export async function loadQuranExpressions(
  arabic: readonly string[],
  signal?: AbortSignal,
): Promise<QuranExpressionIndex> {
  const [manifestResponse, expressionResponse] = await Promise.all([
    response(MANIFEST_FILE, signal),
    response(EXPRESSION_FILE, signal),
  ]);
  const manifest = object(await manifestResponse.json());
  const outputs = object(manifest['outputs']);
  const digest = outputs['expressions.json'];
  if (
    manifest['format'] !== 'quran-foundation-manifest' ||
    manifest['schemaVersion'] !== 1 ||
    typeof digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(digest)
  ) {
    throw new Error('The exact expression publication is not pinned.');
  }
  const pins = manifest['sources'];
  if (!Array.isArray(pins)) {
    throw new Error('The source registry is missing.');
  }
  const sourceValue: unknown = pins.find(
    (pin: unknown) => object(pin)['id'] === 'tanzil-uthmani',
  );
  const pin = object(sourceValue);
  const fields = [
    'id',
    'fileName',
    'url',
    'sha256',
    'license',
    'attribution',
    'retrievedAt',
  ] as const;
  if (!fields.every((field) => typeof pin[field] === 'string')) {
    throw new Error('The pinned Tanzil source metadata is incomplete.');
  }
  const raw = await expressionResponse.text();
  const bytes = new TextEncoder().encode(raw);
  if (bytes.byteLength > MAX_EXPRESSION_BYTES) {
    throw new Error('Exact expression evidence exceeds the approved 4 MiB transfer budget.');
  }
  const computed = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(computed), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== digest) {
    throw new Error('Exact expression evidence failed its publication checksum.');
  }
  const value: unknown = JSON.parse(raw);
  return new QuranExpressionIndex(value, arabic, pin as unknown as QuranEvidenceSource);
}
