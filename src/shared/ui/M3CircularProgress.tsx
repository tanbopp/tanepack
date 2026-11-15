// M3-themed circular loading indicator for lazy route Suspense fallbacks
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export interface M3CircularProgressProps {
  size?: number | undefined;
  label?: string | undefined;
}

export function M3CircularProgress({ size = 36, label }: M3CircularProgressProps) {
  return (
    <Box
      role="status"
      aria-label={label ?? 'Loading'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minHeight: 'calc(100vh - 64px)',
        width: '100%',
      }}
    >
      <CircularProgress size={size} color="primary" />
      {label && (
        <Typography variant="bodyMedium" color="text.secondary">
          {label}
        </Typography>
      )}
    </Box>
  );
}
