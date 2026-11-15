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
    id: 'rsc-shipping',
    name: 'FEFCO 0201 (RSC)',
    description:
      'Standard regular slotted shipping box with outer flaps meeting cleanly at center.',
    category: 'Corrugated Shipping',
    archetype: 'fefco-0201',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: 'fefco-0203-overlap',
    name: 'FEFCO 0203 (Full Overlap)',
    description:
      'Heavy-duty slotted container with full-width overlapping top and bottom outer flaps.',
    category: 'Heavy-Duty Shipping',
    archetype: 'fefco-0203',
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
];
