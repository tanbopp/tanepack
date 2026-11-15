// Unit tests for TemplatesPage packaging catalog grid, live SVG previews, and deep-link navigation
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
  it('renders header and M3 grid of the 3 structural packaging models with live SVG previews', () => {
    renderTemplatesPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Packaging Models' })).toBeTruthy();

    const grid = screen.getByTestId('templates-catalog-grid');
    expect(within(grid).getByText('Tuck-End Box')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0201 (RSC)')).toBeTruthy();
    expect(within(grid).getByText('FEFCO 0203 (Full Overlap)')).toBeTruthy();

    const tuckSvg = screen.getByTestId('catalog-preview-tuck-end-retail');
    const rscSvg = screen.getByTestId('catalog-preview-rsc-shipping');
    const fullOverlapSvg = screen.getByTestId('catalog-preview-fefco-0203-overlap');

    expect(tuckSvg.querySelectorAll('path').length).toBeGreaterThanOrEqual(1);
    expect(tuckSvg.querySelectorAll('line').length).toBeGreaterThan(0);
    expect(rscSvg.getAttribute('viewBox')).not.toBe(fullOverlapSvg.getAttribute('viewBox'));
    expect(fullOverlapSvg.querySelectorAll('line').length).toBe(12);
    expect(screen.getAllByRole('button', { name: 'Customize' })).toHaveLength(3);
  });

  it('deep-links cleanly to /editor?archetype=fefco-0203&l=300&w=200&h=150 on Customize click', () => {
    renderTemplatesPage();

    const fefco0203Card = screen.getByTestId('catalog-card-fefco-0203-overlap');
    fireEvent.click(within(fefco0203Card).getByRole('button', { name: 'Customize' }));

    const spy = screen.getByTestId('editor-route');
    expect(spy.getAttribute('data-search')).toBe('?archetype=fefco-0203&l=300&w=200&h=150');
  });

  it('deep-links cleanly to /editor?archetype=fefco-0201&l=300&w=200&h=150 for FEFCO 0201 (RSC)', () => {
    renderTemplatesPage();

    const rscCard = screen.getByTestId('catalog-card-rsc-shipping');
    fireEvent.click(within(rscCard).getByRole('button', { name: 'Customize' }));

    const spy = screen.getByTestId('editor-route');
    expect(spy.getAttribute('data-search')).toBe('?archetype=fefco-0201&l=300&w=200&h=150');
  });
});
