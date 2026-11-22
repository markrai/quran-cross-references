import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';

export const MAQAM_WORD_COUNT = 77_429;
export const MAQAM_TOKEN_POLICY = 'maqam-2026-annotated-word-locations-v1';

export interface QuranMorphWord {
  readonly word: string;
  readonly lemma: string | null;
  readonly root: string | null;
  readonly pos: string;
}

export interface QuranMorphologySource {
  readonly id: 'maqam-2026';
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly license: string;
  readonly attribution: string;
  readonly retrievedAt: string;
}

export interface QuranMorphologyDataset {
  readonly format: 'quran-morphology';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly origin: 'annotated';
  readonly evidence: 'maqam-lemma-root';
  readonly tokenPolicy: typeof MAQAM_TOKEN_POLICY;
  readonly alignment: 'surah-ayah-only';
  readonly source: QuranMorphologySource;
  readonly ayahCount: number;
  readonly wordCount: number;
  readonly taggedLemmaWords: number;
  readonly taggedRootWords: number;
  readonly ayahs: readonly (readonly QuranMorphWord[])[];
  readonly tanzilNotice: string;
}

const MAQAM_COLUMNS = [
  'surah_index',
  'verse_index',
  'sentence_index',
  'word_index',
  'tanzil_imlaay',
  'tanzil_uthmani',
  'tanzil_diac_imlaay',
  'tanzil_diac_uthmani',
  'lex',
  'stemgloss',
  'pos',
  'prc3',
  'prc2',
  'prc1',
  'prc0',
  'per',
  'asp',
  'vox',
  'mod',
  'form_gen',
  'gen',
  'form_num',
  'num',
  'stt',
  'cas',
  'enc0',
  'enc1',
  'root',
  'stem',
  'rat',
].join(',');

function fail(message: string): never {
  throw new Error('Invalid pinned MAQAM morphology: ' + message);
}

export function readMorphologyCsv(
  source: string,
  visit: (fields: readonly string[], rowNumber: number) => void,
): void {
  let quoted = false;
  let field = '';
  let record: string[] = [];
  let row = 0;
  let atFieldStart = true;

  for (let offset = 0; offset < source.length; offset += 1) {
    const char = source[offset];
    if (char === '"') {
      if (quoted && source[offset + 1] === '"') {
        field += '"';
        offset += 1;
      } else if (quoted) {
        quoted = false;
      } else if (atFieldStart) {
        quoted = true;
      } else {
        fail('Unexpected quotation mark in row ' + String(row + 1) + '.');
      }
      atFieldStart = false;
      continue;
    }
    if (!quoted && (char === ',' || char === '\n')) {
      record.push(field);
      field = '';
      atFieldStart = true;
      if (char === '\n') {
        if (record[record.length - 1]?.endsWith('\r')) {
          const last = record.length - 1;
          record[last] = record[last]?.slice(0, -1) ?? '';
        }
        visit(record, row);
        row += 1;
        record = [];
      }
      continue;
    }
    field += char;
    atFieldStart = false;
  }
  if (quoted) fail('Unterminated quoted CSV field.');
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    visit(record, row);
  }
}

function fieldText(value: string | undefined, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('Missing ' + label + '.');
  }
  return value;
}

function numberField(value: string | undefined, label: string): number {
  const raw = fieldText(value, label);
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) fail('Invalid ' + label + '.');
  const number = Number(raw);
  if (!Number.isSafeInteger(number)) fail('Unsafe ' + label + '.');
  return number;
}

function annotated(value: string): string | null {
  return value === 'NTWS' || value === 'na' || value === '' ? null : value;
}

export function importMaqamMorphology(
  csv: string,
  source: QuranMorphologySource,
  tanzilNotice: string,
): QuranMorphologyDataset {
  if (
    source.id !== 'maqam-2026' ||
    !/^[a-f0-9]{64}$/.test(source.sha256) ||
    !source.url.includes('/2e52c1354a901e998a311c94f43d14c99f467f6f/') ||
    !source.license.includes('CC BY 4.0') ||
    !tanzilNotice.includes('Copyright (C) 2007-2021 Tanzil Project')
  ) {
    fail('The source provenance or Tanzil reproduction notice is missing.');
  }

  const ayahs: QuranMorphWord[][] = Array.from(
    { length: CANONICAL_QURAN.ayahCount },
    () => [],
  );
  let records = 0;
  let taggedLemmaWords = 0;
  let taggedRootWords = 0;
  let currentAyah = -1;
  readMorphologyCsv(csv, (columns, row) => {
    if (row === 0) {
      if (columns.join(',') !== MAQAM_COLUMNS) fail('Unrecognized MAQAM CSV schema.');
      return;
    }
    if (columns.length !== 30) {
      fail('Expected 30 columns at source row ' + String(row + 1) + '.');
    }
    const surah = numberField(columns[0], 'surah');
    const ayah = numberField(columns[1], 'ayah');
    const position = numberField(columns[3], 'word position');
    const ayahIndex = CANONICAL_QURAN.indexOf({ surah, ayah });
    if (ayahIndex === undefined || ayahIndex < currentAyah || ayahIndex > currentAyah + 1) {
      fail('Source ayahs must appear in complete canonical order.');
    }
    if (ayahIndex !== currentAyah) {
      if (ayahIndex !== 0 && (ayahs[ayahIndex - 1]?.length ?? 0) === 0) {
        fail('Source has an empty or missing ayah.');
      }
      currentAyah = ayahIndex;
    }
    const words = ayahs[ayahIndex];
    if (!words || position !== words.length + 1) {
      fail('MAQAM word locations must be sequential and unique per ayah.');
    }
    const word = fieldText(columns[7], 'annotated word');
    const lemma = annotated(fieldText(columns[8], 'annotated lemma'));
    const root = annotated(fieldText(columns[27], 'annotated root'));
    const pos = fieldText(columns[10], 'part of speech');
    words.push({ word, lemma, root, pos });
    records += 1;
    if (lemma !== null) taggedLemmaWords += 1;
    if (root !== null) taggedRootWords += 1;
  });
  if (
    records !== MAQAM_WORD_COUNT ||
    currentAyah !== CANONICAL_QURAN.ayahCount - 1 ||
    ayahs.some((ayah) => ayah.length === 0)
  ) {
    fail(
      'Expected ' +
        String(MAQAM_WORD_COUNT) +
        ' annotated words and 6,236 complete Quran ayahs; received ' +
        String(records) +
        ' words.',
    );
  }
  return {
    format: 'quran-morphology',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    origin: 'annotated',
    evidence: 'maqam-lemma-root',
    tokenPolicy: MAQAM_TOKEN_POLICY,
    alignment: 'surah-ayah-only',
    source,
    ayahCount: CANONICAL_QURAN.ayahCount,
    wordCount: records,
    taggedLemmaWords,
    taggedRootWords,
    ayahs,
    tanzilNotice,
  };
}
