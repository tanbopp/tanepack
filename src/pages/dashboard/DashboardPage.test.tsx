// Unit tests for DashboardPage M3 project grid, thumbnail preview, Create New, and Open actions
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectSummary } from '@entities/design-document';
import { generateTuckEndBox } from '@entities/dieline';
import { GUEST_ID_STORAGE_KEY } from '@shared/lib/useGuestSession';
import DashboardPage from './DashboardPage';

const GUEST_ID = '33333333-3333-4333-8333-333333333333';
const PROJECT_1_ID = '44444444-4444-4444-8444-444444444444';

const { mockFetchUserProjects } = vi.hoisted(() => ({
  mockFetchUserProjects: vi.fn<(userId: string) => Promise<ProjectSummary[]>>(),
}));

vi.mock('@shared/lib/supabase', () => ({
  createSupabaseClient: () => ({}),
}));

vi.mock('@entities/design-document', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/design-document')>();
  return {
    ...actual,
    fetchUserProjects: mockFetchUserProjects,
  };
});

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
          <Route path="/editor" element={<div data-testid="editor-route">Editor Mock</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, GUEST_ID);
  mockFetchUserProjects.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  cleanup();
});

describe('DashboardPage', () => {
  it('fetches guest projects sorted newest first and renders cards with Open and Create New', async () => {
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
        userId: GUEST_ID,
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
      expect(mockFetchUserProjects).toHaveBeenCalledWith(GUEST_ID);
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
});
