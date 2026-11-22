import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { QuranEvidenceSource } from '../../src/core/quran/relationship-evidence.ts';
import {
  createExactExpressionEvidence,
  exactExpressionId,
  validateExactExpressionEvidence,
} from './expression-evidence.ts';

const SOURCE: QuranEvidenceSource = {
  id: 'tanzil-uthmani',
  fileName: 'quran-uthmani-1.1.txt',
  url: 'https://tanzil.net/example',
  sha256: 'a'.repeat(64),
  license: 'CC BY 3.0',
  attribution: 'Tanzil Quran Text',
  retrievedAt: '2026-11-01',
};
const arabic = (): string[] =>
  Array.from({ length: 6236 }, (_, index) =>
    index < 2 ? 'بِسْمِ ٱللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' : 'ض',
  );
const create = () => createExactExpressionEvidence(arabic(), SOURCE);

describe('independent exact-expression evidence', () => {
  it('uses policy namespaced SHA-256 IDs that do not depend on discovery order', () => {
    const words = ['بِسْمِ', 'ٱللَّهِ', 'الرَّحْمَٰنِ'];
    const expected = createHash('sha256')
      .update('tanzil-uthmani-whitespace-verbatim-v1')
      .update('\0')
      .update(JSON.stringify(words))
      .digest('hex');
    expect(exactExpressionId(words)).toBe('exact:v1:' + expected);
    expect(exactExpressionId(words)).toBe(exactExpressionId([...words]));
    expect(exactExpressionId(['بسم', 'الله', 'الرحمن'])).not.toBe(exactExpressionId(words));
    for (const invalid of [[], ['أ'], ['أ', 'ب', ' '], Array(9).fill('أ')]) {
      expect(() => exactExpressionId(invalid)).toThrow('3–8');
    }
  });

  it('generates verifiable computed evidence with precise canonical word spans', () => {
    const dataset = create();
    expect(dataset.format).toBe('quran-exact-expressions');
    expect(dataset.schemaVersion).toBe(1);
    expect(dataset.versification).toBe('hafs-kufan-6236');
    expect(dataset.tokenPolicy).toBe('tanzil-uthmani-whitespace-verbatim-v1');
    expect(dataset.minWords).toBe(3);
    expect(dataset.maxWords).toBe(8);
    expect(dataset.source).toEqual(SOURCE);
    expect(dataset.expressions).toHaveLength(1);
    expect(dataset.expressions[0]?.origin).toBe('computed');
    expect(dataset.expressions[0]?.kind).toBe('exact-repeated-expression');
    expect(dataset.expressions[0]?.occurrences).toEqual([
      { ayah: 0, start: 0, end: 4 },
      { ayah: 1, start: 0, end: 4 },
    ]);
    expect(validateExactExpressionEvidence(dataset, arabic(), SOURCE)).toBe(dataset);
    expect(JSON.stringify(create())).toBe(JSON.stringify(dataset));
  });

  it('rejects absent or forged source provenance before generation or parsing', () => {
    expect(() => createExactExpressionEvidence(arabic(), { ...SOURCE, id: 'other' })).toThrow(
      'source must be',
    );
    expect(() =>
      createExactExpressionEvidence(arabic(), { ...SOURCE, sha256: 'short' }),
    ).toThrow('source must be');
    expect(() =>
      createExactExpressionEvidence(arabic(), { ...SOURCE, fileName: '' }),
    ).toThrow('source must be');
    expect(() =>
      createExactExpressionEvidence(arabic(), { ...SOURCE, license: '' }),
    ).toThrow('source must be');
    expect(() =>
      createExactExpressionEvidence(arabic(), { ...SOURCE, attribution: '' }),
    ).toThrow('source must be');
    expect(() =>
      createExactExpressionEvidence(arabic(), { ...SOURCE, retrievedAt: 'invalid' }),
    ).toThrow('source must be');
    expect(() =>
      createExactExpressionEvidence(arabic(), { ...SOURCE, url: 'http://wrong' }),
    ).toThrow('source must be');
    const dataset = create();
    expect(() =>
      validateExactExpressionEvidence(dataset, arabic(), { ...SOURCE, sha256: 'wrong' }),
    ).toThrow('source must be');
    expect(() =>
      validateExactExpressionEvidence({ ...dataset, source: null }, arabic(), SOURCE),
    ).toThrow('source must be an object');
    expect(() =>
      validateExactExpressionEvidence(
        { ...dataset, source: { ...SOURCE, sha256: 'b'.repeat(64) } },
        arabic(),
        SOURCE,
      ),
    ).toThrow('source.sha256');
  });

  it('rejects unsupported schema, versification, token policy, ranges and missing records', () => {
    const dataset = create();
    expect(() => validateExactExpressionEvidence(null, arabic(), SOURCE)).toThrow('dataset');
    for (const change of [
      { format: 'curated' },
      { schemaVersion: 2 },
      { versification: 'unknown' },
      { tokenPolicy: 'folded' },
      { minWords: 2 },
      { maxWords: 9 },
    ]) {
      expect(() =>
        validateExactExpressionEvidence({ ...dataset, ...change }, arabic(), SOURCE),
      ).toThrow();
    }
    expect(() =>
      validateExactExpressionEvidence({ ...dataset, expressions: [] }, arabic(), SOURCE),
    ).toThrow('generated count');
    expect(() =>
      validateExactExpressionEvidence(
        { ...dataset, statistics: { ...dataset.statistics, tokenCount: 0 } },
        arabic(),
        SOURCE,
      ),
    ).toThrow('statistics');
    expect(() =>
      validateExactExpressionEvidence(
        { ...dataset, statistics: { ...dataset.statistics, emittedOccurrences: -1 } },
        arabic(),
        SOURCE,
      ),
    ).toThrow('nonnegative');
    expect(() =>
      validateExactExpressionEvidence(
        { ...dataset, statistics: { ...dataset.statistics, emittedOccurrences: 1 } },
        arabic(),
        SOURCE,
      ),
    ).toThrow('statistics');
  });

  it('rejects invented expression IDs, word text, spans and noncomputed kinds', () => {
    const dataset = create();
    const item = dataset.expressions[0];
    if (!item) throw new Error('Expected exact expression fixture');
    const altered = (change: Record<string, unknown>) =>
      validateExactExpressionEvidence(
        { ...dataset, expressions: [{ ...item, ...change }] },
        arabic(),
        SOURCE,
      );
    expect(() => altered({ id: 'fake' })).toThrow('identity');
    expect(() => altered({ origin: 'curated' })).toThrow('origin');
    expect(() => altered({ kind: 'semantic-similarity' })).toThrow('kind');
    expect(() => altered({ words: ['أ', 'ب'] })).toThrow('3–8');
    expect(() => altered({ words: ['أ', 'ب', 4] })).toThrow('exact strings');
    expect(() => altered({ words: ['أ', 'ب', 'ج'] })).toThrow('identity');
    expect(() => altered({ occurrences: [] })).toThrow('two recorded occurrences');
    expect(() => altered({ occurrences: [null, null] })).toThrow('must be an object');
    expect(() =>
      altered({ occurrences: [{ ayah: 0, start: 0, end: 4 }, { ayah: 0, start: 0, end: 4 }] }),
    ).toThrow('unique and ordered');
    expect(() =>
      altered({ occurrences: [{ ayah: 0, start: 0, end: 4 }, { ayah: 0, start: 1, end: 5 }] }),
    ).toThrow('out-of-range word span');
    expect(() =>
      altered({ occurrences: [{ ayah: 0, start: 0, end: 4 }, { ayah: 1, start: 1, end: 5 }] }),
    ).toThrow('out-of-range word span');
    expect(() =>
      altered({ occurrences: [{ ayah: 0, start: 0, end: 4 }, { ayah: 7000, start: 0, end: 4 }] }),
    ).toThrow('out-of-range word span');
    expect(() =>
      altered({ occurrences: [{ ayah: 0, start: 0, end: 3 }, { ayah: 1, start: 0, end: 3 }] }),
    ).toThrow('out-of-range word span');
  });

  it('rejects lexical tampering even with the expression ID recomputed', () => {
    const dataset = create();
    const item = dataset.expressions[0];
    if (!item) throw new Error('Expected exact expression fixture');
    const words = ['أَلِف', 'بَاء', 'جِيم', 'دَال'];
    const corrupted = { ...item, words, id: exactExpressionId(words) };
    expect(() =>
      validateExactExpressionEvidence(
        { ...dataset, expressions: [corrupted] },
        arabic(),
        SOURCE,
      ),
    ).toThrow('word span differs');
  });
});
