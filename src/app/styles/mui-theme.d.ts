// MUI v6 module augmentations for M3 color roles, type scale, shape, motion, and state layers
import type {
  M3_ELEVATION,
  M3_MOTION,
  M3_SHAPE,
  M3_STATE_LAYERS,
  M3ColorRoles,
} from '@app/styles/tokens';

type M3ExtensionPaletteRoles = Omit<M3ColorRoles, 'primary' | 'secondary' | 'error'>;

export interface M3ShapeScale {
  borderRadius: number;
  none: number;
  extraSmall: number;
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
  full: number;
}

declare module '@mui/material/styles' {
  interface TypeAction {
    pressedOpacity: number;
    draggedOpacity: number;
    stateLayers: typeof M3_STATE_LAYERS;
  }

  interface Palette extends M3ExtensionPaletteRoles {
    m3: M3ColorRoles;
  }

  interface PaletteOptions extends Partial<M3ExtensionPaletteRoles> {
    m3?: M3ColorRoles | undefined;
  }

  interface TypographyVariants {
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
    displaySmall: React.CSSProperties;
    headlineLarge: React.CSSProperties;
    headlineMedium: React.CSSProperties;
    headlineSmall: React.CSSProperties;
    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;
    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    displayLarge?: React.CSSProperties | undefined;
    displayMedium?: React.CSSProperties | undefined;
    displaySmall?: React.CSSProperties | undefined;
    headlineLarge?: React.CSSProperties | undefined;
    headlineMedium?: React.CSSProperties | undefined;
    headlineSmall?: React.CSSProperties | undefined;
    titleLarge?: React.CSSProperties | undefined;
    titleMedium?: React.CSSProperties | undefined;
    titleSmall?: React.CSSProperties | undefined;
    bodyLarge?: React.CSSProperties | undefined;
    bodyMedium?: React.CSSProperties | undefined;
    bodySmall?: React.CSSProperties | undefined;
    labelLarge?: React.CSSProperties | undefined;
    labelMedium?: React.CSSProperties | undefined;
    labelSmall?: React.CSSProperties | undefined;
  }

  interface Transitions {
    m3Easing: typeof M3_MOTION.easing;
    m3Duration: typeof M3_MOTION.duration;
  }

  interface TransitionsOptions {
    m3Easing?: typeof M3_MOTION.easing | undefined;
    m3Duration?: typeof M3_MOTION.duration | undefined;
  }

  interface Theme {
    shape: M3ShapeScale;
    m3Elevation: typeof M3_ELEVATION;
  }

  interface ThemeOptions {
    shape?: Partial<typeof M3_SHAPE> & { borderRadius?: number | undefined };
    m3Elevation?: typeof M3_ELEVATION | undefined;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    displayLarge: true;
    displayMedium: true;
    displaySmall: true;
    headlineLarge: true;
    headlineMedium: true;
    headlineSmall: true;
    titleLarge: true;
    titleMedium: true;
    titleSmall: true;
    bodyLarge: true;
    bodyMedium: true;
    bodySmall: true;
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}
