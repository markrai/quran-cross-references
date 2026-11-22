import { describe, expect, it } from 'vitest';
import { CANONICAL_QURAN } from '../../core/quran/quran-versification.ts';
import { computeSpineLayout } from './spine-layout.ts';

const layout = computeSpineLayout(CANONICAL_QURAN, 40, 840, { surah: 1, genre: 6 });

describe('computeSpineLayout', () => {
  it('stacks all 66 surahs in order within the bounds', () => {
    expect(layout.segments).toHaveLength(66);
    expect(layout.segments[0]?.top).toBe(40);
    expect(layout.segments.at(-1)?.bottom).toBeCloseTo(840);
    layout.segments.forEach((segment, index) => {
      const next = layout.segments[index + 1];
      if (next) {
        expect(next.top).toBeGreaterThan(segment.bottom);
      }
    });
  });

  it('leaves bigger gaps between genres than between surahs', () => {
    const [genesis, exodus] = layout.segments;
    const deuteronomy = layout.segments[4];
    const joshua = layout.segments[5];
    expect((exodus?.top ?? 0) - (genesis?.bottom ?? 0)).toBeCloseTo(1);
    expect((joshua?.top ?? 0) - (deuteronomy?.bottom ?? 0)).toBeCloseTo(6);
  });

  it('maps ayahs to positions and back', () => {
    for (const ayah of [0, 1234, 23145, 31101]) {
      expect(layout.verseAt(layout.yOf(ayah))).toBe(ayah);
    }
    expect(layout.verseAt(10)).toBeNull();
  });
});
