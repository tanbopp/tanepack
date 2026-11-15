// Shared Material Design 3 centered card layout for Login and Register pages
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { FormEvent, ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { M3Button, M3Icon } from '@shared/ui';

export interface AuthCardLayoutProps {
  title: string;
  subtitle: string;
  icon: string;
  errorMessage?: string | null | undefined;
  infoMessage?: string | null | undefined;
  isConfigured: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  children: ReactNode;
}

export function AuthCardLayout({
  title,
  subtitle,
  icon,
  errorMessage,
  infoMessage,
  isConfigured,
  onSubmit,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children,
}: AuthCardLayoutProps) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: '24px',
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          border: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        <CardContent
          sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <M3Icon name={icon} size={26} />
            </Box>
            <Typography variant="headlineSmall" component="h1" color="text.primary" align="center">
              {title}
            </Typography>
            <Typography variant="bodyMedium" color="text.secondary" align="center">
              {subtitle}
            </Typography>
          </Box>

          {!isConfigured && (
            <Alert severity="warning" sx={{ borderRadius: '12px' }}>
              Supabase is not configured in .env.local. Use Guest Mode in the editor to design
              locally.
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" role="alert" sx={{ borderRadius: '12px' }}>
              {errorMessage}
            </Alert>
          )}

          {infoMessage && (
            <Alert severity="info" role="status" sx={{ borderRadius: '12px' }}>
              {infoMessage}
            </Alert>
          )}

          <Box
            component="form"
            noValidate
            onSubmit={onSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {children}
          </Box>

          <Divider />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="bodyMedium" color="text.secondary">
              {footerText}{' '}
              <Box
                component={RouterLink}
                to={footerLinkTo}
                sx={{
                  color: 'var(--md-sys-color-primary)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {footerLinkLabel}
              </Box>
            </Typography>

            <M3Button
              m3Variant="text"
              size="small"
              onClick={() => navigate('/editor')}
              sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Continue in Guest Mode
            </M3Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
