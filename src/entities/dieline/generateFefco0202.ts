// Parametric dieline generator for FEFCO 0202 (Partial Overlap Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

/** Standard overlap fraction (`o = 0.1 * W`) measured directly from ref-fefco-0200.pdf (`½(W + o) = 0.55 * W`). */
export const FEFCO_0202_OVERLAP_RATIO = 0.1;
export const FEFCO_0202_FLAP_RATIO = (1 + FEFCO_0202_OVERLAP_RATIO) * 0.5; // 0.55 * W

export const FEFCO_0202_CONFIG: FefcoConfig = {
  id: 'fefco-0202',
  name: 'FEFCO 0202 (Overlap Slotted)',
  topFlapType: 'extended',
  bottomFlapType: 'extended',
  flapMath: {
    topOuter: FEFCO_0202_FLAP_RATIO,
    bottomOuter: FEFCO_0202_FLAP_RATIO,
    inner: FEFCO_0202_FLAP_RATIO,
    topOuterBasis: 'W',
    bottomOuterBasis: 'W',
    innerBasis: 'W',
  },
  hasGlueTab: true,
  panelStyle: 'standard',
};

/**
 * Generates a 13-face FEFCO 0202 Partial Overlap Slotted Container where opposing flaps extend
 * to `½(W + o) = 0.55 * W` (`o = 0.1 * W` overlap) per FEFCO 12th ed. geometry.
 */
export function generateFefco0202(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0202_CONFIG, dimensions);
}
