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
  Ban,
  Trash2,
  Building2,
  Globe,
} from 'lucide-react';
import { appointmentApi, barberApi, branchApi, scheduleApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader, EmptyState, Avatar } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge, APPOINTMENT_STATUS } from '@/components/ui/Badge';
import { BookingModal } from '@/components/BookingModal';
import { BlockModal } from '@/components/BlockModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { money, fTime } from '@/utils/format';

export default function Agenda() {
  const qc = useQueryClient();
  const currency = useAuthStore((s) => s.user?.tenant?.currency) || 'PEN';
  const [date, setDate] = useState(() => new Date());
  const [branchId, setBranchId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [booking, setBooking] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);

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

  const { data: appts = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['agenda', from, branchId, barberId],
    queryFn: () =>
      appointmentApi
        .agenda({ from, to, branchId: branchId || undefined, barberId: barberId || undefined })
        .then((r) => r.data),
    refetchInterval: 20_000,
  });

  const { data: dayBlocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['agenda-blocks', from, to, branchId, barberId],
    queryFn: () =>
      scheduleApi
        .listBlocks({
          from,
          to,
          branchId: branchId || undefined,
          barberId: barberId || undefined,
        })
        .then((r) => r.data),
    refetchInterval: 20_000,
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => appointmentApi.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Estado actualizado');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id) => scheduleApi.deleteBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule-blocks'] });
      toast.success('Horario desbloqueado');
      setBlockToDelete(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Combina citas y bloqueos cronológicamente para una vista completa
  const timelineItems = useMemo(() => {
    const formattedAppts = appts.map((a) => ({ ...a, itemType: 'appointment' }));
    const formattedBlocks = dayBlocks.map((b) => ({ ...b, itemType: 'block' }));
    return [...formattedAppts, ...formattedBlocks].sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );
  }, [appts, dayBlocks]);

  const isLoading = loadingAppts || loadingBlocks;

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Gestiona las reservas y bloqueos del día">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setBlocking(true)}>
            <Ban className="h-4 w-4" /> Bloquear horario
          </Button>
          <Button onClick={() => setBooking(true)}>
            <Plus className="h-4 w-4" /> Nueva reserva
          </Button>
        </div>
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
      ) : timelineItems.length ? (
        <div className="space-y-3">
          {timelineItems.map((item) => {
            // Renderizado de BLOQUEO DE HORARIO
            if (item.itemType === 'block') {
              return (
                <Card
                  key={`block-${item.id}`}
                  className="flex flex-col gap-3 border-amber-200 bg-amber-50/40 p-4 sm:flex-row sm:items-center dark:border-amber-900/50 dark:bg-amber-950/20"
                >
                  <div className="flex items-center gap-3 sm:w-28">
                    <div className="flex flex-col items-center rounded-xl bg-amber-100 px-3 py-2 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="mt-1 text-sm font-bold">
                        {item.isAllDay ? 'Día' : fTime(item.startTime)}
                      </span>
                      <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                        {item.isAllDay ? 'Completo' : fTime(item.endTime)}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      <Ban className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          Horario bloqueado: {item.title}
                        </p>
                        <Badge tone="amber">Bloqueado</Badge>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {item.barber ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Barbero: {item.barber.name}
                          </span>
                        ) : item.branch ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Building2 className="h-3 w-3" /> Sucursal: {item.branch.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Globe className="h-3 w-3" /> Toda la barbería
                          </span>
                        )}
                        {item.reason && ` · ${item.reason}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => setBlockToDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Desbloquear
                    </Button>
                  </div>
                </Card>
              );
            }

            // Renderizado de CITA REGULAR
            const a = item;
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
          title="Sin citas ni bloqueos para este día"
          description="Crea una nueva reserva o bloquea horarios para este día."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setBlocking(true)}>
                <Ban className="h-4 w-4" /> Bloquear horario
              </Button>
              <Button onClick={() => setBooking(true)}>
                <Plus className="h-4 w-4" /> Nueva reserva
              </Button>
            </div>
          }
        />
      )}

      {/* Modal de Reserva */}
      <BookingModal
        open={booking}
        onClose={() => setBooking(false)}
        defaultDate={date}
        branches={branches}
        barbers={barbers}
      />

      {/* Modal de Bloqueo rápido desde la Agenda */}
      <BlockModal
        open={blocking}
        onClose={() => setBlocking(false)}
        branches={branches}
        barbers={barbers}
        defaultDate={date}
        defaultBranchId={branchId}
        defaultBarberId={barberId}
      />

      {/* Diálogo de Confirmación para Desbloquear */}
      <ConfirmDialog
        open={!!blockToDelete}
        onClose={() => setBlockToDelete(null)}
        onConfirm={() => deleteBlockMutation.mutate(blockToDelete.id)}
        loading={deleteBlockMutation.isPending}
        title="Desbloquear horario"
        description={`¿Deseas eliminar el bloqueo "${blockToDelete?.title}" de la agenda?`}
        confirmText="Desbloquear"
      />
    </div>
  );
}

