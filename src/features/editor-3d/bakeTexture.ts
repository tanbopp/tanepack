// Offscreen 2D canvas texture baker for individual folded carton faces
import * as THREE from 'three';
import type { DesignElement, TextElement } from '@entities/design-document';
import { computeSvgPathBoundsMm } from '@entities/dieline';
import type { Face } from '@entities/dieline/types';
import { PX_PER_MM } from '@shared/lib/units';

export const MAX_TEXTURE_SIZE = 1024;
export const DEFAULT_BAKE_SCALE = 2;

export interface TexturePixelDimensions {
  width: number;
  height: number;
  pxPerMmX: number;
  pxPerMmY: number;
}

/**
 * Computes offscreen canvas pixel dimensions for a face at the given resolution multiplier,
 * clamping the longest edge to MAX_TEXTURE_SIZE (1024px) to stay gentle on GPU VRAM.
 */
export function computeBakedTextureSize(
  faceWidthMm: number,
  faceHeightMm: number,
  scale = DEFAULT_BAKE_SCALE,
): TexturePixelDimensions {
  const safeWidthMm = Math.max(1, faceWidthMm);
  const safeHeightMm = Math.max(1, faceHeightMm);
  const targetPxPerMm = PX_PER_MM * Math.max(0.25, scale);

  const rawWidth = safeWidthMm * targetPxPerMm;
  const rawHeight = safeHeightMm * targetPxPerMm;
  const maxEdge = Math.max(rawWidth, rawHeight);
  const clampFactor = maxEdge > MAX_TEXTURE_SIZE ? MAX_TEXTURE_SIZE / maxEdge : 1;

  const width = Math.max(1, Math.min(MAX_TEXTURE_SIZE, Math.round(rawWidth * clampFactor)));
  const height = Math.max(1, Math.min(MAX_TEXTURE_SIZE, Math.round(rawHeight * clampFactor)));

  return {
    width,
    height,
    pxPerMmX: width / safeWidthMm,
    pxPerMmY: height / safeHeightMm,
  };
}

/** Filters and z-orders outside-surface design elements belonging to a single face. */
export function getFaceElementsForFace(
  faceId: string,
  elements: readonly DesignElement[],
): TextElement[] {
  return elements
    .filter(
      (element): element is TextElement =>
        element.type === 'text' && element.faceId === faceId && element.side === 'outside',
    )
    .sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Produces a deterministic comparison key for a face's baked inputs so unchanged faces
 * skip canvas re-baking when another face's elements change.
 */
export function buildFaceBakeSignature(
  face: Face,
  elements: readonly DesignElement[],
  scale = DEFAULT_BAKE_SCALE,
): string {
  const faceElements = getFaceElementsForFace(face.id, elements);
  return JSON.stringify({
    faceId: face.id,
    path: face.path,
    scale,
    elements: faceElements,
  });
}

function drawTextElementOnFaceCanvas(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  originXMm: number,
  originYMm: number,
  pxPerMmX: number,
  pxPerMmY: number,
): void {
  if (element.content.length === 0) {
    return;
  }

  const localX = (element.transform.x - originXMm) * pxPerMmX;
  const localY = (element.transform.y - originYMm) * pxPerMmY;
  const avgPxPerMm = (pxPerMmX + pxPerMmY) * 0.5;
  const fontSizePx = Math.max(1, element.style.fontSize * avgPxPerMm);

  ctx.save();
  ctx.globalAlpha = element.opacity;
  ctx.fillStyle = element.style.color;
  ctx.font = `${element.style.fontWeight} ${fontSizePx}px ${element.style.fontFamily}`;
  ctx.textAlign = element.style.textAlign;
  ctx.textBaseline = 'middle';

  if (element.transform.rotation !== 0) {
    ctx.translate(localX, localY);
    ctx.rotate((element.transform.rotation * Math.PI) / 180);
    ctx.fillText(element.content, 0, 0);
  } else {
    ctx.fillText(element.content, localX, localY);
  }

  ctx.restore();
}

/**
 * Bakes a single Face's paper background and assigned 2D artwork into an offscreen HTMLCanvas
 * wrapped in a lightweight THREE.CanvasTexture (mipmaps disabled, max edge <= 1024px).
 */
export function bakeFaceTexture(
  face: Face,
  elements: readonly DesignElement[],
  scale = DEFAULT_BAKE_SCALE,
): THREE.CanvasTexture {
  const bounds = computeSvgPathBoundsMm(face.path);
  const { width, height, pxPerMmX, pxPerMmY } = computeBakedTextureSize(
    bounds.width,
    bounds.height,
    scale,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const matchingElements = getFaceElementsForFace(face.id, elements);
    for (const element of matchingElements) {
      drawTextElementOnFaceCanvas(ctx, element, bounds.minX, bounds.minY, pxPerMmX, pxPerMmY);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}
