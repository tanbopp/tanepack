// Interactive 2D SVG dieline viewport supporting mm coordinates, artwork drag, zoom, and pan
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type DesignElement,
  resolveShapeGeometry,
  type ShapeElement,
} from '@entities/design-document';
import {
  computeSvgPathBoundsMm,
  type DielineArchetype,
  generateDieline,
  type SvgPathBoundsMm,
} from '@entities/dieline';
import type { Dieline, Point } from '@entities/dieline/types';
import { mmToPx } from '@shared/lib/units';
import { M3Button, M3Icon, M3IconButton } from '@shared/ui';
import { useEditorStore } from './store';
import {
  clientPointToSvgMm,
  computeCornerResizePatch,
  computeRotationDegreesFromPointer,
  createResizeSnapshot,
  getElementSelectionFrame,
  RESIZE_CORNERS,
  type ResizeCorner,
  type ResizeStartSnapshot,
  type SelectionFrame,
} from './transform';
import {
  clampElementPositionToFace,
  clampZoom,
  computeFitViewport,
  MAX_STAGE_ZOOM,
  MIN_STAGE_ZOOM,
  screenDeltaPxToMm,
  type StageViewport,
  zoomAtPoint,
} from './viewport';

const SHEET_EXTRA_MARGIN_MM = 6;
const HUD_ELEVATION_SHADOW = '0px 1px 2px rgba(0, 0, 0, 0.2), 0px 2px 6px 2px rgba(0, 0, 0, 0.1)';
const SHEET_ELEVATION_SHADOW = 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08))';
const CORNER_HANDLE_RADIUS_MM = 2.2;
const ROTATE_HANDLE_RADIUS_MM = 2.4;

const CORNER_CURSORS: Record<ResizeCorner, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
};

export interface DielineStageProps {
  archetype?: DielineArchetype | undefined;
  dimensions?: Dieline['dimensions'] | undefined;
  isActive?: boolean | undefined;
}

type ActiveTransformInteraction =
  | {
      kind: 'move';
      element: DesignElement;
      pointerId: number | undefined;
      startClientX: number;
      startClientY: number;
      startXMm: number;
      startYMm: number;
      zoomAtStart: number;
      faceBounds: SvgPathBoundsMm;
      hasMoved: boolean;
    }
  | {
      kind: 'rotate';
      elementId: string;
      pointerId: number | undefined;
      center: Point;
      hasMoved: boolean;
    }
  | {
      kind: 'resize';
      element: DesignElement;
      corner: ResizeCorner;
      pointerId: number | undefined;
      snapshot: ResizeStartSnapshot;
      faceBounds: SvgPathBoundsMm;
      hasMoved: boolean;
    };

function renderShapeSvgElement(element: ShapeElement) {
  const geom = resolveShapeGeometry(element);
  const stroke = element.stroke || 'none';
  const strokeWidth = stroke !== 'none' ? element.strokeWidth : 0;

  if (geom.kind === 'ellipse') {
    return (
      <ellipse
        cx={geom.cx}
        cy={geom.cy}
        rx={geom.rx}
        ry={geom.ry}
        fill={element.fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={element.opacity}
        style={{ pointerEvents: 'all' }}
      />
    );
  }

  if (geom.kind === 'polygon') {
    return (
      <polygon
        points={geom.pointsAttr}
        fill={element.fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={element.opacity}
        style={{ pointerEvents: 'all' }}
      />
    );
  }

  return (
    <rect
      x={geom.x}
      y={geom.y}
      width={geom.width}
      height={geom.height}
      fill={element.fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={element.opacity}
      style={{ pointerEvents: 'all' }}
    />
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
}

interface SelectionTransformOverlayProps {
  frame: SelectionFrame;
  element: DesignElement;
  onRotatePointerDown: (event: ReactPointerEvent<SVGCircleElement>, element: DesignElement) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<SVGCircleElement>,
    element: DesignElement,
    corner: ResizeCorner,
  ) => void;
}

function SelectionTransformOverlay({
  frame,
  element,
  onRotatePointerDown,
  onResizePointerDown,
}: SelectionTransformOverlayProps) {
  return (
    <g data-selection-overlay="true">
      <rect
        data-selection-box="true"
        x={frame.rectX}
        y={frame.rectY}
        width={frame.rectWidth}
        height={frame.rectHeight}
        rx={1.5}
        fill="none"
        stroke="var(--md-sys-color-primary)"
        strokeWidth={0.45}
        strokeDasharray="1.5, 1"
        style={{ pointerEvents: 'none' }}
      />
      <line
        x1={frame.center.x}
        y1={frame.rectY}
        x2={frame.rotateHandlePos.x}
        y2={frame.rotateHandlePos.y}
        stroke="var(--md-sys-color-primary)"
        strokeWidth={0.45}
        style={{ pointerEvents: 'none' }}
      />
      <circle
        data-testid="handle-rotate"
        aria-label="Rotate element"
        cx={frame.rotateHandlePos.x}
        cy={frame.rotateHandlePos.y}
        r={ROTATE_HANDLE_RADIUS_MM}
        fill="var(--md-sys-color-primary)"
        stroke="#ffffff"
        strokeWidth={0.55}
        onPointerDown={(event) => onRotatePointerDown(event, element)}
        style={{ cursor: 'grab', pointerEvents: 'all' }}
      />
      {RESIZE_CORNERS.map((corner) => {
        const cornerPoint = frame.corners[corner];
        return (
          <circle
            key={corner}
            data-testid={`handle-resize-${corner}`}
            aria-label={`Resize ${corner.toUpperCase()} corner`}
            cx={cornerPoint.x}
            cy={cornerPoint.y}
            r={CORNER_HANDLE_RADIUS_MM}
            fill="#ffffff"
            stroke="var(--md-sys-color-primary)"
            strokeWidth={0.55}
            onPointerDown={(event) => onResizePointerDown(event, element, corner)}
            style={{ cursor: CORNER_CURSORS[corner], pointerEvents: 'all' }}
          />
        );
      })}
    </g>
  );
}

export function DielineStage({
  archetype = 'tuck-end',
  dimensions,
  isActive = true,
}: DielineStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hasAutoFittedRef = useRef(false);
  const lastAutoFittedSizeRef = useRef<{ totalWidth: number; totalHeight: number } | null>(null);
  const dragOriginRef = useRef<{ clientX: number; clientY: number; pan: Point } | null>(null);
  const activeInteractionRef = useRef<ActiveTransformInteraction | null>(null);
  const viewportRef = useRef<StageViewport>({ zoom: 1, pan: { x: 0, y: 0 } });

  const storeDieline = useEditorStore((state) => state.dieline);
  const elements = useEditorStore((state) => state.elements);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const commitElements = useEditorStore((state) => state.commitElements);

  const [viewport, setViewport] = useState<StageViewport>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const dieline = useMemo(
    () => (dimensions ? generateDieline(archetype, dimensions) : storeDieline),
    [archetype, dimensions, storeDieline],
  );

  const faceBoundsMap = useMemo(() => {
    const map = new Map<string, SvgPathBoundsMm>();
    for (const face of dieline.faces) {
      map.set(face.id, computeSvgPathBoundsMm(face.path));
    }
    return map;
  }, [dieline.faces]);

  const fallbackFaceBounds = useMemo<SvgPathBoundsMm>(
    () => ({
      minX: 0,
      minY: 0,
      maxX: dieline.totalWidth,
      maxY: dieline.totalHeight,
      width: dieline.totalWidth,
      height: dieline.totalHeight,
      center: { x: dieline.totalWidth * 0.5, y: dieline.totalHeight * 0.5 },
    }),
    [dieline.totalHeight, dieline.totalWidth],
  );

  const visibleArtworkElements = useMemo(
    () =>
      elements
        .filter(
          (el) =>
            (el.type === 'text' || el.type === 'image' || el.type === 'shape') &&
            el.side === 'outside',
        )
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
        lastAutoFittedSizeRef.current = {
          totalWidth: dieline.totalWidth,
          totalHeight: dieline.totalHeight,
        };
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
  }, [
    baseHeightPx,
    baseWidthPx,
    dieline.totalHeight,
    dieline.totalWidth,
    sheetHeightPx,
    sheetWidthPx,
  ]);

  // Auto-fit viewport whenever parametric dieline dimensions change after initial mount
  useEffect(() => {
    const prev = lastAutoFittedSizeRef.current;
    if (prev === null) {
      lastAutoFittedSizeRef.current = {
        totalWidth: dieline.totalWidth,
        totalHeight: dieline.totalHeight,
      };
      return;
    }
    if (prev.totalWidth === dieline.totalWidth && prev.totalHeight === dieline.totalHeight) {
      return;
    }

    lastAutoFittedSizeRef.current = {
      totalWidth: dieline.totalWidth,
      totalHeight: dieline.totalHeight,
    };

    const stageEl = stageRef.current;
    if (!stageEl) {
      return;
    }
    const rect = stageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    hasAutoFittedRef.current = true;
    setViewport(
      computeFitViewport(
        { width: rect.width, height: rect.height },
        { width: sheetWidthPx, height: sheetHeightPx },
        { width: baseWidthPx, height: baseHeightPx },
      ),
    );
  }, [
    baseHeightPx,
    baseWidthPx,
    dieline.totalHeight,
    dieline.totalWidth,
    sheetHeightPx,
    sheetWidthPx,
  ]);

  // Track Spacebar hold globally while avoiding conflict with focused form controls
  useEffect(() => {
    if (!isActive) {
      return;
    }

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
      setIsSpacePressed(false);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive]);

  // Attach non-passive native wheel listener so zoom prevents page scrolling/pinch without warnings
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl || !isActive) {
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
  }, [isActive]);

  // Track viewport pan drag on window until mouseup
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

  // Track 2D artwork pointer interactions (move, rotate via atan2, or corner resize) in mm
  useEffect(() => {
    if (!draggingElementId) {
      return;
    }

    const computeMovePatch = (
      interaction: Extract<ActiveTransformInteraction, { kind: 'move' }>,
      clientX: number,
      clientY: number,
    ) => {
      const dxMm = screenDeltaPxToMm(clientX - interaction.startClientX, interaction.zoomAtStart);
      const dyMm = screenDeltaPxToMm(clientY - interaction.startClientY, interaction.zoomAtStart);
      const nextPos = clampElementPositionToFace(
        interaction.element,
        interaction.startXMm + dxMm,
        interaction.startYMm + dyMm,
        interaction.faceBounds,
      );
      return { transform: { x: nextPos.x, y: nextPos.y } };
    };

    const getSvgPointerMm = (clientX: number, clientY: number): Point => {
      const stageRect = stageRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return clientPointToSvgMm(clientX, clientY, stageRect, viewportRef.current);
    };

    const computeInteractionPatch = (
      interaction: ActiveTransformInteraction,
      clientX: number,
      clientY: number,
    ) => {
      if (interaction.kind === 'move') {
        return computeMovePatch(interaction, clientX, clientY);
      }
      const pointerMm = getSvgPointerMm(clientX, clientY);
      if (interaction.kind === 'rotate') {
        return {
          transform: {
            rotation: computeRotationDegreesFromPointer(interaction.center, pointerMm),
          },
        };
      }
      return computeCornerResizePatch(
        interaction.element,
        interaction.corner,
        pointerMm,
        interaction.snapshot,
        interaction.faceBounds,
      );
    };

    const getTargetElementId = (interaction: ActiveTransformInteraction): string =>
      interaction.kind === 'rotate' ? interaction.elementId : interaction.element.id;

    const isMatchingPointer = (
      interaction: ActiveTransformInteraction,
      pointerId: number | undefined,
    ): boolean =>
      interaction.pointerId === undefined ||
      pointerId === undefined ||
      interaction.pointerId === pointerId;

    const handlePointerMove = (event: PointerEvent) => {
      const interaction = activeInteractionRef.current;
      if (!interaction || !isMatchingPointer(interaction, event.pointerId)) {
        return;
      }
      if (
        interaction.kind === 'move' &&
        event.clientX === interaction.startClientX &&
        event.clientY === interaction.startClientY &&
        !interaction.hasMoved
      ) {
        return;
      }
      interaction.hasMoved = true;
      updateElement(
        getTargetElementId(interaction),
        computeInteractionPatch(interaction, event.clientX, event.clientY),
        false,
      );
    };

    const handlePointerFinish = (event: PointerEvent) => {
      const interaction = activeInteractionRef.current;
      if (!interaction || !isMatchingPointer(interaction, event.pointerId)) {
        return;
      }
      activeInteractionRef.current = null;
      setDraggingElementId(null);

      if (interaction.hasMoved) {
        updateElement(
          getTargetElementId(interaction),
          computeInteractionPatch(interaction, event.clientX, event.clientY),
          true,
        );
      }
    };

    const handleWindowBlur = () => {
      const interaction = activeInteractionRef.current;
      if (!interaction) {
        return;
      }
      activeInteractionRef.current = null;
      setDraggingElementId(null);
      if (interaction.hasMoved) {
        commitElements();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerFinish);
    window.addEventListener('pointercancel', handlePointerFinish);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerFinish);
      window.removeEventListener('pointercancel', handlePointerFinish);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [commitElements, draggingElementId, updateElement]);

  const handleElementPointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    element: DesignElement,
  ) => {
    if (isSpacePressed || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    selectElement(element.id);

    const faceBounds = faceBoundsMap.get(element.faceId) ?? fallbackFaceBounds;
    activeInteractionRef.current = {
      kind: 'move',
      element,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startXMm: element.transform.x,
      startYMm: element.transform.y,
      zoomAtStart: viewport.zoom,
      faceBounds,
      hasMoved: false,
    };
    setDraggingElementId(element.id);
  };

  const handleRotatePointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    element: DesignElement,
  ) => {
    if (isSpacePressed || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    selectElement(element.id);

    const frame = getElementSelectionFrame(element);
    activeInteractionRef.current = {
      kind: 'rotate',
      elementId: element.id,
      pointerId: event.pointerId,
      center: frame.center,
      hasMoved: false,
    };
    setDraggingElementId(element.id);
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    element: DesignElement,
    corner: ResizeCorner,
  ) => {
    if (isSpacePressed || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    selectElement(element.id);

    const faceBounds = faceBoundsMap.get(element.faceId) ?? fallbackFaceBounds;
    activeInteractionRef.current = {
      kind: 'resize',
      element,
      corner,
      pointerId: event.pointerId,
      snapshot: createResizeSnapshot(element),
      faceBounds,
      hasMoved: false,
    };
    setDraggingElementId(element.id);
  };

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

  const cursorStyle =
    isPanning || draggingElementId ? 'grabbing' : isSpacePressed ? 'grab' : 'default';
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <Box
      ref={stageRef}
      data-testid="dieline-stage"
      aria-label="2D Dieline Stage"
      aria-hidden={!isActive}
      onMouseDown={isActive ? handleStageMouseDown : undefined}
      sx={{
        position: isActive ? 'relative' : 'absolute',
        ...(isActive ? { flex: 1 } : { inset: 0, zIndex: -1 }),
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        cursor: cursorStyle,
        backgroundColor: 'var(--md-sys-color-surface-container)',
        visibility: isActive ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
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

          {/* 2D Design artwork layer (texts & uploaded raster images sorted by zIndex) */}
          <g data-layer="artwork">
            {visibleArtworkElements.map((el) => {
              const isSelected = el.id === selectedElementId;
              const elementCursor = isSpacePressed
                ? 'grab'
                : draggingElementId === el.id
                  ? 'grabbing'
                  : 'move';
              const frame = getElementSelectionFrame(el);
              const rotationTransform =
                el.transform.rotation !== 0
                  ? `rotate(${el.transform.rotation} ${frame.center.x} ${frame.center.y})`
                  : undefined;

              if (el.type === 'image') {
                return (
                  <g
                    key={el.id}
                    data-testid={`stage-image-${el.id}`}
                    data-element-id={el.id}
                    transform={rotationTransform}
                    onPointerDown={(event) => handleElementPointerDown(event, el)}
                    onMouseDown={(event) => {
                      if (event.button === 0 && !isSpacePressed) {
                        event.stopPropagation();
                      }
                    }}
                    style={{ cursor: elementCursor }}
                  >
                    <image
                      href={el.src}
                      x={el.transform.x}
                      y={el.transform.y}
                      width={el.transform.width}
                      height={el.transform.height}
                      preserveAspectRatio="xMidYMid meet"
                      opacity={el.opacity}
                      style={{ pointerEvents: 'all' }}
                    />
                    {isSelected && (
                      <SelectionTransformOverlay
                        frame={frame}
                        element={el}
                        onRotatePointerDown={handleRotatePointerDown}
                        onResizePointerDown={handleResizePointerDown}
                      />
                    )}
                  </g>
                );
              }

              if (el.type === 'text') {
                return (
                  <g
                    key={el.id}
                    data-testid={`stage-text-${el.id}`}
                    data-element-id={el.id}
                    transform={rotationTransform}
                    onPointerDown={(event) => handleElementPointerDown(event, el)}
                    onMouseDown={(event) => {
                      if (event.button === 0 && !isSpacePressed) {
                        event.stopPropagation();
                      }
                    }}
                    style={{ cursor: elementCursor }}
                  >
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
                    {isSelected && (
                      <SelectionTransformOverlay
                        frame={frame}
                        element={el}
                        onRotatePointerDown={handleRotatePointerDown}
                        onResizePointerDown={handleResizePointerDown}
                      />
                    )}
                  </g>
                );
              }

              if (el.type === 'shape') {
                return (
                  <g
                    key={el.id}
                    data-testid={`stage-shape-${el.id}`}
                    data-element-id={el.id}
                    transform={rotationTransform}
                    onPointerDown={(event) => handleElementPointerDown(event, el)}
                    onMouseDown={(event) => {
                      if (event.button === 0 && !isSpacePressed) {
                        event.stopPropagation();
                      }
                    }}
                    style={{ cursor: elementCursor }}
                  >
                    {renderShapeSvgElement(el)}
                    {isSelected && (
                      <SelectionTransformOverlay
                        frame={frame}
                        element={el}
                        onRotatePointerDown={handleRotatePointerDown}
                        onResizePointerDown={handleResizePointerDown}
                      />
                    )}
                  </g>
                );
              }

              return null;
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

      {isActive && (
        <>
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
        </>
      )}
    </Box>
  );
}
