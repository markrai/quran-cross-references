import { describe, expect, it } from 'vitest';
import { QuranRelationshipIndex } from './relationship-index.ts';
import {
  createCuratedRelationshipEvidence,
  curatedRelationshipStableId,
  QuranEvidenceIntegrityError,
  QuranRelationshipEvidenceIndex,
  type QuranEvidenceSource,
} from './relationship-evidence.ts';

const SOURCE: QuranEvidenceSource = {
  id: 'mutashabihat',
  fileName: 'mutashabiha_data.json',
  url: 'https://example.test/source.json',
  sha256: 'a'.repeat(64),
  license: 'CC0',
  attribution: 'Source collection',
  retrievedAt: '2026-11-01',
};

const DATA = {
  format: 'quran-similar-passages',
  schemaVersion: 1,
  versification: 'hafs-kufan-6236',
  sourceRowCount: 2,
  duplicateCount: 0,
  repeatedRangeMemberCount: 0,
  links: [
    { source: { start: 7, end: 8 }, target: { start: 261, end: 261 }, contextAfter: 0 },
    { source: { start: 261, end: 261 }, target: { start: 6000, end: 6001 }, contextAfter: 2 },
  ],
};

const index = new QuranRelationshipIndex(DATA);
const build = () => createCuratedRelationshipEvidence(index, SOURCE);
const parse = (value: unknown, source: QuranEvidenceSource = SOURCE) =>
  new QuranRelationshipEvidenceIndex(value, index, source);

describe('Phase 2B.1 curated evidence and stable relationship identity', () => {
  it('preserves existing numeric IDs while giving every link a stable endpoint identity', () => {
    const dataset = build();
    const evidence = parse(dataset);
    expect(dataset.format).toBe('quran-relationship-evidence');
    expect(dataset.schemaVersion).toBe(1);
    expect(dataset.versification).toBe('hafs-kufan-6236');
    expect(evidence.count).toBe(2);
    expect(evidence.source).toEqual(SOURCE);
    expect(evidence.byLegacyId(0)).toEqual({
      stableId: 'curated:mutashabihat:7-8:261-261',
      legacyId: 0,
      type: 'curated-similar-passage',
      origin: 'curated',
      evidence: [{ kind: 'curated-reference', sourceId: 'mutashabihat' }],
    });
    expect(evidence.forLink(index.link(1))).toBe(evidence.byLegacyId(1));
    expect(evidence.byStableId(evidence.byLegacyId(1).stableId)).toBe(evidence.byLegacyId(1));
    expect(evidence.byStableId('curated:mutashabihat:unknown')).toBeUndefined();
    expect(index.link(0)).not.toHaveProperty('stableId');
    expect(index.link(0).id).toBe(0);
  });

  it('keeps stable IDs unchanged when source link order changes', () => {
    const reversed = new QuranRelationshipIndex({ ...DATA, links: [...DATA.links].reverse() });
    const evidence = createCuratedRelationshipEvidence(reversed, SOURCE);
    expect(evidence.relationships.map((entry) => entry.stableId)).toEqual(
      build()
        .relationships.map((entry) => entry.stableId)
        .reverse(),
    );
    expect(evidence.relationships.map((entry) => entry.legacyId)).toEqual([0, 1]);
    expect(curatedRelationshipStableId(index.link(0), SOURCE.id)).toBe(
      'curated:mutashabihat:7-8:261-261',
    );
  });

  it('rejects noncanonical source identifiers and incomplete provenance', () => {
    const changes: readonly Partial<QuranEvidenceSource>[] = [
      { id: 'NotCanonical' },
      { sha256: 'short' },
      { fileName: '' },
      { url: 'http://example.test/data' },
      { license: '' },
      { attribution: '' },
      { retrievedAt: 'yesterday' },
    ];
    for (const change of changes) {
      expect(() => createCuratedRelationshipEvidence(index, { ...SOURCE, ...change })).toThrow(
        QuranEvidenceIntegrityError,
      );
    }
    expect(() => parse(build(), { ...SOURCE, sha256: 'invalid' })).toThrow('source SHA-256');
  });

  it('rejects unknown formats, mismatched numbering, missing sources and source tampering', () => {
    const dataset = build();
    expect(() => parse(null)).toThrow('dataset must be an object');
    expect(() => parse({ ...dataset, format: 'invalid' })).toThrow('unknown format');
    expect(() => parse({ ...dataset, schemaVersion: 2 })).toThrow('unknown format');
    expect(() => parse({ ...dataset, versification: 'other' })).toThrow('versification');
    expect(() => parse({ ...dataset, sources: null })).toThrow('sources');
    expect(() => parse({ ...dataset, sources: [] })).toThrow('exactly one');
    expect(() => parse({ ...dataset, sources: [null] })).toThrow('sources[0]');
    expect(() => parse({ ...dataset, sources: [{ ...SOURCE, sha256: 'b'.repeat(64) }] })).toThrow(
      'sources[0].sha256',
    );
    expect(() =>
      parse({ ...dataset, sources: [{ ...SOURCE, url: 'https://wrong.test' }] }),
    ).toThrow('sources[0].url');
    expect(() => parse({ ...dataset, sources: [{ ...SOURCE, license: 'unknown' }] })).toThrow(
      'sources[0].license',
    );
    expect(() =>
      parse({ ...dataset, sources: [{ ...SOURCE, retrievedAt: '2000-01-01' }] }),
    ).toThrow('sources[0].retrievedAt');
  });

  it('rejects missing, reordered, fabricated, or unverified classifications', () => {
    const dataset = build();
    const [first, second] = dataset.relationships;
    if (!first || !second) throw new Error('Expected two curated source records');
    expect(() => parse({ ...dataset, relationships: null })).toThrow('relationship count');
    expect(() => parse({ ...dataset, relationships: [first] })).toThrow('relationship count');
    expect(() => parse({ ...dataset, relationships: [null, second] })).toThrow(
      'relationships[0] must be an object',
    );
    expect(() => parse({ ...dataset, relationships: [second, first] })).toThrow(
      'mismatched legacy or stable ID',
    );
    expect(() => parse({ ...dataset, relationships: [{ ...first, legacyId: 4 }, second] })).toThrow(
      'mismatched legacy or stable ID',
    );
    expect(() =>
      parse({ ...dataset, relationships: [{ ...first, stableId: 'fabricated' }, second] }),
    ).toThrow('mismatched legacy or stable ID');
    expect(() =>
      parse({ ...dataset, relationships: [{ ...first, type: 'shared-root' }, second] }),
    ).toThrow('unsupported classification');
    expect(() =>
      parse({ ...dataset, relationships: [{ ...first, origin: 'computed' }, second] }),
    ).toThrow('unsupported classification');
    expect(() =>
      parse({ ...dataset, relationships: [{ ...first, evidence: [] }, second] }),
    ).toThrow('one source assertion');
    expect(() =>
      parse({ ...dataset, relationships: [{ ...first, evidence: [null] }, second] }),
    ).toThrow('evidence[0] must be an object');
    expect(() =>
      parse({
        ...dataset,
        relationships: [
          { ...first, evidence: [{ kind: 'computed-expression', sourceId: SOURCE.id }] },
          second,
        ],
      }),
    ).toThrow('unknown or unsupported evidence');
    expect(() =>
      parse({
        ...dataset,
        relationships: [
          { ...first, evidence: [{ kind: 'curated-reference', sourceId: 'unverified' }] },
          second,
        ],
      }),
    ).toThrow('unknown or unsupported evidence');
  });

  it('does not accept foreign links or invalid legacy IDs in the compatibility adapter', () => {
    const evidence = parse(build());
    expect(() => evidence.byLegacyId(-1)).toThrow(RangeError);
    expect(() => evidence.byLegacyId(2)).toThrow(RangeError);
    expect(() => evidence.byLegacyId(0.5)).toThrow(RangeError);
    expect(() => evidence.byLegacyId(Number.NaN)).toThrow(RangeError);
    const other = index.link(0);
    expect(() => evidence.forLink({ ...other, source: { start: 0, end: 0 } })).toThrow(
      'link endpoints do not match',
    );
  });

  it('accepts empty curated corpora without inventing relationships', () => {
    const empty = new QuranRelationshipIndex({ ...DATA, links: [], sourceRowCount: 0 });
    const dataset = createCuratedRelationshipEvidence(empty, SOURCE);
    const evidence = new QuranRelationshipEvidenceIndex(dataset, empty, SOURCE);
    expect(evidence.count).toBe(0);
    expect(evidence.byStableId('curated:mutashabihat:7-8:261-261')).toBeUndefined();
  });
});
