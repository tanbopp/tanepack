// Unit tests for DielineGeneratorRegistry and unified generateDieline router
import { describe, expect, it } from 'vitest';
import {
  DIELINE_ARCHETYPE_OPTIONS,
  type DielineArchetype,
  DielineGeneratorRegistry,
  generateDieline,
  generateFefco0200,
  generateFefco0203,
  generateFefco0215,
  generateRsc,
  generateTuckEndBox,
} from '@entities/dieline';

const SAMPLE_DIMENSIONS = {
  length: 300,
  width: 200,
  height: 150,
  thickness: 0.5,
  bleedSize: 3,
};

describe('DielineGeneratorRegistry & generateDieline', () => {
  it('registers Tuck-End, FEFCO 0200, FEFCO 0201, FEFCO 0203, and FEFCO 0215 generators', () => {
    expect(Object.keys(DielineGeneratorRegistry)).toEqual([
      'tuck-end',
      'fefco-0200',
      'fefco-0201',
      'fefco-0203',
      'fefco-0215',
    ]);
    expect(DIELINE_ARCHETYPE_OPTIONS).toEqual([
      { id: 'tuck-end', label: 'Tuck-End Box' },
      { id: 'fefco-0200', label: 'FEFCO 0200 (Half Slotted)' },
      { id: 'fefco-0201', label: 'FEFCO 0201 (RSC)' },
      { id: 'fefco-0203', label: 'FEFCO 0203 (Full Overlap)' },
      { id: 'fefco-0215', label: 'FEFCO 0215 (Overlap Top / RSC Bottom)' },
    ]);
    expect(DielineGeneratorRegistry['tuck-end']).toBe(generateTuckEndBox);
    expect(DielineGeneratorRegistry['fefco-0200']).toBe(generateFefco0200);
    expect(DielineGeneratorRegistry['fefco-0201']).toBe(generateRsc);
    expect(DielineGeneratorRegistry['fefco-0203']).toBe(generateFefco0203);
    expect(DielineGeneratorRegistry['fefco-0215']).toBe(generateFefco0215);
  });

  it('routes generateDieline cleanly for every supported archetype and validates unknown archetypes', () => {
    const tuck = generateDieline('tuck-end', SAMPLE_DIMENSIONS);
    const hsc = generateDieline('fefco-0200', SAMPLE_DIMENSIONS);
    const rsc = generateDieline('fefco-0201', SAMPLE_DIMENSIONS);
    const fosc = generateDieline('fefco-0203', SAMPLE_DIMENSIONS);
    const mix = generateDieline('fefco-0215', SAMPLE_DIMENSIONS);

    expect(tuck.archetype).toBe('tuck-end');
    expect(hsc.archetype).toBe('fefco-0200');
    expect(rsc.archetype).toBe('fefco-0201');
    expect(fosc.archetype).toBe('fefco-0203');
    expect(mix.archetype).toBe('fefco-0215');
    expect(fosc.totalHeight).toBeGreaterThan(mix.totalHeight);
    expect(mix.totalHeight).toBeGreaterThan(rsc.totalHeight);
    expect(rsc.totalHeight).toBeGreaterThan(hsc.totalHeight);

    expect(() =>
      generateDieline('unknown-box' as unknown as DielineArchetype, SAMPLE_DIMENSIONS),
    ).toThrow(/Unsupported dieline archetype/);
  });
});
