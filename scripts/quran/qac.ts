import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import {
  QAC_MORPHOLOGY_POLICY,
  QAC_SEGMENT_COUNT,
  QAC_STEM_COUNT,
  QAC_WORD_COUNT,
  type QacMorphologyDataset,
  type QacSource,
  type QacSegment,
} from '../../src/core/quran/qac-types.ts';

function invalid(message: string): never {
  throw new Error('Invalid QAC v0.4 morphology: ' + message);
}

export function importQacMorphology(
  original: string,
  pin: QacSource,
  tanzilNotice: string,
): QacMorphologyDataset {
  if (
    pin.id !== 'qac-morphology-v04' ||
    !/^[a-f0-9]{64}$/.test(pin.sha256) ||
    !pin.url.includes('/079cdc74cd494ec1b35011363288d80cae047c51/') ||
    !tanzilNotice.includes('Copyright (C) 2007-2021 Tanzil Project')
  ) {
    invalid('Source provenance or Tanzil reproduction notice is missing.');
  }
  const marker = 'LOCATION\tFORM\tTAG\tFEATURES';
  const start = original.indexOf(marker);
  if (start < 0) invalid('The original TSV header is absent.');
  const qacNotice = original.slice(0, start);
  if (
    !qacNotice.includes('Copyright (C) 2011 Kais Dukes') ||
    !qacNotice.includes('License: GNU General Public License') ||
    !qacNotice.includes('Tanzil Quran Text (Uthmani, version 1.0.2)')
  ) {
    invalid('The unmodified Quranic Arabic Corpus copyright headers are missing.');
  }

  const ayahs: QacSegment[][][] = Array.from({ length: CANONICAL_QURAN.ayahCount }, () => []);
  let wordCount = 0;
  let segmentCount = 0;
  let stemCount = 0;
  let previousAyah = -1;
  let previousWord = 0;
  let previousSegment = 0;
  const lines = original.slice(start + marker.length).split(/\r?\n/u);
  for (const line of lines) {
    if (line.trim() === '') continue;
    const fields = line.split('\t');
    if (fields.length !== 4) invalid('Each QAC segment requires four TSV columns.');
    const location = /^\((\d+):(\d+):(\d+):(\d+)\)$/u.exec(fields[0] ?? '');
    if (!location) invalid('A QAC segment has an invalid verse:word:segment location.');
    const [, surahText, ayahText, wordText, segmentText] = location;
    const ref = { surah: Number(surahText), ayah: Number(ayahText) };
    const ayahIndex = CANONICAL_QURAN.indexOf(ref);
    const word = Number(wordText);
    const segment = Number(segmentText);
    if (ayahIndex === undefined || ayahIndex < previousAyah || ayahIndex > previousAyah + 1) {
      invalid('The QAC source has noncanonical or skipped ayahs.');
    }
    if (ayahIndex !== previousAyah) {
      previousAyah = ayahIndex;
      previousWord = 0;
      previousSegment = 0;
    }
    const words = ayahs[ayahIndex];
    if (!words) invalid('A Quran ayah is outside the canonical corpus.');
    if (word === previousWord + 1 && segment === 1) {
      words.push([]);
      previousWord = word;
      previousSegment = 0;
      wordCount += 1;
    } else if (word !== previousWord) {
      invalid('QAC word indices must be unique and contiguous within their ayahs.');
    }
    if (segment !== previousSegment + 1) {
      invalid('QAC segment indices must be sequential within a word.');
    }
    previousSegment = segment;
    const form = fields[1] ?? '';
    const tag = fields[2] ?? '';
    const features = fields[3] ?? '';
    const kind = features.split('|', 1)[0];
    if (
      !tag ||
      !features ||
      (kind !== 'PREFIX' && kind !== 'STEM' && kind !== 'SUFFIX') ||
      /\r|\n/u.test(form + tag + features)
    ) {
      invalid('A segment contains an invalid tag, form or morphological feature.');
    }
    const current = words[word - 1];
    if (!current) invalid('The word segment has no matching word.');
    current.push([form, tag, features]);
    segmentCount += 1;
    if (kind === 'STEM') stemCount += 1;
  }
  if (
    wordCount !== QAC_WORD_COUNT ||
    segmentCount !== QAC_SEGMENT_COUNT ||
    stemCount !== QAC_STEM_COUNT ||
    previousAyah !== CANONICAL_QURAN.ayahCount - 1 ||
    ayahs.some((words) => words.length === 0)
  ) {
    invalid(
      'Expected 6,236 verses, 77,429 words and 128,219 segments; saw ' +
        String(wordCount) +
        ' words and ' +
        String(segmentCount) +
        ' segments.',
    );
  }
  return {
    format: 'quran-qac-morphology',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    origin: 'annotated',
    evidence: 'qac-segment-lemma-root',
    tokenPolicy: QAC_MORPHOLOGY_POLICY,
    source: pin,
    ayahCount: CANONICAL_QURAN.ayahCount,
    wordCount,
    segmentCount,
    stemCount,
    ayahs,
    qacNotice,
    tanzilNotice,
  };
}
