// Unit tests for DashboardPage authenticated project grid, logged-out prompt, and template launches
import type { Session, User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectSummary } from '@entities/design-document';
import { generateTuckEndBox } from '@entities/dieline';
import type { AuthActionResult, UseAuthResult } from '@shared/lib/useAuth';
import DashboardPage from './DashboardPage';

const AUTH_USER_ID = '33333333-3333-4333-8333-333333333333';
const PROJECT_1_ID = '44444444-4444-4444-8444-444444444444';

const { mockFetchUserProjects, mockUseAuth } = vi.hoisted(() => ({
  mockFetchUserProjects: vi.fn<(userId?: string) => Promise<ProjectSummary[]>>(),
  mockUseAuth: vi.fn<() => UseAuthResult>(),
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
    fetchUserProjects: mockFetchUserProjects,
  };
});

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

function EditorRouteSpy() {
  const location = useLocation();
  return (
    <div data-testid="editor-route" data-search={location.search}>
      Editor Mock
    </div>
  );
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor" element={<EditorRouteSpy />} />
          <Route path="/login" element={<div data-testid="login-route">Login Page</div>} />
          <Route path="/register" element={<div data-testid="register-route">Register Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReturnValue(makeAuthState(true));
  mockFetchUserProjects.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  cleanup();
});

describe('DashboardPage', () => {
  it('fetches authenticated user projects sorted newest first and renders cards with Open and Create New', async () => {
    const dieline = generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    mockFetchUserProjects.mockResolvedValue([
      {
        id: PROJECT_1_ID,
        userId: AUTH_USER_ID,
        name: 'Matcha Carton',
        thumbnailUrl: null,
        createdAt: '2026-11-14T16:00:00.000Z',
        updatedAt: '2026-11-14T17:30:00.000Z',
        designJson: {
          id: PROJECT_1_ID,
          version: 1,
          name: 'Matcha Carton',
          createdAt: '2026-11-14T16:00:00.000Z',
          updatedAt: '2026-11-14T17:30:00.000Z',
          dieline,
          layers: {
            outside: [
              {
                id: 'txt-1',
                type: 'text',
                faceId: 'front',
                side: 'outside',
                content: 'MATCHA',
                transform: { x: 100, y: 120, width: 60, height: 20, rotation: 30 },
                opacity: 1,
                zIndex: 1,
                style: {
                  fontFamily: 'Google Sans, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: 0,
                  textAlign: 'center',
                  color: '#1f6f54',
                },
              },
            ],
            inside: [],
          },
          metadata: { seedColor: '#7B5E3B' },
        },
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(mockFetchUserProjects).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(screen.getByText('Matcha Carton')).toBeTruthy();
    });

    const card = screen.getByTestId(`project-card-${PROJECT_1_ID}`);
    expect(card.querySelector('svg text')?.textContent).toBe('MATCHA');
    expect(screen.getByText('100 × 50 × 100 mm')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => {
      expect(screen.getByTestId('editor-route')).toBeTruthy();
    });
  });

  it('shows empty state when no saved designs exist and navigates to /editor on Create New', async () => {
    mockFetchUserProjects.mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No saved designs yet')).toBeTruthy();
    });

    const createButtons = screen.getAllByRole('button', { name: /Create New/i });
    const firstCreate = createButtons[0];
    expect(firstCreate).toBeDefined();
    if (firstCreate) {
      fireEvent.click(firstCreate);
    }

    await waitFor(() => {
      expect(screen.getByTestId('editor-route')).toBeTruthy();
    });
  });

  it('prompts logged-out visitors to log in without fetching user projects', () => {
    mockUseAuth.mockReturnValue(makeAuthState(false));

    renderDashboard();

    expect(screen.getByTestId('dashboard-auth-prompt')).toBeTruthy();
    expect(screen.getByText('Log in to view your saved designs')).toBeTruthy();
    expect(mockFetchUserProjects).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(screen.getByTestId('login-route')).toBeTruthy();
  });

  it('navigates to /editor?template=coffee-box from Start from Template menu', async () => {
    mockFetchUserProjects.mockResolvedValue([]);

    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /Start from Template/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Coffee Box/i }));

    await waitFor(() => {
      const spy = screen.getByTestId('editor-route');
      expect(spy.getAttribute('data-search')).toBe('?template=coffee-box');
    });
  });
});
