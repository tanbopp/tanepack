// Public SaaS landing page for Tanepack featuring M3 Top App Bar, Hero showcase, 3-card Feature grid, and Footer
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { TopBarAccountActions } from '@widgets/app-shell';
import { useAuth } from '@shared/lib/useAuth';
import { M3Button, M3Icon } from '@shared/ui';

interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const FEATURES: readonly FeatureItem[] = [
  {
    id: 'dieline',
    icon: 'polyline',
    title: '2D Dieline Editor',
    description:
      'Set exact millimeter dimensions and arrange vector graphics or typography over live parametric cut and crease lines.',
  },
  {
    id: 'preview-3d',
    icon: 'view_in_ar',
    title: 'Real-time 3D Preview',
    description:
      'Inspect every fold, flap, and panel texture interactively in 3D as your 2D packaging artwork updates live.',
  },
  {
    id: 'pdf-export',
    icon: 'picture_as_pdf',
    title: 'Print-Ready PDF Export',
    description:
      'Generate exact vector PDF print sheets calibrated to your dieline size, alongside crisp 3D PNG studio renders.',
  },
];

const FOOTER_LINKS: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Templates', to: '/templates' },
  { label: 'Editor', to: '/editor' },
  { label: 'My Designs', to: '/dashboard' },
  { label: 'Log In', to: '/login' },
  { label: 'Get Started', to: '/register' },
];

function BrandMark() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 32,
        height: 32,
        borderRadius: 2,
        display: 'grid',
        placeItems: 'center',
        backgroundColor: 'var(--md-sys-color-primary-container)',
        color: 'var(--md-sys-color-on-primary-container)',
        flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 12L20 7.5M12 12V21M12 12L4 7.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </Box>
  );
}

function CartonShowcaseIllustration() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        borderRadius: 4,
        p: { xs: 2.5, sm: 3.5 },
        background:
          'linear-gradient(145deg, var(--md-sys-color-surface-container-low) 0%, var(--md-sys-color-surface-container-high) 100%)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <M3Icon name="view_in_ar" size={16} />
          <Typography variant="labelSmall" sx={{ color: 'var(--md-sys-color-on-surface)' }}>
            Live 3D Carton
          </Typography>
        </Box>
        <Typography
          variant="labelSmall"
          sx={{
            color: 'var(--md-sys-color-on-surface-variant)',
            fontFamily: 'monospace',
          }}
        >
          120 × 80 × 160 mm
        </Typography>
      </Box>

      <Box
        component="svg"
        viewBox="0 0 420 290"
        sx={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <defs>
          <linearGradient id="tanepackFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--md-sys-color-primary-container)" />
            <stop offset="100%" stopColor="var(--md-sys-color-secondary-container)" />
          </linearGradient>
          <linearGradient id="tanepackSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--md-sys-color-surface-container)" />
            <stop offset="100%" stopColor="var(--md-sys-color-surface-container-high)" />
          </linearGradient>
        </defs>

        {/* Subtle 2D unfolded dieline blueprint footprint beneath 3D carton */}
        <g stroke="var(--md-sys-color-outline-variant)" strokeWidth="1.5" fill="none">
          <rect x="44" y="218" width="332" height="52" rx="4" strokeDasharray="5 4" />
          <line x1="128" y1="218" x2="128" y2="270" strokeDasharray="4 3" />
          <line x1="236" y1="218" x2="236" y2="270" strokeDasharray="4 3" />
          <line x1="306" y1="218" x2="306" y2="270" strokeDasharray="4 3" />
        </g>

        {/* Soft ground shadow */}
        <ellipse
          cx="210"
          cy="242"
          rx="116"
          ry="16"
          fill="var(--md-sys-color-outline-variant)"
          opacity="0.35"
        />

        {/* Tuck-end box top dust lid (open angled flap) */}
        <polygon
          points="126,72 232,40 246,16 140,48"
          fill="var(--md-sys-color-surface-container-lowest)"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Box top opening interior */}
        <polygon
          points="126,72 232,40 302,68 196,100"
          fill="var(--md-sys-color-tertiary-container)"
          stroke="var(--md-sys-color-outline)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Box front panel */}
        <polygon
          points="126,72 196,100 196,238 126,210"
          fill="url(#tanepackSide)"
          stroke="var(--md-sys-color-outline)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Box right main graphic panel */}
        <polygon
          points="196,100 302,68 302,206 196,238"
          fill="url(#tanepackFront)"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Graphic artwork stripes & label accent inside front right panel */}
        <polygon
          points="214,122 284,101 284,148 214,169"
          fill="var(--md-sys-color-surface-container-lowest)"
          opacity="0.88"
        />
        <line
          x1="224"
          y1="138"
          x2="270"
          y2="124"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <line
          x1="224"
          y1="150"
          x2="256"
          y2="140"
          stroke="var(--md-sys-color-secondary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Crease & cut dimension markers */}
        <line
          x1="316"
          y1="68"
          x2="316"
          y2="206"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <circle cx="316" cy="68" r="3" fill="var(--md-sys-color-primary)" />
        <circle cx="316" cy="206" r="3" fill="var(--md-sys-color-primary)" />
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {/* Top SaaS Navigation Bar */}
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
          sx={{
            minHeight: 64,
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              textDecoration: 'none',
              color: 'inherit',
              flexShrink: 0,
            }}
          >
            <BrandMark />
            <Typography
              variant="titleMedium"
              component="span"
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              Tanepack
            </Typography>
          </Box>

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, minWidth: 0 }}
          >
            <M3Button
              m3Variant="text"
              size="small"
              onClick={() => navigate('/templates')}
              sx={{
                minHeight: 36,
                px: { xs: 1.25, sm: 1.75 },
                whiteSpace: 'nowrap',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              Templates
            </M3Button>
            {isAuthenticated && user ? (
              <>
                <M3Button
                  m3Variant="tonal"
                  size="small"
                  onClick={() => navigate('/dashboard')}
                  sx={{ minHeight: 34, px: { xs: 1.5, sm: 2 }, whiteSpace: 'nowrap' }}
                >
                  My Designs
                </M3Button>
                <TopBarAccountActions compact />
              </>
            ) : (
              <>
                <M3Button
                  m3Variant="text"
                  size="small"
                  onClick={() => navigate('/login')}
                  sx={{
                    minHeight: 36,
                    px: { xs: 1.25, sm: 2 },
                    whiteSpace: 'nowrap',
                    color: 'var(--md-sys-color-on-surface)',
                  }}
                >
                  Log In
                </M3Button>
                <M3Button
                  m3Variant="filled"
                  size="small"
                  onClick={() => navigate('/register')}
                  sx={{
                    minHeight: 36,
                    px: { xs: 1.75, sm: 2.5 },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Get Started
                </M3Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box component="main" sx={{ flex: 1 }}>
        {/* Hero Section */}
        <Box
          component="section"
          sx={{
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            pt: { xs: 4, sm: 6, md: 7 },
            pb: { xs: 5, sm: 7, md: 8 },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.12fr) minmax(0, 0.88fr)' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
              <Box
                sx={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 999,
                  backgroundColor: 'var(--md-sys-color-secondary-container)',
                  color: 'var(--md-sys-color-on-secondary-container)',
                }}
              >
                <M3Icon name="view_in_ar" size={16} />
                <Typography variant="labelMedium" component="span">
                  Parametric Packaging Studio
                </Typography>
              </Box>

              <Typography
                variant="displayLarge"
                component="h1"
                sx={{
                  fontSize: { xs: '2.25rem', sm: '2.9rem', md: '3.5625rem' },
                  lineHeight: 1.12,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                Design Packaging in 3D, Instantly.
              </Typography>

              <Typography
                variant="bodyLarge"
                sx={{
                  color: 'var(--md-sys-color-on-surface-variant)',
                  maxWidth: 540,
                }}
              >
                Build accurate parametric carton dielines, apply custom artwork and typography,
                inspect every fold in real-time 3D, and export print-ready vector PDFs in your
                browser.
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
                <M3Button
                  m3Variant="filled"
                  size="large"
                  startIcon={<M3Icon name="polyline" size={20} />}
                  onClick={() => navigate('/editor')}
                >
                  Start Designing
                </M3Button>
                <M3Button
                  m3Variant="tonal"
                  size="large"
                  startIcon={<M3Icon name="grid_view" size={20} />}
                  onClick={() => navigate('/templates')}
                >
                  Browse Templates
                </M3Button>
                <M3Button m3Variant="outlined" size="large" onClick={() => navigate('/dashboard')}>
                  My Designs
                </M3Button>
              </Box>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <CartonShowcaseIllustration />
            </Box>
          </Box>
        </Box>

        {/* Features Section */}
        <Box
          component="section"
          sx={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderTop: '1px solid var(--md-sys-color-outline-variant)',
            py: { xs: 5, sm: 7 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 1200,
              mx: 'auto',
              px: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ mb: 4, maxWidth: 620 }}>
              <Typography
                variant="headlineMedium"
                component="h2"
                sx={{
                  color: 'var(--md-sys-color-on-surface)',
                  fontWeight: 500,
                  mb: 1,
                }}
              >
                Built for structural design to print production
              </Typography>
              <Typography
                variant="bodyMedium"
                sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                Go straight from box geometry and brand graphics to production vector files without
                switching tools.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 2.5,
              }}
            >
              {FEATURES.map((feature) => (
                <Card
                  key={feature.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderColor: 'var(--md-sys-color-outline-variant)',
                    backgroundColor: 'var(--md-sys-color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent
                    sx={{
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.75,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: 'var(--md-sys-color-primary-container)',
                        color: 'var(--md-sys-color-on-primary-container)',
                      }}
                    >
                      <M3Icon name={feature.icon} size={24} />
                    </Box>

                    <Typography
                      variant="titleMedium"
                      component="h3"
                      sx={{
                        color: 'var(--md-sys-color-on-surface)',
                        fontWeight: 600,
                      }}
                    >
                      {feature.title}
                    </Typography>

                    <Typography
                      variant="bodyMedium"
                      sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          backgroundColor: 'var(--md-sys-color-surface)',
          py: 3,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="bodySmall" sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            © 2026 Tanepack. All rights reserved.
          </Typography>

          <Box
            component="nav"
            aria-label="Footer navigation"
            sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 } }}
          >
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.to}
                component={RouterLink}
                to={item.to}
                underline="hover"
                variant="bodySmall"
                sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {item.label}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
