// Unit tests for redesigned SaaS HomePage and M3 route loading fallback
import type { Session, User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseAuthResult } from '@shared/lib/useAuth';
import { M3CircularProgress } from '@shared/ui';
import HomePage from './HomePage';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<() => UseAuthResult>(),
}));

vi.mock('@shared/lib/useAuth', () => ({
  useAuth: mockUseAuth,
}));

function makeSignedOutAuth(): UseAuthResult {
  return {
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    isConfigured: true,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
}

function renderHomePage(initialEntry = '/') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[initialEntry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/templates" element={<div>Templates Catalog Route</div>} />
          <Route path="/editor" element={<div>Editor Route</div>} />
          <Route path="/dashboard" element={<div>Dashboard Route</div>} />
          <Route path="/login" element={<div>Login Route</div>} />
          <Route path="/register" element={<div>Register Route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue(makeSignedOutAuth());
});

afterEach(() => {
  cleanup();
});

describe('HomePage landing experience', () => {
  it('renders top nav, hero headline, inline SVG carton graphic, 3 feature cards, and footer', () => {
    const { container } = renderHomePage();

    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeTruthy();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Design Packaging in 3D, Instantly.' }),
    ).toBeTruthy();
    expect(screen.getByText('Parametric Packaging Studio')).toBeTruthy();

    expect(screen.getByRole('heading', { name: '2D Dieline Editor' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Real-time 3D Preview' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Print-Ready PDF Export' })).toBeTruthy();

    expect(screen.getByText(/© 2026 Tanepack/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Editor' }).getAttribute('href')).toBe('/editor');
    expect(screen.getByRole('link', { name: 'Get Started' }).getAttribute('href')).toBe(
      '/register',
    );

    expect(container.querySelectorAll('img').length).toBe(0);
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  it('navigates cleanly to /editor on Start Designing and to /templates on Browse Templates', () => {
    renderHomePage();
    fireEvent.click(screen.getByRole('button', { name: /Browse Templates/i }));
    expect(screen.getByText('Templates Catalog Route')).toBeTruthy();

    cleanup();
    renderHomePage();
    fireEvent.click(screen.getByRole('button', { name: /Start Designing/i }));
    expect(screen.getByText('Editor Route')).toBeTruthy();
  });

  it('navigates cleanly to /login and /register from the Top App Bar when signed out', () => {
    renderHomePage();
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(screen.getByText('Login Route')).toBeTruthy();

    cleanup();
    renderHomePage();
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByText('Register Route')).toBeTruthy();
  });

  it('shows authenticated user actions in Top App Bar when logged in', () => {
    mockUseAuth.mockReturnValue({
      ...makeSignedOutAuth(),
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'designer@tanepack.app',
        user_metadata: { full_name: 'Tanepack Designer' },
      } as unknown as User,
      session: { access_token: 'token' } as Session,
    });

    renderHomePage();

    expect(screen.queryByRole('button', { name: 'Get Started' })).toBeNull();
    expect(screen.getByTestId('topbar-user-email').textContent).toBe('designer@tanepack.app');
    expect(screen.getAllByRole('button', { name: 'My Designs' }).length).toBeGreaterThanOrEqual(1);
  });

  it('displays Loading Tanepack... on M3CircularProgress suspense fallback', () => {
    const neverResolves = new Promise<never>(() => {});
    function SuspendingComponent(): never {
      throw neverResolves;
    }

    render(
      <Suspense fallback={<M3CircularProgress label="Loading Tanepack..." />}>
        <SuspendingComponent />
      </Suspense>,
    );

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Loading Tanepack...')).toBeTruthy();
  });
});
