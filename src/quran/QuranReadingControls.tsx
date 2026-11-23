import type { ReadingPreferences, ReadingSize } from './reading-preferences.ts';
import { DEFAULT_READING_PREFERENCES } from './reading-preferences.ts';
import styles from './QuranApp.module.css';

interface QuranReadingControlsProps {
  readonly preferences: ReadingPreferences;
  readonly onChange: (preferences: ReadingPreferences) => void;
}

const SIZES: readonly ReadingSize[] = [90, 100, 120, 140, 160];

export function QuranReadingControls({ preferences, onChange }: QuranReadingControlsProps) {
  return (
    <section className={styles.readingControls} aria-label="Reader display controls">
      <button
        type="button"
        className={styles.goButton}
        aria-pressed={preferences.readingMode}
        onClick={() => {
          onChange({ ...preferences, readingMode: !preferences.readingMode });
        }}
      >
        {preferences.readingMode ? 'Exit reading mode' : 'Enter reading mode'}
      </button>
      <details className={styles.readingSettings}>
        <summary>Reading settings</summary>
        <div className={styles.readingSettingsFields}>
          <label className={styles.field}>
            <span>Reader language</span>
            <select
              aria-label="Reader language"
              value={preferences.language}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'bilingual' || value === 'arabic' || value === 'english') {
                  onChange({ ...preferences, language: value });
                }
              }}
            >
              <option value="bilingual">Arabic and English</option>
              <option value="arabic">Arabic only</option>
              <option value="english">English only</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Arabic size</span>
            <select
              aria-label="Arabic text size"
              value={preferences.arabicSize}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (SIZES.some((size) => size === value)) {
                  onChange({ ...preferences, arabicSize: value as ReadingSize });
                }
              }}
            >
              {SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}%
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>English size</span>
            <select
              aria-label="English text size"
              value={preferences.englishSize}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (SIZES.some((size) => size === value)) {
                  onChange({ ...preferences, englishSize: value as ReadingSize });
                }
              }}
            >
              {SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}%
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Line spacing</span>
            <select
              aria-label="Reader line spacing"
              value={preferences.spacing}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'compact' || value === 'comfortable' || value === 'spacious') {
                  onChange({ ...preferences, spacing: value });
                }
              }}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <button
            type="button"
            className={styles.goButton}
            onClick={() => {
              onChange({ ...DEFAULT_READING_PREFERENCES, readingMode: preferences.readingMode });
            }}
          >
            Reset typography
          </button>
        </div>
      </details>
    </section>
  );
}
