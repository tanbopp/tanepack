// Pure SVG-mm geometry helpers for element selection frames, rotation (atan2), and corner resize
import type { DesignElement, TextElement } from '@entities/design-document';
import { roundMm, type SvgPathBoundsMm } from '@entities/dieline';
import type { Point } from '@entities/dieline/types';
import { pxToMm } from '@shared/lib/units';
import type { StageViewport } from './viewport';

export const MIN_TEXT_FONT_SIZE_MM = 4;
export const MAX_TEXT_FONT_SIZE_MM = 72;
export const MIN_IMAGE_SIZE_MM = 5;
export const ROTATE_HANDLE_OFFSET_MM = 10;

export type ResizeCorner = 'nw' | 'ne' | 'se' | 'sw';

export const RESIZE_CORNERS: readonly ResizeCorner[] = ['nw', 'ne', 'se', 'sw'];

const CORNER_SIGNS: Record<ResizeCorner, { sx: -1 | 1; sy: -1 | 1 }> = {
  nw: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  se: { sx: 1, sy: 1 },
  sw: { sx: -1, sy: 1 },
};

export interface SelectionFrame {
  rectX: number;
  rectY: number;
  rectWidth: number;
  rectHeight: number;
  center: Point;
  rotateHandlePos: Point;
  corners: Record<ResizeCorner, Point>;
}

export interface ResizeStartSnapshot {
  frameWidth: number;
  frameHeight: number;
  center: Point;
  rotationDeg: number;
  elementWidth: number;
  elementHeight: number;
  fontSize: number;
}

export interface ResizeElementPatch {
  transform: Partial<DesignElement['transform']>;
  style?: Partial<TextElement['style']> | undefined;
}

/** Computes axis-aligned selection rectangle, center pivot, 4 corners, and top rotation handle in mm. */
export function getElementSelectionFrame(element: DesignElement): SelectionFrame {
  let rectX: number;
  let rectY: number;
  let rectWidth: number;
  let rectHeight: number;
  let center: Point;

  if (element.type === 'text') {
    const rawWidth = Math.max(
      element.transform.width,
      element.content.length * element.style.fontSize * 0.62,
    );
    rectWidth = rawWidth + 6;
    rectHeight = element.style.fontSize * 1.45;
    center = { x: element.transform.x, y: element.transform.y };
    rectX = center.x - rectWidth * 0.5;
    rectY = center.y - rectHeight * 0.5;
  } else {
    rectX = element.transform.x - 1.5;
    rectY = element.transform.y - 1.5;
    rectWidth = element.transform.width + 3;
    rectHeight = element.transform.height + 3;
    center = {
      x: element.transform.x + element.transform.width * 0.5,
      y: element.transform.y + element.transform.height * 0.5,
    };
  }

  return {
    rectX,
    rectY,
    rectWidth,
    rectHeight,
    center,
    rotateHandlePos: { x: center.x, y: rectY - ROTATE_HANDLE_OFFSET_MM },
    corners: {
      nw: { x: rectX, y: rectY },
      ne: { x: rectX + rectWidth, y: rectY },
      se: { x: rectX + rectWidth, y: rectY + rectHeight },
      sw: { x: rectX, y: rectY + rectHeight },
    },
  };
}

/** Converts pointer client coordinates into SVG millimeter coordinates under active pan/zoom. */
export function clientPointToSvgMm(
  clientX: number,
  clientY: number,
  stageRect: Pick<DOMRect, 'left' | 'top'>,
  viewport: StageViewport,
): Point {
  const safeZoom = viewport.zoom > 0 && Number.isFinite(viewport.zoom) ? viewport.zoom : 1;
  return {
    x: pxToMm((clientX - stageRect.left - viewport.pan.x) / safeZoom),
    y: pxToMm((clientY - stageRect.top - viewport.pan.y) / safeZoom),
  };
}

/**
 * Computes element rotation in degrees [0, 360) around its center using Math.atan2.
 * Adding 90° aligns the top-center handle (straight up, -Y in SVG space) to 0°.
 */
export function computeRotationDegreesFromPointer(center: Point, pointerMm: Point): number {
  const dx = pointerMm.x - center.x;
  const dy = pointerMm.y - center.y;
  if (dx === 0 && dy === 0) {
    return 0;
  }
  const rawDegrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const normalized = ((rawDegrees % 360) + 360) % 360;
  return Math.round(normalized * 10) / 10;
}

/** Produces a synchronized fontSize + bounding width/height patch for a TextElement. */
export function computeTextFontSizePatch(
  element: Pick<TextElement, 'style' | 'transform'>,
  targetFontSizeMm: number,
): ResizeElementPatch {
  const clampedFontSize =
    Math.round(
      Math.min(MAX_TEXT_FONT_SIZE_MM, Math.max(MIN_TEXT_FONT_SIZE_MM, targetFontSizeMm)) * 10,
    ) / 10;
  const baseFontSize = element.style.fontSize > 0 ? element.style.fontSize : 14;
  const ratio = clampedFontSize / baseFontSize;

  return {
    style: { fontSize: clampedFontSize },
    transform: {
      width: roundMm(Math.max(clampedFontSize * 0.8, element.transform.width * ratio)),
      height: roundMm(clampedFontSize * 1.45),
    },
  };
}

/** Captures initial element and frame dimensions at the start of a corner resize drag. */
export function createResizeSnapshot(element: DesignElement): ResizeStartSnapshot {
  const frame = getElementSelectionFrame(element);
  return {
    frameWidth: frame.rectWidth,
    frameHeight: frame.rectHeight,
    center: frame.center,
    rotationDeg: element.transform.rotation,
    elementWidth: element.transform.width,
    elementHeight: element.transform.height,
    fontSize: element.type === 'text' ? element.style.fontSize : 14,
  };
}

function clampBetween(value: number, min: number, max: number): number {
  if (max < min) {
    return (min + max) * 0.5;
  }
  return Math.min(max, Math.max(min, value));
}

function computeUniformScaleFromCornerDrag(
  corner: ResizeCorner,
  pointerMm: Point,
  start: ResizeStartSnapshot,
): number {
  const rad = (-start.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pointerMm.x - start.center.x;
  const dy = pointerMm.y - start.center.y;

  // Transform pointer offset into the element's unrotated local frame
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const halfW = Math.max(1, start.frameWidth * 0.5);
  const halfH = Math.max(1, start.frameHeight * 0.5);
  const startDiag = Math.hypot(halfW, halfH);
  const { sx, sy } = CORNER_SIGNS[corner];

  const projected = (localX * (sx * halfW) + localY * (sy * halfH)) / startDiag;
  return projected / startDiag;
}

/**
 * Computes uniform corner resize updates in SVG mm:
 * - For images and shapes: maintains aspect ratio freely across the canvas above MIN_IMAGE_SIZE_MM.
 * - For text: scales fontSize proportionally within [4mm, 72mm] alongside box width/height.
 */
export function computeCornerResizePatch(
  element: DesignElement,
  corner: ResizeCorner,
  pointerMm: Point,
  start: ResizeStartSnapshot,
  _faceBounds?: SvgPathBoundsMm,
): ResizeElementPatch {
  const rawScale = computeUniformScaleFromCornerDrag(corner, pointerMm, start);

  if (element.type === 'text') {
    const safeStartFontSize = start.fontSize > 0 ? start.fontSize : 14;
    const minScale = MIN_TEXT_FONT_SIZE_MM / safeStartFontSize;
    const maxScale = MAX_TEXT_FONT_SIZE_MM / safeStartFontSize;
    const clampedScale = Math.min(maxScale, Math.max(minScale, rawScale));
    const nextFontSize =
      Math.round(
        Math.min(
          MAX_TEXT_FONT_SIZE_MM,
          Math.max(MIN_TEXT_FONT_SIZE_MM, safeStartFontSize * clampedScale),
        ) * 10,
      ) / 10;
    const ratio = nextFontSize / safeStartFontSize;

    return {
      style: { fontSize: nextFontSize },
      transform: {
        width: roundMm(Math.max(nextFontSize * 0.8, start.elementWidth * ratio)),
        height: roundMm(nextFontSize * 1.45),
      },
    };
  }

  const safeW = Math.max(1, start.elementWidth);
  const safeH = Math.max(1, start.elementHeight);
  const minScale = Math.max(MIN_IMAGE_SIZE_MM / safeW, MIN_IMAGE_SIZE_MM / safeH);
  const scale = clampBetween(rawScale, minScale, 20);

  const nextWidth = roundMm(safeW * scale);
  const nextHeight = roundMm(safeH * scale);

  return {
    transform: {
      x: roundMm(start.center.x - nextWidth * 0.5),
      y: roundMm(start.center.y - nextHeight * 0.5),
      width: nextWidth,
      height: nextHeight,
    },
  };
}
