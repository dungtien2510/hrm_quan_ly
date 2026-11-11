// vite.config.mjs: cau hinh Vite. Giao dien nam trong thu muc "web", build ra "web/dist".
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // May con co the dung Chrome/Edge ban cu (khong tu cap nhat vi khong co internet).
    target: ['chrome90', 'edge90'],
  },
  server: {
    port: 5173,
    // Khi chay "npm run dev", cac yeu cau /api duoc chuyen sang may chu Express o cong 3000.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
