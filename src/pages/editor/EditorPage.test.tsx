// Unit tests for EditorPage M3 workspace, 2D text tool, Right Panel editing, and 3D texture wiring
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@features/editor-stage';
import type { DesignElement } from '@entities/design-document';
import EditorPage from './EditorPage';

vi.mock('@features/editor-3d', () => ({
  BoxViewer: ({
    foldAngle = 0,
    elements = [],
  }: {
    foldAngle?: number;
    elements?: readonly DesignElement[];
  }) => {
    const joinedText = elements
      .filter((el) => el.type === 'text')
      .map((el) => (el.type === 'text' ? el.content : ''))
      .join('|');

    return (
      <div
        data-testid="box-viewer-3d"
        data-fold-angle={String(foldAngle)}
        data-committed-count={String(elements.length)}
        data-committed-text={joinedText}
      >
        Mock 3D BoxViewer ({foldAngle}°)
      </div>
    );
  },
}));

function renderEditorPage() {
  return render(
    <MemoryRouter
      initialEntries={['/editor']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <EditorPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useEditorStore.getState().reset();
});

afterEach(() => {
  useEditorStore.getState().reset();
  cleanup();
});

function getFirstCommittedContent(): string | null {
  const first = useEditorStore.getState().committedElements[0];
  return first?.type === 'text' ? first.content : null;
}

describe('EditorPage', () => {
  it('renders Top App Bar, Left Rail, 2D DielineStage, Right Panel, and switches to 3D Preview', async () => {
    renderEditorPage();

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
    expect(screen.getByRole('button', { name: 'Add Text' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Shapes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();

    // Right Properties Panel: Fold Angle (default 0°) + empty artwork guidance
    expect(screen.getByRole('slider', { name: 'Fold Angle' })).toBeTruthy();
    expect(screen.getByTestId('fold-angle-value').textContent).toBe('0°');
    expect(screen.getByText(/Click .*Add Text.* in the left rail/i)).toBeTruthy();

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

  it('adds text on 2D Front face, edits via M3TextField, commits on Enter/3D switch, and supports delete', async () => {
    renderEditorPage();

    // Click Add Text in Left Rail
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));

    // 2D SVG immediately shows default "Tanepack" text centered on Front
    const svg = screen.getByTestId('dieline-svg');
    expect(svg.querySelector('[data-layer="artwork"] text')?.textContent).toBe('Tanepack');

    // Right Panel displays Text Properties + M3TextField prefilled with "Tanepack"
    expect(screen.getByTestId('text-properties-panel')).toBeTruthy();
    const input = screen.getByRole('textbox', { name: 'Text Content' }) as HTMLInputElement;
    expect(input.value).toBe('Tanepack');

    // Typing updates 2D SVG live without committing until Enter / blur / 3D toggle
    fireEvent.change(input, { target: { value: 'Kraft Box' } });
    expect(svg.querySelector('[data-layer="artwork"] text')?.textContent).toBe('Kraft Box');
    expect(getFirstCommittedContent()).toBe('Tanepack');

    // Pressing Enter commits immediately
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(getFirstCommittedContent()).toBe('Kraft Box');

    // Switching to 3D Preview passes committed text into BoxViewer
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-count')).toBe('1');
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-text')).toBe(
      'Kraft Box',
    );

    // Deleting removes element cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected text' }));
    expect(useEditorStore.getState().elements).toHaveLength(0);
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-count')).toBe('0');
  });
});
