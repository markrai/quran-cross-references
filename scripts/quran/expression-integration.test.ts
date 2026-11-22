import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { QuranEvidenceSource } from '../../src/core/quran/relationship-evidence.ts';
import { importQuranText } from './datasets.ts';
import { createExactExpressionEvidence, validateExactExpressionEvidence } from './expression-evidence.ts';

describe('exact Arabic expressions against the pinned 6,236-ayah corpus', () => {
  it('generates only verifiable distinct-ayah evidence from the unmodified Tanzil source', () => {
    const manifest = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
      readonly sources: readonly QuranEvidenceSource[];
    };
    const source = manifest.sources.find((pin) => pin.id === 'tanzil-uthmani');
    if (!source) throw new Error('Missing pinned Arabic source');
    const arabicBytes = readFileSync('data/raw/quran-uthmani-1.1.txt');
    expect(createHash('sha256').update(arabicBytes).digest('hex')).toBe(source.sha256);
    const english = readFileSync('data/raw/en.pickthall.txt', 'utf8');
    const text = importQuranText(arabicBytes.toString('utf8'), english);
    const evidence = createExactExpressionEvidence(text.arabic, source);
    expect(evidence.statistics.ayahCount).toBe(6236);
    expect(evidence.statistics.tokenCount).toBeGreaterThan(6236);
    expect(evidence.statistics.emittedExpressions).toBeGreaterThan(0);
    expect(evidence.statistics.emittedOccurrences).toBeGreaterThan(
      evidence.statistics.emittedExpressions,
    );
    expect(evidence.statistics.candidateOccurrences).toBeGreaterThan(
      evidence.statistics.repeatedCandidates,
    );
    expect(new Set(evidence.expressions.map((item) => item.id)).size).toBe(
      evidence.expressions.length,
    );
    expect(validateExactExpressionEvidence(evidence, text.arabic, source)).toBe(evidence);
    expect(evidence.expressions.every((item) => item.occurrences.length >= 2)).toBe(true);
    expect(
      evidence.expressions.every(
        (item) => new Set(item.occurrences.map((site) => site.ayah)).size >= 2,
      ),
    ).toBe(true);
    expect(evidence.expressions.every((item) => item.origin === 'computed')).toBe(true);
    expect(evidence.expressions.every((item) => item.words.length >= 3 && item.words.length <= 8)).toBe(
      true,
    );
  }, 120_000);
});
