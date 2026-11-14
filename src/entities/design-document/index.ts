// Public barrel exports for packaging design document types and persistence API
export {
  buildProjectDocument,
  type BuildProjectDocumentParams,
  buildProjectThumbnailDataUrl,
  DEFAULT_PROJECT_NAME,
  fetchProject,
  fetchUserProjects,
  isValidProjectDocument,
  PROJECTS_TABLE,
  type ProjectSummary,
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
