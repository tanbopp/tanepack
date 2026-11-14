// Public barrel exports for the 2D editor dieline stage feature
export { DielineStage, type DielineStageProps } from './DielineStage';
export {
  type AddTextElementOptions,
  DEFAULT_DIELINE_DIMENSIONS,
  DEFAULT_TEXT_CONTENT,
  type EditorStageStoreState,
  type TextElementPatch,
  useEditorStore,
} from './store';
export {
  clampZoom,
  computeFitViewport,
  MAX_STAGE_ZOOM,
  MIN_STAGE_ZOOM,
  STAGE_FIT_PADDING_PX,
  type StageSize,
  type StageViewport,
  zoomAtPoint,
} from './viewport';
