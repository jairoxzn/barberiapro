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

export default function Register() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await authApi.register(values);
      setAuth(data);
      const me = await api.get('/auth/me');
      setUser({ ...data.user, ...me.data.data });
      toast.success('¡Cuenta creada! Bienvenido a BarberíaPro');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Scissors className="h-6 w-6" />
          </div>
          <span className="text-2xl font-extrabold">BarberíaPro</span>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Crea tu cuenta
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra tu barbería y empieza a gestionar hoy mismo
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Nombre de la barbería"
              placeholder="Barbería El Corte"
              error={errors.businessName?.message}
              {...register('businessName', { required: 'Nombre del negocio requerido' })}
            />
            <Input
              label="Tu nombre"
              placeholder="Juan Pérez"
              error={errors.name?.message}
              {...register('name', { required: 'Nombre requerido' })}
            />
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
              placeholder="Mínimo 6 caracteres"
              error={errors.password?.message}
              {...register('password', {
                required: 'Contraseña requerida',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
            />
            <Button type="submit" className="w-full" loading={loading} size="lg">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
