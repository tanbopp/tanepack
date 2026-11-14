// Unit tests for 2D DielineStage SVG rendering, mm-to-px scaling, and pan/zoom controls
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PX_PER_MM } from '@shared/lib/units';
import {
  clampZoom,
  computeFitViewport,
  DielineStage,
  MAX_STAGE_ZOOM,
  MIN_STAGE_ZOOM,
  zoomAtPoint,
} from './index';

afterEach(() => {
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
});
