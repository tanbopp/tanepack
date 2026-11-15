// Shared TopAppBar account controls showing Log In CTA when signed out or avatar/email + Log Out when signed in
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { QueryClientContext } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/lib/useAuth';
import { M3Button, M3Icon } from '@shared/ui';

export interface TopBarAccountActionsProps {
  compact?: boolean | undefined;
  hideLoginButton?: boolean | undefined;
}

export function TopBarAccountActions({
  compact = false,
  hideLoginButton = false,
}: TopBarAccountActionsProps) {
  const navigate = useNavigate();
  const queryClient = useContext(QueryClientContext);
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    if (hideLoginButton) {
      return null;
    }

    return (
      <M3Button
        m3Variant="tonal"
        size="small"
        startIcon={<M3Icon name="login" size={18} />}
        onClick={() => navigate('/login')}
        sx={{ minHeight: compact ? 32 : 36, px: compact ? 1.75 : 2.25, flexShrink: 0 }}
      >
        Log In
      </M3Button>
    );
  }

  const email = user.email ?? '';
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : '';
  const avatarInitial = (fullName || email || 'U').charAt(0).toUpperCase();

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      await signOut();
      queryClient?.removeQueries({ queryKey: ['projects'] });
      queryClient?.removeQueries({ queryKey: ['project'] });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Box
      data-testid="topbar-account-info"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 0.75 : 1.25, minWidth: 0 }}
    >
      <Avatar
        data-testid="topbar-user-avatar"
        sx={{
          width: compact ? 28 : 32,
          height: compact ? 28 : 32,
          fontSize: compact ? '0.78rem' : '0.85rem',
          fontWeight: 600,
          backgroundColor: 'var(--md-sys-color-primary-container)',
          color: 'var(--md-sys-color-on-primary-container)',
          flexShrink: 0,
        }}
      >
        {avatarInitial}
      </Avatar>
      {email && (
        <Typography
          variant="labelMedium"
          component="span"
          data-testid="topbar-user-email"
          noWrap
          title={email}
          sx={{
            display: { xs: 'none', sm: 'inline' },
            maxWidth: compact ? 150 : 220,
            color: 'var(--md-sys-color-on-surface)',
            fontWeight: 500,
          }}
        >
          {email}
        </Typography>
      )}
      <M3Button
        m3Variant="outlined"
        size="small"
        disabled={isSigningOut}
        startIcon={<M3Icon name="logout" size={16} />}
        onClick={() => {
          void handleSignOut();
        }}
        sx={{
          minHeight: compact ? 32 : 34,
          px: compact ? 1.5 : 1.75,
          flexShrink: 0,
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        Log Out
      </M3Button>
    </Box>
  );
}
