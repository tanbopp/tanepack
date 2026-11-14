// Root Tanepack application shell composing global providers and router
import { AppProviders } from '@app/providers';
import { AppRouter } from '@app/router';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
