import { create } from 'zustand';

const getInitial = () => {
  const saved = localStorage.getItem('bp-theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const apply = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('bp-theme', theme);
};

export const useThemeStore = create((set, get) => ({
  theme: getInitial(),
  init: () => apply(get().theme),
  toggle: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark';
      apply(theme);
      return { theme };
    }),
}));
