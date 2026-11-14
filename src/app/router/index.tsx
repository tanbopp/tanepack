// Application browser router with lazy-loaded pages and route metadata handles
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { type RouteMetaHandle, ROUTES } from '@app/router/routes';
import { AppShell } from '@widgets/app-shell/AppShell';
import { M3CircularProgress } from '@shared/ui';

const HomePage = lazy(() => import('@pages/home/HomePage'));
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));
const EditorPage = lazy(() => import('@pages/editor/EditorPage'));
const NotFoundPage = lazy(() => import('@pages/not-found/NotFoundPage'));

const homeHandle: RouteMetaHandle = {
  title: 'Tanepack',
  showBackButton: false,
};

const dashboardHandle: RouteMetaHandle = {
  title: 'Tanepack — My Designs',
  showBackButton: true,
};

const editorHandle: RouteMetaHandle = {
  title: 'Tanepack — Editor',
  showBackButton: true,
  hideTopBar: true,
};

const notFoundHandle: RouteMetaHandle = {
  title: 'Tanepack',
  showBackButton: false,
};

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        {
          path: ROUTES.HOME,
          element: (
            <Suspense fallback={<M3CircularProgress />}>
              <HomePage />
            </Suspense>
          ),
          handle: homeHandle,
        },
        {
          path: ROUTES.DASHBOARD,
          element: (
            <Suspense fallback={<M3CircularProgress />}>
              <DashboardPage />
            </Suspense>
          ),
          handle: dashboardHandle,
        },
        {
          path: ROUTES.EDITOR,
          element: (
            <Suspense fallback={<M3CircularProgress />}>
              <EditorPage />
            </Suspense>
          ),
          handle: editorHandle,
        },
        {
          path: '*',
          element: (
            <Suspense fallback={<M3CircularProgress />}>
              <NotFoundPage />
            </Suspense>
          ),
          handle: notFoundHandle,
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export function AppRouter() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
