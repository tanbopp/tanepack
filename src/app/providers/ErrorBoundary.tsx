// Global React Class ErrorBoundary catching render errors with an M3 recovery screen
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { M3Button, M3Icon } from '@shared/ui';

export interface ErrorFallbackViewProps {
  onRefresh?: (() => void) | undefined;
}

export function ErrorFallbackView({ onRefresh }: ErrorFallbackViewProps) {
  const handleRefresh = (): void => {
    if (onRefresh) {
      onRefresh();
      return;
    }
    window.location.reload();
  };

  return (
    <Box
      role="alert"
      data-testid="global-error-boundary-fallback"
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
        boxSizing: 'border-box',
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 460,
          width: '100%',
          p: { xs: 3, sm: 4 },
          borderRadius: '24px',
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-on-error-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <M3Icon name="warning" size={28} />
        </Box>
        <Typography variant="headlineMedium" component="h1" color="text.primary">
          Something went wrong
        </Typography>
        <Typography variant="bodyMedium" color="text.secondary">
          An unexpected error interrupted this view. Refresh the page to restore your workspace.
        </Typography>
        <M3Button
          m3Variant="filled"
          startIcon={<M3Icon name="refresh" size={18} />}
          onClick={handleRefresh}
          sx={{ mt: 0.5 }}
        >
          Refresh Page
        </M3Button>
      </Paper>
    </Box>
  );
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  onRefresh?: (() => void) | undefined;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error caught by ErrorBoundary:', error, errorInfo);
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallbackView onRefresh={this.props.onRefresh} />;
  }
}
