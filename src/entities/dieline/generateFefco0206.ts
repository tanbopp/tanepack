// Parametric dieline generator for FEFCO 0206 (Center Special Full Overlap Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0206_CONFIG: FefcoConfig = {
  id: 'fefco-0206',
  name: 'FEFCO 0206 (Center Special Full Overlap)',
  topFlapType: 'full',
  bottomFlapType: 'full',
  flapMath: {
    topOuter: 1,
    bottomOuter: 1,
    inner: 0.5,
    topOuterBasis: 'W',
    bottomOuterBasis: 'W',
    innerBasis: 'L',
  },
  hasGlueTab: true,
  panelStyle: 'standard',
};

/**
 * Generates a 13-face FEFCO 0206 Center Special Full Overlap Container with full-depth `W` outer
 * flaps and center-meeting `½ L` inner flaps on both top and bottom.
 */
export function generateFefco0206(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0206_CONFIG, dimensions);
}
