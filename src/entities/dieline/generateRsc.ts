// Parametric dieline generator for FEFCO 0201 (Regular Slotted Container / RSC)
import type { Dieline, FefcoConfig } from '@entities/dieline/types';
import { generateFefcoBox } from './fefcoFactory.ts';

export const FEFCO_0201_CONFIG: FefcoConfig = {
  id: 'fefco-0201',
  name: 'FEFCO 0201 (RSC)',
  topFlapType: 'rsc',
  bottomFlapType: 'rsc',
  flapMath: {
    topOuter: 0.5,
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
 * Generates a 13-face FEFCO 0201 Regular Slotted Container (RSC) dieline in ISO millimeters.
 * Outer flaps attached to Front and Back have height `(width + thickness) / 2` so they meet cleanly at center.
 */
export function generateRsc(dimensions: Dieline['dimensions']): Dieline {
  return generateFefcoBox(FEFCO_0201_CONFIG, dimensions);
}
