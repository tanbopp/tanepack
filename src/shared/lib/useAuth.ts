// Shared Supabase Auth session hook handling email/password sign-in, sign-up, sign-out, and listener sync
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { useCallback, useSyncExternalStore } from 'react';
import { createSupabaseClient } from '@shared/lib/supabase';

export interface AuthSnapshot {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActionResult {
  user: User | null;
  session: Session | null;
  error: string | null;
  requiresEmailConfirmation?: boolean | undefined;
}

export interface UseAuthResult {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, fullName?: string) => Promise<AuthActionResult>;
  signOut: () => Promise<{ error: string | null }>;
}

interface AuthSubscription {
  unsubscribe: () => void;
}

const DEFAULT_SNAPSHOT: AuthSnapshot = {
  user: null,
  session: null,
  isLoading: false,
  error: null,
};

let activeSnapshot: AuthSnapshot = DEFAULT_SNAPSHOT;
let boundClient: SupabaseClient | null = null;
let authSubscription: AuthSubscription | null = null;
let consumerCount = 0;
let initGeneration = 0;
const snapshotListeners = new Set<() => void>();

function notifySnapshot(next: AuthSnapshot): void {
  activeSnapshot = next;
  for (const listener of snapshotListeners) {
    listener();
  }
}

function getAuthSnapshot(): AuthSnapshot {
  return activeSnapshot;
}

function hasSupabaseAuth(
  client: SupabaseClient | null,
): client is SupabaseClient & { auth: SupabaseClient['auth'] } {
  return Boolean(
    client &&
    typeof client.auth?.getSession === 'function' &&
    typeof client.auth?.onAuthStateChange === 'function',
  );
}

function bindAuthClient(client: SupabaseClient | null): void {
  if (boundClient === client) {
    return;
  }

  authSubscription?.unsubscribe();
  authSubscription = null;
  boundClient = client;
  initGeneration += 1;
  const generation = initGeneration;

  if (!hasSupabaseAuth(client)) {
    if (
      activeSnapshot.user !== null ||
      activeSnapshot.session !== null ||
      activeSnapshot.isLoading ||
      activeSnapshot.error !== null
    ) {
      notifySnapshot(DEFAULT_SNAPSHOT);
    }
    return;
  }

  notifySnapshot({
    ...activeSnapshot,
    isLoading: true,
    error: null,
  });

  const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
    if (generation !== initGeneration) {
      return;
    }
    notifySnapshot({
      user: nextSession?.user ?? null,
      session: nextSession ?? null,
      isLoading: false,
      error: null,
    });
  });
  authSubscription = data.subscription;

  void client.auth
    .getSession()
    .then(({ data: sessionData, error }) => {
      if (generation !== initGeneration) {
        return;
      }
      if (error) {
        notifySnapshot({
          user: null,
          session: null,
          isLoading: false,
          error: error.message,
        });
        return;
      }
      const nextSession = sessionData.session ?? null;
      notifySnapshot({
        user: nextSession?.user ?? null,
        session: nextSession,
        isLoading: false,
        error: null,
      });
    })
    .catch((err: unknown) => {
      if (generation !== initGeneration) {
        return;
      }
      notifySnapshot({
        user: null,
        session: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unable to restore authentication session.',
      });
    });
}

/** Resets shared module auth subscription state between unit tests cleanly. */
export function resetAuthStateForTests(): void {
  authSubscription?.unsubscribe();
  authSubscription = null;
  boundClient = null;
  consumerCount = 0;
  initGeneration += 1;
  notifySnapshot(DEFAULT_SNAPSHOT);
}

/** React hook managing Supabase email/password authentication and live session state. */
export function useAuth(): UseAuthResult {
  const client = createSupabaseClient();
  const isConfigured = client !== null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      snapshotListeners.add(onStoreChange);
      consumerCount += 1;
      bindAuthClient(client);

      return () => {
        snapshotListeners.delete(onStoreChange);
        consumerCount = Math.max(0, consumerCount - 1);
        if (consumerCount === 0) {
          authSubscription?.unsubscribe();
          authSubscription = null;
          boundClient = null;
          initGeneration += 1;
          activeSnapshot = DEFAULT_SNAPSHOT;
        }
      };
    },
    [client],
  );

  const snapshot = useSyncExternalStore(subscribe, getAuthSnapshot);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!hasSupabaseAuth(client) || typeof client.auth.signInWithPassword !== 'function') {
        const message = 'Authentication is unavailable because Supabase is not configured.';
        notifySnapshot({ ...activeSnapshot, isLoading: false, error: message });
        return { user: null, session: null, error: message };
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        notifySnapshot({ ...activeSnapshot, isLoading: false, error: error.message });
        return { user: null, session: null, error: error.message };
      }

      const nextSession = data.session ?? null;
      const nextUser = nextSession?.user ?? data.user ?? null;
      notifySnapshot({
        user: nextUser,
        session: nextSession,
        isLoading: false,
        error: null,
      });

      return {
        user: nextUser,
        session: nextSession,
        error: null,
      };
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string): Promise<AuthActionResult> => {
      if (!hasSupabaseAuth(client) || typeof client.auth.signUp !== 'function') {
        const message = 'Authentication is unavailable because Supabase is not configured.';
        notifySnapshot({ ...activeSnapshot, isLoading: false, error: message });
        return { user: null, session: null, error: message };
      }

      const trimmedName = fullName?.trim() ?? '';
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        ...(trimmedName ? { options: { data: { full_name: trimmedName } } } : {}),
      });

      if (error) {
        notifySnapshot({ ...activeSnapshot, isLoading: false, error: error.message });
        return { user: null, session: null, error: error.message };
      }

      const nextSession = data.session ?? null;
      const createdUser = data.user ?? nextSession?.user ?? null;
      const requiresEmailConfirmation = Boolean(createdUser && !nextSession);

      // Only treat the user as logged in when Supabase issues an active JWT session
      if (nextSession) {
        notifySnapshot({
          user: nextSession.user,
          session: nextSession,
          isLoading: false,
          error: null,
        });
      } else {
        notifySnapshot({
          ...activeSnapshot,
          isLoading: false,
          error: null,
        });
      }

      return {
        user: createdUser,
        session: nextSession,
        error: null,
        requiresEmailConfirmation,
      };
    },
    [client],
  );

  const signOut = useCallback(async (): Promise<{ error: string | null }> => {
    if (!hasSupabaseAuth(client) || typeof client.auth.signOut !== 'function') {
      notifySnapshot(DEFAULT_SNAPSHOT);
      return { error: null };
    }

    const { error } = await client.auth.signOut();
    notifySnapshot({
      user: null,
      session: null,
      isLoading: false,
      error: error ? error.message : null,
    });

    return { error: error ? error.message : null };
  }, [client]);

  return {
    user: snapshot.user,
    session: snapshot.session,
    isLoading: snapshot.isLoading,
    isAuthenticated: snapshot.user !== null && snapshot.session !== null,
    isConfigured,
    error: snapshot.error,
    signIn,
    signUp,
    signOut,
  };
}
