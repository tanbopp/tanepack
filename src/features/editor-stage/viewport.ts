// Pure viewport coordinate, fit-to-screen, zoom, and face-clamped drag math for the 2D stage
import type { DesignElement } from '@entities/design-document';
import { roundMm, type SvgPathBoundsMm } from '@entities/dieline';
import type { Point } from '@entities/dieline/types';
import { pxToMm } from '@shared/lib/units';

export const MIN_STAGE_ZOOM = 0.1;
export const MAX_STAGE_ZOOM = 5;
export const STAGE_FIT_PADDING_PX = 48;

export interface StageViewport {
  zoom: number;
  pan: Point;
}

export interface StageSize {
  width: number;
  height: number;
}

/** Clamps a zoom multiplier strictly within [0.1, 5]. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 1;
  }
  return Math.min(MAX_STAGE_ZOOM, Math.max(MIN_STAGE_ZOOM, zoom));
}

/** Computes centered fit-to-screen zoom and translation for physical sheet bounds. */
export function computeFitViewport(
  stageSize: StageSize,
  fitTargetSizePx: StageSize,
  centerBoxSizePx: StageSize = fitTargetSizePx,
  maxAutoZoom = MAX_STAGE_ZOOM,
): StageViewport {
  if (
    stageSize.width <= 0 ||
    stageSize.height <= 0 ||
    fitTargetSizePx.width <= 0 ||
    fitTargetSizePx.height <= 0
  ) {
    return { zoom: 1, pan: { x: 0, y: 0 } };
  }

  const availableWidth = Math.max(1, stageSize.width - STAGE_FIT_PADDING_PX);
  const availableHeight = Math.max(1, stageSize.height - STAGE_FIT_PADDING_PX);
  const rawScale = Math.min(
    availableWidth / fitTargetSizePx.width,
    availableHeight / fitTargetSizePx.height,
  );
  const zoom = clampZoom(Math.min(maxAutoZoom, rawScale));

  return {
    zoom,
    pan: {
      x: (stageSize.width - centerBoxSizePx.width * zoom) / 2,
      y: (stageSize.height - centerBoxSizePx.height * zoom) / 2,
    },
  };
}

/** Scales viewport around a stage-local cursor point so that point remains visually fixed. */
export function zoomAtPoint(
  viewport: StageViewport,
  targetZoom: number,
  anchorPx: Point,
): StageViewport {
  const nextZoom = clampZoom(targetZoom);
  if (nextZoom === viewport.zoom) {
    return viewport;
  }

  const contentX = (anchorPx.x - viewport.pan.x) / viewport.zoom;
  const contentY = (anchorPx.y - viewport.pan.y) / viewport.zoom;

  return {
    zoom: nextZoom,
    pan: {
      x: anchorPx.x - contentX * nextZoom,
      y: anchorPx.y - contentY * nextZoom,
    },
  };
}

/** Converts a screen-space pixel delta into SVG millimeter delta under the current stage zoom. */
export function screenDeltaPxToMm(deltaPx: number, zoom: number): number {
  const safeZoom = zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
  return pxToMm(deltaPx) / safeZoom;
}

function clampRange(value: number, min: number, max: number): number {
  if (max < min) {
    return (min + max) * 0.5;
  }
  return Math.min(max, Math.max(min, value));
}

/** Clamps a dragged element's coordinates strictly within its parent face bounding box. */
export function clampElementPositionToFace(
  element: DesignElement,
  candidateXMm: number,
  candidateYMm: number,
  faceBounds: SvgPathBoundsMm,
): Point {
  if (element.type === 'image') {
    const maxX = Math.max(faceBounds.minX, faceBounds.maxX - element.transform.width);
    const maxY = Math.max(faceBounds.minY, faceBounds.maxY - element.transform.height);
    return {
      x: roundMm(clampRange(candidateXMm, faceBounds.minX, maxX)),
      y: roundMm(clampRange(candidateYMm, faceBounds.minY, maxY)),
    };
  }

  if (element.type === 'text') {
    const estimatedWidthMm = Math.max(
      element.style.fontSize,
      element.content.length * element.style.fontSize * 0.58,
    );
    const halfW = Math.min(faceBounds.width * 0.45, estimatedWidthMm * 0.5);
    const halfH = Math.min(faceBounds.height * 0.45, element.style.fontSize * 0.72);

    return {
      x: roundMm(clampRange(candidateXMm, faceBounds.minX + halfW, faceBounds.maxX - halfW)),
      y: roundMm(clampRange(candidateYMm, faceBounds.minY + halfH, faceBounds.maxY - halfH)),
    };
  }

  return {
    x: roundMm(clampRange(candidateXMm, faceBounds.minX, faceBounds.maxX)),
    y: roundMm(clampRange(candidateYMm, faceBounds.minY, faceBounds.maxY)),
  };
}
