// Public Material Design 3 packaging model catalog page with live SVG dieline previews and deep-linking to /editor
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DielinePreviewSvg } from '@widgets/dieline-preview';
import { type Dieline, generateDieline } from '@entities/dieline';
import { PACKAGING_CATALOG_MODELS, type PackagingCatalogModel } from '@entities/template';
import { M3Button, M3Icon } from '@shared/ui';

interface CatalogCardEntry {
  model: PackagingCatalogModel;
  dieline: Dieline;
}

const DEFAULT_THICKNESS_MM = 0.5;
const DEFAULT_BLEED_MM = 3;

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo<readonly string[]>(
    () => ['All', ...Array.from(new Set(PACKAGING_CATALOG_MODELS.map((model) => model.category)))],
    [],
  );

  const catalogEntries = useMemo<readonly CatalogCardEntry[]>(
    () =>
      PACKAGING_CATALOG_MODELS.filter(
        (model) => selectedCategory === 'All' || model.category === selectedCategory,
      ).map((model) => ({
        model,
        dieline: generateDieline(model.archetype, {
          ...model.defaultDimensions,
          thickness: DEFAULT_THICKNESS_MM,
          bleedSize: DEFAULT_BLEED_MM,
        }),
      })),
    [selectedCategory],
  );

  const handleCustomize = (model: PackagingCatalogModel) => {
    const params = new URLSearchParams({
      archetype: model.archetype,
      l: String(model.defaultDimensions.length),
      w: String(model.defaultDimensions.width),
      h: String(model.defaultDimensions.height),
    });
    navigate(`/editor?${params.toString()}`);
  };

  return (
    <Box
      sx={{
        flex: 1,
        width: '100%',
        maxWidth: 1240,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        boxSizing: 'border-box',
      }}
    >
      {/* Catalog Page Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'flex-end' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxWidth: 660 }}>
          <Typography variant="headlineMedium" component="h1" color="text.primary">
            Packaging Models
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary">
            Explore parametric structural dieline standards and customize dimensions, artwork, and
            3D folds directly in the editor.
          </Typography>
        </Box>

        <M3Button
          m3Variant="tonal"
          startIcon={<M3Icon name="polyline" size={18} />}
          onClick={() => navigate('/editor')}
        >
          Blank Editor
        </M3Button>
      </Box>

      {/* Category Filter Strip */}
      <Box
        role="group"
        aria-label="Catalog categories"
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <Chip
              key={category}
              label={category}
              clickable
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              onClick={() => setSelectedCategory(category)}
              sx={{ borderRadius: '9999px', fontWeight: isSelected ? 600 : 500 }}
            />
          );
        })}
      </Box>

      {/* Responsive M3 Catalog Grid */}
      <Box
        data-testid="templates-catalog-grid"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        {catalogEntries.map(({ model, dieline }) => (
          <Card
            key={model.id}
            data-testid={`catalog-card-${model.id}`}
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              borderColor: 'var(--md-sys-color-outline-variant)',
              backgroundColor: 'var(--md-sys-color-surface)',
              overflow: 'hidden',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
              '&:hover': {
                borderColor: 'var(--md-sys-color-primary)',
                boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            {/* Live Vector Dieline Preview Stage */}
            <Box
              sx={{
                height: 210,
                p: 2.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--md-sys-color-surface-container-low)',
                borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                boxSizing: 'border-box',
              }}
            >
              <DielinePreviewSvg
                dieline={dieline}
                ariaLabel={`${model.name} 2D dieline preview`}
                testId={`catalog-preview-${model.id}`}
              />
            </Box>

            <CardContent
              sx={{
                flex: 1,
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Typography
                  variant="labelSmall"
                  component="span"
                  sx={{
                    px: 1.25,
                    py: 0.4,
                    borderRadius: 999,
                    backgroundColor: 'var(--md-sys-color-secondary-container)',
                    color: 'var(--md-sys-color-on-secondary-container)',
                    fontWeight: 600,
                  }}
                >
                  {model.category}
                </Typography>

                <Typography
                  variant="labelSmall"
                  component="span"
                  sx={{
                    color: 'var(--md-sys-color-on-surface-variant)',
                    fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {model.defaultDimensions.length} × {model.defaultDimensions.width} ×{' '}
                  {model.defaultDimensions.height} mm
                </Typography>
              </Box>

              <Typography variant="titleMedium" component="h2" color="text.primary">
                {model.name}
              </Typography>

              <Typography variant="bodyMedium" color="text.secondary">
                {model.description}
              </Typography>
            </CardContent>

            <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
              <M3Button
                m3Variant="filled"
                fullWidth
                startIcon={<M3Icon name="tune" size={18} />}
                onClick={() => handleCustomize(model)}
              >
                Customize
              </M3Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
