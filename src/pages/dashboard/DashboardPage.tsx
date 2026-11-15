// Material Design 3 project dashboard displaying saved guest carton designs and starter templates
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { type MouseEvent as ReactMouseEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DielinePreviewSvg } from '@widgets/dieline-preview';
import { fetchUserProjects, type ProjectSummary } from '@entities/design-document';
import { TEMPLATES } from '@entities/template';
import { isValidUuid } from '@shared/lib/id';
import { createSupabaseClient } from '@shared/lib/supabase';
import { useAuth } from '@shared/lib/useAuth';
import { M3Button, M3CircularProgress, M3Icon } from '@shared/ui';

function formatUpdatedAt(isoString: string): string {
  if (!isoString) {
    return 'Just now';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ProjectThumbnail({ project }: { project: ProjectSummary }) {
  if (project.designJson) {
    return (
      <DielinePreviewSvg
        dieline={project.designJson.dieline}
        elements={project.designJson.layers.outside}
        showSheetBackdrop
      />
    );
  }

  if (project.thumbnailUrl) {
    return (
      <Box
        component="img"
        src={project.thumbnailUrl}
        alt={`${project.name} thumbnail`}
        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--md-sys-color-on-surface-variant)',
      }}
    >
      <M3Icon name="inventory_2" size={40} />
    </Box>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isSupabaseConfigured = createSupabaseClient() !== null;
  const authUserId = isAuthenticated && user && isValidUuid(user.id) ? user.id : null;
  const [templateMenuAnchorEl, setTemplateMenuAnchorEl] = useState<HTMLElement | null>(null);

  const {
    data: projects = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects', authUserId],
    queryFn: () => fetchUserProjects(authUserId ?? undefined),
    enabled: isSupabaseConfigured && !isAuthLoading && authUserId !== null,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleCreateNew = () => {
    navigate('/editor');
  };

  const handleOpenTemplateMenu = (event: ReactMouseEvent<HTMLElement>) => {
    setTemplateMenuAnchorEl(event.currentTarget);
  };

  const handleCloseTemplateMenu = () => {
    setTemplateMenuAnchorEl(null);
  };

  const handleStartFromTemplate = (templateId: string) => {
    setTemplateMenuAnchorEl(null);
    navigate(`/editor?template=${encodeURIComponent(templateId)}`);
  };

  return (
    <Box
      sx={{
        flex: 1,
        width: '100%',
        maxWidth: 1240,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        boxSizing: 'border-box',
      }}
    >
      {/* Dashboard Header + Start from Template & Create New CTAs */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="headlineSmall" component="h1" color="text.primary">
            My Designs
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary">
            {!isSupabaseConfigured
              ? 'Local mode: connect Supabase in .env.local to sync projects across sessions'
              : isAuthenticated
                ? `${projects.length} saved packaging ${projects.length === 1 ? 'design' : 'designs'}`
                : 'Log in to save and sync your packaging designs across devices'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <M3Button
            m3Variant="tonal"
            aria-haspopup="menu"
            aria-expanded={templateMenuAnchorEl ? 'true' : undefined}
            aria-controls={templateMenuAnchorEl ? 'dashboard-template-menu' : undefined}
            startIcon={<M3Icon name="grid_view" size={18} />}
            endIcon={<M3Icon name="arrow_drop_down" size={18} />}
            onClick={handleOpenTemplateMenu}
          >
            Start from Template
          </M3Button>
          <Menu
            id="dashboard-template-menu"
            anchorEl={templateMenuAnchorEl}
            open={Boolean(templateMenuAnchorEl)}
            onClose={handleCloseTemplateMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {TEMPLATES.map((template) => (
              <MenuItem key={template.id} onClick={() => handleStartFromTemplate(template.id)}>
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '4px',
                      backgroundColor: template.thumbnailColor,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={template.name}
                  secondary={`${template.dimensions.length}×${template.dimensions.width}×${template.dimensions.height} mm`}
                />
              </MenuItem>
            ))}
          </Menu>

          <M3Button
            m3Variant="filled"
            startIcon={<M3Icon name="add" size={20} />}
            onClick={handleCreateNew}
          >
            Create New
          </M3Button>
        </Box>
      </Box>

      {/* Starter Templates Quick-Launch Strip */}
      <Box
        component="section"
        aria-label="Starter templates"
        data-testid="dashboard-templates-section"
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="titleMedium" component="h2" color="text.primary">
              Starter Templates
            </Typography>
            <Typography variant="bodySmall" color="text.secondary">
              Click a preset to customize its dieline and artwork immediately
            </Typography>
          </Box>
          <M3Button
            m3Variant="text"
            size="small"
            endIcon={<M3Icon name="arrow_forward" size={16} />}
            onClick={() => navigate('/templates')}
          >
            Browse Catalog
          </M3Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, minmax(0, 1fr))',
            },
            gap: '16px',
          }}
        >
          {TEMPLATES.map((template) => (
            <ButtonBase
              key={template.id}
              data-testid={`dashboard-template-${template.id}`}
              onClick={() => handleStartFromTemplate(template.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                p: 1.5,
                textAlign: 'left',
                borderRadius: '16px',
                backgroundColor: 'var(--md-sys-color-surface-container-low)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
                '&:hover': {
                  borderColor: 'var(--md-sys-color-primary)',
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: 60,
                  height: 60,
                  flexShrink: 0,
                  borderRadius: '12px',
                  backgroundColor: template.thumbnailColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <M3Icon name="inventory_2" size={26} />
              </Paper>
              <Box
                sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}
              >
                <Typography variant="titleSmall" component="span" color="text.primary" noWrap>
                  {template.name}
                </Typography>
                <Typography variant="bodySmall" color="text.secondary" noWrap>
                  {template.dimensions.length}×{template.dimensions.width}×
                  {template.dimensions.height} mm
                </Typography>
              </Box>
              <Box
                component="span"
                sx={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'inline-flex' }}
              >
                <M3Icon name="arrow_forward" size={18} />
              </Box>
            </ButtonBase>
          ))}
        </Box>
      </Box>

      {/* Content Region */}
      {isSupabaseConfigured && (isAuthLoading || (isAuthenticated && isPending)) ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
          }}
        >
          <M3CircularProgress />
        </Box>
      ) : isSupabaseConfigured && !isAuthenticated ? (
        <Box
          data-testid="dashboard-auth-prompt"
          sx={{
            p: 5,
            borderRadius: '20px',
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            border: '1px dashed var(--md-sys-color-outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1.5,
            minHeight: 260,
          }}
        >
          <M3Icon name="account_circle" size={44} />
          <Typography variant="titleMedium" color="text.primary">
            Log in to view your saved designs
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary" sx={{ maxWidth: 440 }}>
            Sign in or create an account to save boxes to the cloud and access them from any device.
            You can still use Starter Templates in Guest Mode.
          </Typography>
          <Box
            sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mt: 1 }}
          >
            <M3Button
              m3Variant="filled"
              startIcon={<M3Icon name="login" size={18} />}
              onClick={() => navigate('/login')}
            >
              Log In
            </M3Button>
            <M3Button
              m3Variant="tonal"
              startIcon={<M3Icon name="person_add" size={18} />}
              onClick={() => navigate('/register')}
            >
              Create Account
            </M3Button>
            <M3Button m3Variant="text" onClick={handleCreateNew}>
              Try Editor as Guest
            </M3Button>
          </Box>
        </Box>
      ) : isError ? (
        <Box
          sx={{
            p: 3,
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-on-error-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="bodyMedium">
            {error instanceof Error ? error.message : 'Unable to load saved designs.'}
          </Typography>
          <M3Button
            m3Variant="tonal"
            onClick={() => {
              void refetch();
            }}
          >
            Retry
          </M3Button>
        </Box>
      ) : projects.length === 0 ? (
        <Box
          sx={{
            p: 5,
            borderRadius: '20px',
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            border: '1px dashed var(--md-sys-color-outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1.5,
            minHeight: 260,
          }}
        >
          <M3Icon name="inventory_2" size={44} />
          <Typography variant="titleMedium" color="text.primary">
            No saved designs yet
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary" sx={{ maxWidth: 420 }}>
            Start a fresh tuck-end box carton in the 2D/3D editor and your edits will save here
            automatically.
          </Typography>
          <M3Button
            m3Variant="filled"
            startIcon={<M3Icon name="add" size={20} />}
            onClick={handleCreateNew}
            sx={{ mt: 1 }}
          >
            Create New
          </M3Button>
        </Box>
      ) : (
        <Box
          data-testid="dashboard-projects-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: '16px',
          }}
        >
          {projects.map((project) => {
            const dims = project.designJson?.dieline.dimensions;
            return (
              <Box
                key={project.id}
                data-testid={`project-card-${project.id}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--md-sys-color-surface-container-low)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  '&:hover': {
                    borderColor: 'var(--md-sys-color-primary)',
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
                  },
                }}
              >
                {/* Miniature 2D Dieline + Artwork Thumbnail */}
                <Box
                  sx={{
                    height: 164,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <ProjectThumbnail project={project} />
                </Box>

                {/* Metadata + Open CTA */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="titleMedium" component="h2" noWrap title={project.name}>
                      {project.name}
                    </Typography>
                    <Typography variant="bodySmall" color="text.secondary" noWrap>
                      Updated {formatUpdatedAt(project.updatedAt)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography variant="labelSmall" color="text.secondary" noWrap>
                      {dims
                        ? `${dims.length} × ${dims.width} × ${dims.height} mm`
                        : 'Folding Carton'}
                    </Typography>

                    <M3Button
                      m3Variant="tonal"
                      size="small"
                      startIcon={<M3Icon name="open_in_new" size={16} />}
                      onClick={() => navigate(`/editor?id=${project.id}`)}
                      sx={{ minHeight: 32, px: 1.75, flexShrink: 0 }}
                    >
                      Open
                    </M3Button>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
