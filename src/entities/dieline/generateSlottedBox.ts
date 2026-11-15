// Shared parametric FEFCO slotted container generator (FEFCO 0201 RSC & FEFCO 0203 Full Overlap)
import type { Bleed, Cut, Dieline, Face, Fold, FoldGroup } from '@entities/dieline/types';
import {
  buildGlueTabPath,
  buildSlottedBleedPath,
  buildSlottedCutPath,
  rectPath,
  roundMm,
  validateDimensions,
} from './geometry.ts';

export interface SlottedBoxSpec {
  archetype: 'fefco-0201' | 'fefco-0203';
  /** Outer flap length multiplier relative to Depth (`D_eff = width + thickness`): 0.5 for 0201, 1 for 0203. */
  outerFlapRatio: 0.5 | 1;
  /** True for FEFCO 0203 where opposing Front & Back outer flaps overlap completely and require distinct 3D Z layers. */
  overlapOuterFlaps: boolean;
}

/**
 * Generates a complete 13-face slotted shipping carton dieline (4 walls, 1 glue tab, 8 flaps)
 * accounting for board thickness, manufacturer's glue lap, and inter-flap slot clearances.
 */
export function generateSlottedBox(
  dimensions: Dieline['dimensions'],
  spec: SlottedBoxSpec,
): Dieline {
  validateDimensions(dimensions);

  const { length, width, height, thickness, bleedSize } = dimensions;

  // Standard corrugated manufacturer's glue joint: 35mm for larger cartons, 30mm for mid-size, scaled for compact boxes
  const minFootprint = Math.min(length, width);
  const glueWidth =
    minFootprint >= 150
      ? 35
      : minFootprint >= 60
        ? 30
        : roundMm(Math.max(12, Math.min(30, minFootprint * 0.4)));

  // Score-to-score panel dimensions include 1x board thickness allowance per bend
  const leftWidth = roundMm(width + thickness);
  const frontWidth = roundMm(length + thickness);
  const rightWidth = roundMm(width + thickness);
  const backWidth = roundMm(length + thickness);
  const bodyHeight = roundMm(height + thickness);

  const x0 = 0;
  const x1 = roundMm(x0 + glueWidth);
  const x2 = roundMm(x1 + leftWidth);
  const x3 = roundMm(x2 + frontWidth);
  const x4 = roundMm(x3 + rightWidth);
  const x5 = roundMm(x4 + backWidth);

  const glueTaper = roundMm(Math.min(10, bodyHeight * 0.15, glueWidth * 0.35));

  // Slot allowance between adjacent flaps prevents board binding/tearing on 90-degree fold
  const baseSlotHalf = Math.max(1.5, thickness * 1.5 + 1);
  const flapInset = roundMm(Math.min(leftWidth * 0.08, frontWidth * 0.08, baseSlotHalf));

  // Outer flaps close across Left/Right depth span (D_eff); 0201 = D/2 (center-meeting), 0203 = D (full overlap)
  const outerFlapHeight = roundMm(leftWidth * spec.outerFlapRatio);

  // Inner flaps close across Front/Back span (W_eff), trimmed below W_eff/2 and capped at outerFlapHeight
  const innerCollisionMargin = Math.max(1.5, thickness * 1.5 + 1);
  const maxSafeInnerHeight = Math.max(4, frontWidth * 0.5 - innerCollisionMargin);
  const innerFlapHeight = roundMm(Math.min(outerFlapHeight, maxSafeInnerHeight));

  const y0 = 0;
  const yBodyTop = outerFlapHeight;
  const yTopInner = roundMm(yBodyTop - innerFlapHeight);
  const yBodyBot = roundMm(yBodyTop + bodyHeight);
  const yBotInner = roundMm(yBodyBot + innerFlapHeight);
  const yMax = roundMm(yBodyBot + outerFlapHeight);

  const flapLeftWidth = roundMm(leftWidth - 2 * flapInset);
  const flapFrontWidth = roundMm(frontWidth - 2 * flapInset);
  const flapRightWidth = roundMm(rightWidth - 2 * flapInset);
  const flapBackWidth = roundMm(backWidth - 2 * flapInset);

  const folds: Fold[] = [
    { id: 'fold-glue-left', from: { x: x1, y: yBodyTop }, to: { x: x1, y: yBodyBot }, angle: 90 },
    { id: 'fold-left-front', from: { x: x2, y: yBodyTop }, to: { x: x2, y: yBodyBot }, angle: 90 },
    { id: 'fold-front-right', from: { x: x3, y: yBodyTop }, to: { x: x3, y: yBodyBot }, angle: 90 },
    { id: 'fold-right-back', from: { x: x4, y: yBodyTop }, to: { x: x4, y: yBodyBot }, angle: 90 },
    {
      id: 'fold-left-top-flap',
      from: { x: roundMm(x1 + flapInset), y: yBodyTop },
      to: { x: roundMm(x2 - flapInset), y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-front-top-flap',
      from: { x: roundMm(x2 + flapInset), y: yBodyTop },
      to: { x: roundMm(x3 - flapInset), y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-right-top-flap',
      from: { x: roundMm(x3 + flapInset), y: yBodyTop },
      to: { x: roundMm(x4 - flapInset), y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-back-top-flap',
      from: { x: roundMm(x4 + flapInset), y: yBodyTop },
      to: { x: roundMm(x5 - flapInset), y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-left-bottom-flap',
      from: { x: roundMm(x1 + flapInset), y: yBodyBot },
      to: { x: roundMm(x2 - flapInset), y: yBodyBot },
      angle: 90,
    },
    {
      id: 'fold-front-bottom-flap',
      from: { x: roundMm(x2 + flapInset), y: yBodyBot },
      to: { x: roundMm(x3 - flapInset), y: yBodyBot },
      angle: 90,
    },
    {
      id: 'fold-right-bottom-flap',
      from: { x: roundMm(x3 + flapInset), y: yBodyBot },
      to: { x: roundMm(x4 - flapInset), y: yBodyBot },
      angle: 90,
    },
    {
      id: 'fold-back-bottom-flap',
      from: { x: roundMm(x4 + flapInset), y: yBodyBot },
      to: { x: roundMm(x5 - flapInset), y: yBodyBot },
      angle: 90,
    },
  ];

  const faces: Face[] = [
    {
      id: 'front',
      name: 'Front',
      path: rectPath(x2, yBodyTop, frontWidth, bodyHeight),
      folds: [
        'fold-left-front',
        'fold-front-right',
        'fold-front-top-flap',
        'fold-front-bottom-flap',
      ],
      adjacentFaces: ['left', 'right', 'top-flap-front', 'bottom-flap-front'],
    },
    {
      id: 'right',
      name: 'Right Side',
      path: rectPath(x3, yBodyTop, rightWidth, bodyHeight),
      folds: [
        'fold-front-right',
        'fold-right-back',
        'fold-right-top-flap',
        'fold-right-bottom-flap',
      ],
      adjacentFaces: ['front', 'back', 'top-flap-right', 'bottom-flap-right'],
    },
    {
      id: 'back',
      name: 'Back',
      path: rectPath(x4, yBodyTop, backWidth, bodyHeight),
      folds: ['fold-right-back', 'fold-back-top-flap', 'fold-back-bottom-flap'],
      adjacentFaces: ['right', 'top-flap-back', 'bottom-flap-back'],
    },
    {
      id: 'left',
      name: 'Left Side',
      path: rectPath(x1, yBodyTop, leftWidth, bodyHeight),
      folds: ['fold-glue-left', 'fold-left-front', 'fold-left-top-flap', 'fold-left-bottom-flap'],
      adjacentFaces: ['glue-tab', 'front', 'top-flap-left', 'bottom-flap-left'],
    },
    {
      id: 'glue-tab',
      name: 'Glue Tab',
      path: buildGlueTabPath(x0, x1, yBodyTop, yBodyBot, glueTaper),
      folds: ['fold-glue-left'],
      adjacentFaces: ['left'],
    },
    {
      id: 'top-flap-left',
      name: 'Top Left Inner Flap',
      path: rectPath(x1 + flapInset, yTopInner, flapLeftWidth, innerFlapHeight),
      folds: ['fold-left-top-flap'],
      adjacentFaces: ['left'],
    },
    {
      id: 'top-flap-front',
      name: 'Top Front Outer Flap',
      path: rectPath(x2 + flapInset, y0, flapFrontWidth, outerFlapHeight),
      folds: ['fold-front-top-flap'],
      adjacentFaces: ['front'],
    },
    {
      id: 'top-flap-right',
      name: 'Top Right Inner Flap',
      path: rectPath(x3 + flapInset, yTopInner, flapRightWidth, innerFlapHeight),
      folds: ['fold-right-top-flap'],
      adjacentFaces: ['right'],
    },
    {
      id: 'top-flap-back',
      name: 'Top Back Outer Flap',
      path: rectPath(x4 + flapInset, y0, flapBackWidth, outerFlapHeight),
      folds: ['fold-back-top-flap'],
      adjacentFaces: ['back'],
    },
    {
      id: 'bottom-flap-left',
      name: 'Bottom Left Inner Flap',
      path: rectPath(x1 + flapInset, yBodyBot, flapLeftWidth, innerFlapHeight),
      folds: ['fold-left-bottom-flap'],
      adjacentFaces: ['left'],
    },
    {
      id: 'bottom-flap-front',
      name: 'Bottom Front Outer Flap',
      path: rectPath(x2 + flapInset, yBodyBot, flapFrontWidth, outerFlapHeight),
      folds: ['fold-front-bottom-flap'],
      adjacentFaces: ['front'],
    },
    {
      id: 'bottom-flap-right',
      name: 'Bottom Right Inner Flap',
      path: rectPath(x3 + flapInset, yBodyBot, flapRightWidth, innerFlapHeight),
      folds: ['fold-right-bottom-flap'],
      adjacentFaces: ['right'],
    },
    {
      id: 'bottom-flap-back',
      name: 'Bottom Back Outer Flap',
      path: rectPath(x4 + flapInset, yBodyBot, flapBackWidth, outerFlapHeight),
      folds: ['fold-back-bottom-flap'],
      adjacentFaces: ['back'],
    },
  ];

  const layoutParams = {
    x0,
    x1,
    x2,
    x3,
    x4,
    x5,
    y0,
    yTopInner,
    yBodyTop,
    yBodyBot,
    yBotInner,
    yMax,
    flapInset,
    glueTaper,
    bleedSize,
  };

  const cuts: Cut[] = [{ id: 'cut-perimeter', path: buildSlottedCutPath(layoutParams) }];
  const bleeds: Bleed[] = [{ id: 'bleed-perimeter', path: buildSlottedBleedPath(layoutParams) }];

  // Outer flaps close after inner side flaps; 0203 staggers Front & Back outer flaps into distinct Z layers
  const backOuterStage: [number, number] = spec.overlapOuterFlaps ? [55, 82] : [55, 90];
  const frontOuterStage: [number, number] = spec.overlapOuterFlaps ? [65, 90] : [55, 90];
  const backOuterLayer = 1;
  const frontOuterLayer = spec.overlapOuterFlaps ? 2 : 1;

  const foldGroups: FoldGroup[] = [
    {
      id: 'group-left-wall',
      name: 'Left Wall Assembly',
      faceIds: ['left', 'glue-tab', 'top-flap-left', 'bottom-flap-left'],
      pivotFoldId: 'fold-left-front',
      animatedAngleRange: [0, 90],
      foldStage: [0, 50],
    },
    {
      id: 'group-glue-tab',
      name: 'Glue Tab',
      faceIds: ['glue-tab'],
      pivotFoldId: 'fold-glue-left',
      animatedAngleRange: [0, 90],
      foldStage: [0, 50],
      layerOrder: 0,
    },
    {
      id: 'group-top-flap-left',
      name: 'Top Left Inner Flap',
      faceIds: ['top-flap-left'],
      pivotFoldId: 'fold-left-top-flap',
      animatedAngleRange: [0, 90],
      foldStage: [35, 70],
      layerOrder: 0,
    },
    {
      id: 'group-bottom-flap-left',
      name: 'Bottom Left Inner Flap',
      faceIds: ['bottom-flap-left'],
      pivotFoldId: 'fold-left-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: [35, 70],
      layerOrder: 0,
    },
    {
      id: 'group-right-wall',
      name: 'Right Wall Assembly',
      faceIds: [
        'right',
        'top-flap-right',
        'bottom-flap-right',
        'back',
        'top-flap-back',
        'bottom-flap-back',
      ],
      pivotFoldId: 'fold-front-right',
      animatedAngleRange: [0, 90],
      foldStage: [0, 50],
    },
    {
      id: 'group-top-flap-right',
      name: 'Top Right Inner Flap',
      faceIds: ['top-flap-right'],
      pivotFoldId: 'fold-right-top-flap',
      animatedAngleRange: [0, 90],
      foldStage: [35, 70],
      layerOrder: 0,
    },
    {
      id: 'group-bottom-flap-right',
      name: 'Bottom Right Inner Flap',
      faceIds: ['bottom-flap-right'],
      pivotFoldId: 'fold-right-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: [35, 70],
      layerOrder: 0,
    },
    {
      id: 'group-back-wall',
      name: 'Back Wall Assembly',
      faceIds: ['back', 'top-flap-back', 'bottom-flap-back'],
      pivotFoldId: 'fold-right-back',
      animatedAngleRange: [0, 90],
      foldStage: [0, 50],
    },
    {
      id: 'group-top-flap-back',
      name: 'Top Back Outer Flap',
      faceIds: ['top-flap-back'],
      pivotFoldId: 'fold-back-top-flap',
      animatedAngleRange: [0, 90],
      foldStage: backOuterStage,
      layerOrder: backOuterLayer,
    },
    {
      id: 'group-bottom-flap-back',
      name: 'Bottom Back Outer Flap',
      faceIds: ['bottom-flap-back'],
      pivotFoldId: 'fold-back-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: backOuterStage,
      layerOrder: backOuterLayer,
    },
    {
      id: 'group-top-flap-front',
      name: 'Top Front Outer Flap',
      faceIds: ['top-flap-front'],
      pivotFoldId: 'fold-front-top-flap',
      animatedAngleRange: [0, 90],
      foldStage: frontOuterStage,
      layerOrder: frontOuterLayer,
    },
    {
      id: 'group-bottom-flap-front',
      name: 'Bottom Front Outer Flap',
      faceIds: ['bottom-flap-front'],
      pivotFoldId: 'fold-front-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: frontOuterStage,
      layerOrder: frontOuterLayer,
    },
  ];

  return {
    archetype: spec.archetype,
    dimensions: {
      length,
      width,
      height,
      thickness,
      bleedSize,
    },
    unit: 'mm',
    totalWidth: x5,
    totalHeight: yMax,
    faces,
    cuts,
    folds,
    bleeds,
    foldGroups,
  };
}
