// Predefined local packaging carton templates with parametric dimensions and vector artwork layouts
import type { DesignElement, ShapeElement, TextElement } from '@entities/design-document';
import {
  computeSvgPathBoundsMm,
  type DielineArchetype,
  generateTuckEndBox,
  roundMm,
  type SvgPathBoundsMm,
} from '@entities/dieline';

export interface TemplateDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  archetype?: DielineArchetype | undefined;
  dimensions: TemplateDimensions;
  elements: DesignElement[];
  thumbnailColor: string;
}

function resolveTemplateFaceBounds(
  dimensions: TemplateDimensions,
): ReadonlyMap<string, SvgPathBoundsMm> {
  const dieline = generateTuckEndBox({
    length: dimensions.length,
    width: dimensions.width,
    height: dimensions.height,
    thickness: 0.5,
    bleedSize: 3,
  });
  const map = new Map<string, SvgPathBoundsMm>();
  for (const face of dieline.faces) {
    map.set(face.id, computeSvgPathBoundsMm(face.path));
  }
  return map;
}

function getBoundsOrThrow(
  boundsMap: ReadonlyMap<string, SvgPathBoundsMm>,
  faceId: string,
): SvgPathBoundsMm {
  const bounds = boundsMap.get(faceId);
  if (!bounds) {
    throw new Error(`Missing face bounds for template face "${faceId}".`);
  }
  return bounds;
}

function createTextPreset(params: {
  id: string;
  faceId: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight?: 400 | 700;
  color: string;
  content: string;
  zIndex: number;
}): TextElement {
  return {
    id: params.id,
    type: 'text',
    faceId: params.faceId,
    side: 'outside',
    content: params.content,
    transform: {
      x: roundMm(params.x),
      y: roundMm(params.y),
      width: roundMm(params.width),
      height: roundMm(params.fontSize * 1.45),
      rotation: 0,
    },
    opacity: 1,
    zIndex: params.zIndex,
    style: {
      fontFamily: 'Google Sans, sans-serif',
      fontSize: params.fontSize,
      fontWeight: params.fontWeight ?? 700,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'center',
      color: params.color,
    },
  };
}

function createShapePreset(params: {
  id: string;
  faceId: string;
  shape: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  zIndex: number;
}): ShapeElement {
  return {
    id: params.id,
    type: 'shape',
    faceId: params.faceId,
    side: 'outside',
    shape: params.shape,
    fill: params.fill,
    stroke: params.stroke ?? 'none',
    strokeWidth: params.strokeWidth ?? 0,
    transform: {
      x: roundMm(params.x),
      y: roundMm(params.y),
      width: roundMm(params.width),
      height: roundMm(params.height),
      rotation: 0,
    },
    opacity: 1,
    zIndex: params.zIndex,
  };
}

function buildCoffeeBoxElements(): DesignElement[] {
  const dims: TemplateDimensions = { length: 100, width: 50, height: 100 };
  const front = getBoundsOrThrow(resolveTemplateFaceBounds(dims), 'front');
  const emblemDiameter = 34;

  return [
    createShapePreset({
      id: 'tpl-coffee-circle',
      faceId: 'front',
      shape: 'circle',
      x: front.center.x - emblemDiameter * 0.5,
      y: front.center.y - 31,
      width: emblemDiameter,
      height: emblemDiameter,
      fill: '#6d4c41',
      stroke: '#3e2723',
      strokeWidth: 0.8,
      zIndex: 1,
    }),
    createTextPreset({
      id: 'tpl-coffee-title',
      faceId: 'front',
      x: front.center.x,
      y: front.center.y + 15,
      width: front.width * 0.88,
      fontSize: 10,
      fontWeight: 700,
      color: '#3e2723',
      content: 'Tanepack Coffee',
      zIndex: 2,
    }),
    createTextPreset({
      id: 'tpl-coffee-subtitle',
      faceId: 'front',
      x: front.center.x,
      y: front.center.y + 27,
      width: front.width * 0.72,
      fontSize: 4.8,
      fontWeight: 400,
      color: '#6d4c41',
      content: 'SINGLE ORIGIN ROAST',
      zIndex: 3,
    }),
  ];
}

function buildMatchaBoxElements(): DesignElement[] {
  const dims: TemplateDimensions = { length: 80, width: 80, height: 80 };
  const boundsMap = resolveTemplateFaceBounds(dims);
  const front = getBoundsOrThrow(boundsMap, 'front');
  const wallFaces = ['left', 'front', 'right', 'back'] as const;

  const panelBackgrounds = wallFaces.map((faceId, index) => {
    const bounds = getBoundsOrThrow(boundsMap, faceId);
    return createShapePreset({
      id: `tpl-matcha-bg-${faceId}`,
      faceId,
      shape: 'rect',
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
      fill: '#2e6b3e',
      zIndex: index + 1,
    });
  });

  return [
    ...panelBackgrounds,
    createTextPreset({
      id: 'tpl-matcha-title',
      faceId: 'front',
      x: front.center.x,
      y: front.center.y - 4,
      width: front.width * 0.82,
      fontSize: 14,
      fontWeight: 700,
      color: '#f4f9f1',
      content: 'Matcha',
      zIndex: 10,
    }),
    createTextPreset({
      id: 'tpl-matcha-subtitle',
      faceId: 'front',
      x: front.center.x,
      y: front.center.y + 11,
      width: front.width * 0.76,
      fontSize: 4.5,
      fontWeight: 400,
      color: '#c8e6c9',
      content: 'CEREMONIAL GRADE TEA',
      zIndex: 11,
    }),
  ];
}

function buildPastryBoxElements(): DesignElement[] {
  const dims: TemplateDimensions = { length: 150, width: 100, height: 50 };
  const front = getBoundsOrThrow(resolveTemplateFaceBounds(dims), 'front');

  return [
    createShapePreset({
      id: 'tpl-pastry-frame',
      faceId: 'front',
      shape: 'rect',
      x: front.minX + 6,
      y: front.minY + 5,
      width: front.width - 12,
      height: front.height - 10,
      fill: '#fff8ef',
      stroke: '#d4915d',
      strokeWidth: 0.7,
      zIndex: 1,
    }),
    createTextPreset({
      id: 'tpl-pastry-title',
      faceId: 'front',
      x: front.center.x,
      y: front.center.y - 7.5,
      width: front.width * 0.78,
      fontSize: 11,
      fontWeight: 700,
      color: '#5d4037',
      content: 'Artisan Pastry',
      zIndex: 2,
    }),
    createShapePreset({
      id: 'tpl-pastry-divider',
      faceId: 'front',
      shape: 'rect',
      x: front.center.x - 32,
      y: front.center.y + 1.5,
      width: 64,
      height: 0.9,
      fill: '#d4915d',
      zIndex: 3,
    }),
    createTextPreset({
      id: 'tpl-pastry-subtitle',
      faceId: 'front',
      x: front.center.x,
      y: front.center.y + 10.5,
      width: front.width * 0.72,
      fontSize: 5.2,
      fontWeight: 400,
      color: '#8d6e63',
      content: 'FRESHLY BAKED • PATISSERIE',
      zIndex: 4,
    }),
  ];
}

export const TEMPLATES: readonly Template[] = [
  {
    id: 'coffee-box',
    name: 'Coffee Box',
    description: 'Tall roast carton (100×50×100 mm) with circular crest and bold roast typography.',
    dimensions: { length: 100, width: 50, height: 100 },
    thumbnailColor: '#6d4c41',
    elements: buildCoffeeBoxElements(),
  },
  {
    id: 'matcha-box',
    name: 'Matcha Box',
    description: 'Compact tea cube (80×80×80 mm) with botanical green panels and clean tea title.',
    dimensions: { length: 80, width: 80, height: 80 },
    thumbnailColor: '#2e6b3e',
    elements: buildMatchaBoxElements(),
  },
  {
    id: 'pastry-box',
    name: 'Pastry Box',
    description:
      'Wide patisserie tray carton (150×100×50 mm) with framed header & subtitle layout.',
    dimensions: { length: 150, width: 100, height: 50 },
    thumbnailColor: '#d4915d',
    elements: buildPastryBoxElements(),
  },
];

/** Finds a predefined template by its canonical slug (case-insensitive). */
export function findTemplateById(templateId: string | null | undefined): Template | undefined {
  if (!templateId) {
    return undefined;
  }
  const normalized = templateId.trim().toLowerCase();
  return TEMPLATES.find((template) => template.id === normalized);
}
