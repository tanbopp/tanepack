// Parametric dieline generator for FEFCO 0206 (Center Special Full Overlap Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { FEFCO_CONFIG_BY_ID } from './fefcoCatalogConfigs.ts';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0206_CONFIG: FefcoConfig = FEFCO_CONFIG_BY_ID['fefco-0206']!;

/**
 * Generates a 13-face FEFCO 0206 Center Special Full Overlap carton with 1.0 W outer flaps and L/2 inner flaps.
 */
export function generateFefco0206(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0206_CONFIG, dimensions);
}
