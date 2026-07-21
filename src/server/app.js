import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';

import { env } from './config/env.js';
import { uploadRoot } from './config/paths.js';
import { apiRouter } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const ROOT = process.cwd();

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  // Seguridad
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // En producción el SPA se sirve desde este mismo origen; la CSP por
      // defecto bloquearía los assets compilados de Vite.
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );

  // Body / cookies / compresión
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  if (!env.isProd) app.use(morgan('dev'));

  // Rate limiter: sólo sobre la API (los assets estáticos no se limitan).
  const limiter = rateLimit({
    windowMs: env.rateLimit.windowMin * 60 * 1000,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: 'Demasiadas solicitudes, intenta más tarde' },
    },
  });

  // Archivos subidos (imágenes)
  app.use('/uploads', express.static(uploadRoot));

  // Healthcheck
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

  // API
  app.use('/api', limiter, apiRouter);

  // 404 de la API (antes del SPA, para no devolver HTML en rutas /api inexistentes)
  app.use('/api', notFound);

  // --- Interfaz compilada: despliegue único (Express sirve React) ---
  const distDir = path.resolve(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // SPA fallback: cualquier ruta que no sea API devuelve index.html
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else if (env.isProd) {
    app.get('*', (_req, res) =>
      res.status(503).send('La interfaz no está compilada. Ejecuta: npm run build')
    );
  }

  // Manejo centralizado de errores
  app.use(errorHandler);

  return app;
};
