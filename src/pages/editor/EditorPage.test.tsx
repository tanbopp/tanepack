// Unit tests for EditorPage Material Design 3 workspace shell, 2D/3D toggle, and Fold Angle slider
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditorPage from './EditorPage';

vi.mock('@features/editor-3d', () => ({
  BoxViewer: ({ foldAngle = 0 }: { foldAngle?: number }) => (
    <div data-testid="box-viewer-3d" data-fold-angle={String(foldAngle)}>
      Mock 3D BoxViewer ({foldAngle}°)
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('EditorPage', () => {
  it('renders Top App Bar, Left Rail, 2D DielineStage, Right Panel with Fold Angle, and switches to 3D Preview', async () => {
    render(
      <MemoryRouter
        initialEntries={['/editor']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <EditorPage />
      </MemoryRouter>,
    );

    // Top App Bar
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeTruthy();
    expect(screen.getByText('Untitled Box')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    const exportButton = screen.getByRole('button', { name: /Export/i }) as HTMLButtonElement;
    expect(exportButton.disabled).toBe(true);

    // Mode switch starts in 2D Dieline
    expect(screen.getByRole('button', { name: '2D Dieline' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: '3D Preview' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByTestId('dieline-stage')).toBeTruthy();

    // Left Rail (4 M3IconButtons)
    expect(screen.getByRole('button', { name: 'Templates' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Text' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Shapes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();

    // Right Properties Panel: Fold Angle (default 0°) + placeholder text
    expect(screen.getByRole('slider', { name: 'Fold Angle' })).toBeTruthy();
    expect(screen.getByTestId('fold-angle-value').textContent).toBe('0°');
    expect(screen.getByText('Properties panel coming soon.')).toBeTruthy();

    // Switch to 3D Preview and move fold angle to 90°
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-fold-angle')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: '90° Closed' }));
    expect(screen.getByTestId('fold-angle-value').textContent).toBe('90°');
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-fold-angle')).toBe('90');
  });
});
