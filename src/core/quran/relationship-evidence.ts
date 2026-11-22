import { elementAt } from '../lib/array.ts';
import type { QuranRelationship, QuranRelationshipIndex } from './relationship-index.ts';

export type QuranRelationshipType = 'curated-similar-passage';
export type QuranRelationshipOrigin = 'curated';

export interface QuranEvidenceSource {
  readonly id: string;
  readonly fileName: string;
  readonly url: string;
  readonly sha256: string;
  readonly license: string;
  readonly attribution: string;
  readonly retrievedAt: string;
}

export interface QuranEvidenceAssertion {
  readonly kind: 'curated-reference';
  readonly sourceId: string;
}

export interface QuranClassifiedRelationship {
  readonly stableId: string;
  readonly legacyId: number;
  readonly type: QuranRelationshipType;
  readonly origin: QuranRelationshipOrigin;
  readonly evidence: readonly QuranEvidenceAssertion[];
}

export interface QuranRelationshipEvidenceDataset {
  readonly format: 'quran-relationship-evidence';
  readonly schemaVersion: 1;
  readonly versification: string;
  readonly sources: readonly QuranEvidenceSource[];
  readonly relationships: readonly QuranClassifiedRelationship[];
}

export class QuranEvidenceIntegrityError extends Error {
  constructor(message: string) {
    super('Invalid Quran relationship evidence: ' + message);
    this.name = 'QuranEvidenceIntegrityError';
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new QuranEvidenceIntegrityError(field + ' must be an object.');
  }
  return value as Record<string, unknown>;
}

function validateSource(source: QuranEvidenceSource): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id)) {
    throw new QuranEvidenceIntegrityError('source ID must be a canonical identifier.');
  }
  if (!/^[a-f0-9]{64}$/.test(source.sha256)) {
    throw new QuranEvidenceIntegrityError(
      'source SHA-256 must be a lowercase 64-character hex digest.',
    );
  }
  if (
    !source.fileName ||
    !source.url.startsWith('https://') ||
    !source.license ||
    !source.attribution ||
    !/^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt)
  ) {
    throw new QuranEvidenceIntegrityError(
      'source must include verified file, URL, rights and retrieval metadata.',
    );
  }
}

export function curatedRelationshipStableId(link: QuranRelationship, sourceId: string): string {
  return [
    'curated',
    sourceId,
    String(link.source.start) + '-' + String(link.source.end),
    String(link.target.start) + '-' + String(link.target.end),
  ].join(':');
}

export function createCuratedRelationshipEvidence(
  index: QuranRelationshipIndex,
  source: QuranEvidenceSource,
): QuranRelationshipEvidenceDataset {
  validateSource(source);
  const relationships = Array.from({ length: index.linkCount }, (_, legacyId) => {
    const link = index.link(legacyId);
    return {
      stableId: curatedRelationshipStableId(link, source.id),
      legacyId,
      type: 'curated-similar-passage' as const,
      origin: 'curated' as const,
      evidence: [{ kind: 'curated-reference' as const, sourceId: source.id }],
    };
  });
  return {
    format: 'quran-relationship-evidence',
    schemaVersion: 1,
    versification: index.versification.id,
    sources: [source],
    relationships,
  };
}

export class QuranRelationshipEvidenceIndex {
  readonly source: QuranEvidenceSource;
  readonly count: number;

  readonly #records: readonly QuranClassifiedRelationship[];
  readonly #byStableId: ReadonlyMap<string, QuranClassifiedRelationship>;

  constructor(
    dataset: unknown,
    links: QuranRelationshipIndex,
    expectedSource: QuranEvidenceSource,
  ) {
    validateSource(expectedSource);
    const input = record(dataset, 'dataset');
    if (input['format'] !== 'quran-relationship-evidence' || input['schemaVersion'] !== 1) {
      throw new QuranEvidenceIntegrityError('unknown format or schema version.');
    }
    if (input['versification'] !== links.versification.id) {
      throw new QuranEvidenceIntegrityError('versification does not match the indexed Quran.');
    }
    const sources = input['sources'];
    if (!Array.isArray(sources) || sources.length !== 1) {
      throw new QuranEvidenceIntegrityError('sources must contain exactly one pinned source.');
    }
    const candidate = record(sources[0], 'sources[0]');
    for (const field of [
      'id',
      'fileName',
      'url',
      'sha256',
      'license',
      'attribution',
      'retrievedAt',
    ] as const) {
      if (candidate[field] !== expectedSource[field]) {
        throw new QuranEvidenceIntegrityError(
          'sources[0].' + field + ' differs from the pinned source.',
        );
      }
    }
    const values = input['relationships'];
    if (!Array.isArray(values) || values.length !== links.linkCount) {
      throw new QuranEvidenceIntegrityError('relationship count must match the curated index.');
    }
    const byStableId = new Map<string, QuranClassifiedRelationship>();
    const records = (values as unknown[]).map((value, legacyId) => {
      const label = 'relationships[' + String(legacyId) + ']';
      const relationship = record(value, label);
      const link = links.link(legacyId);
      const stableId = curatedRelationshipStableId(link, expectedSource.id);
      if (relationship['legacyId'] !== legacyId || relationship['stableId'] !== stableId) {
        throw new QuranEvidenceIntegrityError(label + ' has a mismatched legacy or stable ID.');
      }
      if (
        relationship['type'] !== 'curated-similar-passage' ||
        relationship['origin'] !== 'curated'
      ) {
        throw new QuranEvidenceIntegrityError(label + ' has an unsupported classification.');
      }
      const evidence = relationship['evidence'];
      if (!Array.isArray(evidence) || evidence.length !== 1) {
        throw new QuranEvidenceIntegrityError(label + ' must contain one source assertion.');
      }
      const assertion = record(evidence[0], label + '.evidence[0]');
      if (
        assertion['kind'] !== 'curated-reference' ||
        assertion['sourceId'] !== expectedSource.id
      ) {
        throw new QuranEvidenceIntegrityError(
          label + ' references unknown or unsupported evidence.',
        );
      }
      if (byStableId.has(stableId)) {
        throw new QuranEvidenceIntegrityError(label + ' duplicates a stable ID.');
      }
      const assertions: readonly QuranEvidenceAssertion[] = Object.freeze([
        { kind: 'curated-reference', sourceId: expectedSource.id },
      ]);
      const entry: QuranClassifiedRelationship = Object.freeze({
        stableId,
        legacyId,
        type: 'curated-similar-passage',
        origin: 'curated',
        evidence: assertions,
      });
      byStableId.set(stableId, entry);
      return entry;
    });
    this.source = Object.freeze({ ...expectedSource });
    this.#records = Object.freeze(records);
    this.#byStableId = byStableId;
    this.count = records.length;
  }

  byLegacyId(id: number): QuranClassifiedRelationship {
    if (!Number.isSafeInteger(id) || id < 0 || id >= this.count) {
      throw new RangeError('Invalid curated relationship ID: ' + String(id));
    }
    return elementAt(this.#records, id);
  }

  byStableId(id: string): QuranClassifiedRelationship | undefined {
    return this.#byStableId.get(id);
  }

  forLink(link: QuranRelationship): QuranClassifiedRelationship {
    const classification = this.byLegacyId(link.id);
    if (classification.stableId !== curatedRelationshipStableId(link, this.source.id)) {
      throw new QuranEvidenceIntegrityError('link endpoints do not match their classification.');
    }
    return classification;
  }
}
