// Unit tests for EditorPage M3 workspace, artwork tools, PNG export, and cloud persistence
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@features/editor-stage';
import type { DesignElement, Project } from '@entities/design-document';
import { generateTuckEndBox } from '@entities/dieline';
import { isValidUuid } from '@shared/lib/id';
import { GUEST_ID_STORAGE_KEY } from '@shared/lib/useGuestSession';
import EditorPage from './EditorPage';
import { resetProjectPersistenceTracking } from './useProjectPersistence';

const MOCK_3D_PNG_DATA_URL = 'data:image/png;base64,MOCK3DSNAPSHOT';
const TEST_PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const { mockFetchProject, mockSaveProject } = vi.hoisted(() => ({
  mockFetchProject: vi.fn<(projectId: string) => Promise<Project | null>>(),
  mockSaveProject:
    vi.fn<(projectId: string, projectData: Project, userId: string) => Promise<Project>>(),
}));

vi.mock('@shared/lib/supabase', () => ({
  createSupabaseClient: () => ({}),
}));

vi.mock('@entities/design-document', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/design-document')>();
  return {
    ...actual,
    fetchProject: mockFetchProject,
    saveProject: mockSaveProject,
  };
});

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

function renderEditorPage(initialEntry = '/editor') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[initialEntry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <EditorPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getFirstCommittedContent(): string | null {
  const first = useEditorStore.getState().committedElements[0];
  return first?.type === 'text' ? first.content : null;
}

beforeEach(() => {
  window.localStorage.clear();
  resetProjectPersistenceTracking();
  useEditorStore.getState().reset();
  mockFetchProject.mockReset();
  mockFetchProject.mockResolvedValue(null);
  mockSaveProject.mockReset();
  mockSaveProject.mockImplementation(async (_projectId, projectData) => projectData);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
  resetProjectPersistenceTracking();
  useEditorStore.getState().reset();
  cleanup();
});

describe('EditorPage', () => {
  it('renders Top App Bar with enabled Export, Left Rail, 2D DielineStage, Right Panel, and 3D Preview', async () => {
    renderEditorPage();

    // Top App Bar
    expect(screen.getByRole('button', { name: 'Back to dashboard' })).toBeTruthy();
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

  it('hydrates Zustand store from Supabase project design_json when ?id= matches a saved row', async () => {
    const savedDieline = generateTuckEndBox({
      length: 120,
      width: 60,
      height: 110,
      thickness: 0.5,
      bleedSize: 3,
    });
    const savedElements: DesignElement[] = [
      {
        id: 'txt-loaded-1',
        type: 'text',
        faceId: 'front',
        side: 'outside',
        content: 'Loaded Mint Tea',
        transform: { x: 100, y: 120, width: 60, height: 18, rotation: 0 },
        opacity: 1,
        zIndex: 1,
        style: {
          fontFamily: 'Google Sans, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: 0,
          textAlign: 'center',
          color: '#1b1b1f',
        },
      },
    ];
    const remoteProject: Project = {
      id: TEST_PROJECT_ID,
      version: 1,
      name: 'Mint Tea Box',
      createdAt: '2026-11-14T10:00:00.000Z',
      updatedAt: '2026-11-14T10:05:00.000Z',
      dieline: savedDieline,
      layers: { outside: savedElements, inside: [] },
      metadata: { seedColor: '#7B5E3B' },
    };
    mockFetchProject.mockResolvedValue(remoteProject);

    renderEditorPage(`/editor?id=${TEST_PROJECT_ID}`);

    await waitFor(() => {
      expect(mockFetchProject).toHaveBeenCalledWith(TEST_PROJECT_ID);
      expect(screen.getByText('Mint Tea Box')).toBeTruthy();
    });

    const svg = screen.getByTestId('dieline-svg');
    expect(svg.querySelector('[data-layer="artwork"] text')?.textContent).toBe('Loaded Mint Tea');
    expect(useEditorStore.getState().dieline.dimensions.length).toBe(120);
    expect(mockSaveProject).not.toHaveBeenCalled();
  });

  it('debounces auto-save by 2 seconds and transitions status pill from Saving... to Saved', async () => {
    let resolveSave: ((value: Project) => void) | null = null;
    mockSaveProject.mockImplementation(
      () =>
        new Promise<Project>((resolve) => {
          resolveSave = resolve;
        }),
    );

    renderEditorPage(`/editor?id=${TEST_PROJECT_ID}`);

    await waitFor(() => {
      expect(mockFetchProject).toHaveBeenCalledWith(TEST_PROJECT_ID);
    });
    await act(async () => {
      await Promise.resolve();
    });

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    expect(mockSaveProject).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('save-status-pill')).getByText('Saved')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1900);
    });
    expect(mockSaveProject).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(mockSaveProject).toHaveBeenCalledTimes(1);
    const savedCall = mockSaveProject.mock.calls[0];
    expect(savedCall?.[0]).toBe(TEST_PROJECT_ID);
    expect(savedCall?.[1].name).toBe('Untitled Box');
    expect(savedCall?.[1].layers.outside).toHaveLength(1);
    expect(isValidUuid(savedCall?.[2])).toBe(true);
    expect(savedCall?.[2]).toBe(window.localStorage.getItem(GUEST_ID_STORAGE_KEY));
    expect(within(screen.getByTestId('save-status-pill')).getByText('Saving...')).toBeTruthy();
    expect(screen.getByTestId('save-status-pill').getAttribute('aria-label')).toBe(
      'Save status: Saving...',
    );

    await act(async () => {
      if (savedCall) {
        resolveSave?.(savedCall[1]);
      }
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(within(screen.getByTestId('save-status-pill')).getByText('Saved')).toBeTruthy();
  });

  it('updates status pill to Error when saveProject fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSaveProject.mockRejectedValue(new Error('network timeout'));

    renderEditorPage(`/editor?id=${TEST_PROJECT_ID}`);

    await waitFor(() => {
      expect(mockFetchProject).toHaveBeenCalledWith(TEST_PROJECT_ID);
    });
    await act(async () => {
      await Promise.resolve();
    });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2050);
    });

    expect(mockSaveProject).toHaveBeenCalledTimes(1);
    expect(within(screen.getByTestId('save-status-pill')).getByText('Error')).toBeTruthy();
    expect(screen.getByTestId('save-status-pill').getAttribute('aria-label')).toBe(
      'Save status: Error',
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('updates text color, fontSize slider (4-72 mm), fontWeight dropdown, and inline project name', async () => {
    renderEditorPage(`/editor?id=${TEST_PROJECT_ID}`);

    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    expect(screen.getByTestId('text-properties-panel')).toBeTruthy();

    // Color picker update
    const colorInput = screen.getByLabelText('Text Color') as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: '#c62828' } });
    fireEvent.blur(colorInput);
    const svg = screen.getByTestId('dieline-svg');
    expect(svg.querySelector('[data-layer="artwork"] text')?.getAttribute('fill')).toBe('#c62828');

    // Font Size slider update (14 -> 28 mm)
    const fontSizeSlider = screen.getByRole('slider', { name: 'Font Size' });
    fireEvent.change(fontSizeSlider, { target: { value: 28 } });
    expect(screen.getByTestId('font-size-value').textContent).toBe('28 mm');
    expect(svg.querySelector('[data-layer="artwork"] text')?.getAttribute('font-size')).toBe('28');

    // Font Weight dropdown (700 -> 400)
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Font Weight' }));
    fireEvent.click(screen.getByRole('option', { name: 'Regular (400)' }));
    expect(svg.querySelector('[data-layer="artwork"] text')?.getAttribute('font-weight')).toBe(
      '400',
    );

    // Inline project rename
    fireEvent.click(screen.getByRole('button', { name: 'Rename project' }));
    const renameInput = screen.getByLabelText('Project name') as HTMLInputElement;
    fireEvent.change(renameInput, { target: { value: 'Tea Gift Carton' } });
    fireEvent.keyDown(renameInput, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Tea Gift Carton')).toBeTruthy();
  });
});
