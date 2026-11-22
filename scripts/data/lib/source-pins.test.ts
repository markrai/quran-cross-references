import { describe, expect, it } from 'vitest';
import { readSources } from './sources.ts';

const HISTORICAL_STEP_BIBLE_COMMIT = '95927044f33c540073246306cea5b13f5a16eb02';

describe('pinned STEP Bible source snapshots', () => {
  it('uses immutable commits and retains the reviewed content digests', async () => {
    const sources = await readSources();
    const stepBible = sources.filter((source) => source.id.startsWith('stepbible-'));
    expect(stepBible).toHaveLength(8);
    for (const source of stepBible) {
      expect(source.url).toContain(`/STEPBible-Data/${HISTORICAL_STEP_BIBLE_COMMIT}/`);
      expect(source.url).not.toContain('/master/');
      expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    const jobSng = stepBible.find((source) => source.id === 'stepbible-tahot-job-sng');
    expect(jobSng?.sha256).toBe('bb508af3af07822fca84cc43a0eba79eb70eecf672aabc0245b8d8cecf329d96');
  });
});
