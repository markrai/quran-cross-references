import type {
  QuranExpressionIndex,
  QuranPublishedExpression,
} from '../core/quran/expression-browser.ts';
import { formatAyahId } from '../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../core/quran/quran-versification.ts';
import styles from './QuranApp.module.css';

interface QuranExpressionsProps {
  readonly index: QuranExpressionIndex;
  readonly ayahIndex: number;
  readonly selected: QuranPublishedExpression | null;
  readonly onSelect: (id: string) => void;
  readonly onNavigate: (ayahIndex: number) => void;
}

function phraseLabel(expression: QuranPublishedExpression): string {
  return expression.words.join(' ');
}

export function QuranExpressions({
  index,
  ayahIndex,
  selected,
  onSelect,
  onNavigate,
}: QuranExpressionsProps) {
  const hits = index.forAyah(ayahIndex);
  const unique = [...new Map(hits.map((hit) => [hit.expression.id, hit.expression])).values()];
  const visiblePhrases = unique.slice(0, 12);
  const additionalPhrases = unique.slice(12);
  const visibleOccurrences = selected?.occurrences.slice(0, 24) ?? [];
  const additionalOccurrences = selected?.occurrences.slice(24) ?? [];

  const phraseButton = (expression: QuranPublishedExpression) => (
    <button
      key={expression.id}
      type="button"
      className={styles.expressionButton}
      aria-pressed={selected?.id === expression.id}
      onClick={() => {
        onSelect(expression.id);
      }}
    >
      <span lang="ar" dir="rtl" className={styles.expressionArabic}>
        {phraseLabel(expression)}
      </span>
      <small>
        {String(expression.words.length)} words · {String(expression.occurrences.length)} spans
      </small>
    </button>
  );

  const occurrenceButton = (ayah: number, start: number) => (
    <button
      key={String(ayah) + ':' + String(start)}
      type="button"
      className={styles.expressionOccurrence}
      aria-current={ayah === ayahIndex ? 'location' : undefined}
      onClick={() => {
        onNavigate(ayah);
      }}
    >
      {formatAyahId(CANONICAL_QURAN.refAt(ayah))}
      <small>word {String(start + 1)}</small>
    </button>
  );

  return (
    <section className={styles.expressionCard} aria-label="Exact Arabic expressions">
      <div className={styles.panelHeading}>
        <h2>Verbatim Arabic repetitions</h2>
        <p>
          {index.expressions.length.toLocaleString('en')} computed phrases ·{' '}
          {index.occurrenceCount.toLocaleString('en')} spans · exact diacritics and word order
          preserved
        </p>
        <p>
          These are computed orthographic matches, not curated connections, interpretations,
          morphological roots or semantic similarity.
        </p>
      </div>
      <div className={styles.expressionColumns}>
        <div className={styles.expressionColumn}>
          <h3>
            At {formatAyahId(CANONICAL_QURAN.refAt(ayahIndex))} · {String(unique.length)} phrases
          </h3>
          {unique.length === 0 ? (
            <p className={styles.empty}>
              No repeated 3–8-word expression from this dataset starts in the selected ayah. Try
              another reference, or follow an existing selected phrase.
            </p>
          ) : (
            <div className={styles.expressionButtons}>
              {visiblePhrases.map(phraseButton)}
              {additionalPhrases.length > 0 && (
                <details className={styles.expressionMore}>
                  <summary>
                    Show {String(additionalPhrases.length)} more phrases in this ayah
                  </summary>
                  <div className={styles.expressionButtons}>
                    {additionalPhrases.map(phraseButton)}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
        <div className={styles.expressionColumn}>
          <h3>Selected expression</h3>
          {selected === null ? (
            <p className={styles.empty}>
              Select a repeated Arabic phrase to inspect its exact source locations.
            </p>
          ) : (
            <>
              <p lang="ar" dir="rtl" className={styles.expressionSelected}>
                {phraseLabel(selected)}
              </p>
              <p className={styles.expressionStats}>
                {String(selected.occurrences.length)} recorded spans in{' '}
                {String(new Set(selected.occurrences.map((site) => site.ayah)).size)} distinct ayahs
              </p>
              <div className={styles.expressionLocations}>
                {visibleOccurrences.map((site) => occurrenceButton(site.ayah, site.start))}
              </div>
              {additionalOccurrences.length > 0 && (
                <details className={styles.expressionMore}>
                  <summary>
                    Show {String(additionalOccurrences.length)} additional source spans
                  </summary>
                  <div className={styles.expressionLocations}>
                    {additionalOccurrences.map((site) => occurrenceButton(site.ayah, site.start))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
