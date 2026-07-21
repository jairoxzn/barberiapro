import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n🚀 BarberíaPro — servidor en http://localhost:${env.port} (${env.nodeEnv})`);
  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.log(`   Interfaz (desarrollo): http://localhost:5173\n`);
  }
});

const shutdown = async (signal) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} recibido. Cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
