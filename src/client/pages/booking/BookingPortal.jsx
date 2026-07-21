import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scissors, Moon, Sun, LogOut, Award, CalendarPlus, CalendarCheck, ShieldAlert } from 'lucide-react';
import { publicApi, bookingApi, authApi } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { PageLoader, EmptyState, Avatar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Badge, TIER } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { ClientAuth } from './ClientAuth';
import { BookingWizard } from './BookingWizard';
import { MyBookings } from './MyBookings';

function Header({ shop, children }) {
  const { theme, toggle } = useThemeStore();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Scissors className="h-5 w-5" />
          </div>
          <span className="font-extrabold tracking-tight text-slate-800 dark:text-white">
            {shop?.name || 'BarberíaPro'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {children}
        </div>
      </div>
    </header>
  );
}

export default function BookingPortal() {
  const { slug } = useParams();
  const [tab, setTab] = useState('book');
  const { status, user, clearAuth } = useAuthStore();

  const { data: shop, isLoading, isError } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => publicApi.barbershop(slug).then((r) => r.data),
    retry: false,
  });

  const isClient = status === 'authenticated' && user?.role === 'CLIENT';
  const belongsHere = isClient && user?.tenant?.slug === slug;

  const { data: profile } = useQuery({
    queryKey: ['booking-me'],
    queryFn: () => bookingApi.me().then((r) => r.data),
    enabled: belongsHere,
  });

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearAuth();
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (isError || !shop) {
    return (
      <div className="min-h-screen">
        <Header shop={null} />
        <div className="mx-auto max-w-4xl px-4 py-16">
          <EmptyState
            icon={ShieldAlert}
            title="Barbería no encontrada"
            description={`No existe una barbería con el enlace “${slug}”.`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header shop={shop}>
        {belongsHere && (
          <>
            {profile && (
              <Badge tone={TIER[profile.tier]?.tone || 'brand'} className="hidden sm:inline-flex">
                <Award className="h-3.5 w-3.5" /> {profile.points} pts · {TIER[profile.tier]?.label}
              </Badge>
            )}
            <Avatar name={user.name} size="sm" />
            <button onClick={logout} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Salir">
              <LogOut className="h-5 w-5" />
            </button>
          </>
        )}
      </Header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* No autenticado → login/registro */}
        {status !== 'authenticated' && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Reserva tu cita en {shop.name}
              </h1>
              <p className="mt-2 text-slate-500">
                {shop.services.length} servicios · {shop.barbers.length} barberos · {shop.branches.length} sucursal(es)
              </p>
            </div>
            <ClientAuth slug={slug} shopName={shop.name} />
          </>
        )}

        {/* Autenticado como staff → no corresponde */}
        {status === 'authenticated' && !isClient && (
          <EmptyState
            icon={ShieldAlert}
            title="Estás con una cuenta de personal"
            description="El portal de reservas es para clientes. Cierra sesión para reservar como cliente, o vuelve al panel."
            action={
              <div className="flex gap-2">
                <Button as={Link} to="/" variant="secondary">Ir al panel</Button>
                <Button onClick={logout}>Cerrar sesión</Button>
              </div>
            }
          />
        )}

        {/* Cliente de OTRA barbería */}
        {isClient && !belongsHere && (
          <EmptyState
            icon={ShieldAlert}
            title="Tu cuenta es de otra barbería"
            description="Inicia sesión con una cuenta de esta barbería para reservar aquí."
            action={<Button onClick={logout}>Cerrar sesión</Button>}
          />
        )}

        {/* Cliente correcto → portal */}
        {belongsHere && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  { k: 'book', label: 'Reservar', icon: CalendarPlus },
                  { k: 'mine', label: 'Mis reservas', icon: CalendarCheck },
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition',
                      tab === t.k
                        ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500'
                    )}
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'book' ? (
              <BookingWizard shop={shop} onBooked={() => setTab('mine')} />
            ) : (
              <MyBookings onBookNew={() => setTab('book')} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
