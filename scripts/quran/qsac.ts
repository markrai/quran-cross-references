import {
  QSAC_AYAH_COUNT,
  QSAC_CATEGORY_COUNT,
  QSAC_DOMAIN_COUNT,
  QSAC_TAG_COUNT,
  type QuranThemeDataset,
  type QuranThemeTag,
} from '../../src/core/quran/theme-types.ts';
import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';

const revision = 'cb3852b127bfdda6668c5eec9e5c1d9cdcde3810';

function fail(message: string): never {
  throw new Error('Invalid QSAC thematic annotation source: ' + message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(label + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(label + ' must be an array.');
  return value as readonly unknown[];
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    fail(label + ' must be nonempty and canonical.');
  }
  return value;
}

function parseCsv(content: string): readonly (readonly string[])[] {
  if (
    !content.startsWith('# QSAC - Quran Semantic Annotation Corpus') ||
    !content.includes('License: Creative Commons Attribution 4.0')
  ) {
    fail('Expected source attribution header is absent.');
  }
  const header = 'surah,ayah,arabic,eng,tags';
  const offset = content.indexOf('\n' + header + '\n');
  if (offset < 0) fail('Expected five-column CSV header is absent.');
  const source = content.slice(offset + 1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (quoted) {
        quoted = false;
      } else if (field === '') {
        quoted = true;
      } else {
        fail('Malformed CSV quoting.');
      }
    } else if (!quoted && char === ',') {
      row.push(field);
      field = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((part) => part !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) fail('Unclosed quoted CSV field.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows[0]?.join(',') !== header) fail('Unexpected QSAC CSV columns.');
  return rows.slice(1);
}

export function importQsacThemes(
  csv: string,
  ontology: string,
  hashes: { readonly annotations: string; readonly ontology: string },
): QuranThemeDataset {
  if (!/^[a-f0-9]{64}$/.test(hashes.annotations) || !/^[a-f0-9]{64}$/.test(hashes.ontology)) {
    fail('Input checksum pins are missing.');
  }
  const root: unknown = JSON.parse(ontology);
  const definition = record(root, 'Ontology');
  if (definition['version'] !== '1.0') fail('Unexpected ontology version.');
  const domains = array(definition['domains'], 'Domains');
  if (domains.length !== QSAC_DOMAIN_COUNT) fail('Unexpected domain count.');
  const tags: QuranThemeTag[] = [];
  const byName = new Map<string, number>();
  let categories = 0;
  for (const rawDomain of domains) {
    const domain = record(rawDomain, 'Domain');
    const domainName = text(domain['name'], 'Domain name');
    for (const rawCategory of array(domain['categories'], 'Categories')) {
      categories += 1;
      const category = record(rawCategory, 'Category');
      const categoryName = text(category['name'], 'Category name');
      for (const rawTag of array(category['tags'], 'Tags')) {
        const tag = record(rawTag, 'Tag');
        const name = text(tag['name'], 'Tag name');
        const description = text(tag['description'], 'Tag description');
        if (byName.has(name)) fail('Duplicate ontology tag: ' + name);
        byName.set(name, tags.length);
        tags.push({
          name,
          description,
          domain: domainName,
          category: categoryName,
          count: 0,
        });
      }
    }
  }
  if (categories !== QSAC_CATEGORY_COUNT || tags.length !== QSAC_TAG_COUNT) {
    fail('Unexpected category or tag count.');
  }
  const parsed = parseCsv(csv);
  if (parsed.length !== QSAC_AYAH_COUNT) fail('Expected all 6,236 canonical ayahs.');
  const counts = new Uint32Array(tags.length);
  const ayahs: number[][] = [];
  let assignmentCount = 0;
  for (const [index, row] of parsed.entries()) {
    if (row.length !== 5) fail('Unexpected CSV field count in verse ' + String(index));
    const reference = CANONICAL_QURAN.refAt(index);
    if (
      row[0] !== String(reference.surah) ||
      row[1] !== String(reference.ayah) ||
      !row[2]?.trim() ||
      !row[3]?.trim()
    ) {
      fail(
        'Unaligned source verse or empty excluded Arabic/translation column at ' + String(index),
      );
    }
    const rawTags = row[4]?.split('|') ?? [];
    if (rawTags.length < 1 || rawTags.length > 5) {
      fail('Expected 1–5 thematic labels per ayah.');
    }
    const ids: number[] = [];
    for (const name of rawTags) {
      const id = byName.get(name);
      if (id === undefined) fail('Unknown source tag: ' + name);
      if (ids.includes(id)) fail('Duplicate tag in one ayah.');
      ids.push(id);
      counts[id] = (counts[id] ?? 0) + 1;
      assignmentCount += 1;
    }
    ayahs.push(ids);
  }
  return {
    format: 'quran-external-themes',
    schemaVersion: 1,
    versification: CANONICAL_QURAN.id,
    origin: 'external-llm-assisted-annotation',
    authority: 'exploratory-not-tafsir',
    source: {
      annotationsSha256: hashes.annotations,
      ontologySha256: hashes.ontology,
      revision,
      license: 'CC BY 4.0',
      attribution:
        'QSAC (2026), Ahmad Bilal, CC BY 4.0; LLM-assisted and human-reviewed thematic annotations. https://github.com/dev-ahmadbilal/quran-semantic-annotation-corpus',
    },
    annotationCount: assignmentCount,
    tags: tags.map((tag, index) => ({ ...tag, count: counts[index] ?? 0 })),
    ayahs,
  };
}
