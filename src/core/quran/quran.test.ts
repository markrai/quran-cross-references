import { describe, expect, it } from 'vitest';
import { formatAyahId, parseAyahId } from './ayah-ref.ts';
import {
  surahPassageOf,
  ayahPassage,
  parsePassageId,
  passageRange,
  toPassageId,
} from './passage.ts';
import { QURAN_VERSIFICATION } from './quran-versification.ts';
import { formatReference, parseReference } from './reference.ts';
import { SURAHS, getSurah, isSurahNumber } from './surahs.ts';

describe('Quran foundations', () => {
  it('contains exactly 114 surahs and 6,236 numbered ayahs', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((count, surah) => count + surah.ayahCount, 0)).toBe(6236);
    expect(QURAN_VERSIFICATION.surahCount).toBe(114);
    expect(QURAN_VERSIFICATION.ayahCount).toBe(6236);
    expect(getSurah(1).name).toBe('Al-Fatihah');
    expect(getSurah(114).arabicName).toBe('الناس');
  });

  it('round-trips every canonical reference in both directions', () => {
    for (let index = 0; index < 6236; index += 1) {
      const reference = QURAN_VERSIFICATION.refAt(index);
      expect(QURAN_VERSIFICATION.indexOf(reference)).toBe(index);
    }
    expect(QURAN_VERSIFICATION.indexOf({ surah: 2, ayah: 286 })).toBe(292);
    expect(QURAN_VERSIFICATION.refAt(6235)).toEqual({ surah: 114, ayah: 6 });
    expect(QURAN_VERSIFICATION.surahRange(2)).toEqual({
      surah: 2,
      start: 7,
      end: 292,
    });
  });

  it('rejects invalid references and ranges', () => {
    expect(QURAN_VERSIFICATION.indexOf({ surah: 2, ayah: 287 })).toBeUndefined();
    expect(QURAN_VERSIFICATION.indexOf({ surah: 0, ayah: 1 })).toBeUndefined();
    expect(QURAN_VERSIFICATION.indexOf({ surah: 2, ayah: 0 })).toBeUndefined();
    expect(QURAN_VERSIFICATION.indexOf({ surah: 2, ayah: 1.5 })).toBeUndefined();
    expect(QURAN_VERSIFICATION.ayahCountOf(115)).toBeUndefined();
    expect(() => QURAN_VERSIFICATION.refAt(-1)).toThrow(RangeError);
    expect(() => QURAN_VERSIFICATION.refAt(6236)).toThrow(RangeError);
    expect(() => QURAN_VERSIFICATION.surahRange(115)).toThrow(RangeError);
    expect(() => getSurah(0)).toThrow(RangeError);
    expect(isSurahNumber(2)).toBe(true);
    expect(isSurahNumber(2.5)).toBe(false);
  });

  it('parses numeric, transliterated, and Arabic references', () => {
    const expected = { ok: true, reference: { surah: 2, ayah: 255 } };
    expect(parseReference('2:255')).toEqual(expected);
    expect(parseReference('Surah 2 Ayah 255')).toEqual(expected);
    expect(parseReference('Al-Baqarah 255')).toEqual(expected);
    expect(parseReference('البقرة 255')).toEqual(expected);
    expect(parseReference('2:287')).toMatchObject({
      ok: false,
      error: { kind: 'no-such-ayah' },
    });
    expect(parseReference('115:1')).toMatchObject({
      ok: false,
      error: { kind: 'unknown-surah' },
    });
    expect(parseReference('Unknown 4')).toMatchObject({
      ok: false,
      error: { kind: 'unknown-surah' },
    });
    expect(parseReference('nonsense')).toMatchObject({
      ok: false,
      error: { kind: 'unreadable' },
    });
    expect(formatReference({ surah: 2, ayah: 255 })).toBe('Al-Baqarah 2:255');
  });

  it('round-trips ayah IDs and passage deep links', () => {
    expect(formatAyahId({ surah: 2, ayah: 255 })).toBe('2:255');
    expect(parseAyahId('2:255')).toEqual({ surah: 2, ayah: 255 });
    expect(parseAyahId('115:1')).toBeUndefined();
    const passage = parsePassageId('2:255', QURAN_VERSIFICATION);
    expect(passage).toEqual(ayahPassage(261));
    expect(passage && toPassageId(passage, QURAN_VERSIFICATION)).toBe('2:255');
    expect(parsePassageId('2', QURAN_VERSIFICATION)).toEqual({
      kind: 'surah',
      surah: 2,
    });
    expect(parsePassageId('2:287', QURAN_VERSIFICATION)).toBeUndefined();
    expect(parsePassageId('115', QURAN_VERSIFICATION)).toBeUndefined();
    expect(passageRange({ kind: 'surah', surah: 2 }, QURAN_VERSIFICATION)).toEqual({
      surah: 2,
      start: 7,
      end: 292,
    });
    expect(surahPassageOf(7, QURAN_VERSIFICATION)).toEqual({
      kind: 'surah',
      surah: 2,
    });
  });
});
