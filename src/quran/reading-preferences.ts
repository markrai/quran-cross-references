export type ReadingLanguage = 'bilingual' | 'arabic' | 'english';
export type ReadingSpacing = 'compact' | 'comfortable' | 'spacious';
export type ReadingSize = 90 | 100 | 120 | 140 | 160;

export interface ReadingPreferences {
  readonly language: ReadingLanguage;
  readonly arabicSize: ReadingSize;
  readonly englishSize: ReadingSize;
  readonly spacing: ReadingSpacing;
  readonly readingMode: boolean;
}

export const READING_PREFERENCES_KEY = 'quran-reader-preferences-v1';

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  language: 'bilingual',
  arabicSize: 100,
  englishSize: 100,
  spacing: 'comfortable',
  readingMode: false,
};

const READING_SIZES: readonly number[] = [90, 100, 120, 140, 160];

export function parseReadingPreferences(raw: string | null): ReadingPreferences {
  if (raw === null) return DEFAULT_READING_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_READING_PREFERENCES;
    }
    const entry = parsed as Record<string, unknown>;
    if (entry['version'] !== 1) return DEFAULT_READING_PREFERENCES;
    const language = entry['language'];
    const spacing = entry['spacing'];
    const arabicSize = entry['arabicSize'];
    const englishSize = entry['englishSize'];
    const readingMode = entry['readingMode'];
    return {
      language:
        language === 'arabic' || language === 'english' || language === 'bilingual'
          ? language
          : DEFAULT_READING_PREFERENCES.language,
      arabicSize:
        typeof arabicSize === 'number' && READING_SIZES.includes(arabicSize)
          ? (arabicSize as ReadingSize)
          : DEFAULT_READING_PREFERENCES.arabicSize,
      englishSize:
        typeof englishSize === 'number' && READING_SIZES.includes(englishSize)
          ? (englishSize as ReadingSize)
          : DEFAULT_READING_PREFERENCES.englishSize,
      spacing:
        spacing === 'compact' || spacing === 'comfortable' || spacing === 'spacious'
          ? spacing
          : DEFAULT_READING_PREFERENCES.spacing,
      readingMode:
        typeof readingMode === 'boolean'
          ? readingMode
          : DEFAULT_READING_PREFERENCES.readingMode,
    };
  } catch {
    return DEFAULT_READING_PREFERENCES;
  }
}

export function readReadingPreferences(): ReadingPreferences {
  try {
    return parseReadingPreferences(window.localStorage.getItem(READING_PREFERENCES_KEY));
  } catch {
    return DEFAULT_READING_PREFERENCES;
  }
}

export function saveReadingPreferences(preferences: ReadingPreferences): void {
  try {
    window.localStorage.setItem(
      READING_PREFERENCES_KEY,
      JSON.stringify({ version: 1, ...preferences }),
    );
  } catch {
    return;
  }
}

export function readingTextStyles(preferences: ReadingPreferences): Record<string, string> {
  const arabic = preferences.arabicSize / 100;
  const english = preferences.englishSize / 100;
  const leading =
    preferences.spacing === 'compact'
      ? { arabic: '1.7', english: '1.45' }
      : preferences.spacing === 'spacious'
        ? { arabic: '2.4', english: '1.9' }
        : { arabic: '2.05', english: '1.65' };
  return {
    '--reading-arabic-size': (1.75 * arabic).toFixed(2) + 'rem',
    '--reading-english-size': (1.02 * english).toFixed(2) + 'rem',
    '--reading-focus-arabic-size': (2 * arabic).toFixed(2) + 'rem',
    '--reading-focus-english-size': (1.2 * english).toFixed(2) + 'rem',
    '--reading-arabic-leading': leading.arabic,
    '--reading-english-leading': leading.english,
  };
}
