// Unit tests for scalable parametric FecfoFactory engine (dynamic top/bottom configs & constraints)
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
  it('generates 9-face FEFCO 0200 (Half Slotted Container) with open top and RSC bottom anchored flat', () => {
    const dieline = generateDieline('fefco-0200', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0200');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.faces).toHaveLength(9);
    expect(dieline.faces.some((f) => f.id.startsWith('top-flap-'))).toBe(false);
    expect(dieline.folds.some((f) => f.id.includes('-top-flap'))).toBe(false);

    // totalHeight = H_eff(150.5) + bottomOuter(200.5/2 = 100.25) = 250.75 mm
    expect(dieline.totalWidth).toBe(1037);
    expect(dieline.totalHeight).toBe(250.75);

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

  it('generates asymmetric FEFCO 0215 (Full Overlap top + RSC bottom) with exact flap heights', () => {
    const dieline = generateDieline('fefco-0215', SAMPLE_DIMENSIONS);

    expect(dieline.archetype).toBe('fefco-0215');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.faces).toHaveLength(13);

    // totalHeight = topOuterFull(200.5) + H_eff(150.5) + bottomOuterRsc(100.25) = 451.25 mm
    expect(dieline.totalHeight).toBe(451.25);

    const topFrontOuter = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    const botBackOuter = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-back')!.path,
    );
    expect(topFrontOuter.height).toBeCloseTo(200.5, 4);
    expect(botBackOuter.height).toBeCloseTo(100.25, 4);

    const topFrontGroup = dieline.foldGroups.find((g) => g.id === 'group-top-flap-front')!;
    const botBackGroup = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-back')!;
    expect(topFrontGroup.layerOrder).toBe(2);
    expect(botBackGroup.layerOffsetTier).toBe(0);
  });

  it('throws a clear unimplemented error for crash-lock or tuck configs instead of silently mis-generating', () => {
    const crashLockConfig: FefcoConfig = {
      id: 'fefco-0201',
      name: 'Future Crash-Lock Prototype',
      flapConfig: { top: 'tuck', bottom: 'crash-lock' },
      panelStyle: 'standard',
    };

    expect(() => generateFefcoBox(crashLockConfig, SAMPLE_DIMENSIONS)).toThrow(
      /not implemented yet/,
    );
  });
});
