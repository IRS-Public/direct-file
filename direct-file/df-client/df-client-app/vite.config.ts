import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { JSON_SCHEMA } from 'js-yaml';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import autoprefixer from 'autoprefixer';
import path from 'path';

export default defineConfig({
  base: process.env.DF_CLIENT_PUBLIC_PATH || '/df/file',
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
        loadPaths: ['../node_modules/@uswds', '../node_modules/@uswds/uswds/packages'],
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
  envPrefix: ['VITE', 'REACT_APP'],
  server: {
    port: 3000,
    proxy: {
      // Mock OLA
      '/ola/rest/taxpayer/taxRecord': {
        bypass: (_req, res, _options) => {
          res!.write(
            JSON.stringify({
              transcriptSummary: {
                panelShowing: true,
                transcriptModules: [
                  {
                    year: 2022,
                    taxRecord: {
                      form: `1040`,
                      status: `SINGLE`,
                      exemption: 1,
                      agi: 1337.0,
                      totalLabel: `REFUND`,
                      total: 26,
                    },
                  },
                ],
              },
            })
          );
          res!.end();
          return 'Bypassed'; // string return value prevents this from going to the original req.target
        },
      },
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // This causes the js-factgraph-scala library to end up in vite's cache, where it won't
  // update, even when we change the library. This is required because scala.js outputs commonjs modules.
  // I tried having scalajs output esm modules and removing this but esbuild does a bad job
  // tree shaking the scala.js output modules -- it would add 3mb of rendered javascript to
  // the page.
  //
  // However, we can add "force" here to blow away the vite cache every time we run "npm start".
  // It blows away the cache, and only seems to come with a ~50ms penalty on npm start. This should
  // prevent developers from ever having an outdated factgraph-scala javascript file.
  optimizeDeps: { needsInterop: ['@irs/js-factgraph-scala'], force: true },
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
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'all-screens': path.resolve(__dirname, 'all-screens/index.html'),
      },
    },
  },
});
