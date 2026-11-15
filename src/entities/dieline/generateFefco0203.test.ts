// Strict mathematical unit tests for FEFCO 0203 (Full Overlap Slotted Container)
import { describe, expect, it } from 'vitest';
import { computeSvgPathBoundsMm, generateFefco0203 } from '@entities/dieline';

const SHIPPING_SMALL = {
  length: 300,
  width: 200,
  height: 150,
  thickness: 0.5,
  bleedSize: 3,
};

describe('generateFefco0203 (Full Overlap)', () => {
  it('computes exact totalWidth and totalHeight = H + D + D accounting for board thickness', () => {
    const dieline = generateFefco0203(SHIPPING_SMALL);

    expect(dieline.archetype).toBe('fefco-0203');
    expect(dieline.baseFaceId).toBe('bottom-flap-front');
    expect(dieline.totalWidth).toBe(1037);
    // H_eff(150.5) + topOuter(200.5) + botOuter(200.5) = 551.5 mm
    expect(dieline.totalHeight).toBe(551.5);

    // Zero-thickness check matches exact textbook formula H + D + D = 150 + 200 + 200 = 550
    const zeroThickness = generateFefco0203({ ...SHIPPING_SMALL, thickness: 0 });
    expect(zeroThickness.totalHeight).toBe(550);
  });

  it('sizes outer AND inner flaps at exact full Depth D (1.0 * W) per FEFCO 0203 PDF spec without inner clamping', () => {
    const dieline = generateFefco0203(SHIPPING_SMALL);

    const topOuterFront = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-front')!.path,
    );
    const topOuterBack = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-back')!.path,
    );
    const botOuterFront = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-front')!.path,
    );
    const topInnerLeft = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'top-flap-left')!.path,
    );
    const botInnerLeft = computeSvgPathBoundsMm(
      dieline.faces.find((f) => f.id === 'bottom-flap-left')!.path,
    );

    const fullDepthEff = SHIPPING_SMALL.width + SHIPPING_SMALL.thickness;
    expect(topOuterFront.height).toBeCloseTo(fullDepthEff, 4);
    expect(topOuterBack.height).toBeCloseTo(fullDepthEff, 4);
    expect(botOuterFront.height).toBeCloseTo(fullDepthEff, 4);
    expect(topInnerLeft.height).toBeCloseTo(fullDepthEff, 4);
    expect(botInnerLeft.height).toBeCloseTo(fullDepthEff, 4);
  });

  it('staggers Back outer and Front outer foldGroups plus colliding inner pairs to prevent Z-fighting', () => {
    const dieline = generateFefco0203(SHIPPING_SMALL);

    const innerLeft = dieline.foldGroups.find((g) => g.id === 'group-top-flap-left')!;
    const innerRight = dieline.foldGroups.find((g) => g.id === 'group-top-flap-right')!;
    const backOuterTop = dieline.foldGroups.find((g) => g.id === 'group-top-flap-back')!;
    const frontOuterTop = dieline.foldGroups.find((g) => g.id === 'group-top-flap-front')!;
    const botBackOuter = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-back')!;
    const botLeftInner = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-left')!;
    const botRightInner = dieline.foldGroups.find((g) => g.id === 'group-bottom-flap-right')!;

    expect(dieline.foldGroups.some((g) => g.id === 'group-bottom-flap-front')).toBe(false);
    expect(innerLeft.layerOrder).toBe(0);
    expect(innerRight.layerOrder).toBe(0);
    expect(innerRight.layerOffsetTier!).toBeGreaterThan(innerLeft.layerOffsetTier!);
    expect(backOuterTop.layerOrder).toBe(1);
    expect(frontOuterTop.layerOrder).toBe(2);

    // Bottom flaps stack upward inside box above anchored bottom-flap-front (Y = 0)
    expect(botBackOuter.layerOffsetDirection).toBe(1);
    expect(botBackOuter.layerOffsetTier).toBe(1);
    expect(botLeftInner.layerOffsetDirection).toBe(1);
    expect(botLeftInner.layerOffsetTier).toBe(2);
    expect(botRightInner.layerOffsetTier!).toBeGreaterThan(botLeftInner.layerOffsetTier!);

    // Inner closes first, Back outer closes underneath second, Front outer closes on top last
    expect(innerLeft.foldStage![1]).toBeLessThan(backOuterTop.foldStage![1]);
    expect(backOuterTop.foldStage![1]).toBeLessThan(frontOuterTop.foldStage![1]);
  });
});
