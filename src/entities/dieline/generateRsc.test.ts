// Strict mathematical unit tests for FEFCO 0201 (Regular Slotted Container / RSC)
import { describe, expect, it } from 'vitest';
import { computeSvgPathBoundsMm, generateRsc } from '@entities/dieline';

const VALID_SVG_PATH_REGEX = /^[MLCQZ\d.,\s-]+$/;
const DECIMAL_OVER_TWO_REGEX = /\.\d{3,}/;

const SHIPPING_SMALL = {
  length: 300,
  width: 200,
  height: 150,
  thickness: 0.5,
  bleedSize: 3,
};

describe('generateRsc (FEFCO 0201)', () => {
  it('computes exact totalWidth (with 35mm glue tab) and totalHeight = H + D/2 + D/2', () => {
    const dieline = generateRsc(SHIPPING_SMALL);

    expect(dieline.archetype).toBe('fefco-0201');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.unit).toBe('mm');

    // glue(35) + 2*(300+0.5) + 2*(200+0.5) = 35 + 601 + 401 = 1037 mm
    expect(dieline.totalWidth).toBe(1037);
    // H_eff(150.5) + outerTop(200.5/2 = 100.25) + outerBot(100.25) = 351 mm
    expect(dieline.totalHeight).toBe(351);

    // Zero-thickness check verifies exact textbook formula H + D/2 + D/2 = 150 + 100 + 100 = 350
    const zeroThickness = generateRsc({ ...SHIPPING_SMALL, thickness: 0 });
    expect(zeroThickness.totalHeight).toBe(350);
  });

  it('sizes outer flaps at D/2 so opposing flaps meet cleanly at the box center', () => {
    const dieline = generateRsc(SHIPPING_SMALL);
    const frontOuterTop = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    const backOuterTop = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-back')!.path,
    );
    const backOuterBot = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-back')!.path,
    );

    const expectedOuterHeight = (SHIPPING_SMALL.width + SHIPPING_SMALL.thickness) / 2;
    expect(frontOuterTop.height).toBeCloseTo(expectedOuterHeight, 4);
    expect(backOuterTop.height).toBeCloseTo(expectedOuterHeight, 4);
    expect(backOuterBot.height).toBeCloseTo(expectedOuterHeight, 4);
    expect(frontOuterTop.height + backOuterTop.height).toBeCloseTo(
      SHIPPING_SMALL.width + SHIPPING_SMALL.thickness,
      4,
    );
  });

  it('scales glue tab between 30mm and 35mm and trims inner flaps on narrow/square boxes to prevent collision', () => {
    const medium = generateRsc({
      length: 120,
      width: 80,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const mediumGlue = computeSvgPathBoundsMm(medium.faces.find((f) => f.id === 'glue-tab')!.path);
    expect(mediumGlue.width).toBe(30);

    // Narrow portrait box where front width (120.5) < depth (200.5): inner flaps must be < frontWidth/2
    const narrow = generateRsc({
      length: 120,
      width: 200,
      height: 150,
      thickness: 1,
      bleedSize: 3,
    });
    const leftInner = computeSvgPathBoundsMm(
      narrow.faces.find((f) => f.id === 'top-flap-left')!.path,
    );
    const frontOuter = computeSvgPathBoundsMm(
      narrow.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    expect(leftInner.height * 2).toBeLessThan(120 + 1);
    expect(leftInner.height).toBeLessThan(frontOuter.height);
    expect(narrow.totalHeight).toBe(151 + 100.5 + 100.5);
  });

  it('produces 13 valid faces, consistent references, valid SVG paths, and staged foldGroups', () => {
    const dieline = generateRsc(SHIPPING_SMALL);

    expect(dieline.faces).toHaveLength(13);
    const foldIds = new Set(dieline.folds.map((f) => f.id));
    const faceIds = new Set(dieline.faces.map((f) => f.id));

    for (const face of dieline.faces) {
      expect(face.folds.length).toBeGreaterThan(0);
      for (const foldId of face.folds) {
        expect(foldIds.has(foldId)).toBe(true);
      }
      for (const adjId of face.adjacentFaces) {
        expect(faceIds.has(adjId)).toBe(true);
      }
    }

    for (const path of [
      ...dieline.faces.map((f) => f.path),
      ...dieline.cuts.map((c) => c.path),
      ...dieline.bleeds.map((b) => b.path),
    ]) {
      expect(path).toMatch(VALID_SVG_PATH_REGEX);
      expect(path).not.toMatch(DECIMAL_OVER_TWO_REGEX);
    }

    const frontAssembly = dieline.foldGroups.find((g) => g.id === 'group-front-assembly')!;
    const bottomLeft = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-left')!;
    const leftWall = dieline.foldGroups.find((g) => g.id === 'group-left-wall')!;
    const innerTopLeft = dieline.foldGroups.find((g) => g.id === 'group-top-flap-left')!;
    const outerTopFront = dieline.foldGroups.find((g) => g.id === 'group-top-flap-front')!;

    expect(frontAssembly.pivotFoldId).toBe('fold-front-bottom-flap');
    expect(frontAssembly.foldStage).toEqual([0, 30]);
    expect(bottomLeft.foldStage).toEqual([0, 30]);
    expect(bottomLeft.layerOffsetDirection).toBe(1);
    expect(leftWall.foldStage).toEqual([30, 60]);
    expect(innerTopLeft.animatedAngleRange).toEqual([0, 90]);
    expect(outerTopFront.animatedAngleRange).toEqual([0, 90]);
    expect(innerTopLeft.layerOrder).toBe(0);
    expect(outerTopFront.layerOrder).toBe(1);
    expect(innerTopLeft.foldStage![1]).toBeLessThan(outerTopFront.foldStage![1]);
  });
});
