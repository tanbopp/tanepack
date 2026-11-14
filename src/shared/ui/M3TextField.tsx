// M3-styled Outlined TextField wrapper using Tanepack shape and surface tokens
import TextField, { type TextFieldProps } from '@mui/material/TextField';

export type M3TextFieldProps = Omit<TextFieldProps, 'variant'>;

export function M3TextField({ size = 'small', fullWidth = true, sx, ...rest }: M3TextFieldProps) {
  return (
    <TextField
      variant="outlined"
      size={size}
      fullWidth={fullWidth}
      sx={[
        {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
            color: 'var(--md-sys-color-on-surface)',
            '& fieldset': {
              borderColor: 'var(--md-sys-color-outline)',
            },
            '&:hover fieldset': {
              borderColor: 'var(--md-sys-color-on-surface)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--md-sys-color-primary)',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'var(--md-sys-color-on-surface-variant)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'var(--md-sys-color-primary)',
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    />
  );
}
