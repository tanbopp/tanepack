// MUI ThemeProvider binding Material Design 3 tokens and CSS custom properties
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { type ReactNode, useEffect, useMemo } from 'react';
import {
  applyM3CssVariables,
  generateM3ColorScheme,
  M3_ELEVATION,
  M3_FONT_FAMILY,
  M3_MOTION,
  M3_SHAPE,
  M3_STATE_LAYERS,
  M3_TYPOGRAPHY,
} from '@app/styles/tokens';
import '@app/styles/mui-theme.d';
import { env } from '@shared/config/env';

export interface AppThemeProviderProps {
  children: ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const colorScheme = useMemo(() => generateM3ColorScheme(env.seedColor, false), []);

  useEffect(() => {
    applyM3CssVariables(colorScheme);
  }, [colorScheme]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: {
            main: colorScheme.primary,
            contrastText: colorScheme.onPrimary,
          },
          secondary: {
            main: colorScheme.secondary,
            contrastText: colorScheme.onSecondary,
          },
          error: {
            main: colorScheme.error,
            contrastText: colorScheme.onError,
          },
          background: {
            default: colorScheme.surface,
            paper: colorScheme.surfaceContainerLow,
          },
          text: {
            primary: colorScheme.onSurface,
            secondary: colorScheme.onSurfaceVariant,
          },
          divider: colorScheme.outlineVariant,
          action: {
            hoverOpacity: M3_STATE_LAYERS.hoverOpacity,
            focusOpacity: M3_STATE_LAYERS.focusOpacity,
            pressedOpacity: M3_STATE_LAYERS.pressedOpacity,
            draggedOpacity: M3_STATE_LAYERS.draggedOpacity,
            stateLayers: M3_STATE_LAYERS,
          },
          m3: colorScheme,
          onPrimary: colorScheme.onPrimary,
          primaryContainer: colorScheme.primaryContainer,
          onPrimaryContainer: colorScheme.onPrimaryContainer,
          onSecondary: colorScheme.onSecondary,
          secondaryContainer: colorScheme.secondaryContainer,
          onSecondaryContainer: colorScheme.onSecondaryContainer,
          tertiary: colorScheme.tertiary,
          onTertiary: colorScheme.onTertiary,
          tertiaryContainer: colorScheme.tertiaryContainer,
          onTertiaryContainer: colorScheme.onTertiaryContainer,
          onError: colorScheme.onError,
          errorContainer: colorScheme.errorContainer,
          onErrorContainer: colorScheme.onErrorContainer,
          surface: colorScheme.surface,
          onSurface: colorScheme.onSurface,
          surfaceVariant: colorScheme.surfaceVariant,
          onSurfaceVariant: colorScheme.onSurfaceVariant,
          surfaceContainerLowest: colorScheme.surfaceContainerLowest,
          surfaceContainerLow: colorScheme.surfaceContainerLow,
          surfaceContainer: colorScheme.surfaceContainer,
          surfaceContainerHigh: colorScheme.surfaceContainerHigh,
          surfaceContainerHighest: colorScheme.surfaceContainerHighest,
          outline: colorScheme.outline,
          outlineVariant: colorScheme.outlineVariant,
          inverseSurface: colorScheme.inverseSurface,
          inverseOnSurface: colorScheme.inverseOnSurface,
          inversePrimary: colorScheme.inversePrimary,
          scrim: colorScheme.scrim,
          shadow: colorScheme.shadow,
        },
        typography: {
          fontFamily: M3_FONT_FAMILY,
          ...M3_TYPOGRAPHY,
        },
        shape: {
          borderRadius: M3_SHAPE.medium,
          ...M3_SHAPE,
        },
        transitions: {
          easing: {
            easeInOut: M3_MOTION.easing.standard,
            easeOut: M3_MOTION.easing.standardDecelerate,
            easeIn: M3_MOTION.easing.standardAccelerate,
            sharp: M3_MOTION.easing.emphasized,
          },
          duration: {
            shortest: M3_MOTION.duration.short2,
            shorter: M3_MOTION.duration.short3,
            short: M3_MOTION.duration.short4,
            standard: M3_MOTION.duration.medium2,
            complex: M3_MOTION.duration.medium4,
            enteringScreen: M3_MOTION.duration.medium1,
            leavingScreen: M3_MOTION.duration.short4,
          },
          m3Easing: M3_MOTION.easing,
          m3Duration: M3_MOTION.duration,
        },
        m3Elevation: M3_ELEVATION,
        components: {
          MuiButtonBase: {
            defaultProps: {
              disableRipple: false,
            },
          },
        },
      }),
    [colorScheme],
  );

  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
}
