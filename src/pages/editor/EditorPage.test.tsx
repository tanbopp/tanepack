// Unit tests for EditorPage M3 workspace, text tool, image upload, and PNG export
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@features/editor-stage';
import type { DesignElement } from '@entities/design-document';
import EditorPage from './EditorPage';

const MOCK_3D_PNG_DATA_URL = 'data:image/png;base64,MOCK3DSNAPSHOT';

vi.mock('@features/editor-3d', () => ({
  BoxViewer: ({
    foldAngle = 0,
    elements = [],
    onRegisterCapture,
  }: {
    foldAngle?: number;
    elements?: readonly DesignElement[];
    onRegisterCapture?: ((captureFn: (() => string | null) | null) => void) | undefined;
  }) => {
    useEffect(() => {
      onRegisterCapture?.(() => MOCK_3D_PNG_DATA_URL);
      return () => {
        onRegisterCapture?.(null);
      };
    }, [onRegisterCapture]);

    const joinedText = elements
      .filter((el) => el.type === 'text')
      .map((el) => (el.type === 'text' ? el.content : ''))
      .join('|');
    const imageCount = elements.filter((el) => el.type === 'image').length;

    return (
      <div
        data-testid="box-viewer-3d"
        data-fold-angle={String(foldAngle)}
        data-committed-count={String(elements.length)}
        data-committed-text={joinedText}
        data-committed-images={String(imageCount)}
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

function getFirstCommittedContent(): string | null {
  const first = useEditorStore.getState().committedElements[0];
  return first?.type === 'text' ? first.content : null;
}

beforeEach(() => {
  useEditorStore.getState().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
  useEditorStore.getState().reset();
  cleanup();
});

describe('EditorPage', () => {
  it('renders Top App Bar with enabled Export, Left Rail, 2D DielineStage, Right Panel, and 3D Preview', async () => {
    renderEditorPage();

    // Top App Bar
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeTruthy();
    expect(screen.getByText('Untitled Box')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    const exportButton = screen.getByRole('button', { name: /Export/i }) as HTMLButtonElement;
    expect(exportButton.disabled).toBe(false);

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
    expect(screen.getByText(/Click .*Add Text.* or .*Upload.*/i)).toBeTruthy();

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

  it('adds text on 2D Front face, edits via M3TextField, commits on Enter/3D switch, and deletes', async () => {
    renderEditorPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));

    const svg = screen.getByTestId('dieline-svg');
    expect(svg.querySelector('[data-layer="artwork"] text')?.textContent).toBe('Tanepack');

    expect(screen.getByTestId('text-properties-panel')).toBeTruthy();
    const input = screen.getByRole('textbox', { name: 'Text Content' }) as HTMLInputElement;
    expect(input.value).toBe('Tanepack');

    fireEvent.change(input, { target: { value: 'Kraft Box' } });
    expect(svg.querySelector('[data-layer="artwork"] text')?.textContent).toBe('Kraft Box');
    expect(getFirstCommittedContent()).toBe('Tanepack');

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(getFirstCommittedContent()).toBe('Kraft Box');

    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-count')).toBe('1');
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-text')).toBe(
      'Kraft Box',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected element' }));
    expect(useEditorStore.getState().elements).toHaveLength(0);
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-count')).toBe('0');
  });

  it('uploads an image as base64 ImageElement onto Front face and exports 3D PNG on Export click', async () => {
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    renderEditorPage();

    // Clicking Upload button triggers hidden file input click
    const fileInput = screen.getByTestId('image-upload-input') as HTMLInputElement;
    const inputClickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(inputClickSpy).toHaveBeenCalledTimes(1);

    // Select a PNG file via FileReader -> ImageElement on Front face
    const sampleFile = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'logo.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [sampleFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('image-properties-panel')).toBeTruthy();
    });

    const svg = screen.getByTestId('dieline-svg');
    const renderedImg = svg.querySelector('[data-layer="artwork"] image');
    expect(renderedImg).not.toBeNull();
    expect(renderedImg?.getAttribute('href')).toMatch(/^data:image\/png;base64,/);

    // Switch to 3D Preview and click Export -> triggers PNG Data URL download from R3F capture
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-images')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    await waitFor(() => {
      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    });
  });
});
