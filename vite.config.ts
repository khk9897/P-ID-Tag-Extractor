import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
    return {
      base: '/P-ID-Tag-Extractor/',
      plugins: [
        react(),
        visualizer({
          filename: 'dist/stats.html',
          open: false
        })
      ],
      define: {
        global: 'globalThis',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              pdfjs: ['pdfjs-dist'],
              xlsx: ['xlsx']
            }
          }
        }
      },
      optimizeDeps: {
        include: ['pdfjs-dist', 'xlsx', 'uuid']
      },
      worker: {
        format: 'es'
      }
    };
});
