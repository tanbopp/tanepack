// Unit tests for Supabase project fetch and upsert API helpers
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateTuckEndBox } from '@entities/dieline';
import * as supabaseLib from '@shared/lib/supabase';
import {
  buildProjectDocument,
  DEFAULT_PROJECT_NAME,
  fetchProject,
  fetchUserProjects,
  saveProject,
} from './api';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const GUEST_ID = '22222222-2222-4222-8222-222222222222';

function createSampleProject(name = DEFAULT_PROJECT_NAME) {
  return buildProjectDocument({
    id: PROJECT_ID,
    name,
    createdAt: '2026-11-14T16:00:00.000Z',
    updatedAt: '2026-11-14T16:05:00.000Z',
    dieline: generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    }),
    outsideElements: [],
    seedColor: '#7B5E3B',
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('design-document persistence API', () => {
  it('returns null from fetchProject when Supabase is unconfigured', async () => {
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue(null);

    const loaded = await fetchProject(PROJECT_ID);

    expect(loaded).toBeNull();
  });

  it('fetches design_json for the matching project ID from Supabase', async () => {
    const sample = createSampleProject('Olive Oil Carton');
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { design_json: sample },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
    } as unknown as SupabaseClient);

    const loaded = await fetchProject(PROJECT_ID);

    expect(from).toHaveBeenCalledWith('projects');
    expect(select).toHaveBeenCalledWith('design_json');
    expect(eq).toHaveBeenCalledWith('id', PROJECT_ID);
    expect(loaded).toEqual(sample);
  });

  it('throws when fetchProject receives a Supabase error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
    } as unknown as SupabaseClient);

    await expect(fetchProject(PROJECT_ID)).rejects.toThrow(/permission denied/);
  });

  it('upserts id, user_id, name, and design_json via saveProject', async () => {
    const sample = createSampleProject('');
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
    } as unknown as SupabaseClient);

    const saved = await saveProject(PROJECT_ID, sample, GUEST_ID);

    expect(from).toHaveBeenCalledWith('projects');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PROJECT_ID,
        user_id: GUEST_ID,
        name: DEFAULT_PROJECT_NAME,
        design_json: expect.objectContaining({
          id: PROJECT_ID,
          name: DEFAULT_PROJECT_NAME,
        }),
      }),
      { onConflict: 'id' },
    );
    expect(saved.name).toBe(DEFAULT_PROJECT_NAME);
  });

  it('throws when saveProject fails on unconfigured client or DB error', async () => {
    const sample = createSampleProject();
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue(null);

    await expect(saveProject(PROJECT_ID, sample, GUEST_ID)).rejects.toThrow(
      /Supabase client is not configured/,
    );

    const upsert = vi.fn().mockResolvedValue({
      error: { message: 'violates row-level security policy' },
    });
    const from = vi.fn().mockReturnValue({ upsert });
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
    } as unknown as SupabaseClient);

    await expect(saveProject(PROJECT_ID, sample, GUEST_ID)).rejects.toThrow(
      /violates row-level security policy/,
    );
  });

  it('lists saved projects for a guest UUID ordered by updated_at descending via fetchUserProjects', async () => {
    const sample = createSampleProject('Mint Carton');
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: PROJECT_ID,
          user_id: GUEST_ID,
          name: 'Mint Carton',
          thumbnail_url: 'data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E',
          created_at: '2026-11-14T16:00:00.000Z',
          updated_at: '2026-11-14T16:05:00.000Z',
          design_json: sample,
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
    } as unknown as SupabaseClient);

    const rows = await fetchUserProjects(GUEST_ID);

    expect(from).toHaveBeenCalledWith('projects');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('user_id', GUEST_ID);
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: PROJECT_ID,
      userId: GUEST_ID,
      name: 'Mint Carton',
      updatedAt: '2026-11-14T16:05:00.000Z',
    });
    expect(rows[0]?.designJson?.id).toBe(PROJECT_ID);
  });

  it('includes a compact SVG thumbnail data URL when saving a project', async () => {
    const sample = createSampleProject('Logo Box');
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
    } as unknown as SupabaseClient);

    const saved = await saveProject(PROJECT_ID, sample, GUEST_ID);

    expect(saved.metadata.thumbnail).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnail_url: expect.stringMatching(/^data:image\/svg\+xml;utf8,/),
      }),
      { onConflict: 'id' },
    );
  });

  it('uses supabase.auth.getUser().id for saveProject and fetchUserProjects when authenticated', async () => {
    const AUTH_USER_ID = '99999999-9999-4999-8999-999999999999';
    const sample = createSampleProject('Auth Roast Box');
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: AUTH_USER_ID } },
      error: null,
    });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ upsert, select });

    vi.spyOn(supabaseLib, 'createSupabaseClient').mockReturnValue({
      from,
      auth: { getUser },
    } as unknown as SupabaseClient);

    await saveProject(PROJECT_ID, sample, GUEST_ID);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PROJECT_ID,
        user_id: AUTH_USER_ID,
      }),
      { onConflict: 'id' },
    );

    await fetchUserProjects(GUEST_ID);
    expect(eq).toHaveBeenCalledWith('user_id', AUTH_USER_ID);
  });
});
