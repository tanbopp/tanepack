// TanStack Query cloud sync, URL UUID resolution, Zustand hydration, and debounced auto-save
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEditorStore } from '@features/editor-stage';
import {
  buildProjectDocument,
  DEFAULT_PROJECT_NAME,
  type DesignElement,
  fetchProject,
  saveProject,
} from '@entities/design-document';
import type { Dieline } from '@entities/dieline';
import { env } from '@shared/config/env';
import { createUuid, isValidUuid } from '@shared/lib/id';
import { createSupabaseClient } from '@shared/lib/supabase';
import { useGuestSession } from '@shared/lib/useGuestSession';

export const AUTO_SAVE_DEBOUNCE_MS = 2000;

export type CloudSaveStatus = 'saved' | 'saving' | 'error';

export interface ProjectPersistenceState {
  projectId: string;
  projectName: string;
  saveStatus: CloudSaveStatus;
  statusErrorMessage: string | null;
  renameProject: (nextName: string) => void;
  flushPendingSave: () => Promise<void>;
}

interface EditorSnapshot {
  dieline: Dieline;
  committedElements: DesignElement[];
  name: string;
}

interface SaveMutationVariables {
  projectId: string;
  guestId: string;
  name: string;
  dieline: Dieline;
  committedElements: DesignElement[];
}

let lastEditorProjectId: string | null = null;

/** Resets module-level project switch tracking (for deterministic unit test isolation). */
export function resetProjectPersistenceTracking(): void {
  lastEditorProjectId = null;
}

/** Coordinates Supabase project hydration and 2s debounced auto-save for the active editor store. */
export function useProjectPersistence(): ProjectPersistenceState {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('id');
  const [fallbackProjectId] = useState<string>(() => createUuid());
  const projectId = isValidUuid(urlProjectId) ? urlProjectId : fallbackProjectId;

  const guestId = useGuestSession();
  const isSupabaseConfigured = createSupabaseClient() !== null;

  const dieline = useEditorStore((state) => state.dieline);
  const committedElements = useEditorStore((state) => state.committedElements);

  const [nameOverride, setNameOverride] = useState<{ projectId: string; name: string } | null>(
    null,
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectCreatedAtRef = useRef(new Date().toISOString());
  const insideElementsRef = useRef<DesignElement[]>([]);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const syncedSnapshotRef = useRef<EditorSnapshot>({
    dieline,
    committedElements,
    name: DEFAULT_PROJECT_NAME,
  });
  const initialMountSnapshotRef = useRef<{
    dieline: Dieline;
    committedElements: DesignElement[];
  }>({
    dieline,
    committedElements,
  });

  // Sync valid project UUID into ?id= so browser refreshes reload the same database row
  useEffect(() => {
    if (urlProjectId === projectId) {
      return;
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('id', projectId);
        return next;
      },
      { replace: true },
    );
  }, [projectId, setSearchParams, urlProjectId]);

  // Reset store only when switching between different project IDs in the same SPA session
  useEffect(() => {
    if (lastEditorProjectId !== null && lastEditorProjectId !== projectId) {
      useEditorStore.getState().reset();
      const freshState = useEditorStore.getState();
      syncedSnapshotRef.current = {
        dieline: freshState.dieline,
        committedElements: freshState.committedElements,
        name: DEFAULT_PROJECT_NAME,
      };
      initialMountSnapshotRef.current = {
        dieline: freshState.dieline,
        committedElements: freshState.committedElements,
      };
      hydratedProjectIdRef.current = null;
      projectCreatedAtRef.current = new Date().toISOString();
      insideElementsRef.current = [];
    }
    lastEditorProjectId = projectId;
  }, [projectId]);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: isSupabaseConfigured && isValidUuid(projectId),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (projectQuery.isError) {
      console.error('Failed to load project from Supabase:', projectQuery.error);
    }
  }, [projectQuery.error, projectQuery.isError]);

  // Populate Zustand once from fetched design_json unless user already edited before load settled
  useEffect(() => {
    if (!projectQuery.isSuccess) {
      return;
    }

    const loaded = projectQuery.data;
    if (!loaded) {
      hydratedProjectIdRef.current = projectId;
      return;
    }

    if (hydratedProjectIdRef.current === projectId) {
      return;
    }

    const currentState = useEditorStore.getState();
    const initialSnapshot = initialMountSnapshotRef.current;
    const hasEditedBeforeHydration =
      currentState.dieline !== initialSnapshot.dieline ||
      currentState.committedElements !== initialSnapshot.committedElements;

    if (hasEditedBeforeHydration) {
      hydratedProjectIdRef.current = projectId;
      return;
    }

    const nextName = loaded.name.trim() || DEFAULT_PROJECT_NAME;
    const outsideElements = loaded.layers.outside;

    hydratedProjectIdRef.current = projectId;
    projectCreatedAtRef.current = loaded.createdAt || new Date().toISOString();
    insideElementsRef.current = loaded.layers.inside;

    syncedSnapshotRef.current = {
      dieline: loaded.dieline,
      committedElements: outsideElements,
      name: nextName,
    };

    useEditorStore.setState({
      dieline: loaded.dieline,
      elements: outsideElements,
      committedElements: outsideElements,
      selectedElementId: null,
    });
  }, [projectId, projectQuery.data, projectQuery.isSuccess]);

  const projectName =
    nameOverride?.projectId === projectId
      ? nameOverride.name
      : projectQuery.data?.name.trim() || DEFAULT_PROJECT_NAME;

  const saveMutation = useMutation({
    mutationFn: async (variables: SaveMutationVariables) => {
      const payload = buildProjectDocument({
        id: variables.projectId,
        name: variables.name,
        createdAt: projectCreatedAtRef.current,
        dieline: variables.dieline,
        outsideElements: variables.committedElements,
        insideElements: insideElementsRef.current,
        seedColor: env.seedColor,
      });

      return saveProject(variables.projectId, payload, variables.guestId);
    },
    onSuccess: (saved, variables) => {
      syncedSnapshotRef.current = {
        dieline: variables.dieline,
        committedElements: variables.committedElements,
        name: saved.name,
      };
      queryClient.setQueryData(['project', variables.projectId], saved);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      console.error('Failed to auto-save project to Supabase:', err);
    },
  });

  const { mutate, mutateAsync } = saveMutation;

  // Debounce cloud writes 2 seconds after committedElements, dieline, or projectName changes settle
  useEffect(() => {
    if (!isSupabaseConfigured || !isValidUuid(projectId) || !isValidUuid(guestId)) {
      return;
    }

    if (!projectQuery.isFetched) {
      return;
    }

    const synced = syncedSnapshotRef.current;
    if (
      dieline === synced.dieline &&
      committedElements === synced.committedElements &&
      projectName === synced.name
    ) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      mutate({
        projectId,
        guestId,
        name: projectName,
        dieline,
        committedElements,
      });
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [
    committedElements,
    dieline,
    guestId,
    isSupabaseConfigured,
    mutate,
    projectId,
    projectName,
    projectQuery.isFetched,
  ]);

  const renameProject = useCallback(
    (nextName: string) => {
      const normalized = nextName.trim() || DEFAULT_PROJECT_NAME;
      setNameOverride({ projectId, name: normalized });
    },
    [projectId],
  );

  const flushPendingSave = useCallback(async () => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!isSupabaseConfigured || !isValidUuid(projectId) || !isValidUuid(guestId)) {
      return;
    }

    const state = useEditorStore.getState();
    const synced = syncedSnapshotRef.current;
    const isDirty =
      state.dieline !== synced.dieline ||
      state.committedElements !== synced.committedElements ||
      projectName !== synced.name;

    if (!isDirty) {
      return;
    }

    try {
      await mutateAsync({
        projectId,
        guestId,
        name: projectName,
        dieline: state.dieline,
        committedElements: state.committedElements,
      });
    } catch {
      // Mutation onError already logs details; do not trap user navigation
    }
  }, [guestId, isSupabaseConfigured, mutateAsync, projectId, projectName]);

  let saveStatus: CloudSaveStatus = 'saved';
  let statusErrorMessage: string | null = null;

  if (saveMutation.isPending) {
    saveStatus = 'saving';
  } else if (saveMutation.isError) {
    saveStatus = 'error';
    statusErrorMessage =
      saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save project';
  } else if (projectQuery.isError) {
    saveStatus = 'error';
    statusErrorMessage =
      projectQuery.error instanceof Error ? projectQuery.error.message : 'Failed to load project';
  }

  return {
    projectId,
    projectName,
    saveStatus,
    statusErrorMessage,
    renameProject,
    flushPendingSave,
  };
}
