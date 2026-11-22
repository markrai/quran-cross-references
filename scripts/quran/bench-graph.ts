import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildQuranArcGeometry, selectQuranRelationshipIds } from '../../src/core/quran/graph-adapters.ts';
import { QuranRelationshipIndex } from '../../src/core/quran/relationship-index.ts';
import { buildQuranGraphPaths } from '../../src/quran/graph-layout.ts';
import { importMutashabihat } from './datasets.ts';

const raw = readFileSync('data/raw/mutashabiha_data.json', 'utf8');
const index = new QuranRelationshipIndex(importMutashabihat(raw));
const scenarios = [
  { label: 'full Quran', selectedSurahs: null },
  { label: 'surah 2', selectedSurahs: new Set([2]) },
] as const;

function percentile(samples: readonly number[], fraction: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)))] ?? 0;
}

for (const scenario of scenarios) {
  const ids = selectQuranRelationshipIds(index, {
    scope: 'all',
    surahs: scenario.selectedSurahs,
  });
  const measure = () => {
    const geometry = buildQuranArcGeometry(index, ids);
    return buildQuranGraphPaths(index, geometry);
  };
  for (let attempt = 0; attempt < 10; attempt += 1) measure();
  const samples: number[] = [];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const start = performance.now();
    measure();
    samples.push(performance.now() - start);
  }
  console.log(
    `${scenario.label}: ${String(ids.length)} arcs, ${String(ids.length * 3)} SVG nodes minimum, ` +
    `layout median ${percentile(samples, 0.5).toFixed(2)} ms, p95 ${percentile(samples, 0.95).toFixed(2)} ms`,
  );
}
console.log('CPU geometry benchmark only. Use browser profiling for SVG paint and interaction latency.');
