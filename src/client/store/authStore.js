import { create } from 'zustand';

// El access token vive en memoria (no en localStorage) por seguridad.
// El refresh token va en cookie httpOnly gestionada por el backend.
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: 'loading', // 'loading' | 'authenticated' | 'guest'

  setAuth: ({ user, accessToken }) =>
    set({ user, accessToken, status: 'authenticated' }),

  setUser: (user) => set({ user }),

  setToken: (accessToken) => set({ accessToken }),

  clearAuth: () => set({ user: null, accessToken: null, status: 'guest' }),
}));
