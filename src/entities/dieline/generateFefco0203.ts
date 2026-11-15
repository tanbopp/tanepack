// Parametric dieline generator for FEFCO 0203 (Full Overlap Slotted Container)
import type { Dieline } from '@entities/dieline/types';
import { generateSlottedBox } from './generateSlottedBox.ts';

/**
 * Generates a 13-face FEFCO 0203 Full Overlap Slotted Container dieline in ISO millimeters.
 * Outer flaps attached to Front and Back span full `(width + thickness)` depth and stack into staggered 3D Z layers.
 */
export function generateFefco0203(dimensions: Dieline['dimensions']): Dieline {
  return generateSlottedBox(dimensions, {
    archetype: 'fefco-0203',
    outerFlapRatio: 1,
    overlapOuterFlaps: true,
  });
}
