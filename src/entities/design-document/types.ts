// Packaging design document, layer, and element domain types
import type { Dieline } from '@entities/dieline';

export interface DesignElementBase {
  id: string;
  type: 'text' | 'image' | 'shape';
  faceId: string;
  side: 'outside' | 'inside';
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  opacity: number;
  zIndex: number;
}

export interface TextElement extends DesignElementBase {
  type: 'text';
  content: string;
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    textAlign: 'left' | 'center' | 'right';
    color: string;
  };
}

export interface ImageElement extends DesignElementBase {
  type: 'image';
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  fit: 'fill' | 'contain' | 'cover';
}

export interface ShapeElement extends DesignElementBase {
  type: 'shape';
  shape: 'rect' | 'circle' | 'polygon';
  fill: string;
  stroke: string;
  strokeWidth: number;
  points?: number[];
}

export type DesignElement = TextElement | ImageElement | ShapeElement;

export interface Project {
  id: string;
  version: 1;
  name: string;
  createdAt: string;
  updatedAt: string;
  dieline: Dieline;
  layers: {
    outside: DesignElement[];
    inside: DesignElement[];
  };
  metadata: {
    seedColor?: string;
    thumbnail?: string;
  };
}
