// Typed route constants and RouteHandle definitions for Tanepack
export const ROUTES = {
  HOME: '/',
  TEMPLATES: '/templates',
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
