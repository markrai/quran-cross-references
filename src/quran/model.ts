import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';

export interface QuranText {
  readonly arabic: readonly string[];
  readonly english: readonly string[];
}

export interface QuranReaderData {
  readonly text: QuranText;
  readonly relationships: QuranRelationshipIndex;
}

export const QURAN_DATA_FILES = ['data/quran/text.json', 'data/quran/relationships.json'] as const;

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Quran dataset must be an object.');
  }
  return value as Record<string, unknown>;
}

export function parseQuranText(value: unknown): QuranText {
  const input = record(value);
  if (
    input['format'] !== 'quran-paired-text' ||
    input['schemaVersion'] !== 1 ||
    input['versification'] !== CANONICAL_QURAN.id
  ) {
    throw new Error('Quran text format, schema or versification is incompatible.');
  }
  const arabic = input['arabic'];
  const english = input['english'];
  const valid = (texts: unknown): texts is string[] =>
    Array.isArray(texts) &&
    texts.length === CANONICAL_QURAN.ayahCount &&
    texts.every((text: unknown) => typeof text === 'string' && text.trim().length > 0);
  if (!valid(arabic) || !valid(english)) {
    throw new Error('Quran text must contain 6,236 nonempty ayahs in each language.');
  }
  return { arabic, english };
}

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(import.meta.env.BASE_URL + path, signal ? { signal } : undefined);
  if (!response.ok)
    throw new Error('Unable to load ' + path + ' (HTTP ' + String(response.status) + ').');
  const value: unknown = await response.json();
  return value;
}

export async function loadQuranReaderData(signal?: AbortSignal): Promise<QuranReaderData> {
  const [text, links] = await Promise.all(QURAN_DATA_FILES.map((path) => fetchJson(path, signal)));
  return {
    text: parseQuranText(text),
    relationships: new QuranRelationshipIndex(links),
  };
}
