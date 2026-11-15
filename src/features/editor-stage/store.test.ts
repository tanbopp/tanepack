// Zustand store holding 2D design elements, selection, commits, image uploads, and reset tests
import { beforeEach, describe, expect, it } from 'vitest';
import { computeSvgPathBoundsMm } from '@entities/dieline';
import { findTemplateById } from '@entities/template';
import { DEFAULT_IMAGE_SIZE_MM, DEFAULT_TEXT_CONTENT, useEditorStore } from './store';

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

  it('adds centered ImageElement on front face preserving aspect ratio within 30x30 mm', () => {
    const added = useEditorStore.getState().addImageElement({
      src: 'data:image/png;base64,iVBORw0KGgo=',
      naturalWidth: 200,
      naturalHeight: 100,
    });
    const after = useEditorStore.getState();
    const front = after.dieline.faces.find((f) => f.id === 'front')!;
    const frontBounds = computeSvgPathBoundsMm(front.path);

    expect(added.type).toBe('image');
    expect(added.faceId).toBe('front');
    expect(added.transform.width).toBe(DEFAULT_IMAGE_SIZE_MM);
    expect(added.transform.height).toBe(15);
    expect(added.transform.x).toBeCloseTo(frontBounds.center.x - 15, 2);
    expect(added.transform.y).toBeCloseTo(frontBounds.center.y - 7.5, 2);
    expect(after.selectedElementId).toBe(added.id);
    expect(after.committedElements).toHaveLength(1);

    // Updating image transform live (drag) leaves committedElements intact until commit
    useEditorStore.getState().updateElement(added.id, { transform: { x: 90, y: 80 } }, false);
    const moved = useEditorStore.getState().elements[0]!;
    expect(moved.transform.x).toBe(90);
    expect(moved.transform.y).toBe(80);
    expect(useEditorStore.getState().committedElements[0]!.transform.x).toBeCloseTo(
      frontBounds.center.x - 15,
      2,
    );

    useEditorStore.getState().commitElements();
    expect(useEditorStore.getState().committedElements[0]!.transform.x).toBe(90);
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

  it('regenerates dieline and dimensions on setDimensions, preserving in-bounds artwork and clamping out-of-bounds artwork', () => {
    const text = useEditorStore.getState().addElement();
    const initialX = text.transform.x;
    const initialY = text.transform.y;

    // Expanding length keeps front-centered text safely inside new bounds in place
    useEditorStore.getState().setDimensions(150, 50, 100);
    const expanded = useEditorStore.getState();
    expect(expanded.dimensions.length).toBe(150);
    expect(expanded.dieline.dimensions.length).toBe(150);
    expect(expanded.dieline.totalWidth).toBe(417);
    expect(expanded.elements[0]?.transform.x).toBe(initialX);
    expect(expanded.elements[0]?.transform.y).toBe(initialY);

    // Shrinking box to 50x50x50 clamps text and committedElements safely into the smaller front face
    useEditorStore.getState().setDimensions(50, 50, 50);
    const shrunk = useEditorStore.getState();
    const shrunkFront = shrunk.dieline.faces.find((f) => f.id === 'front')!;
    const shrunkBounds = computeSvgPathBoundsMm(shrunkFront.path);
    expect(shrunk.dimensions).toEqual({
      length: 50,
      width: 50,
      height: 50,
      thickness: 0.5,
      bleedSize: 3,
    });
    expect(shrunk.dieline.totalWidth).toBe(217);
    expect(shrunk.elements[0]!.transform.x).toBeGreaterThanOrEqual(shrunkBounds.minX);
    expect(shrunk.elements[0]!.transform.x).toBeLessThanOrEqual(shrunkBounds.maxX);
    expect(shrunk.elements[0]!.transform.y).toBeGreaterThanOrEqual(shrunkBounds.minY);
    expect(shrunk.elements[0]!.transform.y).toBeLessThanOrEqual(shrunkBounds.maxY);
    expect(shrunk.committedElements[0]!.transform).toEqual(shrunk.elements[0]!.transform);

    // Non-positive dimensions fall back safely; extreme values clamp within [10, 2000]
    useEditorStore.getState().setDimensions(0, -10, 5000);
    const clamped = useEditorStore.getState();
    expect(clamped.dimensions.length).toBe(50);
    expect(clamped.dimensions.width).toBe(50);
    expect(clamped.dimensions.height).toBe(2000);
  });

  it('applies templates cleanly with new dimensions, fresh element IDs, cleared selection, and committed 3D sync', () => {
    const matcha = findTemplateById('matcha-box')!;
    const initial = useEditorStore.getState().addElement({ content: 'Old Label' });
    expect(useEditorStore.getState().selectedElementId).toBe(initial.id);

    useEditorStore.getState().applyTemplate(matcha);
    const firstApply = useEditorStore.getState();

    expect(firstApply.dimensions).toMatchObject({ length: 80, width: 80, height: 80 });
    expect(firstApply.dieline.dimensions).toMatchObject({ length: 80, width: 80, height: 80 });
    expect(firstApply.selectedElementId).toBeNull();
    expect(firstApply.elements.length).toBe(matcha.elements.length);
    expect(firstApply.committedElements).toEqual(firstApply.elements);
    expect(firstApply.elements.some((el) => el.id === initial.id)).toBe(false);
    expect(firstApply.elements.some((el) => el.type === 'text' && el.content === 'Matcha')).toBe(
      true,
    );

    // Re-applying generates brand new element IDs without mutating preset IDs
    const firstIds = firstApply.elements.map((el) => el.id);
    const presetIds = matcha.elements.map((el) => el.id);
    expect(firstIds.some((id) => presetIds.includes(id))).toBe(false);

    useEditorStore.getState().applyTemplate(matcha);
    const secondIds = useEditorStore.getState().elements.map((el) => el.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it('switches archetypes via setArchetype, preserves front artwork, and keeps archetype across setDimensions', () => {
    const onFront = useEditorStore.getState().addElement({ content: 'Fragile' });
    const onTuck = useEditorStore.getState().addElement({ faceId: 'top-tuck', content: 'Lid' });

    useEditorStore.getState().setArchetype('fefco-0201');
    const rscState = useEditorStore.getState();
    expect(rscState.archetype).toBe('fefco-0201');
    expect(rscState.dieline.archetype).toBe('fefco-0201');
    expect(rscState.dieline.faces).toHaveLength(13);

    // Front artwork stays on front; Tuck flap element cleanly maps onto Back top flap
    expect(rscState.elements.find((e) => e.id === onFront.id)?.faceId).toBe('front');
    expect(rscState.elements.find((e) => e.id === onTuck.id)?.faceId).toBe('top-flap-back');

    // Resizing keeps active FEFCO 0201 archetype instead of reverting to tuck-end
    useEditorStore.getState().setDimensions(300, 200, 150);
    const resizedRsc = useEditorStore.getState();
    expect(resizedRsc.archetype).toBe('fefco-0201');
    expect(resizedRsc.dieline.archetype).toBe('fefco-0201');
    expect(resizedRsc.dieline.totalWidth).toBe(1037);
    expect(resizedRsc.dieline.totalHeight).toBe(351);

    // Switching to FEFCO 0203 doubles outer flap height across the 200.5mm opening
    useEditorStore.getState().setArchetype('fefco-0203');
    const foscState = useEditorStore.getState();
    expect(foscState.archetype).toBe('fefco-0203');
    expect(foscState.dieline.totalHeight).toBe(551.5);
  });
});
