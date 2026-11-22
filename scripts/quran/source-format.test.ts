import { getFileInfo } from 'prettier';
import { describe, expect, it } from 'vitest';

describe('Quran source formatting protection', () => {
  it('excludes the pinned Arabic, English and relationship snapshots from Prettier', async () => {
    const files = [
      'data/raw/quran-uthmani-1.1.txt',
      'data/raw/en.pickthall.txt',
      'data/raw/mutashabiha_data.json',
    ];
    for (const file of files) {
      const info = await getFileInfo(file, { ignorePath: '.prettierignore' });
      expect(info.ignored, file).toBe(true);
    }
  });

  it('excludes generated Quran datasets from Prettier', async () => {
    const files = [
      'data/quran/generated/text.json',
      'public/quran-only/data/quran/relationships.json',
    ];
    for (const file of files) {
      const info = await getFileInfo(file, { ignorePath: '.prettierignore' });
      expect(info.ignored, file).toBe(true);
    }
  });
});
