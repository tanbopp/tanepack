// Sticky M3 TopAppBar with Tanepack wordmark, optional back arrow, and account actions
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useLocation, useNavigate } from 'react-router-dom';
import { M3Button, M3Icon, M3IconButton } from '@shared/ui';
import { TopBarAccountActions } from './TopBarAccountActions';

export interface TopBarProps {
  title?: string | undefined;
  showBackButton?: boolean | undefined;
}

export function TopBar({ title = 'Tanepack', showBackButton = false }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

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
      <Toolbar
        sx={{ minHeight: 64, px: { xs: 2, sm: 3 }, justifyContent: 'space-between', gap: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {showBackButton && (
            <M3IconButton icon="arrow_back" label="Back to home" onClick={() => navigate('/')} />
          )}
          <Typography
            variant="labelLarge"
            component="span"
            noWrap
            sx={{
              color: 'var(--md-sys-color-on-surface)',
              letterSpacing: '0.02em',
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <M3Button
            m3Variant={location.pathname === '/templates' ? 'tonal' : 'text'}
            size="small"
            startIcon={<M3Icon name="grid_view" size={18} />}
            onClick={() => navigate('/templates')}
            sx={{ minHeight: 34, px: 1.5, flexShrink: 0 }}
          >
            Templates
          </M3Button>
          <TopBarAccountActions hideLoginButton={isAuthPage} />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
