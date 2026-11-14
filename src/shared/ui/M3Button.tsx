// M3-styled wrapper around MUI Button with pill shape and M3 state layer tokens
import Button, { type ButtonProps } from '@mui/material/Button';

export type M3ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

export interface M3ButtonProps extends Omit<ButtonProps, 'variant'> {
  m3Variant?: M3ButtonVariant | undefined;
}

export function M3Button({ m3Variant = 'filled', size = 'medium', sx, ...rest }: M3ButtonProps) {
  const muiVariant: ButtonProps['variant'] =
    m3Variant === 'outlined' ? 'outlined' : m3Variant === 'text' ? 'text' : 'contained';

  const tonalStyles =
    m3Variant === 'tonal'
      ? {
          backgroundColor: 'var(--md-sys-color-secondary-container)',
          color: 'var(--md-sys-color-on-secondary-container)',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: 'var(--md-sys-color-secondary-container)',
            boxShadow: 'none',
          },
        }
      : {};

  return (
    <Button
      variant={muiVariant}
      size={size}
      disableElevation
      sx={[
        {
          borderRadius: '9999px',
          textTransform: 'none',
          fontWeight: 500,
          px: 3,
          minHeight: 40,
        },
        tonalStyles,
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    />
  );
}
