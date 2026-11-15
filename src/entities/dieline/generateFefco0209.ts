// Parametric dieline generator for FEFCO 0209 (Short Top Flap / RSC Bottom Slotted Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

/** Standard short top flap ratio `v = 0.25 * W` measured from ref-fefco-0200.pdf (`14.82 / 59.58 = 0.249 * W`). */
export const FEFCO_0209_TOP_FLAP_RATIO = 0.25;

export const FEFCO_0209_CONFIG: FefcoConfig = {
  id: 'fefco-0209',
  name: 'FEFCO 0209 (Short Top Flap)',
  topFlapType: 'custom',
  bottomFlapType: 'rsc',
  flapMath: {
    topOuter: FEFCO_0209_TOP_FLAP_RATIO,
    bottomOuter: 0.5,
    inner: 0.5,
    topInner: FEFCO_0209_TOP_FLAP_RATIO,
    bottomInner: 0.5,
    topOuterBasis: 'W',
    bottomOuterBasis: 'W',
    innerBasis: 'W',
  },
  hasGlueTab: true,
  panelStyle: 'standard',
};

/**
 * Generates a 13-face FEFCO 0209 Short-Flap Slotted Container with partial `v = 0.25 * W` top flaps
 * and full `½ W` RSC bottom flaps.
 */
export function generateFefco0209(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0209_CONFIG, dimensions);
}
