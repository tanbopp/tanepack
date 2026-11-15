// Unit tests for global React ErrorBoundary recovery fallback
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild(): never {
  throw new Error('Simulated runtime crash');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders child content when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Healthy workspace</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Healthy workspace')).toBeTruthy();
    expect(screen.queryByTestId('global-error-boundary-fallback')).toBeNull();
  });

  it('catches child render errors and triggers refresh handler from M3 button', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRefresh = vi.fn();

    render(
      <ErrorBoundary onRefresh={onRefresh}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();

    const refreshButton = screen.getByRole('button', { name: 'Refresh Page' });
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
