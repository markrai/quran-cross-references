import { elementAt } from '../lib/array.ts';
import { tokenizeQuranArabic } from './arabic-tokens.ts';

export const EXACT_EXPRESSION_MIN_WORDS = 3;
export const EXACT_EXPRESSION_MAX_WORDS = 8;

export interface ExactExpressionOccurrence {
  readonly ayah: number;
  readonly start: number;
  readonly end: number;
}

export interface DetectedExactExpression {
  readonly words: readonly string[];
  readonly occurrences: readonly ExactExpressionOccurrence[];
}

export interface ExactExpressionStatistics {
  readonly ayahCount: number;
  readonly tokenCount: number;
  readonly candidateOccurrences: number;
  readonly repeatedCandidates: number;
  readonly redundantCandidates: number;
  readonly emittedExpressions: number;
  readonly emittedOccurrences: number;
  readonly mostFrequentExpression: number;
}

export interface ExactExpressionScan {
  readonly expressions: readonly DetectedExactExpression[];
  readonly statistics: ExactExpressionStatistics;
}

interface Candidate {
  readonly words: readonly string[];
  readonly occurrences: ExactExpressionOccurrence[];
}

function sameLocations(
  shorter: readonly ExactExpressionOccurrence[],
  longer: readonly ExactExpressionOccurrence[],
  offset: number,
): boolean {
  if (shorter.length !== longer.length) return false;
  return shorter.every((occurrence, position) => {
    const parent = elementAt(longer, position);
    return occurrence.ayah === parent.ayah && occurrence.start === parent.start + offset;
  });
}

function sequenceKey(words: readonly string[]): string {
  return JSON.stringify(words);
}

export function detectExactArabicExpressions(ayahs: readonly string[]): ExactExpressionScan {
  const tokenized = tokenizeQuranArabic(ayahs);
  const candidates = new Map<string, Candidate>();
  let tokenCount = 0;
  let candidateOccurrences = 0;

  tokenized.forEach((tokens, ayah) => {
    tokenCount += tokens.length;
    for (let start = 0; start < tokens.length; start += 1) {
      for (
        let length = EXACT_EXPRESSION_MIN_WORDS;
        length <= EXACT_EXPRESSION_MAX_WORDS && start + length <= tokens.length;
        length += 1
      ) {
        const words = tokens.slice(start, start + length).map((token) => token.text);
        const key = sequenceKey(words);
        let candidate = candidates.get(key);
        if (!candidate) {
          candidate = { words, occurrences: [] };
          candidates.set(key, candidate);
        }
        candidate.occurrences.push({ ayah, start, end: start + length });
        candidateOccurrences += 1;
      }
    }
  });

  const repeated = new Map<string, Candidate>();
  for (const [key, candidate] of candidates) {
    const occurrences = candidate.occurrences;
    if (occurrences.length > 1 && occurrences[0]?.ayah !== occurrences.at(-1)?.ayah) {
      repeated.set(key, candidate);
    }
  }
  const redundant = new Set<string>();
  for (const longer of repeated.values()) {
    for (let length = EXACT_EXPRESSION_MIN_WORDS; length < longer.words.length; length += 1) {
      for (let offset = 0; offset + length <= longer.words.length; offset += 1) {
        const shortKey = sequenceKey(longer.words.slice(offset, offset + length));
        const shorter = repeated.get(shortKey);
        if (
          shorter?.occurrences.length === longer.occurrences.length &&
          sameLocations(shorter.occurrences, longer.occurrences, offset)
        ) {
          redundant.add(shortKey);
        }
      }
    }
  }

  const expressions = [...repeated.entries()]
    .filter(([key]) => !redundant.has(key))
    .map(([, candidate]) => ({
      words: candidate.words,
      occurrences: candidate.occurrences,
    }))
    .sort((a, b) => {
      const firstA = a.occurrences[0];
      const firstB = b.occurrences[0];
      if (!firstA || !firstB) return 0;
      const location = firstA.ayah - firstB.ayah || firstA.start - firstB.start;
      if (location !== 0) return location;
      const size = b.words.length - a.words.length;
      if (size !== 0) return size;
      const left = sequenceKey(a.words);
      const right = sequenceKey(b.words);
      return left < right ? -1 : left > right ? 1 : 0;
    });

  return {
    expressions,
    statistics: {
      ayahCount: tokenized.length,
      tokenCount,
      candidateOccurrences,
      repeatedCandidates: repeated.size,
      redundantCandidates: redundant.size,
      emittedExpressions: expressions.length,
      emittedOccurrences: expressions.reduce((total, item) => total + item.occurrences.length, 0),
      mostFrequentExpression: expressions.reduce(
        (maximum, item) => Math.max(maximum, item.occurrences.length),
        0,
      ),
    },
  };
}
