// Unit tests for EditorPage M3 workspace, artwork tools, PNG export, auth/guest sync, and templates
import type { Session, User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@features/editor-stage';
import type { DesignElement, Project } from '@entities/design-document';
import { type Dieline, generateTuckEndBox } from '@entities/dieline';
import { isValidUuid } from '@shared/lib/id';
import type { AuthActionResult, UseAuthResult } from '@shared/lib/useAuth';
import EditorPage from './EditorPage';
import { resetProjectPersistenceTracking } from './useProjectPersistence';

const MOCK_3D_PNG_DATA_URL = 'data:image/png;base64,MOCK3DSNAPSHOT';
const TEST_PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AUTH_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const { mockExportDielinePdf, mockFetchProject, mockSaveProject, mockUseAuth } = vi.hoisted(() => ({
  mockExportDielinePdf: vi.fn<() => Promise<Uint8Array>>(),
  mockFetchProject: vi.fn<(projectId: string) => Promise<Project | null>>(),
  mockSaveProject:
    vi.fn<(projectId: string, projectData: Project, userId?: string) => Promise<Project>>(),
  mockUseAuth: vi.fn<() => UseAuthResult>(),
}));

vi.mock('@shared/lib/exportPdf', () => ({
  exportDielinePdf: mockExportDielinePdf,
}));

vi.mock('@shared/lib/supabase', () => ({
  createSupabaseClient: () => ({}),
}));

vi.mock('@shared/lib/useAuth', () => ({
  useAuth: mockUseAuth,
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
    dieline,
    foldAngle = 0,
    elements = [],
    onRegisterCapture,
  }: {
    dieline?: Dieline | undefined;
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
        data-dieline-length={dieline ? String(dieline.dimensions.length) : ''}
        data-dieline-total-width={dieline ? String(dieline.totalWidth) : ''}
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

function makeAuthState(isAuthenticated = true): UseAuthResult {
  const user = isAuthenticated
    ? ({
        id: AUTH_USER_ID,
        email: 'creator@tanepack.dev',
        user_metadata: { full_name: 'Tanepack Maker' },
      } as unknown as User)
    : null;
  const session = isAuthenticated ? ({ access_token: 'mock-jwt', user } as Session) : null;

  return {
    user,
    session,
    isLoading: false,
    isAuthenticated,
    isConfigured: true,
    error: null,
    signIn: vi.fn<() => Promise<AuthActionResult>>(),
    signUp: vi.fn<() => Promise<AuthActionResult>>(),
    signOut: vi.fn<() => Promise<{ error: string | null }>>(),
  };
}

function EditorWithLocationSpy() {
  const location = useLocation();
  return (
    <>
      <div data-testid="editor-location-search" data-search={location.search} />
      <EditorPage />
    </>
  );
}

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
        <Routes>
          <Route path="/editor" element={<EditorWithLocationSpy />} />
          <Route path="/login" element={<div data-testid="login-route">Login Page</div>} />
        </Routes>
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
  mockUseAuth.mockReturnValue(makeAuthState(true));
  mockExportDielinePdf.mockReset();
  mockExportDielinePdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
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
    expect(screen.getByTestId('topbar-user-email').textContent).toBe('creator@tanepack.dev');
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeTruthy();
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

    // Switch to 3D Preview, open Export menu, and choose Export 3D Image (PNG)
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-images')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export 3D Image (PNG)' }));
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
    expect(savedCall?.[2]).toBe(AUTH_USER_ID);
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

  it('shows Box Dimensions controls when unselected, debounces L/W/H edits by 300ms, supports presets, and updates 2D & 3D', async () => {
    renderEditorPage(`/editor?id=${TEST_PROJECT_ID}`);

    await waitFor(() => {
      expect(mockFetchProject).toHaveBeenCalledWith(TEST_PROJECT_ID);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('box-dimensions-panel')).toBeTruthy();
    const lengthInput = screen.getByLabelText('Length') as HTMLInputElement;
    expect(lengthInput.value).toBe('100');

    // Preset selection applies immediately
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Preset' }));
    fireEvent.click(screen.getByRole('option', { name: 'Large: 200x150x100' }));
    expect(useEditorStore.getState().dimensions).toMatchObject({
      length: 200,
      width: 150,
      height: 100,
    });
    expect(screen.getByTestId('dieline-svg').getAttribute('viewBox')).toBe('0 0 722 441.5');

    // Return to Standard preset and test 300ms debounced Length change (100 -> 150)
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Preset' }));
    fireEvent.click(screen.getByRole('option', { name: 'Standard: 100x50x100' }));

    vi.useFakeTimers();
    fireEvent.change(lengthInput, { target: { value: '150' } });
    expect(useEditorStore.getState().dimensions.length).toBe(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(useEditorStore.getState().dimensions.length).toBe(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(useEditorStore.getState().dimensions.length).toBe(150);
    expect(screen.getByTestId('dieline-svg').getAttribute('viewBox')).toBe('0 0 417 231.5');
    expect(screen.getByTestId('box-dimensions-summary').textContent).toBe('150 × 50 × 100 mm');

    // Switch to 3D Preview and confirm updated dieline dimensions reach BoxViewer
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-dieline-length')).toBe('150');
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-dieline-total-width')).toBe(
      '417',
    );
  });

  it('opens Export dropdown with 3D PNG and 2D Print PDF options and exports print PDF from 2D stage', async () => {
    renderEditorPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    expect(screen.getByRole('menuitem', { name: 'Export 3D Image (PNG)' })).toBeTruthy();
    const exportPdfItem = screen.getByRole('menuitem', { name: 'Export 2D Print (PDF)' });
    fireEvent.click(exportPdfItem);

    await waitFor(() => {
      expect(mockExportDielinePdf).toHaveBeenCalledTimes(1);
    });

    const [calledSvg, calledDieline] = mockExportDielinePdf.mock.calls[0] as unknown as [
      SVGSVGElement,
      Dieline,
    ];
    expect(calledSvg).toBe(screen.getByTestId('dieline-svg'));
    expect(calledDieline.totalWidth).toBe(317);
    expect(calledDieline.totalHeight).toBe(231.5);
  });

  it('opens Left Rail Templates drawer, applies Matcha Box preset cleanly to 2D & 3D, and closes drawer', async () => {
    renderEditorPage();

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }));

    const drawer = screen.getByTestId('templates-drawer');
    expect(within(drawer).getByText('Coffee Box')).toBeTruthy();
    expect(within(drawer).getByText('Matcha Box')).toBeTruthy();
    expect(within(drawer).getByText('Pastry Box')).toBeTruthy();

    fireEvent.click(screen.getByTestId('template-card-matcha-box'));

    await waitFor(() => {
      expect(screen.queryByTestId('templates-drawer')).toBeNull();
    });

    expect(useEditorStore.getState().dimensions).toMatchObject({
      length: 80,
      width: 80,
      height: 80,
    });
    expect(screen.getByTestId('box-dimensions-summary').textContent).toBe('80 × 80 × 80 mm');

    const svg = screen.getByTestId('dieline-svg');
    const artworkTexts = Array.from(svg.querySelectorAll('[data-layer="artwork"] text')).map(
      (node) => node.textContent,
    );
    expect(artworkTexts).toContain('Matcha');
    expect(svg.querySelectorAll('[data-layer="artwork"] rect').length).toBeGreaterThanOrEqual(1);

    // Committed immediately to 3D Preview without needing extra Edit commits
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    await waitFor(() => {
      expect(screen.getByTestId('box-viewer-3d')).toBeTruthy();
    });
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-committed-text')).toContain(
      'Matcha',
    );
    expect(screen.getByTestId('box-viewer-3d').getAttribute('data-dieline-length')).toBe('80');
  });

  it('reads ?template=coffee-box query param on mount and applies Coffee Box immediately', async () => {
    renderEditorPage('/editor?template=coffee-box');

    await waitFor(() => {
      expect(screen.getByText('Coffee Box')).toBeTruthy();
    });

    expect(useEditorStore.getState().dimensions).toMatchObject({
      length: 100,
      width: 50,
      height: 100,
    });
    const svg = screen.getByTestId('dieline-svg');
    const artworkTexts = Array.from(svg.querySelectorAll('[data-layer="artwork"] text')).map(
      (node) => node.textContent,
    );
    expect(artworkTexts).toContain('Tanepack Coffee');
    expect(svg.querySelector('[data-layer="artwork"] ellipse')).not.toBeNull();
  });

  it('shows Guest Mode warning in TopBar and disables cloud saves when logged out', async () => {
    mockUseAuth.mockReturnValue(makeAuthState(false));
    renderEditorPage();

    expect(
      within(screen.getByTestId('save-status-pill')).getByText('Log in to save your design'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log Out' })).toBeNull();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(mockFetchProject).not.toHaveBeenCalled();
    expect(mockSaveProject).not.toHaveBeenCalled();
  });

  it('switches Box Type between Tuck-End, FEFCO 0201 (RSC), and FEFCO 0203 (Full Overlap) and applies Shipping presets', async () => {
    renderEditorPage();

    // Select Shipping Small: 300x200x150 preset
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Preset' }));
    fireEvent.click(screen.getByRole('option', { name: 'Shipping Small: 300x200x150' }));
    expect(screen.getByTestId('box-dimensions-summary').textContent).toBe('300 × 200 × 150 mm');

    // Switch Box Type to FEFCO 0201 (RSC)
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Box Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'FEFCO 0201 (RSC)' }));
    expect(useEditorStore.getState().archetype).toBe('fefco-0201');
    expect(screen.getByTestId('dieline-svg').getAttribute('viewBox')).toBe('0 0 1037 351');

    // Switch Box Type to FEFCO 0203 (Full Overlap)
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Box Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'FEFCO 0203 (Full Overlap)' }));
    expect(useEditorStore.getState().archetype).toBe('fefco-0203');
    expect(screen.getByTestId('dieline-svg').getAttribute('viewBox')).toBe('0 0 1037 551.5');
  });

  it('initializes archetype and dimensions from ?archetype=&l=&w=&h= deep link, swaps URL to ?id=<uuid>, saves, and reloads', async () => {
    renderEditorPage('/editor?archetype=fefco-0203&l=300&w=200&h=150');

    await waitFor(() => {
      const search = screen.getByTestId('editor-location-search').getAttribute('data-search') ?? '';
      expect(search.startsWith('?id=')).toBe(true);
    });

    const search = screen.getByTestId('editor-location-search').getAttribute('data-search') ?? '';
    const assignedId = new URLSearchParams(search).get('id') ?? '';
    expect(isValidUuid(assignedId)).toBe(true);
    expect(new URLSearchParams(search).has('archetype')).toBe(false);
    expect(new URLSearchParams(search).has('l')).toBe(false);

    expect(useEditorStore.getState().archetype).toBe('fefco-0203');
    expect(useEditorStore.getState().dimensions).toMatchObject({
      length: 300,
      width: 200,
      height: 150,
    });
    expect(screen.getByRole('combobox', { name: 'Box Type' }).textContent).toBe(
      'FEFCO 0203 (Full Overlap)',
    );
    expect(screen.getByTestId('box-dimensions-summary').textContent).toBe('300 × 200 × 150 mm');
    expect(screen.getByTestId('dieline-svg').getAttribute('viewBox')).toBe('0 0 1037 551.5');

    await waitFor(() => {
      expect(mockFetchProject).toHaveBeenCalledWith(assignedId);
    });
    await act(async () => {
      await Promise.resolve();
    });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2050);
    });

    expect(mockSaveProject).toHaveBeenCalled();
    const savedCall = mockSaveProject.mock.calls[mockSaveProject.mock.calls.length - 1];
    const savedProject = savedCall?.[1];
    expect(savedProject?.id).toBe(assignedId);
    expect(savedProject?.dieline.archetype).toBe('fefco-0203');
    expect(savedProject?.dieline.dimensions).toMatchObject({
      length: 300,
      width: 200,
      height: 150,
    });
    expect(savedProject?.layers.outside).toHaveLength(1);

    // Simulate browser page reload on /editor?id=<uuid>
    vi.useRealTimers();
    cleanup();
    resetProjectPersistenceTracking();
    useEditorStore.getState().reset();
    mockFetchProject.mockResolvedValueOnce(savedProject ?? null);

    renderEditorPage(`/editor?id=${assignedId}`);
    await waitFor(() => {
      expect(screen.getByTestId('dieline-svg').getAttribute('viewBox')).toBe('0 0 1037 551.5');
    });
    expect(screen.getByRole('combobox', { name: 'Box Type' }).textContent).toBe(
      'FEFCO 0203 (Full Overlap)',
    );
    expect(
      screen.getByTestId('dieline-svg').querySelector('[data-layer="artwork"] text')?.textContent,
    ).toBe('Tanepack');
  });
});
