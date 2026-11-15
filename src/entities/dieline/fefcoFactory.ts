import {
  appendContourCommands,
  buildClosedSvgPolygon,
  buildColumnFlapGeometry,
  buildOpenSvgPolyline,
  mapFlapPointsToMm,
  reverseMappedFlapContour,
  type ColumnFlapGeometry,
  type FlapPointSpec,
} from './fefcoFlaps';
import { computeSvgPathBoundsMm, pt, roundMm, validateDimensions } from './geometry';
import type {
  Cut,
  Dieline,
  Face,
  FefcoColumnLayout,
  FefcoConfig,
  FefcoFlapEndPreset,
  FefcoFlapType,
  Fold,
  FoldGroup,
  Point,
} from './types';

interface PanelColumnSpec {
  id: string;
  name: string;
  basis: 'L' | 'W';
  width: number;
  colIndex: number;
  x0: number;
  x1: number;
  hasFlaps: boolean;
}

const SUPPORTED_FLAP_TYPES = new Set<FefcoFlapType>([
  'none',
  'rsc',
  'full',
  'extended',
  'custom',
  'tuck',
  'snap-lock',
  'crash-lock',
]);

function assertSupportedFlapType(flapType: FefcoFlapType, side: 'top' | 'bottom'): void {
  if (!SUPPORTED_FLAP_TYPES.has(flapType)) {
    throw new Error(`Unsupported FEFCO ${side} flap type "${String(flapType)}" in FefcoFactory.`);
  }
}

function resolveFlapTypes(config: FefcoConfig): {
  topFlapType: FefcoFlapType;
  bottomFlapType: FefcoFlapType;
} {
  const topFlapType = config.flapConfig?.top ?? config.topFlapType ?? 'rsc';
  const bottomFlapType = config.flapConfig?.bottom ?? config.bottomFlapType ?? 'rsc';
  assertSupportedFlapType(topFlapType, 'top');
  assertSupportedFlapType(bottomFlapType, 'bottom');
  return { topFlapType, bottomFlapType };
}

function derivePresetFromConfig(
  flapType: FefcoFlapType,
  side: 'top' | 'bottom',
  config: FefcoConfig,
): FefcoFlapEndPreset {
  if (config.flapPreset) {
    return side === 'top' ? config.flapPreset.top : config.flapPreset.bottom;
  }

  const math = config.flapMath;
  const outerRatio = side === 'top' ? (math?.topOuter ?? 0.5) : (math?.bottomOuter ?? 0.5);
  const outerBasis = side === 'top' ? math?.topOuterBasis : math?.bottomOuterBasis;

  switch (flapType) {
    case 'none':
      return 'none';
    case 'tuck':
      return 'rett-c0';
    case 'snap-lock':
      return 'snap-lock';
    case 'crash-lock':
      return 'crash-lock-233';
    case 'full':
      return math?.innerBasis === 'L' ? 'center-special-full' : 'full-overlap';
    case 'extended':
      if (outerBasis === 'L') {
        return 'all-half-L';
      }
      if (outerRatio <= 0.3) {
        return 'reduced-25';
      }
      return 'extended-55';
    case 'custom':
    case 'rsc':
    default:
      if (math?.innerBasis === 'L') {
        return 'center-special';
      }
      if (Math.abs(outerRatio - 0.44) < 0.01) {
        return 'rsc-44';
      }
      return 'rsc';
  }
}

function buildPanelColumns(
  layout: FefcoColumnLayout,
  lenMm: number,
  widMm: number,
  startX: number,
): PanelColumnSpec[] {
  const raw: Array<Omit<PanelColumnSpec, 'x0' | 'x1'>> = [];

  if (layout === 'W-L-W-L') {
    raw.push(
      { id: 'left', name: 'Left', basis: 'W', width: widMm, colIndex: 0, hasFlaps: true },
      { id: 'front', name: 'Front', basis: 'L', width: lenMm, colIndex: 1, hasFlaps: true },
      { id: 'right', name: 'Right', basis: 'W', width: widMm, colIndex: 2, hasFlaps: true },
      { id: 'back', name: 'Back', basis: 'L', width: lenMm, colIndex: 3, hasFlaps: true },
    );
  } else if (layout === 'offset-L') {
    const splitL = roundMm(lenMm * 0.25);
    const overlapL = roundMm(Math.max(3, Math.min(8, lenMm * 0.05)));
    raw.push(
      {
        id: 'glue-flange',
        name: 'Glue Flange',
        basis: 'L',
        width: roundMm(splitL + overlapL),
        colIndex: 0,
        hasFlaps: true,
      },
      { id: 'left', name: 'Left', basis: 'W', width: widMm, colIndex: 1, hasFlaps: true },
      { id: 'front', name: 'Front', basis: 'L', width: lenMm, colIndex: 2, hasFlaps: true },
      { id: 'right', name: 'Right', basis: 'W', width: widMm, colIndex: 3, hasFlaps: true },
      {
        id: 'back',
        name: 'Back',
        basis: 'L',
        width: roundMm(Math.max(10, lenMm - splitL)),
        colIndex: 4,
        hasFlaps: true,
      },
    );
  } else if (layout === 'offset-W') {
    const splitW = roundMm(widMm / 3);
    const overlapW = roundMm(Math.max(3, Math.min(6, widMm * 0.05)));
    raw.push(
      {
        id: 'glue-flange',
        name: 'Glue Flange',
        basis: 'W',
        width: roundMm(splitW + overlapW),
        colIndex: 0,
        hasFlaps: true,
      },
      { id: 'back', name: 'Back', basis: 'L', width: lenMm, colIndex: 1, hasFlaps: true },
      { id: 'left', name: 'Left', basis: 'W', width: widMm, colIndex: 2, hasFlaps: true },
      { id: 'front', name: 'Front', basis: 'L', width: lenMm, colIndex: 3, hasFlaps: true },
      {
        id: 'right',
        name: 'Right',
        basis: 'W',
        width: roundMm(Math.max(10, widMm - splitW)),
        colIndex: 4,
        hasFlaps: true,
      },
    );
  } else if (layout === 'wrap-0228') {
    const halfL = roundMm(lenMm * 0.5);
    const overlapL = roundMm(Math.max(4, Math.min(8, lenMm * 0.08)));
    raw.push(
      {
        id: 'wrap-side',
        name: 'Wrap Side',
        basis: 'W',
        width: widMm,
        colIndex: -1,
        hasFlaps: false,
      },
      { id: 'back-left', name: 'Back Left', basis: 'L', width: halfL, colIndex: 0, hasFlaps: true },
      { id: 'left', name: 'Left', basis: 'W', width: widMm, colIndex: 1, hasFlaps: true },
      { id: 'front', name: 'Front', basis: 'L', width: lenMm, colIndex: 2, hasFlaps: true },
      { id: 'right', name: 'Right', basis: 'W', width: widMm, colIndex: 3, hasFlaps: true },
      {
        id: 'back-right',
        name: 'Back Right',
        basis: 'L',
        width: roundMm(halfL + overlapL),
        colIndex: 4,
        hasFlaps: true,
      },
    );
  } else {
    // Standard FEFCO PDF 0200-series column layout: [GlueTab | Back(L) | Left(W) | Front(L) | Right(W)]
    raw.push(
      { id: 'back', name: 'Back', basis: 'L', width: lenMm, colIndex: 0, hasFlaps: true },
      { id: 'left', name: 'Left', basis: 'W', width: widMm, colIndex: 1, hasFlaps: true },
      { id: 'front', name: 'Front', basis: 'L', width: lenMm, colIndex: 2, hasFlaps: true },
      { id: 'right', name: 'Right', basis: 'W', width: widMm, colIndex: 3, hasFlaps: true },
    );
  }

  let cursorX = startX;
  return raw.map((col) => {
    const x0 = roundMm(cursorX);
    const x1 = roundMm(cursorX + col.width);
    cursorX = x1;
    return { ...col, x0, x1 };
  });
}

function buildWallPanelPath(x0: number, y0: number, x1: number, y1: number): string {
  return `M ${pt(x0, y0)} L ${pt(x1, y0)} L ${pt(x1, y1)} L ${pt(x0, y1)} Z`;
}

function resolveExplicitColumnMath(
  config: FefcoConfig,
  side: 'top' | 'bottom',
  colId: string,
  colBasis: 'L' | 'W',
): { explicitRatio?: number; explicitBasis?: 'L' | 'W' } {
  if (config.flapPreset || !config.flapMath) {
    return {};
  }
  const math = config.flapMath;
  const isOuter = colId === 'front' || colId === 'back' || colBasis === 'L';
  if (isOuter) {
    return {
      explicitRatio: side === 'top' ? math.topOuter : math.bottomOuter,
      ...(side === 'top' && math.topOuterBasis ? { explicitBasis: math.topOuterBasis } : {}),
      ...(side === 'bottom' && math.bottomOuterBasis
        ? { explicitBasis: math.bottomOuterBasis }
        : {}),
    };
  }
  const innerRatio =
    side === 'top' ? (math.topInner ?? math.inner) : (math.bottomInner ?? math.inner);
  return {
    explicitRatio: innerRatio,
    ...(math.innerBasis ? { explicitBasis: math.innerBasis } : {}),
  };
}

const PLANAR_SLOTTED_PRESETS = new Set<FefcoFlapEndPreset>([
  'rsc',
  'rsc-44',
  'extended-55',
  'reduced-25',
  'full-overlap',
  'center-special',
  'all-half-L',
  'center-special-full',
  'rim-flange-214',
]);

function measureGeomMaxHeight(geom: ColumnFlapGeometry): number {
  let maxH = 0;
  for (const p of geom.cutContour) {
    if (p.h > maxH) {
      maxH = p.h;
    }
  }
  return maxH;
}

function detectEndOverlaps(
  columns: PanelColumnSpec[],
  geoms: ColumnFlapGeometry[],
  lenMm: number,
  widMm: number,
): { outerOverlaps: boolean; innerOverlaps: boolean } {
  let frontOuterH = 0;
  let backOuterH = 0;
  let leftInnerH = 0;
  let rightInnerH = 0;

  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    const geom = geoms[i];
    if (!col || !geom || !geom.hasFlap) continue;
    if (geom.animatedAngleRange?.[0] === 0 && geom.animatedAngleRange?.[1] === 0) {
      continue;
    }
    const h = measureGeomMaxHeight(geom);
    if (col.basis === 'L') {
      if (col.id === 'front') {
        frontOuterH = Math.max(frontOuterH, h);
      } else {
        backOuterH = Math.max(backOuterH, h);
      }
    } else if (col.id === 'right') {
      rightInnerH = Math.max(rightInnerH, h);
    } else {
      leftInnerH = Math.max(leftInnerH, h);
    }
  }

  return {
    outerOverlaps: frontOuterH > 0 && backOuterH > 0 && frontOuterH + backOuterH > widMm + 0.01,
    innerOverlaps: leftInnerH > 0 && rightInnerH > 0 && leftInnerH + rightInnerH > lenMm + 0.01,
  };
}

/**
 * Parametric FEFCO 0200-series box generator factory supporting all catalog layouts,
 * exact PDF flap geometry, Tuck Tops, Snap-Lock, Crash-Lock, Handles, and Euroslots.
 */
export function generateFefcoBox(config: FefcoConfig, dimensions: Dieline['dimensions']): Dieline {
  validateDimensions(dimensions);

  const { length, width, height, thickness, bleedSize } = dimensions;
  const { topFlapType, bottomFlapType } = resolveFlapTypes(config);
  const topPreset = derivePresetFromConfig(topFlapType, 'top', config);
  const bottomPreset = derivePresetFromConfig(bottomFlapType, 'bottom', config);
  const layout: FefcoColumnLayout = config.columnLayout ?? 'L-W-L-W';
  const tuckDepth = roundMm(Math.max(4, config.tuckDepth ?? 20));
  const allowInnerOverlap = config.allowInnerOverlap ?? false;

  const lenMm = roundMm(length + thickness);
  const widMm = roundMm(width + thickness);
  const bodyHeightMm = roundMm(height + thickness);

  const isOffsetSeam = layout === 'offset-L' || layout === 'offset-W';
  const isBellowsBlank = topPreset === 'bellows-226' && bottomPreset === 'bellows-226';
  const hasBeveledGlueTab = (config.hasGlueTab ?? true) && !isOffsetSeam;
  const hasBevelOnGlueCut = hasBeveledGlueTab && !isBellowsBlank;
  const minFootprint = Math.min(lenMm, widMm);
  const glueWidth = !hasBeveledGlueTab
    ? 0
    : minFootprint >= 150
      ? 35
      : minFootprint >= 60
        ? 30
        : roundMm(Math.max(12, Math.min(30, minFootprint * 0.4)));
  const glueBevel = roundMm(Math.min(10, bodyHeightMm * 0.15, glueWidth * 0.35));
  const slotHalfMm = roundMm(Math.max(1, thickness * 0.5 + 0.5));

  const columns = buildPanelColumns(layout, lenMm, widMm, glueWidth);

  const topGeoms: ColumnFlapGeometry[] = columns.map((col) => {
    if (!col.hasFlaps) {
      return buildColumnFlapGeometry({
        preset: 'none',
        side: 'top',
        colIndex: col.colIndex,
        colId: col.id,
        colWidth: col.width,
        colBasis: col.basis,
        length: lenMm,
        width: widMm,
        height: bodyHeightMm,
        thickness,
        tuckDepth,
        slotHalfMm,
        allowInnerOverlap,
      });
    }
    const override = resolveExplicitColumnMath(config, 'top', col.id, col.basis);
    return buildColumnFlapGeometry({
      preset: topPreset,
      side: 'top',
      colIndex: col.colIndex,
      colId: col.id,
      colWidth: col.width,
      colBasis: col.basis,
      length: lenMm,
      width: widMm,
      height: bodyHeightMm,
      thickness,
      tuckDepth,
      slotHalfMm,
      allowInnerOverlap,
      ...override,
    });
  });

  const botGeoms: ColumnFlapGeometry[] = columns.map((col) => {
    if (!col.hasFlaps) {
      return buildColumnFlapGeometry({
        preset: 'none',
        side: 'bottom',
        colIndex: col.colIndex,
        colId: col.id,
        colWidth: col.width,
        colBasis: col.basis,
        length: lenMm,
        width: widMm,
        height: bodyHeightMm,
        thickness,
        tuckDepth,
        slotHalfMm,
        allowInnerOverlap,
      });
    }
    const override = resolveExplicitColumnMath(config, 'bottom', col.id, col.basis);
    return buildColumnFlapGeometry({
      preset: bottomPreset,
      side: 'bottom',
      colIndex: col.colIndex,
      colId: col.id,
      colWidth: col.width,
      colBasis: col.basis,
      length: lenMm,
      width: widMm,
      height: bodyHeightMm,
      thickness,
      tuckDepth,
      slotHalfMm,
      allowInnerOverlap,
      ...override,
    });
  });

  const topOverlap = detectEndOverlaps(columns, topGeoms, lenMm, widMm);
  const botOverlap = detectEndOverlaps(columns, botGeoms, lenMm, widMm);

  // Determine base anchor bottom flap up front so stages & hinge IDs are consistent
  const frontIdx = columns.findIndex((c) => c.id === 'front');
  let anchorColIdx = frontIdx >= 0 && botGeoms[frontIdx]?.hasFlap ? frontIdx : -1;
  if (anchorColIdx < 0) {
    anchorColIdx = botGeoms.findIndex((g) => g.hasFlap);
  }
  const hasBottomAnchor = anchorColIdx >= 0;

  // Compute maximum upward and downward flap projections so minY === 0
  let maxTopH = 0;
  for (const geom of topGeoms) {
    for (const p of geom.cutContour) {
      if (p.h > maxTopH) {
        maxTopH = p.h;
      }
    }
  }
  let maxBotH = 0;
  for (const geom of botGeoms) {
    for (const p of geom.cutContour) {
      if (p.h > maxBotH) {
        maxBotH = p.h;
      }
    }
  }

  const bodyTopY = roundMm(maxTopH);
  const bodyBottomY = roundMm(bodyTopY + bodyHeightMm);
  const bellowsTopY = roundMm(bodyTopY - maxTopH);
  const bellowsBotY = roundMm(bodyBottomY + maxBotH);
  const firstCol = columns[0];
  const lastCol = columns[columns.length - 1];
  if (!firstCol || !lastCol) {
    throw new Error('FefcoFactory requires at least one body column.');
  }

  // Build main continuous clockwise outer cut contour
  const contourCmds: string[] = isBellowsBlank
    ? [
        `M ${pt(0, bellowsTopY)}`,
        `L ${pt(lastCol.x1, bellowsTopY)}`,
        `L ${pt(lastCol.x1, bellowsBotY)}`,
        `L ${pt(0, bellowsBotY)}`,
      ]
    : [`M ${pt(firstCol.x0, bodyTopY)}`];
  const holeSubpaths: string[] = [];
  const cuts: Cut[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    const geom = topGeoms[i];
    if (!col || !geom) continue;

    if (!isBellowsBlank) {
      if (geom.hasFlap && geom.cutContour.length > 0) {
        const mmPts = mapFlapPointsToMm(geom.cutContour, col.x0, col.width, bodyTopY, -1);
        const startsAtCursor =
          i === 0 &&
          mmPts[0] !== undefined &&
          Math.abs(mmPts[0].x - firstCol.x0) < 0.01 &&
          Math.abs(mmPts[0].y - bodyTopY) < 0.01;
        appendContourCommands(contourCmds, mmPts, startsAtCursor);
      } else {
        contourCmds.push(`L ${pt(col.x1, bodyTopY)}`);
      }
    }

    for (const hole of geom.holes) {
      const holeMm = mapFlapPointsToMm(hole, col.x0, col.width, bodyTopY, -1);
      holeSubpaths.push(buildClosedSvgPolygon(holeMm));
    }
    geom.slits.forEach((slit, slitIdx) => {
      const slitMm = mapFlapPointsToMm(slit, col.x0, col.width, bodyTopY, -1);
      cuts.push({
        id: `cut-slit-top-${col.id}-${slitIdx}`,
        path: buildOpenSvgPolyline(slitMm),
      });
    });
  }

  if (!isBellowsBlank) {
    contourCmds.push(`L ${pt(lastCol.x1, bodyBottomY)}`);
  }

  for (let i = columns.length - 1; i >= 0; i -= 1) {
    const col = columns[i];
    const geom = botGeoms[i];
    if (!col || !geom) continue;

    if (!isBellowsBlank) {
      if (geom.hasFlap && geom.cutContour.length > 0) {
        const mmPts = reverseMappedFlapContour(
          mapFlapPointsToMm(geom.cutContour, col.x0, col.width, bodyBottomY, 1),
        );
        appendContourCommands(contourCmds, mmPts, false);
      } else {
        contourCmds.push(`L ${pt(col.x0, bodyBottomY)}`);
      }
    }

    for (const hole of geom.holes) {
      const holeMm = mapFlapPointsToMm(hole, col.x0, col.width, bodyBottomY, 1);
      holeSubpaths.push(buildClosedSvgPolygon(holeMm));
    }
    geom.slits.forEach((slit, slitIdx) => {
      const slitMm = mapFlapPointsToMm(slit, col.x0, col.width, bodyBottomY, 1);
      cuts.push({
        id: `cut-slit-bottom-${col.id}-${slitIdx}`,
        path: buildOpenSvgPolyline(slitMm),
      });
    });
  }

  if (hasBevelOnGlueCut) {
    contourCmds.push(
      `L ${pt(0, roundMm(bodyBottomY - glueBevel))}`,
      `L ${pt(0, roundMm(bodyTopY + glueBevel))}`,
    );
  }
  contourCmds.push('Z');

  const outerPath = [...contourCmds, ...holeSubpaths].join(' ');
  const allCuts: Cut[] = [{ id: 'cut-outer', path: outerPath }, ...cuts];
  if (config.customFlapPaths?.trim()) {
    allCuts.push({ id: 'cut-custom-flaps', path: config.customFlapPaths.trim() });
  }

  // Folds & Faces
  const folds: Fold[] = [];
  const faces: Face[] = [];

  if (hasBeveledGlueTab) {
    const foldGlueId = `fold-glue-${firstCol.id}`;
    folds.push({
      id: foldGlueId,
      from: { x: glueWidth, y: isBellowsBlank ? bellowsTopY : bodyTopY },
      to: { x: glueWidth, y: isBellowsBlank ? bellowsBotY : bodyBottomY },
      angle: 90,
    });
    if (isBellowsBlank) {
      const miterOffset = roundMm(Math.min(maxTopH, glueWidth));
      folds.push(
        {
          id: 'fold-glue-bellows-hinge-top',
          from: { x: 0, y: bodyTopY },
          to: { x: glueWidth, y: bodyTopY },
          angle: 90,
        },
        {
          id: 'fold-glue-bellows-hinge-bot',
          from: { x: 0, y: bodyBottomY },
          to: { x: glueWidth, y: bodyBottomY },
          angle: 90,
        },
        {
          id: 'fold-glue-bellows-top',
          from: { x: glueWidth, y: bodyTopY },
          to: { x: 0, y: roundMm(bodyTopY - miterOffset) },
          angle: 90,
        },
        {
          id: 'fold-glue-bellows-bot',
          from: { x: glueWidth, y: bodyBottomY },
          to: { x: 0, y: roundMm(bodyBottomY + miterOffset) },
          angle: 90,
        },
      );
    }
    faces.push({
      id: 'glue-tab',
      name: 'Glue Tab',
      path: isBellowsBlank
        ? buildWallPanelPath(0, bodyTopY, glueWidth, bodyBottomY)
        : `M ${pt(0, roundMm(bodyTopY + glueBevel))} L ${pt(glueWidth, bodyTopY)} L ${pt(glueWidth, bodyBottomY)} L ${pt(0, roundMm(bodyBottomY - glueBevel))} Z`,
      folds: [foldGlueId],
      adjacentFaces: [firstCol.id],
    });
  }

  // Vertical folds between adjacent body walls
  for (let i = 0; i < columns.length - 1; i += 1) {
    const leftCol = columns[i];
    const rightCol = columns[i + 1];
    if (!leftCol || !rightCol) continue;
    folds.push({
      id: `fold-${leftCol.id}-${rightCol.id}`,
      from: { x: leftCol.x1, y: isBellowsBlank ? bellowsTopY : bodyTopY },
      to: { x: leftCol.x1, y: isBellowsBlank ? bellowsBotY : bodyBottomY },
      angle: 90,
    });
  }

  // Build wall faces & flap faces + horizontal folds
  const flapGroupEntries: FoldGroup[] = [];

  const emitFlapSide = (
    side: 'top' | 'bottom',
    col: PanelColumnSpec,
    geom: ColumnFlapGeometry,
    wallFolds: string[],
    wallAdjacent: string[],
  ): string[] => {
    if (!geom.hasFlap) {
      return [];
    }
    const hingeY = side === 'top' ? bodyTopY : bodyBottomY;
    const dir: -1 | 1 = side === 'top' ? -1 : 1;
    const wrapPivotFoldId = geom.wrapPivotFoldIdSuffix
      ? `fold-${side}-${col.id}-${geom.wrapPivotFoldIdSuffix}`
      : null;
    const hingeFoldId = wrapPivotFoldId
      ? wrapPivotFoldId
      : side === 'bottom' && col.id === 'front'
        ? 'fold-front-bottom-flap'
        : `fold-${side}-${col.id}`;

    if (!wrapPivotFoldId) {
      folds.push({
        id: hingeFoldId,
        from: { x: col.x0, y: hingeY },
        to: { x: col.x1, y: hingeY },
        angle: 90,
      });
      wallFolds.push(hingeFoldId);
    }

    const articulatedFolds: string[] = [];
    for (const extra of geom.extraFolds) {
      const aMm: Point = {
        x: roundMm(col.x0 + extra.a.u * col.width),
        y: roundMm(hingeY + dir * extra.a.h),
      };
      const bMm: Point = {
        x: roundMm(col.x0 + extra.b.u * col.width),
        y: roundMm(hingeY + dir * extra.b.h),
      };
      const foldId =
        extra.idSuffix === 'tuck-tongue'
          ? `fold-${side}-tuck-tongue`
          : `fold-${side}-${col.id}-${extra.idSuffix}`;
      folds.push({
        id: foldId,
        from: aMm,
        to: bMm,
        angle: 90,
      });
      if (extra.isArticulatedTuck) {
        articulatedFolds.push(foldId);
      }
    }

    const faceId = `${side}-flap-${col.id}`;
    const bellowsA = geom.extraFolds.find((f) => f.idSuffix === 'bellows-a');
    const bellowsB = geom.extraFolds.find((f) => f.idSuffix === 'bellows-b');

    if (bellowsA && bellowsB) {
      const halfH = bellowsA.b.h;
      const centerPts: FlapPointSpec[] = [
        { u: 0, h: 0 },
        { u: 0.5, h: halfH },
        { u: 1, h: 0 },
      ];
      const leftWebPts: FlapPointSpec[] = [
        { u: 0, h: 0 },
        { u: 0, h: halfH },
        { u: 0.5, h: halfH },
      ];
      const rightWebPts: FlapPointSpec[] = [
        { u: 0.5, h: halfH },
        { u: 1, h: halfH },
        { u: 1, h: 0 },
      ];

      const centerFaceMm = mapFlapPointsToMm(centerPts, col.x0, col.width, hingeY, dir);
      const leftFaceMm = mapFlapPointsToMm(leftWebPts, col.x0, col.width, hingeY, dir);
      const rightFaceMm = mapFlapPointsToMm(rightWebPts, col.x0, col.width, hingeY, dir);

      const centerFaceId = faceId;
      const leftFaceId = `${faceId}-bellows-a`;
      const rightFaceId = `${faceId}-bellows-b`;

      const foldBellowsAId = `fold-${side}-${col.id}-bellows-a`;
      const foldBellowsBId = `fold-${side}-${col.id}-bellows-b`;

      faces.push(
        {
          id: centerFaceId,
          name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Flap Center`,
          path: buildClosedSvgPolygon(centerFaceMm),
          folds: [hingeFoldId, foldBellowsAId, foldBellowsBId],
          adjacentFaces: [col.id],
        },
        {
          id: leftFaceId,
          name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Bellows Left`,
          path: buildClosedSvgPolygon(leftFaceMm),
          folds: [foldBellowsAId],
          adjacentFaces: [centerFaceId],
        },
        {
          id: rightFaceId,
          name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Bellows Right`,
          path: buildClosedSvgPolygon(rightFaceMm),
          folds: [foldBellowsBId],
          adjacentFaces: [centerFaceId],
        },
      );
      wallAdjacent.push(centerFaceId);

      const bellowsStage: [number, number] = side === 'bottom' ? [30, 60] : [60, 90];

      // Main flap group contains center face + both corner bellows webs
      flapGroupEntries.push({
        id: `group-${side}-flap-${col.id}`,
        name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Flap`,
        faceIds: [centerFaceId, leftFaceId, rightFaceId],
        pivotFoldId: hingeFoldId,
        animatedAngleRange: [0, 90],
        foldStage: bellowsStage,
        layerOrder: 1,
        layerOffsetDirection: side === 'top' ? -1 : 1,
      });

      // Child angled fold group for left bellows web: pleats inward at 45 deg
      flapGroupEntries.push({
        id: `group-${side}-flap-${col.id}-bellows-a`,
        name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Bellows Left`,
        faceIds: [leftFaceId],
        pivotFoldId: foldBellowsAId,
        animatedAngleRange: [0, -45],
        foldStage: bellowsStage,
        layerOrder: 0,
      });

      // Child angled fold group for right bellows web: pleats inward at 45 deg
      flapGroupEntries.push({
        id: `group-${side}-flap-${col.id}-bellows-b`,
        name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Bellows Right`,
        faceIds: [rightFaceId],
        pivotFoldId: foldBellowsBId,
        animatedAngleRange: [0, 45],
        foldStage: bellowsStage,
        layerOrder: 0,
      });

      return [centerFaceId, leftFaceId, rightFaceId];
    }

    const polyPts = geom.facePolygons[0]?.points ?? geom.cutContour;
    const facePtsMm = mapFlapPointsToMm(polyPts, col.x0, col.width, hingeY, dir);
    const holePaths: string[] = [];
    for (const hole of geom.holes) {
      const holeMm = mapFlapPointsToMm(hole, col.x0, col.width, hingeY, dir);
      holePaths.push(buildClosedSvgPolygon(holeMm));
    }
    const facePath = [buildClosedSvgPolygon(facePtsMm), ...holePaths].join(' ');
    faces.push({
      id: faceId,
      name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Flap`,
      path: facePath,
      folds: [hingeFoldId, ...articulatedFolds],
      adjacentFaces: wrapPivotFoldId ? [] : [col.id],
    });
    if (!wrapPivotFoldId) {
      wallAdjacent.push(faceId);
    }

    const isUpright = geom.animatedAngleRange?.[0] === 0 && geom.animatedAngleRange?.[1] === 0;
    const isTuckTopPreset =
      side === 'top' &&
      (topPreset === 'euroslot-240-top' ||
        topPreset === 'euroslot-241-top' ||
        topPreset === 'euroslot-242-top' ||
        topPreset === 'tuck-lid-215-c0' ||
        topPreset === 'rett-c0' ||
        topPreset === 'rett-c2' ||
        config.topFlapType === 'tuck');
    const isTuckLid =
      isTuckTopPreset &&
      col.basis === 'L' &&
      !isUpright &&
      geom.extraFolds.some(
        (f) =>
          f.idSuffix === 'tuck-tongue' ||
          f.idSuffix === 'latch-lock' ||
          f.idSuffix === 'latch-tab' ||
          f.isArticulatedTuck,
      );
    const isDustFlap =
      isTuckTopPreset && (col.basis === 'W' || (geom.layerOrder ?? 1) === 0) && !isUpright;

    let resolvedLayerOrder: number;
    let resolvedTier: number | undefined;
    let foldStage: [number, number];

    let resolvedTongueStage: [number, number] | undefined = geom.tongueFoldStage;
    let resolvedTongueRange: [number, number] | undefined = geom.tongueAnimatedAngleRange;
    let resolvedTongueLayerOrder: number | undefined = geom.tongueLayerOrder;
    let resolvedTongueOffsetMm: number | undefined = geom.tongueLayerOffsetMm;

    if (isTuckLid) {
      // Main lid folds over dust flaps [75, 85], tongue folds inside [85, 90]
      foldStage = [75, 85];
      resolvedLayerOrder = 1;
      resolvedTier = 2.0;
      resolvedTongueStage = [85, 90];
      resolvedTongueRange = [0, 90];
      resolvedTongueLayerOrder = -1;
      resolvedTongueOffsetMm = -roundMm(thickness * 1.5 + 0.5);
    } else if (isDustFlap) {
      // Left/right dust flaps fold inward [60, 75]
      foldStage = [60, 75];
      resolvedLayerOrder = 0;
      resolvedTier = col.id === 'left' ? 0.4 : 0.8;
      // Preserve side-wing upward articulation if defined on geom (e.g. 0241)
      if (geom.tongueFoldStage) {
        resolvedTongueStage = geom.tongueFoldStage;
        resolvedTongueRange = geom.tongueAnimatedAngleRange;
      }
    } else if (geom.foldStage) {
      foldStage = geom.foldStage;
      resolvedLayerOrder = geom.layerOrder ?? 1;
      resolvedTier = geom.layerOffsetTier;
    } else if (side === 'bottom') {
      foldStage = wrapPivotFoldId ? [60, 75] : [0, 30];
      if (wrapPivotFoldId) {
        resolvedLayerOrder = 2;
        resolvedTier = 2.0;
      } else if (PLANAR_SLOTTED_PRESETS.has(bottomPreset)) {
        if (col.basis === 'L') {
          resolvedLayerOrder = 1;
          resolvedTier = (botOverlap.outerOverlaps ? 1 : 0) + (col.id === 'back-right' ? 0.4 : 0);
        } else {
          resolvedLayerOrder = 0;
          resolvedTier =
            (botOverlap.outerOverlaps ? 2 : 1) +
            (botOverlap.innerOverlaps && col.id === 'right' ? 0.4 : 0);
        }
      } else {
        resolvedLayerOrder = geom.layerOrder ?? 1;
        resolvedTier = geom.layerOffsetTier;
      }
    } else if (isUpright) {
      foldStage = hasBottomAnchor ? [60, 90] : [45, 90];
      resolvedLayerOrder = geom.layerOrder ?? 1;
      resolvedTier = geom.layerOffsetTier ?? 1.5;
    } else if (PLANAR_SLOTTED_PRESETS.has(topPreset)) {
      if (col.basis === 'W') {
        resolvedLayerOrder = 0;
        resolvedTier = topOverlap.innerOverlaps && col.id === 'right' ? 0.4 : 0;
        foldStage = hasBottomAnchor ? [60, 75] : [45, 68];
      } else if (!topOverlap.outerOverlaps) {
        resolvedLayerOrder = 1;
        resolvedTier = 1;
        foldStage = hasBottomAnchor ? [75, 90] : [68, 90];
      } else if (col.id === 'front') {
        resolvedLayerOrder = 2;
        resolvedTier = 2;
        foldStage = hasBottomAnchor ? [82, 90] : [78, 90];
      } else {
        resolvedLayerOrder = 1;
        resolvedTier = col.id === 'back-right' ? 1.4 : 1;
        foldStage = hasBottomAnchor ? [75, 83] : [68, 80];
      }
    } else if ((geom.layerOrder ?? 1) === 0) {
      resolvedLayerOrder = 0;
      resolvedTier =
        geom.layerOffsetTier ?? (topOverlap.innerOverlaps && col.id === 'right' ? 0.4 : 0);
      foldStage = hasBottomAnchor ? [60, 72] : [45, 68];
    } else if (topOverlap.outerOverlaps) {
      if (col.id === 'front') {
        resolvedLayerOrder = Math.max(2, geom.layerOrder ?? 2);
        resolvedTier = Math.max(2, geom.layerOffsetTier ?? 2);
        foldStage = hasBottomAnchor ? [82, 90] : [78, 90];
      } else {
        resolvedLayerOrder = geom.layerOrder ?? 1;
        resolvedTier = geom.layerOffsetTier ?? 1;
        foldStage = hasBottomAnchor ? [75, 83] : [68, 80];
      }
    } else {
      resolvedLayerOrder = geom.layerOrder ?? 1;
      resolvedTier = geom.layerOffsetTier;
      foldStage = hasBottomAnchor ? [72, 84] : [68, 90];
    }

    flapGroupEntries.push({
      id: `group-${side}-flap-${col.id}`,
      name: `${side === 'top' ? 'Top' : 'Bottom'} ${col.name} Flap`,
      faceIds: [faceId],
      pivotFoldId: hingeFoldId,
      animatedAngleRange: geom.animatedAngleRange ?? [0, 90],
      foldStage,
      layerOrder: resolvedLayerOrder,
      layerOffsetDirection: wrapPivotFoldId ? -1 : side === 'top' ? -1 : 1,
      ...(resolvedTier !== undefined ? { layerOffsetTier: resolvedTier } : {}),
      ...(resolvedTongueLayerOrder !== undefined
        ? { tongueLayerOrder: resolvedTongueLayerOrder }
        : {}),
      ...(resolvedTongueOffsetMm !== undefined
        ? { tongueLayerOffsetMm: resolvedTongueOffsetMm }
        : {}),
      ...(resolvedTongueStage ? { tongueFoldStage: resolvedTongueStage } : {}),
      ...(resolvedTongueRange ? { tongueAnimatedAngleRange: resolvedTongueRange } : {}),
    });

    return wrapPivotFoldId ? [] : [faceId];
  };

  const colFlapIds = new Map<string, string[]>();
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    const topGeom = topGeoms[i];
    const botGeom = botGeoms[i];
    if (!col || !topGeom || !botGeom) continue;

    const wallFolds: string[] = [];
    const wallAdjacent: string[] = [];

    if (i === 0 && hasBeveledGlueTab) {
      wallFolds.push(`fold-glue-${col.id}`);
      wallAdjacent.push('glue-tab');
    }
    if (i > 0) {
      const prev = columns[i - 1];
      if (prev) {
        wallFolds.push(`fold-${prev.id}-${col.id}`);
        wallAdjacent.push(prev.id);
      }
    }
    if (i < columns.length - 1) {
      const next = columns[i + 1];
      if (next) {
        wallFolds.push(`fold-${col.id}-${next.id}`);
        wallAdjacent.push(next.id);
      }
    }

    const topIds = emitFlapSide('top', col, topGeom, wallFolds, wallAdjacent);
    const botIds = emitFlapSide('bottom', col, botGeom, wallFolds, wallAdjacent);
    colFlapIds.set(col.id, [...topIds, ...botIds]);

    faces.push({
      id: col.id,
      name: col.name,
      path: buildWallPanelPath(col.x0, bodyTopY, col.x1, bodyBottomY),
      folds: wallFolds,
      adjacentFaces: wallAdjacent,
    });
  }

  let baseFaceId: string;
  const wallFoldGroups: FoldGroup[] = [];

  if (anchorColIdx >= 0) {
    const anchorCol = columns[anchorColIdx]!;
    baseFaceId = `bottom-flap-${anchorCol.id}`;
    const anchorPivotFoldId =
      anchorCol.id === 'front' ? 'fold-front-bottom-flap' : `fold-bottom-${anchorCol.id}`;

    // Helper: collect all faceIds in columns [fromIdx .. toIdx] inclusive
    const collectSubtreeFaces = (fromIdx: number, toIdx: number): string[] => {
      const ids: string[] = [];
      for (let idx = fromIdx; idx <= toIdx; idx += 1) {
        const c = columns[idx];
        if (!c) continue;
        ids.push(c.id, ...(colFlapIds.get(c.id) ?? []));
      }
      if (fromIdx === 0 && hasBeveledGlueTab) {
        ids.push('glue-tab');
      }
      return ids;
    };

    // Main upright wall chain pivoted on baseFaceId (contains every face except baseFaceId)
    const rootWallFaces = collectSubtreeFaces(0, columns.length - 1).filter(
      (id) => id !== baseFaceId,
    );
    wallFoldGroups.push({
      id: `group-${anchorCol.id}-assembly`,
      name: `${anchorCol.name} Wall Assembly`,
      faceIds: rootWallFaces,
      pivotFoldId: anchorPivotFoldId,
      animatedAngleRange: [0, 90],
      foldStage: [0, 30],
    });

    // Leftward chain: anchorColIdx - 1 down to 0 -> glue-tab
    for (let k = anchorColIdx - 1; k >= 0; k -= 1) {
      const col = columns[k]!;
      const rightNeighbor = columns[k + 1]!;
      wallFoldGroups.push({
        id: `group-${col.id}-wall`,
        name: `${col.name} Wall`,
        faceIds: collectSubtreeFaces(0, k),
        pivotFoldId: `fold-${col.id}-${rightNeighbor.id}`,
        animatedAngleRange: [0, 90],
        foldStage: [30, 60],
      });
    }

    if (hasBeveledGlueTab) {
      wallFoldGroups.push({
        id: 'group-glue-tab',
        name: 'Glue Tab',
        faceIds: ['glue-tab'],
        pivotFoldId: `fold-glue-${firstCol.id}`,
        animatedAngleRange: [0, 90],
        foldStage: [30, 60],
      });
    }

    // Rightward chain: anchorColIdx + 1 up to columns.length - 1
    for (let k = anchorColIdx + 1; k < columns.length; k += 1) {
      const col = columns[k]!;
      const leftNeighbor = columns[k - 1]!;
      wallFoldGroups.push({
        id: `group-${col.id}-wall`,
        name: `${col.name} Wall`,
        faceIds: collectSubtreeFaces(k, columns.length - 1),
        pivotFoldId: `fold-${leftNeighbor.id}-${col.id}`,
        animatedAngleRange: [0, 90],
        foldStage: [30, 60],
      });
    }
  } else {
    // Open top & open bottom fallback (no bottom flaps anywhere)
    const centerIdx = frontIdx >= 0 ? frontIdx : 0;
    const centerCol = columns[centerIdx]!;
    baseFaceId = centerCol.id;

    for (let k = centerIdx - 1; k >= 0; k -= 1) {
      const col = columns[k]!;
      const rightNeighbor = columns[k + 1]!;
      const ids: string[] = [];
      for (let idx = 0; idx <= k; idx += 1) {
        const c = columns[idx]!;
        ids.push(c.id, ...(colFlapIds.get(c.id) ?? []));
      }
      if (hasBeveledGlueTab) ids.push('glue-tab');
      wallFoldGroups.push({
        id: `group-${col.id}-wall`,
        name: `${col.name} Wall`,
        faceIds: ids,
        pivotFoldId: `fold-${col.id}-${rightNeighbor.id}`,
        animatedAngleRange: [0, 90],
        foldStage: [0, 45],
      });
    }
    if (hasBeveledGlueTab) {
      wallFoldGroups.push({
        id: 'group-glue-tab',
        name: 'Glue Tab',
        faceIds: ['glue-tab'],
        pivotFoldId: `fold-glue-${firstCol.id}`,
        animatedAngleRange: [0, 90],
        foldStage: [0, 45],
      });
    }
    for (let k = centerIdx + 1; k < columns.length; k += 1) {
      const col = columns[k]!;
      const leftNeighbor = columns[k - 1]!;
      const ids: string[] = [];
      for (let idx = k; idx < columns.length; idx += 1) {
        const c = columns[idx]!;
        ids.push(c.id, ...(colFlapIds.get(c.id) ?? []));
      }
      wallFoldGroups.push({
        id: `group-${col.id}-wall`,
        name: `${col.name} Wall`,
        faceIds: ids,
        pivotFoldId: `fold-${leftNeighbor.id}-${col.id}`,
        animatedAngleRange: [0, 90],
        foldStage: [0, 45],
      });
    }
  }

  // Filter out the base face's own flap group (baseFaceId stays stationary on floor Y = 0)
  const activeFlapGroups = flapGroupEntries.filter((g) => g.faceIds[0] !== baseFaceId);
  const foldGroups: FoldGroup[] = [...wallFoldGroups, ...activeFlapGroups];

  const bounds = computeSvgPathBoundsMm(outerPath);
  const safeBleed = Math.max(0, bleedSize);
  const bleedPath = buildWallPanelPath(
    roundMm(bounds.minX - safeBleed),
    roundMm(bounds.minY - safeBleed),
    roundMm(bounds.maxX + safeBleed),
    roundMm(bounds.maxY + safeBleed),
  );

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
    totalWidth: roundMm(bounds.width),
    totalHeight: roundMm(bounds.height),
    faces,
    cuts: allCuts,
    folds,
    bleeds: [
      {
        id: 'bleed-outer',
        path: bleedPath,
      },
    ],
    foldGroups,
  };
}
