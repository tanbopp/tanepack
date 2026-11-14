// Material Design 3 packaging editor layout combining Top App Bar, Left Rail, 2D Stage, and Right Panel
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DielineStage } from '@features/editor-stage';
import { M3Button, M3Icon, M3IconButton } from '@shared/ui';

type EditorRailToolId = 'templates' | 'text' | 'shapes' | 'upload';

interface EditorRailItem {
  id: EditorRailToolId;
  label: string;
  icon: string;
}

const LEFT_RAIL_ITEMS: readonly EditorRailItem[] = [
  { id: 'templates', label: 'Templates', icon: 'grid_view' },
  { id: 'text', label: 'Text', icon: 'title' },
  { id: 'shapes', label: 'Shapes', icon: 'shapes' },
  { id: 'upload', label: 'Upload', icon: 'upload' },
];

export default function EditorPage() {
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<EditorRailToolId | null>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {/* Top App Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          height: 64,
          flexShrink: 0,
          justifyContent: 'center',
          backgroundColor: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        <Toolbar
          sx={{
            minHeight: 64,
            px: { xs: 1.5, sm: 2.5 },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <M3IconButton icon="arrow_back" label="Back to home" onClick={() => navigate('/')} />
            <Typography variant="titleMedium" component="h1" noWrap sx={{ fontWeight: 500 }}>
              Untitled Box
            </Typography>
            <Box
              aria-label="Save status: Saved"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                gap: 0.5,
                px: 1.25,
                py: 0.375,
                borderRadius: '9999px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <M3Icon name="cloud_done" size={16} />
              <Typography variant="labelMedium" component="span">
                Saved
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <M3Button
              m3Variant="filled"
              size="small"
              disabled
              startIcon={<M3Icon name="download" size={18} />}
            >
              Export
            </M3Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Editor Workspace: Left Rail | Center 2D Stage | Right Properties Panel */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left Navigation Rail */}
        <Box
          component="nav"
          aria-label="Editor tools"
          sx={{
            width: 72,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 1.5,
            gap: 1.25,
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderRight: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          {LEFT_RAIL_ITEMS.map((item) => {
            const isActive = selectedTool === item.id;
            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                }}
              >
                <M3IconButton
                  icon={item.icon}
                  label={item.label}
                  filled={isActive}
                  tooltip={`${item.label} (coming soon)`}
                  aria-pressed={isActive}
                  onClick={() => setSelectedTool((prev) => (prev === item.id ? null : item.id))}
                  sx={{
                    width: 48,
                    height: 36,
                    borderRadius: '18px',
                    backgroundColor: isActive
                      ? 'var(--md-sys-color-secondary-container)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--md-sys-color-on-secondary-container)'
                      : 'var(--md-sys-color-on-surface-variant)',
                    '&:hover': {
                      backgroundColor: isActive
                        ? 'var(--md-sys-color-secondary-container)'
                        : 'var(--md-sys-color-surface-container-highest)',
                    },
                  }}
                />
                <Typography
                  variant="labelSmall"
                  color={isActive ? 'text.primary' : 'text.secondary'}
                  sx={{ lineHeight: 1.2 }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Center Stage Canvas */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
          }}
        >
          <DielineStage />
        </Box>

        {/* Right Panel */}
        <Box
          component="aside"
          aria-label="Properties panel"
          sx={{
            width: { xs: 240, md: 300 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 3,
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderLeft: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <Typography variant="bodyMedium" color="text.secondary">
            Properties panel coming soon.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
