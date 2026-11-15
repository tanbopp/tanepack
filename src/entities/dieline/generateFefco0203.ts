// Parametric dieline generator for FEFCO 0203 (Full Overlap Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { FEFCO_CONFIG_BY_ID } from './fefcoCatalogConfigs.ts';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0203_CONFIG: FefcoConfig = FEFCO_CONFIG_BY_ID['fefco-0203']!;

/**
 * Generates a 13-face FEFCO 0203 Full Overlap Slotted Container where all top and bottom flaps extend 1.0 W.
 */
export function generateFefco0203(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0203_CONFIG, dimensions);
}
