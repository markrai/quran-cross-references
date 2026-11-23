import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface SourcePin {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
}

const revision = 'cb3852b127bfdda6668c5eec9e5c1d9cdcde3810';
const origin =
  'https://raw.githubusercontent.com/dev-ahmadbilal/quran-semantic-annotation-corpus/' +
  revision +
  '/data/';
const records = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly SourcePin[];
};

for (const [id, filename, limit] of [
  ['qsac-verse-tags-v1', 'qsac-dataset.csv', 4 * 1024 * 1024],
  ['qsac-ontology-v1', 'qsac-ontology.json', 1024 * 1024],
] as const) {
  const pin = records.sources.find((entry) => entry.id === id);
  if (
    pin?.url !== origin + filename ||
    pin.fileName !== filename ||
    !/^[a-f0-9]{64}$/.test(pin.sha256)
  ) {
    throw new Error('QSAC source requires a reviewed immutable revision and checksum.');
  }
  const destination = join('data/raw', pin.fileName);
  const verify = (content: Buffer): void => {
    if (content.byteLength > limit) {
      throw new Error('QSAC source exceeds its download budget.');
    }
    const hash = createHash('sha256').update(content).digest('hex');
    if (hash !== pin.sha256) {
      throw new Error('QSAC source checksum mismatch for ' + filename + '.');
    }
  };
  if (existsSync(destination)) {
    verify(readFileSync(destination));
  } else {
    const response = await fetch(pin.url);
    if (!response.ok) {
      throw new Error(
        'QSAC download failed (' + String(response.status) + ') for ' + filename + '.',
      );
    }
    const body = Buffer.from(await response.arrayBuffer());
    verify(body);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, body);
  }
}
console.log('QSAC v1.0: both original annotation sources verified.');
