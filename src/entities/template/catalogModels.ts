// Catalog metadata for public structural packaging archetypes rendered on /templates
import type { DielineArchetype } from '@entities/dieline';
import type { TemplateDimensions } from '@entities/template/mockTemplates';

export interface PackagingCatalogModel {
  id: string;
  name: string;
  description: string;
  category: string;
  archetype: DielineArchetype;
  defaultDimensions: TemplateDimensions;
}

export const PACKAGING_CATALOG_MODELS: readonly PackagingCatalogModel[] = [
  {
    id: 'tuck-end-retail',
    name: 'Tuck-End Box',
    description:
      'Classic folding carton with top and bottom tuck flaps and dust ears for retail display.',
    category: 'Retail Carton',
    archetype: 'tuck-end',
    defaultDimensions: { length: 100, width: 50, height: 100 },
  },
  {
    id: 'fefco-0200-hsc',
    name: 'FEFCO 0200 (Half Slotted)',
    description:
      'Open-top half slotted container with W/2 bottom flaps ideal for trays and telescoping covers.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0200',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'rsc-shipping',
    name: 'FEFCO 0201 (RSC)',
    description:
      'Standard regular slotted shipping box with W/2 outer flaps meeting cleanly at center.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0201',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0202-overlap',
    name: 'FEFCO 0202 (Overlap Slotted)',
    description:
      'Partial overlap slotted box with ½(W + o) outer flaps overlapping cleanly across center.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0202',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0203-overlap',
    name: 'FEFCO 0203 (Full Overlap)',
    description:
      'Heavy-duty slotted container with full-width W overlapping top and bottom outer flaps.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0203',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0204-cssc',
    name: 'FEFCO 0204 (Center Special Slotted)',
    description:
      'Center-meeting ½ W outer flaps and ½ L inner flaps eliminating hollow center gaps.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0204',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0205-csoc',
    name: 'FEFCO 0205 (Center Special Overlap)',
    description:
      'Uniform ½ L top and bottom flaps delivering overlapping outer closure and flush inner seams.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0205',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0206-csfoc',
    name: 'FEFCO 0206 (Center Special Full Overlap)',
    description:
      'Full-depth W outer flaps paired with ½ L inner flaps for maximum stacking rigidity.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0206',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0209-short-top',
    name: 'FEFCO 0209 (Short Top Flap)',
    description:
      'Reduced top retention flaps (0.25 W) over a standard W/2 RSC base for quick access packing.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0209',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0215-mix',
    name: 'FEFCO 0215 (Overlap Top / RSC Bottom)',
    description:
      'Full-overlap W top closure combined with a standard W/2 RSC bottom for reinforced lids.',
    category: 'FEFCO 0200 Series',
    archetype: 'fefco-0215',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
];
