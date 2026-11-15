// TanStack Query cloud sync, Supabase Auth user scoping, URL UUID resolution, and debounced auto-save
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
import {
  DIELINE_ARCHETYPE_OPTIONS,
  type Dieline,
  type DielineArchetype,
  DielineGeneratorRegistry,
} from '@entities/dieline';
import { findTemplateById } from '@entities/template';
import { env } from '@shared/config/env';
import { createUuid, isValidUuid } from '@shared/lib/id';
import { createSupabaseClient } from '@shared/lib/supabase';
import { useAuth } from '@shared/lib/useAuth';
import { useGuestSession } from '@shared/lib/useGuestSession';

export const AUTO_SAVE_DEBOUNCE_MS = 2000;

export type CloudSaveStatus = 'saved' | 'saving' | 'error' | 'guest';

export interface ProjectPersistenceState {
  projectId: string;
  projectName: string;
  saveStatus: CloudSaveStatus;
  isGuestMode: boolean;
  guestId: string;
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
  userId: string;
  name: string;
  dieline: Dieline;
  committedElements: DesignElement[];
}

let lastEditorProjectId: string | null = null;

/** Resets module-level project switch tracking (for deterministic unit test isolation). */
export function resetProjectPersistenceTracking(): void {
  lastEditorProjectId = null;
}

function parseArchetypeParam(raw: string | null): DielineArchetype | null {
  if (!raw) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(DielineGeneratorRegistry, raw)
    ? (raw as DielineArchetype)
    : null;
}

function parsePositiveDimensionParam(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveInitialDeepLinkName(
  projectId: string,
  urlProjectId: string | null,
  urlTemplateId: string | null,
  urlArchetypeParam: string | null,
): { projectId: string; name: string } | null {
  if (isValidUuid(urlProjectId)) {
    return null;
  }
  const matchedTemplate = findTemplateById(urlTemplateId);
  if (matchedTemplate) {
    return { projectId, name: matchedTemplate.name };
  }
  const parsedArchetype = parseArchetypeParam(urlArchetypeParam);
  if (!parsedArchetype) {
    return null;
  }
  const label = DIELINE_ARCHETYPE_OPTIONS.find((option) => option.id === parsedArchetype)?.label;
  return label ? { projectId, name: label } : null;
}

/** Coordinates Supabase project hydration and 2s debounced auto-save for authenticated users, with Guest Mode fallback. */
export function useProjectPersistence(): ProjectPersistenceState {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('id');
  const urlTemplateId = searchParams.get('template');
  const urlArchetypeParam = searchParams.get('archetype');
  const urlLengthParam = searchParams.get('l');
  const urlWidthParam = searchParams.get('w');
  const urlHeightParam = searchParams.get('h');
  const [fallbackProjectId] = useState<string>(() => createUuid());
  const projectId = isValidUuid(urlProjectId) ? urlProjectId : fallbackProjectId;

  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const guestId = useGuestSession();
  const isSupabaseConfigured = createSupabaseClient() !== null;
  const authUserId = isAuthenticated && user && isValidUuid(user.id) ? user.id : null;
  const canCloudSync =
    isSupabaseConfigured && !isAuthLoading && authUserId !== null && isValidUuid(projectId);
  const isGuestMode = !isAuthLoading && authUserId === null;

  const dieline = useEditorStore((state) => state.dieline);
  const committedElements = useEditorStore((state) => state.committedElements);

  const [nameOverride, setNameOverride] = useState<{ projectId: string; name: string } | null>(() =>
    resolveInitialDeepLinkName(projectId, urlProjectId, urlTemplateId, urlArchetypeParam),
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectCreatedAtRef = useRef(new Date().toISOString());
  const insideElementsRef = useRef<DesignElement[]>([]);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const appliedTemplateKeyRef = useRef<string | null>(null);
  const appliedDeepLinkKeyRef = useRef<string | null>(null);
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

  // Reset store on project switch, apply ?template= or ?archetype=&l=&w=&h= deep-links, and sync valid ?id= UUID
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
      appliedTemplateKeyRef.current = null;
      appliedDeepLinkKeyRef.current = null;
      projectCreatedAtRef.current = new Date().toISOString();
      insideElementsRef.current = [];
    }
    lastEditorProjectId = projectId;

    const isNewProject = !isValidUuid(urlProjectId);
    const matchedTemplate = isNewProject ? findTemplateById(urlTemplateId) : undefined;
    if (matchedTemplate) {
      const applyKey = `${projectId}:${matchedTemplate.id}`;
      if (appliedTemplateKeyRef.current !== applyKey) {
        appliedTemplateKeyRef.current = applyKey;
        useEditorStore.getState().applyTemplate(matchedTemplate);
      }
    } else if (isNewProject) {
      const parsedArchetype = parseArchetypeParam(urlArchetypeParam);
      const parsedL = parsePositiveDimensionParam(urlLengthParam);
      const parsedW = parsePositiveDimensionParam(urlWidthParam);
      const parsedH = parsePositiveDimensionParam(urlHeightParam);
      const hasDeepLinkValues =
        parsedArchetype !== null || parsedL !== null || parsedW !== null || parsedH !== null;

      if (hasDeepLinkValues) {
        const deepLinkKey = `${projectId}:${parsedArchetype ?? ''}:${parsedL ?? ''}:${parsedW ?? ''}:${parsedH ?? ''}`;
        if (appliedDeepLinkKeyRef.current !== deepLinkKey) {
          appliedDeepLinkKeyRef.current = deepLinkKey;
          const store = useEditorStore.getState();
          if (parsedArchetype !== null) {
            store.setArchetype(parsedArchetype);
          }
          if (parsedL !== null || parsedW !== null || parsedH !== null) {
            const currentDims = useEditorStore.getState().dimensions;
            store.setDimensions(
              parsedL ?? currentDims.length,
              parsedW ?? currentDims.width,
              parsedH ?? currentDims.height,
            );
          }
        }
      }
    }

    const hasDeepLinkQueryParams =
      urlArchetypeParam !== null ||
      urlLengthParam !== null ||
      urlWidthParam !== null ||
      urlHeightParam !== null;

    if (
      urlProjectId !== projectId ||
      (matchedTemplate && urlTemplateId !== null) ||
      (isNewProject && hasDeepLinkQueryParams)
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('id', projectId);
          next.delete('template');
          next.delete('archetype');
          next.delete('l');
          next.delete('w');
          next.delete('h');
          return next;
        },
        { replace: true },
      );
    }
  }, [
    projectId,
    setSearchParams,
    urlArchetypeParam,
    urlHeightParam,
    urlLengthParam,
    urlProjectId,
    urlTemplateId,
    urlWidthParam,
  ]);

  const projectQuery = useQuery({
    queryKey: ['project', authUserId, projectId],
    queryFn: () => fetchProject(projectId),
    enabled: canCloudSync,
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
      archetype: loaded.dieline.archetype ?? 'tuck-end',
      dieline: loaded.dieline,
      dimensions: loaded.dieline.dimensions,
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

      return saveProject(variables.projectId, payload, variables.userId);
    },
    onSuccess: (saved, variables) => {
      syncedSnapshotRef.current = {
        dieline: variables.dieline,
        committedElements: variables.committedElements,
        name: saved.name,
      };
      queryClient.setQueryData(['project', variables.userId, variables.projectId], saved);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      console.error('Failed to auto-save project to Supabase:', err);
    },
  });

  const { mutate, mutateAsync } = saveMutation;

  // Debounce cloud writes 2 seconds after committedElements, dieline, or projectName changes settle
  useEffect(() => {
    if (!canCloudSync || !authUserId) {
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
        userId: authUserId,
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
    authUserId,
    canCloudSync,
    committedElements,
    dieline,
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

    if (!canCloudSync || !authUserId) {
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
        userId: authUserId,
        name: projectName,
        dieline: state.dieline,
        committedElements: state.committedElements,
      });
    } catch {
      // Mutation onError already logs details; do not trap user navigation
    }
  }, [authUserId, canCloudSync, mutateAsync, projectId, projectName]);

  let saveStatus: CloudSaveStatus = 'saved';
  let statusErrorMessage: string | null = null;

  if (isGuestMode) {
    saveStatus = 'guest';
  } else if (saveMutation.isPending) {
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
    isGuestMode,
    guestId,
    statusErrorMessage,
    renameProject,
    flushPendingSave,
  };
}
