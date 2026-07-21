import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Scissors,
  CalendarDays,
  TrendingUp,
  Trophy,
  Clock,
  Share2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { dashboardApi } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { PageHeader, PageLoader, Avatar, EmptyState } from '@/components/ui/Misc';
import { Badge, APPOINTMENT_STATUS } from '@/components/ui/Badge';
import { money, fTime } from '@/utils/format';
import { cn } from '@/utils/cn';

function StatCard({ icon: Icon, label, value, tone = 'brand', hint }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className={cn('rounded-xl p-2.5', tones[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        {hint && (
          <span className="text-xs font-medium text-slate-400">{hint}</span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Card>
  );
}

export default function Dashboard() {
  const currency = useAuthStore((s) => s.user?.tenant?.currency) || 'PEN';
  const role = useAuthStore((s) => s.user?.role);
  const canShare = role === 'ADMIN' || role === 'RECEPTIONIST';
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
    refetchInterval: 20_000, // se actualiza solo cada 20s
  });

  if (isLoading) return <PageLoader />;

  const d = data || {};
  const chartData = (d.topServices || []).map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
    Servicios: s.count,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general de tu barbería"
      />

      {canShare && (
        <Link
          to="/reservas-online"
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white transition hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Comparte tu enlace de reservas</p>
              <p className="text-sm text-brand-100">
                Deja que tus clientes reserven solos: enlace, QR y WhatsApp.
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium sm:block">
            Abrir →
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Ventas de hoy"
          value={money(d.salesToday, currency)}
          tone="green"
          hint={`${d.salesTodayCount || 0} ventas`}
        />
        <StatCard
          icon={TrendingUp}
          label="Ventas del mes"
          value={money(d.salesMonth, currency)}
          tone="brand"
          hint={`${d.salesMonthCount || 0} ventas`}
        />
        <StatCard
          icon={CalendarDays}
          label="Citas de hoy"
          value={d.appointmentsTodayCount || 0}
          tone="blue"
        />
        <StatCard
          icon={Users}
          label="Clientes activos"
          value={d.clientsCount || 0}
          tone="amber"
          hint={`+${d.newClientsMonth || 0} este mes`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Citas de hoy */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Citas de hoy"
            subtitle={`${d.appointmentsTodayCount || 0} programadas`}
          />
          <CardBody className="p-0">
            {d.appointmentsToday?.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.appointmentsToday.map((a) => {
                  const st = APPOINTMENT_STATUS[a.status];
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex w-14 flex-col items-center">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {fTime(a.startTime)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                          {a.client
                            ? `${a.client.firstName} ${a.client.lastName || ''}`
                            : 'Cliente sin registrar'}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {a.services.map((s) => s.service.name).join(', ')} ·{' '}
                          {a.barber.name}
                        </p>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Sin citas para hoy"
                description="Las citas del día aparecerán aquí."
              />
            )}
          </CardBody>
        </Card>

        {/* Top barberos */}
        <Card>
          <CardHeader title="Top barberos" subtitle="Del mes" />
          <CardBody className="p-0">
            {d.topBarbers?.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.topBarbers.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="relative">
                      <Avatar name={b.name} size="sm" />
                      {i === 0 && (
                        <Trophy className="absolute -right-1 -top-1 h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {b.name}
                      </p>
                      <p className="text-xs text-slate-500">{b.count} servicios</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {money(b.revenue, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Scissors}
                title="Aún sin datos"
                description="Completa citas para ver el ranking."
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Servicios más solicitados */}
      <Card className="mt-6">
        <CardHeader title="Servicios más solicitados" subtitle="Del mes" />
        <CardBody>
          {chartData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="Servicios" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="Sin servicios completados"
              description="Los servicios realizados este mes se graficarán aquí."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
