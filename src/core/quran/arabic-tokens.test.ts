import { describe, expect, it } from 'vitest';
import {
  QURAN_EXACT_TOKEN_POLICY,
  tokenizeArabicAyah,
  tokenizeQuranArabic,
} from './arabic-tokens.ts';

describe('verbatim Uthmani Arabic tokenization', () => {
  it('retains diacritics, Quran marks, UTF-16 character offsets and word order', () => {
    expect(QURAN_EXACT_TOKEN_POLICY).toBe('tanzil-uthmani-whitespace-verbatim-v1');
    const text = '  بِسْمِ  ٱللَّهِ\tالرَّحْمَٰنِ  ';
    const tokens = tokenizeArabicAyah(text);
    expect(tokens.map((token) => token.text)).toEqual(['بِسْمِ', 'ٱللَّهِ', 'الرَّحْمَٰنِ']);
    expect(tokens.map((token) => token.word)).toEqual([0, 1, 2]);
    for (const token of tokens) {
      expect(text.slice(token.start, token.end)).toBe(token.text);
    }
    expect(tokens[0]?.start).toBe(2);
  });

  it('does not conflate vocalized, unvocalized or distinct Unicode strings', () => {
    expect(tokenizeArabicAyah('قَالَ')[0]?.text).not.toBe(tokenizeArabicAyah('قال')[0]?.text);
    expect(tokenizeArabicAyah('أَلِف')[0]?.text).not.toBe(tokenizeArabicAyah('اَلِف')[0]?.text);
  });

  it('rejects whitespace-only, NUL, invalid values and noncanonical ayah counts', () => {
    expect(() => tokenizeArabicAyah('  \n')).toThrow(TypeError);
    expect(() => tokenizeArabicAyah('abc\0def')).toThrow('NUL');
    expect(() => tokenizeArabicAyah(null as unknown as string)).toThrow(TypeError);
    expect(() => tokenizeQuranArabic(['بِسْمِ'])).toThrow('6,236');
    const ayahs = Array.from({ length: 6236 }, () => 'بِسْمِ ٱللَّهِ');
    const result = tokenizeQuranArabic(ayahs);
    expect(result).toHaveLength(6236);
    expect(result[0]?.map((token) => token.word)).toEqual([0, 1]);
  });
});
