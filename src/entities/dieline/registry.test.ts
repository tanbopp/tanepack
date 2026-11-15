// Unit tests for DielineGeneratorRegistry and unified generateDieline router
import { describe, expect, it } from 'vitest';
import {
  DIELINE_ARCHETYPE_OPTIONS,
  type DielineArchetype,
  DielineGeneratorRegistry,
  generateDieline,
  generateFefco0203,
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
  it('registers exactly Tuck-End, FEFCO 0201 (RSC), and FEFCO 0203 generators', () => {
    expect(Object.keys(DielineGeneratorRegistry)).toEqual(['tuck-end', 'fefco-0201', 'fefco-0203']);
    expect(DIELINE_ARCHETYPE_OPTIONS).toEqual([
      { id: 'tuck-end', label: 'Tuck-End Box' },
      { id: 'fefco-0201', label: 'FEFCO 0201 (RSC)' },
      { id: 'fefco-0203', label: 'FEFCO 0203 (Full Overlap)' },
    ]);
    expect(DielineGeneratorRegistry['tuck-end']).toBe(generateTuckEndBox);
    expect(DielineGeneratorRegistry['fefco-0201']).toBe(generateRsc);
    expect(DielineGeneratorRegistry['fefco-0203']).toBe(generateFefco0203);
  });

  it('routes generateDieline cleanly for every supported archetype and validates unknown archetypes', () => {
    const tuck = generateDieline('tuck-end', SAMPLE_DIMENSIONS);
    const rsc = generateDieline('fefco-0201', SAMPLE_DIMENSIONS);
    const fosc = generateDieline('fefco-0203', SAMPLE_DIMENSIONS);

    expect(tuck.archetype).toBe('tuck-end');
    expect(rsc.archetype).toBe('fefco-0201');
    expect(fosc.archetype).toBe('fefco-0203');
    expect(fosc.totalHeight).toBeGreaterThan(rsc.totalHeight);

    expect(() =>
      generateDieline('unknown-box' as unknown as DielineArchetype, SAMPLE_DIMENSIONS),
    ).toThrow(/Unsupported dieline archetype/);
  });
});
