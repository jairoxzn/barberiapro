import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <Scissors className="h-7 w-7" />
      </div>
      <p className="mt-6 text-7xl font-extrabold text-slate-900 dark:text-white">404</p>
      <p className="mt-2 text-lg font-medium text-slate-600 dark:text-slate-300">
        Página no encontrada
      </p>
      <p className="mt-1 text-sm text-slate-500">
        La ruta que buscas no existe o fue movida.
      </p>
      <Button as={Link} to="/" className="mt-6">
        Volver al inicio
      </Button>
    </div>
  );
}
