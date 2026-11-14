// Public barrel exports for the 2D editor dieline stage feature
export { DielineStage, type DielineStageProps } from './DielineStage';
export {
  type AddImageElementOptions,
  type AddTextElementOptions,
  DEFAULT_DIELINE_DIMENSIONS,
  DEFAULT_IMAGE_SIZE_MM,
  DEFAULT_TEXT_CONTENT,
  type EditorStageStoreState,
  type ElementPatch,
  type TextElementPatch,
  useEditorStore,
} from './store';
export {
  clientPointToSvgMm,
  computeCornerResizePatch,
  computeRotationDegreesFromPointer,
  computeTextFontSizePatch,
  createResizeSnapshot,
  getElementSelectionFrame,
  MAX_TEXT_FONT_SIZE_MM,
  MIN_IMAGE_SIZE_MM,
  MIN_TEXT_FONT_SIZE_MM,
  RESIZE_CORNERS,
  type ResizeCorner,
  type ResizeElementPatch,
  type ResizeStartSnapshot,
  ROTATE_HANDLE_OFFSET_MM,
  type SelectionFrame,
} from './transform';
export {
  clampElementPositionToFace,
  clampZoom,
  computeFitViewport,
  MAX_STAGE_ZOOM,
  MIN_STAGE_ZOOM,
  screenDeltaPxToMm,
  STAGE_FIT_PADDING_PX,
  type StageSize,
  type StageViewport,
  zoomAtPoint,
} from './viewport';
