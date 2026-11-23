import { createHash } from 'node:crypto';
import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import { tokenizeArabicAyah } from '../../src/core/quran/arabic-tokens.ts';

export const QAC_VERSION = '0.4';
export const QAC_UPSTREAM_COMMIT = 'bb97fe4b03e5a923aab0491f3d917c3c5f94f1fc';
export const QAC_GIT_BLOB = 'b91cec6e95d5e0306550b4aedacc7380dc71152a';
export const QAC_RAW_BYTES = 6_309_503;
export const QAC_FILENAME = 'quranic-corpus-morphology-0.4.txt';

export interface QacWord {
  readonly ayah: number;
  readonly position: number;
  readonly segments: number;
  readonly stems: number;
  readonly lemmas: readonly string[];
  readonly roots: readonly string[];
}

export interface QacAudit {
  readonly status: 'blocked-pending-license-and-alignment-review';
  readonly source: 'quranic-arabic-corpus-v0.4';
  readonly sourceSha256: string;
  readonly sourceGitBlob: string;
  readonly canonicalAyahs: 6236;
  readonly annotatedAyahs: number;
  readonly words: number;
  readonly segments: number;
  readonly stems: number;
  readonly ambiguousMultiStemWords: number;
  readonly wordsMissingLemma: number;
  readonly wordsMissingRoot: number;
  readonly whitespaceWords: number;
  readonly candidateWordCountAlignedAyahs: number;
  readonly nonmatchingWordCountAyahs: number;
  readonly policy: 'word-count-preflight-only-no-token-alignment-asserted';
}

function features(input: string, feature: string): string | null {
  const match = input.split('|').find((part) => part.startsWith(feature));
  if (match === undefined) return null;
  const result = match.slice(feature.length);
  if (result.length === 0) throw new Error('Empty QAC morphology feature.');
  return result;
}

export function parseQacWords(raw: string): { readonly words: readonly QacWord[]; readonly segmentCount: number; readonly stemCount: number } {
  if (!raw.includes('Copyright (C) 2011 Kais Dukes') ||
      !raw.includes('GNU General Public License') ||
      !raw.includes('CHANGING IT IS NOT ALLOWED')) {
    throw new Error('Missing Quranic Arabic Corpus license or immutable-source notice.');
  }
  const words: QacWord[] = [];
  let segmentCount = 0;
  let stemCount = 0;
  let previousAyah = -1;
  let previousPosition = 0;
  let current: { ayah: number; position: number; segments: number; stems: number; lemmas: Set<string>; roots: Set<string> } | null = null;
  const finish = () => {
    if (current === null) return;
    if (current.stems === 0) throw new Error('QAC word lacks a stem.');
    words.push({
      ayah: current.ayah,
      position: current.position,
      segments: current.segments,
      stems: current.stems,
      lemmas: [...current.lemmas],
      roots: [...current.roots],
    });
  };
  for (const line of raw.split(/\r?\n/u)) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const parts = line.split('\t');
    if (parts.length !== 4) throw new Error('Invalid four-column QAC morphological row.');
    const matched = /^\((\d+):(\d+):(\d+):(\d+)\)$/u.exec(parts[0] ?? '');
    if (!matched) throw new Error('QAC location is not a canonical segment reference.');
    const surah = Number(matched[1]);
    const verse = Number(matched[2]);
    const position = Number(matched[3]);
    const segment = Number(matched[4]);
    const ayah = CANONICAL_QURAN.indexOf({ surah, ayah: verse });
    if (ayah === undefined || position < 1 || segment < 1) {
      throw new Error('QAC segment location is outside the canonical Quran.');
    }
    if (current === null || current.ayah !== ayah || current.position !== position) {
      finish();
      if (ayah < previousAyah ||
          (ayah === previousAyah && position !== previousPosition + 1) ||
          (ayah !== previousAyah && position !== 1) ||
          segment !== 1) {
        throw new Error('QAC word sequence is not ordered and contiguous.');
      }
      current = { ayah, position, segments: 0, stems: 0, lemmas: new Set(), roots: new Set() };
      previousAyah = ayah;
      previousPosition = position;
    }
    if (segment !== current.segments + 1) {
      throw new Error('QAC word segment positions are not consecutive.');
    }
    const morphology = parts[3] ?? '';
    if (morphology.split('|').includes('STEM')) {
      current.stems += 1;
      stemCount += 1;
      const lemma = features(morphology, 'LEM:');
      const root = features(morphology, 'ROOT:');
      if (lemma !== null) current.lemmas.add(lemma);
      if (root !== null) current.roots.add(root);
    }
    current.segments += 1;
    segmentCount += 1;
  }
  finish();
  return { words, segmentCount, stemCount };
}

export function auditQac(bytes: Buffer, arabic: readonly string[]): QacAudit {
  if (arabic.length !== CANONICAL_QURAN.ayahCount) throw new Error('Missing canonical Tanzil ayahs.');
  if (bytes.length !== QAC_RAW_BYTES) throw new Error('Incorrect upstream QAC byte length.');
  const blobHeader = Buffer.from('blob ' + String(bytes.length) + '\0', 'ascii');
  const blob = createHash('sha1').update(blobHeader).update(bytes).digest('hex');
  if (blob !== QAC_GIT_BLOB) throw new Error('QAC source does not match its pinned Git blob.');
  const { words, segmentCount, stemCount } = parseQacWords(bytes.toString('utf8'));
  const counts = new Map<number, number>();
  for (const word of words) counts.set(word.ayah, (counts.get(word.ayah) ?? 0) + 1);
  let matched = 0;
  let unmatched = 0;
  let whitespaceWords = 0;
  for (const [ayah, line] of arabic.entries()) {
    const count = tokenizeArabicAyah(line).length;
    whitespaceWords += count;
    const annotations = counts.get(ayah);
    if (annotations === undefined) continue;
    if (annotations === count) matched += 1;
    else unmatched += 1;
  }
  return {
    status: 'blocked-pending-license-and-alignment-review',
    source: 'quranic-arabic-corpus-v0.4',
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    sourceGitBlob: blob,
    canonicalAyahs: 6236,
    annotatedAyahs: counts.size,
    words: words.length,
    segments: segmentCount,
    stems: stemCount,
    ambiguousMultiStemWords: words.filter((word) => word.stems > 1).length,
    wordsMissingLemma: words.filter((word) => word.lemmas.length === 0).length,
    wordsMissingRoot: words.filter((word) => word.roots.length === 0).length,
    whitespaceWords,
    candidateWordCountAlignedAyahs: matched,
    nonmatchingWordCountAyahs: unmatched,
    policy: 'word-count-preflight-only-no-token-alignment-asserted',
  };
}
