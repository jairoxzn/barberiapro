import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  IdCard,
  Cake,
  DollarSign,
  CalendarCheck,
  Star,
  Clock,
} from 'lucide-react';
import { clientApi } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { PageLoader, Avatar, EmptyState } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Badge, TIER, APPOINTMENT_STATUS } from '@/components/ui/Badge';
import { Table, Th, Td, Tr } from '@/components/ui/Table';
import { money, fDate, fDateTime, fromNow } from '@/utils/format';

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-slate-400" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currency = useAuthStore((s) => s.user?.tenant?.currency) || 'PEN';

  const { data, isLoading } = useQuery({
    queryKey: ['client-history', id],
    queryFn: () => clientApi.history(id).then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { client, metrics, appointments, loyaltyTransactions } = data;
  const tier = TIER[metrics.tier];

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/clientes')} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Perfil */}
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex flex-col items-center text-center">
              <Avatar name={`${client.firstName} ${client.lastName || ''}`} src={client.photoUrl} size="lg" />
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                {client.firstName} {client.lastName}
              </h2>
              <Badge tone={tier.tone} className="mt-2">
                Nivel {tier.label}
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <Info icon={IdCard} label="DNI" value={client.dni} />
              <Info icon={Phone} label="Celular" value={client.phone} />
              <Info icon={Mail} label="Correo" value={client.email} />
              <Info icon={Cake} label="Cumpleaños" value={fDate(client.birthDate)} />
              <Info icon={Clock} label="Última visita" value={metrics.lastVisit ? fromNow(metrics.lastVisit) : 'Nunca'} />
            </div>

            {client.notes && (
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {client.notes}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Métricas + historial */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric icon={DollarSign} label="Total gastado" value={money(metrics.totalSpent, currency)} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" />
            <Metric icon={CalendarCheck} label="Citas" value={metrics.totalAppointments} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/10" />
            <Metric icon={Star} label="Puntos" value={metrics.points} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10" />
            <Metric icon={CalendarCheck} label="Completadas" value={metrics.completedAppointments} tone="bg-brand-50 text-brand-600 dark:bg-brand-500/10" />
          </div>

          <Card>
            <CardHeader title="Historial de citas" />
            <CardBody className="p-0">
              {appointments.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Servicios</Th>
                      <Th className="hidden sm:table-cell">Barbero</Th>
                      <Th>Estado</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => {
                      const st = APPOINTMENT_STATUS[a.status];
                      return (
                        <Tr key={a.id}>
                          <Td className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {fDateTime(a.startTime)}
                          </Td>
                          <Td>{a.services.map((s) => s.service.name).join(', ')}</Td>
                          <Td className="hidden sm:table-cell">{a.barber.name}</Td>
                          <Td>
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </Td>
                          <Td className="text-right font-medium">{money(a.totalPrice, currency)}</Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <EmptyState icon={CalendarCheck} title="Sin citas registradas" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Movimientos de puntos" />
            <CardBody className="p-0">
              {loyaltyTransactions.length ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loyaltyTransactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.reason}</p>
                        <p className="text-xs text-slate-400">{fDateTime(t.createdAt)}</p>
                      </div>
                      <span className={t.points >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>
                        {t.points >= 0 ? '+' : ''}{t.points}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Star} title="Sin movimientos de puntos" />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
