import { useMemo, useState } from 'react';
import type { QuranAnalyticsDataset, QuranAnalyticsSurah } from '../core/quran/analytics-types.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { getSurah } from '../core/quran/surahs.ts';
import styles from './QuranApp.module.css';

type AnalyticsMetric = 'curated' | 'computed';
type AnalyticsUnit = 'per100' | 'count';

interface QuranAnalyticsProps {
  readonly report: QuranAnalyticsDataset;
  readonly selectedSurah: number;
  readonly onOpenSurah: (surah: number, metric: AnalyticsMetric, firstAyah: number) => void;
  readonly onOpenExpression: (id: string, firstAyah: number) => void;
}

function metricValue(
  row: QuranAnalyticsSurah,
  metric: AnalyticsMetric,
  unit: AnalyticsUnit,
): number {
  if (metric === 'curated') {
    return unit === 'per100' ? row.curatedPer100Ayahs : row.curatedLinks;
  }
  return unit === 'per100' ? row.exactSpansPer100Ayahs : row.exactSpans;
}

function evidencePercent(part: number, total: number): string {
  return String(total === 0 ? 0 : Math.round((part / total) * 100)) + '%';
}

export function QuranAnalytics({
  report,
  selectedSurah,
  onOpenSurah,
  onOpenExpression,
}: QuranAnalyticsProps) {
  const [metric, setMetric] = useState<AnalyticsMetric>('curated');
  const [unit, setUnit] = useState<AnalyticsUnit>('per100');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<'density' | 'canonical'>('density');
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('en');
    const matching = report.surahs.filter((row) => {
      const name = getSurah(row.surah).name.toLocaleLowerCase('en');
      return !search || name.includes(search) || String(row.surah) === search;
    });
    if (order === 'density') {
      matching.sort(
        (a, b) => metricValue(b, metric, unit) - metricValue(a, metric, unit) || a.surah - b.surah,
      );
    }
    return matching;
  }, [metric, order, query, report.surahs, unit]);
  const maxValue = Math.max(1, ...rows.map((row) => metricValue(row, metric, unit)));
  const curatedWithin = report.totals.curatedWithin;
  const curatedAcross = report.totals.curatedAcross;
  const exactWithin = report.totals.exactWithinSurahExpressions;
  const exactAcross = report.totals.exactCrossSurahExpressions;
  const format = (value: number) => value.toLocaleString('en', { maximumFractionDigits: 2 });

  return (
    <section className={styles.analyticsDashboard} aria-label="Quran analytics dashboard">
      <header className={styles.analyticsIntro}>
        <div>
          <p className={styles.eyebrow}>Phase 2C.1 · Corpus analytics</p>
          <h1>Explore the Quran through its connections</h1>
          <p>
            Measured from pinned evidence across all 114 surahs. Select a bar or Arabic phrase to
            inspect its original ayah context.
          </p>
        </div>
      </header>

      <div className={styles.analyticsKpis} role="group" aria-label="Corpus summary">
        <div className={styles.analyticsKpi}>
          <strong>{format(report.totals.ayahs)}</strong>
          <span>Canonical ayahs</span>
        </div>
        <div className={styles.analyticsKpi}>
          <strong>{format(report.totals.curatedLinks)}</strong>
          <span>Curated passage links</span>
        </div>
        <div className={styles.analyticsKpi}>
          <strong>{format(report.totals.exactExpressions)}</strong>
          <span>Computed exact phrases</span>
        </div>
        <div className={styles.analyticsKpi}>
          <strong>{format(report.totals.exactSpans)}</strong>
          <span>Computed word-span occurrences</span>
        </div>
      </div>

      <div className={styles.analyticsColumns}>
        <section className={styles.analyticsPanel} aria-label="Surah distribution">
          <div className={styles.panelHeading}>
            <h2>Surah distribution</h2>
            <p>
              Curated counts are distinct link IDs touching a surah; computed counts are exact
              phrase spans. Per-100-ayah rates normalize for surah length.
            </p>
          </div>
          <div className={styles.analyticsControls}>
            <label className={styles.field}>
              <span>Evidence metric</span>
              <select
                aria-label="Analytics evidence metric"
                value={metric}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === 'curated' || next === 'computed') setMetric(next);
                }}
              >
                <option value="curated">Curated link incidences</option>
                <option value="computed">Computed word-span occurrences</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Measure</span>
              <select
                aria-label="Analytics measure"
                value={unit}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === 'count' || next === 'per100') setUnit(next);
                }}
              >
                <option value="per100">Per 100 ayahs</option>
                <option value="count">Total count</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Order</span>
              <select
                aria-label="Analytics order"
                value={order}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === 'canonical' || next === 'density') setOrder(next);
                }}
              >
                <option value="density">Highest first</option>
                <option value="canonical">Quran order</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Find surah</span>
              <input
                aria-label="Filter analytics by surah"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Name or number"
              />
            </label>
          </div>
          <p className={styles.analyticsHint} role="status">
            {rows.length} surahs · {metric === 'curated' ? 'Curated links' : 'Computed word spans'}{' '}
            · {unit === 'per100' ? 'per 100 ayahs' : 'raw count'}
          </p>
          <div className={styles.analyticsBars} role="group" aria-label="Interactive surah bars">
            {rows.map((row) => {
              const value = metricValue(row, metric, unit);
              const name = getSurah(row.surah).name;
              const first = metric === 'curated' ? row.firstCuratedAyah : row.firstExactAyah;
              const firstAyah = first ?? CANONICAL_QURAN.surahRange(row.surah).start;
              return (
                <button
                  key={row.surah}
                  type="button"
                  className={styles.analyticsBarButton}
                  data-selected={row.surah === selectedSurah ? 'true' : 'false'}
                  aria-label={
                    'Explore ' +
                    name +
                    ' ' +
                    (metric === 'curated' ? 'curated' : 'computed') +
                    ' evidence'
                  }
                  onClick={() => {
                    onOpenSurah(row.surah, metric, firstAyah);
                  }}
                >
                  <span className={styles.analyticsBarName}>
                    {row.surah}. {name}
                  </span>
                  <span className={styles.analyticsBarTrack}>
                    <span
                      className={
                        metric === 'curated'
                          ? styles.analyticsCuratedFill
                          : styles.analyticsExactFill
                      }
                      style={{ width: String((value / maxValue) * 100) + '%' }}
                    />
                  </span>
                  <span className={styles.analyticsBarValue}>{format(value)}</span>
                </button>
              );
            })}
            {rows.length === 0 && <p className={styles.empty}>No surahs match this search.</p>}
          </div>
        </section>

        <div className={styles.analyticsSidePanels}>
          <section className={styles.analyticsPanel} aria-label="Evidence breakdown">
            <div className={styles.panelHeading}>
              <h2>Within vs. across surahs</h2>
              <p>
                Each curated link is classified once. Each computed expression is classified by
                where its recorded spans occur.
              </p>
            </div>
            <div className={styles.analyticsBreakdown}>
              <div>
                <h3>Curated passage links</h3>
                <div
                  className={styles.analyticsStack}
                  role="img"
                  aria-label={
                    String(curatedWithin) +
                    ' within-surah curated links and ' +
                    String(curatedAcross) +
                    ' cross-surah curated links'
                  }
                >
                  <span
                    style={{ width: evidencePercent(curatedWithin, report.totals.curatedLinks) }}
                  />
                  <span
                    style={{ width: evidencePercent(curatedAcross, report.totals.curatedLinks) }}
                  />
                </div>
                <p>
                  {format(curatedWithin)} within · {format(curatedAcross)} across
                </p>
              </div>
              <div>
                <h3>Computed exact phrases</h3>
                <div
                  className={styles.analyticsStack}
                  role="img"
                  aria-label={
                    String(exactWithin) +
                    ' within-surah computed phrases and ' +
                    String(exactAcross) +
                    ' cross-surah computed phrases'
                  }
                >
                  <span
                    style={{ width: evidencePercent(exactWithin, report.totals.exactExpressions) }}
                  />
                  <span
                    style={{ width: evidencePercent(exactAcross, report.totals.exactExpressions) }}
                  />
                </div>
                <p>
                  {format(exactWithin)} within · {format(exactAcross)} across
                </p>
              </div>
            </div>
          </section>
          <section className={styles.analyticsPanel} aria-label="Repeated Arabic phrase rankings">
            <div className={styles.panelHeading}>
              <h2>Most repeated exact phrases</h2>
              <p>
                Ranked by recorded word-span occurrences, not importance or semantic similarity.
                Select a phrase to inspect every source location.
              </p>
            </div>
            <ol className={styles.analyticsPhraseList}>
              {report.topExpressions.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-label={'Explore ranked Arabic phrase ' + String(index + 1)}
                    onClick={() => {
                      onOpenExpression(item.id, item.firstAyah);
                    }}
                  >
                    <span className={styles.analyticsPhraseRank}>#{index + 1}</span>
                    <span className={styles.analyticsPhraseDetail}>
                      <span lang="ar" dir="rtl" className={styles.expressionArabic}>
                        {item.words.join(' ')}
                      </span>
                      <small>
                        {format(item.spanCount)} spans · {format(item.distinctAyahCount)} ayahs ·{' '}
                        {format(item.surahCount)} surahs
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
      <p className={styles.analyticsFootnote}>
        Dataset classes are not interchangeable. A curated link touching two surahs contributes once
        to each surah's incidence count, but only once to the global total. The computed counts are
        strictly orthographic 3–8-word matches, not roots, lemmas, or interpretation.
      </p>
    </section>
  );
}
