import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface SourcePin {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly sha256: string;
}

const revision = '364cdccf6518e35003db51ccf856d9328dbb7ff3';
const sourceUrl = 'https://raw.githubusercontent.com/Arwaalmrzoqi/ELQV/' + revision + '/ELQV.csv';
const catalog = JSON.parse(readFileSync('data/quran/sources.json', 'utf8')) as {
  readonly sources: readonly SourcePin[];
};
const pin = catalog.sources.find((entry) => entry.id === 'elqv-2025-expert-emotions');
if (
  pin?.url !== sourceUrl ||
  pin.fileName !== 'ELQV.csv' ||
  !/^[a-f0-9]{64}$/.test(pin.sha256)
) {
  throw new Error('ELQV requires the reviewed immutable source revision and SHA-256 pin.');
}
const destination = join('data/raw', pin.fileName);
const verify = (content: Buffer): void => {
  if (content.byteLength > 1024 * 1024) {
    throw new Error('ELQV original source exceeds its 1 MiB budget.');
  }
  if (createHash('sha256').update(content).digest('hex') !== pin.sha256) {
    throw new Error('ELQV original source differs from the immutable SHA-256 pin.');
  }
};
if (existsSync(destination)) {
  verify(readFileSync(destination));
} else {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error('ELQV download failed (HTTP ' + String(response.status) + ').');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  verify(bytes);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
}
console.log('ELQV 2025: original research source verified against its immutable hash.');
