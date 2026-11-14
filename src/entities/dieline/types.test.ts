// Type-level and stub contract test for parametric dieline entities
import { describe, expect, expectTypeOf, it } from 'vitest';
import { generateTuckEndBox, type Dieline, type Unit } from '@entities/dieline';

describe('dieline entity types', () => {
  it('enforces ISO millimeter dimensions and throws on Step 2 stub', () => {
    expectTypeOf<Dieline['unit']>().toEqualTypeOf<Unit>();
    expect(() =>
      generateTuckEndBox({
        length: 120,
        width: 60,
        height: 160,
        thickness: 0.5,
        bleedSize: 3,
      }),
    ).toThrow('Not implemented — see Step 2 prompt');
  });
});
