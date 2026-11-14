// Unit tests for per-face 2D canvas texture baking, sizing clamp, text, and raster images
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesignElement, ImageElement, TextElement } from '@entities/design-document';
import { computeSvgPathBoundsMm, generateTuckEndBox } from '@entities/dieline';
import {
  bakeFaceTexture,
  buildFaceBakeSignature,
  computeBakedTextureSize,
  getFaceElementsForFace,
  MAX_TEXTURE_SIZE,
  registerBakedImage,
} from './bakeTexture';

function makeSampleText(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'txt-1',
    type: 'text',
    faceId: 'front',
    side: 'outside',
    content: 'Tanepack',
    transform: {
      x: 118,
      y: 115.75,
      width: 80,
      height: 18,
      rotation: 0,
    },
    opacity: 1,
    zIndex: 1,
    style: {
      fontFamily: 'Google Sans, sans-serif',
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'center',
      color: '#1b1b1f',
    },
    ...overrides,
  };
}

function makeSampleImage(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    faceId: 'front',
    side: 'outside',
    src: 'data:image/png;base64,iVBORw0KGgo=',
    naturalWidth: 200,
    naturalHeight: 100,
    fit: 'contain',
    transform: {
      x: 100.75,
      y: 108.25,
      width: 30,
      height: 15,
      rotation: 0,
    },
    opacity: 1,
    zIndex: 2,
    ...overrides,
  };
}

describe('bakeTexture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clamps baked canvas dimensions to at most 1024px while preserving aspect ratio', () => {
    const standard = computeBakedTextureSize(100.5, 100.5, 2);
    expect(standard.width).toBe(760);
    expect(standard.height).toBe(760);

    const oversized = computeBakedTextureSize(300, 150, 2);
    expect(oversized.width).toBe(MAX_TEXTURE_SIZE);
    expect(oversized.height).toBe(512);
    expect(oversized.width).toBeLessThanOrEqual(MAX_TEXTURE_SIZE);
    expect(oversized.height).toBeLessThanOrEqual(MAX_TEXTURE_SIZE);
  });

  it('filters outside-facing text and image elements by faceId and orders by zIndex', () => {
    const dieline = generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const front = dieline.faces.find((f) => f.id === 'front')!;
    const elements: DesignElement[] = [
      makeSampleText({ id: 'a', faceId: 'back', content: 'Back' }),
      makeSampleText({ id: 'b', faceId: 'front', zIndex: 5, content: 'Second' }),
      makeSampleText({ id: 'c', faceId: 'front', side: 'inside', zIndex: 1, content: 'Inside' }),
      makeSampleImage({ id: 'img', faceId: 'front', zIndex: 3 }),
      makeSampleText({ id: 'd', faceId: 'front', zIndex: 2, content: 'First' }),
    ];

    const filtered = getFaceElementsForFace(front.id, elements);
    expect(filtered.map((e) => e.id)).toEqual(['d', 'img', 'b']);
  });

  it('paints white background, text, and pre-registered raster images using local pixel coordinates', () => {
    const dieline = generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const front = dieline.faces.find((f) => f.id === 'front')!;
    const bounds = computeSvgPathBoundsMm(front.path);

    const fillRect = vi.fn();
    const fillText = vi.fn();
    const drawImage = vi.fn();
    const save = vi.fn();
    const restore = vi.fn();
    const mockCtx = {
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      fillRect,
      fillText,
      drawImage,
      save,
      restore,
      translate: vi.fn(),
      rotate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);

    const imgSrc = 'data:image/png;base64,TESTLOGO200X100';
    const fakeImg = {
      complete: true,
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement;
    registerBakedImage(imgSrc, fakeImg);

    const centeredText = makeSampleText({
      faceId: 'front',
      zIndex: 1,
      content: 'Tanepack',
      transform: {
        x: bounds.center.x,
        y: bounds.center.y,
        width: 80,
        height: 18,
        rotation: 0,
      },
    });
    const logoImg = makeSampleImage({
      faceId: 'front',
      src: imgSrc,
      zIndex: 2,
      naturalWidth: 200,
      naturalHeight: 100,
      transform: {
        x: bounds.minX + 10,
        y: bounds.minY + 20,
        width: 30,
        height: 30,
        rotation: 0,
      },
    });
    const otherFaceText = makeSampleText({
      id: 'other',
      faceId: 'right',
      content: 'ShouldNotDrawOnFront',
    });

    const texture = bakeFaceTexture(front, [centeredText, logoImg, otherFaceText], 2);
    const canvas = texture.image as HTMLCanvasElement;

    expect(canvas.width).toBe(760);
    expect(canvas.height).toBe(760);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.generateMipmaps).toBe(false);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    expect(texture.magFilter).toBe(THREE.LinearFilter);

    expect(fillRect).toHaveBeenCalledWith(0, 0, 760, 760);
    expect(fillText).toHaveBeenCalledTimes(1);
    const [drawnText, drawnX, drawnY] = fillText.mock.calls[0]!;
    expect(drawnText).toBe('Tanepack');
    expect(drawnX).toBeCloseTo(380, 1);
    expect(drawnY).toBeCloseTo(380, 1);

    // 200x100 natural aspect inside a 30x30mm box scales via contain to 30x15mm centered vertically
    expect(drawImage).toHaveBeenCalledTimes(1);
    const [imgEl, dx, dy, dw, dh] = drawImage.mock.calls[0]!;
    expect(imgEl).toBe(fakeImg);
    const pxPerMm = 760 / bounds.width;
    expect(dx).toBeCloseTo(10 * pxPerMm, 1);
    expect(dy).toBeCloseTo((20 + 7.5) * pxPerMm, 1);
    expect(dw).toBeCloseTo(30 * pxPerMm, 1);
    expect(dh).toBeCloseTo(15 * pxPerMm, 1);

    texture.dispose();
  });

  it('handles environments without a 2D canvas context gracefully without throwing', () => {
    const dieline = generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const front = dieline.faces.find((f) => f.id === 'front')!;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const texture = bakeFaceTexture(front, [makeSampleText()], 2);
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    texture.dispose();
  });

  it('changes bake signature only when that face or its elements change', () => {
    const dieline = generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const front = dieline.faces.find((f) => f.id === 'front')!;
    const right = dieline.faces.find((f) => f.id === 'right')!;

    const baseElements: DesignElement[] = [makeSampleText({ faceId: 'front', content: 'A' })];
    const updatedFront: DesignElement[] = [makeSampleText({ faceId: 'front', content: 'B' })];

    expect(buildFaceBakeSignature(front, baseElements)).not.toBe(
      buildFaceBakeSignature(front, updatedFront),
    );
    expect(buildFaceBakeSignature(right, baseElements)).toBe(
      buildFaceBakeSignature(right, updatedFront),
    );
  });
});
