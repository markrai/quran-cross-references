export const QURAN_EXACT_TOKEN_POLICY = 'tanzil-uthmani-whitespace-verbatim-v1';

export interface QuranArabicToken {
  readonly text: string;
  readonly word: number;
  readonly start: number;
  readonly end: number;
}

export function tokenizeArabicAyah(text: string): readonly QuranArabicToken[] {
  if (typeof text !== 'string' || text.trim().length === 0 || text.includes('\0')) {
    throw new TypeError('Arabic ayah must contain nonempty verbatim text without NUL bytes.');
  }
  const tokens: QuranArabicToken[] = [];
  const pattern = /\S+/gu;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const word = match[0];
    tokens.push({ text: word, word: tokens.length, start, end: start + word.length });
  }
  if (tokens.length === 0) throw new TypeError('Arabic ayah must contain a token.');
  return tokens;
}

export function tokenizeQuranArabic(ayahs: readonly string[]): readonly (readonly QuranArabicToken[])[] {
  if (ayahs.length !== 6236) {
    throw new RangeError('Exact-expression corpus must contain all 6,236 canonical ayahs.');
  }
  return ayahs.map((ayah) => tokenizeArabicAyah(ayah));
}
