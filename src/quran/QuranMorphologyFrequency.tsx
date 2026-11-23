import { useMemo, useState } from 'react';
import { getSurah } from '../core/quran/surahs.ts';
import { buckwalterToArabic, type QacMorphologyIndex } from '../core/quran/qac-index.ts';
import {
  buildQacFrequencyReport,
  QAC_COVERAGE_SIZES,
  qacFrequencyCoverage,
  qacSurahFrequency,
} from '../core/quran/qac-frequency.ts';
import type { QacGrouping } from '../core/quran/qac-types.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import styles from './QuranApp.module.css';

interface Props {
  readonly index: QacMorphologyIndex;
  readonly grouping: QacGrouping;
  readonly term: string | null;
  readonly onSelect: (term: string) => void;
  readonly onOccurrence: (ayah: number, word: number) => void;
}

const number = (value: number) => value.toLocaleString('en');
const percentage = (value: number) => value.toFixed(1) + '%';

export function QuranMorphologyFrequency({
  index,
  grouping,
  term,
  onSelect,
  onOccurrence,
}: Props) {
  const report = useMemo(() => buildQacFrequencyReport(index, grouping), [index, grouping]);
  const [familyCount, setFamilyCount] = useState<number>(25);
  const [visibleFamilies, setVisibleFamilies] = useState(15);
  const [allSurahs, setAllSurahs] = useState(false);
  const coverage = qacFrequencyCoverage(report, familyCount);
  const selectedFamily = report.families.find((family) => family.term === term);
  const distribution = useMemo(
    () => (term === null ? [] : qacSurahFrequency(index, grouping, term)),
    [index, grouping, term],
  );
  const largest = distribution[0]?.words ?? 1;
  const topFamily = report.families[0]?.words ?? 1;

  return (
    <section className={styles.qacFrequencyPanel} aria-label="QAC vocabulary frequency analytics">
      <div className={styles.qacFrequencyHeading}>
        <div>
          <p className={styles.eyebrow}>Phase 3C.2 · QAC v0.4 linguistic analytics</p>
          <h3>Vocabulary frequency and coverage</h3>
          <p>
            Ranked {grouping} families from the pinned Quranic Arabic Corpus. Counts use unique
            annotated word positions, never guessed meanings or unverified Tanzil offsets.
          </p>
        </div>
        <label className={styles.field}>
          <span>Coverage family count</span>
          <select
            aria-label="Coverage family count"
            value={familyCount}
            onChange={(event) => {
              setFamilyCount(Number(event.target.value));
            }}
          >
            {QAC_COVERAGE_SIZES.map((count) => (
              <option key={count} value={count}>
                Top {count} {grouping}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.qacFrequencySummary}>
        <p role="status">
          The top <strong>{number(coverage.families)}</strong> {grouping} families occur at{' '}
          <strong>{number(coverage.words)}</strong> of {number(report.totalWords)} QAC word
          positions, or <strong>{percentage(coverage.percent)}</strong>.
        </p>
        <progress
          aria-label={'QAC word-position coverage by top ' + String(coverage.families) + ' ' + grouping + ' families'}
          max={report.totalWords}
          value={coverage.words}
        />
        <p>
          Across all {number(report.families.length)} annotated {grouping}s,{' '}
          {number(report.annotatedWords)} distinct QAC word positions have at least one {grouping}{' '}
          annotation. Positions without that annotation are excluded from family results but
          included in the denominator.
        </p>
      </div>
      <div className={styles.qacFrequencyMilestones} aria-label="Potential coverage by family count">
        {QAC_COVERAGE_SIZES.map((count) => {
          const point = qacFrequencyCoverage(report, count);
          return (
            <div key={count}>
              <span>Top {count}</span>
              <strong>{percentage(point.percent)}</strong>
              <div className={styles.qacFrequencyTrack} aria-hidden="true">
                <span style={{ width: percentage(point.percent) }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.qacFrequencyColumns}>
        <section className={styles.qacFrequencySection} aria-label="Ranked QAC families">
          <h4>Most frequent {grouping}s</h4>
          <p>
            Select a family to inspect its source occurrences. Ties are ordered by the exact
            Buckwalter identifier.
          </p>
          <ol className={styles.qacFrequencyRanking}>
            {report.families.slice(0, visibleFamilies).map((family, rank) => (
              <li key={family.term}>
                <button
                  type="button"
                  aria-label={'Explore ' + grouping + ' ' + family.term + ' rank ' + String(rank + 1)}
                  aria-pressed={family.term === term}
                  onClick={() => {
                    onSelect(family.term);
                    setAllSurahs(false);
                  }}
                >
                  <span className={styles.qacFrequencyRank}>{rank + 1}.</span>
                  <span lang="ar" dir="rtl" className={styles.qacFrequencyArabic}>
                    {buckwalterToArabic(family.term)}
                  </span>
                  <span className={styles.qacFrequencyFamily}>
                    <code>{family.term}</code>
                    <small>
                      {number(family.ayahs)} ayahs · {number(family.surahs)} surahs
                    </small>
                  </span>
                  <strong>{number(family.words)}</strong>
                  <span className={styles.qacFrequencyTrack} aria-hidden="true">
                    <span style={{ width: percentage((family.words / topFamily) * 100) }} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {visibleFamilies < report.families.length && (
            <button
              type="button"
              className={styles.goButton}
              onClick={() => {
                setVisibleFamilies((value) => Math.min(value + 15, report.families.length));
              }}
            >
              Show more ranked families
            </button>
          )}
        </section>
        <section className={styles.qacFrequencySection} aria-label="Selected QAC family distribution">
          <h4>Distribution across surahs</h4>
          {term === null || selectedFamily === undefined ? (
            <p>Select an annotated family to see its canonical surah distribution.</p>
          ) : (
            <>
              <p>
                <span lang="ar" dir="rtl" className={styles.qacFrequencyArabic}>
                  {buckwalterToArabic(term)}
                </span>{' '}
                <code>{term}</code> appears at {number(selectedFamily.words)} annotated word
                positions in {number(selectedFamily.ayahs)} ayahs across{' '}
                {number(selectedFamily.surahs)} surahs.
              </p>
              <ol className={styles.qacSurahDistribution}>
                {distribution.slice(0, allSurahs ? distribution.length : 12).map((entry) => (
                  <li key={entry.surah}>
                    <button
                      type="button"
                      aria-label={'Open ' + getSurah(entry.surah).name + ' ' + grouping + ' source'}
                      onClick={() => {
                        const first = index
                          .occurrences(grouping, term)
                          .find((site) => CANONICAL_QURAN.refAt(site.ayah).surah === entry.surah);
                        if (first) onOccurrence(first.ayah, first.word + 1);
                      }}
                    >
                      <span>{entry.surah}. {getSurah(entry.surah).name}</span>
                      <span>{number(entry.words)} words · {number(entry.ayahs)} ayahs</span>
                      <span className={styles.qacFrequencyTrack} aria-hidden="true">
                        <span style={{ width: percentage((entry.words / largest) * 100) }} />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {distribution.length > 12 && (
                <button
                  type="button"
                  className={styles.goButton}
                  aria-expanded={allSurahs}
                  onClick={() => {
                    setAllSurahs((value) => !value);
                  }}
                >
                  {allSurahs ? 'Show top 12 surahs' : 'Show all represented surahs'}
                </button>
              )}
            </>
          )}
        </section>
      </div>
      <p className={styles.qacFrequencyFootnote}>
        Potential word-position coverage is not a measure of Arabic fluency or learned vocabulary.
        A word can carry multiple annotations and belong to more than one family; cumulative
        coverage counts each canonical QAC word position once. Roots and lemmas are evaluated
        separately. Source: Quranic Arabic Corpus v0.4, © 2011 Kais Dukes.
      </p>
    </section>
  );
}
