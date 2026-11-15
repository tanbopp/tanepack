// Unit tests for 2D DielineStage SVG rendering, mm-to-px scaling, pan/zoom, and pointer element drag
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeSvgPathBoundsMm } from '@entities/dieline';
import { PX_PER_MM } from '@shared/lib/units';
import {
  clampZoom,
  computeFitViewport,
  computeSnap,
  DielineStage,
  getElementSelectionFrame,
  MAX_STAGE_ZOOM,
  MIN_STAGE_ZOOM,
  screenDeltaPxToMm,
  SNAP_THRESHOLD_MM,
  useEditorStore,
  zoomAtPoint,
} from './index';

beforeEach(() => {
  useEditorStore.getState().reset();
});

afterEach(() => {
  useEditorStore.getState().reset();
  cleanup();
});

describe('viewport math helpers', () => {
  it('clamps zoom strictly between 0.1 and 5', () => {
    expect(clampZoom(0.01)).toBe(MIN_STAGE_ZOOM);
    expect(clampZoom(10)).toBe(MAX_STAGE_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it('computes centered fit viewport for given stage and sheet dimensions', () => {
    const fitted = computeFitViewport(
      { width: 1000, height: 700 },
      { width: 1200, height: 900 },
      { width: 1100, height: 800 },
    );

    expect(fitted.zoom).toBeGreaterThanOrEqual(MIN_STAGE_ZOOM);
    expect(fitted.zoom).toBeLessThanOrEqual(1);
    expect(fitted.pan.x).toBeCloseTo((1000 - 1100 * fitted.zoom) / 2, 5);
    expect(fitted.pan.y).toBeCloseTo((700 - 800 * fitted.zoom) / 2, 5);
  });

  it('keeps anchor point fixed in screen space when zooming', () => {
    const initial = { zoom: 1, pan: { x: 100, y: 50 } };
    const anchor = { x: 400, y: 300 };
    const next = zoomAtPoint(initial, 2, anchor);

    const worldXBefore = (anchor.x - initial.pan.x) / initial.zoom;
    const worldYBefore = (anchor.y - initial.pan.y) / initial.zoom;
    const worldXAfter = (anchor.x - next.pan.x) / next.zoom;
    const worldYAfter = (anchor.y - next.pan.y) / next.zoom;

    expect(worldXAfter).toBeCloseTo(worldXBefore, 6);
    expect(worldYAfter).toBeCloseTo(worldYBefore, 6);
  });
});

describe('DielineStage component', () => {
  it('renders SVG with mm viewBox, 96 DPI pixel dimensions, paper sheet, cuts, folds, and bleeds', () => {
    render(<DielineStage />);

    const svg = screen.getByTestId('dieline-svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 317 231.5');
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(317 * PX_PER_MM, 4);
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(231.5 * PX_PER_MM, 4);

    const paper = svg.querySelector('[data-layer="paper"]');
    expect(paper).not.toBeNull();
    expect(paper?.getAttribute('fill')).toBe('#ffffff');

    const cuts = svg.querySelectorAll('[data-layer="cuts"] path');
    const folds = svg.querySelectorAll('[data-layer="folds"] path');
    const bleeds = svg.querySelectorAll('[data-layer="bleeds"] path');

    expect(cuts.length).toBe(1);
    expect(folds.length).toBe(12);
    expect(bleeds.length).toBe(1);

    expect(cuts[0]?.getAttribute('stroke')).toBe('#000000');
    expect(cuts[0]?.getAttribute('stroke-width')).toBe('0.2');
    expect(folds[0]?.getAttribute('stroke-dasharray')).toBe('1, 1');
    expect(bleeds[0]?.getAttribute('stroke-width')).toBe('0.1');
  });

  it('starts at zoom 1, zooms via wheel clamped to [0.1, 5], and updates transform CSS', () => {
    render(<DielineStage />);

    const stage = screen.getByTestId('dieline-stage');
    const transformBox = screen.getByTestId('stage-transform');

    expect(transformBox.style.transform).toMatch(/^translate\(0px(?:, 0px)?\) scale\(1\)$/);
    expect(screen.getByRole('button', { name: 'Reset zoom to 100%' }).textContent).toBe('100%');

    // Zoom in strongly past max cap to test upper clamp
    for (let i = 0; i < 15; i += 1) {
      fireEvent.wheel(stage, { deltaY: -400, clientX: 0, clientY: 0 });
    }
    expect(screen.getByRole('button', { name: 'Reset zoom to 100%' }).textContent).toBe('500%');

    // Zoom out strongly past min cap to test lower clamp
    for (let i = 0; i < 40; i += 1) {
      fireEvent.wheel(stage, { deltaY: 400, clientX: 0, clientY: 0 });
    }
    expect(screen.getByRole('button', { name: 'Reset zoom to 100%' }).textContent).toBe('10%');
  });

  it('pans when holding Spacebar and dragging, or dragging with middle mouse button', () => {
    render(<DielineStage />);

    const stage = screen.getByTestId('dieline-stage');
    const transformBox = screen.getByTestId('stage-transform');

    // Left drag without Spacebar should not pan
    fireEvent.mouseDown(stage, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 160, clientY: 140 });
    fireEvent.mouseUp(window);
    expect(transformBox.style.transform).toMatch(/^translate\(0px(?:, 0px)?\) scale\(1\)$/);

    // Hold Spacebar + left drag pans stage
    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.mouseDown(stage, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 175, clientY: 130 });
    fireEvent.mouseUp(window);
    fireEvent.keyUp(window, { code: 'Space' });
    expect(transformBox.style.transform).toBe('translate(75px, 30px) scale(1)');

    // Middle mouse drag adds delta onto existing pan
    fireEvent.mouseDown(stage, { button: 1, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(window, { clientX: 225, clientY: 180 });
    fireEvent.mouseUp(window);
    expect(transformBox.style.transform).toBe('translate(100px, 10px) scale(1)');

    expect(screen.getByRole('button', { name: /Fit to Screen/i })).toBeTruthy();
  });

  it('converts pointer drag delta using PX_PER_MM and zoom, snapping within 2mm to face edges/centers and siblings', () => {
    expect(screenDeltaPxToMm(PX_PER_MM * 10, 1)).toBeCloseTo(10, 5);
    expect(screenDeltaPxToMm(PX_PER_MM * 10, 2)).toBeCloseTo(5, 5);

    const addedText = useEditorStore.getState().addElement({ x: 110, y: 120 });
    const siblingText = useEditorStore
      .getState()
      .addElement({ x: 242, y: 215, content: 'Sibling' });
    const faces = useEditorStore
      .getState()
      .dieline.faces.map((f) => computeSvgPathBoundsMm(f.path));
    const rightBounds = computeSvgPathBoundsMm(
      useEditorStore.getState().dieline.faces.find((f) => f.id === 'right')!.path,
    );

    // Near right face center within SNAP_THRESHOLD_MM (2mm) -> snaps strictly to right center with X+Y guides
    const snappedToFaceCenter = computeSnap({
      element: addedText,
      candidateXMm: rightBounds.center.x + 1.4,
      candidateYMm: rightBounds.center.y - 1.2,
      faceBounds: faces,
      otherElements: [siblingText],
      thresholdMm: SNAP_THRESHOLD_MM,
    });
    expect(snappedToFaceCenter.x).toBeCloseTo(rightBounds.center.x, 2);
    expect(snappedToFaceCenter.y).toBeCloseTo(rightBounds.center.y, 2);
    expect(snappedToFaceCenter.guides).toHaveLength(2);

    // Near sibling center within SNAP_THRESHOLD_MM (2mm) -> snaps cleanly to sibling center
    const snappedToSibling = computeSnap({
      element: addedText,
      candidateXMm: siblingText.transform.x - 1.1,
      candidateYMm: siblingText.transform.y + 1.1,
      faceBounds: faces,
      otherElements: [siblingText],
      thresholdMm: SNAP_THRESHOLD_MM,
    });
    expect(snappedToSibling.x).toBeCloseTo(siblingText.transform.x, 2);
    expect(snappedToSibling.y).toBeCloseTo(siblingText.transform.y, 2);
    expect(snappedToSibling.guides).toHaveLength(2);

    // Beyond threshold -> moves freely without clamping or guide lines
    const freeMove = computeSnap({
      element: addedText,
      candidateXMm: 450,
      candidateYMm: 350,
      faceBounds: faces,
      otherElements: [siblingText],
    });
    expect(freeMove.x).toBeCloseTo(450, 2);
    expect(freeMove.y).toBeCloseTo(350, 2);
    expect(freeMove.guides).toHaveLength(0);
  });

  it('allows free-form cross-face dragging, renders magenta snap guides during drag, and filters visibility by activeSide', () => {
    const outsideText = useEditorStore.getState().addElement({ content: 'Outside Text' });
    const rightBounds = computeSvgPathBoundsMm(
      useEditorStore.getState().dieline.faces.find((f) => f.id === 'right')!.path,
    );

    render(<DielineStage />);

    const textGroup = screen.getByTestId(`stage-text-${outsideText.id}`);
    const deltaXMm = rightBounds.center.x + 1.1 - outsideText.transform.x;
    const deltaYMm = rightBounds.center.y - outsideText.transform.y;

    fireEvent.pointerDown(textGroup, { pointerId: 11, button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, {
      pointerId: 11,
      clientX: 200 + deltaXMm * PX_PER_MM,
      clientY: 200 + deltaYMm * PX_PER_MM,
    });

    const guideLines = screen.getAllByTestId('snap-guide-line');
    expect(guideLines.length).toBeGreaterThanOrEqual(1);
    expect(guideLines[0]?.getAttribute('stroke')).toBe('#ff00ff');
    expect(guideLines[0]?.closest('[data-ui-overlay="true"]')).not.toBeNull();

    fireEvent.pointerUp(window, {
      pointerId: 11,
      clientX: 200 + deltaXMm * PX_PER_MM,
      clientY: 200 + deltaYMm * PX_PER_MM,
    });

    // Snap guides clear after release and element's owning faceId updates to 'right'
    expect(screen.queryByTestId('snap-guide-line')).toBeNull();
    const moved = useEditorStore.getState().committedElements.find((e) => e.id === outsideText.id)!;
    expect(moved.faceId).toBe('right');
    expect(moved.transform.x).toBeCloseTo(rightBounds.center.x, 1);

    // Switching to Inside hides outside artwork in 2D and shows newly added inside artwork
    act(() => {
      useEditorStore.getState().setActiveSide('inside');
      useEditorStore.getState().addElement({ content: 'Inside Secret' });
    });
    expect(screen.queryByText('Outside Text')).toBeNull();
    expect(screen.getByText('Inside Secret')).toBeTruthy();

    // Switching back to Outside hides 'Inside Secret'
    act(() => {
      useEditorStore.getState().setActiveSide('outside');
    });
    expect(screen.queryByText('Inside Secret')).toBeNull();
    expect(screen.getByText('Outside Text')).toBeTruthy();
  });

  it('drags text and image elements with pointer events, committing only on pointerup', () => {
    const addedText = useEditorStore.getState().addElement();
    const addedImg = useEditorStore.getState().addImageElement({
      src: 'data:image/png;base64,iVBORw0KGgo=',
      naturalWidth: 200,
      naturalHeight: 100,
    });

    const initialTextX = addedText.transform.x;
    const initialTextY = addedText.transform.y;
    const initialImgX = addedImg.transform.x;
    const initialImgY = addedImg.transform.y;

    render(<DielineStage />);

    // Drag text element by +20mm in X and -22mm in Y (well clear of 2mm snap targets)
    const textGroup = screen.getByTestId(`stage-text-${addedText.id}`);
    fireEvent.pointerDown(textGroup, { pointerId: 1, button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 200 + 20 * PX_PER_MM,
      clientY: 200 - 22 * PX_PER_MM,
    });

    // Live elements moved, committedElements untouched until pointerUp
    const liveText = useEditorStore.getState().elements.find((e) => e.id === addedText.id)!;
    const committedDuringDrag = useEditorStore
      .getState()
      .committedElements.find((e) => e.id === addedText.id)!;
    expect(liveText.transform.x).toBeCloseTo(initialTextX + 20, 1);
    expect(liveText.transform.y).toBeCloseTo(initialTextY - 22, 1);
    expect(committedDuringDrag.transform.x).toBeCloseTo(initialTextX, 2);

    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 200 + 20 * PX_PER_MM,
      clientY: 200 - 22 * PX_PER_MM,
    });
    const committedAfterDrag = useEditorStore
      .getState()
      .committedElements.find((e) => e.id === addedText.id)!;
    expect(committedAfterDrag.transform.x).toBeCloseTo(initialTextX + 20, 1);
    expect(committedAfterDrag.transform.y).toBeCloseTo(initialTextY - 22, 1);

    // Drag image element by -8mm in X and +14mm in Y
    const imgGroup = screen.getByTestId(`stage-image-${addedImg.id}`);
    const renderedImg = imgGroup.querySelector('image');
    expect(renderedImg).not.toBeNull();
    expect(renderedImg?.getAttribute('href')).toBe('data:image/png;base64,iVBORw0KGgo=');

    fireEvent.pointerDown(imgGroup, { pointerId: 2, button: 0, clientX: 300, clientY: 300 });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      clientX: 300 - 18 * PX_PER_MM,
      clientY: 300 + 24 * PX_PER_MM,
    });
    expect(
      useEditorStore.getState().committedElements.find((e) => e.id === addedImg.id)!.transform.x,
    ).toBeCloseTo(initialImgX, 2);

    fireEvent.pointerUp(window, {
      pointerId: 2,
      clientX: 300 - 18 * PX_PER_MM,
      clientY: 300 + 24 * PX_PER_MM,
    });
    const movedImg = useEditorStore.getState().committedElements.find((e) => e.id === addedImg.id)!;
    expect(movedImg.transform.x).toBeCloseTo(initialImgX - 18, 1);
    expect(movedImg.transform.y).toBeCloseTo(initialImgY + 24, 1);
  });

  it('renders 4 corner resize handles and top rotate handle when selected, rotating via atan2 and resizing proportionally', () => {
    const addedText = useEditorStore.getState().addElement();
    render(<DielineStage />);

    expect(screen.getByTestId('handle-rotate')).toBeTruthy();
    expect(screen.getByTestId('handle-resize-nw')).toBeTruthy();
    expect(screen.getByTestId('handle-resize-ne')).toBeTruthy();
    expect(screen.getByTestId('handle-resize-se')).toBeTruthy();
    expect(screen.getByTestId('handle-resize-sw')).toBeTruthy();

    const frame = getElementSelectionFrame(addedText);
    const rotateHandle = screen.getByTestId('handle-rotate');

    // Drag rotation handle directly right of element center -> 90° clockwise
    const rightOfCenterClientX = (frame.center.x + 25) * PX_PER_MM;
    const rightOfCenterClientY = frame.center.y * PX_PER_MM;
    fireEvent.pointerDown(rotateHandle, {
      pointerId: 3,
      button: 0,
      clientX: frame.center.x * PX_PER_MM,
      clientY: (frame.center.y - 25) * PX_PER_MM,
    });
    fireEvent.pointerMove(window, {
      pointerId: 3,
      clientX: rightOfCenterClientX,
      clientY: rightOfCenterClientY,
    });

    const rotatingLive = useEditorStore.getState().elements.find((e) => e.id === addedText.id)!;
    expect(rotatingLive.transform.rotation).toBeCloseTo(90, 1);
    expect(useEditorStore.getState().committedElements[0]?.transform.rotation).toBe(0);

    fireEvent.pointerUp(window, {
      pointerId: 3,
      clientX: rightOfCenterClientX,
      clientY: rightOfCenterClientY,
    });
    const rotatedCommitted = useEditorStore
      .getState()
      .committedElements.find((e) => e.id === addedText.id)!;
    expect(rotatedCommitted.transform.rotation).toBeCloseTo(90, 1);
    expect(screen.getByTestId(`stage-text-${addedText.id}`).getAttribute('transform')).toBe(
      `rotate(90 ${frame.center.x} ${frame.center.y})`,
    );

    // Drag SE corner handle outward on rotated text -> increases fontSize cleanly
    const currentText = useEditorStore.getState().elements.find((e) => e.id === addedText.id)!;
    const currentFrame = getElementSelectionFrame(currentText);
    const initialFontSize = currentText.type === 'text' ? currentText.style.fontSize : 14;
    const seHandle = screen.getByTestId('handle-resize-se');

    // Rotated 90deg clockwise: local (+dx, +dy) corresponds to stage (-dy, +dx)
    const doubleX = (currentFrame.center.x - currentFrame.rectHeight * 0.5 * 2) * PX_PER_MM;
    const doubleY = (currentFrame.center.y + currentFrame.rectWidth * 0.5 * 2) * PX_PER_MM;

    fireEvent.pointerDown(seHandle, {
      pointerId: 4,
      button: 0,
      clientX: currentFrame.center.x * PX_PER_MM,
      clientY: currentFrame.center.y * PX_PER_MM,
    });
    fireEvent.pointerMove(window, { pointerId: 4, clientX: doubleX, clientY: doubleY });
    fireEvent.pointerUp(window, { pointerId: 4, clientX: doubleX, clientY: doubleY });

    const resizedCommitted = useEditorStore
      .getState()
      .committedElements.find((e) => e.id === addedText.id)!;
    expect(resizedCommitted.type).toBe('text');
    if (resizedCommitted.type === 'text') {
      expect(resizedCommitted.style.fontSize).toBeGreaterThan(initialFontSize);
    }
  });

  it('updates SVG viewBox and auto-fits viewport when parametric dieline dimensions change', () => {
    render(<DielineStage />);

    const stage = screen.getByTestId('dieline-stage');
    stage.getBoundingClientRect = () =>
      ({
        width: 1000,
        height: 700,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 700,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    const svg = screen.getByTestId('dieline-svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 317 231.5');

    act(() => {
      useEditorStore.getState().setDimensions(150, 50, 100);
    });

    expect(svg.getAttribute('viewBox')).toBe('0 0 417 231.5');
    const transformBox = screen.getByTestId('stage-transform');
    const zoomButton = screen.getByRole('button', { name: 'Reset zoom to 100%' });
    expect(transformBox.style.transform).not.toMatch(/^translate\(0px(?:, 0px)?\) scale\(1\)$/);
    // 1000px stage fitting a 417mm wide sheet (+26mm margins) yields zoom < 100%
    expect(Number.parseInt(zoomButton.textContent ?? '', 10)).toBeLessThan(100);
  });
});
