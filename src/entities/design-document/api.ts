// Supabase persistence API and document builders for packaging design projects
import type { DesignElement, Project } from '@entities/design-document/types';
import type { Dieline } from '@entities/dieline';
import { createSupabaseClient } from '@shared/lib/supabase';

export const PROJECTS_TABLE = 'projects';
export const DEFAULT_PROJECT_NAME = 'Untitled Box';

export interface BuildProjectDocumentParams {
  id: string;
  name?: string | undefined;
  createdAt: string;
  updatedAt?: string | undefined;
  dieline: Dieline;
  outsideElements: DesignElement[];
  insideElements?: DesignElement[] | undefined;
  seedColor?: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validates the minimum structural fields required to hydrate a stored Project document. */
export function isValidProjectDocument(value: unknown): value is Project {
  if (!isRecord(value)) {
    return false;
  }
  if (!isRecord(value.dieline) || !isRecord(value.layers)) {
    return false;
  }
  return (
    Array.isArray(value.dieline.faces) &&
    Array.isArray(value.layers.outside) &&
    Array.isArray(value.layers.inside)
  );
}

/** Builds a normalized version-1 Project payload ready for serialization and storage. */
export function buildProjectDocument({
  id,
  name,
  createdAt,
  updatedAt,
  dieline,
  outsideElements,
  insideElements = [],
  seedColor,
}: BuildProjectDocumentParams): Project {
  const nowIso = new Date().toISOString();
  const normalizedName = name?.trim() || DEFAULT_PROJECT_NAME;

  return {
    id,
    version: 1,
    name: normalizedName,
    createdAt: createdAt || nowIso,
    updatedAt: updatedAt || nowIso,
    dieline,
    layers: {
      outside: outsideElements,
      inside: insideElements,
    },
    metadata: {
      ...(seedColor ? { seedColor } : {}),
    },
  };
}

/** Fetches the stored design_json document for a project ID from Supabase, or null when missing. */
export async function fetchProject(projectId: string): Promise<Project | null> {
  const supabase = createSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .select('design_json')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  const designJson: unknown = data?.design_json;
  if (!designJson) {
    return null;
  }

  if (!isValidProjectDocument(designJson)) {
    throw new Error('Stored project design_json has an invalid structure.');
  }

  return designJson;
}

/** Upserts a packaging design Project row into Supabase using projectId and guest/user UUID. */
export async function saveProject(
  projectId: string,
  projectData: Project,
  userId: string,
): Promise<Project> {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const normalizedName = projectData.name.trim() || DEFAULT_PROJECT_NAME;
  const payload: Project = {
    ...projectData,
    id: projectId,
    name: normalizedName,
    updatedAt: projectData.updatedAt || new Date().toISOString(),
  };

  const { error } = await supabase.from(PROJECTS_TABLE).upsert(
    {
      id: projectId,
      user_id: userId,
      name: normalizedName,
      design_json: payload,
      updated_at: payload.updatedAt,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(`Failed to save project: ${error.message}`);
  }

  return payload;
}
