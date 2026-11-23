import { useMemo, useState } from 'react';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import {
  computeThemeLanguage,
  rankThemeLanguage,
  themeLanguageSurahs,
  type ThemeLanguageDirection,
  type ThemeLanguageFeature,
  type ThemeLanguageKind,
} from '../core/quran/theme-language.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { getSurah } from '../core/quran/surahs.ts';
import type { QuranThemeIndex } from '../core/quran/theme-index.ts';
import type { QacMorphologyIndex } from '../core/quran/qac-index.ts';
import type { QuranExpressionIndex } from '../core/quran/expression-browser.ts';
import type { AyahEvidenceLoad } from './QuranAyahEvidence.tsx';
import type { QuranReaderData } from './model.ts';
import styles from './QuranApp.module.css';

const PAGE_SIZE = 12;

interface Props {
  readonly themes: QuranThemeIndex;
  readonly data: QuranReaderData;
  readonly selectedTheme: string | null;
  readonly kind: ThemeLanguageKind;
  readonly featureId: string | null;
  readonly morphology: AyahEvidenceLoad<QacMorphologyIndex>;
  readonly expressions: AyahEvidenceLoad<QuranExpressionIndex>;
  readonly onTheme: (name: string) => void;
  readonly onKind: (kind: ThemeLanguageKind) => void;
  readonly onFeature: (id: string) => void;
  readonly onOpenSource: (feature: ThemeLanguageFeature, ayah: number) => void;
  readonly onOpenAyah: (ayah: number) => void;
  readonly onBack: () => void;
  readonly onRetry: () => void;
}

function percent(ratio: number): string {
  return (ratio * 100).toFixed(1) + '%';
}

function points(difference: number): string {
  return (difference > 0 ? '+' : '') + difference.toFixed(1) + ' pp';
}

function FeaturePreview({
  feature,
  kind,
}: {
  readonly feature: ThemeLanguageFeature;
  readonly kind: ThemeLanguageKind;
}) {
  return (
    <span
      lang="ar"
      dir="rtl"
      className={kind === 'exact' ? styles.themeLanguagePhrase : styles.themeLanguageArabic}
    >
      {feature.label}
    </span>
  );
}

export function QuranThemeLanguage({
  themes,
  data,
  selectedTheme,
  kind,
  featureId,
  morphology,
  expressions,
  onTheme,
  onKind,
  onFeature,
  onOpenSource,
  onOpenAyah,
  onBack,
  onRetry,
}: Props) {
  const [direction, setDirection] = useState<ThemeLanguageDirection>('enriched');
  const [search, setSearch] = useState('');
  const [featurePage, setFeaturePage] = useState({ key: '', index: 0 });
  const [versePage, setVersePage] = useState({ key: '', index: 0 });
  const [surah, setSurah] = useState(0);
  const [sample, setSample] = useState<'theme' | 'outside'>('theme');
  const [showAllSurahs, setShowAllSurahs] = useState(false);
  const sortedThemes = useMemo(() => themes.rankedTags(), [themes]);
  const selected = (selectedTheme && themes.find(selectedTheme)) || sortedThemes[0] || null;
  const source = kind === 'exact' ? expressions : morphology;
  const report = useMemo(() => {
    if (!selected) return null;
    if (kind === 'exact') {
      return expressions.status === 'ready'
        ? computeThemeLanguage(themes, selected.name, { kind, index: expressions.index })
        : null;
    }
    return morphology.status === 'ready'
      ? computeThemeLanguage(themes, selected.name, { kind, index: morphology.index })
      : null;
  }, [themes, selected?.name, kind, morphology, expressions]);
  const ranked = useMemo(
    () => report === null ? [] : rankThemeLanguage(report, direction, search),
    [report, direction, search],
  );
  const rankingKey = (selected?.name ?? '') + ':' + kind + ':' + direction + ':' + search;
  const totalFeaturePages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const currentFeaturePage =
    featurePage.key === rankingKey ? Math.min(featurePage.index, totalFeaturePages - 1) : 0;
  const visibleFeatures = ranked.slice(
    currentFeaturePage * PAGE_SIZE,
    (currentFeaturePage + 1) * PAGE_SIZE,
  );
  const chosen =
    (featureId !== null ? report?.features.find((feature) => feature.id === featureId) : null) ??
    ranked[0] ??
    null;
  const allSurahs = useMemo(
    () => report && chosen ? themeLanguageSurahs(report, chosen) : [],
    [report, chosen],
  );
  const occupiedSurahs = [...allSurahs]
    .filter((item) => item.theme > 0 || item.featureOutside > 0)
    .sort((a, b) => b.both - a.both || b.theme - a.theme || a.surah - b.surah);
  const listedSurahs = showAllSurahs ? occupiedSurahs : occupiedSurahs.slice(0, 12);
  const exampleScope = sample === 'outside' || (chosen?.themeAyahs.length === 0);
  const sourceAyahs = exampleScope ? chosen?.outsideAyahs ?? [] : chosen?.themeAyahs ?? [];
  const matchingAyahs = sourceAyahs.filter(
    (ayah) => surah === 0 || CANONICAL_QURAN.refAt(ayah).surah === surah,
  );
  const versesKey =
    (selected?.name ?? '') + ':' + kind + ':' + (chosen?.id ?? '') + ':' +
    (exampleScope ? 'outside' : 'theme') + ':' + surah;
  const versePages = Math.max(1, Math.ceil(matchingAyahs.length / PAGE_SIZE));
  const currentVersePage =
    versePage.key === versesKey ? Math.min(versePage.index, versePages - 1) : 0;
  const visibleAyahs = matchingAyahs.slice(
    currentVersePage * PAGE_SIZE,
    (currentVersePage + 1) * PAGE_SIZE,
  );

  return (
    <section className={styles.themeLanguageExplorer} aria-label="Quran thematic linguistic patterns">
      <header className={styles.analyticsIntro}>
        <p className={styles.eyebrow}>Phase 2E.2 · Exploratory language analytics</p>
        <h1>Language patterns across Quran themes</h1>
        <p>
          Compare original QAC root or lemma annotations, or computed exact Arabic phrases, in
          QSAC-tagged ayahs against all other Quran ayahs. Each feature is counted at most once per
          ayah. This is descriptive co-occurrence, not semantic similarity, tafsir, statistical
          significance, causation or agreement between annotators.
        </p>
        <p className={styles.themesCredit}>
          QSAC © 2026 Ahmad Bilal, CC BY 4.0, uses LLM-assisted and human-reviewed research
          annotations. QAC v0.4 is separately licensed linguistic data; exact phrases use the
          independently verified Tanzil edition. The original notices remain in their respective
          source views.
        </p>
        <button type="button" className={styles.themeLanguageBack} onClick={onBack}>
          ← Back to QSAC topic explorer
        </button>
      </header>
      <section className={styles.analyticsPanel} aria-label="Language discovery controls">
        <div className={styles.themeLanguageControls}>
          <label className={styles.field}>
            <span>Experimental QSAC topic</span>
            <select
              aria-label="Linguistic analysis theme"
              value={selected?.name ?? ''}
              onChange={(event) => {
                onTheme(event.target.value);
                setSurah(0);
              }}
            >
              {sortedThemes.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name} ({tag.count})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Linguistic feature source</span>
            <select
              aria-label="Linguistic feature type"
              value={kind}
              onChange={(event) => {
                const next = event.target.value;
                if (next === 'root' || next === 'lemma' || next === 'exact') onKind(next);
              }}
            >
              <option value="root">QAC Arabic roots</option>
              <option value="lemma">QAC Arabic lemmas</option>
              <option value="exact">Computed exact Arabic phrases</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Compare</span>
            <select
              aria-label="Pattern direction"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value === 'depleted' ? 'depleted' : 'enriched');
              }}
            >
              <option value="enriched">More frequent in tagged ayahs</option>
              <option value="depleted">More frequent outside tagged ayahs</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Filter Arabic or source ID</span>
            <input
              type="search"
              aria-label="Search linguistic feature"
              value={search}
              placeholder="رحم or rHm"
              onChange={(event) => { setSearch(event.target.value); }}
            />
          </label>
        </div>
        {selected && (
          <p className={styles.themeLanguageDenominator}>
            <strong>{selected.name}</strong> · {selected.count.toLocaleString('en')} QSAC-labeled
            ayahs versus {(CANONICAL_QURAN.ayahCount - selected.count).toLocaleString('en')}
            ayahs without that QSAC tag. Not tagged does not mean the topic is absent.
          </p>
        )}
        {source.status === 'loading' || source.status === 'idle' ? (
          <p role="status" className={styles.themeLanguageNotice}>
            Verifying optional {kind === 'exact' ? 'exact Arabic expression' : 'QAC morphology'} source
            and original publication hashes…
          </p>
        ) : source.status === 'error' ? (
          <div role="alert" className={styles.themeLanguageNotice}>
            <p>Independent source verification failed: {source.message}</p>
            <button type="button" className={styles.goButton} onClick={onRetry}>
              Retry linguistic data
            </button>
          </div>
        ) : null}
      </section>
      {report && (
        <div className={styles.themeLanguageColumns}>
          <section className={styles.analyticsPanel} aria-label="Linguistic feature comparisons">
            <div className={styles.panelHeading}>
              <h2>Comparative feature frequencies</h2>
              <p>
                Percentage-point difference = percentage of tagged ayahs containing the feature
                minus percentage of untagged ayahs containing it. Each denominator counts ayahs,
                never word tokens or raw source rows.
              </p>
              <p>
                {direction === 'enriched'
                  ? 'Show features present in at least 2 tagged ayahs and 3 ayahs overall.'
                  : 'Show features present in at least 12 untagged ayahs.'}
                {' '}Small groups and selected categories may produce unstable extremes.
              </p>
            </div>
            <p className={styles.topologyCaption} role="status">
              {ranked.length} eligible features · Page {currentFeaturePage + 1} of {totalFeaturePages}
            </p>
            <div className={styles.themeLanguageFeatureList}>
              {visibleFeatures.map((feature) => (
                <button
                  type="button"
                  key={feature.id}
                  className={styles.themeLanguageFeature}
                  aria-pressed={chosen?.id === feature.id}
                  onClick={() => {
                    onFeature(feature.id);
                    setSurah(0);
                  }}
                >
                  <span className={styles.themeLanguageFeatureHeading}>
                    <FeaturePreview feature={feature} kind={kind} />
                    <strong>{points(feature.percentagePointDifference)}</strong>
                  </span>
                  <small>
                    Tagged: {feature.themeAyahs.length}/{report.themeSize} ({percent(feature.themeRate)})
                    {' · '}Untagged: {feature.outsideAyahs.length}/{report.outsideSize}
                    {' '}({percent(feature.outsideRate)})
                  </small>
                </button>
              ))}
              {visibleFeatures.length === 0 && (
                <p className={styles.empty}>
                  No features meet the descriptive support threshold and search filter.
                  Adjust the filter or choose another topic.
                </p>
              )}
            </div>
            <div className={styles.topologyPager}>
              <button
                type="button"
                disabled={currentFeaturePage === 0}
                onClick={() => { setFeaturePage({ key: rankingKey, index: currentFeaturePage - 1 }); }}
              >
                Previous features
              </button>
              <span>{currentFeaturePage + 1} / {totalFeaturePages}</span>
              <button
                type="button"
                disabled={currentFeaturePage + 1 >= totalFeaturePages}
                onClick={() => { setFeaturePage({ key: rankingKey, index: currentFeaturePage + 1 }); }}
              >
                Next features
              </button>
            </div>
          </section>
          <div className={styles.themeLanguageDetails}>
            {chosen ? (
              <>
                <section className={styles.analyticsPanel} aria-label="Selected linguistic pattern">
                  <div className={styles.panelHeading}>
                    <p className={styles.eyebrow}>
                      {kind === 'root' ? 'QAC root' : kind === 'lemma' ? 'QAC lemma' : 'Exact orthographic phrase'}
                    </p>
                    <h2><FeaturePreview feature={chosen} kind={kind} /></h2>
                    <p>Original feature ID: <code>{chosen.id}</code></p>
                  </div>
                  <div className={styles.themeLanguageRateGrid}>
                    <div>
                      <strong>{percent(chosen.themeRate)}</strong>
                      <span>{chosen.themeAyahs.length} of {report.themeSize} tagged ayahs</span>
                    </div>
                    <div>
                      <strong>{percent(chosen.outsideRate)}</strong>
                      <span>{chosen.outsideAyahs.length} of {report.outsideSize} untagged ayahs</span>
                    </div>
                    <div>
                      <strong>{points(chosen.percentagePointDifference)}</strong>
                      <span>Descriptive rate difference</span>
                    </div>
                  </div>
                  <p className={styles.themeLanguageNotice}>
                    Rates describe source annotations, not the probability that a passage
                    expresses this theme. No p-values, confidence claims or automatic semantic
                    cross-reference edges are generated.
                  </p>
                  <button
                    type="button"
                    className={styles.themeLanguageBack}
                    onClick={() => {
                      const position = chosen.themeAyahs[0] ?? chosen.outsideAyahs[0];
                      if (position !== undefined) onOpenSource(chosen, position);
                    }}
                  >
                    Open original {kind === 'exact' ? 'exact phrase' : 'QAC morphology'} evidence
                  </button>
                </section>
                <section className={styles.analyticsPanel} aria-label="Surah language distribution">
                  <div className={styles.panelHeading}>
                    <h2>Surah-aware overlap</h2>
                    <p>
                      Each line shows ayahs bearing both the QSAC topic label and the feature,
                      compared with ayahs not bearing that QSAC label in the same surah. These
                      numbers are not a significance test and do not control for verse length.
                    </p>
                  </div>
                  <div className={styles.themeLanguageSurahs}>
                    {listedSurahs.map((row) => (
                      <button
                        type="button"
                        key={row.surah}
                        aria-pressed={surah === row.surah}
                        onClick={() => { setSurah(row.surah === surah ? 0 : row.surah); }}
                      >
                        <strong>{getSurah(row.surah).name} · {row.surah}</strong>
                        <span>
                          Tagged {row.both}/{row.theme} · Untagged {row.featureOutside}/{row.outside}
                        </span>
                        <span className={styles.themeLanguageBars} aria-hidden="true">
                          <span style={{ width: percent(row.theme === 0 ? 0 : row.both / row.theme) }} />
                          <span style={{ width: percent(row.outside === 0 ? 0 : row.featureOutside / row.outside) }} />
                        </span>
                      </button>
                    ))}
                    {occupiedSurahs.length > 12 && (
                      <button
                        type="button"
                        className={styles.themeLanguageMore}
                        onClick={() => { setShowAllSurahs(!showAllSurahs); }}
                      >
                        {showAllSurahs ? 'Show first 12 surahs' : 'Show all ' + occupiedSurahs.length + ' represented surahs'}
                      </button>
                    )}
                  </div>
                </section>
                <section className={styles.analyticsPanel} aria-label="Theme and language co-occurrence verses">
                  <div className={styles.panelHeading}>
                    <h2>Original ayah evidence</h2>
                    <p>
                      Read the canonical Arabic and separately sourced English for each hit.
                      Only the source annotations establish membership in this list.
                    </p>
                  </div>
                  <div className={styles.themeLanguageSampleControls}>
                    <label className={styles.field}>
                      <span>Source membership</span>
                      <select
                        aria-label="Linguistic evidence membership"
                        value={exampleScope ? 'outside' : 'theme'}
                        onChange={(event) => {
                          setSample(event.target.value === 'outside' ? 'outside' : 'theme');
                        }}
                      >
                        <option value="theme" disabled={chosen.themeAyahs.length === 0}>
                          Tagged ayahs with feature ({chosen.themeAyahs.length})
                        </option>
                        <option value="outside">
                          Untagged ayahs with feature ({chosen.outsideAyahs.length})
                        </option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Surah filter</span>
                      <select
                        aria-label="Linguistic evidence surah"
                        value={surah}
                        onChange={(event) => { setSurah(Number(event.target.value)); }}
                      >
                        <option value={0}>All surahs</option>
                        {occupiedSurahs.map((row) => (
                          <option value={row.surah} key={row.surah}>
                            {row.surah}. {getSurah(row.surah).name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className={styles.topologyCaption} role="status">
                    {matchingAyahs.length} matching {exampleScope ? 'untagged' : 'tagged'} ayahs ·
                    Page {currentVersePage + 1} of {versePages}
                  </p>
                  <div className={styles.themeLanguageVerses}>
                    {visibleAyahs.map((ayah) => {
                      const ref = CANONICAL_QURAN.refAt(ayah);
                      return (
                        <button
                          type="button"
                          key={ayah}
                          aria-label={'Read linguistic evidence at Quran ayah ' + formatAyahId(ref)}
                          onClick={() => { onOpenAyah(ayah); }}
                        >
                          <strong>{getSurah(ref.surah).name} · {formatAyahId(ref)}</strong>
                          <span lang="ar" dir="rtl">{data.text.arabic[ayah]}</span>
                          <small lang="en" dir="ltr">{data.text.english[ayah]}</small>
                        </button>
                      );
                    })}
                    {visibleAyahs.length === 0 && (
                      <p className={styles.empty}>No feature occurrences in this surah and source subset.</p>
                    )}
                  </div>
                  <div className={styles.topologyPager}>
                    <button
                      type="button"
                      disabled={currentVersePage === 0}
                      onClick={() => { setVersePage({ key: versesKey, index: currentVersePage - 1 }); }}
                    >
                      Previous evidence ayahs
                    </button>
                    <span>{currentVersePage + 1} / {versePages}</span>
                    <button
                      type="button"
                      disabled={currentVersePage + 1 >= versePages}
                      onClick={() => { setVersePage({ key: versesKey, index: currentVersePage + 1 }); }}
                    >
                      Next evidence ayahs
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <section className={styles.analyticsPanel}>
                <p className={styles.empty}>No eligible feature is selected. Try another QSAC topic or source.</p>
              </section>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
