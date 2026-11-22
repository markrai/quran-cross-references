import {
  DATASET_SCHEMA_VERSION,
  type DatasetProvenance,
  type TranslationTextFile,
} from '../../../src/core/datasets/formats.ts';
import { CANONICAL_QURAN } from '../../../src/core/quran/quran-versification.ts';
import { getTranslationManifest } from '../../../src/translations/registry.ts';

interface ParsedText {
  readonly ayahs: readonly string[];
  readonly notice: string;
}

/** Parses Tanzil's `surah|ayah|text` format without normalizing or trimming the scripture text. */
function parseTanzilLines(text: string, label: string): ParsedText {
  const values = new Array<string>(CANONICAL_QURAN.ayahCount);
  const seen = new Uint8Array(CANONICAL_QURAN.ayahCount);
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let commentLines = 0;
  for (let offset = 0; offset < lines.length; offset += 1) {
    const line = lines[offset] ?? '';
    if (line === '') continue;
    if (line.startsWith('#')) {
      commentLines += 1;
      continue;
    }
    const first = line.indexOf('|');
    const second = line.indexOf('|', first + 1);
    if (first < 1 || second < first + 2) {
      throw new Error(`${label} line ${String(offset + 1)}: malformed row.`);
    }
    const surah = Number(line.slice(0, first));
    const ayah = Number(line.slice(first + 1, second));
    const value = line.slice(second + 1);
    const index = CANONICAL_QURAN.indexOf({ surah, ayah });
    if (index === undefined || value.length === 0) {
      throw new Error(`${label} line ${String(offset + 1)}: invalid ${String(surah)}:${String(ayah)}.`);
    }
    if (seen[index] !== 0) {
      throw new Error(`${label} line ${String(offset + 1)}: duplicate ${String(surah)}:${String(ayah)}.`);
    }
    seen[index] = 1;
    values[index] = value;
  }
  const missing = Array.from(seen).findIndex((value) => value === 0);
  if (missing >= 0) {
    const ref = CANONICAL_QURAN.refAt(missing);
    throw new Error(`${label}: missing ${String(ref.surah)}:${String(ref.ayah)}.`);
  }
  return { ayahs: values, notice: `${String(commentLines)} source comment lines ignored.` };
}

export function importQuranText(
  arabicText: string,
  englishText: string,
  provenance: DatasetProvenance,
): TranslationTextFile {
  const arabic = parseTanzilLines(arabicText, 'Tanzil Uthmani');
  const english = parseTanzilLines(englishText, 'Pickthall');
  const manifest = getTranslationManifest('pickthall');
  return {
    format: 'translation-text',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: CANONICAL_QURAN.id,
    provenance,
    notices: [
      { level: 'info', message: arabic.notice, count: 0, examples: [] },
      { level: 'info', message: english.notice, count: 0, examples: [] },
    ],
    translationId: 'pickthall',
    license: manifest.license,
    attribution: manifest.attribution,
    arabic: arabic.ayahs,
    ayahs: english.ayahs,
  };
}

