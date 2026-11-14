// Vite bundler configuration with D: cache directory and FSD path aliases
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function resolvePath(relativePath: string): string {
  return decodeURIComponent(new URL(relativePath, import.meta.url).pathname).replace(
    /^\/([A-Za-z]:)/,
    '$1',
  );
}

export default defineConfig({
  cacheDir: 'D:/DevCache/vite',
  plugins: [react()],
  resolve: {
    alias: {
      '@app': resolvePath('./src/app'),
      '@pages': resolvePath('./src/pages'),
      '@widgets': resolvePath('./src/widgets'),
      '@features': resolvePath('./src/features'),
      '@entities': resolvePath('./src/entities'),
      '@shared': resolvePath('./src/shared'),
    },
  },
  build: {
    target: 'es2020',
  },
});
