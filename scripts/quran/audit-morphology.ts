import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { importQuranText } from './datasets.ts';
import { verifyPinnedQuranSource } from './pinned-source.ts';
import { auditQac, QAC_FILENAME } from './morphology-audit.ts';

let input: Buffer;
try {
  input = readFileSync('data/raw/' + QAC_FILENAME);
} catch {
  throw new Error(
    'Morphology audit needs an independently obtained, unmodified QAC v0.4 file at data/raw/' +
    QAC_FILENAME + '. This command neither downloads nor publishes third-party annotation.',
  );
}
const registry = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly { readonly id: string; readonly sha256: string }[];
};
function pinned(id: string, file: string): string {
  const item = registry.sources.find((source) => source.id === id);
  if (!item) throw new Error('Missing source pin: ' + id);
  return verifyPinnedQuranSource(readFileSync('data/raw/' + file), item.sha256, id).toString('utf8');
}
const original = importQuranText(
  pinned('tanzil-uthmani', 'quran-uthmani-1.1.txt'),
  pinned('pickthall', 'en.pickthall.txt'),
);
const audit = auditQac(input, original.arabic);
mkdirSync('data/quran/generated', { recursive: true });
writeFileSync('data/quran/generated/morphology-audit.json', JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit, null, 2));
