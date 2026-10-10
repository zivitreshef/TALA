import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

function resolveSiteVersionFromGit() {
  if (process.env.VITE_APP_PR_NUMBER) {
    return `1.0.${process.env.VITE_APP_PR_NUMBER}`;
  }
  return pkg.version || '1.0.41';
}

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(resolveSiteVersionFromGit())
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: 'no-external'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
