// Material Design 3 packaging editor combining Top App Bar, Left Rail, 2D/3D Stages, and Right Panel
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Slider from '@mui/material/Slider';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { type KeyboardEvent, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_TEXT_CONTENT, DielineStage, useEditorStore } from '@features/editor-stage';
import { M3Button, M3CircularProgress, M3Icon, M3IconButton, M3TextField } from '@shared/ui';

type EditorRailToolId = 'templates' | 'text' | 'shapes' | 'upload';
type EditorViewMode = '2d' | '3d';

interface EditorRailItem {
  id: EditorRailToolId;
  label: string;
  icon: string;
}

const LEFT_RAIL_ITEMS: readonly EditorRailItem[] = [
  { id: 'templates', label: 'Templates', icon: 'grid_view' },
  { id: 'text', label: 'Add Text', icon: 'title' },
  { id: 'shapes', label: 'Shapes', icon: 'shapes' },
  { id: 'upload', label: 'Upload', icon: 'upload' },
];

const TEXT_COMMIT_DEBOUNCE_MS = 350;

const LazyBoxViewer = lazy(() =>
  import('@features/editor-3d').then((module) => ({ default: module.BoxViewer })),
);

export default function EditorPage() {
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<EditorRailToolId | null>(null);
  const [viewMode, setViewMode] = useState<EditorViewMode>('2d');
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dieline = useEditorStore((state) => state.dieline);
  const elements = useEditorStore((state) => state.elements);
  const committedElements = useEditorStore((state) => state.committedElements);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const foldAngle = useEditorStore((state) => state.foldAngle);
  const addElement = useEditorStore((state) => state.addElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);
  const commitElements = useEditorStore((state) => state.commitElements);
  const setFoldAngle = useEditorStore((state) => state.setFoldAngle);

  const selectedElement = elements.find((el) => el.id === selectedElementId) ?? null;
  const selectedFaceName = selectedElement
    ? (dieline.faces.find((face) => face.id === selectedElement.faceId)?.name ??
      selectedElement.faceId)
    : null;

  const clearCommitTimer = () => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

  const handleRailItemClick = (toolId: EditorRailToolId) => {
    if (toolId === 'text') {
      clearCommitTimer();
      setSelectedTool('text');
      addElement({ faceId: 'front', content: DEFAULT_TEXT_CONTENT });
      return;
    }
    setSelectedTool((prev) => (prev === toolId ? null : toolId));
  };

  const handleSwitchViewMode = (mode: EditorViewMode) => {
    if (mode === '3d') {
      clearCommitTimer();
      commitElements();
    }
    setViewMode(mode);
  };

  const handleTextContentChange = (nextContent: string) => {
    if (!selectedElement || selectedElement.type !== 'text') {
      return;
    }
    updateElement(selectedElement.id, { content: nextContent }, false);
    clearCommitTimer();
    commitTimerRef.current = setTimeout(() => {
      commitElements();
      commitTimerRef.current = null;
    }, TEXT_COMMIT_DEBOUNCE_MS);
  };

  const handleTextContentCommit = () => {
    clearCommitTimer();
    commitElements();
  };

  const handleTextKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      handleTextContentCommit();
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElement) {
      return;
    }
    clearCommitTimer();
    removeElement(selectedElement.id);
  };

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

          {/* M3 Segmented View Mode Toggle: 2D Dieline vs 3D Preview */}
          <Box
            role="group"
            aria-label="View mode"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              p: '3px',
              gap: '3px',
              borderRadius: '9999px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              flexShrink: 0,
            }}
          >
            <M3Button
              m3Variant={viewMode === '2d' ? 'tonal' : 'text'}
              size="small"
              aria-pressed={viewMode === '2d'}
              startIcon={<M3Icon name="polyline" size={18} />}
              onClick={() => handleSwitchViewMode('2d')}
              sx={{
                minHeight: 32,
                px: 1.75,
                color:
                  viewMode === '2d'
                    ? 'var(--md-sys-color-on-secondary-container)'
                    : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              2D Dieline
            </M3Button>
            <M3Button
              m3Variant={viewMode === '3d' ? 'tonal' : 'text'}
              size="small"
              aria-pressed={viewMode === '3d'}
              startIcon={<M3Icon name="view_in_ar" size={18} />}
              onClick={() => handleSwitchViewMode('3d')}
              sx={{
                minHeight: 32,
                px: 1.75,
                color:
                  viewMode === '3d'
                    ? 'var(--md-sys-color-on-secondary-container)'
                    : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              3D Preview
            </M3Button>
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

      {/* Main Editor Workspace: Left Rail | Center 2D/3D Stage | Right Properties Panel */}
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
            const tooltip =
              item.id === 'text' ? 'Add text onto Front face' : `${item.label} (coming soon)`;
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
                  tooltip={tooltip}
                  aria-pressed={isActive}
                  onClick={() => handleRailItemClick(item.id)}
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
          {viewMode === '2d' ? (
            <DielineStage />
          ) : (
            <Suspense
              fallback={
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                  }}
                >
                  <M3CircularProgress />
                </Box>
              }
            >
              <LazyBoxViewer dieline={dieline} elements={committedElements} foldAngle={foldAngle} />
            </Suspense>
          )}
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
            alignItems: 'stretch',
            p: 2.5,
            gap: 2.5,
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderLeft: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="titleSmall" component="h2" color="text.primary">
                Fold Angle
              </Typography>
              <Typography
                variant="labelMedium"
                component="span"
                data-testid="fold-angle-value"
                sx={{
                  px: 1.25,
                  py: 0.25,
                  borderRadius: '9999px',
                  fontVariantNumeric: 'tabular-nums',
                  backgroundColor: 'var(--md-sys-color-secondary-container)',
                  color: 'var(--md-sys-color-on-secondary-container)',
                }}
              >
                {foldAngle}°
              </Typography>
            </Box>

            <Slider
              aria-label="Fold Angle"
              value={foldAngle}
              min={0}
              max={90}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}°`}
              onChange={(_, nextValue) => {
                const numeric = Array.isArray(nextValue) ? (nextValue[0] ?? 0) : nextValue;
                setFoldAngle(numeric);
              }}
              sx={{
                color: 'var(--md-sys-color-primary)',
                '& .MuiSlider-rail': {
                  opacity: 0.35,
                  backgroundColor: 'var(--md-sys-color-outline-variant)',
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.75 }}>
              {[
                { label: '0° Flat', value: 0 },
                { label: '45°', value: 45 },
                { label: '90° Closed', value: 90 },
              ].map((preset) => (
                <M3Button
                  key={preset.value}
                  m3Variant={foldAngle === preset.value ? 'tonal' : 'text'}
                  size="small"
                  onClick={() => setFoldAngle(preset.value)}
                  sx={{ minHeight: 28, minWidth: 0, px: 1, whiteSpace: 'nowrap' }}
                >
                  {preset.label}
                </M3Button>
              ))}
            </Box>
          </Box>

          <Divider />

          {selectedElement && selectedElement.type === 'text' ? (
            <Box
              data-testid="text-properties-panel"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography variant="titleSmall" component="h2" color="text.primary">
                    Text Properties
                  </Typography>
                  {selectedFaceName && (
                    <Typography
                      variant="labelSmall"
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: '9999px',
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                      }}
                    >
                      {selectedFaceName}
                    </Typography>
                  )}
                </Box>
                <M3IconButton
                  icon="delete"
                  label="Delete selected text"
                  tooltip="Remove text element"
                  size="small"
                  onClick={handleDeleteSelected}
                  sx={{ color: 'var(--md-sys-color-error)' }}
                />
              </Box>

              <M3TextField
                label="Text Content"
                value={selectedElement.content}
                onChange={(event) => handleTextContentChange(event.target.value)}
                onBlur={handleTextContentCommit}
                onKeyDown={handleTextKeyDown}
                placeholder="Enter label text"
              />

              <Typography variant="bodySmall" color="text.secondary">
                Live edits update the 2D sheet immediately and bake onto the {selectedFaceName} face
                in 3D when committed.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 1,
              }}
            >
              <Typography variant="bodyMedium" color="text.secondary">
                Click &ldquo;Add Text&rdquo; in the left rail or select an element on the dieline to
                edit artwork properties.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
