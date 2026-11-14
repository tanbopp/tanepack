// Unit tests for 2D element selection frames, atan2 rotation math, and uniform corner resize
import { describe, expect, it } from 'vitest';
import type { ImageElement, TextElement } from '@entities/design-document';
import type { SvgPathBoundsMm } from '@entities/dieline';
import { PX_PER_MM } from '@shared/lib/units';
import {
  clientPointToSvgMm,
  computeCornerResizePatch,
  computeRotationDegreesFromPointer,
  computeTextFontSizePatch,
  createResizeSnapshot,
  getElementSelectionFrame,
  MAX_TEXT_FONT_SIZE_MM,
  MIN_IMAGE_SIZE_MM,
  MIN_TEXT_FONT_SIZE_MM,
} from './transform';

const SAMPLE_FACE_BOUNDS: SvgPathBoundsMm = {
  minX: 50,
  minY: 50,
  maxX: 150,
  maxY: 150,
  width: 100,
  height: 100,
  center: { x: 100, y: 100 },
};

function createSampleText(overrides?: Partial<TextElement>): TextElement {
  return {
    id: 'txt-1',
    type: 'text',
    faceId: 'front',
    side: 'outside',
    content: 'Tanepack',
    transform: { x: 100, y: 100, width: 80, height: 20, rotation: 0 },
    opacity: 1,
    zIndex: 1,
    style: {
      fontFamily: 'Google Sans, sans-serif',
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'center',
      color: '#1b1b1f',
    },
    ...overrides,
  };
}

function createSampleImage(overrides?: Partial<ImageElement>): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    faceId: 'front',
    side: 'outside',
    src: 'data:image/png;base64,iVBORw0KGgo=',
    naturalWidth: 200,
    naturalHeight: 100,
    fit: 'contain',
    transform: { x: 80, y: 90, width: 40, height: 20, rotation: 0 },
    opacity: 1,
    zIndex: 2,
    ...overrides,
  };
}

describe('editor-stage transform math', () => {
  it('converts client coordinates to SVG mm accounting for stage offset, pan, and zoom', () => {
    const point = clientPointToSvgMm(
      172 + 20 * PX_PER_MM * 2,
      114 + 15 * PX_PER_MM * 2,
      { left: 72, top: 64 },
      { zoom: 2, pan: { x: 100, y: 50 } },
    );

    expect(point.x).toBeCloseTo(20, 5);
    expect(point.y).toBeCloseTo(15, 5);
  });

  it('computes clockwise degrees in [0, 360) from element center via Math.atan2', () => {
    const center = { x: 100, y: 100 };

    expect(computeRotationDegreesFromPointer(center, { x: 100, y: 80 })).toBe(0);
    expect(computeRotationDegreesFromPointer(center, { x: 120, y: 80 })).toBe(45);
    expect(computeRotationDegreesFromPointer(center, { x: 120, y: 100 })).toBe(90);
    expect(computeRotationDegreesFromPointer(center, { x: 100, y: 120 })).toBe(180);
    expect(computeRotationDegreesFromPointer(center, { x: 80, y: 100 })).toBe(270);
  });

  it('scales text fontSize proportionally when dragging a corner handle and clamps within 4–72 mm', () => {
    const text = createSampleText();
    const frame = getElementSelectionFrame(text);
    const snapshot = createResizeSnapshot(text);

    // Drag SE corner to double the diagonal from center -> 2x fontSize (16 -> 32 mm)
    const doubleSePoint = {
      x: frame.center.x + (frame.corners.se.x - frame.center.x) * 2,
      y: frame.center.y + (frame.corners.se.y - frame.center.y) * 2,
    };
    const grown = computeCornerResizePatch(text, 'se', doubleSePoint, snapshot, SAMPLE_FACE_BOUNDS);
    expect(grown.style?.fontSize).toBeCloseTo(32, 1);
    expect(grown.transform.width).toBeCloseTo(160, 1);

    // Extreme shrink clamps cleanly at MIN_TEXT_FONT_SIZE_MM (4 mm)
    const tiny = computeCornerResizePatch(text, 'se', frame.center, snapshot, SAMPLE_FACE_BOUNDS);
    expect(tiny.style?.fontSize).toBe(MIN_TEXT_FONT_SIZE_MM);

    // Extreme growth clamps cleanly at MAX_TEXT_FONT_SIZE_MM (72 mm)
    const huge = computeTextFontSizePatch(text, 120);
    expect(huge.style?.fontSize).toBe(MAX_TEXT_FONT_SIZE_MM);
  });

  it('performs uniform resize on rotated image elements while preserving aspect ratio and face bounds', () => {
    const img = createSampleImage({
      transform: { x: 80, y: 90, width: 40, height: 20, rotation: 90 },
    });
    const frame = getElementSelectionFrame(img);
    const snapshot = createResizeSnapshot(img);

    // At 90deg clockwise rotation, local SE diagonal aligns along (-dx, +dy) in stage coords
    const rad = (90 * Math.PI) / 180;
    const localDx = (frame.corners.se.x - frame.center.x) * 1.5;
    const localDy = (frame.corners.se.y - frame.center.y) * 1.5;
    const rotatedPointer = {
      x: frame.center.x + localDx * Math.cos(rad) - localDy * Math.sin(rad),
      y: frame.center.y + localDx * Math.sin(rad) + localDy * Math.cos(rad),
    };

    const scaled = computeCornerResizePatch(
      img,
      'se',
      rotatedPointer,
      snapshot,
      SAMPLE_FACE_BOUNDS,
    );
    expect(scaled.transform.width).toBeCloseTo(60, 1);
    expect(scaled.transform.height).toBeCloseTo(30, 1);

    const minScaled = computeCornerResizePatch(
      img,
      'nw',
      frame.center,
      snapshot,
      SAMPLE_FACE_BOUNDS,
    );
    expect(minScaled.transform.height).toBe(MIN_IMAGE_SIZE_MM);
    expect(minScaled.transform.width).toBe(10);
  });
});
