// Parametric dieline generator for FEFCO 0215 (Full Overlap Top + RSC Bottom Container)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0215_CONFIG: FefcoConfig = {
  id: 'fefco-0215',
  name: 'FEFCO 0215 (Overlap Top / RSC Bottom)',
  topFlapType: 'full',
  bottomFlapType: 'rsc',
  flapMath: {
    topOuter: 1,
    bottomOuter: 0.5,
    inner: 0.5,
    topInner: 1,
    bottomInner: 0.5,
    topOuterBasis: 'W',
    bottomOuterBasis: 'W',
    innerBasis: 'W',
  },
  hasGlueTab: true,
  panelStyle: 'standard',
};

/**
 * Generates a 13-face FEFCO 0215 asymmetric slotted container with full-overlap top flaps and RSC bottom flaps.
 */
export function generateFefco0215(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0215_CONFIG, dimensions);
}
