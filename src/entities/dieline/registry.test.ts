// Unit tests for DielineGeneratorRegistry and unified generateDieline router
import { describe, expect, it } from 'vitest';
import {
  DIELINE_ARCHETYPE_OPTIONS,
  type DielineArchetype,
  DielineGeneratorRegistry,
  generateDieline,
  generateFefco0200,
  generateFefco0202,
  generateFefco0203,
  generateFefco0204,
  generateFefco0205,
  generateFefco0206,
  generateFefco0209,
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
  it('registers Tuck-End and FEFCO 0200-series generators with group metadata', () => {
    expect(Object.keys(DielineGeneratorRegistry)).toEqual([
      'tuck-end',
      'fefco-0200',
      'fefco-0201',
      'fefco-0202',
      'fefco-0203',
      'fefco-0204',
      'fefco-0205',
      'fefco-0206',
      'fefco-0209',
      'fefco-0215',
    ]);
    expect(DIELINE_ARCHETYPE_OPTIONS).toHaveLength(10);
    expect(DIELINE_ARCHETYPE_OPTIONS[0]).toEqual({
      id: 'tuck-end',
      label: 'Tuck-End Box',
      group: 'Retail Cartons',
    });
    expect(
      DIELINE_ARCHETYPE_OPTIONS.filter((opt) => opt.group === 'FEFCO 0200 Series (Slotted)'),
    ).toHaveLength(9);

    expect(DielineGeneratorRegistry['tuck-end']).toBe(generateTuckEndBox);
    expect(DielineGeneratorRegistry['fefco-0200']).toBe(generateFefco0200);
    expect(DielineGeneratorRegistry['fefco-0201']).toBe(generateRsc);
    expect(DielineGeneratorRegistry['fefco-0202']).toBe(generateFefco0202);
    expect(DielineGeneratorRegistry['fefco-0203']).toBe(generateFefco0203);
    expect(DielineGeneratorRegistry['fefco-0204']).toBe(generateFefco0204);
    expect(DielineGeneratorRegistry['fefco-0205']).toBe(generateFefco0205);
    expect(DielineGeneratorRegistry['fefco-0206']).toBe(generateFefco0206);
    expect(DielineGeneratorRegistry['fefco-0209']).toBe(generateFefco0209);
    expect(DielineGeneratorRegistry['fefco-0215']).toBe(generateFefco0215);
  });

  it('routes generateDieline cleanly for every supported archetype and validates unknown archetypes', () => {
    const f0200 = generateDieline('fefco-0200', SAMPLE_DIMENSIONS);
    const f0209 = generateDieline('fefco-0209', SAMPLE_DIMENSIONS);
    const f0201 = generateDieline('fefco-0201', SAMPLE_DIMENSIONS);
    const f0202 = generateDieline('fefco-0202', SAMPLE_DIMENSIONS);
    const f0204 = generateDieline('fefco-0204', SAMPLE_DIMENSIONS);
    const f0205 = generateDieline('fefco-0205', SAMPLE_DIMENSIONS);
    const f0215 = generateDieline('fefco-0215', SAMPLE_DIMENSIONS);
    const f0203 = generateDieline('fefco-0203', SAMPLE_DIMENSIONS);
    const f0206 = generateDieline('fefco-0206', SAMPLE_DIMENSIONS);
    const tuck = generateDieline('tuck-end', SAMPLE_DIMENSIONS);

    expect(tuck.archetype).toBe('tuck-end');
    expect(f0206.totalHeight).toBe(f0203.totalHeight);
    expect(f0203.totalHeight).toBeGreaterThan(f0215.totalHeight);
    expect(f0215.totalHeight).toBeGreaterThan(f0205.totalHeight);
    expect(f0204.totalHeight).toBe(f0205.totalHeight);
    expect(f0205.totalHeight).toBeGreaterThan(f0202.totalHeight);
    expect(f0202.totalHeight).toBeGreaterThan(f0201.totalHeight);
    expect(f0201.totalHeight).toBeGreaterThan(f0209.totalHeight);
    expect(f0209.totalHeight).toBeGreaterThan(f0200.totalHeight);

    expect(() =>
      generateDieline('unknown-box' as unknown as DielineArchetype, SAMPLE_DIMENSIONS),
    ).toThrow(/Unsupported dieline archetype/);
  });
});
