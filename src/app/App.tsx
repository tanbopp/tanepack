// Root Tanepack application shell composing global providers, ErrorBoundary, and router
import { AppProviders, ErrorBoundary } from '@app/providers';
import { AppRouter } from '@app/router';

export function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </AppProviders>
  );
}
