// Public barrel exports for packaging design document types and persistence API
export {
  buildProjectDocument,
  type BuildProjectDocumentParams,
  DEFAULT_PROJECT_NAME,
  fetchProject,
  isValidProjectDocument,
  PROJECTS_TABLE,
  saveProject,
} from '@entities/design-document/api';
export type {
  DesignElement,
  DesignElementBase,
  ImageElement,
  Project,
  ShapeElement,
  TextElement,
} from '@entities/design-document/types';
