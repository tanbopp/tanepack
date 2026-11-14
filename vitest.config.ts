// Vitest configuration using jsdom environment and FSD path aliases
import { defineConfig } from 'vitest/config';

function resolvePath(relativePath: string): string {
  return decodeURIComponent(new URL(relativePath, import.meta.url).pathname).replace(
    /^\/([A-Za-z]:)/,
    '$1',
  );
}

export default defineConfig({
  cacheDir: 'D:/DevCache/vite',
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
  test: {
    environment: 'jsdom',
  },
});
