import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

function resolveSiteVersionFromGit() {
  if (process.env.VITE_APP_PR_NUMBER) {
    return `1.0.${process.env.VITE_APP_PR_NUMBER}`;
  }
  try {
    const headSubject = execSync('git log -n 1 --pretty=format:%s', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const headPrMatch =
      headSubject.match(/Merge pull request #(\d+)/i) ||
      headSubject.match(/\(#(\d+)\)/);
    if (headPrMatch) {
      return `1.0.${Number(headPrMatch[1])}`;
    }

    const logText = execSync('git log -n 60 --pretty=format:%s', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    let maxPr = 31;
    const rx = /Merge pull request #(\d+)|\(#(\d+)\)/gi;
    let m;
    while ((m = rx.exec(logText)) !== null) {
      const num = Number(m[1] || m[2]);
      if (num > maxPr) maxPr = num;
    }
    return `1.0.${maxPr + 1}`;
  } catch (_) {
    return '1.0.35';
  }
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
