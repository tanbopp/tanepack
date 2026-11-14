// Material Design 3 design tokens generated via @material/material-color-utilities
import {
  argbFromHex,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeTonalSpot,
} from '@material/material-color-utilities';

export const DEFAULT_SEED_COLOR = '#7B5E3B';

export interface M3ColorRoles {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
  shadow: string;
}

const mdc = new MaterialDynamicColors();

/** Generates a complete M3 tonal spot color scheme from a hex seed color. */
export function generateM3ColorScheme(
  seedHex: string = DEFAULT_SEED_COLOR,
  isDark = false,
): M3ColorRoles {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const scheme = new SchemeTonalSpot(hct, isDark, 0.0);

  return {
    primary: hexFromArgb(mdc.primary().getArgb(scheme)),
    onPrimary: hexFromArgb(mdc.onPrimary().getArgb(scheme)),
    primaryContainer: hexFromArgb(mdc.primaryContainer().getArgb(scheme)),
    onPrimaryContainer: hexFromArgb(mdc.onPrimaryContainer().getArgb(scheme)),
    secondary: hexFromArgb(mdc.secondary().getArgb(scheme)),
    onSecondary: hexFromArgb(mdc.onSecondary().getArgb(scheme)),
    secondaryContainer: hexFromArgb(mdc.secondaryContainer().getArgb(scheme)),
    onSecondaryContainer: hexFromArgb(mdc.onSecondaryContainer().getArgb(scheme)),
    tertiary: hexFromArgb(mdc.tertiary().getArgb(scheme)),
    onTertiary: hexFromArgb(mdc.onTertiary().getArgb(scheme)),
    tertiaryContainer: hexFromArgb(mdc.tertiaryContainer().getArgb(scheme)),
    onTertiaryContainer: hexFromArgb(mdc.onTertiaryContainer().getArgb(scheme)),
    error: hexFromArgb(mdc.error().getArgb(scheme)),
    onError: hexFromArgb(mdc.onError().getArgb(scheme)),
    errorContainer: hexFromArgb(mdc.errorContainer().getArgb(scheme)),
    onErrorContainer: hexFromArgb(mdc.onErrorContainer().getArgb(scheme)),
    surface: hexFromArgb(mdc.surface().getArgb(scheme)),
    onSurface: hexFromArgb(mdc.onSurface().getArgb(scheme)),
    surfaceVariant: hexFromArgb(mdc.surfaceVariant().getArgb(scheme)),
    onSurfaceVariant: hexFromArgb(mdc.onSurfaceVariant().getArgb(scheme)),
    surfaceContainerLowest: hexFromArgb(mdc.surfaceContainerLowest().getArgb(scheme)),
    surfaceContainerLow: hexFromArgb(mdc.surfaceContainerLow().getArgb(scheme)),
    surfaceContainer: hexFromArgb(mdc.surfaceContainer().getArgb(scheme)),
    surfaceContainerHigh: hexFromArgb(mdc.surfaceContainerHigh().getArgb(scheme)),
    surfaceContainerHighest: hexFromArgb(mdc.surfaceContainerHighest().getArgb(scheme)),
    outline: hexFromArgb(mdc.outline().getArgb(scheme)),
    outlineVariant: hexFromArgb(mdc.outlineVariant().getArgb(scheme)),
    inverseSurface: hexFromArgb(mdc.inverseSurface().getArgb(scheme)),
    inverseOnSurface: hexFromArgb(mdc.inverseOnSurface().getArgb(scheme)),
    inversePrimary: hexFromArgb(mdc.inversePrimary().getArgb(scheme)),
    scrim: '#000000',
    shadow: '#000000',
  };
}

export const LIGHT_COLOR_SCHEME: M3ColorRoles = generateM3ColorScheme(DEFAULT_SEED_COLOR, false);
export const DARK_COLOR_SCHEME: M3ColorRoles = generateM3ColorScheme(DEFAULT_SEED_COLOR, true);

export const M3_FONT_FAMILY =
  "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const M3_TYPOGRAPHY = {
  displayLarge: {
    fontSize: '3.5625rem',
    lineHeight: 1.12,
    fontWeight: 400,
    letterSpacing: '-0.015625rem',
  },
  displayMedium: { fontSize: '2.8125rem', lineHeight: 1.16, fontWeight: 400, letterSpacing: '0' },
  displaySmall: { fontSize: '2.25rem', lineHeight: 1.22, fontWeight: 400, letterSpacing: '0' },
  headlineLarge: { fontSize: '2rem', lineHeight: 1.25, fontWeight: 500, letterSpacing: '0' },
  headlineMedium: { fontSize: '1.75rem', lineHeight: 1.29, fontWeight: 500, letterSpacing: '0' },
  headlineSmall: { fontSize: '1.5rem', lineHeight: 1.33, fontWeight: 500, letterSpacing: '0' },
  titleLarge: { fontSize: '1.375rem', lineHeight: 1.27, fontWeight: 500, letterSpacing: '0' },
  titleMedium: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 500, letterSpacing: '0.009375rem' },
  titleSmall: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
    fontWeight: 500,
    letterSpacing: '0.00625rem',
  },
  bodyLarge: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400, letterSpacing: '0.03125rem' },
  bodyMedium: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
    fontWeight: 400,
    letterSpacing: '0.015625rem',
  },
  bodySmall: { fontSize: '0.75rem', lineHeight: 1.33, fontWeight: 400, letterSpacing: '0.025rem' },
  labelLarge: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
    fontWeight: 500,
    letterSpacing: '0.00625rem',
  },
  labelMedium: {
    fontSize: '0.75rem',
    lineHeight: 1.33,
    fontWeight: 500,
    letterSpacing: '0.03125rem',
  },
  labelSmall: {
    fontSize: '0.6875rem',
    lineHeight: 1.45,
    fontWeight: 500,
    letterSpacing: '0.03125rem',
  },
} as const;

export const M3_SHAPE = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
} as const;

export const M3_ELEVATION = {
  level0: 'none',
  level1: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
  level2: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  level3: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
  level4: '0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
  level5: '0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
} as const;

export const M3_MOTION = {
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
    standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },
  duration: {
    short1: 50,
    short2: 100,
    short3: 150,
    short4: 200,
    medium1: 250,
    medium2: 300,
    medium3: 350,
    medium4: 400,
    long1: 450,
    long2: 500,
  },
} as const;

export const M3_STATE_LAYERS = {
  hoverOpacity: 0.08,
  focusOpacity: 0.12,
  pressedOpacity: 0.12,
  draggedOpacity: 0.16,
  disabledOpacity: 0.12,
} as const;

/** Syncs the active M3 color roles onto document CSS custom properties. */
export function applyM3CssVariables(
  scheme: M3ColorRoles,
  root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null,
): void {
  if (!root) {
    return;
  }

  for (const [key, value] of Object.entries(scheme)) {
    const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--md-sys-color-${kebab}`, value);
  }
}
