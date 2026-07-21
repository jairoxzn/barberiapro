import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '@/services';
import { api, errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export function ClientAuth({ slug, shopName }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } =
        mode === 'login'
          ? await authApi.loginClient({ slug, ...values })
          : await authApi.registerClient({ slug, ...values });
      setAuth(data);
      const me = await api.get('/auth/me');
      setUser({ ...data.user, ...me.data.data });
      toast.success(mode === 'login' ? '¡Bienvenido!' : '¡Cuenta creada!');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {[
            { k: 'login', label: 'Iniciar sesión' },
            { k: 'register', label: 'Crear cuenta' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setMode(t.k)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition',
                mode === t.k
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="mb-5 text-sm text-slate-500">
          {mode === 'login'
            ? `Ingresa para reservar en ${shopName}.`
            : `Crea tu cuenta para reservar en ${shopName}.`}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre *"
                error={errors.firstName?.message}
                {...register('firstName', { required: 'Requerido' })}
              />
              <Input label="Apellido" {...register('lastName')} />
            </div>
          )}
          {mode === 'register' && (
            <Input label="Celular" {...register('phone')} />
          )}
          <Input
            label="Correo *"
            type="email"
            error={errors.email?.message}
            {...register('email', { required: 'Requerido' })}
          />
          <Input
            label="Contraseña *"
            type="password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Requerido',
              minLength:
                mode === 'register'
                  ? { value: 6, message: 'Mínimo 6 caracteres' }
                  : undefined,
            })}
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {mode === 'login' ? 'Entrar' : 'Crear cuenta y reservar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
