// Shared SVG and canvas geometry normalization for ShapeElement primitives
import type { ShapeElement } from './types';

export interface RectShapeGeometry {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface EllipseShapeGeometry {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  centerX: number;
  centerY: number;
}

export interface PolygonPointMm {
  x: number;
  y: number;
}

export interface PolygonShapeGeometry {
  kind: 'polygon';
  points: PolygonPointMm[];
  pointsAttr: string;
  centerX: number;
  centerY: number;
}

export type ShapeGeometry = RectShapeGeometry | EllipseShapeGeometry | PolygonShapeGeometry;

/**
 * Converts a ShapeElement into normalized 2D coordinates shared by the SVG stage,
 * Dashboard thumbnails, and 3D CanvasTexture baker.
 */
export function resolveShapeGeometry(element: ShapeElement): ShapeGeometry {
  const { x, y, width, height } = element.transform;
  const safeWidth = Math.max(0.5, width);
  const safeHeight = Math.max(0.5, height);
  const centerX = x + safeWidth * 0.5;
  const centerY = y + safeHeight * 0.5;

  if (element.shape === 'circle') {
    return {
      kind: 'ellipse',
      cx: centerX,
      cy: centerY,
      rx: safeWidth * 0.5,
      ry: safeHeight * 0.5,
      centerX,
      centerY,
    };
  }

  if (element.shape === 'polygon' && element.points && element.points.length >= 6) {
    const pairs: PolygonPointMm[] = [];
    for (let i = 0; i + 1 < element.points.length; i += 2) {
      pairs.push({
        x: element.points[i] ?? x,
        y: element.points[i + 1] ?? y,
      });
    }
    return {
      kind: 'polygon',
      points: pairs,
      pointsAttr: pairs.map((pt) => `${pt.x},${pt.y}`).join(' '),
      centerX,
      centerY,
    };
  }

  return {
    kind: 'rect',
    x,
    y,
    width: safeWidth,
    height: safeHeight,
    centerX,
    centerY,
  };
}
