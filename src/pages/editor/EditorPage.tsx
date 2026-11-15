// Material Design 3 packaging editor combining Top App Bar, Left Rail, 2D/3D Stages, and Export
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import {
  type ChangeEvent,
  type KeyboardEvent,
  lazy,
  type MouseEvent as ReactMouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBarAccountActions } from '@widgets/app-shell';
import {
  type BoxSide,
  clampBoxDimensionMm,
  computeTextFontSizePatch,
  DEFAULT_TEXT_CONTENT,
  DielineStage,
  type ElementPatch,
  MAX_BOX_DIMENSION_MM,
  MAX_TEXT_FONT_SIZE_MM,
  MIN_BOX_DIMENSION_MM,
  MIN_TEXT_FONT_SIZE_MM,
  useEditorStore,
} from '@features/editor-stage';
import { DEFAULT_PROJECT_NAME } from '@entities/design-document';
import { DIELINE_ARCHETYPE_OPTIONS, type DielineArchetype } from '@entities/dieline';
import { type Template, TEMPLATES } from '@entities/template';
import { exportDielinePdf } from '@shared/lib/exportPdf';
import { triggerPngDataUrlDownload } from '@shared/lib/exportPng';
import { loadUploadedImageFile } from '@shared/lib/imageUpload';
import { M3Button, M3CircularProgress, M3Icon, M3IconButton, M3TextField } from '@shared/ui';
import { type CloudSaveStatus, useProjectPersistence } from './useProjectPersistence';

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
const DIMENSION_COMMIT_DEBOUNCE_MS = 300;

type BoxDimensionAxis = 'length' | 'width' | 'height';
type BoxPresetId =
  'small' | 'standard' | 'large' | 'shipping-small' | 'shipping-medium' | 'shipping-large';

interface BoxDimensionPreset {
  id: BoxPresetId;
  label: string;
  length: number;
  width: number;
  height: number;
}

interface DimensionDraftState {
  sourceKey: string;
  length: string;
  width: string;
  height: string;
}

const BOX_DIMENSION_PRESETS: readonly BoxDimensionPreset[] = [
  { id: 'small', label: 'Small Box: 50x50x50', length: 50, width: 50, height: 50 },
  { id: 'standard', label: 'Standard: 100x50x100', length: 100, width: 50, height: 100 },
  { id: 'large', label: 'Large: 200x150x100', length: 200, width: 150, height: 100 },
  {
    id: 'shipping-small',
    label: 'Shipping Small: 300x200x150',
    length: 300,
    width: 200,
    height: 150,
  },
  {
    id: 'shipping-medium',
    label: 'Shipping Medium: 400x300x250',
    length: 400,
    width: 300,
    height: 250,
  },
  {
    id: 'shipping-large',
    label: 'Shipping Large: 600x400x300',
    length: 600,
    width: 400,
    height: 300,
  },
];

const SAVE_STATUS_DISPLAY: Record<
  CloudSaveStatus,
  { label: string; icon: string; backgroundColor: string; color: string }
> = {
  saved: {
    label: 'Saved',
    icon: 'cloud_done',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    color: 'var(--md-sys-color-on-surface-variant)',
  },
  saving: {
    label: 'Saving...',
    icon: 'sync',
    backgroundColor: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
  },
  error: {
    label: 'Error',
    icon: 'cloud_off',
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
  },
  guest: {
    label: 'Log in to save your design',
    icon: 'warning',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    color: 'var(--md-sys-color-on-tertiary-container)',
  },
};

const LazyBoxViewer = lazy(() =>
  import('@features/editor-3d').then((module) => ({ default: module.BoxViewer })),
);

const SELECTED_META_CHIP_SX = {
  px: 1,
  py: 0.25,
  borderRadius: '9999px',
  backgroundColor: 'var(--md-sys-color-surface-container-high)',
  color: 'var(--md-sys-color-on-surface-variant)',
  whiteSpace: 'nowrap',
} as const;

interface SelectedElementMetaProps {
  title: string;
  side: BoxSide;
  faceName: string | null;
  layerPosition: number;
  layerTotal: number;
  canMoveForward: boolean;
  canMoveBackward: boolean;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
}

function SelectedElementMetaSection({
  title,
  side,
  faceName,
  layerPosition,
  layerTotal,
  canMoveForward,
  canMoveBackward,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
}: SelectedElementMetaProps) {
  const layerActions = [
    {
      label: 'Bring to Front',
      icon: 'flip_to_front',
      disabled: !canMoveForward,
      onClick: onBringToFront,
    },
    {
      label: 'Bring Forward',
      icon: 'arrow_upward',
      disabled: !canMoveForward,
      onClick: onBringForward,
    },
    {
      label: 'Send Backward',
      icon: 'arrow_downward',
      disabled: !canMoveBackward,
      onClick: onSendBackward,
    },
    {
      label: 'Send to Back',
      icon: 'flip_to_back',
      disabled: !canMoveBackward,
      onClick: onSendToBack,
    },
  ];

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flexWrap: 'wrap' }}
        >
          <Typography variant="titleSmall" component="h2" color="text.primary">
            {title}
          </Typography>
          <Typography
            variant="labelSmall"
            component="span"
            data-testid="selected-element-side-badge"
            sx={{
              ...SELECTED_META_CHIP_SX,
              backgroundColor:
                side === 'inside'
                  ? 'var(--md-sys-color-tertiary-container)'
                  : 'var(--md-sys-color-secondary-container)',
              color:
                side === 'inside'
                  ? 'var(--md-sys-color-on-tertiary-container)'
                  : 'var(--md-sys-color-on-secondary-container)',
            }}
          >
            {side === 'inside' ? 'Inside' : 'Outside'}
          </Typography>
          {faceName && (
            <Typography
              variant="labelSmall"
              component="span"
              data-testid="selected-element-face-badge"
              sx={SELECTED_META_CHIP_SX}
            >
              {faceName}
            </Typography>
          )}
        </Box>
        <M3IconButton
          icon="delete"
          label="Delete selected element"
          tooltip="Remove element"
          size="small"
          onClick={onDelete}
          sx={{ color: 'var(--md-sys-color-error)', flexShrink: 0 }}
        />
      </Box>

      {/* Layer Stack Ordering Controls */}
      <Box
        data-testid="layer-order-controls"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="labelMedium" color="text.secondary">
            Layer Order
          </Typography>
          <Typography
            variant="labelSmall"
            data-testid="selected-element-layer-position"
            sx={{
              ...SELECTED_META_CHIP_SX,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {layerPosition} / {layerTotal}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.5,
            p: 0.5,
            borderRadius: '12px',
            border: '1px solid var(--md-sys-color-outline-variant)',
            backgroundColor: 'var(--md-sys-color-surface)',
          }}
        >
          {layerActions.map((action) => (
            <M3IconButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              tooltip={action.label}
              size="small"
              iconSize={18}
              disabled={action.disabled}
              onClick={action.onClick}
              sx={{
                borderRadius: '8px',
                color: 'var(--md-sys-color-on-surface)',
                '&:hover:not(:disabled)': {
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                },
                '&.Mui-disabled': {
                  opacity: 0.38,
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </>
  );
}

export default function EditorPage() {
  const navigate = useNavigate();
  const { projectName, saveStatus, statusErrorMessage, renameProject, flushPendingSave } =
    useProjectPersistence();
  const statusDisplay = SAVE_STATUS_DISPLAY[saveStatus];
  const [selectedTool, setSelectedTool] = useState<EditorRailToolId | null>(null);
  const [isTemplatesDrawerOpen, setIsTemplatesDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<EditorViewMode>('2d');
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftProjectName, setDraftProjectName] = useState(projectName);
  const [dimensionDraft, setDimensionDraft] = useState<DimensionDraftState | null>(null);

  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimensionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending3dExportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending3dExportRef = useRef(false);
  const pendingDimensionDraftRef = useRef<DimensionDraftState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const capture3dPngRef = useRef<(() => string | null) | null>(null);

  const archetype = useEditorStore((state) => state.archetype);
  const dieline = useEditorStore((state) => state.dieline);
  const dimensions = useEditorStore((state) => state.dimensions);
  const activeSide = useEditorStore((state) => state.activeSide);
  const elements = useEditorStore((state) => state.elements);
  const committedElements = useEditorStore((state) => state.committedElements);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const foldAngle = useEditorStore((state) => state.foldAngle);
  const setActiveSide = useEditorStore((state) => state.setActiveSide);
  const addElement = useEditorStore((state) => state.addElement);
  const addImageElement = useEditorStore((state) => state.addImageElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);
  const bringToFront = useEditorStore((state) => state.bringToFront);
  const sendToBack = useEditorStore((state) => state.sendToBack);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const commitElements = useEditorStore((state) => state.commitElements);
  const setFoldAngle = useEditorStore((state) => state.setFoldAngle);
  const setArchetype = useEditorStore((state) => state.setArchetype);
  const setDimensions = useEditorStore((state) => state.setDimensions);
  const applyTemplate = useEditorStore((state) => state.applyTemplate);
  const resetEditorStore = useEditorStore((state) => state.reset);

  const storeDimensionsKey = `${archetype}|${dimensions.length}|${dimensions.width}|${dimensions.height}`;
  const activeDimensionDraft =
    dimensionDraft && dimensionDraft.sourceKey === storeDimensionsKey ? dimensionDraft : null;
  const lengthInputValue = activeDimensionDraft
    ? activeDimensionDraft.length
    : String(dimensions.length);
  const widthInputValue = activeDimensionDraft
    ? activeDimensionDraft.width
    : String(dimensions.width);
  const heightInputValue = activeDimensionDraft
    ? activeDimensionDraft.height
    : String(dimensions.height);
  const matchingPreset = BOX_DIMENSION_PRESETS.find(
    (preset) =>
      preset.length === dimensions.length &&
      preset.width === dimensions.width &&
      preset.height === dimensions.height,
  );
  const activePresetValue = matchingPreset?.id ?? 'custom';

  const selectedElement = elements.find((el) => el.id === selectedElementId) ?? null;
  const selectedFaceName = selectedElement
    ? (dieline.faces.find((face) => face.id === selectedElement.faceId)?.name ??
      selectedElement.faceId)
    : null;
  const selectedSideElements = selectedElement
    ? elements.filter((el) => el.side === selectedElement.side).sort((a, b) => a.zIndex - b.zIndex)
    : [];
  const selectedLayerIdx = selectedElement
    ? selectedSideElements.findIndex((el) => el.id === selectedElement.id)
    : -1;
  const canMoveForward =
    selectedLayerIdx !== -1 && selectedLayerIdx < selectedSideElements.length - 1;
  const canMoveBackward = selectedLayerIdx > 0;
  const layerPosition = selectedLayerIdx !== -1 ? selectedLayerIdx + 1 : 1;
  const layerTotal = Math.max(1, selectedSideElements.length);

  const clearCommitTimer = () => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  };

  const clearDimensionTimer = () => {
    if (dimensionTimerRef.current !== null) {
      clearTimeout(dimensionTimerRef.current);
      dimensionTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        clearTimeout(commitTimerRef.current);
      }
      if (dimensionTimerRef.current !== null) {
        clearTimeout(dimensionTimerRef.current);
      }
      if (pending3dExportTimerRef.current !== null) {
        clearTimeout(pending3dExportTimerRef.current);
      }
    };
  }, []);

  const commitDraftDimensions = (
    draft: DimensionDraftState | null,
    resetInvalidDraft = false,
  ): void => {
    if (!draft) {
      return;
    }
    const current = useEditorStore.getState().dimensions;
    const parseAxis = (raw: string, fallback: number): number | null => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return resetInvalidDraft ? fallback : null;
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return resetInvalidDraft ? fallback : null;
      }
      return clampBoxDimensionMm(parsed, fallback);
    };

    const nextLength = parseAxis(draft.length, current.length);
    const nextWidth = parseAxis(draft.width, current.width);
    const nextHeight = parseAxis(draft.height, current.height);

    if (nextLength === null || nextWidth === null || nextHeight === null) {
      if (resetInvalidDraft) {
        pendingDimensionDraftRef.current = null;
        setDimensionDraft(null);
      }
      return;
    }

    pendingDimensionDraftRef.current = null;
    setDimensionDraft(null);
    setDimensions(nextLength, nextWidth, nextHeight);
  };

  const flushPendingDimensionDraft = () => {
    clearDimensionTimer();
    commitDraftDimensions(pendingDimensionDraftRef.current, true);
  };

  const handleDimensionInputChange = (axis: BoxDimensionAxis, nextValue: string) => {
    const baseDraft: DimensionDraftState = activeDimensionDraft ?? {
      sourceKey: storeDimensionsKey,
      length: String(dimensions.length),
      width: String(dimensions.width),
      height: String(dimensions.height),
    };
    const nextDraft: DimensionDraftState = {
      ...baseDraft,
      [axis]: nextValue,
    };

    setDimensionDraft(nextDraft);
    pendingDimensionDraftRef.current = nextDraft;
    clearDimensionTimer();
    dimensionTimerRef.current = setTimeout(() => {
      dimensionTimerRef.current = null;
      commitDraftDimensions(pendingDimensionDraftRef.current, false);
    }, DIMENSION_COMMIT_DEBOUNCE_MS);
  };

  const handleDimensionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      flushPendingDimensionDraft();
    }
  };

  const handleDimensionPresetChange = (event: SelectChangeEvent<string>) => {
    const selectedPreset = BOX_DIMENSION_PRESETS.find((preset) => preset.id === event.target.value);
    if (!selectedPreset) {
      return;
    }
    clearDimensionTimer();
    pendingDimensionDraftRef.current = null;
    setDimensionDraft(null);
    setDimensions(selectedPreset.length, selectedPreset.width, selectedPreset.height);
  };

  const handleArchetypeChange = (event: SelectChangeEvent<DielineArchetype>) => {
    clearDimensionTimer();
    pendingDimensionDraftRef.current = null;
    setDimensionDraft(null);
    setArchetype(event.target.value as DielineArchetype);
  };

  const handleRegister3dCapture = useCallback((captureFn: (() => string | null) | null) => {
    capture3dPngRef.current = captureFn;
    if (captureFn && pending3dExportRef.current) {
      pending3dExportRef.current = false;
      if (pending3dExportTimerRef.current !== null) {
        clearTimeout(pending3dExportTimerRef.current);
      }
      pending3dExportTimerRef.current = setTimeout(() => {
        pending3dExportTimerRef.current = null;
        try {
          const dataUrl = capture3dPngRef.current?.() ?? null;
          if (dataUrl) {
            triggerPngDataUrlDownload(dataUrl, 'untitled-box-3d.png');
          }
        } catch (err) {
          console.error('Failed to export PNG snapshot:', err);
        } finally {
          setIsExporting(false);
        }
      }, 60);
    }
  }, []);

  const handleCloseTemplatesDrawer = () => {
    setIsTemplatesDrawerOpen(false);
    setSelectedTool((prev) => (prev === 'templates' ? null : prev));
  };

  const handleSelectTemplate = (template: Template) => {
    clearCommitTimer();
    clearDimensionTimer();
    pendingDimensionDraftRef.current = null;
    setDimensionDraft(null);
    applyTemplate(template);
    if (
      projectName === DEFAULT_PROJECT_NAME ||
      TEMPLATES.some((candidate) => candidate.name === projectName)
    ) {
      renameProject(template.name);
    }
    setIsTemplatesDrawerOpen(false);
    setSelectedTool(null);
  };

  const handleRailItemClick = (toolId: EditorRailToolId) => {
    if (toolId === 'templates') {
      setIsTemplatesDrawerOpen((prev) => {
        const next = !prev;
        setSelectedTool(next ? 'templates' : null);
        return next;
      });
      return;
    }
    setIsTemplatesDrawerOpen(false);
    if (toolId === 'text') {
      clearCommitTimer();
      setSelectedTool('text');
      addElement({ faceId: 'front', content: DEFAULT_TEXT_CONTENT });
      return;
    }
    if (toolId === 'upload') {
      clearCommitTimer();
      setSelectedTool('upload');
      fileInputRef.current?.click();
      return;
    }
    setSelectedTool((prev) => (prev === toolId ? null : toolId));
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const loaded = await loadUploadedImageFile(file);
      addImageElement({
        src: loaded.src,
        naturalWidth: loaded.naturalWidth,
        naturalHeight: loaded.naturalHeight,
        width: loaded.widthMm,
        height: loaded.heightMm,
        faceId: 'front',
      });
    } catch (err) {
      console.error('Failed to load uploaded image:', err);
    }
  };

  const handleSwitchViewMode = (mode: EditorViewMode) => {
    if (mode === '3d') {
      flushPendingDimensionDraft();
      clearCommitTimer();
      commitElements();
    }
    setViewMode(mode);
  };

  const scheduleElementPatchCommit = (id: string, patch: ElementPatch) => {
    updateElement(id, patch, false);
    clearCommitTimer();
    commitTimerRef.current = setTimeout(() => {
      commitElements();
      commitTimerRef.current = null;
    }, TEXT_COMMIT_DEBOUNCE_MS);
  };

  const handleTextContentChange = (nextContent: string) => {
    if (!selectedElement || selectedElement.type !== 'text') {
      return;
    }
    scheduleElementPatchCommit(selectedElement.id, { content: nextContent });
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

  const handleTextColorChange = (nextColor: string) => {
    if (!selectedElement || selectedElement.type !== 'text') {
      return;
    }
    scheduleElementPatchCommit(selectedElement.id, { style: { color: nextColor } });
  };

  const handleShapeFillChange = (nextColor: string) => {
    if (!selectedElement || selectedElement.type !== 'shape') {
      return;
    }
    scheduleElementPatchCommit(selectedElement.id, { fill: nextColor });
  };

  const handleTextFontSizeUpdate = (nextSizeMm: number, commit: boolean) => {
    if (!selectedElement || selectedElement.type !== 'text') {
      return;
    }
    clearCommitTimer();
    updateElement(
      selectedElement.id,
      computeTextFontSizePatch(selectedElement, nextSizeMm),
      commit,
    );
  };

  const handleTextFontWeightChange = (event: SelectChangeEvent<number>) => {
    if (!selectedElement || selectedElement.type !== 'text') {
      return;
    }
    const weight = Number(event.target.value) === 700 ? 700 : 400;
    clearCommitTimer();
    updateElement(selectedElement.id, { style: { fontWeight: weight } }, true);
  };

  const handleStartRename = () => {
    setDraftProjectName(projectName);
    setIsEditingName(true);
  };

  const handleCommitRename = () => {
    setIsEditingName(false);
    renameProject(draftProjectName);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleCommitRename();
    } else if (event.key === 'Escape') {
      setIsEditingName(false);
      setDraftProjectName(projectName);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElement) {
      return;
    }
    clearCommitTimer();
    removeElement(selectedElement.id);
  };

  const handleNavigateBack = async () => {
    flushPendingDimensionDraft();
    clearCommitTimer();
    commitElements();
    await flushPendingSave();
    resetEditorStore();
    navigate('/dashboard');
  };

  const handleOpenExportMenu = (event: ReactMouseEvent<HTMLElement>) => {
    setExportMenuAnchorEl(event.currentTarget);
  };

  const handleCloseExportMenu = () => {
    setExportMenuAnchorEl(null);
  };

  const handleExport3dPng = () => {
    if (isExporting) {
      return;
    }
    setIsExporting(true);

    if (viewMode !== '3d' || !capture3dPngRef.current) {
      pending3dExportRef.current = true;
      handleSwitchViewMode('3d');
      return;
    }

    try {
      const dataUrl = capture3dPngRef.current();
      if (dataUrl) {
        triggerPngDataUrlDownload(dataUrl, 'untitled-box-3d.png');
      }
    } catch (err) {
      console.error('Failed to export PNG snapshot:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport2dPdf = async () => {
    if (isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      clearCommitTimer();
      commitElements();
      const svgElement = document.querySelector('[data-testid="dieline-svg"]');
      if (svgElement instanceof SVGSVGElement) {
        await exportDielinePdf(svgElement, dieline);
      }
    } catch (err) {
      console.error('Failed to export print-ready 2D PDF:', err);
    } finally {
      setIsExporting(false);
    }
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
      {/* Hidden image upload picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg"
        hidden
        data-testid="image-upload-input"
        aria-label="Upload image file"
        onChange={(event) => {
          void handleImageFileChange(event);
        }}
      />

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
            <M3IconButton
              icon="arrow_back"
              label="Back to dashboard"
              tooltip="Back to dashboard"
              onClick={() => {
                void handleNavigateBack();
              }}
            />
            {isEditingName ? (
              <Box
                component="input"
                type="text"
                aria-label="Project name"
                value={draftProjectName}
                autoFocus
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraftProjectName(event.target.value)
                }
                onBlur={handleCommitRename}
                onKeyDown={handleRenameKeyDown}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  minWidth: 140,
                  maxWidth: 220,
                  borderRadius: '8px',
                  border: '1px solid var(--md-sys-color-primary)',
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  color: 'var(--md-sys-color-on-surface)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  outline: 'none',
                }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
                <Typography
                  variant="titleMedium"
                  component="h1"
                  noWrap
                  onClick={handleStartRename}
                  sx={{ fontWeight: 500, cursor: 'pointer' }}
                >
                  {projectName}
                </Typography>
                <M3IconButton
                  icon="edit"
                  label="Rename project"
                  tooltip="Rename project"
                  size="small"
                  iconSize={16}
                  onClick={handleStartRename}
                />
              </Box>
            )}
            <Box
              data-testid="save-status-pill"
              aria-label={`Save status: ${statusDisplay.label}`}
              title={statusErrorMessage ?? undefined}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                gap: 0.5,
                px: 1.25,
                py: 0.375,
                borderRadius: '9999px',
                backgroundColor: statusDisplay.backgroundColor,
                color: statusDisplay.color,
              }}
            >
              <M3Icon name={statusDisplay.icon} size={16} />
              <Typography variant="labelMedium" component="span">
                {statusDisplay.label}
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
            <TopBarAccountActions compact />
            <M3Button
              m3Variant="filled"
              size="small"
              disabled={isExporting}
              aria-haspopup="menu"
              aria-expanded={exportMenuAnchorEl ? 'true' : undefined}
              aria-controls={exportMenuAnchorEl ? 'editor-export-menu' : undefined}
              startIcon={<M3Icon name="download" size={18} />}
              endIcon={<M3Icon name="arrow_drop_down" size={18} />}
              onClick={handleOpenExportMenu}
            >
              Export
            </M3Button>
            <Menu
              id="editor-export-menu"
              anchorEl={exportMenuAnchorEl}
              open={Boolean(exportMenuAnchorEl)}
              onClose={handleCloseExportMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => {
                  handleCloseExportMenu();
                  handleExport3dPng();
                }}
              >
                <ListItemIcon>
                  <M3Icon name="image" size={18} />
                </ListItemIcon>
                <ListItemText>Export 3D Image (PNG)</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleCloseExportMenu();
                  void handleExport2dPdf();
                }}
              >
                <ListItemIcon>
                  <M3Icon name="picture_as_pdf" size={18} />
                </ListItemIcon>
                <ListItemText>Export 2D Print (PDF)</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Templates Library Drawer (left side overlay) */}
      <Drawer
        anchor="left"
        open={isTemplatesDrawerOpen}
        onClose={handleCloseTemplatesDrawer}
        PaperProps={{
          sx: {
            width: { xs: 320, sm: 460 },
            p: 2.5,
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderRight: '1px solid var(--md-sys-color-outline-variant)',
          },
        }}
      >
        <Box
          data-testid="templates-drawer"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="titleMedium" component="h2" color="text.primary">
                Packaging Templates
              </Typography>
              <Typography variant="bodySmall" color="text.secondary">
                Choose a carton preset to set dimensions and artwork layout.
              </Typography>
            </Box>
            <M3IconButton
              icon="close"
              label="Close templates drawer"
              size="small"
              onClick={handleCloseTemplatesDrawer}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {TEMPLATES.map((template) => (
              <ButtonBase
                key={template.id}
                data-testid={`template-card-${template.id}`}
                onClick={() => handleSelectTemplate(template)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  p: 1.25,
                  gap: 1,
                  borderRadius: '16px',
                  backgroundColor: 'var(--md-sys-color-surface)',
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
                    height: 88,
                    width: '100%',
                    borderRadius: '12px',
                    backgroundColor: template.thumbnailColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    color: '#ffffff',
                  }}
                >
                  <M3Icon name="inventory_2" size={26} />
                  <Typography
                    variant="labelSmall"
                    component="span"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      color: '#ffffff',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {template.dimensions.length}×{template.dimensions.width}×
                    {template.dimensions.height} mm
                  </Typography>
                </Paper>

                <Typography variant="titleSmall" component="div" color="text.primary">
                  {template.name}
                </Typography>
                <Typography variant="bodySmall" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                  {template.description}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      </Drawer>

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
              item.id === 'templates'
                ? 'Browse packaging templates'
                : item.id === 'text'
                  ? 'Add text onto Front face'
                  : item.id === 'upload'
                    ? 'Upload PNG or JPEG image'
                    : `${item.label} (coming soon)`;
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
            position: 'relative',
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
          }}
        >
          {/* Floating M3 Segmented Pill: Outside Design vs Inside Design */}
          <Box
            role="group"
            aria-label="Surface side"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            sx={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 12,
              display: 'inline-flex',
              alignItems: 'center',
              p: '3px',
              gap: '3px',
              borderRadius: '9999px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.16)',
            }}
          >
            {(
              [
                { id: 'outside', label: 'Outside Design', icon: 'layers' },
                { id: 'inside', label: 'Inside Design', icon: 'flip' },
              ] as const
            ).map((option) => {
              const isSelectedSide = activeSide === option.id;
              return (
                <M3Button
                  key={option.id}
                  m3Variant={isSelectedSide ? 'tonal' : 'text'}
                  size="small"
                  aria-pressed={isSelectedSide}
                  startIcon={<M3Icon name={option.icon} size={16} />}
                  onClick={() => setActiveSide(option.id)}
                  sx={{
                    minHeight: 30,
                    px: 1.5,
                    whiteSpace: 'nowrap',
                    color: isSelectedSide
                      ? 'var(--md-sys-color-on-secondary-container)'
                      : 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  {option.label}
                </M3Button>
              );
            })}
          </Box>

          <DielineStage isActive={viewMode === '2d'} />
          {viewMode === '3d' && (
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
              <LazyBoxViewer
                dieline={dieline}
                elements={committedElements}
                foldAngle={foldAngle}
                onRegisterCapture={handleRegister3dCapture}
              />
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
            overflowX: 'hidden',
            overflowY: 'auto',
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
              <SelectedElementMetaSection
                title="Text Properties"
                side={selectedElement.side}
                faceName={selectedFaceName}
                layerPosition={layerPosition}
                layerTotal={layerTotal}
                canMoveForward={canMoveForward}
                canMoveBackward={canMoveBackward}
                onDelete={handleDeleteSelected}
                onBringToFront={() => bringToFront(selectedElement.id)}
                onBringForward={() => bringForward(selectedElement.id)}
                onSendBackward={() => sendBackward(selectedElement.id)}
                onSendToBack={() => sendToBack(selectedElement.id)}
              />

              <M3TextField
                label="Text Content"
                value={selectedElement.content}
                onChange={(event) => handleTextContentChange(event.target.value)}
                onBlur={handleTextContentCommit}
                onKeyDown={handleTextKeyDown}
                placeholder="Enter label text"
              />

              {/* Text Color Picker */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                }}
              >
                <Typography
                  variant="bodySmall"
                  component="label"
                  htmlFor="text-color-picker"
                  color="text.primary"
                  sx={{ fontWeight: 500 }}
                >
                  Text Color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="labelSmall"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {selectedElement.style.color.toUpperCase()}
                  </Typography>
                  <Box
                    component="input"
                    id="text-color-picker"
                    type="color"
                    aria-label="Text Color"
                    value={selectedElement.style.color}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleTextColorChange(event.target.value)
                    }
                    onBlur={handleTextContentCommit}
                    sx={{
                      width: 32,
                      height: 32,
                      p: 0,
                      border: '1px solid var(--md-sys-color-outline-variant)',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                </Box>
              </Box>

              {/* Font Size Slider (4mm - 72mm) */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="bodySmall" color="text.primary" sx={{ fontWeight: 500 }}>
                    Font Size
                  </Typography>
                  <Typography
                    variant="labelMedium"
                    component="span"
                    data-testid="font-size-value"
                    sx={{
                      px: 1.25,
                      py: 0.25,
                      borderRadius: '9999px',
                      fontVariantNumeric: 'tabular-nums',
                      backgroundColor: 'var(--md-sys-color-secondary-container)',
                      color: 'var(--md-sys-color-on-secondary-container)',
                    }}
                  >
                    {selectedElement.style.fontSize} mm
                  </Typography>
                </Box>
                <Slider
                  aria-label="Font Size"
                  value={Math.min(
                    MAX_TEXT_FONT_SIZE_MM,
                    Math.max(MIN_TEXT_FONT_SIZE_MM, selectedElement.style.fontSize),
                  )}
                  min={MIN_TEXT_FONT_SIZE_MM}
                  max={MAX_TEXT_FONT_SIZE_MM}
                  step={0.5}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value} mm`}
                  onChange={(_, nextValue) => {
                    const numeric = Array.isArray(nextValue) ? (nextValue[0] ?? 14) : nextValue;
                    handleTextFontSizeUpdate(numeric, false);
                  }}
                  onChangeCommitted={(_, nextValue) => {
                    const numeric = Array.isArray(nextValue) ? (nextValue[0] ?? 14) : nextValue;
                    handleTextFontSizeUpdate(numeric, true);
                  }}
                  sx={{
                    color: 'var(--md-sys-color-primary)',
                    '& .MuiSlider-rail': {
                      opacity: 0.35,
                      backgroundColor: 'var(--md-sys-color-outline-variant)',
                    },
                  }}
                />
              </Box>

              {/* Font Weight Select (400 / 700) */}
              <FormControl size="small" fullWidth>
                <InputLabel id="text-font-weight-label">Font Weight</InputLabel>
                <Select<number>
                  labelId="text-font-weight-label"
                  id="text-font-weight-select"
                  label="Font Weight"
                  value={selectedElement.style.fontWeight >= 600 ? 700 : 400}
                  onChange={handleTextFontWeightChange}
                  sx={{
                    borderRadius: '12px',
                    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  }}
                >
                  <MenuItem value={400}>Regular (400)</MenuItem>
                  <MenuItem value={700}>Bold (700)</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="bodySmall" color="text.secondary">
                Rotation: {Math.round(selectedElement.transform.rotation)}° • Drag handles to resize
                or rotate; changes bake onto the {selectedFaceName} face in 3D once committed.
              </Typography>
            </Box>
          ) : selectedElement && selectedElement.type === 'image' ? (
            <Box
              data-testid="image-properties-panel"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <SelectedElementMetaSection
                title="Image Artwork"
                side={selectedElement.side}
                faceName={selectedFaceName}
                layerPosition={layerPosition}
                layerTotal={layerTotal}
                canMoveForward={canMoveForward}
                canMoveBackward={canMoveBackward}
                onDelete={handleDeleteSelected}
                onBringToFront={() => bringToFront(selectedElement.id)}
                onBringForward={() => bringForward(selectedElement.id)}
                onSendBackward={() => sendBackward(selectedElement.id)}
                onSendToBack={() => sendToBack(selectedElement.id)}
              />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                }}
              >
                <Box
                  component="img"
                  src={selectedElement.src}
                  alt="Uploaded artwork preview"
                  sx={{
                    width: 48,
                    height: 48,
                    objectFit: 'contain',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="labelMedium" component="div" color="text.primary">
                    {selectedElement.transform.width} × {selectedElement.transform.height} mm
                  </Typography>
                  <Typography variant="bodySmall" color="text.secondary">
                    {selectedElement.naturalWidth} × {selectedElement.naturalHeight} px
                  </Typography>
                </Box>
              </Box>

              <Typography variant="bodySmall" color="text.secondary">
                Drag on the 2D sheet to position within the {selectedFaceName} face; committed edits
                bake directly onto the 3D carton.
              </Typography>
            </Box>
          ) : selectedElement && selectedElement.type === 'shape' ? (
            <Box
              data-testid="shape-properties-panel"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <SelectedElementMetaSection
                title="Shape Properties"
                side={selectedElement.side}
                faceName={selectedFaceName}
                layerPosition={layerPosition}
                layerTotal={layerTotal}
                canMoveForward={canMoveForward}
                canMoveBackward={canMoveBackward}
                onDelete={handleDeleteSelected}
                onBringToFront={() => bringToFront(selectedElement.id)}
                onBringForward={() => bringForward(selectedElement.id)}
                onSendBackward={() => sendBackward(selectedElement.id)}
                onSendToBack={() => sendToBack(selectedElement.id)}
              />

              {selectedElement.fill !== 'none' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: '12px',
                    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <Typography
                    variant="bodySmall"
                    component="label"
                    htmlFor="shape-fill-picker"
                    color="text.primary"
                    sx={{ fontWeight: 500 }}
                  >
                    Fill Color
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="labelSmall"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {selectedElement.fill.toUpperCase()}
                    </Typography>
                    <Box
                      component="input"
                      id="shape-fill-picker"
                      type="color"
                      aria-label="Fill Color"
                      value={selectedElement.fill}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleShapeFillChange(event.target.value)
                      }
                      onBlur={handleTextContentCommit}
                      sx={{
                        width: 32,
                        height: 32,
                        p: 0,
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </Box>
                </Box>
              )}

              <Typography variant="bodySmall" color="text.secondary">
                {selectedElement.transform.width} × {selectedElement.transform.height} mm •{' '}
                {selectedElement.shape === 'circle' ? 'Circle' : 'Rectangle'}
              </Typography>
            </Box>
          ) : (
            <Box
              data-testid="box-dimensions-panel"
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
                <Typography variant="titleSmall" component="h2" color="text.primary">
                  Box Dimensions
                </Typography>
                <Typography
                  variant="labelSmall"
                  component="span"
                  data-testid="box-dimensions-summary"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: '9999px',
                    fontVariantNumeric: 'tabular-nums',
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dimensions.length} × {dimensions.width} × {dimensions.height} mm
                </Typography>
              </Box>

              <FormControl size="small" fullWidth>
                <InputLabel id="box-type-select-label">Box Type</InputLabel>
                <Select<DielineArchetype>
                  labelId="box-type-select-label"
                  id="box-type-select"
                  label="Box Type"
                  value={archetype}
                  onChange={handleArchetypeChange}
                  sx={{
                    borderRadius: '12px',
                    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  }}
                >
                  {Array.from(
                    new Set(DIELINE_ARCHETYPE_OPTIONS.map((option) => option.group)),
                  ).flatMap((group) => [
                    <ListSubheader
                      key={`header-${group}`}
                      disableSticky
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        lineHeight: '28px',
                        color: 'var(--md-sys-color-primary)',
                        backgroundColor: 'var(--md-sys-color-surface-container-low)',
                      }}
                    >
                      {group}
                    </ListSubheader>,
                    ...DIELINE_ARCHETYPE_OPTIONS.filter((option) => option.group === group).map(
                      (option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.label}
                        </MenuItem>
                      ),
                    ),
                  ])}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel id="box-preset-select-label">Preset</InputLabel>
                <Select<string>
                  labelId="box-preset-select-label"
                  id="box-preset-select"
                  label="Preset"
                  value={activePresetValue}
                  onChange={handleDimensionPresetChange}
                  sx={{
                    borderRadius: '12px',
                    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  }}
                >
                  {BOX_DIMENSION_PRESETS.map((preset) => (
                    <MenuItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom" disabled>
                    Custom
                  </MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(
                  [
                    { axis: 'length', label: 'Length', value: lengthInputValue },
                    { axis: 'width', label: 'Width', value: widthInputValue },
                    { axis: 'height', label: 'Height', value: heightInputValue },
                  ] as const
                ).map((field) => (
                  <M3TextField
                    key={field.axis}
                    id={`box-dimension-${field.axis}`}
                    label={field.label}
                    type="number"
                    value={field.value}
                    onChange={(event) => handleDimensionInputChange(field.axis, event.target.value)}
                    onBlur={flushPendingDimensionDraft}
                    onKeyDown={handleDimensionKeyDown}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">mm</InputAdornment>,
                      },
                      htmlInput: {
                        min: MIN_BOX_DIMENSION_MM,
                        max: MAX_BOX_DIMENSION_MM,
                        step: 1,
                      },
                    }}
                  />
                ))}
              </Box>

              <Divider />

              <Typography variant="bodySmall" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                Click &ldquo;Add Text&rdquo; or &ldquo;Upload&rdquo; in the left rail, or select an
                element on the dieline to edit artwork.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
