// Parametric dieline generator for FEFCO 0215 (Tuck Top / 1-2-3 Snap-Lock Bottom)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { FEFCO_CONFIG_BY_ID } from './fefcoCatalogConfigs.ts';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0215_CONFIG: FefcoConfig = FEFCO_CONFIG_BY_ID['fefco-0215']!;

/**
 * Generates a 12-face FEFCO 0215 Tuck Top / 1-2-3 Snap-Lock Bottom carton calibrated to PDF page 8.
 */
export function generateFefco0215(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0215_CONFIG, dimensions);
}
