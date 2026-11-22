import { useMemo, useState } from 'react';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { getSurah } from '../core/quran/surahs.ts';
import type { QuranRelationshipIndex } from '../core/quran/relationship-index.ts';
import {
  curatedLinkLabel,
  curatedNeighborhood,
  topologyNeighbors,
  TOPOLOGY_EVIDENCE_PAGE_SIZE,
  TOPOLOGY_FIRST_HOP_LIMIT,
  TOPOLOGY_SECOND_HOP_LIMIT,
  TOPOLOGY_SURAH_PAGE_SIZE,
  type QuranNeighborhoodEdge,
  type QuranTopologyDataset,
  type TopologyDirection,
} from './topology-model.ts';
import styles from './QuranApp.module.css';

interface QuranTopologyProps {
  readonly report: QuranTopologyDataset;
  readonly relationships: QuranRelationshipIndex;
  readonly focus: number;
  readonly direction: TopologyDirection;
  readonly mode: 'surah' | 'ayah';
  readonly depth: 1 | 2;
  readonly onDirection: (direction: TopologyDirection) => void;
  readonly onMode: (mode: 'surah' | 'ayah') => void;
  readonly onDepth: (depth: 1 | 2) => void;
  readonly onFocusSurah: (surah: number) => void;
  readonly onFocusAyah: (ayah: number) => void;
  readonly onOpenLink: (linkId: number) => void;
  readonly onReadAyah: (ayah: number) => void;
  readonly onOpenExact: () => void;
  readonly surahHref: (surah: number) => string;
  readonly ayahHref: (ayah: number) => string;
}

interface Position {
  readonly x: number;
  readonly y: number;
}

const CENTER: Position = { x: 380, y: 236 };

function coordinate(index: number, length: number, radius: number): Position {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(length, 1);
  return {
    x: CENTER.x + radius * Math.cos(angle),
    y: CENTER.y + radius * Math.sin(angle),
  };
}

function point(positions: ReadonlyMap<number, Position>, key: number): Position {
  return positions.get(key) ?? CENTER;
}

function label(ayah: number): string {
  return formatAyahId(CANONICAL_QURAN.refAt(ayah));
}

function smallNumber(value: number): string {
  return value.toLocaleString('en');
}

export function QuranTopology({
  report,
  relationships,
  focus,
  direction,
  mode,
  depth,
  onDirection,
  onMode,
  onDepth,
  onFocusSurah,
  onFocusAyah,
  onOpenLink,
  onReadAyah,
  onOpenExact,
  surahHref,
  ayahHref,
}: QuranTopologyProps) {
  const surah = CANONICAL_QURAN.refAt(focus).surah;
  const [minimum, setMinimum] = useState(1);
  const [surahPage, setSurahPage] = useState(0);
  const [ayahPage, setAyahPage] = useState(0);
  const [selectedPartner, setSelectedPartner] = useState<number | null>(null);
  const [evidencePage, setEvidencePage] = useState(0);
  const neighbors = useMemo(
    () => topologyNeighbors(report, surah, direction, minimum),
    [report, surah, direction, minimum],
  );
  const surahPages = Math.max(1, Math.ceil(neighbors.length / TOPOLOGY_SURAH_PAGE_SIZE));
  const currentSurahPage = Math.min(surahPage, surahPages - 1);
  const displayed = neighbors.slice(
    currentSurahPage * TOPOLOGY_SURAH_PAGE_SIZE,
    (currentSurahPage + 1) * TOPOLOGY_SURAH_PAGE_SIZE,
  );
  const partner = neighbors.find((candidate) => candidate.surah === selectedPartner) ?? displayed[0] ?? null;
  const partnerPages = Math.max(
    1,
    Math.ceil((partner?.ids.length ?? 0) / TOPOLOGY_EVIDENCE_PAGE_SIZE),
  );
  const currentEvidencePage = Math.min(evidencePage, partnerPages - 1);
  const partnerIds =
    partner?.ids.slice(
      currentEvidencePage * TOPOLOGY_EVIDENCE_PAGE_SIZE,
      (currentEvidencePage + 1) * TOPOLOGY_EVIDENCE_PAGE_SIZE,
    ) ?? [];

  const neighborhood = useMemo(
    () => curatedNeighborhood(relationships, focus, direction, depth, ayahPage),
    [relationships, focus, direction, depth, ayahPage],
  );
  const currentAyahPage = Math.min(ayahPage, neighborhood.pages - 1);
  const shownNeighborhood =
    currentAyahPage === ayahPage
      ? neighborhood
      : curatedNeighborhood(relationships, focus, direction, depth, currentAyahPage);
  const firstNodes = [...new Set(shownNeighborhood.first.map((edge) => edge.neighbor))];
  const secondNodes = [
    ...new Set(shownNeighborhood.second.map((edge) => edge.neighbor)),
  ].filter((node) => node !== focus && !firstNodes.includes(node));
  const positions = new Map<number, Position>([[focus, CENTER]]);
  for (const [position, ayah] of firstNodes.entries()) {
    positions.set(ayah, coordinate(position, firstNodes.length, 134));
  }
  for (const [position, ayah] of secondNodes.entries()) {
    positions.set(ayah, coordinate(position, secondNodes.length, 220));
  }
  const partnersWithPositions = displayed.map((entry, position) => ({
    ...entry,
    point: coordinate(position, displayed.length, 175),
  }));
  const focusSurahRow = report.surahs[surah - 1];

  const selectPartner = (next: number) => {
    setSelectedPartner(next);
    setEvidencePage(0);
  };

  const renderAyahLink = (ayah: number, key: string, outer: boolean) => {
    const location = point(positions, ayah);
    return (
      <a
        key={key}
        href={ayahHref(ayah)}
        aria-label={'Focus neighborhood on ' + label(ayah)}
        onClick={(event) => {
          event.preventDefault();
          setAyahPage(0);
          onFocusAyah(ayah);
        }}
      >
        <circle
          cx={location.x}
          cy={location.y}
          r={outer ? 21 : 24}
          className={outer ? styles.topologyOuterNode : styles.topologyNode}
        />
        <text
          x={location.x}
          y={location.y + 4}
          className={styles.topologyNodeLabel}
          textAnchor="middle"
        >
          {label(ayah)}
        </text>
      </a>
    );
  };

  const renderHop = (edge: QuranNeighborhoodEdge) => {
    const anchor = point(positions, edge.via);
    const destination = point(positions, edge.neighbor);
    const origin = edge.direction === 'outgoing' ? anchor : destination;
    const target = edge.direction === 'outgoing' ? destination : anchor;
    return (
      <line
        key={edge.hop + ':' + edge.via + ':' + edge.id + ':' + edge.direction}
        x1={origin.x}
        y1={origin.y}
        x2={target.x}
        y2={target.y}
        className={edge.hop === 1 ? styles.topologyFirstLine : styles.topologySecondLine}
        markerEnd="url(#topology-arrow)"
      />
    );
  };

  return (
    <section className={styles.topologyDashboard} aria-label="Quran curated graph topology">
      <header className={styles.analyticsIntro}>
        <p className={styles.eyebrow}>Phase 2C.2 · Verifiable connectivity</p>
        <h1>Explore the Quran's relationship network</h1>
        <p>
          Every edge is backed by a curated similar-passage ID. Counts describe this dataset's
          coverage, not religious significance, thematic importance or inferred similarity
          scores.
        </p>
        <div className={styles.topologyIntroActions}>
          <span className={styles.topologyEvidenceLabel}>Curated evidence only</span>
          <button type="button" className={styles.goButton} onClick={onOpenExact}>
            Explore computed exact Arabic phrases separately
          </button>
        </div>
      </header>

      <div className={styles.topologyToolbar}>
        <div className={styles.viewTabs} role="group" aria-label="Network scale">
          <button
            type="button"
            className={mode === 'surah' ? styles.activeTab : styles.tab}
            aria-pressed={mode === 'surah'}
            onClick={() => onMode('surah')}
          >
            Surah network
          </button>
          <button
            type="button"
            className={mode === 'ayah' ? styles.activeTab : styles.tab}
            aria-pressed={mode === 'ayah'}
            onClick={() => onMode('ayah')}
          >
            Ayah neighborhood
          </button>
        </div>
        <label className={styles.field}>
          <span>Curated direction</span>
          <select
            aria-label="Network direction"
            value={direction}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'outgoing' || value === 'incoming' || value === 'both') {
                setSurahPage(0);
                setAyahPage(0);
                setSelectedPartner(null);
                setEvidencePage(0);
                onDirection(value);
              }
            }}
          >
            <option value="both">Both directions</option>
            <option value="outgoing">Source → target</option>
            <option value="incoming">Target ← source</option>
          </select>
        </label>
        {mode === 'surah' ? (
          <label className={styles.field}>
            <span>Minimum directional incidences</span>
            <select
              aria-label="Minimum surah links"
              value={minimum}
              onChange={(event) => {
                setMinimum(Number(event.target.value));
                setSurahPage(0);
                setSelectedPartner(null);
                setEvidencePage(0);
              }}
            >
              {[1, 2, 5, 10, 20].map((threshold) => (
                <option key={threshold} value={threshold}>
                  {threshold}+
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={styles.field}>
            <span>Exploration depth</span>
            <select
              aria-label="Neighborhood depth"
              value={depth}
              onChange={(event) => {
                onDepth(event.target.value === '2' ? 2 : 1);
              }}
            >
              <option value={1}>1 hop</option>
              <option value={2}>2 hops, bounded</option>
            </select>
          </label>
        )}
      </div>

      <div className={styles.topologyColumns}>
        <section className={styles.topologyPanel} aria-label={mode === 'surah' ? 'Surah connections' : 'Ayah connections'}>
          <div className={styles.panelHeading}>
            <h2>
              {mode === 'surah'
                ? getSurah(surah).name + ' · Surah ' + String(surah)
                : 'Neighborhood of ' + label(focus)}
            </h2>
            {mode === 'surah' ? (
              <p>
                {smallNumber(focusSurahRow?.touching ?? 0)} distinct curated links touch this
                surah. {smallNumber(focusSurahRow?.outgoing ?? 0)} source incidences,{' '}
                {smallNumber(focusSurahRow?.incoming ?? 0)} target incidences. The diagram
                omits within-surah edges.
              </p>
            ) : (
              <p>
                Up to {TOPOLOGY_FIRST_HOP_LIMIT} first-hop links per page and{' '}
                {TOPOLOGY_SECOND_HOP_LIMIT} second-hop links per expansion. Arrows follow
                recorded source-to-target direction.
              </p>
            )}
          </div>
          {mode === 'surah' ? (
            <>
              <svg
                className={styles.topologyDiagram}
                viewBox="0 0 760 480"
                role="group"
                aria-label="Interactive surah connectivity network"
              >
                <defs>
                  <marker id="topology-surah-arrow" markerWidth="8" markerHeight="8" refX="23" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" className={styles.topologyArrow} />
                  </marker>
                </defs>
                {partnersWithPositions.map((entry) => (
                  <g key={entry.surah}>
                    {entry.outgoing > 0 && (
                      <line
                        x1={CENTER.x}
                        y1={CENTER.y}
                        x2={entry.point.x}
                        y2={entry.point.y}
                        strokeWidth={Math.min(8, 1 + Math.log2(entry.outgoing))}
                        className={styles.topologyFirstLine}
                      />
                    )}
                    {entry.incoming > 0 && (
                      <line
                        x1={entry.point.x}
                        y1={entry.point.y}
                        x2={CENTER.x}
                        y2={CENTER.y}
                        strokeWidth={Math.min(8, 1 + Math.log2(entry.incoming))}
                        className={styles.topologySecondLine}
                        strokeDasharray="6 5"
                      />
                    )}
                    <a
                      href={surahHref(entry.surah)}
                      aria-label={'Focus surah ' + String(entry.surah) + ' ' + getSurah(entry.surah).name}
                      onClick={(event) => {
                        event.preventDefault();
                        setSurahPage(0);
                        setSelectedPartner(null);
                        onFocusSurah(entry.surah);
                      }}
                    >
                      <circle cx={entry.point.x} cy={entry.point.y} r="25" className={styles.topologyNode} />
                      <text x={entry.point.x} y={entry.point.y + 5} textAnchor="middle" className={styles.topologyNodeLabel}>
                        {entry.surah}
                      </text>
                    </a>
                  </g>
                ))}
                <circle cx={CENTER.x} cy={CENTER.y} r="34" className={styles.topologyCenter} />
                <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" className={styles.topologyNodeLabel}>
                  {surah}
                </text>
              </svg>
              <p className={styles.topologyCaption}>
                Solid lines: outgoing. Dashed lines: incoming. Width follows the actual number
                of directed source/target pair incidences, not a normalized similarity score.
                Showing {displayed.length} of {neighbors.length} matching partner surahs.
              </p>
              <div className={styles.topologyPager}>
                <button type="button" disabled={currentSurahPage === 0} onClick={() => {
                  setSurahPage(currentSurahPage - 1);
                  setSelectedPartner(null);
                }}>
                  Previous surah partners
                </button>
                <span>Page {currentSurahPage + 1} of {surahPages}</span>
                <button type="button" disabled={currentSurahPage + 1 >= surahPages} onClick={() => {
                  setSurahPage(currentSurahPage + 1);
                  setSelectedPartner(null);
                }}>
                  Next surah partners
                </button>
              </div>
              {displayed.length === 0 && (
                <p className={styles.empty}>No partner surahs meet this direction and minimum-link filter.</p>
              )}
              <div className={styles.topologyPartnerList} aria-label="Connected surahs">
                {displayed.map((entry) => (
                  <button
                    type="button"
                    key={entry.surah}
                    aria-pressed={partner?.surah === entry.surah}
                    onClick={() => selectPartner(entry.surah)}
                  >
                    <strong>{entry.surah}. {getSurah(entry.surah).name}</strong>
                    <small>{smallNumber(entry.outgoing)} out · {smallNumber(entry.incoming)} in</small>
                    <span>{smallNumber(entry.strength)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <svg
                className={styles.topologyDiagram}
                viewBox="0 0 760 480"
                role="group"
                aria-label="Interactive bounded ayah neighborhood"
              >
                <defs>
                  <marker id="topology-arrow" markerWidth="8" markerHeight="8" refX="23" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" className={styles.topologyArrow} />
                  </marker>
                </defs>
                {shownNeighborhood.second.map(renderHop)}
                {shownNeighborhood.first.map(renderHop)}
                {secondNodes.map((ayah) => renderAyahLink(ayah, 'outer-' + ayah, true))}
                {firstNodes.map((ayah) => renderAyahLink(ayah, 'inner-' + ayah, false))}
                <circle cx={CENTER.x} cy={CENTER.y} r="34" className={styles.topologyCenter} />
                <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" className={styles.topologyNodeLabel}>
                  {label(focus)}
                </text>
              </svg>
              <p className={styles.topologyCaption} role="status">
                Showing {shownNeighborhood.first.length} of {shownNeighborhood.firstCount} first-hop
                link incidences{depth === 2 ? ', plus ' + shownNeighborhood.second.length +
                ' of ' + shownNeighborhood.secondCount + ' second-hop incidences' : ''}.
                Source and target ranges are represented by their first ayah; the full spans
                remain available in the original relationship.
              </p>
              <div className={styles.topologyPager}>
                <button
                  type="button"
                  disabled={currentAyahPage === 0}
                  onClick={() => setAyahPage(currentAyahPage - 1)}
                >
                  Previous neighborhood links
                </button>
                <span>Page {currentAyahPage + 1} of {shownNeighborhood.pages}</span>
                <button
                  type="button"
                  disabled={currentAyahPage + 1 >= shownNeighborhood.pages}
                  onClick={() => setAyahPage(currentAyahPage + 1)}
                >
                  Next neighborhood links
                </button>
              </div>
              <div className={styles.topologyLinkList} aria-label="Neighborhood source links">
                {[...shownNeighborhood.first, ...shownNeighborhood.second].map((edge) => {
                  const link = relationships.link(edge.id);
                  return (
                    <button
                      key={edge.hop + ':' + edge.id + ':' + edge.via + ':' + edge.direction}
                      type="button"
                      onClick={() => onOpenLink(link.id)}
                    >
                      <span>Hop {edge.hop} · Link #{link.id + 1}</span>
                      <strong>{curatedLinkLabel(link)}</strong>
                      <small>View original relationship and passage</small>
                    </button>
                  );
                })}
                {shownNeighborhood.firstCount === 0 && (
                  <p className={styles.empty}>No curated links are incident to this ayah in the selected direction.</p>
                )}
              </div>
              <button type="button" className={styles.goButton} onClick={() => onReadAyah(focus)}>
                Read {label(focus)} in the Quran
              </button>
            </>
          )}
        </section>

        <aside className={styles.topologySide}>
          {mode === 'surah' && (
            <section className={styles.topologyPanel} aria-label="Surah link evidence">
              <div className={styles.panelHeading}>
                <h2>Underlying curated relationships</h2>
                <p>Select a partner surah to inspect the exact relationship IDs behind its edge.</p>
              </div>
              {partner === null ? (
                <p className={styles.empty}>No matching edge. Lower the threshold or change direction.</p>
              ) : (
                <>
                  <p className={styles.topologyCaption}>
                    {getSurah(surah).name} ⇄ {getSurah(partner.surah).name}: {' '}
                    {smallNumber(partner.ids.length)} distinct curated link IDs. An ID may
                    contribute to both directions if its source and target ranges overlap surahs.
                  </p>
                  <div className={styles.topologyLinkList} aria-label="Verified surah pair links">
                    {partnerIds.map((id) => (
                      <button type="button" key={id} onClick={() => onOpenLink(id)}>
                        <span>Curated link #{id + 1}</span>
                        <strong>{curatedLinkLabel(relationships.link(id))}</strong>
                        <small>Open source and target ayahs</small>
                      </button>
                    ))}
                  </div>
                  <div className={styles.topologyPager}>
                    <button type="button" disabled={currentEvidencePage === 0} onClick={() => setEvidencePage(currentEvidencePage - 1)}>
                      Previous evidence
                    </button>
                    <span>{currentEvidencePage + 1} / {partnerPages}</span>
                    <button type="button" disabled={currentEvidencePage + 1 >= partnerPages} onClick={() => setEvidencePage(currentEvidencePage + 1)}>
                      Next evidence
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
          <section className={styles.topologyPanel} aria-label="Most connected curated ayahs">
            <div className={styles.panelHeading}>
              <h2>Most connected ayahs</h2>
              <p>
                Ranked by distinct curated relationship IDs incident to each ayah. This
                measures documentation coverage, not importance.
              </p>
            </div>
            <ol className={styles.topologyRankings}>
              {report.topAyahs.map((row, position) => (
                <li key={row.ayah}>
                  <button
                    type="button"
                    onClick={() => {
                      setAyahPage(0);
                      onFocusAyah(row.ayah);
                      onMode('ayah');
                    }}
                    aria-label={'Explore ranked connected ayah ' + label(row.ayah)}
                  >
                    <span>#{position + 1}</span>
                    <strong>{label(row.ayah)}</strong>
                    <small>{smallNumber(row.uniqueLinks)} links · {row.outgoing} out · {row.incoming} in</small>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      <p className={styles.analyticsFootnote}>
        The network is directed and curated-only. Surah edges aggregate verified
        source-surah/target-surah pairs; their totals can exceed the underlying 2,445 distinct links.
        No all-to-all ayah or exact-phrase edges are synthesized. Neighborhood expansions are
        explicitly bounded and paginated.
      </p>
    </section>
  );
}
