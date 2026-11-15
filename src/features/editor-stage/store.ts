// Zustand store holding 2D design elements, selection, dieline model, and 3D fold state
import { create } from 'zustand';
import type {
  DesignElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from '@entities/design-document';
import {
  computeSvgPathBoundsMm,
  type Dieline,
  type DielineArchetype,
  generateDieline,
  roundMm,
} from '@entities/dieline';
import type { Template } from '@entities/template';
import { createEntityId } from '@shared/lib/id';

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
  side?: 'outside' | 'inside' | undefined;
  content?: string | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

export interface AddImageElementOptions {
  src: string;
  faceId?: string | undefined;
  side?: 'outside' | 'inside' | undefined;
  naturalWidth?: number | undefined;
  naturalHeight?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

export interface ElementPatch {
  faceId?: string | undefined;
  content?: string | undefined;
  fill?: string | undefined;
  stroke?: string | undefined;
  opacity?: number | undefined;
  zIndex?: number | undefined;
  transform?: Partial<DesignElement['transform']> | undefined;
  style?: Partial<TextElement['style']> | undefined;
}

export type TextElementPatch = ElementPatch;

export type BoxSide = 'outside' | 'inside';

export interface EditorStageStoreState {
  archetype: DielineArchetype;
  dieline: Dieline;
  dimensions: Dieline['dimensions'];
  activeSide: BoxSide;
  elements: DesignElement[];
  committedElements: DesignElement[];
  selectedElementId: string | null;
  foldAngle: number;
  setActiveSide: (side: BoxSide) => void;
  addElement: (options?: AddTextElementOptions) => TextElement;
  addImageElement: (options: AddImageElementOptions) => ImageElement;
  updateElement: (id: string, patch: ElementPatch, commit?: boolean) => void;
  removeElement: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  selectElement: (id: string | null) => void;
  commitElements: () => void;
  setFoldAngle: (angle: number) => void;
  setArchetype: (archetype: DielineArchetype) => void;
  setDimensions: (length: number, width: number, height: number) => void;
  applyTemplate: (template: Template) => void;
  reset: () => void;
}

function createInitialDieline(archetype: DielineArchetype = 'tuck-end'): Dieline {
  return generateDieline(archetype, DEFAULT_DIELINE_DIMENSIONS);
}

const ARCHETYPE_FACE_FALLBACKS: Readonly<Record<string, string>> = {
  'top-tuck': 'top-flap-back',
  'bottom-tuck': 'bottom-flap-front',
  'top-dust-left': 'top-flap-left',
  'top-dust-right': 'top-flap-right',
  'bottom-dust-left': 'bottom-flap-left',
  'bottom-dust-right': 'bottom-flap-right',
  'top-flap-back': 'top-tuck',
  'bottom-flap-front': 'bottom-tuck',
  'top-flap-front': 'top-tuck',
  'bottom-flap-back': 'bottom-tuck',
  'top-flap-left': 'top-dust-left',
  'top-flap-right': 'top-dust-right',
  'bottom-flap-left': 'bottom-dust-left',
  'bottom-flap-right': 'bottom-dust-right',
};

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

function cloneElementWithFreshId(element: DesignElement): DesignElement {
  const id = createEntityId(10);
  const transform = { ...element.transform };

  if (element.type === 'text') {
    return {
      ...element,
      id,
      transform,
      style: { ...element.style },
    };
  }

  if (element.type === 'shape') {
    const cloned: ShapeElement = {
      ...element,
      id,
      transform,
      ...(element.points ? { points: [...element.points] } : {}),
    };
    return cloned;
  }

  return {
    ...element,
    id,
    transform,
  };
}

function regenerateDielineForSize(
  archetype: DielineArchetype,
  current: Dieline['dimensions'],
  length: number,
  width: number,
  height: number,
): { dieline: Dieline; dimensions: Dieline['dimensions']; changed: boolean } {
  const nextLength = clampBoxDimensionMm(length, current.length);
  const nextWidth = clampBoxDimensionMm(width, current.width);
  const nextHeight = clampBoxDimensionMm(height, current.height);

  if (
    nextLength === current.length &&
    nextWidth === current.width &&
    nextHeight === current.height
  ) {
    return {
      dieline: generateDieline(archetype, current),
      dimensions: current,
      changed: false,
    };
  }

  const nextDimensions: Dieline['dimensions'] = {
    length: nextLength,
    width: nextWidth,
    height: nextHeight,
    thickness: current.thickness,
    bleedSize: current.bleedSize,
  };
  const nextDieline = generateDieline(archetype, nextDimensions);
  return {
    dieline: nextDieline,
    dimensions: nextDieline.dimensions,
    changed: true,
  };
}

function reconcileElementsForDieline(
  nextDieline: Dieline,
  items: DesignElement[],
): DesignElement[] {
  const validFaceIds = new Set(nextDieline.faces.map((face) => face.id));

  let changed = false;
  const reconciled = items.map((element) => {
    if (validFaceIds.has(element.faceId)) {
      return element;
    }

    const mapped = ARCHETYPE_FACE_FALLBACKS[element.faceId];
    const targetFaceId = mapped && validFaceIds.has(mapped) ? mapped : 'front';
    if (targetFaceId === element.faceId) {
      return element;
    }

    changed = true;
    return {
      ...element,
      faceId: targetFaceId,
    };
  });

  return changed ? reconciled : items;
}

type LayerReorderMode = 'front' | 'back' | 'forward' | 'backward';

function nextSideZIndex(items: readonly DesignElement[], side: BoxSide): number {
  let maxZ = 0;
  for (const el of items) {
    if (el.side === side && el.zIndex > maxZ) {
      maxZ = el.zIndex;
    }
  }
  return maxZ + 1;
}

function reorderElementLayer(
  items: DesignElement[],
  id: string,
  mode: LayerReorderMode,
): DesignElement[] {
  const target = items.find((el) => el.id === id);
  if (!target) {
    return items;
  }

  const sameSideSorted = items
    .filter((el) => el.side === target.side)
    .sort((a, b) => a.zIndex - b.zIndex);

  const currentIdx = sameSideSorted.findIndex((el) => el.id === id);
  if (currentIdx === -1) {
    return items;
  }

  let nextIdx = currentIdx;
  if (mode === 'front') {
    nextIdx = sameSideSorted.length - 1;
  } else if (mode === 'back') {
    nextIdx = 0;
  } else if (mode === 'forward') {
    nextIdx = Math.min(sameSideSorted.length - 1, currentIdx + 1);
  } else {
    nextIdx = Math.max(0, currentIdx - 1);
  }

  if (nextIdx === currentIdx) {
    return items;
  }

  const reordered = [...sameSideSorted];
  const [moved] = reordered.splice(currentIdx, 1);
  if (!moved) {
    return items;
  }
  reordered.splice(nextIdx, 0, moved);

  const nextZById = new Map<string, number>();
  reordered.forEach((el, index) => {
    nextZById.set(el.id, index + 1);
  });

  return items.map((el) => {
    const assignedZ = nextZById.get(el.id);
    return assignedZ !== undefined && assignedZ !== el.zIndex ? { ...el, zIndex: assignedZ } : el;
  });
}

function patchElement(element: DesignElement, patch: ElementPatch): DesignElement {
  const nextTransform = patch.transform
    ? { ...element.transform, ...patch.transform }
    : element.transform;
  const nextOpacity = patch.opacity ?? element.opacity;
  const basePatch = {
    ...(patch.faceId !== undefined ? { faceId: patch.faceId } : {}),
    ...(patch.zIndex !== undefined ? { zIndex: patch.zIndex } : {}),
  };

  if (element.type === 'text') {
    return {
      ...element,
      ...basePatch,
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      opacity: nextOpacity,
      transform: nextTransform,
      style: patch.style ? { ...element.style, ...patch.style } : element.style,
    };
  }

  if (element.type === 'shape') {
    return {
      ...element,
      ...basePatch,
      ...(patch.fill !== undefined ? { fill: patch.fill } : {}),
      ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
      opacity: nextOpacity,
      transform: nextTransform,
    };
  }

  return {
    ...element,
    ...basePatch,
    opacity: nextOpacity,
    transform: nextTransform,
  };
}

export const useEditorStore = create<EditorStageStoreState>((set) => ({
  archetype: 'tuck-end',
  dieline: createInitialDieline('tuck-end'),
  dimensions: { ...DEFAULT_DIELINE_DIMENSIONS },
  activeSide: 'outside',
  elements: [],
  committedElements: [],
  selectedElementId: null,
  foldAngle: 0,

  setActiveSide: (side) =>
    set((state) => {
      if (state.activeSide === side) {
        return state;
      }
      const selected = state.selectedElementId
        ? state.elements.find((el) => el.id === state.selectedElementId)
        : undefined;
      return {
        activeSide: side,
        selectedElementId: selected && selected.side !== side ? null : state.selectedElementId,
      };
    }),

  addElement: (options) => {
    let created: TextElement | null = null;

    set((state) => {
      const { resolvedFaceId, bounds } = resolveFaceBounds(
        state.dieline,
        options?.faceId ?? 'front',
      );
      const targetSide = options?.side ?? state.activeSide;
      const existingCount = state.elements.filter(
        (el) => el.faceId === resolvedFaceId && el.side === targetSide,
      ).length;
      const staggerOffsets = [0, -18, 18, -32, 32];
      const offsetIndex = existingCount % staggerOffsets.length;
      const yOffset = staggerOffsets[offsetIndex] ?? 0;

      const textElement: TextElement = {
        id: createEntityId(10),
        type: 'text',
        faceId: resolvedFaceId,
        side: targetSide,
        content: options?.content ?? DEFAULT_TEXT_CONTENT,
        transform: {
          x: options?.x ?? bounds.center.x,
          y: options?.y ?? bounds.center.y + yOffset,
          width: Math.min(84, bounds.width * 0.85),
          height: 18,
          rotation: 0,
        },
        opacity: 1,
        zIndex: nextSideZIndex(state.elements, targetSide),
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

      const targetSide = options.side ?? state.activeSide;
      const imageElement: ImageElement = {
        id: createEntityId(10),
        type: 'image',
        faceId: resolvedFaceId,
        side: targetSide,
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
        zIndex: nextSideZIndex(state.elements, targetSide),
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

  bringToFront: (id) =>
    set((state) => {
      const nextElements = reorderElementLayer(state.elements, id, 'front');
      return nextElements === state.elements
        ? state
        : { elements: nextElements, committedElements: nextElements };
    }),

  sendToBack: (id) =>
    set((state) => {
      const nextElements = reorderElementLayer(state.elements, id, 'back');
      return nextElements === state.elements
        ? state
        : { elements: nextElements, committedElements: nextElements };
    }),

  bringForward: (id) =>
    set((state) => {
      const nextElements = reorderElementLayer(state.elements, id, 'forward');
      return nextElements === state.elements
        ? state
        : { elements: nextElements, committedElements: nextElements };
    }),

  sendBackward: (id) =>
    set((state) => {
      const nextElements = reorderElementLayer(state.elements, id, 'backward');
      return nextElements === state.elements
        ? state
        : { elements: nextElements, committedElements: nextElements };
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

  setArchetype: (archetype) =>
    set((state) => {
      if (state.archetype === archetype && state.dieline.archetype === archetype) {
        return state;
      }

      const nextDieline = generateDieline(archetype, state.dimensions);
      const nextElements = reconcileElementsForDieline(nextDieline, state.elements);
      const nextCommittedElements =
        state.committedElements === state.elements
          ? nextElements
          : reconcileElementsForDieline(nextDieline, state.committedElements);

      return {
        archetype,
        dieline: nextDieline,
        dimensions: nextDieline.dimensions,
        elements: nextElements,
        committedElements: nextCommittedElements,
      };
    }),

  setDimensions: (length, width, height) =>
    set((state) => {
      const regenerated = regenerateDielineForSize(
        state.archetype,
        state.dimensions,
        length,
        width,
        height,
      );
      if (!regenerated.changed) {
        return state;
      }

      const { dieline: nextDieline } = regenerated;
      const nextElements = reconcileElementsForDieline(nextDieline, state.elements);
      const nextCommittedElements =
        state.committedElements === state.elements
          ? nextElements
          : reconcileElementsForDieline(nextDieline, state.committedElements);

      return {
        dieline: nextDieline,
        dimensions: nextDieline.dimensions,
        elements: nextElements,
        committedElements: nextCommittedElements,
      };
    }),

  applyTemplate: (template) =>
    set((state) => {
      const targetArchetype = template.archetype ?? 'tuck-end';
      const regenerated = regenerateDielineForSize(
        targetArchetype,
        state.dimensions,
        template.dimensions.length,
        template.dimensions.width,
        template.dimensions.height,
      );
      const archetypeChanged = targetArchetype !== state.archetype;
      const nextDieline =
        regenerated.changed || archetypeChanged ? regenerated.dieline : state.dieline;
      const nextDimensions =
        regenerated.changed || archetypeChanged ? regenerated.dimensions : state.dimensions;
      const nextElements = template.elements.map(cloneElementWithFreshId);

      return {
        archetype: targetArchetype,
        dieline: nextDieline,
        dimensions: nextDimensions,
        elements: nextElements,
        committedElements: nextElements,
        selectedElementId: null,
      };
    }),

  reset: () =>
    set({
      archetype: 'tuck-end',
      dieline: createInitialDieline('tuck-end'),
      dimensions: { ...DEFAULT_DIELINE_DIMENSIONS },
      activeSide: 'outside',
      elements: [],
      committedElements: [],
      selectedElementId: null,
      foldAngle: 0,
    }),
}));
