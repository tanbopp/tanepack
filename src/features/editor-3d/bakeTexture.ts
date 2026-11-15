// Offscreen 2D canvas texture baker for individual folded carton faces (text & raster images)
import * as THREE from 'three';
import {
  type DesignElement,
  type ImageElement,
  resolveShapeGeometry,
  type ShapeElement,
  type TextElement,
} from '@entities/design-document';
import { computeSvgPathBoundsMm, type SvgPathBoundsMm } from '@entities/dieline';
import type { Face } from '@entities/dieline/types';
import { getCachedDecodedImage, setCachedDecodedImage } from '@shared/lib/imageUpload';
import { PX_PER_MM } from '@shared/lib/units';

export const MAX_TEXTURE_SIZE = 1024;
export const DEFAULT_BAKE_SCALE = 2;

export type BakeableArtworkElement = DesignElement;

export interface TexturePixelDimensions {
  width: number;
  height: number;
  pxPerMmX: number;
  pxPerMmY: number;
}

/** Registers an already-loaded HTMLImageElement for synchronous CanvasTexture baking. */
export function registerBakedImage(src: string, image: HTMLImageElement): void {
  setCachedDecodedImage(src, image);
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

/** Filters and z-orders outside-surface text, image, and shape elements belonging to a single face. */
export function getFaceElementsForFace(
  faceId: string,
  elements: readonly DesignElement[],
): BakeableArtworkElement[] {
  return elements
    .filter(
      (element) =>
        (element.type === 'text' || element.type === 'image' || element.type === 'shape') &&
        element.faceId === faceId &&
        element.side === 'outside',
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

function drawImageElementOnFaceCanvas(
  ctx: CanvasRenderingContext2D,
  element: ImageElement,
  originXMm: number,
  originYMm: number,
  pxPerMmX: number,
  pxPerMmY: number,
  onImagePending: (image: HTMLImageElement, src: string) => void,
): void {
  if (!element.src) {
    return;
  }

  let img = getCachedDecodedImage(element.src);
  if (!img) {
    img = new Image();
    img.src = element.src;
    if (img.complete && img.naturalWidth > 0) {
      setCachedDecodedImage(element.src, img);
    } else {
      onImagePending(img, element.src);
      return;
    }
  }

  const boxX = (element.transform.x - originXMm) * pxPerMmX;
  const boxY = (element.transform.y - originYMm) * pxPerMmY;
  const boxW = Math.max(1, element.transform.width * pxPerMmX);
  const boxH = Math.max(1, element.transform.height * pxPerMmY);

  let drawX = boxX;
  let drawY = boxY;
  let drawW = boxW;
  let drawH = boxH;

  // Preserve natural aspect ratio cleanly inside target box unless explicitly stretched via fill
  if (element.fit !== 'fill' && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = boxW / boxH;
    if (imgRatio > boxRatio) {
      drawH = boxW / imgRatio;
      drawY = boxY + (boxH - drawH) * 0.5;
    } else if (imgRatio < boxRatio) {
      drawW = boxH * imgRatio;
      drawX = boxX + (boxW - drawW) * 0.5;
    }
  }

  ctx.save();
  ctx.globalAlpha = element.opacity;

  if (element.transform.rotation !== 0) {
    const centerX = boxX + boxW * 0.5;
    const centerY = boxY + boxH * 0.5;
    ctx.translate(centerX, centerY);
    ctx.rotate((element.transform.rotation * Math.PI) / 180);
    ctx.drawImage(img, drawX - centerX, drawY - centerY, drawW, drawH);
  } else {
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  ctx.restore();
}

function drawShapeElementOnFaceCanvas(
  ctx: CanvasRenderingContext2D,
  element: ShapeElement,
  originXMm: number,
  originYMm: number,
  pxPerMmX: number,
  pxPerMmY: number,
): void {
  const geom = resolveShapeGeometry(element);
  const centerX = (geom.centerX - originXMm) * pxPerMmX;
  const centerY = (geom.centerY - originYMm) * pxPerMmY;
  const avgPxPerMm = (pxPerMmX + pxPerMmY) * 0.5;

  ctx.save();
  ctx.globalAlpha = element.opacity;

  if (element.transform.rotation !== 0) {
    ctx.translate(centerX, centerY);
    ctx.rotate((element.transform.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  ctx.beginPath();
  if (geom.kind === 'ellipse') {
    const rx = Math.max(0.5, geom.rx * pxPerMmX);
    const ry = Math.max(0.5, geom.ry * pxPerMmY);
    ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
  } else if (geom.kind === 'polygon') {
    geom.points.forEach((pt, index) => {
      const px = (pt.x - originXMm) * pxPerMmX;
      const py = (pt.y - originYMm) * pxPerMmY;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.closePath();
  } else {
    const rectX = (geom.x - originXMm) * pxPerMmX;
    const rectY = (geom.y - originYMm) * pxPerMmY;
    const rectW = Math.max(0.5, geom.width * pxPerMmX);
    const rectH = Math.max(0.5, geom.height * pxPerMmY);
    ctx.rect(rectX, rectY, rectW, rectH);
  }

  if (element.fill && element.fill !== 'none') {
    ctx.fillStyle = element.fill;
    ctx.fill();
  }

  if (element.stroke && element.stroke !== 'none' && element.strokeWidth > 0) {
    ctx.strokeStyle = element.stroke;
    ctx.lineWidth = Math.max(0.5, element.strokeWidth * avgPxPerMm);
    ctx.stroke();
  }

  ctx.restore();
}

function paintFaceArtwork(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bounds: SvgPathBoundsMm,
  pxPerMmX: number,
  pxPerMmY: number,
  matchingElements: readonly BakeableArtworkElement[],
  onImagePending: (image: HTMLImageElement, src: string) => void,
): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  for (const element of matchingElements) {
    if (element.type === 'shape') {
      drawShapeElementOnFaceCanvas(ctx, element, bounds.minX, bounds.minY, pxPerMmX, pxPerMmY);
    } else if (element.type === 'text') {
      drawTextElementOnFaceCanvas(ctx, element, bounds.minX, bounds.minY, pxPerMmX, pxPerMmY);
    } else if (element.type === 'image') {
      drawImageElementOnFaceCanvas(
        ctx,
        element,
        bounds.minX,
        bounds.minY,
        pxPerMmX,
        pxPerMmY,
        onImagePending,
      );
    }
  }
}

/**
 * Bakes a single Face's paper background and assigned 2D artwork (text & images) into an
 * offscreen HTMLCanvas wrapped in a lightweight THREE.CanvasTexture (max edge <= 1024px).
 */
export function bakeFaceTexture(
  face: Face,
  elements: readonly DesignElement[],
  scale = DEFAULT_BAKE_SCALE,
  onAsyncImageReady?: () => void,
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const matchingElements = getFaceElementsForFace(face.id, elements);
    const pendingImages = new Set<string>();

    const handlePendingImage = (image: HTMLImageElement, src: string) => {
      if (pendingImages.has(src)) {
        return;
      }
      pendingImages.add(src);
      image.addEventListener(
        'load',
        () => {
          registerBakedImage(src, image);
          // Re-render all elements on the face so zIndex stacking remains exact
          paintFaceArtwork(
            ctx,
            width,
            height,
            bounds,
            pxPerMmX,
            pxPerMmY,
            matchingElements,
            () => undefined,
          );
          texture.needsUpdate = true;
          onAsyncImageReady?.();
        },
        { once: true },
      );
    };

    paintFaceArtwork(
      ctx,
      width,
      height,
      bounds,
      pxPerMmX,
      pxPerMmY,
      matchingElements,
      handlePendingImage,
    );
  }

  texture.needsUpdate = true;
  return texture;
}
