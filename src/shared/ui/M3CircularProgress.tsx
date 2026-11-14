// M3-themed circular loading indicator for lazy route Suspense fallbacks
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export interface M3CircularProgressProps {
  size?: number | undefined;
}

export function M3CircularProgress({ size = 36 }: M3CircularProgressProps) {
  return (
    <Box
      role="status"
      aria-label="Loading"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        width: '100%',
      }}
    >
      <CircularProgress size={size} color="primary" />
    </Box>
  );
}
