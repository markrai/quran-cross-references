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
const pin = sources.sources.find((item) => item.id === 'maqam-2026');
if (!pin || !pin.url.startsWith('https://raw.githubusercontent.com/CAMeL-Lab/MAQAM-Quranic-Corpus/2e52c1354a901e998a311c94f43d14c99f467f6f/')) {
  throw new Error('The MAQAM morphology source must be pinned to the reviewed upstream commit.');
}

const destination = join('data/raw', pin.fileName);
const verify = (buffer: Buffer): void => {
  const digest = createHash('sha256').update(buffer).digest('hex');
  if (digest !== pin.sha256) {
    throw new Error(
      'MAQAM source digest mismatch (expected ' + pin.sha256 + ', received ' + digest + ').',
    );
  }
};

if (existsSync(destination)) {
  verify(readFileSync(destination));
  console.log('MAQAM morphology: verified the existing pinned source.');
} else {
  const response = await fetch(pin.url);
  if (!response.ok) {
    throw new Error('Unable to fetch pinned MAQAM morphology (HTTP ' + String(response.status) + ').');
  }
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > 16 * 1024 * 1024) {
    throw new Error('MAQAM morphology source exceeds the 16 MiB download budget.');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > 16 * 1024 * 1024) {
    throw new Error('MAQAM morphology source exceeds the 16 MiB download budget.');
  }
  verify(buffer);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, buffer);
  console.log('MAQAM morphology: fetched and verified ' + String(buffer.length) + ' bytes.');
}
