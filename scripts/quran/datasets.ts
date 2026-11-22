import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';

export interface AyahRange {
  readonly start: number;
  readonly end: number;
}

export interface SimilarPassage {
  readonly source: AyahRange;
  readonly target: AyahRange;
  readonly contextAfter: number;
}

export interface PairedQuranText {
  readonly format: 'quran-paired-text';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly arabic: readonly string[];
  readonly english: readonly string[];
}

export interface SimilarPassagesData {
  readonly format: 'quran-similar-passages';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly sourceRowCount: number;
  readonly duplicateCount: number;
  readonly repeatedRangeMemberCount: number;
  readonly links: readonly SimilarPassage[];
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected an object.`);
  }
  return value as Record<string, unknown>;
}

function parseText(source: string, label: string): readonly string[] {
  const total = CANONICAL_QURAN.ayahCount;
  const texts = new Array<string>(total);
  const seen = new Uint8Array(total);
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);

  lines.forEach((line, lineIndex) => {
    if (line === '' || line.startsWith('#')) return;
    const first = line.indexOf('|');
    const second = line.indexOf('|', first + 1);
    if (first <= 0 || second <= first + 1) {
      throw new Error(`${label} line ${String(lineIndex + 1)}: malformed row.`);
    }
    const surah = Number(line.slice(0, first));
    const ayah = Number(line.slice(first + 1, second));
    const value = line.slice(second + 1);
    const index = CANONICAL_QURAN.indexOf({ surah, ayah });
    if (index === undefined || value.length === 0) {
      throw new Error(`${label} line ${String(lineIndex + 1)}: invalid ayah.`);
    }
    if (seen[index] !== 0) {
      throw new Error(`${label} line ${String(lineIndex + 1)}: duplicate ${String(surah)}:${String(ayah)}.`);
    }
    seen[index] = 1;
    texts[index] = value;
  });

  const missing = seen.findIndex((value) => value === 0);
  if (missing !== -1) {
    const ref = CANONICAL_QURAN.refAt(missing);
    throw new Error(`${label}: missing ${String(ref.surah)}:${String(ref.ayah)}.`);
  }
  return texts;
}

export function importQuranText(arabicText: string, englishText: string): PairedQuranText {
  return {
    format: 'quran-paired-text',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    arabic: parseText(arabicText, 'Tanzil Uthmani'),
    english: parseText(englishText, 'Pickthall'),
  };
}

function parseRange(
  value: unknown,
  where: string,
  repeated: () => void,
): AyahRange {
  const values: unknown[] = typeof value === 'number' ? [value] : Array.isArray(value) ? value : [];
  if (values.length === 0 || !values.every((member) => Number.isInteger(member))) {
    throw new Error(`${where}: ayah must be an integer or a nonempty integer array.`);
  }
  const indices: number[] = [];
  for (const member of values) {
    const absolute = member as number;
    if (absolute === indices.at(-1)) {
      repeated();
      continue;
    }
    if (absolute < 1 || absolute > CANONICAL_QURAN.ayahCount) {
      throw new Error(`${where}: absolute ayah ${String(absolute)} is out of range.`);
    }
    if (indices.length > 0 && absolute !== (indices.at(-1) ?? 0) + 1) {
      throw new Error(`${where}: multi-ayah ranges must be consecutive.`);
    }
    indices.push(absolute);
  }
  return { start: (indices[0] ?? 1) - 1, end: (indices.at(-1) ?? 1) - 1 };
}

export function importMutashabihat(json: string): SimilarPassagesData {
  const groups = object(JSON.parse(json.replace(/^\uFEFF/, '')) as unknown, 'Mutashabihat');
  const links: SimilarPassage[] = [];
  const seen = new Set<string>();
  let sourceRowCount = 0;
  let duplicateCount = 0;
  let repeatedRangeMemberCount = 0;
  const repeated = () => {
    repeatedRangeMemberCount += 1;
  };

  for (const [group, values] of Object.entries(groups).sort(
    ([a], [b]) => Number(a) - Number(b),
  )) {
    if (!/^\d+$/.test(group) || !Array.isArray(values)) {
      throw new Error(`Mutashabihat group ${group}: invalid group.`);
    }
    values.forEach((value: unknown, offset: number) => {
      sourceRowCount += 1;
      const where = `Mutashabihat group ${group}, row ${String(offset + 1)}`;
      const row = object(value, where);
      const source = parseRange(object(row['src'], `${where}.src`)['ayah'], `${where}.src`, repeated);
      const matches = row['muts'];
      if (!Array.isArray(matches) || matches.length === 0) {
        throw new Error(`${where}.muts: expected a nonempty array.`);
      }
      const contextAfter = row['ctx'] === undefined ? 0 : row['ctx'];
      if (typeof contextAfter !== 'number' || !Number.isInteger(contextAfter) || contextAfter < 0) {
        throw new Error(`${where}.ctx: expected a nonnegative integer.`);
      }
      matches.forEach((match: unknown, targetOffset: number) => {
        const target = parseRange(
          object(match, `${where}.muts[${String(targetOffset)}]`)['ayah'],
          `${where}.muts[${String(targetOffset)}]`,
          repeated,
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

  links.sort(
    (a, b) =>
      a.source.start - b.source.start ||
      a.source.end - b.source.end ||
      a.target.start - b.target.start ||
      a.target.end - b.target.end ||
      a.contextAfter - b.contextAfter,
  );

  return {
    format: 'quran-similar-passages',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    sourceRowCount,
    duplicateCount,
    repeatedRangeMemberCount,
    links,
  };
}
