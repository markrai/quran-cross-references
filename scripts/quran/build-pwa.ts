import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { offlineWorkerSource, pwaCacheFiles } from './pwa.ts';

const output = resolve('dist');
const filenames = readdirSync(output, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => relative(output, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'));
const files = pwaCacheFiles(filenames);
for (const required of [
  'index.html',
  'quran/index.html',
  'data/quran/text.json',
  'data/quran/relationships.json',
  'data/quran/manifest.json',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'social-preview.png',
]) {
  if (!files.includes(required)) {
    throw new Error(`Missing Quran offline asset: ${required}`);
  }
}

const hash = createHash('sha256');
hash.update(offlineWorkerSource(files, 'template'));
for (const filename of files) {
  hash.update(filename);
  hash.update(readFileSync(resolve(output, filename)));
}
const revision = hash.digest('hex').slice(0, 20);
writeFileSync(resolve(output, 'sw.js'), offlineWorkerSource(files, revision));
console.log(`Quran offline worker ${revision}: ${String(files.length)} files cached.`);
