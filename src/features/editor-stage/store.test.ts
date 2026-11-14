// Unit tests for Zustand editor stage store elements, commits, fold angle, and reset
import { beforeEach, describe, expect, it } from 'vitest';
import { computeSvgPathBoundsMm } from '@entities/dieline';
import { DEFAULT_TEXT_CONTENT, useEditorStore } from './store';

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('initializes empty elements, 0° fold angle, and valid tuck-end dieline', () => {
    const state = useEditorStore.getState();
    expect(state.elements).toEqual([]);
    expect(state.committedElements).toEqual([]);
    expect(state.selectedElementId).toBeNull();
    expect(state.foldAngle).toBe(0);
    expect(state.dieline.faces.some((f) => f.id === 'front')).toBe(true);
  });

  it('adds default "Tanepack" text centered on front face, selects it, and commits it', () => {
    const store = useEditorStore.getState();
    const added = store.addElement();
    const after = useEditorStore.getState();

    const front = after.dieline.faces.find((f) => f.id === 'front')!;
    const frontBounds = computeSvgPathBoundsMm(front.path);

    expect(added.type).toBe('text');
    expect(added.content).toBe(DEFAULT_TEXT_CONTENT);
    expect(added.faceId).toBe('front');
    expect(added.side).toBe('outside');
    expect(added.transform.x).toBeCloseTo(frontBounds.center.x, 4);
    expect(added.transform.y).toBeCloseTo(frontBounds.center.y, 4);

    expect(after.elements).toHaveLength(1);
    expect(after.committedElements).toHaveLength(1);
    expect(after.selectedElementId).toBe(added.id);
  });

  it('supports live typing updates separately from committedElements until commitElements()', () => {
    const created = useEditorStore.getState().addElement();

    useEditorStore.getState().updateElement(created.id, { content: 'Live Draft' }, false);
    const mid = useEditorStore.getState();
    expect(mid.elements[0]?.type === 'text' && mid.elements[0].content).toBe('Live Draft');
    expect(mid.committedElements[0]?.type === 'text' && mid.committedElements[0].content).toBe(
      DEFAULT_TEXT_CONTENT,
    );

    useEditorStore.getState().commitElements();
    const committed = useEditorStore.getState();
    expect(
      committed.committedElements[0]?.type === 'text' && committed.committedElements[0].content,
    ).toBe('Live Draft');
  });

  it('removes elements, clears selection on delete, and clamps foldAngle to [0, 90]', () => {
    const created = useEditorStore.getState().addElement();
    expect(useEditorStore.getState().selectedElementId).toBe(created.id);

    useEditorStore.getState().removeElement(created.id);
    expect(useEditorStore.getState().elements).toHaveLength(0);
    expect(useEditorStore.getState().committedElements).toHaveLength(0);
    expect(useEditorStore.getState().selectedElementId).toBeNull();

    useEditorStore.getState().setFoldAngle(145);
    expect(useEditorStore.getState().foldAngle).toBe(90);
    useEditorStore.getState().setFoldAngle(-20);
    expect(useEditorStore.getState().foldAngle).toBe(0);
  });
});
