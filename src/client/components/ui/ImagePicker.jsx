import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './Button';
import { cn } from '@/utils/cn';

const MAX_DIM = 600; // lado máximo en píxeles
const QUALITY = 0.75;

// Lee un archivo, lo redimensiona en un canvas y devuelve un data URL JPEG
// comprimido. Así la imagen se guarda liviana directamente en la BD (persiste
// en serverless/Vercel sin depender del sistema de archivos).
async function fileToResizedDataUrl(file) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height && width > MAX_DIM) {
    height = Math.round((height * MAX_DIM) / width);
    width = MAX_DIM;
  } else if (height > MAX_DIM) {
    width = Math.round((width * MAX_DIM) / height);
    height = MAX_DIM;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

export function ImagePicker({ value, onChange, label = 'Imagen', size = 'md' }) {
  const ref = useRef(null);
  const [loading, setLoading] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen');
      return;
    }
    setLoading(true);
    try {
      onChange(await fileToResizedDataUrl(file));
    } catch {
      toast.error('No se pudo procesar la imagen');
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const box = size === 'lg' ? 'h-24 w-24' : 'h-16 w-16';

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800',
            box
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-slate-400" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => ref.current?.click()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {value ? 'Cambiar' : 'Subir imagen'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500"
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" /> Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
