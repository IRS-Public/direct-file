import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { JSON_SCHEMA } from 'js-yaml';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.SCREENER_PUBLIC_PATH || '/',
  assetsInclude: ['**/*.svg'],
  plugins: [react(), viteTsconfigPaths(), ViteYaml({ schema: JSON_SCHEMA })],
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    postcss: {
      plugins: [autoprefixer() as any],
    },
    preprocessorOptions: {
      scss: {
        loadPaths: [`../node_modules/@uswds`, `../node_modules/@uswds/uswds/packages`],
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 3500,
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  envPrefix: ['STATIC_SITE'],
  build: {
    /**
     * More on why this is needed with Vite:
     * https://github.com/vitejs/vite/discussions/6849, which leads to:
     * https://dev.to/meduzen/when-vite-ignores-your-browserslist-configuration-3hoe
     *
     * Todo: figure out if a separate development environment browserlist is
     * needed.
     */
    target: browserslistToEsbuild(['>0.2%', 'not dead', 'not op_mini all']),
  },
});
