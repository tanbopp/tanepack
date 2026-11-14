// Public barrel exports for dieline entity types, generator, and millimeter bounds helpers
export { generateTuckEndBox } from '@entities/dieline/generateTuckEndBox';
export { computeSvgPathBoundsMm, roundMm, type SvgPathBoundsMm } from '@entities/dieline/geometry';
export type {
  Bleed,
  Cut,
  Dieline,
  Face,
  Fold,
  FoldGroup,
  Point,
  Unit,
} from '@entities/dieline/types';
