import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createCuratedRelationshipEvidence,
  QuranRelationshipEvidenceIndex,
} from '../../src/core/quran/relationship-evidence.ts';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import {
  createExactExpressionEvidence,
  validateExactExpressionEvidence,
} from './expression-evidence.ts';
import { importMutashabihat, importQuranText } from './datasets.ts';
import { buildQuranAnalytics } from './analytics.ts';
import { importQacMorphology } from './qac.ts';
import { importQsacThemes } from './qsac.ts';
import { buildQuranTopology } from '../../src/quran/topology-model.ts';
import { verifyPinnedQuranSource } from './pinned-source.ts';

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
  return verifyPinnedQuranSource(content, source.sha256, id).toString('utf8');
}

const text = importQuranText(readPinned('tanzil-uthmani'), readPinned('pickthall'));
const links = importMutashabihat(readPinned('mutashabihat'));
const curatedPin = pins.find((pin) => pin.id === 'mutashabihat');
if (!curatedPin) throw new Error('Missing pinned curated relationship source.');
const relationshipIndex = new QuranRelationshipIndex(links);
const evidence = createCuratedRelationshipEvidence(relationshipIndex, curatedPin);
new QuranRelationshipEvidenceIndex(evidence, relationshipIndex, curatedPin);
const destinations = ['data/quran/generated', 'public/quran-only/data/quran'];
for (const destination of destinations) mkdirSync(destination, { recursive: true });

const outputs: Record<string, string> = {};
function writeDataset(name: string, payload: unknown): void {
  const content = `${JSON.stringify(payload)}\n`;
  for (const destination of destinations) writeFileSync(join(destination, name), content);
  outputs[name] = createHash('sha256').update(content).digest('hex');
}

const tanzilNotice = [
  'Tanzil Quran Text',
  'Copyright (C) 2007-2021 Tanzil Project',
  'License: Creative Commons Attribution 3.0',
  '',
  'This copy of the Quran text is carefully produced, highly',
  'verified and continuously monitored by a group of specialists',
  'in Tanzil Project.',
  '',
  'TERMS OF USE:',
  '',
  '- Permission is granted to copy and distribute verbatim copies',
  '  of this text, but CHANGING IT IS NOT ALLOWED.',
  '',
  '- This Quran text can be used in any website or application,',
  '  provided that its source (Tanzil Project) is clearly indicated,',
  '  and a link is made to tanzil.net to enable users to keep',
  '  track of changes.',
  '',
  '- This copyright notice shall be included in all verbatim copies',
  '  of the text, and shall be reproduced appropriately in all files',
  '  derived from or containing substantial portion of this text.',
  '',
  'Please check updates at: http://tanzil.net/updates/',
].join('\n');
writeDataset('text.json', { ...text, tanzilNotice });

writeDataset('relationships.json', links);
writeDataset('evidence.json', evidence);
const arabicPin = pins.find((pin) => pin.id === 'tanzil-uthmani');
if (!arabicPin) throw new Error('Missing pinned Arabic source.');
const expressions = createExactExpressionEvidence(text.arabic, arabicPin);
validateExactExpressionEvidence(expressions, text.arabic, arabicPin);
writeDataset('expressions.json', { ...expressions, tanzilNotice });
const analytics = buildQuranAnalytics(
  relationshipIndex,
  expressions,
  { arabic: arabicPin.sha256, curated: curatedPin.sha256 },
  tanzilNotice,
);
writeDataset('analytics.json', analytics);
writeDataset('topology.json', buildQuranTopology(relationshipIndex, curatedPin.sha256));
const qacPin = pins.find((pin) => pin.id === 'qac-morphology-v04');
if (!qacPin) throw new Error('Missing pinned QAC v0.4 morphology.');
writeDataset('morphology.json', importQacMorphology(readPinned(qacPin.id), qacPin, tanzilNotice));
const themeSource = pins.find((pin) => pin.id === 'qsac-verse-tags-v1');
const ontologySource = pins.find((pin) => pin.id === 'qsac-ontology-v1');
if (!themeSource || !ontologySource) throw new Error('Missing pinned QSAC source.');
writeDataset(
  'themes.json',
  importQsacThemes(readPinned(themeSource.id), readPinned(ontologySource.id), {
    annotations: themeSource.sha256,
    ontology: ontologySource.sha256,
  }),
);
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
