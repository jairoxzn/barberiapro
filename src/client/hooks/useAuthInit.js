import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { api } from '@/lib/axios';

// Restaura la sesión una sola vez, aunque el efecto se monte dos veces
// (React StrictMode en desarrollo). Compartir la promesa evita disparar
// dos /auth/refresh simultáneos con el mismo token.
let bootstrapPromise = null;

const bootstrap = async () => {
  const { data } = await api.post('/auth/refresh');
  const token = data.data.accessToken;
  // Importante: pasar el token recién obtenido explícitamente. Si esperáramos
  // a que esté en el store, /auth/me saldría sin Authorization → 401 → login.
  const me = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ...data.data, user: { ...data.data.user, ...me.data.data } };
};

export function useAuthInit() {
  const { setAuth, setUser, clearAuth } = useAuthStore();
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
    let active = true;
    if (!bootstrapPromise) bootstrapPromise = bootstrap();

    bootstrapPromise
      .then((result) => {
        if (!active) return;
        setAuth({ user: result.user, accessToken: result.accessToken });
        setUser(result.user);
      })
      .catch(() => {
        if (active) clearAuth();
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
