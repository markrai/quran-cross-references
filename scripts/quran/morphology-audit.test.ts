import { describe, expect, it } from 'vitest';
import { auditQac, parseQacWords } from './morphology-audit.ts';

const notice = [
  '# Quranic Arabic Corpus (Version 0.4)',
  '# Copyright (C) 2011 Kais Dukes',
  '# License: GNU General Public License',
  '# CHANGING IT IS NOT ALLOWED',
].join('\n');

const fixture = [
  '(1:1:1:1)\tbi\tP\tPREFIX|bi+',
  '(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw|M|GEN',
  '(1:1:2:1)\t{ll~ahi\tPN\tSTEM|POS:PN|LEM:{ll~ah|ROOT:Alh|GEN',
].join('\n');

describe('QAC morphology audit intake', () => {
  it('extracts positions, stems and language features without inferring links', () => {
    const parsed = parseQacWords(notice + '\n' + fixture);
    expect(parsed.segmentCount).toBe(3);
    expect(parsed.stemCount).toBe(2);
    expect(parsed.words).toEqual([
      {
        ayah: 0,
        position: 1,
        segments: 2,
        stems: 1,
        lemmas: ['{som'],
        roots: ['smw'],
      },
      {
        ayah: 0,
        position: 2,
        segments: 1,
        stems: 1,
        lemmas: ['{ll~ah'],
        roots: ['Alh'],
      },
    ]);
  });

  it('keeps multiple stems and missing root/lemma explicitly visible', () => {
    const rows = [
      '(1:1:1:1)\tb\tN\tSTEM|POS:N|LEM:word|ROOT:abc',
      '(1:1:1:2)\tc\tN\tSTEM|POS:N|LEM:other',
    ].join('\n');
    const parsed = parseQacWords(notice + '\n' + rows);
    expect(parsed.words[0]?.stems).toBe(2);
    expect(parsed.words[0]?.lemmas).toEqual(['word', 'other']);
    expect(parsed.words[0]?.roots).toEqual(['abc']);
  });

  it('fails closed on missing notice, malformed locations and noncontiguous ordering', () => {
    expect(() => parseQacWords(fixture)).toThrow('license');
    expect(() => parseQacWords(notice + '\n(115:1:1:1)\ta\tN\tSTEM')).toThrow('outside');
    expect(() => parseQacWords(notice + '\n(1:1:1:2)\ta\tN\tSTEM')).toThrow('ordered');
    expect(() => parseQacWords(notice + '\n(1:1:1:1)\ta\tN\tSTEM\n(1:1:1:3)\tb\tP\tPREFIX')).toThrow('consecutive');
    expect(() => parseQacWords(notice + '\n(1:1:1:1)\ta\tP\tPREFIX')).toThrow('lacks');
    expect(() => parseQacWords(notice + '\n(1:1:1:1)\ta\tN')).toThrow('four-column');
    expect(() => parseQacWords(notice + '\n(1:1:1:1)\ta\tN\tSTEM\n(1:1:3:1)\tb\tN\tSTEM')).toThrow('contiguous');
  });

  it('rejects substitute or incomplete licensed corpus bytes before any alignment claims', () => {
    expect(() => auditQac(Buffer.from(notice + '\n' + fixture), [])).toThrow('Canonical');
    expect(() =>
      auditQac(Buffer.from(notice + '\n' + fixture), Array.from({ length: 6236 }, () => 'بِسْمِ')),
    ).toThrow('byte length');
  });
});
