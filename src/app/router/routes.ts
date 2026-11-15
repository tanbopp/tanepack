// Typed route constants and RouteHandle definitions for Tanepack
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  EDITOR: '/editor',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

export interface RouteMetaHandle {
  title: string;
  showBackButton: boolean;
  hideTopBar?: boolean | undefined;
}
