import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Proyecto único: Vite sólo compila la interfaz (src/client).
// El código del servidor (src/server) nunca entra al bundle del navegador.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src/client') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Separa librerías pesadas para acelerar la carga inicial.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, /api va al servidor Express del mismo proyecto.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            // eslint-disable-next-line no-console
            console.error(
              '\n[proxy] No se pudo conectar a la API en http://localhost:4000 — ¿está corriendo? (usa: npm run dev)\n'
            );
            if (res && !res.headersSent && res.writeHead) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    message: 'API no disponible. Inicia el sistema con: npm run dev',
                  },
                })
              );
            }
          });
        },
      },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
