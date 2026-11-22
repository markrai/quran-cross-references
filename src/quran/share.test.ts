import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareQuranReference } from './share.ts';

const url = 'https://example.test/?ref=2%3A255';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Quran passage sharing', () => {
  it('uses device-native sharing when available', async () => {
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share });
    expect(await shareQuranReference(url, 'Al-Baqarah 2:255')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Al-Baqarah 2:255', url });
  });

  it('copies the full canonical URL when native sharing is absent', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareQuranReference(url, 'Al-Baqarah 2:255')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it('falls back to the clipboard after a native share failure', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', {
      share: vi.fn(() => Promise.reject(new Error('Not supported'))),
      clipboard: { writeText },
    });
    expect(await shareQuranReference(url, 'Al-Baqarah 2:255')).toBe('copied');
  });

  it('reports unavailable sharing when the user cancels or the clipboard is blocked', async () => {
    const error = new Error('Canceled');
    error.name = 'AbortError';
    vi.stubGlobal('navigator', {
      share: vi.fn(() => Promise.reject(error)),
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
    expect(await shareQuranReference(url, 'Al-Baqarah 2:255')).toBe('cancelled');

    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => Promise.reject(error)) } });
    expect(await shareQuranReference(url, 'Al-Baqarah 2:255')).toBe('unavailable');

    vi.stubGlobal('navigator', {});
    expect(await shareQuranReference(url, 'Al-Baqarah 2:255')).toBe('unavailable');
  });
});
