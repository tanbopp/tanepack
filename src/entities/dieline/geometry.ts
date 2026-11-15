// Pure millimeter geometry, validation, SVG path formatting, and offset helpers for dielines
import type { Dieline, Point } from '@entities/dieline/types';
import { roundMm } from '@shared/lib/units';

export { roundMm };

/** Validates finite positive box dimensions and non-negative thickness/bleed allowances. */
export function validateDimensions(dimensions: Dieline['dimensions']): void {
  const { length, width, height, thickness, bleedSize } = dimensions;
  const values = [length, width, height, thickness, bleedSize];
  if (values.some((v) => !Number.isFinite(v))) {
    throw new RangeError('All dieline dimensions must be finite numbers.');
  }
  if (length <= 0 || width <= 0 || height <= 0) {
    throw new RangeError('Box length, width, and height must be strictly positive.');
  }
  if (thickness < 0 || bleedSize < 0) {
    throw new RangeError('Paperboard thickness and bleedSize must be non-negative.');
  }
}

/** Formats a millimeter number to at most 2 decimal places without trailing zeros. */
export function fmtMm(value: number): string {
  return String(roundMm(value));
}

/** Formats an SVG point pair `x,y` using 2-decimal precision max. */
export function pt(x: number, y: number): string {
  return `${fmtMm(x)},${fmtMm(y)}`;
}

/** Builds a closed orthogonal rectangle SVG path in clockwise order. */
export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${pt(x, y)} L ${pt(x + w, y)} L ${pt(x + w, y + h)} L ${pt(x, y + h)} Z`;
}

/** Builds the clockwise closed SVG path for the glue tab on the left wall. */
export function buildGlueTabPath(
  x0: number,
  x1: number,
  yTop: number,
  yBot: number,
  taper: number,
): string {
  return [
    `M ${pt(x1, yTop)}`,
    `L ${pt(x1, yBot)}`,
    `L ${pt(x0, yBot - taper)}`,
    `L ${pt(x0, yTop + taper)}`,
    'Z',
  ].join(' ');
}

export interface DustFlapMetrics {
  inset: number;
  shoulder: number;
  taper: number;
  height: number;
}

/** Builds a clockwise closed dust flap path opening UP from `yHinge` or DOWN from `yHinge`. */
export function buildDustFlapPath(
  panelXStart: number,
  panelXEnd: number,
  yHinge: number,
  direction: 'up' | 'down',
  m: DustFlapMetrics,
): string {
  const xL = panelXStart + m.inset;
  const xR = panelXEnd - m.inset;
  const sign = direction === 'up' ? -1 : 1;
  const yShoulder = yHinge + sign * m.shoulder;
  const yOuter = yHinge + sign * m.height;

  if (direction === 'up') {
    return [
      `M ${pt(xL, yHinge)}`,
      `L ${pt(xL, yShoulder)}`,
      `L ${pt(xL + m.taper, yOuter)}`,
      `L ${pt(xR - m.taper, yOuter)}`,
      `L ${pt(xR, yShoulder)}`,
      `L ${pt(xR, yHinge)}`,
      'Z',
    ].join(' ');
  }

  return [
    `M ${pt(xR, yHinge)}`,
    `L ${pt(xR, yShoulder)}`,
    `L ${pt(xR - m.taper, yOuter)}`,
    `L ${pt(xL + m.taper, yOuter)}`,
    `L ${pt(xL, yShoulder)}`,
    `L ${pt(xL, yHinge)}`,
    'Z',
  ].join(' ');
}

export interface TuckFlapMetrics {
  coverDepth: number;
  tuckDepth: number;
  tuckInset: number;
  tuckRadius: number;
}

/** Builds a clockwise closed compound closure + rounded tuck tongue SVG path. */
export function buildTuckFlapPath(
  panelXStart: number,
  panelXEnd: number,
  yHinge: number,
  direction: 'up' | 'down',
  m: TuckFlapMetrics,
): string {
  const { coverDepth, tuckDepth, tuckInset, tuckRadius } = m;

  if (direction === 'up') {
    const yCover = yHinge - coverDepth;
    const yTip = yCover - tuckDepth;
    return [
      `M ${pt(panelXStart, yHinge)}`,
      `L ${pt(panelXStart, yCover)}`,
      `L ${pt(panelXStart + tuckInset, yCover)}`,
      `L ${pt(panelXStart + tuckInset, yTip + tuckRadius)}`,
      `Q ${pt(panelXStart + tuckInset, yTip)} ${pt(panelXStart + tuckInset + tuckRadius, yTip)}`,
      `L ${pt(panelXEnd - tuckInset - tuckRadius, yTip)}`,
      `Q ${pt(panelXEnd - tuckInset, yTip)} ${pt(panelXEnd - tuckInset, yTip + tuckRadius)}`,
      `L ${pt(panelXEnd - tuckInset, yCover)}`,
      `L ${pt(panelXEnd, yCover)}`,
      `L ${pt(panelXEnd, yHinge)}`,
      'Z',
    ].join(' ');
  }

  const yCover = yHinge + coverDepth;
  const yTip = yCover + tuckDepth;
  return [
    `M ${pt(panelXEnd, yHinge)}`,
    `L ${pt(panelXEnd, yCover)}`,
    `L ${pt(panelXEnd - tuckInset, yCover)}`,
    `L ${pt(panelXEnd - tuckInset, yTip - tuckRadius)}`,
    `Q ${pt(panelXEnd - tuckInset, yTip)} ${pt(panelXEnd - tuckInset - tuckRadius, yTip)}`,
    `L ${pt(panelXStart + tuckInset + tuckRadius, yTip)}`,
    `Q ${pt(panelXStart + tuckInset, yTip)} ${pt(panelXStart + tuckInset, yTip - tuckRadius)}`,
    `L ${pt(panelXStart + tuckInset, yCover)}`,
    `L ${pt(panelXStart, yCover)}`,
    `L ${pt(panelXStart, yHinge)}`,
    'Z',
  ].join(' ');
}

/** Shifts a clockwise segment `(a -> b)` outward along its left-hand normal by `distance`. */
export function offsetSegmentOutward(a: Point, b: Point, distance: number): [Point, Point] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0 || distance === 0) {
    return [a, b];
  }
  // In SVG screen coordinates (x right, y down), clockwise traversal outer normal is (dy, -dx).
  const nx = (dy / len) * distance;
  const ny = (-dx / len) * distance;
  return [
    { x: roundMm(a.x + nx), y: roundMm(a.y + ny) },
    { x: roundMm(b.x + nx), y: roundMm(b.y + ny) },
  ];
}

/** Evaluates `y` on a shifted non-vertical line segment at `x`, clamped to segment endpoints. */
function evalLineYAtX(a: Point, b: Point, x: number): number {
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-6) {
    return b.y;
  }
  const t = Math.max(0, Math.min(1, (x - a.x) / dx));
  return roundMm(a.y + t * (b.y - a.y));
}

export interface BleedLayoutParams {
  x0: number;
  x1: number;
  x2: number;
  x3: number;
  x4: number;
  x5: number;
  y0: number;
  yCoverTop: number;
  yBodyTop: number;
  yBodyBot: number;
  yBotCover: number;
  yMax: number;
  glueTaper: number;
  dust: DustFlapMetrics;
  tuck: TuckFlapMetrics;
  bleedSize: number;
}

/** Builds a clean, non-self-intersecting outer bleed contour expanded by `bleedSize`. */
export function buildOuterBleedPath(p: BleedLayoutParams): string {
  const b = p.bleedSize;
  const { dust, tuck } = p;
  const cmds: string[] = [];

  // 1. Left & top of Top Tuck Flap (x4..x5)
  const yTopCoverCorner = Math.min(tuck.tuckRadius, Math.max(0, p.yCoverTop - b));
  const yTopOuter = p.y0 - b;
  const xTopTuckLeft = p.x4 + tuck.tuckInset - b;
  const xTopTuckRight = p.x5 - tuck.tuckInset + b;

  // Join between Top Right Dust and Top Tuck at x = x4 - b
  const [trEndA, trEndB] = offsetSegmentOutward(
    { x: p.x4 - dust.inset - dust.taper, y: p.yBodyTop - dust.height },
    { x: p.x4 - dust.inset, y: p.yBodyTop - dust.shoulder },
    b,
  );
  const xJoinTopTuck = p.x4 - b;

  if (xJoinTopTuck <= trEndB.x) {
    const yHit = evalLineYAtX(trEndA, trEndB, xJoinTopTuck);
    cmds.push(`M ${pt(xJoinTopTuck, yHit)}`);
  } else {
    cmds.push(`M ${pt(trEndB.x, trEndB.y)}`);
    cmds.push(`L ${pt(trEndB.x, p.yBodyTop - b)}`);
    cmds.push(`L ${pt(xJoinTopTuck, p.yBodyTop - b)}`);
  }

  cmds.push(`L ${pt(xJoinTopTuck, Math.max(yTopCoverCorner, p.yCoverTop - b))}`);
  if (p.yCoverTop - b >= tuck.tuckRadius) {
    cmds.push(`L ${pt(xTopTuckLeft, p.yCoverTop - b)}`);
  } else {
    cmds.push(`L ${pt(xTopTuckLeft, yTopCoverCorner)}`);
  }
  cmds.push(`L ${pt(xTopTuckLeft, yTopOuter + tuck.tuckRadius + b)}`);
  cmds.push(
    `Q ${pt(xTopTuckLeft, yTopOuter)} ${pt(p.x4 + tuck.tuckInset + tuck.tuckRadius, yTopOuter)}`,
  );
  cmds.push(`L ${pt(p.x5 - tuck.tuckInset - tuck.tuckRadius, yTopOuter)}`);
  cmds.push(
    `Q ${pt(xTopTuckRight, yTopOuter)} ${pt(xTopTuckRight, yTopOuter + tuck.tuckRadius + b)}`,
  );
  cmds.push(`L ${pt(xTopTuckRight, Math.max(yTopCoverCorner, p.yCoverTop - b))}`);
  cmds.push(`L ${pt(p.x5 + b, Math.max(yTopCoverCorner, p.yCoverTop - b))}`);

  // 2. Right wall down Back (x5 + b) and bottom edge toward Bottom Right Dust
  cmds.push(`L ${pt(p.x5 + b, p.yBodyBot + b)}`);

  const [brStartA, brStartB] = offsetSegmentOutward(
    { x: p.x4 - dust.inset, y: p.yBodyBot + dust.shoulder },
    { x: p.x4 - dust.inset - dust.taper, y: p.yBodyBot + dust.height },
    b,
  );
  if (brStartA.x >= p.x5 + b) {
    cmds.push(`L ${pt(p.x5 + b, brStartA.y)}`);
  } else {
    cmds.push(`L ${pt(brStartA.x, p.yBodyBot + b)}`);
    cmds.push(`L ${pt(brStartA.x, brStartA.y)}`);
  }
  cmds.push(`L ${pt(brStartB.x, brStartB.y)}`);

  // Bottom edge of Bottom Right Dust -> join with Bottom Tuck at x3 + b
  const yDustBotBleed = p.yBodyBot + dust.height + b;
  cmds.push(`L ${pt(p.x4 - dust.inset - dust.taper, yDustBotBleed)}`);
  cmds.push(`L ${pt(p.x3 + dust.inset + dust.taper, yDustBotBleed)}`);
  const [brEndA, brEndB] = offsetSegmentOutward(
    { x: p.x3 + dust.inset + dust.taper, y: p.yBodyBot + dust.height },
    { x: p.x3 + dust.inset, y: p.yBodyBot + dust.shoulder },
    b,
  );
  const xJoinBotTuckRight = p.x3 + b;
  if (xJoinBotTuckRight >= brEndB.x) {
    if (xJoinBotTuckRight < brEndA.x) {
      cmds.push(`L ${pt(brEndA.x, brEndA.y)}`);
    }
    const yHit = evalLineYAtX(brEndA, brEndB, xJoinBotTuckRight);
    cmds.push(`L ${pt(xJoinBotTuckRight, yHit)}`);
  } else {
    cmds.push(`L ${pt(brEndA.x, brEndA.y)}`);
    cmds.push(`L ${pt(brEndB.x, brEndB.y)}`);
    cmds.push(`L ${pt(brEndB.x, p.yBodyBot + b)}`);
    cmds.push(`L ${pt(xJoinBotTuckRight, p.yBodyBot + b)}`);
  }

  // 3. Bottom Tuck Flap (x2..x3)
  const yBotOuter = p.yMax + b;
  const yBotCoverCorner = Math.min(p.yMax - tuck.tuckRadius, p.yBotCover + b);
  const xBotTuckRight = p.x3 - tuck.tuckInset + b;
  const xBotTuckLeft = p.x2 + tuck.tuckInset - b;

  cmds.push(`L ${pt(xJoinBotTuckRight, yBotCoverCorner)}`);
  cmds.push(`L ${pt(xBotTuckRight, yBotCoverCorner)}`);
  cmds.push(`L ${pt(xBotTuckRight, p.yMax - tuck.tuckRadius)}`);
  cmds.push(
    `Q ${pt(xBotTuckRight, yBotOuter)} ${pt(p.x3 - tuck.tuckInset - tuck.tuckRadius, yBotOuter)}`,
  );
  cmds.push(`L ${pt(p.x2 + tuck.tuckInset + tuck.tuckRadius, yBotOuter)}`);
  cmds.push(`Q ${pt(xBotTuckLeft, yBotOuter)} ${pt(xBotTuckLeft, p.yMax - tuck.tuckRadius)}`);
  cmds.push(`L ${pt(xBotTuckLeft, yBotCoverCorner)}`);

  // Left side of Bottom Tuck -> join with Bottom Left Dust at x2 - b
  const xJoinBotTuckLeft = p.x2 - b;
  cmds.push(`L ${pt(xJoinBotTuckLeft, yBotCoverCorner)}`);
  const [blStartA, blStartB] = offsetSegmentOutward(
    { x: p.x2 - dust.inset, y: p.yBodyBot + dust.shoulder },
    { x: p.x2 - dust.inset - dust.taper, y: p.yBodyBot + dust.height },
    b,
  );
  if (xJoinBotTuckLeft <= blStartA.x) {
    const yHit = evalLineYAtX(blStartA, blStartB, xJoinBotTuckLeft);
    cmds.push(`L ${pt(xJoinBotTuckLeft, yHit)}`);
    if (xJoinBotTuckLeft > blStartB.x) {
      cmds.push(`L ${pt(blStartB.x, blStartB.y)}`);
    }
  } else {
    cmds.push(`L ${pt(xJoinBotTuckLeft, p.yBodyBot + b)}`);
    cmds.push(`L ${pt(blStartA.x, p.yBodyBot + b)}`);
    cmds.push(`L ${pt(blStartA.x, blStartA.y)}`);
    cmds.push(`L ${pt(blStartB.x, blStartB.y)}`);
  }

  // 4. Bottom Left Dust -> Glue Tab (x1..x0)
  cmds.push(`L ${pt(p.x2 - dust.inset - dust.taper, yDustBotBleed)}`);
  cmds.push(`L ${pt(p.x1 + dust.inset + dust.taper, yDustBotBleed)}`);
  const [blEndA, blEndB] = offsetSegmentOutward(
    { x: p.x1 + dust.inset + dust.taper, y: p.yBodyBot + dust.height },
    { x: p.x1 + dust.inset, y: p.yBodyBot + dust.shoulder },
    b,
  );
  const [glueBotA, glueBotB] = offsetSegmentOutward(
    { x: p.x1, y: p.yBodyBot },
    { x: p.x0, y: p.yBodyBot - p.glueTaper },
    b,
  );
  cmds.push(`L ${pt(blEndA.x, blEndA.y)}`);
  if (blEndB.x > glueBotA.x) {
    cmds.push(`L ${pt(blEndB.x, blEndB.y)}`);
    cmds.push(`L ${pt(blEndB.x, p.yBodyBot + b)}`);
    cmds.push(`L ${pt(glueBotA.x, glueBotA.y)}`);
  } else {
    const yJoinGlueBot = Math.min(blEndB.y, glueBotA.y);
    cmds.push(`L ${pt(Math.max(p.x1 - b, p.x0 + 1), yJoinGlueBot)}`);
  }
  cmds.push(`L ${pt(glueBotB.x, glueBotB.y)}`);

  // 5. Left outer edge of Glue Tab (x0 - b) -> Top Left Dust
  const [glueTopA, glueTopB] = offsetSegmentOutward(
    { x: p.x0, y: p.yBodyTop + p.glueTaper },
    { x: p.x1, y: p.yBodyTop },
    b,
  );
  cmds.push(`L ${pt(p.x0 - b, glueBotB.y)}`);
  cmds.push(`L ${pt(p.x0 - b, glueTopA.y)}`);
  cmds.push(`L ${pt(glueTopA.x, glueTopA.y)}`);

  const [tlStartA, tlStartB] = offsetSegmentOutward(
    { x: p.x1 + dust.inset, y: p.yBodyTop - dust.shoulder },
    { x: p.x1 + dust.inset + dust.taper, y: p.yBodyTop - dust.height },
    b,
  );
  if (tlStartA.x > glueTopB.x) {
    cmds.push(`L ${pt(glueTopB.x, glueTopB.y)}`);
    cmds.push(`L ${pt(tlStartA.x, p.yBodyTop - b)}`);
    cmds.push(`L ${pt(tlStartA.x, tlStartA.y)}`);
  } else {
    cmds.push(`L ${pt(tlStartA.x, Math.max(tlStartA.y, p.yBodyTop - b))}`);
  }
  cmds.push(`L ${pt(tlStartB.x, tlStartB.y)}`);

  // 6. Top Left Dust -> Front top edge -> Top Right Dust
  const yDustTopBleed = p.yBodyTop - dust.height - b;
  const frontMidX = roundMm((p.x2 + p.x3) * 0.5);
  cmds.push(`L ${pt(p.x1 + dust.inset + dust.taper, yDustTopBleed)}`);
  cmds.push(`L ${pt(p.x2 - dust.inset - dust.taper, yDustTopBleed)}`);
  const [tlEndA, tlEndB] = offsetSegmentOutward(
    { x: p.x2 - dust.inset - dust.taper, y: p.yBodyTop - dust.height },
    { x: p.x2 - dust.inset, y: p.yBodyTop - dust.shoulder },
    b,
  );
  const [trStartA, trStartB] = offsetSegmentOutward(
    { x: p.x3 + dust.inset, y: p.yBodyTop - dust.shoulder },
    { x: p.x3 + dust.inset + dust.taper, y: p.yBodyTop - dust.height },
    b,
  );
  cmds.push(`L ${pt(tlEndA.x, tlEndA.y)}`);
  if (tlEndB.x <= trStartA.x) {
    cmds.push(`L ${pt(tlEndB.x, tlEndB.y)}`);
    cmds.push(`L ${pt(tlEndB.x, p.yBodyTop - b)}`);
    cmds.push(`L ${pt(trStartA.x, p.yBodyTop - b)}`);
    cmds.push(`L ${pt(trStartA.x, trStartA.y)}`);
  } else {
    cmds.push(`L ${pt(frontMidX, Math.min(tlEndB.y, trStartA.y))}`);
  }
  cmds.push(`L ${pt(trStartB.x, trStartB.y)}`);
  cmds.push(`L ${pt(p.x3 + dust.inset + dust.taper, yDustTopBleed)}`);
  cmds.push(`L ${pt(p.x4 - dust.inset - dust.taper, yDustTopBleed)}`);
  if (xJoinTopTuck > trEndA.x) {
    cmds.push(`L ${pt(trEndA.x, trEndA.y)}`);
  } else {
    cmds.push(`L ${pt(xJoinTopTuck, trEndA.y)}`);
  }
  cmds.push('Z');

  return cmds.join(' ');
}

export interface SlottedLayoutParams {
  x0: number;
  x1: number;
  x2: number;
  x3: number;
  x4: number;
  x5: number;
  y0: number;
  yTopInner: number;
  yBodyTop: number;
  yBodyBot: number;
  yBotInner: number;
  yMax: number;
  flapInset: number;
  glueTaper: number;
  bleedSize: number;
}

/**
 * Builds the continuous clockwise perimeter cut path for a 13-face slotted container
 * (FEFCO 0201 RSC or FEFCO 0203 Full Overlap).
 */
export function buildSlottedCutPath(p: SlottedLayoutParams): string {
  const {
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
  } = p;

  const topFlapY: readonly [number, number, number, number] = [yTopInner, y0, yTopInner, y0];
  const botFlapY: readonly [number, number, number, number] = [yMax, yBotInner, yMax, yBotInner];
  const panels: readonly [number, number][] = [
    [x1, x2],
    [x2, x3],
    [x3, x4],
    [x4, x5],
  ];

  const cmds: string[] = [`M ${pt(x1 + flapInset, yBodyTop)}`];

  // Top 4 flaps left-to-right (Left inner, Front outer, Right inner, Back outer)
  panels.forEach(([xStart, xEnd], idx) => {
    const yEdge = topFlapY[idx] ?? y0;
    if (idx > 0) {
      cmds.push(`L ${pt(xStart + flapInset, yBodyTop)}`);
    }
    cmds.push(`L ${pt(xStart + flapInset, yEdge)}`);
    cmds.push(`L ${pt(xEnd - flapInset, yEdge)}`);
    cmds.push(`L ${pt(xEnd - flapInset, yBodyTop)}`);
  });

  // Back outer right edge from top slot shoulder to bottom slot shoulder
  cmds.push(`L ${pt(x5, yBodyTop)}`);
  cmds.push(`L ${pt(x5, yBodyBot)}`);

  // Bottom 4 flaps right-to-left (Back outer, Right inner, Front outer, Left inner)
  const botPanels = [...panels].reverse();
  botPanels.forEach(([xStart, xEnd], idx) => {
    const yEdge = botFlapY[idx] ?? yMax;
    cmds.push(`L ${pt(xEnd - flapInset, yBodyBot)}`);
    cmds.push(`L ${pt(xEnd - flapInset, yEdge)}`);
    cmds.push(`L ${pt(xStart + flapInset, yEdge)}`);
    cmds.push(`L ${pt(xStart + flapInset, yBodyBot)}`);
  });

  // Glue tab clockwise around left wall back into top-left hinge
  cmds.push(`L ${pt(x1, yBodyBot)}`);
  cmds.push(`L ${pt(x0, yBodyBot - glueTaper)}`);
  cmds.push(`L ${pt(x0, yBodyTop + glueTaper)}`);
  cmds.push(`L ${pt(x1, yBodyTop)}`);
  cmds.push('Z');

  return cmds.join(' ');
}

/**
 * Builds a clean, non-self-intersecting outward bleed contour for FEFCO 0201 / 0203
 * slotted containers, bridging narrow inter-flap slots cleanly when `flapInset < bleedSize`.
 */
export function buildSlottedBleedPath(p: SlottedLayoutParams): string {
  const b = p.bleedSize;
  const {
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
  } = p;

  const panels: readonly [number, number][] = [
    [x1, x2],
    [x2, x3],
    [x3, x4],
    [x4, x5],
  ];
  const topY: readonly [number, number, number, number] = [yTopInner, y0, yTopInner, y0];
  const botY: readonly [number, number, number, number] = [yMax, yBotInner, yMax, yBotInner];

  const cmds: string[] = [];

  // Glue tab top sloped edge transitioning into Left top inner flap
  const [glueTopA, glueTopB] = offsetSegmentOutward(
    { x: x0, y: yBodyTop + glueTaper },
    { x: x1, y: yBodyTop },
    b,
  );
  const xFirstFlapLeft = x1 + flapInset - b;
  const yFirstTopBleed = roundMm((topY[0] ?? y0) - b);

  cmds.push(`M ${pt(x0 - b, glueTopA.y)}`);
  cmds.push(`L ${pt(glueTopA.x, glueTopA.y)}`);
  if (glueTopB.x < xFirstFlapLeft) {
    cmds.push(`L ${pt(glueTopB.x, glueTopB.y)}`);
    cmds.push(`L ${pt(xFirstFlapLeft, yBodyTop - b)}`);
  } else {
    cmds.push(`L ${pt(xFirstFlapLeft, Math.max(yFirstTopBleed, glueTopB.y))}`);
  }

  // Top 4 flaps left-to-right with non-intersecting slot bridges
  panels.forEach(([xStart, xEnd], idx) => {
    const curY = roundMm((topY[idx] ?? y0) - b);
    const curRightBleed = xEnd - flapInset + b;

    cmds.push(`L ${pt(xStart + flapInset - b, curY)}`);

    if (idx < panels.length - 1) {
      const nextY = roundMm((topY[idx + 1] ?? y0) - b);
      const nextLeftBleed = xEnd + flapInset - b;

      if (curRightBleed < nextLeftBleed) {
        cmds.push(`L ${pt(curRightBleed, curY)}`);
        cmds.push(`L ${pt(curRightBleed, yBodyTop - b)}`);
        cmds.push(`L ${pt(nextLeftBleed, yBodyTop - b)}`);
      } else if (curY === nextY) {
        // Adjacent flaps have identical bleed height: bridge straight across slot
        cmds.push(`L ${pt(nextLeftBleed, nextY)}`);
      } else {
        // Keep exact `b` clearance around the taller adjacent flap across the narrow slot
        const stepX = curY < nextY ? curRightBleed : nextLeftBleed;
        cmds.push(`L ${pt(stepX, curY)}`);
        cmds.push(`L ${pt(stepX, nextY)}`);
      }
    } else {
      cmds.push(`L ${pt(curRightBleed, curY)}`);
    }
  });

  // Back top shoulder -> outer right edge (x5 + b) -> bottom shoulder
  const xLastFlapRight = x5 - flapInset + b;
  if (xLastFlapRight < x5 + b) {
    cmds.push(`L ${pt(xLastFlapRight, yBodyTop - b)}`);
    cmds.push(`L ${pt(x5 + b, yBodyTop - b)}`);
  }
  cmds.push(`L ${pt(x5 + b, yBodyBot + b)}`);
  if (xLastFlapRight < x5 + b) {
    cmds.push(`L ${pt(xLastFlapRight, yBodyBot + b)}`);
  }

  // Bottom 4 flaps right-to-left (Back outer, Right inner, Front outer, Left inner)
  const revPanels = [...panels].reverse();
  revPanels.forEach(([xStart, xEnd], idx) => {
    const curY = roundMm((botY[idx] ?? yMax) + b);
    const curLeftBleed = xStart + flapInset - b;

    cmds.push(`L ${pt(xEnd - flapInset + b, curY)}`);

    if (idx < revPanels.length - 1) {
      const nextY = roundMm((botY[idx + 1] ?? yMax) + b);
      const nextRightBleed = xStart - flapInset + b;

      if (curLeftBleed > nextRightBleed) {
        cmds.push(`L ${pt(curLeftBleed, curY)}`);
        cmds.push(`L ${pt(curLeftBleed, yBodyBot + b)}`);
        cmds.push(`L ${pt(nextRightBleed, yBodyBot + b)}`);
      } else if (curY === nextY) {
        cmds.push(`L ${pt(nextRightBleed, nextY)}`);
      } else {
        const stepX = curY > nextY ? curLeftBleed : nextRightBleed;
        cmds.push(`L ${pt(stepX, curY)}`);
        cmds.push(`L ${pt(stepX, nextY)}`);
      }
    } else {
      cmds.push(`L ${pt(curLeftBleed, curY)}`);
    }
  });

  // Transition from Bottom Left Inner flap into Glue Tab bottom slope & left edge
  const [glueBotA, glueBotB] = offsetSegmentOutward(
    { x: x1, y: yBodyBot },
    { x: x0, y: yBodyBot - glueTaper },
    b,
  );
  const yLastBotBleed = roundMm((botY[3] ?? yBotInner) + b);
  if (glueBotA.x < xFirstFlapLeft) {
    cmds.push(`L ${pt(xFirstFlapLeft, yBodyBot + b)}`);
    cmds.push(`L ${pt(glueBotA.x, glueBotA.y)}`);
  } else {
    cmds.push(`L ${pt(xFirstFlapLeft, Math.min(yLastBotBleed, glueBotA.y))}`);
  }
  cmds.push(`L ${pt(glueBotB.x, glueBotB.y)}`);
  cmds.push(`L ${pt(x0 - b, glueBotB.y)}`);
  cmds.push('Z');

  return cmds.join(' ');
}

export interface SvgPathBoundsMm {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  center: Point;
}

const PATH_NUMBERS_REGEX = /[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi;

/** Computes the millimeter bounding box and center of an SVG path using absolute M/L/Q/Z coords. */
export function computeSvgPathBoundsMm(svgPath: string): SvgPathBoundsMm {
  const numbers = svgPath.match(PATH_NUMBERS_REGEX)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    if (x === undefined || y === undefined) {
      continue;
    }
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX)) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      center: { x: 0, y: 0 },
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    center: {
      x: (minX + maxX) * 0.5,
      y: (minY + maxY) * 0.5,
    },
  };
}
