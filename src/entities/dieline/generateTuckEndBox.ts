// Pure parametric generator for standard reverse tuck-end folding carton dielines
import type { Bleed, Cut, Dieline, Face, Fold, FoldGroup } from '@entities/dieline/types';
import {
  buildDustFlapPath,
  buildGlueTabPath,
  buildOuterBleedPath,
  buildTuckFlapPath,
  pt,
  rectPath,
  roundMm,
  validateDimensions,
} from './geometry.ts';

/**
 * Generates a complete 11-face reverse tuck-end carton dieline in ISO millimeters.
 * Layout left-to-right: Glue Tab | Left Side | Front | Right Side | Back.
 */
export function generateTuckEndBox(dimensions: Dieline['dimensions']): Dieline {
  validateDimensions(dimensions);

  const { length, width, height, thickness, bleedSize } = dimensions;

  // Horizontal panel widths include `thickness` fold allowance for material volume
  const glueWidth = roundMm(Math.min(20, Math.max(12, width * 0.3)));
  const leftWidth = roundMm(width + thickness);
  const frontWidth = roundMm(length + thickness);
  const rightWidth = roundMm(width + thickness);
  const backWidth = roundMm(length + thickness);

  const x0 = 0;
  const x1 = roundMm(x0 + glueWidth);
  const x2 = roundMm(x1 + leftWidth);
  const x3 = roundMm(x2 + frontWidth);
  const x4 = roundMm(x3 + rightWidth);
  const x5 = roundMm(x4 + backWidth);

  // Vertical closure, tuck tongue, dust flap, and main body metrics
  const bodyHeight = roundMm(height + thickness);
  const coverDepth = roundMm(width + thickness);
  const tuckDepth = roundMm(Math.min(20, Math.max(12, width * 0.3)));
  const closureHeight = roundMm(coverDepth + tuckDepth);

  const tuckInset = roundMm(Math.min(2.5, Math.max(0.5, thickness + 1), backWidth * 0.1));
  const tuckRadius = roundMm(Math.min(8, tuckDepth * 0.5, (backWidth - 2 * tuckInset) * 0.25));
  const glueTaper = roundMm(Math.min(10, bodyHeight * 0.15, glueWidth * 0.6));

  const dustInset = roundMm(Math.min(1, width * 0.05));
  const dustHeight = roundMm(
    Math.min(closureHeight - 2, Math.max(6, Math.min(length * 0.42, width * 0.65))),
  );
  const dustShoulder = roundMm(Math.min(2, dustHeight * 0.15));
  const dustTaper = roundMm(Math.min(8, (leftWidth - 2 * dustInset) * 0.18));

  const dustMetrics = {
    inset: dustInset,
    shoulder: dustShoulder,
    taper: dustTaper,
    height: dustHeight,
  };
  const tuckMetrics = {
    coverDepth,
    tuckDepth,
    tuckInset,
    tuckRadius,
  };

  // Vertical key coordinates (y = 0 at outer tip of top tuck flap)
  const y0 = 0;
  const yCoverTop = tuckDepth;
  const yBodyTop = closureHeight;
  const yBodyBot = roundMm(yBodyTop + bodyHeight);
  const yBotCover = roundMm(yBodyBot + coverDepth);
  const yMax = roundMm(yBodyBot + closureHeight);

  // 12 crease fold lines connecting all panels, flaps, and tuck-in tongues
  const folds: Fold[] = [
    { id: 'fold-glue-left', from: { x: x1, y: yBodyTop }, to: { x: x1, y: yBodyBot }, angle: 90 },
    { id: 'fold-left-front', from: { x: x2, y: yBodyTop }, to: { x: x2, y: yBodyBot }, angle: 90 },
    { id: 'fold-front-right', from: { x: x3, y: yBodyTop }, to: { x: x3, y: yBodyBot }, angle: 90 },
    { id: 'fold-right-back', from: { x: x4, y: yBodyTop }, to: { x: x4, y: yBodyBot }, angle: 90 },
    {
      id: 'fold-left-top-dust',
      from: { x: roundMm(x1 + dustInset), y: yBodyTop },
      to: { x: roundMm(x2 - dustInset), y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-right-top-dust',
      from: { x: roundMm(x3 + dustInset), y: yBodyTop },
      to: { x: roundMm(x4 - dustInset), y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-back-top-tuck',
      from: { x: x4, y: yBodyTop },
      to: { x: x5, y: yBodyTop },
      angle: 90,
    },
    {
      id: 'fold-top-tuck-tongue',
      from: { x: roundMm(x4 + tuckInset), y: yCoverTop },
      to: { x: roundMm(x5 - tuckInset), y: yCoverTop },
      angle: 90,
    },
    {
      id: 'fold-left-bottom-dust',
      from: { x: roundMm(x1 + dustInset), y: yBodyBot },
      to: { x: roundMm(x2 - dustInset), y: yBodyBot },
      angle: 90,
    },
    {
      id: 'fold-front-bottom-tuck',
      from: { x: x2, y: yBodyBot },
      to: { x: x3, y: yBodyBot },
      angle: 90,
    },
    {
      id: 'fold-bottom-tuck-tongue',
      from: { x: roundMm(x2 + tuckInset), y: yBotCover },
      to: { x: roundMm(x3 - tuckInset), y: yBotCover },
      angle: 90,
    },
    {
      id: 'fold-right-bottom-dust',
      from: { x: roundMm(x3 + dustInset), y: yBodyBot },
      to: { x: roundMm(x4 - dustInset), y: yBodyBot },
      angle: 90,
    },
  ];

  // Exactly 11 faces: 4 walls + 1 glue tab + 6 flaps (3 top + 3 bottom)
  const faces: Face[] = [
    {
      id: 'front',
      name: 'Front',
      path: rectPath(x2, yBodyTop, frontWidth, bodyHeight),
      folds: ['fold-left-front', 'fold-front-right', 'fold-front-bottom-tuck'],
      adjacentFaces: ['left', 'right', 'bottom-tuck'],
    },
    {
      id: 'right',
      name: 'Right Side',
      path: rectPath(x3, yBodyTop, rightWidth, bodyHeight),
      folds: [
        'fold-front-right',
        'fold-right-back',
        'fold-right-top-dust',
        'fold-right-bottom-dust',
      ],
      adjacentFaces: ['front', 'back', 'top-dust-right', 'bottom-dust-right'],
    },
    {
      id: 'back',
      name: 'Back',
      path: rectPath(x4, yBodyTop, backWidth, bodyHeight),
      folds: ['fold-right-back', 'fold-back-top-tuck'],
      adjacentFaces: ['right', 'top-tuck'],
    },
    {
      id: 'left',
      name: 'Left Side',
      path: rectPath(x1, yBodyTop, leftWidth, bodyHeight),
      folds: ['fold-glue-left', 'fold-left-front', 'fold-left-top-dust', 'fold-left-bottom-dust'],
      adjacentFaces: ['glue-tab', 'front', 'top-dust-left', 'bottom-dust-left'],
    },
    {
      id: 'glue-tab',
      name: 'Glue Tab',
      path: buildGlueTabPath(x0, x1, yBodyTop, yBodyBot, glueTaper),
      folds: ['fold-glue-left'],
      adjacentFaces: ['left'],
    },
    {
      id: 'top-dust-left',
      name: 'Top Left Dust Flap',
      path: buildDustFlapPath(x1, x2, yBodyTop, 'up', dustMetrics),
      folds: ['fold-left-top-dust'],
      adjacentFaces: ['left'],
    },
    {
      id: 'top-dust-right',
      name: 'Top Right Dust Flap',
      path: buildDustFlapPath(x3, x4, yBodyTop, 'up', dustMetrics),
      folds: ['fold-right-top-dust'],
      adjacentFaces: ['right'],
    },
    {
      id: 'top-tuck',
      name: 'Top Tuck Flap',
      path: buildTuckFlapPath(x4, x5, yBodyTop, 'up', tuckMetrics),
      folds: ['fold-back-top-tuck', 'fold-top-tuck-tongue'],
      adjacentFaces: ['back'],
    },
    {
      id: 'bottom-dust-left',
      name: 'Bottom Left Dust Flap',
      path: buildDustFlapPath(x1, x2, yBodyBot, 'down', dustMetrics),
      folds: ['fold-left-bottom-dust'],
      adjacentFaces: ['left'],
    },
    {
      id: 'bottom-dust-right',
      name: 'Bottom Right Dust Flap',
      path: buildDustFlapPath(x3, x4, yBodyBot, 'down', dustMetrics),
      folds: ['fold-right-bottom-dust'],
      adjacentFaces: ['right'],
    },
    {
      id: 'bottom-tuck',
      name: 'Bottom Tuck Flap',
      path: buildTuckFlapPath(x2, x3, yBodyBot, 'down', tuckMetrics),
      folds: ['fold-front-bottom-tuck', 'fold-bottom-tuck-tongue'],
      adjacentFaces: ['front'],
    },
  ];

  // Continuous clockwise perimeter cut contour around all 11 faces
  const cutPath = [
    `M ${pt(x4, yBodyTop)}`,
    `L ${pt(x4, yCoverTop)}`,
    `L ${pt(x4 + tuckInset, yCoverTop)}`,
    `L ${pt(x4 + tuckInset, tuckRadius)}`,
    `Q ${pt(x4 + tuckInset, y0)} ${pt(x4 + tuckInset + tuckRadius, y0)}`,
    `L ${pt(x5 - tuckInset - tuckRadius, y0)}`,
    `Q ${pt(x5 - tuckInset, y0)} ${pt(x5 - tuckInset, tuckRadius)}`,
    `L ${pt(x5 - tuckInset, yCoverTop)}`,
    `L ${pt(x5, yCoverTop)}`,
    `L ${pt(x5, yBodyBot)}`,
    `L ${pt(x4 - dustInset, yBodyBot)}`,
    `L ${pt(x4 - dustInset, yBodyBot + dustShoulder)}`,
    `L ${pt(x4 - dustInset - dustTaper, yBodyBot + dustHeight)}`,
    `L ${pt(x3 + dustInset + dustTaper, yBodyBot + dustHeight)}`,
    `L ${pt(x3 + dustInset, yBodyBot + dustShoulder)}`,
    `L ${pt(x3 + dustInset, yBodyBot)}`,
    `L ${pt(x3, yBodyBot)}`,
    `L ${pt(x3, yBotCover)}`,
    `L ${pt(x3 - tuckInset, yBotCover)}`,
    `L ${pt(x3 - tuckInset, yMax - tuckRadius)}`,
    `Q ${pt(x3 - tuckInset, yMax)} ${pt(x3 - tuckInset - tuckRadius, yMax)}`,
    `L ${pt(x2 + tuckInset + tuckRadius, yMax)}`,
    `Q ${pt(x2 + tuckInset, yMax)} ${pt(x2 + tuckInset, yMax - tuckRadius)}`,
    `L ${pt(x2 + tuckInset, yBotCover)}`,
    `L ${pt(x2, yBotCover)}`,
    `L ${pt(x2, yBodyBot)}`,
    `L ${pt(x2 - dustInset, yBodyBot)}`,
    `L ${pt(x2 - dustInset, yBodyBot + dustShoulder)}`,
    `L ${pt(x2 - dustInset - dustTaper, yBodyBot + dustHeight)}`,
    `L ${pt(x1 + dustInset + dustTaper, yBodyBot + dustHeight)}`,
    `L ${pt(x1 + dustInset, yBodyBot + dustShoulder)}`,
    `L ${pt(x1 + dustInset, yBodyBot)}`,
    `L ${pt(x1, yBodyBot)}`,
    `L ${pt(x0, yBodyBot - glueTaper)}`,
    `L ${pt(x0, yBodyTop + glueTaper)}`,
    `L ${pt(x1, yBodyTop)}`,
    `L ${pt(x1 + dustInset, yBodyTop)}`,
    `L ${pt(x1 + dustInset, yBodyTop - dustShoulder)}`,
    `L ${pt(x1 + dustInset + dustTaper, yBodyTop - dustHeight)}`,
    `L ${pt(x2 - dustInset - dustTaper, yBodyTop - dustHeight)}`,
    `L ${pt(x2 - dustInset, yBodyTop - dustShoulder)}`,
    `L ${pt(x2 - dustInset, yBodyTop)}`,
    `L ${pt(x3 + dustInset, yBodyTop)}`,
    `L ${pt(x3 + dustInset, yBodyTop - dustShoulder)}`,
    `L ${pt(x3 + dustInset + dustTaper, yBodyTop - dustHeight)}`,
    `L ${pt(x4 - dustInset - dustTaper, yBodyTop - dustHeight)}`,
    `L ${pt(x4 - dustInset, yBodyTop - dustShoulder)}`,
    `L ${pt(x4 - dustInset, yBodyTop)}`,
    'Z',
  ].join(' ');

  const cuts: Cut[] = [{ id: 'cut-perimeter', path: cutPath }];

  const bleeds: Bleed[] = [
    {
      id: 'bleed-perimeter',
      path: buildOuterBleedPath({
        x0,
        x1,
        x2,
        x3,
        x4,
        x5,
        y0,
        yCoverTop,
        yBodyTop,
        yBodyBot,
        yBotCover,
        yMax,
        glueTaper,
        dust: dustMetrics,
        tuck: tuckMetrics,
        bleedSize,
      }),
    },
  ];

  // Kinematic fold hierarchy anchored on Front panel (0 deg)
  const foldGroups: FoldGroup[] = [
    {
      id: 'group-left-wall',
      name: 'Left Wall Assembly',
      faceIds: ['left', 'glue-tab', 'top-dust-left', 'bottom-dust-left'],
      pivotFoldId: 'fold-left-front',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-glue-tab',
      name: 'Glue Tab',
      faceIds: ['glue-tab'],
      pivotFoldId: 'fold-glue-left',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-right-wall',
      name: 'Right Wall Assembly',
      faceIds: ['right', 'top-dust-right', 'bottom-dust-right', 'back', 'top-tuck'],
      pivotFoldId: 'fold-front-right',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-back-wall',
      name: 'Back Wall Assembly',
      faceIds: ['back', 'top-tuck'],
      pivotFoldId: 'fold-right-back',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-top-dust-left',
      name: 'Top Left Dust Flap',
      faceIds: ['top-dust-left'],
      pivotFoldId: 'fold-left-top-dust',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-top-dust-right',
      name: 'Top Right Dust Flap',
      faceIds: ['top-dust-right'],
      pivotFoldId: 'fold-right-top-dust',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-top-tuck',
      name: 'Top Tuck Closure',
      faceIds: ['top-tuck'],
      pivotFoldId: 'fold-back-top-tuck',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-bottom-dust-left',
      name: 'Bottom Left Dust Flap',
      faceIds: ['bottom-dust-left'],
      pivotFoldId: 'fold-left-bottom-dust',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-bottom-dust-right',
      name: 'Bottom Right Dust Flap',
      faceIds: ['bottom-dust-right'],
      pivotFoldId: 'fold-right-bottom-dust',
      animatedAngleRange: [0, 90],
    },
    {
      id: 'group-bottom-tuck',
      name: 'Bottom Tuck Closure',
      faceIds: ['bottom-tuck'],
      pivotFoldId: 'fold-front-bottom-tuck',
      animatedAngleRange: [0, 90],
    },
  ];

  return {
    archetype: 'tuck-end',
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
