import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface SourcePin {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
}

const sources = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly SourcePin[];
};
const pin = sources.sources.find((entry) => entry.id === 'qac-morphology-v04');
if (
  !pin ||
  !pin.url.startsWith(
    'https://raw.githubusercontent.com/taziksh/quran-frequencies/079cdc74cd494ec1b35011363288d80cae047c51/',
  ) ||
  !/^[a-f0-9]{64}$/.test(pin.sha256)
) {
  throw new Error('The QAC v0.4 morphology source must have reviewed immutable provenance.');
}

const destination = join('data/raw', pin.fileName);
const verify = (content: Buffer): void => {
  if (content.byteLength > 8 * 1024 * 1024) {
    throw new Error('The QAC morphology source exceeds the 8 MiB download budget.');
  }
  const checksum = createHash('sha256').update(content).digest('hex');
  if (checksum !== pin.sha256) {
    throw new Error(
      'QAC v0.4 source checksum mismatch (expected ' + pin.sha256 + ', got ' + checksum + ').',
    );
  }
};

if (existsSync(destination)) {
  verify(readFileSync(destination));
  console.log('QAC v0.4: existing source verified.');
} else {
  const response = await fetch(pin.url);
  if (!response.ok) {
    throw new Error(
      'Unable to retrieve pinned QAC v0.4 source (HTTP ' + String(response.status) + ').',
    );
  }
  const content = Buffer.from(await response.arrayBuffer());
  verify(content);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
  console.log('QAC v0.4: fetched and verified ' + String(content.byteLength) + ' original bytes.');
}
