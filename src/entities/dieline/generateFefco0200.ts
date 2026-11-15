// Parametric dieline generator for FEFCO 0200 (Half Slotted Container / Open-Top RSC)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0200_CONFIG: FefcoConfig = {
  id: 'fefco-0200',
  name: 'FEFCO 0200 (Half Slotted)',
  flapConfig: { top: 'none', bottom: 'rsc' },
  panelStyle: 'standard',
};

/**
 * Generates a 9-face FEFCO 0200 Half Slotted Container dieline with an open top and RSC bottom flaps.
 */
export function generateFefco0200(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0200_CONFIG, dimensions);
}
