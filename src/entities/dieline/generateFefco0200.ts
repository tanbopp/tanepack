// Parametric dieline generator for FEFCO 0200 (Half Slotted Container / Open-Top RSC)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0200_CONFIG: FefcoConfig = {
  id: 'fefco-0200',
  name: 'FEFCO 0200 (Half Slotted)',
  topFlapType: 'none',
  bottomFlapType: 'rsc',
  flapMath: {
    topOuter: 0,
    bottomOuter: 0.5,
    inner: 0.5,
    topOuterBasis: 'W',
    bottomOuterBasis: 'W',
    innerBasis: 'W',
  },
  hasGlueTab: true,
  panelStyle: 'standard',
};

/**
 * Generates a 9-face FEFCO 0200 Half Slotted Container dieline with an open top and W/2 RSC bottom flaps.
 */
export function generateFefco0200(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0200_CONFIG, dimensions);
}
