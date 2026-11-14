// Sticky M3 TopAppBar with Tanepack wordmark, optional back arrow, and action icons
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { M3IconButton } from '@shared/ui';

export interface TopBarProps {
  title?: string | undefined;
  showBackButton?: boolean | undefined;
}

export function TopBar({ title = 'Tanepack', showBackButton = false }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        height: 64,
        justifyContent: 'center',
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 }, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showBackButton && (
            <M3IconButton icon="arrow_back" label="Back to home" onClick={() => navigate('/')} />
          )}
          <Typography
            variant="labelLarge"
            component="span"
            sx={{
              color: 'var(--md-sys-color-on-surface)',
              letterSpacing: '0.02em',
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <M3IconButton icon="settings" label="Settings" disabled tooltip="Coming soon" />
          <M3IconButton icon="help" label="Help" disabled tooltip="Coming soon" />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
