// Zustand store holding 2D design elements, selection, dieline model, and 3D fold state
import { create } from 'zustand';
import type { DesignElement, TextElement } from '@entities/design-document';
import { computeSvgPathBoundsMm, type Dieline, generateTuckEndBox } from '@entities/dieline';
import { createEntityId } from '@shared/lib/id';

export const DEFAULT_DIELINE_DIMENSIONS: Dieline['dimensions'] = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

export const DEFAULT_TEXT_CONTENT = 'Tanepack';

export interface AddTextElementOptions {
  faceId?: string | undefined;
  content?: string | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

export interface TextElementPatch {
  content?: string | undefined;
  opacity?: number | undefined;
  transform?: Partial<TextElement['transform']> | undefined;
  style?: Partial<TextElement['style']> | undefined;
}

export interface EditorStageStoreState {
  dieline: Dieline;
  elements: DesignElement[];
  committedElements: DesignElement[];
  selectedElementId: string | null;
  foldAngle: number;
  addElement: (options?: AddTextElementOptions) => TextElement;
  updateElement: (id: string, patch: TextElementPatch, commit?: boolean) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  commitElements: () => void;
  setFoldAngle: (angle: number) => void;
  setDimensions: (dimensions: Dieline['dimensions']) => void;
  reset: () => void;
}

function createInitialDieline(): Dieline {
  return generateTuckEndBox(DEFAULT_DIELINE_DIMENSIONS);
}

function patchTextElement(element: DesignElement, patch: TextElementPatch): DesignElement {
  if (element.type !== 'text') {
    return element;
  }

  return {
    ...element,
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
    transform: patch.transform ? { ...element.transform, ...patch.transform } : element.transform,
    style: patch.style ? { ...element.style, ...patch.style } : element.style,
  };
}

export const useEditorStore = create<EditorStageStoreState>((set) => ({
  dieline: createInitialDieline(),
  elements: [],
  committedElements: [],
  selectedElementId: null,
  foldAngle: 0,

  addElement: (options) => {
    let created: TextElement | null = null;

    set((state) => {
      const targetFaceId = options?.faceId ?? 'front';
      const face =
        state.dieline.faces.find((candidate) => candidate.id === targetFaceId) ??
        state.dieline.faces[0];

      const bounds = face
        ? computeSvgPathBoundsMm(face.path)
        : {
            center: { x: state.dieline.totalWidth * 0.5, y: state.dieline.totalHeight * 0.5 },
            width: 80,
            height: 20,
          };

      const resolvedFaceId = face?.id ?? targetFaceId;
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

  updateElement: (id, patch, commit = false) =>
    set((state) => {
      const nextElements = state.elements.map((el) =>
        el.id === id ? patchTextElement(el, patch) : el,
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

  setDimensions: (dimensions) =>
    set({
      dieline: generateTuckEndBox(dimensions),
    }),

  reset: () =>
    set({
      dieline: createInitialDieline(),
      elements: [],
      committedElements: [],
      selectedElementId: null,
      foldAngle: 0,
    }),
}));
