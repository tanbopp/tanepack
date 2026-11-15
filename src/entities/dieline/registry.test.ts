// Unit tests for DielineGeneratorRegistry and unified generateDieline router
import { describe, expect, it } from 'vitest';
import {
  computeSvgPathBoundsMm,
  DIELINE_ARCHETYPE_OPTIONS,
  type DielineArchetype,
  DielineGeneratorRegistry,
  FEFCO_CATALOG_ENTRIES,
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

const EXPECTED_ALL_ARCHETYPES: readonly DielineArchetype[] = [
  'tuck-end',
  'fefco-0200',
  'fefco-0201',
  'fefco-0202',
  'fefco-0203',
  'fefco-0204',
  'fefco-0205',
  'fefco-0206',
  'fefco-0207',
  'fefco-0208',
  'fefco-0209',
  'fefco-0210',
  'fefco-0211',
  'fefco-0212',
  'fefco-0214',
  'fefco-0215',
  'fefco-0216',
  'fefco-0217',
  'fefco-0218',
  'fefco-0219',
  'fefco-0220',
  'fefco-0221',
  'fefco-0222',
  'fefco-0225',
  'fefco-0226',
  'fefco-0227',
  'fefco-0228',
  'fefco-0229',
  'fefco-0229-1',
  'fefco-0230',
  'fefco-0231',
  'fefco-0232',
  'fefco-0233',
  'fefco-0233-1',
  'fefco-0240',
  'fefco-0241',
  'fefco-0242',
];

describe('DielineGeneratorRegistry & generateDieline', () => {
  it('registers Tuck-End and all 36 FEFCO 0200-series generators with category group metadata', () => {
    expect(Object.keys(DielineGeneratorRegistry)).toEqual(EXPECTED_ALL_ARCHETYPES);
    expect(DIELINE_ARCHETYPE_OPTIONS).toHaveLength(37);
    expect(FEFCO_CATALOG_ENTRIES).toHaveLength(36);
    expect(DIELINE_ARCHETYPE_OPTIONS[0]).toEqual({
      id: 'tuck-end',
      label: 'Tuck-End Box',
      group: 'Retail Cartons',
    });

    const slottedCount = DIELINE_ARCHETYPE_OPTIONS.filter(
      (opt) => opt.group === 'FEFCO 0200 (Slotted)',
    ).length;
    const tuckCount = DIELINE_ARCHETYPE_OPTIONS.filter(
      (opt) => opt.group === 'FEFCO 0200 (Tuck Top)',
    ).length;
    const crashLockCount = DIELINE_ARCHETYPE_OPTIONS.filter(
      (opt) => opt.group === 'FEFCO 0200 (Crash Lock)',
    ).length;
    expect(slottedCount + tuckCount + crashLockCount).toBe(36);
    expect(slottedCount).toBeGreaterThan(15);
    expect(tuckCount).toBeGreaterThan(5);
    expect(crashLockCount).toBeGreaterThan(4);

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

  it('generates valid SVG/kinematic graphs and exact PDF structural math across all 37 archetypes', () => {
    for (const archetype of EXPECTED_ALL_ARCHETYPES) {
      const dieline = generateDieline(archetype, SAMPLE_DIMENSIONS);
      expect(dieline.archetype).toBe(archetype);
      expect(dieline.totalWidth).toBeGreaterThan(200);
      expect(dieline.totalHeight).toBeGreaterThan(100);
      expect(dieline.faces.length).toBeGreaterThanOrEqual(8);
      expect(dieline.cuts.length).toBeGreaterThanOrEqual(1);

      const faceIds = new Set(dieline.faces.map((f) => f.id));
      const foldIds = new Set(dieline.folds.map((f) => f.id));
      expect(faceIds.has(dieline.baseFaceId)).toBe(true);
      for (const face of dieline.faces) {
        expect(face.folds.every((id) => foldIds.has(id))).toBe(true);
        expect(face.adjacentFaces.every((id) => faceIds.has(id))).toBe(true);
      }
      for (const group of dieline.foldGroups) {
        expect(foldIds.has(group.pivotFoldId)).toBe(true);
        expect(group.faceIds.every((id) => faceIds.has(id))).toBe(true);
      }
    }

    // Key PDF geometry assertions across special archetypes
    const f0210 = generateDieline('fefco-0210', SAMPLE_DIMENSIONS);
    expect(f0210.baseFaceId).toBe('bottom-flap-back');
    expect(f0210.folds.some((f) => f.id === 'fold-top-tuck-tongue')).toBe(true);
    expect(f0210.folds.some((f) => f.id === 'fold-bottom-tuck-tongue')).toBe(true);
    expect(f0210.totalHeight).toBeCloseTo(150.5 + 2 * (200.5 + 20), 2);

    const f0222 = generateDieline('fefco-0222', SAMPLE_DIMENSIONS);
    const leftBounds222 = computeSvgPathBoundsMm(f0222.faces.find((f) => f.id === 'left')!.path);
    const frontBounds222 = computeSvgPathBoundsMm(f0222.faces.find((f) => f.id === 'front')!.path);
    expect(leftBounds222.minX).toBeLessThan(frontBounds222.minX);

    const f0228 = generateDieline('fefco-0228', SAMPLE_DIMENSIONS);
    expect(f0228.faces.some((f) => f.id === 'wrap-side')).toBe(true);
    expect(f0228.faces.some((f) => f.id === 'back-right')).toBe(true);

    const f0230 = generateDieline('fefco-0230', SAMPLE_DIMENSIONS);
    const f0231 = generateDieline('fefco-0231', SAMPLE_DIMENSIONS);
    expect(f0230.faces.some((f) => f.id === 'glue-flange')).toBe(true);
    expect(f0231.faces.some((f) => f.id === 'glue-flange')).toBe(true);
    expect(f0230.faces.some((f) => f.id === 'glue-tab')).toBe(false);

    const f0240 = generateDieline('fefco-0240', SAMPLE_DIMENSIONS);
    const hangGroup = f0240.foldGroups.find((g) => g.id === 'group-top-flap-back')!;
    expect(hangGroup.animatedAngleRange).toEqual([0, 0]);

    expect(() =>
      generateDieline('unknown-box' as unknown as DielineArchetype, SAMPLE_DIMENSIONS),
    ).toThrow(/Unsupported dieline archetype/);
  });
});
