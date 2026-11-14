// Root provider composition combining theme, TanStack Query, and Supabase contexts
import type { ReactNode } from 'react';
import { QueryProvider } from '@app/providers/QueryProvider';
import { SupabaseProvider } from '@app/providers/SupabaseProvider';
import { AppThemeProvider } from '@app/providers/ThemeProvider';

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppThemeProvider>
      <QueryProvider>
        <SupabaseProvider>{children}</SupabaseProvider>
      </QueryProvider>
    </AppThemeProvider>
  );
}
