// Central FEFCO/carton archetype registry and unified generateDieline router
import type { Dieline, DielineArchetype } from '@entities/dieline/types';
import { FEFCO_CATALOG_ENTRIES, type FefcoCatalogGroup } from './fefcoCatalogConfigs.ts';
import { generateFefcoBox } from './fefcoFactory.ts';
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

export type DielineArchetypeGroup = 'Retail Cartons' | FefcoCatalogGroup;

export interface DielineArchetypeOption {
  id: DielineArchetype;
  label: string;
  group: DielineArchetypeGroup;
}

const NAMED_FEFCO_GENERATORS: Partial<Record<DielineArchetype, DielineGeneratorFn>> = {
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

export const DIELINE_ARCHETYPE_OPTIONS: readonly DielineArchetypeOption[] = [
  { id: 'tuck-end', label: 'Tuck-End Box', group: 'Retail Cartons' },
  ...FEFCO_CATALOG_ENTRIES.map((entry) => ({
    id: entry.config.id,
    label: entry.config.name,
    group: entry.group,
  })),
];

export const DielineGeneratorRegistry: Readonly<Record<DielineArchetype, DielineGeneratorFn>> = {
  'tuck-end': generateTuckEndBox,
  ...Object.fromEntries(
    FEFCO_CATALOG_ENTRIES.map((entry) => [
      entry.config.id,
      NAMED_FEFCO_GENERATORS[entry.config.id] ??
        ((dimensions: Dieline['dimensions']) => generateFefcoBox(entry.config, dimensions)),
    ]),
  ),
} as Readonly<Record<DielineArchetype, DielineGeneratorFn>>;

/**
 * Routes parametric dieline generation to the registered FEFCO/carton archetype generator.
 */
export function generateDieline(
  archetype: DielineArchetype,
  dimensions: Dieline['dimensions'],
): Dieline {
  const generator = DielineGeneratorRegistry[archetype];
  if (!generator) {
    throw new Error(`Unsupported dieline archetype "${String(archetype)}".`);
  }
  return generator(dimensions);
}
