// Unit tests for per-face 2D canvas texture baking, sizing clamp, and local coordinate mapping
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesignElement, TextElement } from '@entities/design-document';
import { computeSvgPathBoundsMm, generateTuckEndBox } from '@entities/dieline';
import {
  bakeFaceTexture,
  buildFaceBakeSignature,
  computeBakedTextureSize,
  getFaceElementsForFace,
  MAX_TEXTURE_SIZE,
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

  it('filters outside-facing text elements by faceId and orders by zIndex', () => {
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
      makeSampleText({ id: 'd', faceId: 'front', zIndex: 2, content: 'First' }),
    ];

    const filtered = getFaceElementsForFace(front.id, elements);
    expect(filtered.map((e) => e.id)).toEqual(['d', 'b']);
  });

  it('paints white background and draws matching text in face-local pixel coordinates', () => {
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
      save,
      restore,
      translate: vi.fn(),
      rotate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);

    const centeredText = makeSampleText({
      faceId: 'front',
      content: 'Tanepack',
      transform: {
        x: bounds.center.x,
        y: bounds.center.y,
        width: 80,
        height: 18,
        rotation: 0,
      },
    });
    const otherFaceText = makeSampleText({
      id: 'other',
      faceId: 'right',
      content: 'ShouldNotDrawOnFront',
    });

    const texture = bakeFaceTexture(front, [centeredText, otherFaceText], 2);
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
