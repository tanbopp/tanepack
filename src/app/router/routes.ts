// Typed route constants and RouteHandle definitions for Tanepack
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  EDITOR: '/editor',
} as const;

export interface RouteMetaHandle {
  title: string;
  showBackButton: boolean;
  hideTopBar?: boolean | undefined;
}
