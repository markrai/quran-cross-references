import { useCallback, useState } from 'react';
import type { AyahIndex } from '../../core/quran/ayah-ref.ts';
import { CANONICAL_QURAN } from '../../core/quran/quran-versification.ts';
import type { CrossReferenceSourceId } from '../../core/datasets/ids.ts';
import { CrossReferencesSection } from './components/CrossReferencesSection.tsx';
import { DatasetsSection } from './components/DatasetsSection.tsx';
import { TextSearch } from './components/TextSearch.tsx';
import { TranslationSection } from './components/TranslationSection.tsx';
import { VerseInspector } from './components/VerseInspector.tsx';
import type { DebugData } from './debug-data.ts';
import { VerseNavigationContext } from './ayah-navigation.ts';
import { readVerseFromUrl, writeVerseToUrl } from './ayah-url.ts';

export const SECTION_IDS = {
  datasets: 'datasets',
  translation: 'translation',
  inspector: 'inspector',
  search: 'search',
} as const;

export function crossReferencesSectionId(sourceId: CrossReferenceSourceId): string {
  return `cross-references-${sourceId}`;
}

const DEFAULT_VERSE: AyahIndex =
  CANONICAL_QURAN.indexOf({ surah: 'John', surah: 3, ayah: 16 }) ?? 0;

interface DebugDashboardProps {
  readonly data: DebugData;
}

export function DebugDashboard({ data }: DebugDashboardProps) {
  const { translation, crossReferences } = data;
  const [selectedVerse, setSelectedVerse] = useState(() => readVerseFromUrl() ?? DEFAULT_VERSE);

  const selectVerse = useCallback((ayah: AyahIndex) => {
    setSelectedVerse(ayah);
    writeVerseToUrl(ayah);
    document
      .getElementById(SECTION_IDS.inspector)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const datasets = crossReferences.map(({ dataset }) => dataset);
  return (
    <VerseNavigationContext value={selectVerse}>
      <DatasetsSection
        id={SECTION_IDS.datasets}
        reports={[translation.report, ...crossReferences.map(({ report }) => report)]}
      />
      <TranslationSection id={SECTION_IDS.translation} translation={translation.translation} />
      {datasets.map((dataset) => (
        <CrossReferencesSection
          key={dataset.manifest.id}
          id={crossReferencesSectionId(dataset.manifest.id)}
          dataset={dataset}
        />
      ))}
      <VerseInspector
        id={SECTION_IDS.inspector}
        ayah={selectedVerse}
        translation={translation.translation}
        datasets={datasets}
      />
      <TextSearch id={SECTION_IDS.search} translation={translation.translation} />
    </VerseNavigationContext>
  );
}
