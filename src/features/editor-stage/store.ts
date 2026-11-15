// Zustand store holding 2D design elements, selection, dieline model, and 3D fold state
import { create } from 'zustand';
import type { DesignElement, ImageElement, TextElement } from '@entities/design-document';
import {
  computeSvgPathBoundsMm,
  type Dieline,
  generateTuckEndBox,
  roundMm,
  type SvgPathBoundsMm,
} from '@entities/dieline';
import { createEntityId } from '@shared/lib/id';
import { clampElementPositionToFace } from './viewport';

export const DEFAULT_DIELINE_DIMENSIONS: Dieline['dimensions'] = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

export const DEFAULT_TEXT_CONTENT = 'Tanepack';
export const DEFAULT_IMAGE_SIZE_MM = 30;
export const MIN_BOX_DIMENSION_MM = 10;
export const MAX_BOX_DIMENSION_MM = 2000;

/** Clamps a user-entered millimeter box dimension safely into [10, 2000]. */
export function clampBoxDimensionMm(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return roundMm(Math.min(MAX_BOX_DIMENSION_MM, Math.max(MIN_BOX_DIMENSION_MM, value)));
}

export interface AddTextElementOptions {
  faceId?: string | undefined;
  content?: string | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

export interface AddImageElementOptions {
  src: string;
  faceId?: string | undefined;
  naturalWidth?: number | undefined;
  naturalHeight?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

export interface ElementPatch {
  content?: string | undefined;
  opacity?: number | undefined;
  transform?: Partial<DesignElement['transform']> | undefined;
  style?: Partial<TextElement['style']> | undefined;
}

export type TextElementPatch = ElementPatch;

export interface EditorStageStoreState {
  dieline: Dieline;
  dimensions: Dieline['dimensions'];
  elements: DesignElement[];
  committedElements: DesignElement[];
  selectedElementId: string | null;
  foldAngle: number;
  addElement: (options?: AddTextElementOptions) => TextElement;
  addImageElement: (options: AddImageElementOptions) => ImageElement;
  updateElement: (id: string, patch: ElementPatch, commit?: boolean) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  commitElements: () => void;
  setFoldAngle: (angle: number) => void;
  setDimensions: (length: number, width: number, height: number) => void;
  reset: () => void;
}

function createInitialDieline(): Dieline {
  return generateTuckEndBox(DEFAULT_DIELINE_DIMENSIONS);
}

function resolveFaceBounds(dieline: Dieline, targetFaceId: string) {
  const face = dieline.faces.find((candidate) => candidate.id === targetFaceId) ?? dieline.faces[0];
  const resolvedFaceId = face?.id ?? targetFaceId;
  const bounds = face
    ? computeSvgPathBoundsMm(face.path)
    : {
        minX: 0,
        minY: 0,
        maxX: dieline.totalWidth,
        maxY: dieline.totalHeight,
        width: 80,
        height: 20,
        center: { x: dieline.totalWidth * 0.5, y: dieline.totalHeight * 0.5 },
      };
  return { resolvedFaceId, bounds };
}

function patchElement(element: DesignElement, patch: ElementPatch): DesignElement {
  const nextTransform = patch.transform
    ? { ...element.transform, ...patch.transform }
    : element.transform;
  const nextOpacity = patch.opacity ?? element.opacity;

  if (element.type === 'text') {
    return {
      ...element,
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      opacity: nextOpacity,
      transform: nextTransform,
      style: patch.style ? { ...element.style, ...patch.style } : element.style,
    };
  }

  return {
    ...element,
    opacity: nextOpacity,
    transform: nextTransform,
  };
}

export const useEditorStore = create<EditorStageStoreState>((set) => ({
  dieline: createInitialDieline(),
  dimensions: { ...DEFAULT_DIELINE_DIMENSIONS },
  elements: [],
  committedElements: [],
  selectedElementId: null,
  foldAngle: 0,

  addElement: (options) => {
    let created: TextElement | null = null;

    set((state) => {
      const { resolvedFaceId, bounds } = resolveFaceBounds(
        state.dieline,
        options?.faceId ?? 'front',
      );
      const existingCount = state.elements.filter((el) => el.faceId === resolvedFaceId).length;
      const staggerOffsets = [0, -18, 18, -32, 32];
      const offsetIndex = existingCount % staggerOffsets.length;
      const yOffset = staggerOffsets[offsetIndex] ?? 0;

      const textElement: TextElement = {
        id: createEntityId(10),
        type: 'text',
        faceId: resolvedFaceId,
        side: 'outside',
        content: options?.content ?? DEFAULT_TEXT_CONTENT,
        transform: {
          x: options?.x ?? bounds.center.x,
          y: options?.y ?? bounds.center.y + yOffset,
          width: Math.min(84, bounds.width * 0.85),
          height: 18,
          rotation: 0,
        },
        opacity: 1,
        zIndex: state.elements.length + 1,
        style: {
          fontFamily: 'Google Sans, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: 0,
          textAlign: 'center',
          color: '#1b1b1f',
        },
      };

      created = textElement;
      const nextElements = [...state.elements, textElement];
      return {
        elements: nextElements,
        committedElements: nextElements,
        selectedElementId: textElement.id,
      };
    });

    if (!created) {
      throw new Error('Failed to create text element.');
    }
    return created;
  },

  addImageElement: (options) => {
    let created: ImageElement | null = null;

    set((state) => {
      const { resolvedFaceId, bounds } = resolveFaceBounds(
        state.dieline,
        options.faceId ?? 'front',
      );
      const naturalWidth =
        options.naturalWidth && options.naturalWidth > 0 ? options.naturalWidth : 1;
      const naturalHeight =
        options.naturalHeight && options.naturalHeight > 0 ? options.naturalHeight : 1;
      const fitScale = DEFAULT_IMAGE_SIZE_MM / Math.max(naturalWidth, naturalHeight);
      const width = options.width ?? roundMm(naturalWidth * fitScale);
      const height = options.height ?? roundMm(naturalHeight * fitScale);

      const imageElement: ImageElement = {
        id: createEntityId(10),
        type: 'image',
        faceId: resolvedFaceId,
        side: 'outside',
        src: options.src,
        naturalWidth: options.naturalWidth ?? DEFAULT_IMAGE_SIZE_MM,
        naturalHeight: options.naturalHeight ?? DEFAULT_IMAGE_SIZE_MM,
        fit: 'contain',
        transform: {
          x: options.x ?? roundMm(bounds.center.x - width * 0.5),
          y: options.y ?? roundMm(bounds.center.y - height * 0.5),
          width,
          height,
          rotation: 0,
        },
        opacity: 1,
        zIndex: state.elements.length + 1,
      };

      created = imageElement;
      const nextElements = [...state.elements, imageElement];
      return {
        elements: nextElements,
        committedElements: nextElements,
        selectedElementId: imageElement.id,
      };
    });

    if (!created) {
      throw new Error('Failed to create image element.');
    }
    return created;
  },

  updateElement: (id, patch, commit = false) =>
    set((state) => {
      const nextElements = state.elements.map((el) =>
        el.id === id ? patchElement(el, patch) : el,
      );
      return {
        elements: nextElements,
        ...(commit ? { committedElements: nextElements } : {}),
      };
    }),

  removeElement: (id) =>
    set((state) => {
      const nextElements = state.elements.filter((el) => el.id !== id);
      return {
        elements: nextElements,
        committedElements: nextElements,
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      };
    }),

  selectElement: (id) => set({ selectedElementId: id }),

  commitElements: () =>
    set((state) =>
      state.committedElements === state.elements ? state : { committedElements: state.elements },
    ),

  setFoldAngle: (angle) =>
    set({
      foldAngle: Math.min(90, Math.max(0, Number.isFinite(angle) ? angle : 0)),
    }),

  setDimensions: (length, width, height) =>
    set((state) => {
      const current = state.dimensions;
      const nextLength = clampBoxDimensionMm(length, current.length);
      const nextWidth = clampBoxDimensionMm(width, current.width);
      const nextHeight = clampBoxDimensionMm(height, current.height);

      if (
        nextLength === current.length &&
        nextWidth === current.width &&
        nextHeight === current.height
      ) {
        return state;
      }

      const nextDimensions: Dieline['dimensions'] = {
        length: nextLength,
        width: nextWidth,
        height: nextHeight,
        thickness: current.thickness,
        bleedSize: current.bleedSize,
      };
      const nextDieline = generateTuckEndBox(nextDimensions);

      const boundsByFaceId = new Map<string, SvgPathBoundsMm>();
      for (const face of nextDieline.faces) {
        boundsByFaceId.set(face.id, computeSvgPathBoundsMm(face.path));
      }

      const clampListToDieline = (items: DesignElement[]): DesignElement[] => {
        let changed = false;
        const clamped = items.map((element) => {
          const faceBounds = boundsByFaceId.get(element.faceId);
          if (!faceBounds) {
            return element;
          }
          const nextPos = clampElementPositionToFace(
            element,
            element.transform.x,
            element.transform.y,
            faceBounds,
          );
          if (nextPos.x === element.transform.x && nextPos.y === element.transform.y) {
            return element;
          }
          changed = true;
          return {
            ...element,
            transform: {
              ...element.transform,
              x: nextPos.x,
              y: nextPos.y,
            },
          };
        });
        return changed ? clamped : items;
      };

      const nextElements = clampListToDieline(state.elements);
      const nextCommittedElements =
        state.committedElements === state.elements
          ? nextElements
          : clampListToDieline(state.committedElements);

      return {
        dieline: nextDieline,
        dimensions: nextDieline.dimensions,
        elements: nextElements,
        committedElements: nextCommittedElements,
      };
    }),

  reset: () =>
    set({
      dieline: createInitialDieline(),
      dimensions: { ...DEFAULT_DIELINE_DIMENSIONS },
      elements: [],
      committedElements: [],
      selectedElementId: null,
      foldAngle: 0,
    }),
}));
