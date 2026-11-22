import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyPinnedQuranSource } from './pinned-source.ts';

const canonical = Buffer.from('1|1|بِسْمِ اللَّهِ\n1|2|الْحَمْدُ لِلَّهِ\n', 'utf8');
const expected = createHash('sha256').update(canonical).digest('hex');

describe('pinned Quran source verification', () => {
  it('keeps the exact verified source bytes', () => {
    expect(verifyPinnedQuranSource(canonical, expected, 'fixture')).toBe(canonical);
  });

  it('accepts Windows CRLF only when it reproduces the pinned LF bytes exactly', () => {
    const checkout = Buffer.from(canonical.toString('utf8').replaceAll('\n', '\r\n'), 'utf8');
    const verified = verifyPinnedQuranSource(checkout, expected, 'fixture');
    expect(verified).toEqual(canonical);
    expect(verified).not.toBe(checkout);
  });

  it('rejects changed scripture even when it has CRLF line endings', () => {
    const changed = Buffer.from(
      canonical.toString('utf8').replace('بِسْمِ', 'بسم').replaceAll('\n', '\r\n'),
      'utf8',
    );
    expect(() => verifyPinnedQuranSource(changed, expected, 'fixture')).toThrow(
      /Quran source fixture has checksum .* expected /,
    );
  });

  it('rejects unrecognized line ending or expected-checksum changes', () => {
    const carriageReturn = Buffer.from(canonical.toString('utf8').replaceAll('\n', '\r'), 'utf8');
    expect(() => verifyPinnedQuranSource(carriageReturn, expected, 'fixture')).toThrow(
      /checksum/,
    );
    expect(() => verifyPinnedQuranSource(canonical, '0'.repeat(64), 'fixture')).toThrow(
      /checksum/,
    );
  });
});
