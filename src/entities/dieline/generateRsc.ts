// Parametric dieline generator for FEFCO 0201 (Regular Slotted Container / RSC)
import type { Dieline } from '@entities/dieline/types';
import { generateSlottedBox } from './generateSlottedBox.ts';

/**
 * Generates a 13-face FEFCO 0201 Regular Slotted Container (RSC) dieline in ISO millimeters.
 * Outer flaps attached to Front and Back have height `(width + thickness) / 2` so they meet cleanly at center.
 */
export function generateRsc(dimensions: Dieline['dimensions']): Dieline {
  return generateSlottedBox(dimensions, {
    archetype: 'fefco-0201',
    outerFlapRatio: 0.5,
    overlapOuterFlaps: false,
  });
}
