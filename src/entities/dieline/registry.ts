// Central FEFCO/carton archetype registry and unified generateDieline router
import type { Dieline, DielineArchetype } from '@entities/dieline/types';
import { generateFefco0200 } from './generateFefco0200.ts';
import { generateFefco0202 } from './generateFefco0202.ts';
import { generateFefco0203 } from './generateFefco0203.ts';
import { generateFefco0204 } from './generateFefco0204.ts';
import { generateFefco0205 } from './generateFefco0205.ts';
import { generateFefco0206 } from './generateFefco0206.ts';
import { generateFefco0209 } from './generateFefco0209.ts';
import { generateFefco0215 } from './generateFefco0215.ts';
import { generateRsc } from './generateRsc.ts';
import { generateTuckEndBox } from './generateTuckEndBox.ts';

export type DielineGeneratorFn = (dimensions: Dieline['dimensions']) => Dieline;

export type DielineArchetypeGroup = 'Retail Cartons' | 'FEFCO 0200 Series (Slotted)';

export interface DielineArchetypeOption {
  id: DielineArchetype;
  label: string;
  group: DielineArchetypeGroup;
}

export const DIELINE_ARCHETYPE_OPTIONS: readonly DielineArchetypeOption[] = [
  { id: 'tuck-end', label: 'Tuck-End Box', group: 'Retail Cartons' },
  { id: 'fefco-0200', label: 'FEFCO 0200 (Half Slotted)', group: 'FEFCO 0200 Series (Slotted)' },
  { id: 'fefco-0201', label: 'FEFCO 0201 (RSC)', group: 'FEFCO 0200 Series (Slotted)' },
  {
    id: 'fefco-0202',
    label: 'FEFCO 0202 (Overlap Slotted)',
    group: 'FEFCO 0200 Series (Slotted)',
  },
  { id: 'fefco-0203', label: 'FEFCO 0203 (Full Overlap)', group: 'FEFCO 0200 Series (Slotted)' },
  {
    id: 'fefco-0204',
    label: 'FEFCO 0204 (Center Special Slotted)',
    group: 'FEFCO 0200 Series (Slotted)',
  },
  {
    id: 'fefco-0205',
    label: 'FEFCO 0205 (Center Special Overlap)',
    group: 'FEFCO 0200 Series (Slotted)',
  },
  {
    id: 'fefco-0206',
    label: 'FEFCO 0206 (Center Special Full Overlap)',
    group: 'FEFCO 0200 Series (Slotted)',
  },
  {
    id: 'fefco-0209',
    label: 'FEFCO 0209 (Short Top Flap)',
    group: 'FEFCO 0200 Series (Slotted)',
  },
  {
    id: 'fefco-0215',
    label: 'FEFCO 0215 (Overlap Top / RSC Bottom)',
    group: 'FEFCO 0200 Series (Slotted)',
  },
];

export const DielineGeneratorRegistry: Readonly<Record<DielineArchetype, DielineGeneratorFn>> = {
  'tuck-end': generateTuckEndBox,
  'fefco-0200': generateFefco0200,
  'fefco-0201': generateRsc,
  'fefco-0202': generateFefco0202,
  'fefco-0203': generateFefco0203,
  'fefco-0204': generateFefco0204,
  'fefco-0205': generateFefco0205,
  'fefco-0206': generateFefco0206,
  'fefco-0209': generateFefco0209,
  'fefco-0215': generateFefco0215,
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
