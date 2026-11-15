// Parametric dieline generator for FEFCO 0205 (Center Special Overlap Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0205_CONFIG: FefcoConfig = {
  id: 'fefco-0205',
  name: 'FEFCO 0205 (Center Special Overlap)',
  topFlapType: 'extended',
  bottomFlapType: 'extended',
  flapMath: {
    topOuter: 0.5,
    bottomOuter: 0.5,
    inner: 0.5,
    topOuterBasis: 'L',
    bottomOuterBasis: 'L',
    innerBasis: 'L',
  },
  hasGlueTab: true,
  panelStyle: 'standard',
};

/**
 * Generates a 13-face FEFCO 0205 Center Special Overlap Slotted Container where all top and bottom
 * flaps extend `½ L`, causing outer flaps to overlap across `W` while inner flaps meet at `L/2`.
 */
export function generateFefco0205(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0205_CONFIG, dimensions);
}
