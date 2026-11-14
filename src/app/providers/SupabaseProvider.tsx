// React context exposing the optional Supabase client initialized from runtime env
import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { createSupabaseClient } from '@shared/lib/supabase';

export interface SupabaseContextValue {
  client: SupabaseClient | null;
  isConfigured: boolean;
}

const SupabaseContext = createContext<SupabaseContextValue>({
  client: null,
  isConfigured: false,
});

export interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const value = useMemo<SupabaseContextValue>(() => {
    const client = createSupabaseClient();
    return {
      client,
      isConfigured: client !== null,
    };
  }, []);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

/** Returns the nullable Supabase client context for Phase 1+ data features. */
export function useSupabase(): SupabaseContextValue {
  return useContext(SupabaseContext);
}
