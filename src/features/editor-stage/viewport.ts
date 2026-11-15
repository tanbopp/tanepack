// Pure viewport coordinate, fit-to-screen, zoom, and magnetic snap math for the 2D stage
import type { DesignElement } from '@entities/design-document';
import { roundMm, type SvgPathBoundsMm } from '@entities/dieline';
import type { Point } from '@entities/dieline/types';
import { pxToMm } from '@shared/lib/units';

export const MIN_STAGE_ZOOM = 0.1;
export const MAX_STAGE_ZOOM = 5;
export const STAGE_FIT_PADDING_PX = 48;
export const SNAP_THRESHOLD_MM = 2;

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

export interface SnapGuideLine {
  axis: 'x' | 'y';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuideLine[];
}

export interface ElementFootprintMm {
  minX: number;
  centerX: number;
  maxX: number;
  minY: number;
  centerY: number;
  maxY: number;
}

export interface ComputeSnapOptions {
  element: DesignElement;
  candidateXMm: number;
  candidateYMm: number;
  faceBounds: readonly SvgPathBoundsMm[];
  otherElements: readonly DesignElement[];
  thresholdMm?: number;
}

interface AxisSnapTarget {
  value: number;
  spanMin: number;
  spanMax: number;
}

interface AxisSnapMatch {
  delta: number;
  absDelta: number;
  value: number;
  spanMin: number;
  spanMax: number;
}

/** Computes axis-aligned mm footprint (min, center, max) for any DesignElement at a candidate origin. */
export function getElementFootprintMm(
  element: DesignElement,
  xMm = element.transform.x,
  yMm = element.transform.y,
): ElementFootprintMm {
  if (element.type === 'text') {
    const estimatedWidth = Math.max(
      element.transform.width,
      element.content.length * element.style.fontSize * 0.62,
    );
    const halfW = estimatedWidth * 0.5;
    const halfH = element.style.fontSize * 0.725;
    return {
      minX: xMm - halfW,
      centerX: xMm,
      maxX: xMm + halfW,
      minY: yMm - halfH,
      centerY: yMm,
      maxY: yMm + halfH,
    };
  }

  const width = element.transform.width;
  const height = element.transform.height;
  return {
    minX: xMm,
    centerX: xMm + width * 0.5,
    maxX: xMm + width,
    minY: yMm,
    centerY: yMm + height * 0.5,
    maxY: yMm + height,
  };
}

function findNearestAxisSnap(
  anchors: readonly [number, number, number],
  targets: readonly AxisSnapTarget[],
  thresholdMm: number,
): AxisSnapMatch | null {
  let best: AxisSnapMatch | null = null;
  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const absDelta = Math.abs(delta);
      if (absDelta <= thresholdMm && (best === null || absDelta < best.absDelta)) {
        best = {
          delta,
          absDelta,
          value: target.value,
          spanMin: target.spanMin,
          spanMax: target.spanMax,
        };
      }
    }
  }
  return best;
}

/**
 * Computes free-form magnetic snap coordinates and magenta guide lines against
 * all dieline face edges/centers and visible sibling elements within thresholdMm.
 */
export function computeSnap({
  element,
  candidateXMm,
  candidateYMm,
  faceBounds,
  otherElements,
  thresholdMm = SNAP_THRESHOLD_MM,
}: ComputeSnapOptions): SnapResult {
  const safeThreshold = Math.max(0, thresholdMm);
  const candidateFp = getElementFootprintMm(element, candidateXMm, candidateYMm);

  const xTargets: AxisSnapTarget[] = [];
  const yTargets: AxisSnapTarget[] = [];

  for (const face of faceBounds) {
    xTargets.push(
      { value: face.minX, spanMin: face.minY, spanMax: face.maxY },
      { value: face.center.x, spanMin: face.minY, spanMax: face.maxY },
      { value: face.maxX, spanMin: face.minY, spanMax: face.maxY },
    );
    yTargets.push(
      { value: face.minY, spanMin: face.minX, spanMax: face.maxX },
      { value: face.center.y, spanMin: face.minX, spanMax: face.maxX },
      { value: face.maxY, spanMin: face.minX, spanMax: face.maxX },
    );
  }

  for (const sibling of otherElements) {
    if (sibling.id === element.id) {
      continue;
    }
    const sibFp = getElementFootprintMm(sibling);
    xTargets.push(
      { value: sibFp.minX, spanMin: sibFp.minY, spanMax: sibFp.maxY },
      { value: sibFp.centerX, spanMin: sibFp.minY, spanMax: sibFp.maxY },
      { value: sibFp.maxX, spanMin: sibFp.minY, spanMax: sibFp.maxY },
    );
    yTargets.push(
      { value: sibFp.minY, spanMin: sibFp.minX, spanMax: sibFp.maxX },
      { value: sibFp.centerY, spanMin: sibFp.minX, spanMax: sibFp.maxX },
      { value: sibFp.maxY, spanMin: sibFp.minX, spanMax: sibFp.maxX },
    );
  }

  const bestX = findNearestAxisSnap(
    [candidateFp.minX, candidateFp.centerX, candidateFp.maxX],
    xTargets,
    safeThreshold,
  );
  const bestY = findNearestAxisSnap(
    [candidateFp.minY, candidateFp.centerY, candidateFp.maxY],
    yTargets,
    safeThreshold,
  );

  const x = roundMm(candidateXMm + (bestX?.delta ?? 0));
  const y = roundMm(candidateYMm + (bestY?.delta ?? 0));
  const snappedFp = getElementFootprintMm(element, x, y);
  const guides: SnapGuideLine[] = [];

  if (bestX !== null) {
    guides.push({
      axis: 'x',
      x1: roundMm(bestX.value),
      y1: roundMm(Math.min(bestX.spanMin, snappedFp.minY) - 4),
      x2: roundMm(bestX.value),
      y2: roundMm(Math.max(bestX.spanMax, snappedFp.maxY) + 4),
    });
  }

  if (bestY !== null) {
    guides.push({
      axis: 'y',
      x1: roundMm(Math.min(bestY.spanMin, snappedFp.minX) - 4),
      y1: roundMm(bestY.value),
      x2: roundMm(Math.max(bestY.spanMax, snappedFp.maxX) + 4),
      y2: roundMm(bestY.value),
    });
  }

  return { x, y, guides };
}
