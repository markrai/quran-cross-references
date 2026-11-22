import { describe, expect, it } from 'vitest';
import { QURAN_DEPLOY_BASE } from './quran-site.ts';

describe('Quran release base path', () => {
  it('uses this repository rather than the original Bible project path', () => {
    expect(QURAN_DEPLOY_BASE).toBe('/quran-cross-references/');
    const url = new URL('?ref=2%3A255', 'https://example.org' + QURAN_DEPLOY_BASE);
    expect(url.pathname).toBe('/quran-cross-references/');
  });
});
