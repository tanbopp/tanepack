import { pt, roundMm } from './geometry';
import type { FefcoFlapEndPreset, Point } from './types';

export interface FlapControlPointSpec {
  u: number;
  h: number;
}

export interface FlapPointSpec {
  /** Normalized horizontal coordinate along column width: 0 = left edge, 1 = right edge. */
  u: number;
  /** Outward distance from the body horizontal fold line in millimeters (>= 0). */
  h: number;
  /** Optional quadratic Bezier control point transitioning from previous point to this point. */
  quad?: FlapControlPointSpec;
  /** Optional cubic Bezier control points transitioning from previous point to this point. */
  cubic?: [FlapControlPointSpec, FlapControlPointSpec];
}

export interface MappedFlapPoint extends Point {
  quad?: Point;
  cubic?: [Point, Point];
}

export interface FlapCreaseSpec {
  a: FlapPointSpec;
  b: FlapPointSpec;
  idSuffix: string;
  /** True only for 90°/-90° articulated secondary fold lines split in 3D kinematics. */
  isArticulatedTuck?: boolean;
}

export interface ColumnFlapGeometry {
  /** Whether this column participates in a flap on this end. */
  hasFlap: boolean;
  /** Polyline tracing the outer cut contour left-to-right (u: 0 -> 1) from hinge base to hinge base. */
  cutContour: FlapPointSpec[];
  /** Closed polygon points (in u, h space) used to construct the 3D Face mesh, or multiple sub-faces (e.g. split flap). */
  facePolygons: Array<{
    faceIdSuffix?: string;
    points: FlapPointSpec[];
  }>;
  /** Optional closed internal cutout holes (merged into cut-outer with evenodd rule). */
  holes: FlapPointSpec[][];
  /** Optional interior slit cuts emitted as secondary Cut elements (open polylines or closed quad notches). */
  slits: FlapPointSpec[][];
  /** Optional internal or secondary crease lines emitted as Fold elements. */
  extraFolds: FlapCreaseSpec[];
  /** Override 3D rotation range (e.g. [0, 0] for upright Euroslot hang header). */
  animatedAngleRange?: [number, number];
  /** Optional global fold stage [startDeg, endDeg] override for this flap lid. */
  foldStage?: [number, number];
  /** Optional physical flap stacking order (0 = inner, 1+ = outer). */
  layerOrder?: number;
  /** Optional continuous physical stacking tier for Z-fighting clearance. */
  layerOffsetTier?: number;
  /** Optional tuck tongue layer order when flap contains an articulated secondary fold. */
  tongueLayerOrder?: number;
  /** Optional tuck tongue inward/outward offset in mm to prevent Z-fighting. */
  tongueLayerOffsetMm?: number;
  /** Optional articulated tongue/wing fold stage [startDeg, endDeg] override. */
  tongueFoldStage?: [number, number];
  /** Optional articulated tongue/wing angle range override (e.g. [0, -90] for upward wing). */
  tongueAnimatedAngleRange?: [number, number];
  /** Internal vertical fold idSuffix attaching this side wing directly to an adjacent wrap flap. */
  wrapPivotFoldIdSuffix?: string;
}

export interface EndClosureBuildParams {
  preset: FefcoFlapEndPreset;
  side: 'top' | 'bottom';
  colIndex: number;
  colId: string;
  colWidth: number;
  colBasis: 'L' | 'W';
  length: number;
  width: number;
  height: number;
  thickness: number;
  tuckDepth: number;
  /** Horizontal half-gap of slot cuts between adjacent flaps. */
  slotHalfMm: number;
  /** Allow inner W flaps to overlap across length L (e.g. FEFCO 0203 Full Overlap). */
  allowInnerOverlap?: boolean;
  /** Explicit ratio override when FefcoConfig passes custom flapMath. */
  explicitRatio?: number;
  /** Explicit basis override when FefcoConfig passes custom flapMath. */
  explicitBasis?: 'L' | 'W';
}

function emptyFlap(): ColumnFlapGeometry {
  return {
    hasFlap: false,
    cutContour: [],
    facePolygons: [],
    holes: [],
    slits: [],
    extraFolds: [],
  };
}

function rectangularFlap(
  flapHeight: number,
  uLeft: number,
  uRight: number,
  options?: {
    chamferH?: number;
    chamferInsetU?: number;
    layerOrder?: number;
    layerOffsetTier?: number;
    animatedAngleRange?: [number, number];
    foldStage?: [number, number];
    extraFolds?: FlapCreaseSpec[];
    holes?: FlapPointSpec[][];
    slits?: FlapPointSpec[][];
    tongueLayerOrder?: number;
    tongueLayerOffsetMm?: number;
    tongueFoldStage?: [number, number];
    tongueAnimatedAngleRange?: [number, number];
    wrapPivotFoldIdSuffix?: string;
  },
): ColumnFlapGeometry {
  const safeH = roundMm(flapHeight);
  const chamferH = options?.chamferH ?? 0;
  const insetU = options?.chamferInsetU ?? 0;

  const cutContour: FlapPointSpec[] =
    chamferH > 0 && insetU > 0
      ? [
          { u: uLeft, h: 0 },
          { u: uLeft + insetU, h: chamferH },
          { u: uLeft + insetU, h: safeH },
          { u: uRight - insetU, h: safeH },
          { u: uRight - insetU, h: chamferH },
          { u: uRight, h: 0 },
        ]
      : [
          { u: uLeft, h: 0 },
          { u: uLeft, h: safeH },
          { u: uRight, h: safeH },
          { u: uRight, h: 0 },
        ];

  return {
    hasFlap: true,
    cutContour,
    facePolygons: [
      {
        points: [
          { u: uLeft, h: 0 },
          { u: uLeft, h: safeH },
          { u: uRight, h: safeH },
          { u: uRight, h: 0 },
        ],
      },
    ],
    holes: options?.holes ?? [],
    slits: options?.slits ?? [],
    extraFolds: options?.extraFolds ?? [],
    ...(options?.layerOrder !== undefined ? { layerOrder: options.layerOrder } : {}),
    ...(options?.layerOffsetTier !== undefined ? { layerOffsetTier: options.layerOffsetTier } : {}),
    ...(options?.animatedAngleRange ? { animatedAngleRange: options.animatedAngleRange } : {}),
    ...(options?.foldStage ? { foldStage: options.foldStage } : {}),
    ...(options?.tongueLayerOrder !== undefined
      ? { tongueLayerOrder: options.tongueLayerOrder }
      : {}),
    ...(options?.tongueLayerOffsetMm !== undefined
      ? { tongueLayerOffsetMm: options.tongueLayerOffsetMm }
      : {}),
    ...(options?.tongueFoldStage ? { tongueFoldStage: options.tongueFoldStage } : {}),
    ...(options?.tongueAnimatedAngleRange
      ? { tongueAnimatedAngleRange: options.tongueAnimatedAngleRange }
      : {}),
    ...(options?.wrapPivotFoldIdSuffix
      ? { wrapPivotFoldIdSuffix: options.wrapPivotFoldIdSuffix }
      : {}),
  };
}

const BEZIER_K = 0.55228;

function roundRatio(val: number): number {
  return Math.round(val * 10000) / 10000;
}

function cubicCorner(
  fromU: number,
  fromH: number,
  toU: number,
  toH: number,
  startAxis: 'vertical' | 'horizontal',
): FlapPointSpec {
  const c1 =
    startAxis === 'vertical'
      ? { u: roundRatio(fromU), h: roundMm(fromH + (toH - fromH) * BEZIER_K) }
      : { u: roundRatio(fromU + (toU - fromU) * BEZIER_K), h: roundMm(fromH) };
  const c2 =
    startAxis === 'vertical'
      ? { u: roundRatio(toU - (toU - fromU) * BEZIER_K), h: roundMm(toH) }
      : { u: roundRatio(toU), h: roundMm(toH - (toH - fromH) * BEZIER_K) };
  return { u: roundRatio(toU), h: roundMm(toH), cubic: [c1, c2] };
}

function createCircleHole(
  uCenter: number,
  hCenter: number,
  rxU: number,
  ryMm: number,
): FlapPointSpec[] {
  const loH = roundMm(hCenter - ryMm);
  const hiH = roundMm(hCenter + ryMm);
  const midH = roundMm(hCenter);
  const leftU = roundRatio(uCenter - rxU);
  const rightU = roundRatio(uCenter + rxU);
  const midU = roundRatio(uCenter);
  return [
    { u: midU, h: loH },
    cubicCorner(midU, loH, rightU, midH, 'horizontal'),
    cubicCorner(rightU, midH, midU, hiH, 'vertical'),
    cubicCorner(midU, hiH, leftU, midH, 'horizontal'),
    cubicCorner(leftU, midH, midU, loH, 'vertical'),
  ];
}

function createRoundedTuckContours(
  coverHeight: number,
  tuckDepth: number,
  uLeft: number,
  uRight: number,
  thickness: number,
): {
  cutContour: FlapPointSpec[];
  facePoly: FlapPointSpec[];
  crease: FlapCreaseSpec;
  tongueLayerOffsetMm: number;
  foldStage: [number, number];
  tongueFoldStage: [number, number];
} {
  const totalH = roundMm(coverHeight + tuckDepth);
  const shoulderH = roundMm(coverHeight + tuckDepth * 0.54);
  const radiusU = roundRatio(Math.min(0.08, 0.03 + tuckDepth * 0.0022));
  const topLeftU = roundRatio(uLeft + radiusU);
  const topRightU = roundRatio(uRight - radiusU);
  const cutContour: FlapPointSpec[] = [
    { u: uLeft, h: 0 },
    { u: uLeft, h: shoulderH },
    cubicCorner(uLeft, shoulderH, topLeftU, totalH, 'vertical'),
    { u: topRightU, h: totalH },
    cubicCorner(topRightU, totalH, uRight, shoulderH, 'horizontal'),
    { u: uRight, h: 0 },
  ];

  return {
    cutContour,
    facePoly: cutContour,
    crease: {
      a: { u: uLeft, h: coverHeight },
      b: { u: uRight, h: coverHeight },
      idSuffix: 'tuck-tongue',
      isArticulatedTuck: true,
    },
    tongueLayerOffsetMm: -roundMm(Math.max(1.2, thickness * 1.5 + 0.5)),
    foldStage: [72, 84],
    tongueFoldStage: [84, 90],
  };
}

function createEuroslotHole(
  uCenter: number,
  yCenter: number,
  wMm: number,
  colWidth: number,
): FlapPointSpec[] {
  const hw = Math.min(0.24, Math.max(0.14, (wMm * 0.162) / Math.max(1, colWidth)));
  const stemHalfU = hw * 0.31;
  const barLo = roundMm(yCenter - wMm * 0.024);
  const barHi = roundMm(yCenter + wMm * 0.024);
  const barMid = roundMm((barLo + barHi) * 0.5);
  const topPeak = roundMm(yCenter + wMm * 0.062);
  const botPeak = roundMm(yCenter - wMm * 0.056);
  const capU = Math.min(hw * 0.22, ((barHi - barLo) * 0.5) / Math.max(1, colWidth));

  const uLeft = roundRatio(uCenter - hw);
  const uRight = roundRatio(uCenter + hw);
  const uCapL = roundRatio(uLeft + capU);
  const uCapR = roundRatio(uRight - capU);
  const us0 = roundRatio(uCenter - stemHalfU);
  const us1 = roundRatio(uCenter + stemHalfU);
  const uMid = roundRatio(uCenter);

  return [
    { u: uMid, h: botPeak },
    cubicCorner(uMid, botPeak, us1, barLo, 'horizontal'),
    { u: uCapR, h: barLo },
    cubicCorner(uCapR, barLo, uRight, barMid, 'horizontal'),
    cubicCorner(uRight, barMid, uCapR, barHi, 'vertical'),
    { u: us1, h: barHi },
    cubicCorner(us1, barHi, uMid, topPeak, 'vertical'),
    cubicCorner(uMid, topPeak, us0, barHi, 'horizontal'),
    { u: uCapL, h: barHi },
    cubicCorner(uCapL, barHi, uLeft, barMid, 'horizontal'),
    cubicCorner(uLeft, barMid, uCapL, barLo, 'vertical'),
    { u: us0, h: barLo },
    cubicCorner(us0, barLo, uMid, botPeak, 'vertical'),
  ];
}

function createStadiumHole(
  uMin: number,
  uMax: number,
  hMin: number,
  hMax: number,
): FlapPointSpec[] {
  const h0 = roundMm(hMin);
  const h1 = roundMm(hMax);
  const midH = roundMm((h0 + h1) * 0.5);
  const cap = Math.min(0.065, (uMax - uMin) * 0.24);
  const u0 = roundRatio(uMin);
  const u1 = roundRatio(uMax);
  const u0Cap = roundRatio(uMin + cap);
  const u1Cap = roundRatio(uMax - cap);
  const uMid = roundRatio((uMin + uMax) * 0.5);
  return [
    { u: uMid, h: h0 },
    { u: u1Cap, h: h0 },
    cubicCorner(u1Cap, h0, u1, midH, 'horizontal'),
    cubicCorner(u1, midH, u1Cap, h1, 'vertical'),
    { u: u0Cap, h: h1 },
    cubicCorner(u0Cap, h1, u0, midH, 'horizontal'),
    cubicCorner(u0, midH, u0Cap, h0, 'vertical'),
    { u: uMid, h: h0 },
  ];
}

function isOuterColumn(colId: string, colBasis: 'L' | 'W'): boolean {
  return (
    colId === 'front' ||
    colId === 'back' ||
    colId === 'back-left' ||
    colId === 'back-right' ||
    colBasis === 'L'
  );
}

function defaultStackingForColumn(
  colId: string,
  outerFlap: boolean,
): { layerOrder: number; tier: number } {
  if (!outerFlap) {
    return colId === 'left' ? { layerOrder: 0, tier: 0.5 } : { layerOrder: 0, tier: 1.0 };
  }
  return colId === 'front' ? { layerOrder: 2, tier: 2.0 } : { layerOrder: 1, tier: 1.0 };
}

function buildTuckLidGeom(
  side: 'top' | 'bottom',
  coverHeight: number,
  tuckDepth: number,
  uLeft: number,
  uRight: number,
  thickness: number,
  options?: {
    holes?: FlapPointSpec[][];
    slits?: FlapPointSpec[][];
    extraFolds?: FlapCreaseSpec[];
    layerOffsetTier?: number;
  },
): ColumnFlapGeometry {
  const tuck = createRoundedTuckContours(coverHeight, tuckDepth, uLeft, uRight, thickness);
  return {
    hasFlap: true,
    cutContour: tuck.cutContour,
    facePolygons: [{ points: tuck.facePoly }],
    holes: options?.holes ?? [],
    slits: options?.slits ?? [],
    extraFolds: [tuck.crease, ...(options?.extraFolds ?? [])],
    layerOrder: 1,
    layerOffsetTier: options?.layerOffsetTier ?? 2.5,
    tongueLayerOrder: -1,
    tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
    ...(side === 'top' ? { foldStage: tuck.foldStage } : {}),
    tongueFoldStage: tuck.tongueFoldStage,
  };
}

function buildSnapLockColumn(params: EndClosureBuildParams): ColumnFlapGeometry {
  const { colIndex, colWidth, width, slotHalfMm } = params;
  const slotU = Math.min(0.03, slotHalfMm / Math.max(1, colWidth));
  const uL = roundRatio(slotU);
  const uR = roundRatio(1 - slotU);
  const hOuter = roundMm(0.633 * width);
  const hNotch = roundMm(0.5 * width);
  const hChamfer = roundMm(0.599 * width);
  const hWingStep = roundMm(0.376 * width);

  if (colIndex === 0) {
    // Female U-notched lock flap with rounded interior shoulders
    const cutContour: FlapPointSpec[] = [
      { u: uL, h: 0 },
      { u: uL, h: hOuter },
      { u: 0.288, h: hOuter },
      cubicCorner(0.288, hOuter, 0.313, hChamfer, 'horizontal'),
      { u: 0.313, h: hNotch },
      { u: 0.687, h: hNotch },
      { u: 0.687, h: hChamfer },
      cubicCorner(0.687, hChamfer, 0.712, hOuter, 'vertical'),
      { u: uR, h: hOuter },
      { u: uR, h: 0 },
    ];
    return {
      hasFlap: true,
      cutContour,
      facePolygons: [{ points: cutContour }],
      holes: [],
      slits: [],
      extraFolds: [],
      layerOrder: 1,
      layerOffsetTier: 2.0,
    };
  }

  if (colIndex === 1) {
    // Left mitered snap-lock wing with smooth rounded shoulder
    const cutContour: FlapPointSpec[] = [
      { u: 0, h: 0 },
      { u: 0.5, h: hWingStep },
      { u: 0.5, h: hChamfer },
      cubicCorner(0.5, hChamfer, 0.533, hOuter, 'vertical'),
      { u: uR, h: hOuter },
      { u: uR, h: 0 },
    ];
    return {
      hasFlap: true,
      cutContour,
      facePolygons: [{ points: cutContour }],
      holes: [],
      slits: [],
      extraFolds: [],
      layerOrder: 0,
      layerOffsetTier: 1.0,
    };
  }

  if (colIndex === 2) {
    // Center tapered locking tongue with rounded outer tips
    const cutContour: FlapPointSpec[] = [
      { u: uL, h: 0 },
      { u: 0.315, h: hNotch },
      { u: 0.315, h: hChamfer },
      cubicCorner(0.315, hChamfer, 0.34, hOuter, 'vertical'),
      { u: 0.66, h: hOuter },
      cubicCorner(0.66, hOuter, 0.685, hChamfer, 'horizontal'),
      { u: 0.685, h: hNotch },
      { u: uR, h: 0 },
    ];
    return {
      hasFlap: true,
      cutContour,
      facePolygons: [{ points: cutContour }],
      holes: [],
      slits: [],
      extraFolds: [],
      layerOrder: 1,
      layerOffsetTier: 2.6,
    };
  }

  // Right mitered snap-lock wing (colIndex === 3) with smooth rounded shoulder
  const cutContour: FlapPointSpec[] = [
    { u: uL, h: 0 },
    { u: uL, h: hOuter },
    { u: 0.467, h: hOuter },
    cubicCorner(0.467, hOuter, 0.5, hChamfer, 'horizontal'),
    { u: 0.5, h: hWingStep },
    { u: 1, h: 0 },
  ];
  return {
    hasFlap: true,
    cutContour,
    facePolygons: [{ points: cutContour }],
    holes: [],
    slits: [],
    extraFolds: [],
    layerOrder: 0,
    layerOffsetTier: 1.4,
  };
}

/**
 * Builds exact PDF-calibrated FEFCO column flap geometry (outline, 3D face polygon, cutouts, internal creases).
 */
export function buildColumnFlapGeometry(params: EndClosureBuildParams): ColumnFlapGeometry {
  const {
    preset,
    colIndex,
    colId,
    colWidth,
    colBasis,
    length,
    width,
    thickness,
    tuckDepth,
    slotHalfMm,
    allowInnerOverlap,
    explicitRatio,
    explicitBasis,
  } = params;

  const slotU = Math.min(0.04, slotHalfMm / Math.max(1, colWidth));
  const uL = roundMm(slotU);
  const uR = roundMm(1 - slotU);
  const outerFlap = isOuterColumn(colId, colBasis);
  const stack = defaultStackingForColumn(colId, outerFlap);
  const clampInner = (nominalH: number): number => {
    if (outerFlap || explicitBasis === 'L' || allowInnerOverlap) {
      return nominalH;
    }
    const maxInnerNoOverlap = Math.max(4, roundMm(length / 2 - Math.max(2, thickness * 2)));
    return Math.min(nominalH, maxInnerNoOverlap);
  };

  switch (preset) {
    case 'none':
      return emptyFlap();

    case 'rsc': {
      const basisVal = explicitBasis === 'L' ? length : width;
      const ratio = explicitRatio ?? 0.5;
      return rectangularFlap(clampInner(basisVal * ratio), uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });
    }

    case 'rsc-44':
      return rectangularFlap(clampInner(0.44 * width), uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'extended-55':
      return rectangularFlap(0.55 * width, uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'reduced-25':
      return rectangularFlap(clampInner(0.25 * width), uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'full-overlap':
      return rectangularFlap(1.0 * width, uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'center-special':
      return rectangularFlap(outerFlap ? 0.5 * width : 0.5 * length, uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'all-half-L':
      return rectangularFlap(0.5 * length, uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'center-special-full':
      return rectangularFlap(outerFlap ? 1.0 * width : 0.5 * length, uL, uR, {
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      });

    case 'rim-flange-214': {
      const stepH = roundMm(Math.max(2, Math.min(4, width * 0.03)));
      const flapH = roundMm(0.5 * width + stepH);
      return rectangularFlap(flapH, 0, 1, {
        chamferH: stepH,
        chamferInsetU: uL,
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
        extraFolds: [
          {
            a: { u: uL, h: stepH },
            b: { u: uR, h: stepH },
            idSuffix: 'rim',
          },
        ],
      });
    }

    case 'rett-c0': {
      if (colIndex === 0) {
        return buildTuckLidGeom(params.side, 1.0 * width, tuckDepth, uL, uR, thickness);
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.6 * width, 0.03, 0.97, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
          ...(params.side === 'top' ? { foldStage: [60, 72] } : {}),
        });
      }
      return emptyFlap();
    }

    case 'rett-c2': {
      if (colIndex === 2) {
        return buildTuckLidGeom(params.side, 1.0 * width, tuckDepth, uL, uR, thickness);
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.6 * width, 0.03, 0.97, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
          ...(params.side === 'top' ? { foldStage: [60, 72] } : {}),
        });
      }
      return emptyFlap();
    }

    case 'tuck-lid-215-c0': {
      if (colIndex === 0) {
        return buildTuckLidGeom(params.side, 1.0 * width, tuckDepth, uL, uR, thickness);
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.37 * width, 0.02, 0.98, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
          ...(params.side === 'top' ? { foldStage: [60, 72] } : {}),
        });
      }
      return emptyFlap();
    }

    case 'snap-lock':
      return buildSnapLockColumn(params);

    case 'partition-207-bot': {
      const fullH = roundMm(0.94 * width);
      if (colBasis === 'L') {
        const creaseA = roundMm(0.5 * width);
        const creaseB = roundMm(0.75 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0.01, h: 0 },
          { u: 0.01, h: fullH },
          { u: 0.24, h: fullH },
          { u: 0.33, h: creaseB },
          { u: 0.32, h: roundMm(0.92 * width) },
          { u: 0.34, h: fullH },
          { u: 0.66, h: fullH },
          { u: 0.67, h: roundMm(0.92 * width) },
          { u: 0.67, h: creaseB },
          { u: 0.76, h: fullH },
          { u: 0.99, h: fullH },
          { u: 0.99, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [
            { a: { u: 0.01, h: creaseA }, b: { u: 0.99, h: creaseA }, idSuffix: 'part-a' },
            { a: { u: 0.01, h: creaseB }, b: { u: 0.99, h: creaseB }, idSuffix: 'part-b' },
          ],
          layerOrder: 1,
          layerOffsetTier: stack.tier,
        };
      }

      // W partition panels (c1, c3) with center slot & bottom notch
      const notchH = roundMm(0.82 * width);
      const slitH = roundMm(0.69 * width);
      const midCreaseH = roundMm(0.44 * width);
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: uL, h: fullH },
        { u: 0.49, h: fullH },
        { u: 0.49, h: notchH },
        { u: 0.51, h: notchH },
        { u: 0.51, h: fullH },
        { u: uR, h: fullH },
        { u: uR, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [
          {
            points: [
              { u: uL, h: 0 },
              { u: uL, h: fullH },
              { u: uR, h: fullH },
              { u: uR, h: 0 },
            ],
          },
        ],
        holes: [],
        slits: [
          [
            { u: 0.49, h: 0 },
            { u: 0.49, h: slitH },
            { u: 0.51, h: slitH },
            { u: 0.51, h: 0 },
          ],
        ],
        extraFolds: [
          { a: { u: uL, h: midCreaseH }, b: { u: uR, h: midCreaseH }, idSuffix: 'part-w' },
        ],
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      };
    }

    case 'partition-208': {
      const partStep = Math.min(
        params.height * 0.5,
        Math.max(width * 0.16, (length - width) * 0.5),
      );
      const fullH = roundMm(0.5 * width + partStep);
      const creaseH = roundMm(0.5 * width);
      if (colBasis === 'L') {
        return rectangularFlap(fullH, uL, uR, {
          layerOrder: 1,
          layerOffsetTier: stack.tier,
          extraFolds: [
            { a: { u: uL, h: creaseH }, b: { u: uR, h: creaseH }, idSuffix: 'part-mid' },
          ],
        });
      }
      // Split center W panel
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: uL, h: fullH },
        { u: 0.49, h: fullH },
        { u: 0.49, h: 0 },
        { u: 0.51, h: 0 },
        { u: 0.51, h: fullH },
        { u: uR, h: fullH },
        { u: uR, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [
          {
            points: [
              { u: uL, h: 0 },
              { u: uL, h: fullH },
              { u: uR, h: fullH },
              { u: uR, h: 0 },
            ],
          },
        ],
        holes: [],
        slits: [],
        extraFolds: [
          { a: { u: uL, h: creaseH }, b: { u: 0.49, h: creaseH }, idSuffix: 'part-wa' },
          { a: { u: 0.51, h: creaseH }, b: { u: uR, h: creaseH }, idSuffix: 'part-wb' },
        ],
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      };
    }

    case 'handle-217-top': {
      if (colBasis === 'L') {
        const creaseH = roundMm(0.497 * width);
        const notchDropH = roundMm(0.794 * width);
        const shoulderH = roundMm(0.869 * width);
        const topH = roundMm(0.894 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0.004, h: 0 },
          { u: 0.004, h: topH },
          cubicCorner(0.004, topH, 0.058, shoulderH, 'horizontal'),
          { u: 0.129, h: notchDropH },
          { u: 0.172, h: topH },
          { u: 0.828, h: topH },
          { u: 0.871, h: notchDropH },
          { u: 0.942, h: shoulderH },
          cubicCorner(0.942, shoulderH, 0.996, topH, 'vertical'),
          { u: 0.996, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [createStadiumHole(0.351, 0.649, 0.612 * width, 0.744 * width)],
          slits: [],
          extraFolds: [
            { a: { u: 0.004, h: creaseH }, b: { u: 0.996, h: creaseH }, idSuffix: 'gable' },
          ],
          layerOrder: 1,
          layerOffsetTier: stack.tier,
        };
      }
      // Rounded-tip peaked triangle tab on W walls
      const peakH = roundMm(0.458 * width);
      const shoulderH = roundMm(0.44 * width);
      const cutContour: FlapPointSpec[] = [
        { u: 0, h: 0 },
        { u: 0.454, h: shoulderH },
        cubicCorner(0.454, shoulderH, 0.5, peakH, 'vertical'),
        cubicCorner(0.5, peakH, 0.546, shoulderH, 'horizontal'),
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [],
        slits: [
          [
            { u: 0.488, h: 0 },
            { u: 0.488, h: roundMm(0.343 * width) },
            { u: 0.512, h: roundMm(0.343 * width) },
            { u: 0.512, h: 0 },
            { u: 0.488, h: 0 },
          ],
        ],
        extraFolds: [],
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      };
    }

    case 'lock-ear-218-top': {
      const fullH = roundMm(0.991 * width);
      if (colIndex === 0) {
        // Opposite FOL cover panel with two PDF diagonal reinforcement slits
        return rectangularFlap(fullH, uL, uR, {
          layerOrder: 1,
          layerOffsetTier: 2.0,
          slits: [
            [
              { u: 0.241, h: roundMm(0.302 * width) },
              { u: 0.153, h: roundMm(0.506 * width) },
            ],
            [
              { u: 0.757, h: roundMm(0.302 * width) },
              { u: 0.845, h: roundMm(0.506 * width) },
            ],
          ],
        });
      }
      if (colIndex === 2) {
        const stemH = roundMm(0.164 * width);
        const shoulderLoH = roundMm(0.497 * width);
        const shoulderH = roundMm(0.506 * width);
        const earH = roundMm(0.693 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0.015, h: 0 },
          { u: 0.015, h: stemH },
          { u: 0.159, h: shoulderLoH },
          cubicCorner(0.159, shoulderLoH, 0.155, shoulderH, 'vertical'),
          { u: 0.097, h: shoulderH },
          cubicCorner(0.097, shoulderH, 0.242, earH, 'vertical'),
          { u: 0.758, h: earH },
          cubicCorner(0.758, earH, 0.903, shoulderH, 'horizontal'),
          { u: 0.845, h: shoulderH },
          cubicCorner(0.845, shoulderH, 0.841, shoulderLoH, 'horizontal'),
          { u: 0.985, h: stemH },
          { u: 0.985, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          layerOrder: 1,
          layerOffsetTier: 2.5,
        };
      }
      return rectangularFlap(fullH, uL, uR, {
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      });
    }

    case 'latch-219-top': {
      if (colIndex === 0) {
        const coverH = roundMm(1.0 * width);
        const tabShoulder = roundMm(1.066 * width);
        const tabTop = roundMm(1.099 * width);
        const cutContour: FlapPointSpec[] = [
          { u: uL, h: 0 },
          { u: uL, h: coverH },
          { u: 0.288, h: coverH },
          { u: 0.288, h: tabShoulder },
          cubicCorner(0.288, tabShoulder, 0.313, tabTop, 'vertical'),
          { u: 0.687, h: tabTop },
          cubicCorner(0.687, tabTop, 0.712, tabShoulder, 'horizontal'),
          { u: 0.712, h: coverH },
          { u: uR, h: coverH },
          { u: uR, h: 0 },
        ];
        // Smooth stadium handle cutout with centered top/bottom thumb clearance domes
        const hBot = roundMm(0.467 * width);
        const hMid = roundMm(0.5 * width);
        const hTop = roundMm(0.533 * width);
        const hBumpTop = roundMm(0.55 * width);
        const hBumpBot = roundMm(0.45 * width);
        const butterflyHole: FlapPointSpec[] = [
          { u: 0.512, h: hBumpBot },
          { u: 0.488, h: hBumpBot },
          cubicCorner(0.488, hBumpBot, 0.46, hBot, 'horizontal'),
          { u: 0.326, h: hBot },
          cubicCorner(0.326, hBot, 0.301, hMid, 'horizontal'),
          cubicCorner(0.301, hMid, 0.326, hTop, 'vertical'),
          { u: 0.46, h: hTop },
          cubicCorner(0.46, hTop, 0.488, hBumpTop, 'horizontal'),
          { u: 0.512, h: hBumpTop },
          cubicCorner(0.512, hBumpTop, 0.54, hTop, 'horizontal'),
          { u: 0.674, h: hTop },
          cubicCorner(0.674, hTop, 0.699, hMid, 'horizontal'),
          cubicCorner(0.699, hMid, 0.674, hBot, 'vertical'),
          { u: 0.54, h: hBot },
          cubicCorner(0.54, hBot, 0.512, hBumpBot, 'horizontal'),
        ];
        const slitBaseH = roundMm(1.012 * width);
        const slitDipH = roundMm(0.987 * width);
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [butterflyHole],
          slits: [
            [
              { u: 0.417, h: slitBaseH },
              { u: 0.481, h: slitBaseH },
              cubicCorner(0.481, slitBaseH, 0.5, slitDipH, 'vertical'),
              cubicCorner(0.5, slitDipH, 0.519, slitBaseH, 'horizontal'),
              { u: 0.583, h: slitBaseH },
            ],
          ],
          extraFolds: [
            {
              a: { u: 0.288, h: coverH },
              b: { u: 0.712, h: coverH },
              idSuffix: 'latch-tab',
              isArticulatedTuck: true,
            },
          ],
          layerOrder: 1,
          layerOffsetTier: 2.0,
          foldStage: [70, 78],
          tongueLayerOrder: -1,
          tongueLayerOffsetMm: -roundMm(Math.max(1.2, thickness * 1.5 + 0.5)),
          tongueFoldStage: [84, 90],
        };
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.371 * width, 0.02, 0.98, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
          foldStage: [60, 70],
        });
      }
      // c2 (front): full tuck cover with twin circular finger holes & smooth dome lock slit
      const coverH = roundMm(0.995 * width);
      const notchH = roundMm(0.945 * width);
      const domeShoulder = roundMm(0.066 * width);
      const domeTop = roundMm(0.099 * width);
      return {
        ...buildTuckLidGeom(params.side, coverH, tuckDepth, uL, uR, thickness, {
          holes: [
            createCircleHole(0.326, 0.5 * width, 0.0225, 0.03 * width),
            createCircleHole(0.674, 0.5 * width, 0.0225, 0.03 * width),
          ],
          slits: [
            [
              { u: 0.463, h: coverH },
              cubicCorner(0.463, coverH, 0.5, notchH, 'vertical'),
              cubicCorner(0.5, notchH, 0.537, coverH, 'horizontal'),
            ],
            [
              { u: 0.413, h: 0 },
              { u: 0.413, h: domeShoulder },
              cubicCorner(0.413, domeShoulder, 0.438, domeTop, 'vertical'),
              { u: 0.562, h: domeTop },
              cubicCorner(0.562, domeTop, 0.587, domeShoulder, 'horizontal'),
              { u: 0.587, h: 0 },
            ],
          ],
          layerOffsetTier: 2.8,
        }),
        foldStage: [78, 84],
        tongueFoldStage: [84, 90],
      };
    }

    case 'carrier-222-top': {
      // [W, L, W, L] columns: narrow W walls carry twin straps along L; wide L walls form upright handle
      if (colBasis === 'W') {
        const foldH = roundMm(0.502 * length);
        const capShoulder = roundMm(0.538 * length);
        const capTop = roundMm(0.563 * length);
        const cutContour: FlapPointSpec[] = [
          { u: uL, h: 0 },
          { u: uL, h: capShoulder },
          cubicCorner(uL, capShoulder, 0.062, capTop, 'vertical'),
          { u: 0.432, h: capTop },
          cubicCorner(0.432, capTop, 0.487, capShoulder, 'horizontal'),
          { u: 0.487, h: 0 },
          { u: 0.513, h: 0 },
          { u: 0.513, h: capShoulder },
          cubicCorner(0.513, capShoulder, 0.568, capTop, 'vertical'),
          { u: 0.938, h: capTop },
          cubicCorner(0.938, capTop, uR, capShoulder, 'horizontal'),
          { u: uR, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [
            {
              points: [
                { u: uL, h: 0 },
                { u: uL, h: capTop },
                { u: uR, h: capTop },
                { u: uR, h: 0 },
              ],
            },
          ],
          holes: [],
          slits: [],
          extraFolds: [
            { a: { u: uL, h: foldH }, b: { u: 0.487, h: foldH }, idSuffix: 'strap-a' },
            { a: { u: 0.513, h: foldH }, b: { u: uR, h: foldH }, idSuffix: 'strap-b' },
          ],
          layerOrder: 0,
          layerOffsetTier: stack.tier,
          foldStage: [60, 72],
        };
      }
      const midH = roundMm(0.485 * width);
      const shoulderH = roundMm(0.585 * width);
      const topH = roundMm(0.985 * width);
      const cutContour: FlapPointSpec[] = [
        { u: 0, h: 0 },
        { u: 0, h: shoulderH },
        { u: 0.143, h: topH },
        { u: 0.857, h: topH },
        { u: 1, h: shoulderH },
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [createStadiumHole(0.319, 0.681, 0.61 * width, 0.86 * width)],
        slits: [
          [
            { u: 0.494, h: 0 },
            { u: 0.494, h: midH },
            { u: 0.506, h: midH },
            { u: 0.506, h: 0 },
            { u: 0.494, h: 0 },
          ],
        ],
        extraFolds: [
          {
            a: { u: 0, h: midH },
            b: { u: 1, h: midH },
            idSuffix: 'handle-wing',
            isArticulatedTuck: true,
          },
        ],
        layerOrder: 1,
        layerOffsetTier: colIndex === 1 ? 2.2 : 2.8,
        foldStage: [72, 84],
        tongueLayerOrder: 1,
        tongueLayerOffsetMm: roundMm(Math.max(0.5, thickness * 0.5)),
        tongueFoldStage: [74, 84],
        tongueAnimatedAngleRange: [0, -90],
      };
    }

    case 'lock-222-bot': {
      // [W, L, W, L] base interlocking bottom per PDF p11 scaled across W
      const outerH = roundMm(0.723 * width);
      const shoulderH = roundMm(0.651 * width);
      const innerH = roundMm(0.507 * width);
      const diagH = roundMm(0.411 * width);
      if (colIndex === 0) {
        const cutContour: FlapPointSpec[] = [
          { u: 0.01, h: 0 },
          { u: 0.01, h: outerH },
          { u: 0.481, h: outerH },
          { u: 0.481, h: diagH },
          { u: 0.988, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          layerOrder: 0,
          layerOffsetTier: 1.0,
        };
      }
      if (colIndex === 1) {
        const cutContour: FlapPointSpec[] = [
          { u: 0.01, h: 0 },
          { u: 0.01, h: outerH },
          { u: 0.195, h: outerH },
          { u: 0.195, h: innerH },
          { u: 0.805, h: innerH },
          { u: 0.805, h: outerH },
          { u: 0.992, h: outerH },
          { u: 0.992, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          layerOrder: 1,
          layerOffsetTier: 2.0,
        };
      }
      if (colIndex === 2) {
        const cutContour: FlapPointSpec[] = [
          { u: 0.012, h: 0 },
          { u: 0.512, h: diagH },
          { u: 0.512, h: outerH },
          { u: 0.992, h: outerH },
          { u: 0.992, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          layerOrder: 0,
          layerOffsetTier: 1.4,
        };
      }
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: 0.198, h: innerH },
        { u: 0.198, h: shoulderH },
        cubicCorner(0.198, shoulderH, 0.233, outerH, 'vertical'),
        { u: 0.767, h: outerH },
        cubicCorner(0.767, outerH, 0.802, shoulderH, 'horizontal'),
        { u: 0.802, h: innerH },
        { u: uR, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [],
        slits: [],
        extraFolds: [],
        layerOrder: 1,
        layerOffsetTier: 2.6,
      };
    }

    case 'wrap-225-bot': {
      const fullH = roundMm(1.0 * width);
      if (colIndex === 0) {
        const notchH = roundMm(0.929 * width);
        const cutContour: FlapPointSpec[] = [
          { u: uL, h: 0 },
          { u: uL, h: fullH },
          { u: 0.45, h: fullH },
          cubicCorner(0.45, fullH, 0.499, notchH, 'vertical'),
          cubicCorner(0.499, notchH, 0.548, fullH, 'horizontal'),
          { u: uR, h: fullH },
          { u: uR, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          layerOrder: 1,
          layerOffsetTier: 2.0,
        };
      }
      if (colIndex === 1) {
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0.5, h: 0 },
          { u: 0.5, h: fullH },
          { u: 1, h: fullH },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [
            {
              points: [
                { u: 0.5, h: 0 },
                { u: 0.5, h: fullH },
                { u: 1, h: fullH },
                { u: 1, h: 0 },
              ],
            },
          ],
          holes: [],
          slits: [
            [
              { u: 0.5, h: 0 },
              { u: 1, h: 0 },
            ],
          ],
          extraFolds: [{ a: { u: 1, h: 0 }, b: { u: 1, h: fullH }, idSuffix: 'wrap-seam-l' }],
          wrapPivotFoldIdSuffix: 'wrap-seam-l',
          layerOrder: 0,
          layerOffsetTier: 0.5,
        };
      }
      if (colIndex === 2) {
        return {
          hasFlap: true,
          cutContour: [
            { u: 0, h: fullH },
            { u: 1, h: fullH },
          ],
          facePolygons: [
            {
              points: [
                { u: 0, h: 0 },
                { u: 0, h: fullH },
                { u: 1, h: fullH },
                { u: 1, h: 0 },
              ],
            },
          ],
          holes: [],
          slits: [],
          extraFolds: [],
          layerOrder: 1,
          layerOffsetTier: 1.0,
        };
      }
      // colIndex === 3
      const cutContour: FlapPointSpec[] = [
        { u: 0, h: fullH },
        { u: 0.5, h: fullH },
        { u: 0.5, h: 0 },
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [
          {
            points: [
              { u: 0, h: 0 },
              { u: 0, h: fullH },
              { u: 0.5, h: fullH },
              { u: 0.5, h: 0 },
            ],
          },
        ],
        holes: [],
        slits: [
          [
            { u: 0, h: 0 },
            { u: 0.5, h: 0 },
          ],
        ],
        extraFolds: [{ a: { u: 0, h: 0 }, b: { u: 0, h: fullH }, idSuffix: 'wrap-seam-r' }],
        wrapPivotFoldIdSuffix: 'wrap-seam-r',
        layerOrder: 0,
        layerOffsetTier: 1.0,
      };
    }

    case 'bellows-226': {
      const halfW = roundMm(0.5 * width);
      const chevronApexH = roundMm(0.493 * width);
      const chevronCreases: FlapCreaseSpec[] =
        colBasis === 'W'
          ? [
              { a: { u: 0, h: 0 }, b: { u: 0.5, h: chevronApexH }, idSuffix: 'bellows-a' },
              { a: { u: 0.5, h: chevronApexH }, b: { u: 1, h: 0 }, idSuffix: 'bellows-b' },
            ]
          : [];
      return {
        hasFlap: true,
        cutContour: [
          ...(colIndex === 0
            ? [
                { u: 0, h: 0 },
                { u: 0, h: halfW },
              ]
            : [{ u: 0, h: halfW }]),
          { u: 1, h: halfW },
          ...(colIndex === 3 ? [{ u: 1, h: 0 }] : []),
        ],
        facePolygons: [
          {
            points: [
              { u: 0, h: 0 },
              { u: 0, h: halfW },
              { u: 1, h: halfW },
              { u: 1, h: 0 },
            ],
          },
        ],
        holes: [],
        slits: [],
        extraFolds: chevronCreases,
        layerOrder: stack.layerOrder,
        layerOffsetTier: stack.tier,
      };
    }

    case 'gusset-227': {
      const fullH = roundMm(1.0 * width);
      const innerH = roundMm(0.88 * width);
      const bridgeH = roundMm(0.12 * width);
      if (colIndex === 0) {
        return rectangularFlap(fullH, 0.01, 0.99, {
          layerOrder: 1,
          layerOffsetTier: 2.8,
        });
      }
      if (colIndex === 1) {
        const cutContour: FlapPointSpec[] = [
          { u: 0.01, h: 0 },
          { u: 0.01, h: innerH },
          { u: 0.88, h: innerH },
          { u: 1, h: fullH },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [
            {
              points: [
                { u: 0.01, h: 0 },
                { u: 0.01, h: innerH },
                { u: 1, h: fullH },
                { u: 1, h: 0 },
              ],
            },
          ],
          holes: [],
          slits: [
            [
              { u: 1, h: 0 },
              { u: 0.88, h: bridgeH },
              { u: 0.88, h: innerH },
            ],
          ],
          extraFolds: [{ a: { u: 1, h: 0 }, b: { u: 1, h: fullH }, idSuffix: 'gusset-l' }],
          layerOrder: 0,
          layerOffsetTier: 0.5,
        };
      }
      if (colIndex === 2) {
        const notchStartH = roundMm(0.959 * width);
        const notchH = roundMm(0.893 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: fullH },
          { u: 0.45, h: fullH },
          { u: 0.45, h: notchStartH },
          cubicCorner(0.45, notchStartH, 0.5, notchH, 'vertical'),
          cubicCorner(0.5, notchH, 0.55, notchStartH, 'horizontal'),
          { u: 0.55, h: fullH },
          { u: 1, h: fullH },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [
            {
              points: [
                { u: 0, h: 0 },
                { u: 0, h: fullH },
                { u: 1, h: fullH },
                { u: 1, h: 0 },
              ],
            },
          ],
          holes: [],
          slits: [],
          extraFolds: [{ a: { u: 1, h: 0 }, b: { u: 1, h: fullH }, idSuffix: 'gusset-r' }],
          layerOrder: 1,
          layerOffsetTier: 2.0,
        };
      }
      // colIndex === 3
      const cutContour: FlapPointSpec[] = [
        { u: 0, h: fullH },
        { u: 0.12, h: innerH },
        { u: 1, h: innerH },
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [
          {
            points: [
              { u: 0, h: 0 },
              { u: 0, h: fullH },
              { u: 1, h: innerH },
              { u: 1, h: 0 },
            ],
          },
        ],
        holes: [],
        slits: [
          [
            { u: 0, h: 0 },
            { u: 0.12, h: bridgeH },
            { u: 0.12, h: innerH },
          ],
        ],
        extraFolds: [],
        layerOrder: 0,
        layerOffsetTier: 1.0,
      };
    }

    case 'crease-v-229': {
      const scoreH = roundMm(Math.max(3, Math.min(width * 0.25, width * 0.17)));
      if (colBasis === 'L') {
        return rectangularFlap(0.5 * width, uL, uR, {
          layerOrder: 1,
          layerOffsetTier: stack.tier,
          extraFolds: [{ a: { u: uL, h: scoreH }, b: { u: uR, h: scoreH }, idSuffix: 'score-v' }],
        });
      }
      return rectangularFlap(0.5 * length, uL, uR, {
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      });
    }

    case 'crease-v-229-1': {
      const scoreH = roundMm(Math.max(3, Math.min(width * 0.25, width * 0.17)));
      if (colBasis === 'L') {
        return rectangularFlap(0.5 * width, uL, uR, {
          layerOrder: 1,
          layerOffsetTier: stack.tier,
        });
      }
      return rectangularFlap(0.5 * length, uL, uR, {
        layerOrder: 0,
        layerOffsetTier: stack.tier,
        extraFolds: [{ a: { u: uL, h: scoreH }, b: { u: uR, h: scoreH }, idSuffix: 'score-v1' }],
      });
    }

    case 'step-lock-232-bot': {
      if (colBasis === 'L') {
        return rectangularFlap(0.492 * width, uL, uR, {
          slits: [
            [
              { u: 0.189, h: roundMm(0.067 * width) },
              { u: 0.216, h: roundMm(0.067 * width) },
              { u: 0.372, h: roundMm(0.22 * width) },
              { u: 0.372, h: roundMm(0.246 * width) },
              { u: 0.189, h: roundMm(0.067 * width) },
            ],
            [
              { u: 0.779, h: roundMm(0.067 * width) },
              { u: 0.806, h: roundMm(0.067 * width) },
              { u: 0.623, h: roundMm(0.246 * width) },
              { u: 0.623, h: roundMm(0.22 * width) },
              { u: 0.779, h: roundMm(0.067 * width) },
            ],
          ],
          layerOrder: 1,
          layerOffsetTier: stack.tier,
        });
      }
      const stepH = roundMm(0.243 * width);
      const creaseH = roundMm(0.249 * width);
      const filletH = roundMm(0.265 * width);
      const topH = roundMm(0.492 * width);
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: uL, h: stepH },
        { u: 0.063, h: stepH },
        cubicCorner(0.063, stepH, 0.085, filletH, 'horizontal'),
        { u: 0.085, h: topH },
        { u: 0.915, h: topH },
        { u: 0.915, h: filletH },
        cubicCorner(0.915, filletH, 0.937, stepH, 'vertical'),
        { u: uR, h: stepH },
        { u: uR, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [],
        slits: [],
        extraFolds: [
          { a: { u: 0.085, h: creaseH }, b: { u: 0.915, h: creaseH }, idSuffix: 'step-232' },
        ],
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      };
    }

    case 'crash-lock-233':
    case 'crash-lock-233-1': {
      const isV1 = preset === 'crash-lock-233-1';
      const maxH = roundMm(0.63 * width);
      const shoulderH = roundMm(0.44 * width);
      const lockBaseH = roundMm(0.5 * width);
      const diagStartH = roundMm((isV1 ? 0.14 : 0.09) * width);

      if (colIndex === 0) {
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0, h: shoulderH },
          { u: 0.25, h: lockBaseH },
          { u: 0.25, h: maxH },
          { u: 0.75, h: maxH },
          { u: 0.75, h: lockBaseH },
          { u: 1, h: shoulderH },
          { u: 1, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [
            { a: { u: 0, h: diagStartH }, b: { u: 0.25, h: lockBaseH }, idSuffix: 'crash-l0' },
            { a: { u: 1, h: diagStartH }, b: { u: 0.75, h: lockBaseH }, idSuffix: 'crash-r0' },
          ],
          layerOrder: 1,
          layerOffsetTier: 2.0,
        };
      }

      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(maxH, 0.01, 0.99, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.8 : 1.3,
        });
      }

      // colIndex === 2
      if (isV1) {
        const notchBaseH = roundMm(0.46 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0.01, h: 0 },
          { u: 0.01, h: maxH },
          { u: 0.24, h: maxH },
          { u: 0.24, h: lockBaseH },
          { u: 0.27, h: notchBaseH },
          { u: 0.73, h: notchBaseH },
          { u: 0.76, h: lockBaseH },
          { u: 0.76, h: maxH },
          { u: 0.99, h: maxH },
          { u: 0.99, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [
            { a: { u: 0, h: diagStartH }, b: { u: 0.25, h: lockBaseH }, idSuffix: 'crash-l2' },
            { a: { u: 1, h: diagStartH }, b: { u: 0.75, h: lockBaseH }, idSuffix: 'crash-r2' },
          ],
          layerOrder: 1,
          layerOffsetTier: 2.6,
        };
      }

      return {
        hasFlap: true,
        cutContour: [
          { u: 0.01, h: 0 },
          { u: 0.01, h: maxH },
          { u: 0.99, h: maxH },
          { u: 0.99, h: 0 },
        ],
        facePolygons: [
          {
            points: [
              { u: 0.01, h: 0 },
              { u: 0.01, h: maxH },
              { u: 0.99, h: maxH },
              { u: 0.99, h: 0 },
            ],
          },
        ],
        holes: [],
        slits: [
          [
            { u: 0.25, h: roundMm(0.55 * width) },
            { u: 0.25, h: lockBaseH },
            { u: 0.27, h: roundMm(0.47 * width) },
            { u: 0.73, h: roundMm(0.47 * width) },
            { u: 0.75, h: lockBaseH },
            { u: 0.75, h: roundMm(0.55 * width) },
          ],
        ],
        extraFolds: [
          { a: { u: 0, h: diagStartH }, b: { u: 0.25, h: lockBaseH }, idSuffix: 'crash-l2' },
          { a: { u: 1, h: diagStartH }, b: { u: 0.75, h: lockBaseH }, idSuffix: 'crash-r2' },
        ],
        layerOrder: 1,
        layerOffsetTier: 2.6,
      };
    }

    case 'euroslot-240-top': {
      if (colIndex === 0) {
        const foldH = roundMm(0.686 * width);
        const shoulderH = roundMm(1.422 * width);
        const headerH = roundMm(1.465 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0, h: shoulderH },
          cubicCorner(0, shoulderH, 0.033, headerH, 'vertical'),
          { u: 0.967, h: headerH },
          cubicCorner(0.967, headerH, 1, shoulderH, 'horizontal'),
          { u: 1, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [
            createEuroslotHole(0.5, 0.409 * width, width, colWidth),
            createEuroslotHole(0.5, 0.963 * width, width, colWidth),
          ],
          slits: [],
          extraFolds: [{ a: { u: 0, h: foldH }, b: { u: 1, h: foldH }, idSuffix: 'hang-fold' }],
          // Display hang header stays upright extending above the closed box
          animatedAngleRange: [0, 0],
          layerOrder: 1,
          layerOffsetTier: 1.5,
        };
      }
      if (colIndex === 1) {
        const dustH = roundMm(0.549 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0.15, h: dustH },
          { u: 0.97, h: dustH },
          { u: 0.97, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          foldStage: [60, 72],
          layerOrder: 0,
          layerOffsetTier: 0.5,
        };
      }
      if (colIndex === 2) {
        return buildTuckLidGeom(params.side, 1.0 * width, tuckDepth, uL, uR, thickness);
      }
      // colIndex === 3
      const dustH = roundMm(0.549 * width);
      const cutContour: FlapPointSpec[] = [
        { u: 0.03, h: 0 },
        { u: 0.03, h: dustH },
        { u: 0.87, h: dustH },
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [],
        slits: [],
        extraFolds: [],
        foldStage: [60, 72],
        layerOrder: 0,
        layerOffsetTier: 1.0,
      };
    }

    case 'euroslot-241-top': {
      if (colIndex === 0) {
        return emptyFlap();
      }
      if (colIndex === 1 || colIndex === 3) {
        const creaseH = roundMm(0.5 * length);
        const wingBodyH = roundMm(Math.max(18, 0.522 * width));
        const shoulderH = roundMm(creaseH + wingBodyH * 0.916);
        const wingTop = roundMm(creaseH + wingBodyH);
        const cutContour: FlapPointSpec[] = [
          { u: 0.02, h: 0 },
          { u: 0.02, h: shoulderH },
          cubicCorner(0.02, shoulderH, 0.06, wingTop, 'vertical'),
          { u: 0.94, h: wingTop },
          cubicCorner(0.94, wingTop, 0.98, shoulderH, 'horizontal'),
          { u: 0.98, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [createEuroslotHole(0.5, creaseH + wingBodyH * 0.64, width, colWidth)],
          slits: [],
          extraFolds: [
            {
              a: { u: 0.02, h: creaseH },
              b: { u: 0.98, h: creaseH },
              idSuffix: 'euroslot-wing',
              isArticulatedTuck: true,
            },
          ],
          foldStage: [60, 72],
          tongueFoldStage: [68, 78],
          tongueAnimatedAngleRange: [0, -90],
          tongueLayerOrder: 0,
          tongueLayerOffsetMm: roundMm(Math.max(0.4, thickness * 0.5)),
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.6 : 1.2,
        };
      }
      // colIndex === 2 (front tuck lid with full center pass-through slot for side wings)
      const slotLo = roundMm(0.015 * width);
      const slotHi = roundMm(1.074 * width);
      return buildTuckLidGeom(params.side, 1.0 * width, tuckDepth, uL, uR, thickness, {
        slits: [
          [
            { u: 0.491, h: slotLo },
            { u: 0.509, h: slotLo },
            { u: 0.509, h: slotHi },
            { u: 0.491, h: slotHi },
            { u: 0.491, h: slotLo },
          ],
        ],
      });
    }

    case 'euroslot-242-top': {
      if (colIndex === 0) {
        const shoulderH = roundMm(0.63 * width);
        const neckBot = roundMm(1.01 * width);
        const towerTop = roundMm(1.62 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0, h: shoulderH },
          { u: 0.33, h: shoulderH },
          { u: 0.33, h: neckBot },
          { u: 0, h: neckBot },
          { u: 0, h: towerTop },
          { u: 1, h: towerTop },
          { u: 1, h: neckBot },
          { u: 0.67, h: neckBot },
          { u: 0.67, h: shoulderH },
          { u: 1, h: shoulderH },
          { u: 1, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [
            createEuroslotHole(0.5, 0.693 * width, width, colWidth),
            createEuroslotHole(0.5, 0.932 * width, width, colWidth),
          ],
          slits: [],
          extraFolds: [
            {
              a: { u: 0.33, h: roundMm(0.49 * width) },
              b: { u: 0.67, h: roundMm(0.49 * width) },
              idSuffix: 'tw-a',
            },
            {
              a: { u: 0.37, h: roundMm(0.81 * width) },
              b: { u: 0.63, h: roundMm(0.81 * width) },
              idSuffix: 'tw-b',
            },
            {
              a: { u: 0.33, h: roundMm(1.13 * width) },
              b: { u: 0.67, h: roundMm(1.13 * width) },
              idSuffix: 'tw-c',
            },
          ],
          animatedAngleRange: [0, 0],
          layerOrder: 1,
          layerOffsetTier: 1.5,
        };
      }
      if (colIndex === 1 || colIndex === 3) {
        const dustH = roundMm(0.555 * width);
        const notchH = roundMm(0.434 * width);
        const cutContour: FlapPointSpec[] =
          colIndex === 1
            ? [
                { u: 0, h: 0 },
                { u: 0.14, h: dustH },
                { u: 0.44, h: dustH },
                cubicCorner(0.44, dustH, 0.5, notchH, 'vertical'),
                cubicCorner(0.5, notchH, 0.56, dustH, 'horizontal'),
                { u: 0.97, h: dustH },
                { u: 0.97, h: 0 },
              ]
            : [
                { u: 0.03, h: 0 },
                { u: 0.03, h: dustH },
                { u: 0.44, h: dustH },
                cubicCorner(0.44, dustH, 0.5, notchH, 'vertical'),
                cubicCorner(0.5, notchH, 0.56, dustH, 'horizontal'),
                { u: 0.88, h: dustH },
                { u: 1, h: 0 },
              ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [],
          slits: [],
          extraFolds: [],
          foldStage: [60, 72],
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
        };
      }
      // colIndex === 2 (front cover with center lock tongue + stadium slot)
      const coverH = roundMm(1.0 * width);
      const tabTop = roundMm(coverH + Math.min(tuckDepth, roundMm(0.16 * width + 4)));
      const tabShoulder = roundMm(coverH + (tabTop - coverH) * 0.65);
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: uL, h: coverH },
        { u: 0.388, h: coverH },
        { u: 0.388, h: tabShoulder },
        cubicCorner(0.388, tabShoulder, 0.436, tabTop, 'vertical'),
        { u: 0.564, h: tabTop },
        cubicCorner(0.564, tabTop, 0.612, tabShoulder, 'horizontal'),
        { u: 0.612, h: coverH },
        { u: uR, h: coverH },
        { u: uR, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [createStadiumHole(0.32, 0.68, 0.48 * width, 0.52 * width)],
        slits: [],
        extraFolds: [
          {
            a: { u: 0.388, h: coverH },
            b: { u: 0.612, h: coverH },
            idSuffix: 'latch-lock',
            isArticulatedTuck: true,
          },
        ],
        foldStage: [72, 84],
        tongueFoldStage: [84, 90],
        layerOrder: 1,
        layerOffsetTier: 2.5,
        tongueLayerOrder: -1,
        tongueLayerOffsetMm: -roundMm(Math.max(1.2, thickness * 1.5 + 0.5)),
      };
    }

    default:
      return emptyFlap();
  }
}

/** Maps a single normalized (u, h) coordinate into absolute SVG millimeters. */
function mapCoordToMm(
  coord: { u: number; h: number },
  colX0: number,
  colWidth: number,
  hingeY: number,
  dir: -1 | 1,
): Point {
  return {
    x: roundMm(colX0 + coord.u * colWidth),
    y: roundMm(hingeY + dir * coord.h),
  };
}

/** Converts normalized (u, h) flap points and Bezier handles into absolute millimeter points. */
export function mapFlapPointsToMm(
  points: FlapPointSpec[],
  colX0: number,
  colWidth: number,
  hingeY: number,
  dir: -1 | 1,
): MappedFlapPoint[] {
  return points.map((p) => ({
    ...mapCoordToMm(p, colX0, colWidth, hingeY, dir),
    ...(p.quad ? { quad: mapCoordToMm(p.quad, colX0, colWidth, hingeY, dir) } : {}),
    ...(p.cubic
      ? {
          cubic: [
            mapCoordToMm(p.cubic[0], colX0, colWidth, hingeY, dir),
            mapCoordToMm(p.cubic[1], colX0, colWidth, hingeY, dir),
          ] as [Point, Point],
        }
      : {}),
  }));
}

/** Reverses a mapped contour while remapping quadratic and cubic Bezier handles to the opposite direction. */
export function reverseMappedFlapContour(points: MappedFlapPoint[]): MappedFlapPoint[] {
  const n = points.length;
  const reversed: MappedFlapPoint[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const curr = points[i]!;
    const outgoingForward = i < n - 1 ? points[i + 1] : undefined;
    reversed.push({
      x: curr.x,
      y: curr.y,
      ...(outgoingForward?.quad ? { quad: outgoingForward.quad } : {}),
      ...(outgoingForward?.cubic
        ? { cubic: [outgoingForward.cubic[1], outgoingForward.cubic[0]] as [Point, Point] }
        : {}),
    });
  }
  return reversed;
}

function formatSvgPointCommand(p: MappedFlapPoint, isMove: boolean): string {
  if (isMove) {
    return `M ${pt(p.x, p.y)}`;
  }
  if (p.cubic) {
    return `C ${pt(p.cubic[0].x, p.cubic[0].y)} ${pt(p.cubic[1].x, p.cubic[1].y)} ${pt(p.x, p.y)}`;
  }
  if (p.quad) {
    return `Q ${pt(p.quad.x, p.quad.y)} ${pt(p.x, p.y)}`;
  }
  return `L ${pt(p.x, p.y)}`;
}

/** Converts mapped point/curve array into a closed SVG path (`M ... Z`). */
export function buildClosedSvgPolygon(points: MappedFlapPoint[]): string {
  if (points.length === 0) {
    return '';
  }
  const cmds = points.map((p, idx) => formatSvgPointCommand(p, idx === 0));
  return `${cmds.join(' ')} Z`;
}

/** Converts mapped point/curve array into an SVG slit path (`M ...`, or `M ... Z` when looped). */
export function buildOpenSvgPolyline(points: MappedFlapPoint[]): string {
  if (points.length === 0) {
    return '';
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const isClosedLoop =
    points.length >= 4 && Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01;
  const effectivePts = isClosedLoop ? points.slice(0, -1) : points;
  const cmds = effectivePts.map((p, idx) => formatSvgPointCommand(p, idx === 0));
  return isClosedLoop ? `${cmds.join(' ')} Z` : cmds.join(' ');
}

/** Formats a segment list as clockwise `L`/`Q`/`C` tokens excluding duplicate start. */
export function appendContourCommands(
  commands: string[],
  points: MappedFlapPoint[],
  skipFirst = false,
): void {
  const start = skipFirst ? 1 : 0;
  for (let i = start; i < points.length; i += 1) {
    const p = points[i];
    if (p) {
      commands.push(formatSvgPointCommand(p, false));
    }
  }
}
