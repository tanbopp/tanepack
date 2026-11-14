// Material Design 3 project dashboard displaying saved guest carton designs in a responsive grid
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchUserProjects, type Project, type ProjectSummary } from '@entities/design-document';
import { isValidUuid } from '@shared/lib/id';
import { createSupabaseClient } from '@shared/lib/supabase';
import { useGuestSession } from '@shared/lib/useGuestSession';
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

function ProjectSvgPreview({ project }: { project: Project }) {
  const pad = 8;
  const width = Math.max(10, project.dieline.totalWidth);
  const height = Math.max(10, project.dieline.totalHeight);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <rect
        x={0}
        y={0}
        width={project.dieline.totalWidth}
        height={project.dieline.totalHeight}
        rx={2}
        fill="#ffffff"
      />
      <g>
        {project.dieline.folds.map((fold) => (
          <line
            key={fold.id}
            x1={fold.from.x}
            y1={fold.from.y}
            x2={fold.to.x}
            y2={fold.to.y}
            stroke="#1976d2"
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
        ))}
      </g>
      <g>
        {project.dieline.cuts.map((cut) => (
          <path key={cut.id} d={cut.path} fill="none" stroke="#1b1b1f" strokeWidth={0.9} />
        ))}
      </g>
      <g>
        {project.layers.outside.map((el) => {
          if (el.type === 'text') {
            const transform =
              el.transform.rotation !== 0
                ? `rotate(${el.transform.rotation} ${el.transform.x} ${el.transform.y})`
                : undefined;
            return (
              <text
                key={el.id}
                x={el.transform.x}
                y={el.transform.y}
                fontFamily={el.style.fontFamily}
                fontSize={el.style.fontSize}
                fontWeight={el.style.fontWeight}
                fill={el.style.color}
                opacity={el.opacity}
                textAnchor="middle"
                dominantBaseline="central"
                transform={transform}
              >
                {el.content}
              </text>
            );
          }

          if (el.type === 'image') {
            const cx = el.transform.x + el.transform.width * 0.5;
            const cy = el.transform.y + el.transform.height * 0.5;
            const transform =
              el.transform.rotation !== 0
                ? `rotate(${el.transform.rotation} ${cx} ${cy})`
                : undefined;
            return (
              <image
                key={el.id}
                href={el.src}
                x={el.transform.x}
                y={el.transform.y}
                width={el.transform.width}
                height={el.transform.height}
                preserveAspectRatio="xMidYMid meet"
                opacity={el.opacity}
                transform={transform}
              />
            );
          }

          return null;
        })}
      </g>
    </svg>
  );
}

function ProjectThumbnail({ project }: { project: ProjectSummary }) {
  if (project.designJson) {
    return <ProjectSvgPreview project={project.designJson} />;
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
  const guestId = useGuestSession();
  const isSupabaseConfigured = createSupabaseClient() !== null;

  const {
    data: projects = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects', guestId],
    queryFn: () => fetchUserProjects(guestId),
    enabled: isSupabaseConfigured && isValidUuid(guestId),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleCreateNew = () => {
    navigate('/editor');
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
      {/* Dashboard Header + Create New CTA */}
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
            {isSupabaseConfigured
              ? `${projects.length} saved packaging ${projects.length === 1 ? 'design' : 'designs'}`
              : 'Local mode: connect Supabase in .env.local to sync projects across sessions'}
          </Typography>
        </Box>

        <M3Button
          m3Variant="filled"
          startIcon={<M3Icon name="add" size={20} />}
          onClick={handleCreateNew}
        >
          Create New
        </M3Button>
      </Box>

      {/* Content Region */}
      {isSupabaseConfigured && isPending ? (
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
