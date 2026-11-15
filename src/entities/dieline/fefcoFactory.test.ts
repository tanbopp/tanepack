// Unit tests for scalable parametric FefcoFactory engine (0200-series PDF math, glue tab, & 3D kinematics)
import { describe, expect, it } from 'vitest';
import {
  computeSvgPathBoundsMm,
  generateDieline,
  generateFefcoBox,
  type FefcoConfig,
} from '@entities/dieline';

const VALID_SVG_PATH_REGEX = /^[MLQZ\d.,\s-]+$/;

const SAMPLE_DIMENSIONS = {
  length: 300,
  width: 200,
  height: 150,
  thickness: 0.5,
  bleedSize: 3,
};

describe('FefcoFactory (generateFefcoBox)', () => {
  it('generates 9-face FEFCO 0200 (Half Slotted Container) with open top and W/2 RSC bottom anchored flat', () => {
    const dieline = generateDieline('fefco-0200', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0200');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.faces).toHaveLength(9);
    expect(dieline.faces.some((f) => f.id.startsWith('top-flap-'))).toBe(false);
    expect(dieline.folds.some((f) => f.id.includes('-top-flap'))).toBe(false);

    // totalHeight = H_eff(150.5) + bottomOuter(200.5/2 = 100.25) = 250.75 mm
    expect(dieline.totalWidth).toBe(1037);
    expect(dieline.totalHeight).toBe(250.75);

    const botFrontBounds = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-front')!.path,
    );
    expect(botFrontBounds.height).toBeCloseTo(100.25, 4);

    const foldIds = new Set(dieline.folds.map((f) => f.id));
    const faceIds = new Set(dieline.faces.map((f) => f.id));
    for (const face of dieline.faces) {
      expect(face.folds.every((id) => foldIds.has(id))).toBe(true);
      expect(face.adjacentFaces.every((id) => faceIds.has(id))).toBe(true);
    }

    for (const path of [
      ...dieline.faces.map((f) => f.path),
      ...dieline.cuts.map((c) => c.path),
      ...dieline.bleeds.map((b) => b.path),
    ]) {
      expect(path).toMatch(VALID_SVG_PATH_REGEX);
    }
  });

  it('generates FEFCO 0202 (Overlap Slotted) with ½(W + o) = 0.55*W flaps and staggered top/bottom 3D stacking', () => {
    const dieline = generateDieline('fefco-0202', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0202');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.faces).toHaveLength(13);

    // 200.5 * 0.55 = 110.275 -> roundMm = 110.28 mm; totalHeight = 150.5 + 110.28 + 110.28 = 371.06 mm
    const topOuterFront = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    const topInnerLeft = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-left')!.path,
    );
    const botBackOuter = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-back')!.path,
    );
    expect(topOuterFront.height).toBeCloseTo(110.28, 4);
    expect(topInnerLeft.height).toBeCloseTo(110.28, 4);
    expect(botBackOuter.height).toBeCloseTo(110.28, 4);
    expect(dieline.totalHeight).toBe(371.06);

    // Zero-thickness check: W=200 => ½(W + 0.1*W) = 110 mm => H + 110 + 110 = 370 mm
    const zeroThickness = generateDieline('fefco-0202', { ...SAMPLE_DIMENSIONS, thickness: 0 });
    expect(zeroThickness.totalHeight).toBe(370);

    // Verify anti-Z-fighting stacking for partial-overlap flaps on both top and bottom
    const leftWall = dieline.foldGroups.find((g) => g.id === 'group-left-wall')!;
    const topInner = dieline.foldGroups.find((g) => g.id === 'group-top-flap-left')!;
    const topBackOuter = dieline.foldGroups.find((g) => g.id === 'group-top-flap-back')!;
    const topFrontOuter = dieline.foldGroups.find((g) => g.id === 'group-top-flap-front')!;
    const botBackGroup = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-back')!;
    const botLeftGroup = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-left')!;

    expect(leftWall.foldStage).toEqual([30, 60]);
    expect(topInner.foldStage![0]).toBeGreaterThanOrEqual(leftWall.foldStage![1]);
    expect(topBackOuter.foldStage![0]).toBeGreaterThanOrEqual(topInner.foldStage![1]);
    expect(topBackOuter.foldStage![1]).toBeLessThan(topFrontOuter.foldStage![1]);
    expect(topInner.layerOrder).toBe(0);
    expect(topBackOuter.layerOrder).toBe(1);
    expect(topFrontOuter.layerOrder).toBe(2);
    expect(botBackGroup.layerOffsetTier).toBe(1);
    expect(botLeftGroup.layerOffsetTier).toBe(2);
  });

  it('generates FEFCO 0204 (Center Special Slotted) with ½ W outer flaps and taller ½ L inner flaps without negative Y coords', () => {
    const dieline = generateDieline('fefco-0204', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0204');
    // Inner = (300 + 0.5)/2 = 150.25 mm (> outer 100.25 mm) -> totalHeight = 150.25 + 150.5 + 150.25 = 451 mm
    expect(dieline.totalHeight).toBe(451);

    const topInner = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-left')!.path,
    );
    const topOuter = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    expect(topInner.height).toBeCloseTo(150.25, 4);
    expect(topInner.minY).toBe(0);
    expect(topOuter.height).toBeCloseTo(100.25, 4);
    expect(topOuter.minY).toBeCloseTo(50, 4);

    // Cut perimeter starts flush inside [0, totalHeight]
    const cutBounds = computeSvgPathBoundsMm(dieline.cuts[0]!.path);
    expect(cutBounds.minY).toBe(0);
    expect(cutBounds.maxY).toBe(451);
  });

  it('generates FEFCO 0205 (Center Special Overlap) with ½ L flaps, overlapping outer pairs, and edge-meeting inner pairs', () => {
    const dieline = generateDieline('fefco-0205', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0205');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.faces).toHaveLength(13);

    // PDF formula: top = ½ L = 150.25, bottom = ½ L = 150.25 -> totalHeight = 150.5 + 150.25 + 150.25 = 451 mm
    expect(dieline.totalHeight).toBe(451);

    const topOuterFront = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    const topInnerLeft = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-left')!.path,
    );
    const botOuterBack = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-back')!.path,
    );
    expect(topOuterFront.height).toBeCloseTo(150.25, 4);
    expect(topInnerLeft.height).toBeCloseTo(150.25, 4);
    expect(botOuterBack.height).toBeCloseTo(150.25, 4);

    // Outer flaps (150.25 * 2 = 300.5 > W_eff 200.5) overlap and must stagger in 3D
    const topBackOuterGroup = dieline.foldGroups.find((g) => g.id === 'group-top-flap-back')!;
    const topFrontOuterGroup = dieline.foldGroups.find((g) => g.id === 'group-top-flap-front')!;
    const botBackGroup = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-back')!;
    expect(topBackOuterGroup.layerOrder).toBe(1);
    expect(topFrontOuterGroup.layerOrder).toBe(2);
    expect(topFrontOuterGroup.layerOffsetTier).toBe(2);
    expect(botBackGroup.layerOffsetTier).toBe(1);
  });

  it('generates FEFCO 0206 and FEFCO 0209 matching PDF center-special full-overlap and short-flap ratios', () => {
    const f0206 = generateDieline('fefco-0206', SAMPLE_DIMENSIONS);
    expect(f0206.totalHeight).toBe(551.5);
    expect(
      computeSvgPathBoundsMm(f0206.faces.find((f) => f.id === 'top-flap-left')!.path).height,
    ).toBeCloseTo(150.25, 4);
    expect(
      computeSvgPathBoundsMm(f0206.faces.find((f) => f.id === 'top-flap-front')!.path).height,
    ).toBeCloseTo(200.5, 4);

    const f0209 = generateDieline('fefco-0209', SAMPLE_DIMENSIONS);
    // top = 0.25 * 200.5 = 50.13 mm; bottom = 0.5 * 200.5 = 100.25 mm -> 300.88 mm
    expect(
      computeSvgPathBoundsMm(f0209.faces.find((f) => f.id === 'top-flap-front')!.path).height,
    ).toBeCloseTo(50.13, 4);
    expect(
      computeSvgPathBoundsMm(f0209.faces.find((f) => f.id === 'bottom-flap-back')!.path).height,
    ).toBeCloseTo(100.25, 4);
    expect(f0209.totalHeight).toBe(300.88);
  });

  it('generates PDF-calibrated FEFCO 0215 (Tuck Top 1.0W + 0.37W dust + 1-2-3 Snap-Lock bottom) with 12 faces', () => {
    const dieline = generateDieline('fefco-0215', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0215');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    // GlueTab + 4 body walls + 3 top flaps (back lid + 2 dust) + 4 snap-lock bottom flaps = 12 faces
    expect(dieline.faces).toHaveLength(12);
    expect(dieline.faces.some((f) => f.id === 'top-flap-front')).toBe(false);

    const topLid = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-back')!.path,
    );
    const topDust = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-left')!.path,
    );
    const botLockFront = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-front')!.path,
    );
    // 1.0 * W_eff (200.5) + tuckDepth (20) = 220.5 mm top lid
    expect(topLid.height).toBeCloseTo(220.5, 4);
    expect(topDust.height).toBeCloseTo(74.19, 2);
    expect(botLockFront.height).toBeCloseTo(roundTo2(0.63 * 200.5), 2);

    const tuckLidFace = dieline.faces.find((f) => f.id === 'top-flap-back')!;
    expect(tuckLidFace.folds).toContain('fold-top-tuck-tongue');

    const topLidGroup = dieline.foldGroups.find((g) => g.id === 'group-top-flap-back')!;
    expect(topLidGroup.tongueLayerOrder).toBe(-1);
    expect(topLidGroup.tongueLayerOffsetMm).toBeLessThan(0);
  });

  it('supports hasGlueTab: false by omitting glue-tab face/fold/group and closing cut/bleed paths cleanly at x = 0', () => {
    const noGlueConfig: FefcoConfig = {
      id: 'fefco-0201',
      name: 'No Glue Joint RSC',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapMath: { topOuter: 0.5, bottomOuter: 0.5, inner: 0.5 },
      hasGlueTab: false,
    };

    const dieline = generateFefcoBox(noGlueConfig, SAMPLE_DIMENSIONS);
    // totalWidth = 2*(300+0.5) + 2*(200+0.5) = 1002 mm (35 mm glue tab removed)
    expect(dieline.totalWidth).toBe(1002);
    expect(dieline.faces).toHaveLength(12);
    expect(dieline.faces.some((f) => f.id === 'glue-tab')).toBe(false);
    expect(dieline.folds.some((f) => f.id === 'fold-glue-left')).toBe(false);
    expect(dieline.foldGroups.some((g) => g.id === 'group-glue-tab')).toBe(false);

    const cutBounds = computeSvgPathBoundsMm(dieline.cuts[0]!.path);
    expect(cutBounds.minX).toBe(0);
    expect(cutBounds.maxX).toBe(1002);
    expect(dieline.cuts[0]!.path).toMatch(VALID_SVG_PATH_REGEX);
    expect(dieline.bleeds[0]!.path).toMatch(VALID_SVG_PATH_REGEX);
  });

  it('supports tuck + crash-lock configs natively and throws cleanly for unsupported flap types', () => {
    const tuckCrashConfig: FefcoConfig = {
      id: 'fefco-0233',
      name: 'Tuck + Crash-Lock Combo',
      flapConfig: { top: 'tuck', bottom: 'crash-lock' },
      panelStyle: 'standard',
    };

    const dieline = generateFefcoBox(tuckCrashConfig, SAMPLE_DIMENSIONS);
    expect(dieline.faces.some((f) => f.id === 'top-flap-back')).toBe(true);
    expect(dieline.folds.some((f) => f.id === 'fold-top-tuck-tongue')).toBe(true);
    expect(dieline.cuts[0]!.path).toMatch(VALID_SVG_PATH_REGEX);

    const invalidConfig = {
      id: 'fefco-0201',
      name: 'Unsupported Prototype',
      flapConfig: { top: 'invalid-flap' },
    } as unknown as FefcoConfig;

    expect(() => generateFefcoBox(invalidConfig, SAMPLE_DIMENSIONS)).toThrow(
      /Unsupported FEFCO top flap type/,
    );
  });
});

function roundTo2(v: number): number {
  return Math.round(v * 100) / 100;
}
