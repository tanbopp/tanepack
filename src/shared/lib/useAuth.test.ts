// Unit tests for useAuth Supabase Email/Password authentication hook and session listener
import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as supabaseLib from '@shared/lib/supabase';
import { resetAuthStateForTests, useAuth } from './useAuth';

function makeMockUser(id: string, email: string, fullName = ''): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: fullName ? { full_name: fullName } : {},
    aud: 'authenticated',
    created_at: '2026-11-15T04:00:00.000Z',
  } as User;
}

function makeMockSession(user: User): Session {
  return {
    access_token: 'mock-jwt-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

afterEach(() => {
  cleanup();
  resetAuthStateForTests();
  vi.restoreAllMocks();
});

describe('useAuth', () => {
  it('returns unconfigured signed-out state when Supabase client is null', async () => {
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();

    const signInRes = await result.current.signIn('user@example.com', 'password123');
    expect(signInRes.error).toMatch(/Supabase is not configured/i);
  });

  it('restores active session via getSession and reacts to onAuthStateChange events', async () => {
    const alice = makeMockUser(
      '11111111-1111-4111-8111-111111111111',
      'alice@tanepack.dev',
      'Alice',
    );
    const session = makeMockSession(alice);
    let authCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
    const unsubscribe = vi.fn();

    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        onAuthStateChange: vi.fn(
          (cb: (event: AuthChangeEvent, session: Session | null) => void) => {
            authCallback = cb;
            return { data: { subscription: { unsubscribe } } };
          },
        ),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    } as unknown as SupabaseClient;

    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue(mockClient);

    const { result, unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });
    expect(result.current.user?.email).toBe('alice@tanepack.dev');

    act(() => {
      authCallback?.('SIGNED_OUT', null);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('handles signIn, signUp with fullName metadata, email confirmation, and signOut', async () => {
    const bob = makeMockUser('22222222-2222-4222-8222-222222222222', 'bob@tanepack.dev', 'Bob Lee');
    const bobSession = makeMockSession(bob);

    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: bob, session: bobSession },
      error: null,
    });
    const signUp = vi
      .fn()
      .mockResolvedValueOnce({
        data: { user: bob, session: bobSession },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: bob, session: null },
        error: null,
      });
    const signOut = vi.fn().mockResolvedValue({ error: null });

    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword,
        signUp,
        signOut,
      },
    } as unknown as SupabaseClient;

    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue(mockClient);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Sign up returning active session logs user in immediately
    let signUpRes = await result.current.signUp('bob@tanepack.dev', 'secret123', 'Bob Lee');
    expect(signUp).toHaveBeenCalledWith({
      email: 'bob@tanepack.dev',
      password: 'secret123',
      options: { data: { full_name: 'Bob Lee' } },
    });
    expect(signUpRes.error).toBeNull();
    expect(signUpRes.requiresEmailConfirmation).toBe(false);
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Sign out clears session
    const signOutRes = await result.current.signOut();
    expect(signOutRes.error).toBeNull();
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    // Sign up requiring email confirmation keeps user logged out
    signUpRes = await result.current.signUp('pending@tanepack.dev', 'secret123');
    expect(signUpRes.requiresEmailConfirmation).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);

    // Sign in establishes active session
    const signInRes = await result.current.signIn('bob@tanepack.dev', 'secret123');
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'bob@tanepack.dev',
      password: 'secret123',
    });
    expect(signInRes.error).toBeNull();
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('bob@tanepack.dev');
    });
  });
});
