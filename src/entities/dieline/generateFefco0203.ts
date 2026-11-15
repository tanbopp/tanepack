// Parametric dieline generator for FEFCO 0203 (Full Overlap Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0203_CONFIG: FefcoConfig = {
  id: 'fefco-0203',
  name: 'FEFCO 0203 (Full Overlap)',
  flapConfig: { top: 'full', bottom: 'full' },
  panelStyle: 'standard',
};

/**
 * Generates a 13-face FEFCO 0203 Full Overlap Slotted Container dieline in ISO millimeters.
 * Outer flaps attached to Front and Back span full `(width + thickness)` depth and stack into staggered 3D layers.
 */
export function generateFefco0203(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0203_CONFIG, dimensions);
}
