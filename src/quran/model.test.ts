import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadQuranReaderData, parseQuranText } from './model.ts';

const arabic = Array.from({ length: 6236 }, () => 'بِسْمِ ٱللَّهِ');
const english = Array.from({ length: 6236 }, () => 'In the name of Allah.');
const text = {
  format: 'quran-paired-text',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  arabic,
  english,
};

const relationships = {
  format: 'quran-similar-passages',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  sourceRowCount: 1,
  duplicateCount: 0,
  repeatedRangeMemberCount: 0,
  links: [{ source: { start: 0, end: 1 }, target: { start: 8, end: 9 }, contextAfter: 0 }],
};

afterEach(() => vi.unstubAllGlobals());

describe('Quran reader dataset loading', () => {
  it('validates paired Quran text without rewriting Arabic codepoints', () => {
    const parsed = parseQuranText(text);
    expect(parsed.arabic[0]).toBe(arabic[0]);
    expect(parsed.english[6235]).toBe(english[6235]);
  });

  it('rejects malformed scripture datasets', () => {
    expect(() => parseQuranText(null)).toThrow('must be an object');
    expect(() => parseQuranText({ ...text, schemaVersion: 2 })).toThrow('incompatible');
    expect(() => parseQuranText({ ...text, versification: 'other' })).toThrow('incompatible');
    expect(() => parseQuranText({ ...text, arabic: arabic.slice(1) })).toThrow('6,236');
    expect(() => parseQuranText({ ...text, english: [...english.slice(0, 6235), ''] })).toThrow(
      '6,236',
    );
    expect(() => parseQuranText({ ...text, english: 'invalid' })).toThrow('6,236');
  });

  it('fetches both published datasets and builds the Phase 1B index', async () => {
    const fetcher = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(url.endsWith('/text.json') ? text : relationships),
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const data = await loadQuranReaderData();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      '/data/quran/text.json',
      '/data/quran/relationships.json',
    ]);
    expect(data.text.english).toHaveLength(6236);
    expect(data.relationships.linkCount).toBe(1);
    expect(data.relationships.outgoing(0)).toHaveLength(1);
    expect(data.relationships.incoming(9)).toHaveLength(1);
  });

  it('passes through abort signals and reports HTTP failures', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) }),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(loadQuranReaderData(controller.signal)).rejects.toThrow('HTTP 404');
    expect(fetcher).toHaveBeenCalledWith('/data/quran/text.json', { signal: controller.signal });
  });
});
