// M3 404 fallback page with navigation back to HomePage
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { M3Button } from '@shared/ui';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        gap: 2,
      }}
    >
      <Typography variant="headlineLarge" component="h1" color="text.primary">
        404
      </Typography>
      <Typography variant="bodyLarge" color="text.secondary" sx={{ mb: 1 }}>
        Page not found
      </Typography>
      <M3Button m3Variant="tonal" onClick={() => navigate('/')}>
        Go home
      </M3Button>
    </Box>
  );
}
