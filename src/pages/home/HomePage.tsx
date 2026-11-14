// Landing page displaying Tanepack welcome message and primary CTA to editor
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { M3Button } from '@shared/ui';

export default function HomePage() {
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
        py: 4,
        gap: 2,
      }}
    >
      <Typography variant="headlineMedium" component="h1" color="text.primary">
        Welcome to Tanepack
      </Typography>
      <Typography variant="bodyLarge" color="text.secondary" sx={{ mb: 1 }}>
        Packaging design for everyone.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
        <M3Button m3Variant="filled" onClick={() => navigate('/dashboard')}>
          My Designs
        </M3Button>
        <M3Button m3Variant="tonal" onClick={() => navigate('/editor')}>
          Open Editor
        </M3Button>
      </Box>
    </Box>
  );
}
