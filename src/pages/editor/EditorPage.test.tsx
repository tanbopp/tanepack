// Unit tests for EditorPage Material Design 3 workspace shell and placeholder panels
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import EditorPage from './EditorPage';

afterEach(() => {
  cleanup();
});

describe('EditorPage', () => {
  it('renders Top App Bar, Left Navigation Rail, 2D DielineStage, and Right Properties Panel', () => {
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

    // Left Rail (4 M3IconButtons)
    expect(screen.getByRole('button', { name: 'Templates' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Text' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Shapes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();

    // Center Stage + Right Properties Panel
    expect(screen.getByTestId('dieline-stage')).toBeTruthy();
    expect(screen.getByText('Properties panel coming soon.')).toBeTruthy();
  });
});
