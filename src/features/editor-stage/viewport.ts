// Pure viewport coordinate, fit-to-screen, and zoom-at-anchor math for the 2D stage
import type { Point } from '@entities/dieline/types';

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
