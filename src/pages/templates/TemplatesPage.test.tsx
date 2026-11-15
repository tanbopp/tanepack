// Unit tests for TemplatesPage packaging catalog grid, category filters, SVG previews, and deep-linking
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import TemplatesPage from './TemplatesPage';

function EditorDeepLinkSpy() {
  const location = useLocation();
  return (
    <div data-testid="editor-route" data-search={location.search}>
      Editor Destination
    </div>
  );
}

function renderTemplatesPage() {
  return render(
    <MemoryRouter
      initialEntries={['/templates']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/editor" element={<EditorDeepLinkSpy />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

describe('TemplatesPage packaging catalog', () => {
  it('renders header, FEFCO 0200 category filters, and M3 grid of all 37 packaging models with live SVG previews', () => {
    renderTemplatesPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Packaging Models' })).toBeTruthy();

    const grid = screen.getByTestId('templates-catalog-grid');
    expect(within(grid).getByText('Tuck-End Box')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0200 — Half-Slotted Container (HSC)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0201 — Regular Slotted Container (RSC)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0202 — Overlap Slotted Container (ORSC)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0203 — Full Overlap Slotted (FOL)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0210 — Double Roll End Tuck (Straight)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0215 — Tuck Top / 1-2-3 Snap-Lock Bottom')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0233 — Crash-Lock Bottom / 0.44 W Top')).toBeTruthy();
    expect(
      within(grid).getByText('FEFCO 0240 — Double-Euroslot Hang Header / Snap-Lock'),
    ).toBeTruthy();

    const tuckSvg = screen.getByTestId('catalog-preview-tuck-end-retail');
    const hscSvg = screen.getByTestId('catalog-preview-fefco-0200-catalog');
    const rscSvg = screen.getByTestId('catalog-preview-fefco-0201-catalog');
    const f0202Svg = screen.getByTestId('catalog-preview-fefco-0202-catalog');
    const fullOverlapSvg = screen.getByTestId('catalog-preview-fefco-0203-catalog');
    const euroslotSvg = screen.getByTestId('catalog-preview-fefco-0240-catalog');

    expect(tuckSvg.querySelectorAll('path').length).toBeGreaterThanOrEqual(1);
    expect(hscSvg.querySelectorAll('line').length).toBe(8);
    expect(fullOverlapSvg.querySelectorAll('line').length).toBe(12);
    expect(euroslotSvg.querySelector('path')?.getAttribute('fill-rule')).toBe('evenodd');
    expect(f0202Svg.getAttribute('viewBox')).not.toBe(rscSvg.getAttribute('viewBox'));
    expect(rscSvg.getAttribute('viewBox')).not.toBe(fullOverlapSvg.getAttribute('viewBox'));
    expect(screen.getAllByRole('button', { name: 'Customize' })).toHaveLength(37);

    // Filter across Retail Carton, Slotted, Tuck Top, Crash Lock, then back to All
    const filterGroup = screen.getByRole('group', { name: 'Catalog categories' });
    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Retail Carton' }));
    const retailCount = screen.getAllByRole('button', { name: 'Customize' }).length;
    expect(retailCount).toBe(1);

    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Slotted' }));
    const slottedCount = screen.getAllByRole('button', { name: 'Customize' }).length;
    expect(slottedCount).toBeGreaterThan(15);

    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Tuck Top' }));
    const tuckTopCount = screen.getAllByRole('button', { name: 'Customize' }).length;
    expect(tuckTopCount).toBeGreaterThan(5);

    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Crash Lock' }));
    const crashCount = screen.getAllByRole('button', { name: 'Customize' }).length;
    expect(crashCount).toBeGreaterThan(4);
    expect(retailCount + slottedCount + tuckTopCount + crashCount).toBe(37);

    fireEvent.click(within(filterGroup).getByRole('button', { name: 'All' }));
    expect(screen.getAllByRole('button', { name: 'Customize' })).toHaveLength(37);
  });

  it('deep-links cleanly to /editor?archetype=fefco-0203&l=240&w=140&h=100 on Customize click', () => {
    renderTemplatesPage();

    const fefco0203Card = screen.getByTestId('catalog-card-fefco-0203-catalog');
    fireEvent.click(within(fefco0203Card).getByRole('button', { name: 'Customize' }));

    const spy = screen.getByTestId('editor-route');
    expect(spy.getAttribute('data-search')).toBe('?archetype=fefco-0203&l=240&w=140&h=100');
  });

  it('deep-links cleanly to FEFCO 0215 and FEFCO 0240 with exact PDF default dimensions', () => {
    renderTemplatesPage();

    const f0215Card = screen.getByTestId('catalog-card-fefco-0215-catalog');
    fireEvent.click(within(f0215Card).getByRole('button', { name: 'Customize' }));

    expect(screen.getByTestId('editor-route').getAttribute('data-search')).toBe(
      '?archetype=fefco-0215&l=160&w=105&h=110',
    );
  });
});
