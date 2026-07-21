import { useState } from 'react';
import { Menu, Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services';
import { Avatar } from '@/components/ui/Misc';
import { cn } from '@/utils/cn';

const ROLE_LABEL = {
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
  BARBER: 'Barbero',
  CLIENT: 'Cliente',
};

export function Topbar({ onMenu }) {
  const { theme, toggle } = useThemeStore();
  const { user, clearAuth } = useAuthStore();
  const [menu, setMenu] = useState(false);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearAuth();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6 dark:border-slate-800 dark:bg-slate-900/80">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        {user?.tenant && (
          <p className="text-sm font-medium text-slate-500">
            {user.tenant.name}
            {user.branch ? ` · ${user.branch.name}` : ''}
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-700 dark:text-slate-200">
                {user?.name}
              </p>
              <p className="text-xs text-slate-400">{ROLE_LABEL[user?.role]}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div
                className={cn(
                  'absolute right-0 z-20 mt-2 w-52 animate-slide-up rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-800'
                )}
              >
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
