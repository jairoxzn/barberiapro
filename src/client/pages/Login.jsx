import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Scissors } from 'lucide-react';
import { authApi } from '@/services';
import { api, errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function Login() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: 'admin@barberiapro.com', password: 'admin123' } });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      setAuth(data);
      const me = await api.get('/auth/me');
      setUser({ ...data.user, ...me.data.data });
      toast.success(`¡Bienvenido, ${data.user.name}!`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel de marca */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Scissors className="h-6 w-6" />
          </div>
          <span className="text-xl font-extrabold">BarberíaPro</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestiona tu barbería como un profesional.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Agenda inteligente, clientes, servicios, barberos, punto de venta e
            inventario — todo en un solo lugar.
          </p>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} BarberíaPro SaaS</p>
      </div>

      {/* Formulario */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Scissors className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold">BarberíaPro</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa a tu panel de administración
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              error={errors.email?.message}
              {...register('email', { required: 'Correo requerido' })}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', { required: 'Contraseña requerida' })}
            />
            <Button type="submit" className="w-full" loading={loading} size="lg">
              Ingresar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-semibold text-brand-600 hover:underline">
              Registra tu barbería
            </Link>
          </p>

          <div className="mt-6 rounded-xl bg-slate-100 p-3 text-center text-xs text-slate-500 dark:bg-slate-800">
            Demo: <strong>admin@barberiapro.com</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
