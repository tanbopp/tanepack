// Minimal Phase 0 editor placeholder shell before Step 2 box generator
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function EditorPage() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
      }}
    >
      <Typography variant="bodyLarge" color="text.secondary">
        Editor coming in Step 2.
      </Typography>
    </Box>
  );
}
