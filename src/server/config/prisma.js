import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Instancia única de Prisma (evita agotar el pool en desarrollo con hot-reload).
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: env.isProd ? ['error'] : ['warn', 'error'],
  });

if (!env.isProd) {
  globalForPrisma.__prisma = prisma;
}
