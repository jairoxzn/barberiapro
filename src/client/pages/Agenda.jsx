import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Check,
  X,
  CheckCheck,
  UserX,
} from 'lucide-react';
import { appointmentApi, barberApi, branchApi, serviceApi, clientApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader, EmptyState, Avatar } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge, APPOINTMENT_STATUS } from '@/components/ui/Badge';
import { BookingModal } from '@/components/BookingModal';
import { money, fTime } from '@/utils/format';

export default function Agenda() {
  const qc = useQueryClient();
  const currency = useAuthStore((s) => s.user?.tenant?.currency) || 'PEN';
  const [date, setDate] = useState(() => new Date());
  const [branchId, setBranchId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [booking, setBooking] = useState(false);

  const from = startOfDay(date).toISOString();
  const to = endOfDay(date).toISOString();

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.list().then((r) => r.data),
  });
  const { data: barbers = [] } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barberApi.list({ limit: 100 }).then((r) => r.data),
  });

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['agenda', from, branchId, barberId],
    queryFn: () =>
      appointmentApi
        .agenda({ from, to, branchId: branchId || undefined, barberId: barberId || undefined })
        .then((r) => r.data),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => appointmentApi.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Estado actualizado');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const sorted = useMemo(
    () => [...appts].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [appts]
  );

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Gestiona las reservas del día">
        <Button onClick={() => setBooking(true)}>
          <Plus className="h-4 w-4" /> Nueva reserva
        </Button>
      </PageHeader>

      {/* Controles */}
      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setDate((d) => addDays(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[190px] text-center">
            <p className="font-semibold capitalize text-slate-800 dark:text-slate-100">
              {format(date, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            {isToday && <span className="text-xs font-medium text-brand-600">Hoy</span>}
          </div>
          <Button variant="secondary" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
              Hoy
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9">
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select value={barberId} onChange={(e) => setBarberId(e.target.value)} className="h-9">
            <option value="">Todos los barberos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : sorted.length ? (
        <div className="space-y-3">
          {sorted.map((a) => {
            const st = APPOINTMENT_STATUS[a.status];
            const closed = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status);
            return (
              <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-28">
                  <div className="flex flex-col items-center rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-500/10">
                    <Clock className="h-4 w-4 text-brand-500" />
                    <span className="mt-1 text-sm font-bold text-brand-700 dark:text-brand-300">
                      {fTime(a.startTime)}
                    </span>
                    <span className="text-[10px] text-slate-400">{fTime(a.endTime)}</span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={a.barber.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {a.client ? `${a.client.firstName} ${a.client.lastName || ''}` : 'Sin cliente'}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {a.services.map((s) => s.service.name).join(', ')} · {a.barber.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:w-auto">
                  <span className="mr-1 font-semibold text-slate-700 dark:text-slate-200">
                    {money(a.totalPrice, currency)}
                  </span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>

                {!closed && (
                  <div className="flex gap-1 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0 dark:border-slate-800">
                    {a.status === 'RESERVED' && (
                      <Button variant="ghost" size="icon" title="Confirmar" className="text-brand-600" onClick={() => changeStatus.mutate({ id: a.id, status: 'CONFIRMED' })}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Finalizar" className="text-emerald-600" onClick={() => changeStatus.mutate({ id: a.id, status: 'COMPLETED' })}>
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="No asistió" className="text-amber-600" onClick={() => changeStatus.mutate({ id: a.id, status: 'NO_SHOW' })}>
                      <UserX className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Cancelar" className="text-red-500" onClick={() => changeStatus.mutate({ id: a.id, status: 'CANCELLED' })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Sin citas para este día"
          description="Crea una nueva reserva para empezar."
          action={<Button onClick={() => setBooking(true)}><Plus className="h-4 w-4" /> Nueva reserva</Button>}
        />
      )}

      <BookingModal
        open={booking}
        onClose={() => setBooking(false)}
        defaultDate={date}
        branches={branches}
        barbers={barbers}
      />
    </div>
  );
}
