import { useMemo, useState } from 'react';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { getSurah } from '../core/quran/surahs.ts';
import type { QuranThemeIndex } from '../core/quran/theme-index.ts';
import {
  QSAC_CATEGORY_COUNT,
  QSAC_DOMAIN_COUNT,
  QSAC_PAGE_SIZE,
  type QuranThemeTag,
} from '../core/quran/theme-types.ts';
import type { QuranReaderData } from './model.ts';
import styles from './QuranApp.module.css';

interface Props {
  readonly index: QuranThemeIndex;
  readonly data: QuranReaderData;
  readonly selectedName: string | null;
  readonly focusSurah: number;
  readonly onSelect: (name: string) => void;
  readonly onOpenAyah: (ayah: number) => void;
}

export function QuranThemes({
  index,
  data,
  selectedName,
  focusSurah,
  onSelect,
  onOpenAyah,
}: Props) {
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState('');
  const [catalogPage, setCatalogPage] = useState(0);
  const [occurrencePage, setOccurrencePage] = useState(0);
  const [pageTag, setPageTag] = useState('');
  const [scope, setScope] = useState<'all' | 'surah'>('all');
  const sorted = useMemo(() => index.rankedTags(), [index]);
  const domains = useMemo(() => [...new Set(sorted.map((tag) => tag.domain))].sort(), [sorted]);
  const categories = useMemo(
    () =>
      [
        ...new Set(
          sorted.filter((tag) => domain === '' || tag.domain === domain).map((tag) => tag.category),
        ),
      ].sort(),
    [sorted, domain],
  );
  const available = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en');
    return sorted.filter(
      (tag) =>
        (domain === '' || tag.domain === domain) &&
        (category === '' || tag.category === category) &&
        (query === '' ||
          tag.name.toLocaleLowerCase('en').includes(query) ||
          tag.description.toLocaleLowerCase('en').includes(query)),
    );
  }, [sorted, search, domain, category]);
  const catalogPages = Math.max(1, Math.ceil(available.length / QSAC_PAGE_SIZE));
  const currentCatalog = Math.min(catalogPage, catalogPages - 1);
  const listed = available.slice(
    currentCatalog * QSAC_PAGE_SIZE,
    (currentCatalog + 1) * QSAC_PAGE_SIZE,
  );
  const selected = (selectedName ? index.find(selectedName) : null) ?? sorted[0] ?? null;
  const rawHits = selected ? index.occurrences(selected.name) : [];
  const hits =
    scope === 'all'
      ? rawHits
      : rawHits.filter((ayah) => CANONICAL_QURAN.refAt(ayah).surah === focusSurah);
  const occurrencePages = Math.max(1, Math.ceil(hits.length / QSAC_PAGE_SIZE));
  const currentOccurrence =
    pageTag === (selected?.name ?? '') ? Math.min(occurrencePage, occurrencePages - 1) : 0;
  const visibleHits = hits.slice(
    currentOccurrence * QSAC_PAGE_SIZE,
    (currentOccurrence + 1) * QSAC_PAGE_SIZE,
  );
  const frequencies = selected
    ? [...index.frequencyBySurah(selected.name)]
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count || a.surah - b.surah)
        .slice(0, 12)
    : [];
  const maxFrequency = Math.max(1, ...frequencies.map((row) => row.count));
  const handleSelect = (tag: QuranThemeTag) => {
    setOccurrencePage(0);
    setPageTag(tag.name);
    onSelect(tag.name);
  };

  return (
    <section className={styles.themesDashboard} aria-label="External Quran thematic annotations">
      <header className={styles.analyticsIntro}>
        <p className={styles.eyebrow}>Phase 2D.1 · Experimental external source</p>
        <h1>Thematic exploration across the Quran</h1>
        <p>
          Explore {QSAC_DOMAIN_COUNT} ontology domains, {QSAC_CATEGORY_COUNT} categories and{' '}
          {index.dataset.tags.length} topic labels across{' '}
          {index.dataset.ayahs.length.toLocaleString('en')} ayahs. This is an external LLM-assisted,
          human-reviewed annotation dataset, not authoritative tafsir, a curated cross-reference or
          proof that two verses share a meaning.
        </p>
        <p className={styles.themesCredit}>
          QSAC © 2026 Ahmad Bilal, CC BY 4.0. Only topic assignments and their ontology are
          reproduced here. Quran text is from the existing separately attributed reader.
          <a
            href="https://github.com/dev-ahmadbilal/quran-semantic-annotation-corpus"
            target="_blank"
            rel="noreferrer"
          >
            Source and annotation methodology
          </a>
        </p>
      </header>

      <div className={styles.themesColumns}>
        <section className={styles.analyticsPanel} aria-label="Theme catalog">
          <div className={styles.panelHeading}>
            <h2>Browse topics</h2>
            <p>Independent topic labels. Select one to inspect its cited ayah positions.</p>
          </div>
          <div className={styles.themesFilters}>
            <label className={styles.field}>
              <span>Domain</span>
              <select
                aria-label="Theme domain"
                value={domain}
                onChange={(event) => {
                  setDomain(event.target.value);
                  setCategory('');
                  setCatalogPage(0);
                }}
              >
                <option value="">All 18 domains</option>
                {domains.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Category</span>
              <select
                aria-label="Theme category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setCatalogPage(0);
                }}
              >
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Search annotations</span>
              <input
                type="search"
                aria-label="Search Quran topics"
                value={search}
                placeholder="Mercy, justice, prayer…"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCatalogPage(0);
                }}
              />
            </label>
          </div>
          <p className={styles.topologyCaption} role="status">
            {available.length} matching topics · Page {currentCatalog + 1} of {catalogPages}
          </p>
          <div className={styles.themesCatalog}>
            {listed.map((tag) => (
              <button
                type="button"
                key={tag.name}
                aria-pressed={selected?.name === tag.name}
                onClick={() => { handleSelect(tag); }}
              >
                <strong>{tag.name}</strong>
                <span>{tag.category}</span>
                <small>{tag.count.toLocaleString('en')} labeled ayahs</small>
              </button>
            ))}
            {listed.length === 0 && (
              <p className={styles.empty}>No annotations match this search.</p>
            )}
          </div>
          <div className={styles.topologyPager}>
            <button
              type="button"
              disabled={currentCatalog === 0}
              onClick={() => { setCatalogPage(currentCatalog - 1); }}
            >
              Previous topics
            </button>
            <span>
              {currentCatalog + 1} / {catalogPages}
            </span>
            <button
              type="button"
              disabled={currentCatalog + 1 >= catalogPages}
              onClick={() => { setCatalogPage(currentCatalog + 1); }}
            >
              Next topics
            </button>
          </div>
        </section>

        <div className={styles.themesDetails}>
          {selected && (
            <section className={styles.analyticsPanel} aria-label="Selected thematic annotation">
              <div className={styles.panelHeading}>
                <p className={styles.eyebrow}>Experimental topic label</p>
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
                <p>
                  {selected.domain} · {selected.category}
                </p>
                <p>{selected.count.toLocaleString('en')} labeled ayahs in the full source.</p>
              </div>
              <div className={styles.themesFilters}>
                <label className={styles.field}>
                  <span>Verse scope</span>
                  <select
                    aria-label="Theme verse scope"
                    value={scope}
                    onChange={(event) => {
                      setScope(event.target.value === 'surah' ? 'surah' : 'all');
                      setOccurrencePage(0);
                    }}
                  >
                    <option value="all">All Quran</option>
                    <option value="surah">Current surah: {getSurah(focusSurah).name}</option>
                  </select>
                </label>
              </div>
              <p className={styles.topologyCaption} role="status">
                {hits.length} attributed ayah matches · Page {currentOccurrence + 1} of{' '}
                {occurrencePages}
              </p>
              <div className={styles.themesOccurrences} aria-label="Theme tagged Quran verses">
                {visibleHits.map((ayah) => {
                  const reference = CANONICAL_QURAN.refAt(ayah);
                  return (
                    <button
                      key={ayah}
                      type="button"
                      aria-label={'Read tagged Quran ayah ' + formatAyahId(reference)}
                      onClick={() => { onOpenAyah(ayah); }}
                    >
                      <strong>
                        {getSurah(reference.surah).name} · {formatAyahId(reference)}
                      </strong>
                      <span>{data.text.english[ayah]}</span>
                      <small>Open in bilingual reader</small>
                    </button>
                  );
                })}
                {visibleHits.length === 0 && (
                  <p className={styles.empty}>No verses with this label in the selected surah.</p>
                )}
              </div>
              <div className={styles.topologyPager}>
                <button
                  type="button"
                  disabled={currentOccurrence === 0}
                  onClick={() => {
                    setPageTag(selected.name);
                    setOccurrencePage(currentOccurrence - 1);
                  }}
                >
                  Previous labeled verses
                </button>
                <span>
                  {currentOccurrence + 1} / {occurrencePages}
                </span>
                <button
                  type="button"
                  disabled={currentOccurrence + 1 >= occurrencePages}
                  onClick={() => {
                    setPageTag(selected.name);
                    setOccurrencePage(currentOccurrence + 1);
                  }}
                >
                  Next labeled verses
                </button>
              </div>
            </section>
          )}
          {selected && (
            <section className={styles.analyticsPanel} aria-label="Theme distribution by surah">
              <div className={styles.panelHeading}>
                <h2>Where this tag appears</h2>
                <p>
                  Top twelve surahs by number of assigned ayah labels, not normalized similarity
                  scores.
                </p>
              </div>
              <div className={styles.themesDistribution}>
                {frequencies.map((row) => (
                  <div key={row.surah} className={styles.themesDistributionRow}>
                    <span>
                      {row.surah}. {getSurah(row.surah).name}
                    </span>
                    <span className={styles.analyticsBarTrack}>
                      <span
                        className={styles.analyticsCuratedFill}
                        style={{ width: String((row.count / maxFrequency) * 100) + '%' }}
                      />
                    </span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
                {frequencies.length === 0 && (
                  <p className={styles.empty}>
                    This topic is in the ontology but has no verse assignments.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
      <p className={styles.analyticsFootnote}>
        This explorer groups externally assigned labels. Shared topic labels are not evidence of a
        direct cross-reference, and may reflect annotation errors or differing interpretation.
        Always check the original ayahs and consult tafsir independently.
      </p>
    </section>
  );
}
