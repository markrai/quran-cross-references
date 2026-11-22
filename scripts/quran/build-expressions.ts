import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuranEvidenceSource } from '../../src/core/quran/relationship-evidence.ts';
import { importQuranText } from './datasets.ts';
import { createExactExpressionEvidence, validateExactExpressionEvidence } from './expression-evidence.ts';
import { verifyPinnedQuranSource } from './pinned-source.ts';

interface Manifest {
  readonly sources: readonly QuranEvidenceSource[];
}

const manifest = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as Manifest;

function readPinned(id: string): string {
  const pin = manifest.sources.find((source) => source.id === id);
  if (!pin) throw new Error('Missing pinned source: ' + id);
  const content = readFileSync(join('data/raw', pin.fileName));
  return verifyPinnedQuranSource(content, pin.sha256, pin.id).toString('utf8');
}

const source = manifest.sources.find((entry) => entry.id === 'tanzil-uthmani');
if (!source) throw new Error('Missing pinned Tanzil source metadata.');

const begin = performance.now();
const before = process.memoryUsage().heapUsed;
const text = importQuranText(readPinned('tanzil-uthmani'), readPinned('pickthall'));
const dataset = createExactExpressionEvidence(text.arabic, source);
validateExactExpressionEvidence(dataset, text.arabic, source);
const output = JSON.stringify(dataset) + '\n';
const bytes = Buffer.byteLength(output, 'utf8');
const maxBytes = 64 * 1024 * 1024;
if (bytes > maxBytes) {
  throw new Error('Exact-expression dataset exceeded 64 MiB. Review the profile before publication.');
}
const directory = 'data/quran/generated';
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'expressions.json'), output);
const digest = createHash('sha256').update(output).digest('hex');
const elapsedMs = Math.round(performance.now() - begin);
const heapDeltaBytes = process.memoryUsage().heapUsed - before;
const profile = {
  format: 'quran-exact-expression-profile',
  schemaVersion: 1,
  sourceId: source.id,
  sourceSha256: source.sha256,
  tokenPolicy: dataset.tokenPolicy,
  minWords: dataset.minWords,
  maxWords: dataset.maxWords,
  ...dataset.statistics,
  datasetBytes: bytes,
  datasetSha256: digest,
  elapsedMs,
  heapDeltaBytes,
  publication: 'generated-only',
};
writeFileSync(join(directory, 'expression-profile.json'), JSON.stringify(profile, null, 2) + '\n');
console.log(
  'Exact Quran expressions: ' +
    String(dataset.statistics.tokenCount) +
    ' tokens; ' +
    String(dataset.statistics.repeatedCandidates) +
    ' repeated candidates; ' +
    String(dataset.statistics.emittedExpressions) +
    ' retained expressions; ' +
    String(dataset.statistics.emittedOccurrences) +
    ' word-span occurrences; ' +
    String(bytes) +
    ' bytes; SHA-256 ' +
    digest +
    '; ' +
    String(elapsedMs) +
    ' ms.',
);
