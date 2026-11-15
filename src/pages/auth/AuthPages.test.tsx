// Unit tests for LoginPage and RegisterPage M3 forms, validation, errors, and /dashboard redirects
import type { Session, User } from '@supabase/supabase-js';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthActionResult, UseAuthResult } from '@shared/lib/useAuth';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<() => UseAuthResult>(),
}));

vi.mock('@shared/lib/useAuth', () => ({
  useAuth: mockUseAuth,
}));

function makeAuthState(overrides: Partial<UseAuthResult> = {}): UseAuthResult {
  return {
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    isConfigured: true,
    error: null,
    signIn: vi.fn<() => Promise<AuthActionResult>>(),
    signUp: vi.fn<() => Promise<AuthActionResult>>(),
    signOut: vi.fn<() => Promise<{ error: string | null }>>(),
    ...overrides,
  };
}

function renderAuthRoute(initialEntry: '/login' | '/register') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-route">Dashboard</div>} />
        <Route path="/editor" element={<div data-testid="editor-route">Editor</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Auth Pages', () => {
  it('validates login fields, shows Supabase auth errors, and redirects to /dashboard on success', async () => {
    const signIn = vi
      .fn<UseAuthResult['signIn']>()
      .mockResolvedValueOnce({ user: null, session: null, error: 'Invalid login credentials' })
      .mockResolvedValueOnce({
        user: { id: 'u1', email: 'baker@tanepack.dev' } as User,
        session: { access_token: 'tok' } as Session,
        error: null,
      });

    mockUseAuth.mockReturnValue(makeAuthState({ signIn }));
    renderAuthRoute('/login');

    // Empty submit validates inputs client-side
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(screen.getByRole('alert').textContent).toMatch(/enter both your email and password/i);
    expect(signIn).not.toHaveBeenCalled();

    // Fill fields -> first fails with server error
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'baker@tanepack.dev' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Invalid login credentials');
    });

    // Retry with valid credentials -> navigates to /dashboard
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-route')).toBeTruthy();
    });
    expect(signIn).toHaveBeenLastCalledWith('baker@tanepack.dev', 'secret123');
  });

  it('registers a user on /register, handles confirmation prompt, and redirects to /dashboard when signed in', async () => {
    const signUp = vi
      .fn<UseAuthResult['signUp']>()
      .mockResolvedValueOnce({
        user: { id: 'u2', email: 'roast@tanepack.dev' } as User,
        session: null,
        error: null,
        requiresEmailConfirmation: true,
      })
      .mockResolvedValueOnce({
        user: { id: 'u2', email: 'roast@tanepack.dev' } as User,
        session: { access_token: 'tok' } as Session,
        error: null,
        requiresEmailConfirmation: false,
      });

    mockUseAuth.mockReturnValue(makeAuthState({ signUp }));
    renderAuthRoute('/register');

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Roast Master' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'roast@tanepack.dev' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByRole('alert').textContent).toMatch(/at least 6 characters/i);
    expect(signUp).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'coffee123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(/check your email to confirm/i);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-route')).toBeTruthy();
    });
    expect(signUp).toHaveBeenLastCalledWith('roast@tanepack.dev', 'coffee123', 'Roast Master');
  });

  it('redirects already-authenticated users from /login to /dashboard', () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        isAuthenticated: true,
        user: { id: 'u1', email: 'baker@tanepack.dev' } as User,
        session: { access_token: 'tok' } as Session,
      }),
    );

    renderAuthRoute('/login');
    expect(screen.getByTestId('dashboard-route')).toBeTruthy();
  });
});
