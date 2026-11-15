// Public barrel exports for dieline entity types, generators, registry, and millimeter bounds helpers
export { generateFefcoBox } from '@entities/dieline/fefcoFactory';
export { generateFefco0200 } from '@entities/dieline/generateFefco0200';
export { generateFefco0203 } from '@entities/dieline/generateFefco0203';
export { generateFefco0215 } from '@entities/dieline/generateFefco0215';
export { generateRsc } from '@entities/dieline/generateRsc';
export { generateTuckEndBox } from '@entities/dieline/generateTuckEndBox';
export { computeSvgPathBoundsMm, roundMm, type SvgPathBoundsMm } from '@entities/dieline/geometry';
export {
  DIELINE_ARCHETYPE_OPTIONS,
  DielineGeneratorRegistry,
  type DielineArchetypeOption,
  type DielineGeneratorFn,
  generateDieline,
} from '@entities/dieline/registry';
export type {
  Bleed,
  Cut,
  Dieline,
  DielineArchetype,
  Face,
  FefcoConfig,
  FefcoFlapType,
  FefcoPanelStyle,
  Fold,
  FoldGroup,
  Point,
  Unit,
} from '@entities/dieline/types';
