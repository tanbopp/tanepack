// Supabase persistence API and document builders for packaging design projects
import type { DesignElement, Project } from '@entities/design-document/types';
import type { Dieline } from '@entities/dieline';
import { createSupabaseClient } from '@shared/lib/supabase';

export const PROJECTS_TABLE = 'projects';
export const DEFAULT_PROJECT_NAME = 'Untitled Box';

export interface ProjectSummary {
  id: string;
  userId: string;
  name: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  designJson: Project | null;
}

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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Builds a lightweight SVG data URL preview capturing dieline contours and outside text artwork. */
export function buildProjectThumbnailDataUrl(project: Project): string {
  const pad = 8;
  const width = Math.max(10, project.dieline.totalWidth);
  const height = Math.max(10, project.dieline.totalHeight);
  const viewBox = `${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`;

  const foldsMarkup = project.dieline.folds
    .map(
      (fold) =>
        `<line x1="${fold.from.x}" y1="${fold.from.y}" x2="${fold.to.x}" y2="${fold.to.y}" stroke="#1976d2" stroke-width="0.6" stroke-dasharray="2 2"/>`,
    )
    .join('');

  const cutsMarkup = project.dieline.cuts
    .map(
      (cut) => `<path d="${escapeXml(cut.path)}" fill="none" stroke="#1b1b1f" stroke-width="0.9"/>`,
    )
    .join('');

  const artworkMarkup = project.layers.outside
    .map((el) => {
      if (el.type === 'text') {
        const transform =
          el.transform.rotation !== 0
            ? ` transform="rotate(${el.transform.rotation} ${el.transform.x} ${el.transform.y})"`
            : '';
        return `<text x="${el.transform.x}" y="${el.transform.y}" font-size="${el.style.fontSize}" font-weight="${el.style.fontWeight}" fill="${escapeXml(el.style.color)}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif"${transform}>${escapeXml(el.content)}</text>`;
      }
      if (el.type === 'image') {
        const cx = el.transform.x + el.transform.width * 0.5;
        const cy = el.transform.y + el.transform.height * 0.5;
        const transform =
          el.transform.rotation !== 0
            ? ` transform="rotate(${el.transform.rotation} ${cx} ${cy})"`
            : '';
        return `<rect x="${el.transform.x}" y="${el.transform.y}" width="${el.transform.width}" height="${el.transform.height}" rx="2" fill="#e6eeea" stroke="#4f635a" stroke-width="0.6"${transform}/>`;
      }
      return '';
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect x="${-pad}" y="${-pad}" width="${width + pad * 2}" height="${height + pad * 2}" fill="#ffffff"/>${foldsMarkup}${cutsMarkup}${artworkMarkup}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

/** Fetches all saved projects belonging to a guest/user UUID, newest updated first. */
export async function fetchUserProjects(userId: string): Promise<ProjectSummary[]> {
  const supabase = createSupabaseClient();
  if (!supabase || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter(isRecord)
    .map((row): ProjectSummary => {
      const id = typeof row.id === 'string' ? row.id : '';
      const rowUserId = typeof row.user_id === 'string' ? row.user_id : userId;
      const rawName = typeof row.name === 'string' ? row.name.trim() : '';
      return {
        id,
        userId: rowUserId,
        name: rawName || DEFAULT_PROJECT_NAME,
        thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
        createdAt: typeof row.created_at === 'string' ? row.created_at : '',
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
        designJson: isValidProjectDocument(row.design_json) ? row.design_json : null,
      };
    })
    .filter((summary) => summary.id.length > 0);
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
  const updatedAt = projectData.updatedAt || new Date().toISOString();
  const thumbnailUrl = buildProjectThumbnailDataUrl(projectData);
  const payload: Project = {
    ...projectData,
    id: projectId,
    name: normalizedName,
    updatedAt,
    metadata: {
      ...projectData.metadata,
      thumbnail: thumbnailUrl,
    },
  };

  const { error } = await supabase.from(PROJECTS_TABLE).upsert(
    {
      id: projectId,
      user_id: userId,
      name: normalizedName,
      design_json: payload,
      thumbnail_url: thumbnailUrl,
      updated_at: payload.updatedAt,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(`Failed to save project: ${error.message}`);
  }

  return payload;
}
