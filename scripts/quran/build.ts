import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importMutashabihat, importQuranText } from './datasets.ts';

interface SourcePin {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly license: string;
  readonly attribution: string;
  readonly retrievedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPins(): readonly SourcePin[] {
  const parsed: unknown = JSON.parse(readFileSync('data/quran/sources.json', 'utf8'));
  if (!isRecord(parsed) || !Array.isArray(parsed['sources'])) {
    throw new Error('Invalid Quran source manifest.');
  }
  return (parsed['sources'] as unknown[]).map((entry) => {
    if (
      !isRecord(entry) ||
      !['id', 'url', 'fileName', 'sha256', 'license', 'attribution', 'retrievedAt'].every(
        (field) => typeof entry[field] === 'string',
      )
    ) {
      throw new Error('Invalid Quran source pin.');
    }
    return entry as unknown as SourcePin;
  });
}

const pins = readPins();
function readPinned(id: string): string {
  const source = pins.find((pin) => pin.id === id);
  if (!source) throw new Error(`Unknown Quran data source: ${id}.`);
  const content = readFileSync(join('data/raw', source.fileName));
  const actual = createHash('sha256').update(content).digest('hex');
  if (actual !== source.sha256) {
    throw new Error(`Quran source ${id} has checksum ${actual}, expected ${source.sha256}.`);
  }
  return content.toString('utf8');
}

const text = importQuranText(readPinned('tanzil-uthmani'), readPinned('pickthall'));
const links = importMutashabihat(readPinned('mutashabihat'));
const destinations = ['data/quran/generated', 'public/data/quran'];
for (const destination of destinations) mkdirSync(destination, { recursive: true });

const outputs: Record<string, string> = {};
function writeDataset(name: string, payload: unknown): void {
  const content = `${JSON.stringify(payload)}\n`;
  for (const destination of destinations) writeFileSync(join(destination, name), content);
  outputs[name] = createHash('sha256').update(content).digest('hex');
}

writeDataset('text.json', text);
writeDataset('relationships.json', links);
writeDataset('manifest.json', {
  format: 'quran-foundation-manifest',
  schemaVersion: 1,
  versification: text.versification,
  sources: pins,
  outputs,
  relationshipCount: links.links.length,
  sourceRowCount: links.sourceRowCount,
  duplicateCount: links.duplicateCount,
  repeatedRangeMemberCount: links.repeatedRangeMemberCount,
});
console.log(
  `Quran foundation: ${String(text.arabic.length)} Arabic/English ayahs, ` +
    `${String(links.links.length)} curated relationships validated.`,
);
