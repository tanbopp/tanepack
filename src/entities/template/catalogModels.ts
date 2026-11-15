// Curated public template catalog backing /templates with live parametric previews
import {
  type DielineArchetype,
  FEFCO_CATALOG_ENTRIES,
  type FefcoCatalogGroup,
} from '@entities/dieline';
import type { TemplateDimensions } from '@entities/template/mockTemplates';

export interface PackagingCatalogModel {
  id: string;
  name: string;
  description: string;
  category: string;
  archetype: DielineArchetype;
  defaultDimensions: TemplateDimensions;
}

const GROUP_TO_CATALOG_CATEGORY: Record<FefcoCatalogGroup, string> = {
  'FEFCO 0200 (Slotted)': 'Slotted',
  'FEFCO 0200 (Tuck Top)': 'Tuck Top',
  'FEFCO 0200 (Crash Lock)': 'Crash Lock',
};

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
  ...FEFCO_CATALOG_ENTRIES.map((entry) => ({
    id: `${entry.config.id}-catalog`,
    name: entry.config.name,
    description: entry.description,
    category: GROUP_TO_CATALOG_CATEGORY[entry.group],
    archetype: entry.config.id,
    defaultDimensions: entry.defaultDimensions,
  })),
];
