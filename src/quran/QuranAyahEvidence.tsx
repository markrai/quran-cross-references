import { formatAyahId } from '../core/quran/ayah-ref.ts';
import type { QuranExpressionIndex } from '../core/quran/expression-browser.ts';
import type { QacMorphologyIndex } from '../core/quran/qac-index.ts';
import type { QuranThemeIndex } from '../core/quran/theme-index.ts';
import type { QuranEmotionIndex } from '../core/quran/emotion-index.ts';
import type { QuranEmotionLabel } from '../core/quran/emotion-types.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import { formatIndexRange } from '../core/quran/reference.ts';
import type { QuranInspectorSection, QuranInspectorSource } from './location.ts';
import type { QuranReaderData } from './model.ts';
import styles from './QuranApp.module.css';

export type AyahEvidenceLoad<T> =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly index: T };

interface Props {
  readonly data: QuranReaderData;
  readonly ayahIndex: number;
  readonly section: QuranInspectorSection;
  readonly expressions: AyahEvidenceLoad<QuranExpressionIndex>;
  readonly morphology: AyahEvidenceLoad<QacMorphologyIndex>;
  readonly themes: AyahEvidenceLoad<QuranThemeIndex>;
  readonly emotions: AyahEvidenceLoad<QuranEmotionIndex>;
  readonly onSection: (next: QuranInspectorSection) => void;
  readonly onRetry: (source: Exclude<QuranInspectorSource, 'curated'>) => void;
  readonly onCuratedLink: (id: number) => void;
  readonly onExactExpression: (id: string) => void;
  readonly onMorphologyWord: (position: number, lemma: string | null, root: string | null) => void;
  readonly onTheme: (name: string) => void;
  readonly onEmotion: (emotion: QuranEmotionLabel | 'all') => void;
}

const SOURCES = [
  { id: 'curated', title: 'Curated similar passages', kind: 'Original relationship IDs' },
  { id: 'exact', title: 'Exact Arabic expressions', kind: 'Computed verbatim evidence' },
  { id: 'morphology', title: 'Arabic morphology', kind: 'QAC word annotations' },
  { id: 'themes', title: 'QSAC thematic labels', kind: 'External topic annotations' },
  { id: 'emotions', title: 'ELQV emotion labels', kind: 'Independent research sample' },
] as const;

function sourceStatus<T>(load: AyahEvidenceLoad<T>, count: number, empty: string): string {
  if (load.status === 'error') return 'Verification failed';
  if (load.status === 'loading') return 'Checking source…';
  if (load.status !== 'ready') return 'Not checked';
  return count === 0 ? empty : String(count) + ' at this ayah';
}

function EvidenceError({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <div className={styles.ayahEvidenceFailure} role="alert">
      <p>Source verification failed: {message}</p>
      <button type="button" onClick={onRetry}>
        Retry this source
      </button>
    </div>
  );
}

export function QuranAyahEvidence({
  data,
  ayahIndex,
  section,
  expressions,
  morphology,
  themes,
  emotions,
  onSection,
  onRetry,
  onCuratedLink,
  onExactExpression,
  onMorphologyWord,
  onTheme,
  onEmotion,
}: Props) {
  const index = data.relationships;
  const outgoing = index.outgoing(ayahIndex);
  const incoming = index.incoming(ayahIndex);
  const curated = [
    ...new Map(
      [...outgoing, ...incoming].map((link) => [
        link.id,
        {
          link,
          outgoing: outgoing.some((item) => item.id === link.id),
          incoming: incoming.some((item) => item.id === link.id),
        },
      ]),
    ).values(),
  ].sort((a, b) => a.link.id - b.link.id);
  const exactPhrases =
    expressions.status === 'ready'
      ? [
          ...new Map(
            expressions.index.forAyah(ayahIndex).map((hit) => [hit.expression.id, hit.expression]),
          ).values(),
        ]
      : [];
  const words = morphology.status === 'ready' ? morphology.index.wordsAt(ayahIndex) : [];
  const tags = themes.status === 'ready' ? themes.index.forAyah(ayahIndex) : [];
  const labels = emotions.status === 'ready' ? emotions.index.forAyah(ayahIndex) : [];
  const details = {
    curated:
      curated.length > 0 ? String(curated.length) + ' distinct links' : 'No curated link here',
    exact: sourceStatus(expressions, exactPhrases.length, 'No exact phrase here'),
    morphology: sourceStatus(morphology, words.length, 'No annotated words'),
    themes: sourceStatus(themes, tags.length, 'No thematic tags'),
    emotions: sourceStatus(emotions, labels.length, 'Not covered by ELQV'),
  };
  const checked =
    1 +
    Number(expressions.status === 'ready') +
    Number(morphology.status === 'ready') +
    Number(themes.status === 'ready') +
    Number(emotions.status === 'ready');
  const present =
    Number(curated.length > 0) +
    Number(expressions.status === 'ready' && exactPhrases.length > 0) +
    Number(morphology.status === 'ready' && words.length > 0) +
    Number(themes.status === 'ready' && tags.length > 0) +
    Number(emotions.status === 'ready' && labels.length > 0);
  const showing = (source: QuranInspectorSource): boolean =>
    section === 'all' || section === source;
  const incomplete =
    expressions.status !== 'ready' ||
    morphology.status !== 'ready' ||
    themes.status !== 'ready' ||
    emotions.status !== 'ready';

  return (
    <section className={styles.ayahEvidenceInspector} aria-label="Ayah evidence inspector">
      <button
        type="button"
        className={styles.ayahEvidenceToggle}
        aria-expanded={section !== null}
        aria-controls="ayah-evidence-content"
        onClick={() => {
          onSection(section === null ? 'curated' : null);
        }}
      >
        <span>
          <strong>Evidence for this ayah</strong>
          <small>Five independently classified evidence sources</small>
        </span>
        <span aria-hidden="true">{section === null ? '+' : '−'}</span>
      </button>
      {section !== null && (
        <div id="ayah-evidence-content" className={styles.ayahEvidenceContent}>
          <p className={styles.ayahEvidenceCoverage} role="status">
            {present} of {checked} checked sources have evidence at{' '}
            <strong>{formatAyahId(CANONICAL_QURAN.refAt(ayahIndex))}</strong>. Unchecked sources are
            not counted as absent; these are source-coverage counts, not agreement scores or
            theological rankings.
          </p>
          <div
            className={styles.ayahEvidenceSourceGrid}
            role="group"
            aria-label="Choose an ayah evidence source"
          >
            {SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                aria-pressed={showing(source.id)}
                className={styles.ayahEvidenceSourceButton}
                onClick={() => {
                  onSection(source.id);
                }}
              >
                <strong>{source.title}</strong>
                <span>{source.kind}</span>
                <small>{details[source.id]}</small>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.ayahEvidenceAll}
            aria-pressed={section === 'all'}
            onClick={() => {
              onSection('all');
            }}
          >
            Check all five sources
          </button>

          {showing('curated') && (
            <section
              aria-label="Inspector curated passage evidence"
              className={styles.ayahEvidencePanel}
            >
              <h3>Curated similar passages</h3>
              <p>
                {curated.length} distinct original source link IDs touch this ayah.{' '}
                {outgoing.length} outgoing and {incoming.length} incoming link incidences. These are
                source-defined passage connections, not inferred similarities.
              </p>
              {curated.length === 0 ? (
                <p>No curated links are recorded for this ayah in the pinned dataset.</p>
              ) : (
                <ul className={styles.ayahEvidenceList}>
                  {curated
                    .slice(0, 8)
                    .map(({ link, outgoing: isOutgoing, incoming: isIncoming }) => (
                      <li key={link.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onCuratedLink(link.id);
                          }}
                        >
                          <strong>Link #{link.id}</strong>
                          <span>
                            {formatIndexRange(
                              index.versification,
                              link.source.start,
                              link.source.end,
                            )}
                            {' → '}
                            {formatIndexRange(
                              index.versification,
                              link.target.start,
                              link.target.end,
                            )}
                          </span>
                          <small>
                            {isOutgoing && isIncoming
                              ? 'Outgoing and incoming'
                              : isOutgoing
                                ? 'Outgoing'
                                : 'Incoming'}
                            {' · Open original relationship'}
                          </small>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              {curated.length > 8 && (
                <p>Showing 8 of {curated.length} links. Open Arcs for the original source index.</p>
              )}
            </section>
          )}

          {showing('exact') && (
            <section
              aria-label="Inspector exact Arabic evidence"
              className={styles.ayahEvidencePanel}
            >
              <h3>Computed exact Arabic phrases</h3>
              {expressions.status === 'ready' ? (
                <>
                  <p>
                    {exactPhrases.length} distinct repeated 3–8-word sequences in this ayah. Literal
                    matches preserve original Tanzil spelling and word order; they do not establish
                    shared meaning or curated connections.
                  </p>
                  {exactPhrases.length === 0 && (
                    <p>No exact repeated expressions recorded at this ayah.</p>
                  )}
                  <ul className={styles.ayahEvidenceList}>
                    {exactPhrases.slice(0, 8).map((expression) => (
                      <li key={expression.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onExactExpression(expression.id);
                          }}
                        >
                          <strong lang="ar" dir="rtl">
                            {expression.words.join(' ')}
                          </strong>
                          <small>
                            {expression.occurrences.length} recorded spans · Inspect exact source
                            locations
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {exactPhrases.length > 8 && (
                    <p>Showing 8 of {exactPhrases.length} distinct expressions.</p>
                  )}
                </>
              ) : expressions.status === 'error' ? (
                <EvidenceError
                  message={expressions.message}
                  onRetry={() => {
                    onRetry('exact');
                  }}
                />
              ) : (
                <p role="status">Verifying optional exact Arabic expressions…</p>
              )}
            </section>
          )}

          {showing('morphology') && (
            <section
              aria-label="Inspector Arabic morphology evidence"
              className={styles.ayahEvidencePanel}
            >
              <h3>QAC lemmas, roots and segments</h3>
              {morphology.status === 'ready' ? (
                <>
                  <p>
                    {words.length} source-word positions are annotated for this ayah. The historical
                    QAC tokenization is not assumed to align word-for-word with the separately
                    displayed Tanzil v1.1 text.
                  </p>
                  <ul className={styles.ayahEvidenceList}>
                    {words.slice(0, 8).map((word, position) => (
                      <li key={position}>
                        <button
                          type="button"
                          onClick={() => {
                            onMorphologyWord(
                              position + 1,
                              word.lemmas[0] ?? null,
                              word.roots[0] ?? null,
                            );
                          }}
                        >
                          <strong>
                            QAC word {position + 1}{' '}
                            <span lang="ar" dir="rtl">
                              {word.form}
                            </span>
                          </strong>
                          <small>
                            Lemmas: {word.lemmas.join(', ') || 'none'} · Roots:{' '}
                            {word.roots.join(', ') || 'none'} · Grammar:{' '}
                            {word.pos.join(', ') || 'unclassified'}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {words.length > 8 && (
                    <p>
                      Showing 8 of {words.length} source positions. Open morphology for every word.
                    </p>
                  )}
                </>
              ) : morphology.status === 'error' ? (
                <EvidenceError
                  message={morphology.message}
                  onRetry={() => {
                    onRetry('morphology');
                  }}
                />
              ) : (
                <p role="status">Verifying optional QAC linguistic annotations…</p>
              )}
            </section>
          )}

          {showing('themes') && (
            <section
              aria-label="Inspector QSAC thematic evidence"
              className={styles.ayahEvidencePanel}
            >
              <h3>QSAC external thematic tags</h3>
              {themes.status === 'ready' ? (
                <>
                  <p>
                    {tags.length} distinct external labels at this ayah. The QSAC annotations were
                    produced with LLM assistance and human review; they are exploratory, not tafsir,
                    scholarly consensus, or verified cross-references.
                  </p>
                  <ul className={styles.ayahEvidenceList}>
                    {tags.map((tag) => (
                      <li key={tag.name}>
                        <button
                          type="button"
                          onClick={() => {
                            onTheme(tag.name);
                          }}
                        >
                          <strong>{tag.name}</strong>
                          <span>
                            {tag.domain} · {tag.category}
                          </span>
                          <small>{tag.description}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : themes.status === 'error' ? (
                <EvidenceError
                  message={themes.message}
                  onRetry={() => {
                    onRetry('themes');
                  }}
                />
              ) : (
                <p role="status">Verifying optional QSAC annotation source…</p>
              )}
            </section>
          )}

          {showing('emotions') && (
            <section
              aria-label="Inspector ELQV emotion evidence"
              className={styles.ayahEvidencePanel}
            >
              <h3>ELQV research emotion annotations</h3>
              {emotions.status === 'ready' ? (
                <>
                  {labels.length === 0 ? (
                    <p>
                      Not covered by the ELQV sample. This ayah is not annotated in that study; it
                      is <strong>not</strong> classified as neutral or emotionless.
                    </p>
                  ) : (
                    <>
                      <p>
                        {labels.length} source-defined emotion{' '}
                        {labels.length === 1 ? 'label' : 'labels'}.
                        {labels.length > 1
                          ? ' Multiple conflicting categories are preserved without voting.'
                          : ''}{' '}
                        ELQV is an independent selected sample, not Quran-wide interpretation.
                      </p>
                      <ul className={styles.ayahEvidenceList}>
                        {labels.map((label) => (
                          <li key={label}>
                            <button
                              type="button"
                              onClick={() => {
                                onEmotion(label);
                              }}
                            >
                              <strong>{label.charAt(0).toUpperCase() + label.slice(1)}</strong>
                              <small>Open original ELQV sample for this label</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.ayahEvidenceAll}
                    onClick={() => {
                      onEmotion('all');
                    }}
                  >
                    Open full ELQV research sample
                  </button>
                </>
              ) : emotions.status === 'error' ? (
                <EvidenceError
                  message={emotions.message}
                  onRetry={() => {
                    onRetry('emotions');
                  }}
                />
              ) : (
                <p role="status">Verifying optional ELQV research annotations…</p>
              )}
            </section>
          )}
          {section === 'all' && incomplete && (
            <p className={styles.ayahEvidenceDisclaimer}>
              Results remain incomplete while optional sources are loading or unavailable. Missing
              values are never inferred or counted as negative evidence.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
