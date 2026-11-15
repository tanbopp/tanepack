// Scalable parametric FEFCO slotted carton factory supporting dynamic top and bottom flap architectures
import type {
  Bleed,
  Cut,
  Dieline,
  Face,
  FefcoConfig,
  FefcoFlapType,
  Fold,
  FoldGroup,
} from '@entities/dieline/types';
import {
  buildGlueTabPath,
  buildSlottedBleedPath,
  buildSlottedCutPath,
  rectPath,
  roundMm,
  validateDimensions,
} from './geometry.ts';

type SupportedSlottedFlapType = 'none' | 'rsc' | 'full';

interface EdgeFlapMetrics {
  flapType: SupportedSlottedFlapType;
  hasFlaps: boolean;
  outerHeight: number;
  innerHeight: number;
}

function resolveSupportedFlapType(
  side: 'top' | 'bottom',
  flapType: FefcoFlapType,
): SupportedSlottedFlapType {
  if (flapType === 'none' || flapType === 'rsc' || flapType === 'full') {
    return flapType;
  }
  throw new Error(
    `Unsupported FEFCO ${side} flap type "${flapType}" in FefcoFactory (not implemented yet).`,
  );
}

function computeEdgeFlapMetrics(
  flapType: SupportedSlottedFlapType,
  leftWidth: number,
  frontWidth: number,
  thickness: number,
): EdgeFlapMetrics {
  if (flapType === 'none') {
    return { flapType, hasFlaps: false, outerHeight: 0, innerHeight: 0 };
  }

  const outerFlapRatio = flapType === 'full' ? 1 : 0.5;
  const outerHeight = roundMm(leftWidth * outerFlapRatio);
  const innerCollisionMargin = Math.max(1.5, thickness * 1.5 + 1);
  const maxSafeInnerHeight = Math.max(4, frontWidth * 0.5 - innerCollisionMargin);
  const innerHeight = roundMm(Math.min(outerHeight, maxSafeInnerHeight));

  return { flapType, hasFlaps: true, outerHeight, innerHeight };
}

type EdgeSide = 'top' | 'bottom';
type WallKey = 'left' | 'front' | 'right' | 'back';

interface EdgeFlapResult {
  folds: Fold[];
  faces: Face[];
  wallFolds: Record<WallKey, string[]>;
  wallAdjacent: Record<WallKey, string[]>;
}

function buildEdgeFlapsAndFolds(
  side: EdgeSide,
  metrics: EdgeFlapMetrics,
  spans: Record<WallKey, { xStart: number; xEnd: number; flapWidth: number }>,
  yHinge: number,
  flapInset: number,
): EdgeFlapResult {
  const emptyWalls = (): Record<WallKey, string[]> => ({
    left: [],
    front: [],
    right: [],
    back: [],
  });
  const wallFolds = emptyWalls();
  const wallAdjacent = emptyWalls();

  if (!metrics.hasFlaps) {
    return { folds: [], faces: [], wallFolds, wallAdjacent };
  }

  const folds: Fold[] = [];
  const faces: Face[] = [];
  const descriptors: Array<{ key: WallKey; label: string; isOuter: boolean }> = [
    { key: 'left', label: 'Left Inner Flap', isOuter: false },
    { key: 'front', label: 'Front Outer Flap', isOuter: true },
    { key: 'right', label: 'Right Inner Flap', isOuter: false },
    { key: 'back', label: 'Back Outer Flap', isOuter: true },
  ];
  const sideLabel = side === 'top' ? 'Top' : 'Bottom';

  for (const { key, label, isOuter } of descriptors) {
    const { xStart, xEnd, flapWidth } = spans[key];
    const foldId = `fold-${key}-${side}-flap`;
    const faceId = `${side}-flap-${key}`;
    const flapHeight = isOuter ? metrics.outerHeight : metrics.innerHeight;
    const faceY = side === 'top' ? roundMm(yHinge - flapHeight) : yHinge;

    folds.push({
      id: foldId,
      from: { x: roundMm(xStart + flapInset), y: yHinge },
      to: { x: roundMm(xEnd - flapInset), y: yHinge },
      angle: 90,
    });

    faces.push({
      id: faceId,
      name: `${sideLabel} ${label}`,
      path: rectPath(roundMm(xStart + flapInset), faceY, flapWidth, flapHeight),
      folds: [foldId],
      adjacentFaces: [key],
    });

    wallFolds[key].push(foldId);
    wallAdjacent[key].push(faceId);
  }

  return { folds, faces, wallFolds, wallAdjacent };
}

function buildBottomAnchoredFoldGroups(
  topFlapType: SupportedSlottedFlapType,
  bottomFlapType: Exclude<SupportedSlottedFlapType, 'none'>,
): FoldGroup[] {
  const hasTop = topFlapType !== 'none';
  const topLeft = hasTop ? ['top-flap-left'] : [];
  const topFront = hasTop ? ['top-flap-front'] : [];
  const topRight = hasTop ? ['top-flap-right'] : [];
  const topBack = hasTop ? ['top-flap-back'] : [];

  const bottomInnerTier = bottomFlapType === 'full' ? 2 : 1;
  const bottomBackTier = bottomFlapType === 'full' ? 1 : 0;

  const groups: FoldGroup[] = [
    {
      id: 'group-front-assembly',
      name: 'Box Body & Top Assembly',
      faceIds: [
        'front',
        'left',
        'glue-tab',
        'right',
        'back',
        ...topLeft,
        ...topFront,
        ...topRight,
        ...topBack,
        'bottom-flap-left',
        'bottom-flap-right',
        'bottom-flap-back',
      ],
      pivotFoldId: 'fold-front-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: [0, 30],
    },
    {
      id: 'group-left-wall',
      name: 'Left Wall Assembly',
      faceIds: ['left', 'glue-tab', ...topLeft, 'bottom-flap-left'],
      pivotFoldId: 'fold-left-front',
      animatedAngleRange: [0, 90],
      foldStage: [30, 60],
    },
    {
      id: 'group-glue-tab',
      name: 'Glue Tab',
      faceIds: ['glue-tab'],
      pivotFoldId: 'fold-glue-left',
      animatedAngleRange: [0, 90],
      foldStage: [30, 60],
      layerOrder: 0,
    },
    {
      id: 'group-bottom-flap-left',
      name: 'Bottom Left Inner Flap',
      faceIds: ['bottom-flap-left'],
      pivotFoldId: 'fold-left-bottom-flap',
      animatedAngleRange: [0, 90],
      // Folds synchronously with Front Assembly [0, 30] so bottom flaps remain flush on Y >= 0
      foldStage: [0, 30],
      layerOrder: 0,
      layerOffsetDirection: 1,
      layerOffsetTier: bottomInnerTier,
    },
    {
      id: 'group-right-wall',
      name: 'Right Wall Assembly',
      faceIds: ['right', ...topRight, 'bottom-flap-right', 'back', ...topBack, 'bottom-flap-back'],
      pivotFoldId: 'fold-front-right',
      animatedAngleRange: [0, 90],
      foldStage: [30, 60],
    },
    {
      id: 'group-bottom-flap-right',
      name: 'Bottom Right Inner Flap',
      faceIds: ['bottom-flap-right'],
      pivotFoldId: 'fold-right-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: [0, 30],
      layerOrder: 0,
      layerOffsetDirection: 1,
      layerOffsetTier: bottomInnerTier,
    },
    {
      id: 'group-back-wall',
      name: 'Back Wall Assembly',
      faceIds: ['back', ...topBack, 'bottom-flap-back'],
      pivotFoldId: 'fold-right-back',
      animatedAngleRange: [0, 90],
      foldStage: [30, 60],
    },
    {
      id: 'group-bottom-flap-back',
      name: 'Bottom Back Outer Flap',
      faceIds: ['bottom-flap-back'],
      pivotFoldId: 'fold-back-bottom-flap',
      animatedAngleRange: [0, 90],
      foldStage: [0, 30],
      layerOrder: 1,
      layerOffsetDirection: 1,
      layerOffsetTier: bottomBackTier,
    },
  ];

  if (hasTop) {
    const isFullTop = topFlapType === 'full';
    groups.push(
      {
        id: 'group-top-flap-left',
        name: 'Top Left Inner Flap',
        faceIds: ['top-flap-left'],
        pivotFoldId: 'fold-left-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: [55, 78],
        layerOrder: 0,
      },
      {
        id: 'group-top-flap-right',
        name: 'Top Right Inner Flap',
        faceIds: ['top-flap-right'],
        pivotFoldId: 'fold-right-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: [55, 78],
        layerOrder: 0,
      },
      {
        id: 'group-top-flap-back',
        name: 'Top Back Outer Flap',
        faceIds: ['top-flap-back'],
        pivotFoldId: 'fold-back-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: isFullTop ? [68, 84] : [72, 90],
        layerOrder: 1,
        layerOffsetDirection: -1,
        layerOffsetTier: 1,
      },
      {
        id: 'group-top-flap-front',
        name: 'Top Front Outer Flap',
        faceIds: ['top-flap-front'],
        pivotFoldId: 'fold-front-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: isFullTop ? [76, 90] : [72, 90],
        layerOrder: isFullTop ? 2 : 1,
        layerOffsetDirection: -1,
        layerOffsetTier: isFullTop ? 2 : 1,
      },
    );
  }

  return groups;
}

function buildFrontAnchoredFoldGroups(topFlapType: SupportedSlottedFlapType): FoldGroup[] {
  const hasTop = topFlapType !== 'none';
  const topLeft = hasTop ? ['top-flap-left'] : [];
  const topRight = hasTop ? ['top-flap-right'] : [];
  const topBack = hasTop ? ['top-flap-back'] : [];

  const groups: FoldGroup[] = [
    {
      id: 'group-left-wall',
      name: 'Left Wall Assembly',
      faceIds: ['left', 'glue-tab', ...topLeft],
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
      id: 'group-right-wall',
      name: 'Right Wall Assembly',
      faceIds: ['right', ...topRight, 'back', ...topBack],
      pivotFoldId: 'fold-front-right',
      animatedAngleRange: [0, 90],
      foldStage: [0, 50],
    },
    {
      id: 'group-back-wall',
      name: 'Back Wall Assembly',
      faceIds: ['back', ...topBack],
      pivotFoldId: 'fold-right-back',
      animatedAngleRange: [0, 90],
      foldStage: [0, 50],
    },
  ];

  if (hasTop) {
    const isFullTop = topFlapType === 'full';
    groups.push(
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
        id: 'group-top-flap-right',
        name: 'Top Right Inner Flap',
        faceIds: ['top-flap-right'],
        pivotFoldId: 'fold-right-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: [35, 70],
        layerOrder: 0,
      },
      {
        id: 'group-top-flap-back',
        name: 'Top Back Outer Flap',
        faceIds: ['top-flap-back'],
        pivotFoldId: 'fold-back-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: isFullTop ? [55, 82] : [55, 90],
        layerOrder: 1,
      },
      {
        id: 'group-top-flap-front',
        name: 'Top Front Outer Flap',
        faceIds: ['top-flap-front'],
        pivotFoldId: 'fold-front-top-flap',
        animatedAngleRange: [0, 90],
        foldStage: isFullTop ? [65, 90] : [55, 90],
        layerOrder: isFullTop ? 2 : 1,
      },
    );
  }

  return groups;
}

/**
 * Generates a parametric FEFCO slotted shipping carton dieline from a declarative `FefcoConfig`.
 * Supports independent top/bottom flap architectures (`none`, `rsc`, `full`) and anchors standing
 * cartons on `'bottom-flap-front'` (`Y = 0`) whenever bottom flaps are present.
 */
export function generateFefcoBox(config: FefcoConfig, dimensions: Dieline['dimensions']): Dieline {
  validateDimensions(dimensions);

  const topFlapType = resolveSupportedFlapType('top', config.flapConfig.top);
  const bottomFlapType = resolveSupportedFlapType('bottom', config.flapConfig.bottom);

  const { length, width, height, thickness, bleedSize } = dimensions;

  const minFootprint = Math.min(length, width);
  const glueWidth =
    minFootprint >= 150
      ? 35
      : minFootprint >= 60
        ? 30
        : roundMm(Math.max(12, Math.min(30, minFootprint * 0.4)));

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
  const baseSlotHalf = Math.max(1.5, thickness * 1.5 + 1);
  const flapInset = roundMm(Math.min(leftWidth * 0.08, frontWidth * 0.08, baseSlotHalf));

  const topMetrics = computeEdgeFlapMetrics(topFlapType, leftWidth, frontWidth, thickness);
  const bottomMetrics = computeEdgeFlapMetrics(bottomFlapType, leftWidth, frontWidth, thickness);

  const y0 = 0;
  const yBodyTop = topMetrics.outerHeight;
  const yTopInner = roundMm(yBodyTop - topMetrics.innerHeight);
  const yBodyBot = roundMm(yBodyTop + bodyHeight);
  const yBotInner = roundMm(yBodyBot + bottomMetrics.innerHeight);
  const yMax = roundMm(yBodyBot + bottomMetrics.outerHeight);

  const wallSpans: Record<WallKey, { xStart: number; xEnd: number; flapWidth: number }> = {
    left: { xStart: x1, xEnd: x2, flapWidth: roundMm(leftWidth - 2 * flapInset) },
    front: { xStart: x2, xEnd: x3, flapWidth: roundMm(frontWidth - 2 * flapInset) },
    right: { xStart: x3, xEnd: x4, flapWidth: roundMm(rightWidth - 2 * flapInset) },
    back: { xStart: x4, xEnd: x5, flapWidth: roundMm(backWidth - 2 * flapInset) },
  };

  const topFlapResult = buildEdgeFlapsAndFolds('top', topMetrics, wallSpans, yBodyTop, flapInset);
  const bottomFlapResult = buildEdgeFlapsAndFolds(
    'bottom',
    bottomMetrics,
    wallSpans,
    yBodyBot,
    flapInset,
  );

  const folds: Fold[] = [
    { id: 'fold-glue-left', from: { x: x1, y: yBodyTop }, to: { x: x1, y: yBodyBot }, angle: 90 },
    { id: 'fold-left-front', from: { x: x2, y: yBodyTop }, to: { x: x2, y: yBodyBot }, angle: 90 },
    { id: 'fold-front-right', from: { x: x3, y: yBodyTop }, to: { x: x3, y: yBodyBot }, angle: 90 },
    { id: 'fold-right-back', from: { x: x4, y: yBodyTop }, to: { x: x4, y: yBodyBot }, angle: 90 },
    ...topFlapResult.folds,
    ...bottomFlapResult.folds,
  ];

  const faces: Face[] = [
    {
      id: 'front',
      name: 'Front',
      path: rectPath(x2, yBodyTop, frontWidth, bodyHeight),
      folds: [
        'fold-left-front',
        'fold-front-right',
        ...topFlapResult.wallFolds.front,
        ...bottomFlapResult.wallFolds.front,
      ],
      adjacentFaces: [
        'left',
        'right',
        ...topFlapResult.wallAdjacent.front,
        ...bottomFlapResult.wallAdjacent.front,
      ],
    },
    {
      id: 'right',
      name: 'Right Side',
      path: rectPath(x3, yBodyTop, rightWidth, bodyHeight),
      folds: [
        'fold-front-right',
        'fold-right-back',
        ...topFlapResult.wallFolds.right,
        ...bottomFlapResult.wallFolds.right,
      ],
      adjacentFaces: [
        'front',
        'back',
        ...topFlapResult.wallAdjacent.right,
        ...bottomFlapResult.wallAdjacent.right,
      ],
    },
    {
      id: 'back',
      name: 'Back',
      path: rectPath(x4, yBodyTop, backWidth, bodyHeight),
      folds: [
        'fold-right-back',
        ...topFlapResult.wallFolds.back,
        ...bottomFlapResult.wallFolds.back,
      ],
      adjacentFaces: [
        'right',
        ...topFlapResult.wallAdjacent.back,
        ...bottomFlapResult.wallAdjacent.back,
      ],
    },
    {
      id: 'left',
      name: 'Left Side',
      path: rectPath(x1, yBodyTop, leftWidth, bodyHeight),
      folds: [
        'fold-glue-left',
        'fold-left-front',
        ...topFlapResult.wallFolds.left,
        ...bottomFlapResult.wallFolds.left,
      ],
      adjacentFaces: [
        'glue-tab',
        'front',
        ...topFlapResult.wallAdjacent.left,
        ...bottomFlapResult.wallAdjacent.left,
      ],
    },
    {
      id: 'glue-tab',
      name: 'Glue Tab',
      path: buildGlueTabPath(x0, x1, yBodyTop, yBodyBot, glueTaper),
      folds: ['fold-glue-left'],
      adjacentFaces: ['left'],
    },
    ...topFlapResult.faces,
    ...bottomFlapResult.faces,
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
    hasTopFlaps: topMetrics.hasFlaps,
    hasBottomFlaps: bottomMetrics.hasFlaps,
  };

  const cuts: Cut[] = [{ id: 'cut-perimeter', path: buildSlottedCutPath(layoutParams) }];
  const bleeds: Bleed[] = [{ id: 'bleed-perimeter', path: buildSlottedBleedPath(layoutParams) }];

  const baseFaceId = bottomFlapType === 'none' ? 'front' : 'bottom-flap-front';
  const foldGroups =
    bottomFlapType === 'none'
      ? buildFrontAnchoredFoldGroups(topFlapType)
      : buildBottomAnchoredFoldGroups(topFlapType, bottomFlapType);

  return {
    archetype: config.id,
    baseFaceId,
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
