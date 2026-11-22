import {
  DATASET_SCHEMA_VERSION,
  type CrossReferencesFile,
  type DatasetProvenance,
  type ImportNotice,
} from '../../../src/core/datasets/formats.ts';
import { CANONICAL_QURAN } from '../../../src/core/quran/quran-versification.ts';
import { getCrossReferenceSourceManifest } from '../../../src/cross-references/registry.ts';

interface Range { readonly start: number; readonly end: number }
interface Link {
  readonly source: Range;
  readonly target: Range;
  readonly contextAfter: number;
}

function parseRange(value: unknown, where: string, noteDuplicate: () => void): Range {
  const absolute = typeof value === 'number' ? [value] : value;
  if (!Array.isArray(absolute) || absolute.length === 0 || !absolute.every(Number.isInteger)) {
    throw new Error(`Mutashabihat ${where}: ayah must be an integer or non-empty integer array.`);
  }
  const numbers: number[] = [];
  for (const number of absolute as number[]) {
    if (number === numbers.at(-1)) {
      noteDuplicate();
      continue;
    }
    numbers.push(number);
  }
  for (let index = 0; index < numbers.length; index += 1) {
    const number = numbers[index] ?? 0;
    if (number < 1 || number > CANONICAL_QURAN.ayahCount) {
      throw new Error(`Mutashabihat ${where}: absolute ayah ${String(number)} is out of range.`);
    }
    if (index > 0 && number !== (numbers[index - 1] ?? 0) + 1) {
      throw new Error(`Mutashabihat ${where}: multi-ayah ranges must be consecutive.`);
    }
  }
  return { start: (numbers[0] ?? 1) - 1, end: (numbers.at(-1) ?? 1) - 1 };
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Mutashabihat ${where}: expected an object.`);
  }
  return value as Record<string, unknown>;
}

/** Deterministic importer for Waqar144/Quran_Mutashabihat_Data. */
export function importMutashabihat(
  text: string,
  provenance: DatasetProvenance,
): CrossReferencesFile {
  const root = object(JSON.parse(text.replace(/^\uFEFF/, '')) as unknown, 'root');
  const links: Link[] = [];
  const seen = new Set<string>();
  let sourceRowCount = 0;
  let duplicateCount = 0;
  let repeatedRangeMemberCount = 0;
  const noteDuplicateRangeMember = () => { repeatedRangeMemberCount += 1; };
  for (const [group, rowsValue] of Object.entries(root).sort(([a], [b]) => Number(a) - Number(b))) {
    if (!Array.isArray(rowsValue)) throw new Error(`Mutashabihat group ${group}: expected an array.`);
    rowsValue.forEach((rowValue, rowOffset) => {
      sourceRowCount += 1;
      const where = `group ${group}, row ${String(rowOffset + 1)}`;
      const row = object(rowValue, where);
      const source = parseRange(object(row['src'], `${where}.src`)['ayah'], `${where}.src`, noteDuplicateRangeMember);
      const muts = row['muts'];
      if (!Array.isArray(muts) || muts.length === 0) {
        throw new Error(`Mutashabihat ${where}.muts: expected a non-empty array.`);
      }
      const contextAfter = row['ctx'] === undefined ? 0 : Number(row['ctx']);
      if (!Number.isInteger(contextAfter) || contextAfter < 0) {
        throw new Error(`Mutashabihat ${where}.ctx: expected a non-negative integer.`);
      }
      muts.forEach((targetValue, targetOffset) => {
        const target = parseRange(
          object(targetValue, `${where}.muts[${String(targetOffset)}]`)['ayah'],
          `${where}.muts[${String(targetOffset)}]`,
          noteDuplicateRangeMember,
        );
        const key = `${String(source.start)}:${String(source.end)}>${String(target.start)}:${String(target.end)}`;
        if (seen.has(key)) {
          duplicateCount += 1;
          return;
        }
        seen.add(key);
        links.push({ source, target, contextAfter });
      });
    });
  }

  links.sort((a, b) =>
    a.source.start - b.source.start ||
    a.source.end - b.source.end ||
    a.target.start - b.target.start ||
    a.target.end - b.target.end ||
    a.contextAfter - b.contextAfter,
  );
  const offsets = new Array<number>(CANONICAL_QURAN.ayahCount + 1).fill(0);
  for (const link of links) offsets[link.source.start + 1] = (offsets[link.source.start + 1] ?? 0) + 1;
  for (let index = 0; index < CANONICAL_QURAN.ayahCount; index += 1) {
    offsets[index + 1] = (offsets[index + 1] ?? 0) + (offsets[index] ?? 0);
  }
  const notices: ImportNotice[] = [];
  if (duplicateCount > 0) notices.push({
      level: 'info', message: 'Exact duplicate source-to-target relationships dropped.', count: duplicateCount, examples: [],
    });
  if (repeatedRangeMemberCount > 0) notices.push({
      level: 'warning',
      message: 'Repeated absolute ayah numbers inside a range collapsed (for example [3947, 3947]).',
      count: repeatedRangeMemberCount,
      examples: ['group 23, row 17: [3947, 3947] → [3947]'],
    });
  const manifest = getCrossReferenceSourceManifest('mutashabihat');
  return {
    format: 'cross-references',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: CANONICAL_QURAN.id,
    provenance,
    notices,
    sourceId: 'mutashabihat',
    sourceRowCount,
    license: manifest.license,
    attribution: manifest.attribution,
    links: {
      offsets,
      sourceEnd: links.map((link) => link.source.end),
      targetStart: links.map((link) => link.target.start),
      targetEnd: links.map((link) => link.target.end),
      contextAfter: links.map((link) => link.contextAfter),
    },
  };
}
