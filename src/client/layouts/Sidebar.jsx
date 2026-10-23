import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  Wallet,
  Users,
  Scissors,
  Package,
  UserCog,
  BarChart3,
  Share2,
  Building2,
  Settings,
  CalendarClock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/horarios', label: 'Horarios y Bloqueos', icon: CalendarClock, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/pos', label: 'Punto de venta', icon: ShoppingCart },
  { to: '/caja', label: 'Caja', icon: Wallet },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicios', label: 'Servicios', icon: Scissors },
  { to: '/productos', label: 'Inventario', icon: Package },
  { to: '/barberos', label: 'Barberos', icon: UserCog },
  { to: '/reservas-online', label: 'Reservas online', icon: Share2, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/sucursales', label: 'Sucursales', icon: Building2, roles: ['ADMIN'] },
  { to: '/configuracion', label: 'Configuración', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar({ open, onClose, role }) {
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <>
      {/* Overlay móvil */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Scissors className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
              Barbería<span className="text-brand-600">Pro</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {/* Acceso destacado al Panel SaaS Master para SUPER_ADMIN */}
          {isSuperAdmin && (
            <div className="mb-3 px-1">
              <NavLink
                to="/superadmin"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold shadow-sm transition',
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                      : 'border border-amber-500/30 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20'
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span>Panel SaaS Master</span>
                </div>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-300">
                  PLATAFORMA
                </span>
              </NavLink>
              <div className="my-2.5 border-t border-slate-200 dark:border-slate-800" />
            </div>
          )}

          {nav
            .filter((item) => !item.roles || item.roles.includes(role) || isSuperAdmin)
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
        </nav>


        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white">
            <p className="text-sm font-semibold">BarberíaPro SaaS</p>
            <p className="mt-1 text-xs text-brand-100">
              Núcleo funcional v1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
