// Public barrel exports for dieline entity types, generators, registry, and millimeter bounds helpers
export {
  FEFCO_CATALOG_ENTRIES,
  FEFCO_CONFIG_BY_ID,
  type FefcoCatalogEntry,
  type FefcoCatalogGroup,
} from '@entities/dieline/fefcoCatalogConfigs';
export { generateFefcoBox } from '@entities/dieline/fefcoFactory';
export { generateFefco0200 } from '@entities/dieline/generateFefco0200';
export { generateFefco0202 } from '@entities/dieline/generateFefco0202';
export { generateFefco0203 } from '@entities/dieline/generateFefco0203';
export { generateFefco0204 } from '@entities/dieline/generateFefco0204';
export { generateFefco0205 } from '@entities/dieline/generateFefco0205';
export { generateFefco0206 } from '@entities/dieline/generateFefco0206';
export { generateFefco0209 } from '@entities/dieline/generateFefco0209';
export { generateFefco0215 } from '@entities/dieline/generateFefco0215';
export { generateRsc } from '@entities/dieline/generateRsc';
export { generateTuckEndBox } from '@entities/dieline/generateTuckEndBox';
export { computeSvgPathBoundsMm, roundMm, type SvgPathBoundsMm } from '@entities/dieline/geometry';
export {
  DIELINE_ARCHETYPE_OPTIONS,
  type DielineArchetypeGroup,
  type DielineArchetypeOption,
  type DielineGeneratorFn,
  DielineGeneratorRegistry,
  generateDieline,
} from '@entities/dieline/registry';
export type {
  Bleed,
  Cut,
  Dieline,
  DielineArchetype,
  Face,
  FefcoAxisBasis,
  FefcoColumnLayout,
  FefcoConfig,
  FefcoFlapEndPreset,
  FefcoFlapMath,
  FefcoFlapType,
  FefcoPanelStyle,
  Fold,
  FoldGroup,
  Point,
  Unit,
} from '@entities/dieline/types';
