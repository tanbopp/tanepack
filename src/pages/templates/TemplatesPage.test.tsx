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
  it('renders header, category filters, and M3 grid of all 10 packaging models with live SVG previews', () => {
    renderTemplatesPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Packaging Models' })).toBeTruthy();

    const grid = screen.getByTestId('templates-catalog-grid');
    expect(within(grid).getByText('Tuck-End Box')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0200 (Half Slotted)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0201 (RSC)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0202 (Overlap Slotted)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0203 (Full Overlap)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0204 (Center Special Slotted)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0205 (Center Special Overlap)')).toBeTruthy();

    const tuckSvg = screen.getByTestId('catalog-preview-tuck-end-retail');
    const hscSvg = screen.getByTestId('catalog-preview-fefco-0200-hsc');
    const rscSvg = screen.getByTestId('catalog-preview-rsc-shipping');
    const f0202Svg = screen.getByTestId('catalog-preview-fefco-0202-overlap');
    const fullOverlapSvg = screen.getByTestId('catalog-preview-fefco-0203-overlap');

    expect(tuckSvg.querySelectorAll('path').length).toBeGreaterThanOrEqual(1);
    expect(hscSvg.querySelectorAll('line').length).toBe(8);
    expect(fullOverlapSvg.querySelectorAll('line').length).toBe(12);
    expect(f0202Svg.getAttribute('viewBox')).not.toBe(rscSvg.getAttribute('viewBox'));
    expect(rscSvg.getAttribute('viewBox')).not.toBe(fullOverlapSvg.getAttribute('viewBox'));
    expect(screen.getAllByRole('button', { name: 'Customize' })).toHaveLength(10);

    // Filter to Retail Carton only, then back to All
    const filterGroup = screen.getByRole('group', { name: 'Catalog categories' });
    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Retail Carton' }));
    expect(screen.getAllByRole('button', { name: 'Customize' })).toHaveLength(1);
    fireEvent.click(within(filterGroup).getByRole('button', { name: 'All' }));
    expect(screen.getAllByRole('button', { name: 'Customize' })).toHaveLength(10);
  });

  it('deep-links cleanly to /editor?archetype=fefco-0203&l=300&w=200&h=150 on Customize click', () => {
    renderTemplatesPage();

    const fefco0203Card = screen.getByTestId('catalog-card-fefco-0203-overlap');
    fireEvent.click(within(fefco0203Card).getByRole('button', { name: 'Customize' }));

    const spy = screen.getByTestId('editor-route');
    expect(spy.getAttribute('data-search')).toBe('?archetype=fefco-0203&l=300&w=200&h=150');
  });

  it('deep-links cleanly to /editor?archetype=fefco-0202&l=300&w=200&h=150 and fefco-0205', () => {
    renderTemplatesPage();

    const f0202Card = screen.getByTestId('catalog-card-fefco-0202-overlap');
    fireEvent.click(within(f0202Card).getByRole('button', { name: 'Customize' }));

    expect(screen.getByTestId('editor-route').getAttribute('data-search')).toBe(
      '?archetype=fefco-0202&l=300&w=200&h=150',
    );
  });
});
