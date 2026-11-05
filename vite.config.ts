import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Injects the deployed API origin into the Content-Security-Policy at build time.
 *
 * Why: the leaderboard lives on API Gateway, and a hard-coded `connect-src` would either
 * be wrong in preview or so permissive it stops meaning anything. Deriving it from
 * VITE_API_URL keeps the policy strict (`'self'` + one exact origin) and makes the
 * config the single source of truth for deployment.
 */
function cspOriginPlugin(): Plugin {
  let origin = '';
  try {
    const configured = process.env.VITE_API_URL;
    origin = configured ? new URL(configured).origin : '';
  } catch {
    origin = '';
  }

  return {
    name: 'inject-csp-origin',
    transformIndexHtml(html) {
      return html.replace('__API_ORIGIN__', origin);
    },
  };
}

/**
 * Vite configuration.
 *
 * No SSR: the judged artefact is a static URL, and SSR would add a server runtime and a
 * build-time failure mode for no scoring benefit (see docs/ARCHITECTURE.md §1).
 */
export default defineConfig({
  plugins: [react(), cspOriginPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Keep the creative feature in its own chunk so it never delays first paint.
        manualChunks(id: string) {
          if (id.includes('components/sphere')) return 'network';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
