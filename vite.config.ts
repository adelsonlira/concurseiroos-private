import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    publicDir: 'static',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: 'public',
      assetsInlineLimit: 0,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              if (id.includes('/src/config/concursos/')) {
                return 'competition-packages';
              }
              if (
                id.includes('/src/core/sde/') ||
                id.includes('/src/integrations/sde/') ||
                id.includes('/src/core/review/') ||
                id.includes('/src/core/flashcards/') ||
                id.includes('/src/core/diagnostic/') ||
                id.includes('/src/core/roadmap/') ||
                id.includes('/src/core/weekly/')
              ) {
                return 'study-engine';
              }
              return undefined;
            }
            if (id.includes('@supabase') || id.includes('realtime-js') || id.includes('gotrue-js')) {
              return 'vendor-supabase';
            }
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor-misc';
          },
        },
      },
    },
  };
});
