// Interactive 2D SVG dieline viewport supporting mm coordinates, artwork layer, zoom, and pan
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { generateTuckEndBox } from '@entities/dieline';
import type { Dieline, Point } from '@entities/dieline/types';
import { mmToPx } from '@shared/lib/units';
import { M3Button, M3Icon, M3IconButton } from '@shared/ui';
import { useEditorStore } from './store';
import {
  clampZoom,
  computeFitViewport,
  MAX_STAGE_ZOOM,
  MIN_STAGE_ZOOM,
  type StageViewport,
  zoomAtPoint,
} from './viewport';

const SHEET_EXTRA_MARGIN_MM = 6;
const HUD_ELEVATION_SHADOW = '0px 1px 2px rgba(0, 0, 0, 0.2), 0px 2px 6px 2px rgba(0, 0, 0, 0.1)';
const SHEET_ELEVATION_SHADOW = 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08))';

export interface DielineStageProps {
  dimensions?: Dieline['dimensions'] | undefined;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
}

export function DielineStage({ dimensions }: DielineStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hasAutoFittedRef = useRef(false);
  const dragOriginRef = useRef<{ clientX: number; clientY: number; pan: Point } | null>(null);

  const storeDieline = useEditorStore((state) => state.dieline);
  const elements = useEditorStore((state) => state.elements);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectElement = useEditorStore((state) => state.selectElement);

  const [viewport, setViewport] = useState<StageViewport>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const dieline = useMemo(
    () => (dimensions ? generateTuckEndBox(dimensions) : storeDieline),
    [dimensions, storeDieline],
  );

  const visibleTextElements = useMemo(
    () =>
      elements
        .filter((el) => el.type === 'text' && el.side === 'outside')
        .sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  );

  // Precompute <path> strings for folds once per generated dieline
  const foldPaths = useMemo(
    () =>
      dieline.folds.map((fold) => ({
        id: fold.id,
        d: `M ${fold.from.x},${fold.from.y} L ${fold.to.x},${fold.to.y}`,
      })),
    [dieline.folds],
  );

  // Convert physical mm dimensions to CSS pixels at 96 DPI (3.7795275591 px/mm)
  const baseWidthPx = mmToPx(dieline.totalWidth);
  const baseHeightPx = mmToPx(dieline.totalHeight);
  const paperMarginMm = dieline.dimensions.bleedSize + SHEET_EXTRA_MARGIN_MM;
  const sheetWidthPx = mmToPx(dieline.totalWidth + paperMarginMm * 2);
  const sheetHeightPx = mmToPx(dieline.totalHeight + paperMarginMm * 2);

  const handleFitToScreen = useCallback(
    (maxZoom = MAX_STAGE_ZOOM) => {
      const stageEl = stageRef.current;
      if (!stageEl) {
        return;
      }
      const rect = stageEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      setViewport(
        computeFitViewport(
          { width: rect.width, height: rect.height },
          { width: sheetWidthPx, height: sheetHeightPx },
          { width: baseWidthPx, height: baseHeightPx },
          maxZoom,
        ),
      );
    },
    [baseHeightPx, baseWidthPx, sheetHeightPx, sheetWidthPx],
  );

  const handleResetToActualSize = useCallback(() => {
    const stageEl = stageRef.current;
    const rect = stageEl?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      setViewport({ zoom: 1, pan: { x: 0, y: 0 } });
      return;
    }

    setViewport({
      zoom: 1,
      pan: {
        x: (rect.width - baseWidthPx) / 2,
        y: (rect.height - baseHeightPx) / 2,
      },
    });
  }, [baseHeightPx, baseWidthPx]);

  // Fit the dieline cleanly on first non-zero browser layout without fighting user pan/zoom later
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || hasAutoFittedRef.current) {
        return;
      }
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        hasAutoFittedRef.current = true;
        setViewport(
          computeFitViewport(
            { width, height },
            { width: sheetWidthPx, height: sheetHeightPx },
            { width: baseWidthPx, height: baseHeightPx },
            1,
          ),
        );
      }
    });

    observer.observe(stageEl);
    return () => observer.disconnect();
  }, [baseHeightPx, baseWidthPx, sheetHeightPx, sheetWidthPx]);

  // Track Spacebar hold globally while avoiding conflict with focused form controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (!event.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') {
        return;
      }
      setIsSpacePressed(false);
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Attach non-passive native wheel listener so zoom prevents page scrolling/pinch without warnings
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      let deltaY = event.deltaY;
      if (event.deltaMode === 1) {
        deltaY *= 16;
      } else if (event.deltaMode === 2) {
        deltaY *= 400;
      }
      if (deltaY === 0) {
        return;
      }

      const rect = stageEl.getBoundingClientRect();
      const anchor: Point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const sensitivity = event.ctrlKey ? 0.01 : 0.0015;
      const scaleFactor = Math.exp(-deltaY * sensitivity);

      setViewport((prev) => zoomAtPoint(prev, prev.zoom * scaleFactor, anchor));
    };

    stageEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      stageEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Cleanly handle drag updates on window so fast mouse moves stay locked until mouseup
  useEffect(() => {
    if (!isPanning) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const origin = dragOriginRef.current;
      if (!origin) {
        return;
      }
      const dx = event.clientX - origin.clientX;
      const dy = event.clientY - origin.clientY;
      setViewport((prev) => ({
        zoom: prev.zoom,
        pan: {
          x: origin.pan.x + dx,
          y: origin.pan.y + dy,
        },
      }));
    };

    const stopPanning = () => {
      dragOriginRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopPanning);
    window.addEventListener('blur', stopPanning);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopPanning);
      window.removeEventListener('blur', stopPanning);
    };
  }, [isPanning]);

  const handleStageMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const isMiddleClick = event.button === 1;
    const isSpaceLeftClick = event.button === 0 && isSpacePressed;
    if (!isMiddleClick && !isSpaceLeftClick) {
      if (event.button === 0) {
        selectElement(null);
      }
      return;
    }

    event.preventDefault();
    dragOriginRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pan: viewport.pan,
    };
    setIsPanning(true);
  };

  const zoomAroundStageCenter = (multiplier: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const anchor: Point =
      rect && rect.width > 0 && rect.height > 0
        ? { x: rect.width / 2, y: rect.height / 2 }
        : { x: 0, y: 0 };

    setViewport((prev) => zoomAtPoint(prev, clampZoom(prev.zoom * multiplier), anchor));
  };

  const cursorStyle = isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default';
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <Box
      ref={stageRef}
      data-testid="dieline-stage"
      aria-label="2D Dieline Stage"
      onMouseDown={handleStageMouseDown}
      sx={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        cursor: cursorStyle,
        backgroundColor: 'var(--md-sys-color-surface-container)',
      }}
    >
      <div
        data-testid="stage-transform"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
        }}
      >
        <svg
          data-testid="dieline-svg"
          width={baseWidthPx}
          height={baseHeightPx}
          viewBox={`0 0 ${dieline.totalWidth} ${dieline.totalHeight}`}
          role="img"
          aria-label={`Tuck-end box dieline ${dieline.totalWidth} by ${dieline.totalHeight} millimeters`}
          style={{
            display: 'block',
            overflow: 'visible',
            filter: SHEET_ELEVATION_SHADOW,
          }}
        >
          {/* Paper substrate backdrop */}
          <rect
            data-layer="paper"
            x={-paperMarginMm}
            y={-paperMarginMm}
            width={dieline.totalWidth + paperMarginMm * 2}
            height={dieline.totalHeight + paperMarginMm * 2}
            rx={1.5}
            fill="#ffffff"
            stroke="var(--md-sys-color-outline-variant)"
            strokeWidth={0.35}
          />

          {/* Outer print bleed line (unitless SVG coords equal mm because viewBox is in mm) */}
          <g data-layer="bleeds">
            {dieline.bleeds.map((bleed) => (
              <path
                key={bleed.id}
                d={bleed.path}
                fill="none"
                stroke="#e53935"
                strokeOpacity={0.55}
                strokeWidth={0.1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* 2D Design artwork layer */}
          <g data-layer="artwork">
            {visibleTextElements.map((el) => {
              if (el.type !== 'text') {
                return null;
              }
              const isSelected = el.id === selectedElementId;
              const boxWidth = Math.max(
                el.transform.width,
                el.content.length * el.style.fontSize * 0.62,
              );
              const boxHeight = el.style.fontSize * 1.45;
              return (
                <g
                  key={el.id}
                  data-testid={`stage-text-${el.id}`}
                  onMouseDown={(event) => {
                    if (event.button === 0 && !isSpacePressed) {
                      event.stopPropagation();
                      selectElement(el.id);
                    }
                  }}
                  style={{ cursor: isSpacePressed ? 'grab' : 'pointer' }}
                >
                  {isSelected && (
                    <rect
                      x={el.transform.x - boxWidth * 0.5 - 3}
                      y={el.transform.y - boxHeight * 0.5}
                      width={boxWidth + 6}
                      height={boxHeight}
                      rx={1.5}
                      fill="none"
                      stroke="var(--md-sys-color-primary)"
                      strokeWidth={0.45}
                      strokeDasharray="1.5, 1"
                    />
                  )}
                  <text
                    x={el.transform.x}
                    y={el.transform.y}
                    fontFamily={el.style.fontFamily}
                    fontSize={el.style.fontSize}
                    fontWeight={el.style.fontWeight}
                    fill={el.style.color}
                    opacity={el.opacity}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ userSelect: 'none' }}
                  >
                    {el.content}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Crease / fold lines (1mm dash / 1mm gap in mm viewBox) */}
          <g data-layer="folds">
            {foldPaths.map((fold) => (
              <path
                key={fold.id}
                d={fold.d}
                fill="none"
                stroke="#1976d2"
                strokeWidth={0.2}
                strokeDasharray="1, 1"
              />
            ))}
          </g>

          {/* Die-cut outer contour (0.2mm stroke width in mm viewBox) */}
          <g data-layer="cuts">
            {dieline.cuts.map((cut) => (
              <path
                key={cut.id}
                d={cut.path}
                fill="none"
                stroke="#000000"
                strokeWidth={0.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Subtle dimensions + interaction hint chip */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          zIndex: 10,
          px: 1.5,
          py: 0.75,
          borderRadius: '9999px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="labelSmall" color="text.secondary">
          {dieline.totalWidth} × {dieline.totalHeight} mm • Space + Drag to pan • Scroll to zoom
        </Typography>
      </Box>

      {/* M3 Viewport controls pill (Zoom & Fit to Screen) */}
      <Box
        onMouseDown={(event) => event.stopPropagation()}
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderRadius: '9999px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          boxShadow: HUD_ELEVATION_SHADOW,
        }}
      >
        <M3IconButton
          icon="zoom_out"
          label="Zoom out"
          size="small"
          iconSize={20}
          disabled={viewport.zoom <= MIN_STAGE_ZOOM}
          onClick={(event) => {
            event.currentTarget.blur();
            zoomAroundStageCenter(0.8);
          }}
        />
        <M3Button
          m3Variant="text"
          size="small"
          aria-label="Reset zoom to 100%"
          onClick={(event) => {
            event.currentTarget.blur();
            handleResetToActualSize();
          }}
          sx={{
            minWidth: 52,
            minHeight: 32,
            px: 1,
            color: 'var(--md-sys-color-on-surface)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {zoomPercent}%
        </M3Button>
        <M3IconButton
          icon="zoom_in"
          label="Zoom in"
          size="small"
          iconSize={20}
          disabled={viewport.zoom >= MAX_STAGE_ZOOM}
          onClick={(event) => {
            event.currentTarget.blur();
            zoomAroundStageCenter(1.25);
          }}
        />
        <Divider orientation="vertical" flexItem sx={{ my: 0.75, mx: 0.25 }} />
        <M3Button
          m3Variant="tonal"
          size="small"
          startIcon={<M3Icon name="fit_screen" size={18} />}
          onClick={(event) => {
            event.currentTarget.blur();
            handleFitToScreen();
          }}
          sx={{ minHeight: 32, px: 1.75 }}
        >
          Fit to Screen
        </M3Button>
      </Box>
    </Box>
  );
}
