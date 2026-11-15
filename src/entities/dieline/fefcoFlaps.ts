import { pt, roundMm } from './geometry';
import type { FefcoFlapEndPreset, Point } from './types';

export interface FlapPointSpec {
  /** Normalized horizontal coordinate along column width: 0 = left edge, 1 = right edge. */
  u: number;
  /** Outward distance from the body horizontal fold line in millimeters (>= 0). */
  h: number;
}

export interface FlapCreaseSpec {
  a: FlapPointSpec;
  b: FlapPointSpec;
  idSuffix: string;
  /** True only for true 90° articulated tuck lid->tongue fold lines used by 3D kinematics. */
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
  /** Optional open interior slit lines emitted as secondary Cut elements. */
  slits: FlapPointSpec[][];
  /** Optional internal or secondary crease lines emitted as Fold elements. */
  extraFolds: FlapCreaseSpec[];
  /** Override 3D rotation range (e.g. [0, 0] for upright Euroslot hang header). */
  animatedAngleRange?: [number, number];
  /** Optional physical flap stacking order (0 = inner, 1+ = outer). */
  layerOrder?: number;
  /** Optional continuous physical stacking tier for Z-fighting clearance. */
  layerOffsetTier?: number;
  /** Optional tuck tongue layer order when flap contains an articulated tuck fold. */
  tongueLayerOrder?: number;
  /** Optional tuck tongue inward offset in mm to prevent Z-fighting with opposite wall. */
  tongueLayerOffsetMm?: number;
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
    extraFolds?: FlapCreaseSpec[];
    holes?: FlapPointSpec[][];
    slits?: FlapPointSpec[][];
    tongueLayerOrder?: number;
    tongueLayerOffsetMm?: number;
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
    ...(options?.tongueLayerOrder !== undefined
      ? { tongueLayerOrder: options.tongueLayerOrder }
      : {}),
    ...(options?.tongueLayerOffsetMm !== undefined
      ? { tongueLayerOffsetMm: options.tongueLayerOffsetMm }
      : {}),
  };
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
} {
  const totalH = roundMm(coverHeight + tuckDepth);
  const shoulderH = roundMm(coverHeight + tuckDepth * 0.65);
  const shoulderInset = Math.min(0.08, 0.03 + tuckDepth * 0.002);
  const cutContour: FlapPointSpec[] = [
    { u: uLeft, h: 0 },
    { u: uLeft, h: shoulderH },
    { u: roundMm(uLeft + shoulderInset), h: totalH },
    { u: roundMm(uRight - shoulderInset), h: totalH },
    { u: uRight, h: shoulderH },
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
  };
}

function createEuroslotHole(
  uCenter: number,
  yCenter: number,
  wMm: number,
  colWidth: number,
): FlapPointSpec[] {
  const hw = Math.min(0.24, Math.max(0.12, (wMm * 0.14) / Math.max(1, colWidth)));
  const stemHalfU = hw * 0.34;
  const stemTop = roundMm(yCenter + wMm * 0.065);
  const hatHalfH = roundMm(wMm * 0.032);
  const yLo = roundMm(yCenter - hatHalfH);
  const yHi = roundMm(yCenter + hatHalfH);
  const u0 = roundMm(uCenter - hw);
  const u1 = roundMm(uCenter + hw);
  const us0 = roundMm(uCenter - stemHalfU);
  const us1 = roundMm(uCenter + stemHalfU);

  return [
    { u: u0, h: yLo },
    { u: u0, h: yHi },
    { u: us0, h: yHi },
    { u: us0, h: stemTop },
    { u: us1, h: stemTop },
    { u: us1, h: yHi },
    { u: u1, h: yHi },
    { u: u1, h: yLo },
  ];
}

function createStadiumHole(
  uMin: number,
  uMax: number,
  hMin: number,
  hMax: number,
): FlapPointSpec[] {
  const midH = roundMm((hMin + hMax) * 0.5);
  const cap = Math.min(0.06, (uMax - uMin) * 0.25);
  return [
    { u: roundMm(uMin + cap), h: roundMm(hMin) },
    { u: roundMm(uMax - cap), h: roundMm(hMin) },
    { u: roundMm(uMax), h: midH },
    { u: roundMm(uMax - cap), h: roundMm(hMax) },
    { u: roundMm(uMin + cap), h: roundMm(hMax) },
    { u: roundMm(uMin), h: midH },
  ];
}

function createDiamondHole(
  uCenter: number,
  hCenter: number,
  rxU: number,
  ryMm: number,
): FlapPointSpec[] {
  return [
    { u: roundMm(uCenter), h: roundMm(hCenter - ryMm) },
    { u: roundMm(uCenter + rxU), h: roundMm(hCenter) },
    { u: roundMm(uCenter), h: roundMm(hCenter + ryMm) },
    { u: roundMm(uCenter - rxU), h: roundMm(hCenter) },
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

function buildSnapLockColumn(params: EndClosureBuildParams): ColumnFlapGeometry {
  const { colIndex, colWidth, width, slotHalfMm } = params;
  const slotU = Math.min(0.03, slotHalfMm / Math.max(1, colWidth));
  const uL = roundMm(slotU);
  const uR = roundMm(1 - slotU);
  const hOuter = roundMm(0.63 * width);
  const hNotch = roundMm(0.5 * width);
  const hChamfer = roundMm(0.6 * width);
  const hWingStep = roundMm(0.41 * width);

  if (colIndex === 0) {
    // Female U-notched lock flap
    const cutContour: FlapPointSpec[] = [
      { u: uL, h: 0 },
      { u: uL, h: hOuter },
      { u: 0.29, h: hOuter },
      { u: 0.31, h: hChamfer },
      { u: 0.31, h: hNotch },
      { u: 0.69, h: hNotch },
      { u: 0.69, h: hChamfer },
      { u: 0.71, h: hOuter },
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
    // Left mitered snap-lock wing
    const cutContour: FlapPointSpec[] = [
      { u: 0, h: 0 },
      { u: 0.5, h: hWingStep },
      { u: 0.5, h: hChamfer },
      { u: 0.53, h: hOuter },
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
    // Center tapered locking tongue
    const cutContour: FlapPointSpec[] = [
      { u: uL, h: 0 },
      { u: 0.32, h: hNotch },
      { u: 0.32, h: hChamfer },
      { u: 0.34, h: hOuter },
      { u: 0.66, h: hOuter },
      { u: 0.68, h: hChamfer },
      { u: 0.68, h: hNotch },
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

  // Right mitered snap-lock wing (colIndex === 3)
  const cutContour: FlapPointSpec[] = [
    { u: uL, h: 0 },
    { u: uL, h: hOuter },
    { u: 0.47, h: hOuter },
    { u: 0.49, h: hChamfer },
    { u: 0.49, h: hWingStep },
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
        const tuck = createRoundedTuckContours(1.0 * width, tuckDepth, uL, uR, thickness);
        return {
          hasFlap: true,
          cutContour: tuck.cutContour,
          facePolygons: [{ points: tuck.facePoly }],
          holes: [],
          slits: [],
          extraFolds: [tuck.crease],
          layerOrder: 1,
          layerOffsetTier: 2.5,
          tongueLayerOrder: -1,
          tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
        };
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.6 * width, 0.03, 0.97, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
        });
      }
      return emptyFlap();
    }

    case 'rett-c2': {
      if (colIndex === 2) {
        const tuck = createRoundedTuckContours(1.0 * width, tuckDepth, uL, uR, thickness);
        return {
          hasFlap: true,
          cutContour: tuck.cutContour,
          facePolygons: [{ points: tuck.facePoly }],
          holes: [],
          slits: [],
          extraFolds: [tuck.crease],
          layerOrder: 1,
          layerOffsetTier: 2.5,
          tongueLayerOrder: -1,
          tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
        };
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.6 * width, 0.03, 0.97, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
        });
      }
      return emptyFlap();
    }

    case 'tuck-lid-215-c0': {
      if (colIndex === 0) {
        const tuck = createRoundedTuckContours(1.0 * width, tuckDepth, uL, uR, thickness);
        return {
          hasFlap: true,
          cutContour: tuck.cutContour,
          facePolygons: [{ points: tuck.facePoly }],
          holes: [],
          slits: [],
          extraFolds: [tuck.crease],
          layerOrder: 1,
          layerOffsetTier: 2.5,
          tongueLayerOrder: -1,
          tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
        };
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.37 * width, 0.02, 0.98, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
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
        const creaseH = roundMm(0.5 * width);
        const shoulderH = roundMm(0.87 * width);
        const earNotchH = roundMm(0.79 * width);
        const topH = roundMm(0.89 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0, h: topH },
          { u: 0.06, h: shoulderH },
          { u: 0.13, h: earNotchH },
          { u: 0.17, h: topH },
          { u: 0.83, h: topH },
          { u: 0.87, h: earNotchH },
          { u: 0.94, h: shoulderH },
          { u: 1, h: topH },
          { u: 1, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [createStadiumHole(0.35, 0.65, 0.61 * width, 0.74 * width)],
          slits: [],
          extraFolds: [{ a: { u: 0, h: creaseH }, b: { u: 1, h: creaseH }, idSuffix: 'gable' }],
          layerOrder: 1,
          layerOffsetTier: stack.tier,
        };
      }
      // Peaked triangle tab on W walls
      const peakH = roundMm(0.46 * width);
      const shoulderH = roundMm(0.44 * width);
      const cutContour: FlapPointSpec[] = [
        { u: 0, h: 0 },
        { u: 0.45, h: shoulderH },
        { u: 0.5, h: peakH },
        { u: 0.55, h: shoulderH },
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [],
        slits: [
          [
            { u: 0.49, h: 0 },
            { u: 0.49, h: roundMm(0.34 * width) },
            { u: 0.51, h: roundMm(0.34 * width) },
            { u: 0.51, h: 0 },
          ],
        ],
        extraFolds: [],
        layerOrder: 0,
        layerOffsetTier: stack.tier,
      };
    }

    case 'lock-ear-218-top': {
      if (colIndex === 2) {
        const stemH = roundMm(0.16 * width);
        const shoulderH = roundMm(0.51 * width);
        const earH = roundMm(0.69 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0.02, h: 0 },
          { u: 0.02, h: stemH },
          { u: 0.16, h: roundMm(0.5 * width) },
          { u: 0.1, h: shoulderH },
          { u: 0.24, h: earH },
          { u: 0.76, h: earH },
          { u: 0.9, h: shoulderH },
          { u: 0.84, h: roundMm(0.5 * width) },
          { u: 0.98, h: stemH },
          { u: 0.98, h: 0 },
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
      return rectangularFlap(1.0 * width, uL, uR, {
        layerOrder: colIndex === 0 ? 1 : 0,
        layerOffsetTier: colIndex === 0 ? 2.0 : stack.tier,
      });
    }

    case 'latch-219-top': {
      if (colIndex === 0) {
        const coverH = roundMm(1.0 * width);
        const tabShoulder = roundMm(1.07 * width);
        const tabTop = roundMm(1.1 * width);
        const cutContour: FlapPointSpec[] = [
          { u: uL, h: 0 },
          { u: uL, h: coverH },
          { u: 0.29, h: coverH },
          { u: 0.29, h: tabShoulder },
          { u: 0.31, h: tabTop },
          { u: 0.69, h: tabTop },
          { u: 0.71, h: tabShoulder },
          { u: 0.71, h: coverH },
          { u: uR, h: coverH },
          { u: uR, h: 0 },
        ];
        // Center butterfly lock hole around h = 0.50W
        const butterflyHole: FlapPointSpec[] = [
          { u: 0.33, h: roundMm(0.47 * width) },
          { u: 0.46, h: roundMm(0.47 * width) },
          { u: 0.5, h: roundMm(0.45 * width) },
          { u: 0.54, h: roundMm(0.47 * width) },
          { u: 0.67, h: roundMm(0.47 * width) },
          { u: 0.7, h: roundMm(0.5 * width) },
          { u: 0.67, h: roundMm(0.53 * width) },
          { u: 0.54, h: roundMm(0.53 * width) },
          { u: 0.5, h: roundMm(0.55 * width) },
          { u: 0.46, h: roundMm(0.53 * width) },
          { u: 0.33, h: roundMm(0.53 * width) },
          { u: 0.3, h: roundMm(0.5 * width) },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [butterflyHole],
          slits: [
            [
              { u: 0.42, h: roundMm(1.01 * width) },
              { u: 0.48, h: roundMm(1.01 * width) },
              { u: 0.5, h: roundMm(0.99 * width) },
              { u: 0.52, h: roundMm(1.01 * width) },
              { u: 0.58, h: roundMm(1.01 * width) },
            ],
          ],
          extraFolds: [
            {
              a: { u: 0.29, h: coverH },
              b: { u: 0.71, h: coverH },
              idSuffix: 'latch-tab',
              isArticulatedTuck: true,
            },
          ],
          layerOrder: 1,
          layerOffsetTier: 2.0,
          tongueLayerOrder: -1,
          tongueLayerOffsetMm: -roundMm(Math.max(1.2, thickness * 1.5 + 0.5)),
        };
      }
      if (colIndex === 1 || colIndex === 3) {
        return rectangularFlap(0.37 * width, 0.02, 0.98, {
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
        });
      }
      // c2 (front): full tuck cover with twin finger holes & U-notch slit at hinge
      const coverH = roundMm(1.0 * width);
      const tuck = createRoundedTuckContours(coverH, tuckDepth, uL, uR, thickness);
      return {
        hasFlap: true,
        cutContour: tuck.cutContour,
        facePolygons: [{ points: tuck.facePoly }],
        holes: [
          createDiamondHole(0.33, 0.5 * width, 0.025, 0.03 * width),
          createDiamondHole(0.67, 0.5 * width, 0.025, 0.03 * width),
        ],
        slits: [
          [
            { u: 0.41, h: 0 },
            { u: 0.41, h: roundMm(0.08 * width) },
            { u: 0.44, h: roundMm(0.1 * width) },
            { u: 0.56, h: roundMm(0.1 * width) },
            { u: 0.59, h: roundMm(0.08 * width) },
            { u: 0.59, h: 0 },
          ],
        ],
        extraFolds: [tuck.crease],
        layerOrder: 1,
        layerOffsetTier: 2.8,
        tongueLayerOrder: -1,
        tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
      };
    }

    case 'carrier-222-top': {
      // [W, L, W, L] columns: c0/c2 split twin straps, c1/c3 tapered carrier handle panels
      if (colBasis === 'W') {
        const foldH = roundMm(0.5 * length);
        const capShoulder = roundMm(0.54 * length);
        const capTop = roundMm(0.56 * length);
        const cutContour: FlapPointSpec[] = [
          { u: uL, h: 0 },
          { u: uL, h: capShoulder },
          { u: 0.05, h: capTop },
          { u: 0.43, h: capTop },
          { u: 0.48, h: capShoulder },
          { u: 0.48, h: 0 },
          { u: 0.52, h: 0 },
          { u: 0.52, h: capShoulder },
          { u: 0.57, h: capTop },
          { u: 0.95, h: capTop },
          { u: uR, h: capShoulder },
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
            { a: { u: uL, h: foldH }, b: { u: 0.48, h: foldH }, idSuffix: 'strap-a' },
            { a: { u: 0.52, h: foldH }, b: { u: uR, h: foldH }, idSuffix: 'strap-b' },
          ],
          layerOrder: 0,
          layerOffsetTier: stack.tier,
        };
      }
      const midH = roundMm(0.5 * length);
      const shoulderH = roundMm(0.58 * length);
      const topH = roundMm(0.98 * length);
      const cutContour: FlapPointSpec[] = [
        { u: 0, h: 0 },
        { u: 0, h: shoulderH },
        { u: 0.14, h: topH },
        { u: 0.86, h: topH },
        { u: 1, h: shoulderH },
        { u: 1, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [createStadiumHole(0.32, 0.68, 0.61 * length, 0.86 * length)],
        slits: [
          [
            { u: 0.49, h: 0 },
            { u: 0.49, h: midH },
            { u: 0.51, h: midH },
            { u: 0.51, h: 0 },
          ],
        ],
        extraFolds: [{ a: { u: 0, h: midH }, b: { u: 1, h: midH }, idSuffix: 'carrier-fold' }],
        layerOrder: 1,
        layerOffsetTier: colIndex === 1 ? 2.2 : 2.8,
      };
    }

    case 'lock-222-bot': {
      // [W, L, W, L] base interlocking bottom per PDF p11
      const outerH = roundMm(0.72 * length);
      const innerH = roundMm(0.51 * length);
      const diagH = roundMm(0.41 * length);
      if (colIndex === 0) {
        const cutContour: FlapPointSpec[] = [
          { u: 0.01, h: 0 },
          { u: 0.01, h: outerH },
          { u: 0.48, h: outerH },
          { u: 0.48, h: diagH },
          { u: 0.99, h: 0 },
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
          { u: 0.2, h: outerH },
          { u: 0.2, h: innerH },
          { u: 0.81, h: innerH },
          { u: 0.81, h: outerH },
          { u: 0.99, h: outerH },
          { u: 0.99, h: 0 },
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
          { u: 0.01, h: 0 },
          { u: 0.51, h: diagH },
          { u: 0.51, h: outerH },
          { u: 0.99, h: outerH },
          { u: 0.99, h: 0 },
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
        { u: 0.2, h: innerH },
        { u: 0.2, h: roundMm(0.65 * length) },
        { u: 0.23, h: outerH },
        { u: 0.77, h: outerH },
        { u: 0.8, h: roundMm(0.65 * length) },
        { u: 0.8, h: innerH },
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
        const notchH = roundMm(0.93 * width);
        const cutContour: FlapPointSpec[] = [
          { u: uL, h: 0 },
          { u: uL, h: fullH },
          { u: 0.45, h: fullH },
          { u: 0.5, h: notchH },
          { u: 0.55, h: fullH },
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
          slits: [],
          extraFolds: [{ a: { u: 1, h: 0 }, b: { u: 1, h: fullH }, idSuffix: 'wrap-seam-l' }],
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
        slits: [],
        extraFolds: [{ a: { u: 0, h: 0 }, b: { u: 0, h: fullH }, idSuffix: 'wrap-seam-r' }],
        layerOrder: 0,
        layerOffsetTier: 1.0,
      };
    }

    case 'bellows-226': {
      const halfW = roundMm(0.5 * width);
      const chevronCreases: FlapCreaseSpec[] =
        colBasis === 'W'
          ? [
              { a: { u: 0, h: 0 }, b: { u: 0.5, h: halfW }, idSuffix: 'bellows-a' },
              { a: { u: 0.5, h: halfW }, b: { u: 1, h: 0 }, idSuffix: 'bellows-b' },
            ]
          : [];
      const boundaryCrease: FlapCreaseSpec[] =
        colIndex < 3 ? [{ a: { u: 1, h: 0 }, b: { u: 1, h: halfW }, idSuffix: 'bellows-col' }] : [];
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
        extraFolds: [...chevronCreases, ...boundaryCrease],
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
        const notchH = roundMm(0.89 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: fullH },
          { u: 0.45, h: fullH },
          { u: 0.45, h: roundMm(0.96 * width) },
          { u: 0.5, h: notchH },
          { u: 0.55, h: roundMm(0.96 * width) },
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
        return rectangularFlap(0.5 * width, uL, uR, {
          layerOrder: 1,
          layerOffsetTier: stack.tier,
        });
      }
      const stepH = roundMm(0.25 * width);
      const topH = roundMm(0.5 * width);
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: uL, h: stepH },
        { u: 0.09, h: stepH },
        { u: 0.09, h: topH },
        { u: 0.91, h: topH },
        { u: 0.91, h: stepH },
        { u: uR, h: stepH },
        { u: uR, h: 0 },
      ];
      return {
        hasFlap: true,
        cutContour,
        facePolygons: [{ points: cutContour }],
        holes: [],
        slits: [],
        extraFolds: [{ a: { u: 0.09, h: stepH }, b: { u: 0.91, h: stepH }, idSuffix: 'step-232' }],
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
        const foldH = roundMm(0.69 * width);
        const shoulderH = roundMm(1.42 * width);
        const headerH = roundMm(1.47 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0, h: 0 },
          { u: 0, h: shoulderH },
          { u: 0.03, h: headerH },
          { u: 0.97, h: headerH },
          { u: 1, h: shoulderH },
          { u: 1, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [
            createEuroslotHole(0.5, 0.41 * width, width, colWidth),
            createEuroslotHole(0.5, 0.96 * width, width, colWidth),
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
        const dustH = roundMm(0.55 * width);
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
          layerOrder: 0,
          layerOffsetTier: 0.5,
        };
      }
      if (colIndex === 2) {
        const tuck = createRoundedTuckContours(1.0 * width, tuckDepth, uL, uR, thickness);
        return {
          hasFlap: true,
          cutContour: tuck.cutContour,
          facePolygons: [{ points: tuck.facePoly }],
          holes: [],
          slits: [],
          extraFolds: [tuck.crease],
          layerOrder: 1,
          layerOffsetTier: 2.5,
          tongueLayerOrder: -1,
          tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
        };
      }
      // colIndex === 3
      const dustH = roundMm(0.55 * width);
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
        layerOrder: 0,
        layerOffsetTier: 1.0,
      };
    }

    case 'euroslot-241-top': {
      if (colIndex === 0) {
        return emptyFlap();
      }
      if (colIndex === 1 || colIndex === 3) {
        const creaseH = roundMm(0.75 * width);
        const shoulderH = roundMm(1.23 * width);
        const wingTop = roundMm(1.27 * width);
        const cutContour: FlapPointSpec[] = [
          { u: 0.02, h: 0 },
          { u: 0.02, h: shoulderH },
          { u: 0.06, h: wingTop },
          { u: 0.94, h: wingTop },
          { u: 0.98, h: shoulderH },
          { u: 0.98, h: 0 },
        ];
        return {
          hasFlap: true,
          cutContour,
          facePolygons: [{ points: cutContour }],
          holes: [createEuroslotHole(0.5, 1.08 * width, width, colWidth)],
          slits: [],
          extraFolds: [
            { a: { u: 0.02, h: creaseH }, b: { u: 0.98, h: creaseH }, idSuffix: 'wing-hang' },
          ],
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.6 : 1.2,
        };
      }
      // colIndex === 2 (front tuck lid)
      const tuck = createRoundedTuckContours(1.0 * width, tuckDepth, uL, uR, thickness);
      return {
        hasFlap: true,
        cutContour: tuck.cutContour,
        facePolygons: [{ points: tuck.facePoly }],
        holes: [],
        slits: [
          [
            { u: 0.49, h: roundMm(1.01 * width) },
            { u: 0.49, h: roundMm(1.07 * width) },
            { u: 0.51, h: roundMm(1.07 * width) },
            { u: 0.51, h: roundMm(1.01 * width) },
          ],
        ],
        extraFolds: [tuck.crease],
        layerOrder: 1,
        layerOffsetTier: 2.5,
        tongueLayerOrder: -1,
        tongueLayerOffsetMm: tuck.tongueLayerOffsetMm,
      };
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
            createEuroslotHole(0.5, 0.69 * width, width, colWidth),
            createEuroslotHole(0.5, 0.93 * width, width, colWidth),
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
        const dustH = roundMm(0.56 * width);
        const notchH = roundMm(0.43 * width);
        const cutContour: FlapPointSpec[] =
          colIndex === 1
            ? [
                { u: 0, h: 0 },
                { u: 0.14, h: dustH },
                { u: 0.44, h: dustH },
                { u: 0.5, h: notchH },
                { u: 0.56, h: dustH },
                { u: 0.97, h: dustH },
                { u: 0.97, h: 0 },
              ]
            : [
                { u: 0.03, h: 0 },
                { u: 0.03, h: dustH },
                { u: 0.44, h: dustH },
                { u: 0.5, h: notchH },
                { u: 0.56, h: dustH },
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
          layerOrder: 0,
          layerOffsetTier: colIndex === 1 ? 0.5 : 1.0,
        };
      }
      // colIndex === 2 (front cover with center lock tongue + stadium slot)
      const coverH = roundMm(1.0 * width);
      const tabTop = roundMm(1.0 * width + Math.min(tuckDepth, roundMm(0.24 * width + 6)));
      const tabShoulder = roundMm(1.0 * width + (tabTop - coverH) * 0.62);
      const cutContour: FlapPointSpec[] = [
        { u: uL, h: 0 },
        { u: uL, h: coverH },
        { u: 0.37, h: coverH },
        { u: 0.39, h: tabShoulder },
        { u: 0.44, h: tabTop },
        { u: 0.56, h: tabTop },
        { u: 0.61, h: tabShoulder },
        { u: 0.63, h: coverH },
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
            a: { u: 0.38, h: coverH },
            b: { u: 0.62, h: coverH },
            idSuffix: 'latch-lock',
            isArticulatedTuck: true,
          },
        ],
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

/** Converts normalized (u, h) flap points into absolute millimeter points on a column. */
export function mapFlapPointsToMm(
  points: FlapPointSpec[],
  colX0: number,
  colWidth: number,
  hingeY: number,
  dir: -1 | 1,
): Point[] {
  return points.map((p) => ({
    x: roundMm(colX0 + p.u * colWidth),
    y: roundMm(hingeY + dir * p.h),
  }));
}

/** Converts normalized point array into closed SVG path (`M x y L ... Z`). */
export function buildClosedSvgPolygon(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }
  const cmds = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${pt(p.x, p.y)}`);
  return `${cmds.join(' ')} Z`;
}

/** Converts normalized point array into open SVG polyline (`M x y L ...`). */
export function buildOpenSvgPolyline(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }
  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${pt(p.x, p.y)}`).join(' ');
}

/** Formats a single line-segment list as clockwise `L x y` tokens excluding duplicate start. */
export function appendContourCommands(
  commands: string[],
  points: Point[],
  skipFirst = false,
): void {
  const start = skipFirst ? 1 : 0;
  for (let i = start; i < points.length; i += 1) {
    const p = points[i];
    if (p) {
      commands.push(`L ${pt(p.x, p.y)}`);
    }
  }
}
