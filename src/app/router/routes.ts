// Typed route constants and RouteHandle definitions for Tanepack
export const ROUTES = {
  HOME: '/',
  EDITOR: '/editor',
} as const;

export interface RouteMetaHandle {
  title: string;
  showBackButton: boolean;
}
