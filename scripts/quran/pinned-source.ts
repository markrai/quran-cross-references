import { createHash } from 'node:crypto';

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function verifyPinnedQuranSource(
  content: Buffer,
  expectedSha256: string,
  id: string,
): Buffer {
  const actual = sha256(content);
  if (actual === expectedSha256) return content;

  const text = content.toString('utf8');
  if (text.includes('\r\n')) {
    const canonical = Buffer.from(text.replaceAll('\r\n', '\n'), 'utf8');
    if (sha256(canonical) === expectedSha256) return canonical;
  }

  throw new Error(`Quran source ${id} has checksum ${actual}, expected ${expectedSha256}.`);
}
