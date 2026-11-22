import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function isIgnored(path: string): boolean {
  const result = spawnSync('git', ['check-ignore', '--no-index', '-q', path], {
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error('git check-ignore failed: ' + result.stderr);
  }
  return result.status === 0;
}

describe('Quran-only raw data ignore policy', () => {
  it('does not hide the three checksum-pinned Quran snapshots', () => {
    for (const file of [
      'data/raw/quran-uthmani-1.1.txt',
      'data/raw/en.pickthall.txt',
      'data/raw/mutashabiha_data.json',
    ]) {
      expect(isIgnored(file), file).toBe(false);
    }
  });

  it('ignores untracked former Bible archives and downloaded STEP Bible files', () => {
    for (const file of [
      'data/raw/deu1912_vpl.zip',
      'data/raw/eng-kjv2006_vpl.zip',
      'data/raw/ita1927_vpl.zip',
      'data/raw/spavbl_vpl.zip',
      'data/raw/stepbible-tagnt-act-rev.txt',
      'data/raw/stepbible-tahot-isa-mal.txt',
      'data/raw/stepbible-tbesg.txt',
      'data/raw/stepbible-tbesh.txt',
      'data/raw/unpinned-source.txt',
    ]) {
      expect(isIgnored(file), file).toBe(true);
    }
  });
});
