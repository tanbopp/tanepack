// Unit tests for TopBar authentication UI (Log In CTA vs email/avatar + Log Out)
import type { Session, User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseAuthResult } from '@shared/lib/useAuth';
import { TopBar } from './TopBar';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<() => UseAuthResult>(),
}));

vi.mock('@shared/lib/useAuth', () => ({
  useAuth: mockUseAuth,
}));

function renderTopBar(initialEntry = '/dashboard') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[initialEntry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<TopBar title="Tanepack — My Designs" />} />
          <Route path="/login" element={<TopBar title="Tanepack" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('TopBar account controls', () => {
  it('shows Log In button when signed out and hides it while already on /login', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      isConfigured: true,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    renderTopBar('/dashboard');
    const loginButton = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginButton);
    expect(screen.queryByRole('button', { name: 'Log In' })).toBeNull();
  });

  it('shows user avatar initial, email, and Log Out button when signed in', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'patisserie@tanepack.dev',
        user_metadata: { full_name: 'Claire Dubois' },
      } as unknown as User,
      session: { access_token: 'tok' } as Session,
      isLoading: false,
      isAuthenticated: true,
      isConfigured: true,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut,
    });

    renderTopBar('/dashboard');

    expect(screen.getByTestId('topbar-user-avatar').textContent).toBe('C');
    expect(screen.getByTestId('topbar-user-email').textContent).toBe('patisserie@tanepack.dev');

    fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });
});
