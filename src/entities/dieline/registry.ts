// Central FEFCO/carton archetype registry and unified generateDieline router
import type { Dieline, DielineArchetype } from '@entities/dieline/types';
import { generateFefco0203 } from './generateFefco0203.ts';
import { generateRsc } from './generateRsc.ts';
import { generateTuckEndBox } from './generateTuckEndBox.ts';

export type DielineGeneratorFn = (dimensions: Dieline['dimensions']) => Dieline;

export interface DielineArchetypeOption {
  id: DielineArchetype;
  label: string;
}

export const DIELINE_ARCHETYPE_OPTIONS: readonly DielineArchetypeOption[] = [
  { id: 'tuck-end', label: 'Tuck-End Box' },
  { id: 'fefco-0201', label: 'FEFCO 0201 (RSC)' },
  { id: 'fefco-0203', label: 'FEFCO 0203 (Full Overlap)' },
];

export const DielineGeneratorRegistry: Readonly<Record<DielineArchetype, DielineGeneratorFn>> = {
  'tuck-end': generateTuckEndBox,
  'fefco-0201': generateRsc,
  'fefco-0203': generateFefco0203,
};

/**
 * Routes parametric dieline generation to the registered FEFCO/carton archetype generator.
 */
export function generateDieline(
  archetype: DielineArchetype,
  dimensions: Dieline['dimensions'],
): Dieline {
  const generator = DielineGeneratorRegistry[archetype];
  if (typeof generator !== 'function') {
    throw new Error(`Unsupported dieline archetype "${String(archetype)}".`);
  }
  return generator(dimensions);
}
