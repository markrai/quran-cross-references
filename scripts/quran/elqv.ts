import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import {
  ELQV_CONFLICT_AYAH_COUNT,
  ELQV_DISTINCT_AYAH_COUNT,
  ELQV_IDENTICAL_DUPLICATE_COUNT,
  ELQV_LABELS,
  ELQV_MEMBERSHIP_COUNT,
  ELQV_ROW_COUNT,
  ELQV_UNIQUE_LABEL_COUNTS,
  type QuranEmotionDataset,
} from '../../src/core/quran/emotion-types.ts';

const revision = '364cdccf6518e35003db51ccf856d9328dbb7ff3';

function invalid(reason: string): never {
  throw new Error('Invalid pinned ELQV emotion annotations: ' + reason);
}

function csvRows(source: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === '"') {
      if (quoted && text.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else if (quoted) {
        quoted = false;
      } else if (!field) {
        quoted = true;
      } else {
        invalid('Malformed CSV quote boundary.');
      }
    } else if (!quoted && char === ',') {
      row.push(field);
      field = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text.charAt(index + 1) === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) invalid('Unclosed CSV quoted field.');
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function importElqvEmotions(csv: string, sourceSha256: string): QuranEmotionDataset {
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) invalid('Missing reviewed SHA-256 input pin.');
  const rows = csvRows(csv);
  const header = 'Sourah Arabic,Sourah Number,Verse Number,Verse Diac,Verse,Label';
  if (rows[0]?.join(',') !== header) invalid('Six-column ELQV schema has changed.');
  if (rows.length - 1 !== ELQV_ROW_COUNT) invalid('Expected all 2,100 original ELQV records.');
  const byAyah = new Map<number, number[]>();
  const counts = ELQV_LABELS.map(() => 0);
  let identicalDuplicates = 0;
  for (const [rowIndex, raw] of rows.slice(1).entries()) {
    if (raw.length !== 6 || !raw[0]?.trim() || !raw[3]?.trim() || !raw[4]?.trim()) {
      invalid('Empty metadata or malformed fields in source row ' + String(rowIndex + 2));
    }
    const surah = raw[1] ?? '';
    const ayah = raw[2] ?? '';
    if (!/^[1-9][0-9]*$/.test(surah) || !/^[1-9][0-9]*$/.test(ayah)) {
      invalid('Noncanonical verse number in source row ' + String(rowIndex + 2));
    }
    const index = CANONICAL_QURAN.indexOf({ surah: Number(surah), ayah: Number(ayah) });
    if (index === undefined) {
      invalid('ELQV verse falls outside canonical Hafs/Kufan boundaries.');
    }
    const labelId = ELQV_LABELS.findIndex((label) => label === raw[5]);
    if (labelId < 0) invalid('Unrecognized source emotion class.');
    const memberships = byAyah.get(index) ?? [];
    if (memberships.includes(labelId)) {
      identicalDuplicates += 1;
    } else {
      memberships.push(labelId);
      counts[labelId] = (counts[labelId] ?? 0) + 1;
    }
    byAyah.set(index, memberships);
  }
  const entries = [...byAyah]
    .sort(([first], [second]) => first - second)
    .map(([ayah, labels]) => [ayah, [...labels].sort((a, b) => a - b)] as const);
  const membershipCount = counts.reduce((total, count) => total + count, 0);
  const conflictedAyahCount = entries.filter(([, labels]) => labels.length > 1).length;
  if (
    entries.length !== ELQV_DISTINCT_AYAH_COUNT ||
    membershipCount !== ELQV_MEMBERSHIP_COUNT ||
    identicalDuplicates !== ELQV_IDENTICAL_DUPLICATE_COUNT ||
    conflictedAyahCount !== ELQV_CONFLICT_AYAH_COUNT ||
    !counts.every((count, index) => count === ELQV_UNIQUE_LABEL_COUNTS[index])
  ) {
    invalid('Canonical deduplication or class histogram differs from the audited source.');
  }
  return {
    format: 'quran-external-emotions',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    origin: 'external-specialist-annotated-emotions',
    authority: 'exploratory-not-tafsir',
    source: {
      sha256: sourceSha256,
      revision,
      license: 'CC0-1.0',
      attribution:
        'ELQV © Arwa Almarzoqi and Mohammed Alsuhaibani (2025), CC0 1.0. Journal of King Saud University Computer and Information Sciences 37, 271. DOI: 10.1007/s44443-025-00269-y. Specialist annotation, human verification and LLM-assisted methodology.',
    },
    labels: [...ELQV_LABELS],
    rowCount: ELQV_ROW_COUNT,
    distinctAyahCount: entries.length,
    membershipCount,
    identicalDuplicateCount: identicalDuplicates,
    conflictedAyahCount,
    labelCounts: counts,
    entries,
  };
}
