import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/store/authStore';

export function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const navigate = useNavigate();

  const [impersonation, setImpersonation] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('saas_impersonation') || 'null');
    } catch {
      return null;
    }
  });

  const stopImpersonating = () => {
    if (!impersonation) return;
    useAuthStore.getState().setAuth({
      accessToken: impersonation.token,
      user: impersonation.user,
    });
    sessionStorage.removeItem('saas_impersonation');
    setImpersonation(null);
    navigate('/superadmin');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {impersonation && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-slate-950" />
            <span>
              <strong>Modo Soporte Técnico Activo:</strong> Estás conectado a la barbería{' '}
              <span className="font-bold underline">{user?.tenant?.name || 'Cliente'}</span>.
            </span>
          </div>
          <button
            onClick={stopImpersonating}
            className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a mi Panel SaaS Master
          </button>
        </div>
      )}
      <Sidebar open={open} onClose={() => setOpen(false)} role={role} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
