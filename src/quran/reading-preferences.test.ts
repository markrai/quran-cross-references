import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_READING_PREFERENCES,
  READING_PREFERENCES_KEY,
  parseReadingPreferences,
  readReadingPreferences,
  readingTextStyles,
  saveReadingPreferences,
} from './reading-preferences.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('Phase 3B.1 reader preferences', () => {
  it('defaults to bilingual, comfortable text and visible research without storage', () => {
    expect(parseReadingPreferences(null)).toEqual(DEFAULT_READING_PREFERENCES);
    expect(readReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES);
  });

  it('round-trips versioned preferences without modifying navigation state', () => {
    const preferences = {
      language: 'arabic' as const,
      arabicSize: 140 as const,
      englishSize: 120 as const,
      spacing: 'spacious' as const,
      readingMode: true,
    };
    saveReadingPreferences(preferences);
    expect(readReadingPreferences()).toEqual(preferences);
    expect(JSON.parse(window.localStorage.getItem(READING_PREFERENCES_KEY) ?? '')).toEqual({
      version: 1,
      ...preferences,
    });
  });

  it('rejects malformed versions and unsafe values without executing or applying them', () => {
    for (const raw of ['not-json', 'null', '[]', '"x"', '{}', '{"version":3,"readingMode":true}']) {
      expect(parseReadingPreferences(raw)).toEqual(DEFAULT_READING_PREFERENCES);
    }
    expect(
      parseReadingPreferences(
        JSON.stringify({
          version: 1,
          language: 'invalid',
          arabicSize: 100000,
          englishSize: -10,
          spacing: 'broken',
          readingMode: 'true',
        }),
      ),
    ).toEqual(DEFAULT_READING_PREFERENCES);
    expect(parseReadingPreferences('{"version":1,"language":"english","englishSize":160}')).toEqual(
      { ...DEFAULT_READING_PREFERENCES, language: 'english', englishSize: 160 },
    );
  });

  it('fails safely if browser storage is unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('denied');
        },
      },
    });
    expect(readReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES);
    expect(() => {
      saveReadingPreferences(DEFAULT_READING_PREFERENCES);
    }).not.toThrow();
  });

  it('generates bounded rem-based typography values for each spacing mode', () => {
    const base = readingTextStyles(DEFAULT_READING_PREFERENCES);
    expect(base['--reading-arabic-size']).toBe('1.75rem');
    expect(base['--reading-english-size']).toBe('1.02rem');
    expect(base['--reading-arabic-leading']).toBe('2.05');
    const wide = readingTextStyles({
      ...DEFAULT_READING_PREFERENCES,
      arabicSize: 160,
      englishSize: 90,
      spacing: 'spacious',
    });
    expect(wide['--reading-arabic-size']).toBe('2.80rem');
    expect(wide['--reading-english-size']).toBe('0.92rem');
    expect(wide['--reading-english-leading']).toBe('1.9');
    expect(
      readingTextStyles({ ...DEFAULT_READING_PREFERENCES, spacing: 'compact' })[
        '--reading-arabic-leading'
      ],
    ).toBe('1.7');
  });
});
