import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

// En serverless (Vercel) el sistema de archivos es de solo lectura salvo /tmp.
// Nota: los archivos en /tmp NO persisten entre invocaciones — la subida de
// imágenes en Vercel es efímera. Para producción real usa almacenamiento
// externo (S3, Cloudinary, Vercel Blob).
const isServerless = Boolean(process.env.VERCEL);

export const uploadRoot = isServerless
  ? path.join(os.tmpdir(), 'barberiapro-uploads')
  : path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

// Crea el directorio de forma tolerante: en FS de solo lectura puede fallar
// y NO debe tumbar el arranque de la app.
try {
  fs.mkdirSync(uploadRoot, { recursive: true });
} catch {
  /* entorno de solo lectura: se ignora */
}
