// Type-level and unit contract tests for parametric dieline entities
import { describe, expect, expectTypeOf, it } from 'vitest';
import { generateTuckEndBox, type Dieline, type Unit } from '@entities/dieline';

describe('dieline entity types', () => {
  it('enforces ISO millimeter dimensions and returns tuck-end dieline contract', () => {
    expectTypeOf<Dieline['unit']>().toEqualTypeOf<Unit>();

    const dieline = generateTuckEndBox({
      length: 120,
      width: 60,
      height: 160,
      thickness: 0.5,
      bleedSize: 3,
    });

    expect(dieline.archetype).toBe('tuck-end');
    expect(dieline.baseFaceId).toBe('front');
    expect(dieline.unit).toBe('mm');
    expect(dieline.dimensions).toEqual({
      length: 120,
      width: 60,
      height: 160,
      thickness: 0.5,
      bleedSize: 3,
    });
  });
});
