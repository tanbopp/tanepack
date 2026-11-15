// Application browser router with lazy-loaded pages and route metadata handles
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import { ErrorFallbackView } from '@app/providers/ErrorBoundary';
import { type RouteMetaHandle, ROUTES } from '@app/router/routes';
import { AppShell } from '@widgets/app-shell/AppShell';
import { M3CircularProgress } from '@shared/ui';

const HomePage = lazy(() => import('@pages/home/HomePage'));
const TemplatesPage = lazy(() => import('@pages/templates/TemplatesPage'));
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));
const EditorPage = lazy(() => import('@pages/editor/EditorPage'));
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'));
const NotFoundPage = lazy(() => import('@pages/not-found/NotFoundPage'));

const homeHandle: RouteMetaHandle = {
  title: 'Tanepack',
  showBackButton: false,
  hideTopBar: true,
};

const routeFallback = <M3CircularProgress label="Loading Tanepack..." />;

const dashboardHandle: RouteMetaHandle = {
  title: 'Tanepack — My Designs',
  showBackButton: true,
};

const templatesHandle: RouteMetaHandle = {
  title: 'Tanepack — Packaging Models',
  showBackButton: true,
};

const editorHandle: RouteMetaHandle = {
  title: 'Tanepack — Editor',
  showBackButton: true,
  hideTopBar: true,
};

const authHandle: RouteMetaHandle = {
  title: 'Tanepack',
  showBackButton: true,
};

const notFoundHandle: RouteMetaHandle = {
  title: 'Tanepack',
  showBackButton: false,
};

function RouteErrorFallback() {
  const error = useRouteError();
  console.error('Unhandled route error caught by router errorElement:', error);
  return <ErrorFallbackView />;
}

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      errorElement: <RouteErrorFallback />,
      children: [
        {
          path: ROUTES.HOME,
          element: (
            <Suspense fallback={routeFallback}>
              <HomePage />
            </Suspense>
          ),
          handle: homeHandle,
        },
        {
          path: ROUTES.TEMPLATES,
          element: (
            <Suspense fallback={routeFallback}>
              <TemplatesPage />
            </Suspense>
          ),
          handle: templatesHandle,
        },
        {
          path: ROUTES.DASHBOARD,
          element: (
            <Suspense fallback={routeFallback}>
              <DashboardPage />
            </Suspense>
          ),
          handle: dashboardHandle,
        },
        {
          path: ROUTES.EDITOR,
          element: (
            <Suspense fallback={routeFallback}>
              <EditorPage />
            </Suspense>
          ),
          handle: editorHandle,
        },
        {
          path: ROUTES.LOGIN,
          element: (
            <Suspense fallback={routeFallback}>
              <LoginPage />
            </Suspense>
          ),
          handle: authHandle,
        },
        {
          path: ROUTES.REGISTER,
          element: (
            <Suspense fallback={routeFallback}>
              <RegisterPage />
            </Suspense>
          ),
          handle: authHandle,
        },
        {
          path: '*',
          element: (
            <Suspense fallback={routeFallback}>
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
