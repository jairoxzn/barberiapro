// Punto de entrada serverless para Vercel.
// Expone la app Express (sin app.listen) como función. Vercel enruta aquí
// todo lo que empiece por /api y /uploads (ver vercel.json).
import { createApp } from '../src/server/app.js';

const app = createApp();

export default app;
