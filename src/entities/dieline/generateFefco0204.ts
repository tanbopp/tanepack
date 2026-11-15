// Parametric dieline generator for FEFCO 0204 (Center Special Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { FEFCO_CONFIG_BY_ID } from './fefcoCatalogConfigs.ts';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0204_CONFIG: FefcoConfig = FEFCO_CONFIG_BY_ID['fefco-0204']!;

/**
 * Generates a 13-face FEFCO 0204 Center Special Slotted Container with W/2 outer flaps and L/2 inner flaps.
 */
export function generateFefco0204(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0204_CONFIG, dimensions);
}
