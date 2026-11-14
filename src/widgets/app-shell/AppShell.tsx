// Primary layout shell combining sticky M3 TopBar with routed page Outlet
import Box from '@mui/material/Box';
import { Outlet, useMatches } from 'react-router-dom';
import { TopBar } from '@widgets/app-shell/TopBar';

interface RouteHandle {
  title?: string | undefined;
  showBackButton?: boolean | undefined;
  hideTopBar?: boolean | undefined;
}

function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null;
}

export function AppShell() {
  const matches = useMatches();
  const activeHandle = [...matches]
    .reverse()
    .map((m) => m.handle)
    .find(isRouteHandle);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {!activeHandle?.hideTopBar && (
        <TopBar title={activeHandle?.title} showBackButton={activeHandle?.showBackButton} />
      )}
      <Box
        component="main"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
