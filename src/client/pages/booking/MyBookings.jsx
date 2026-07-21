import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Scissors, X } from 'lucide-react';
import { bookingApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { PageLoader, EmptyState } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Badge, APPOINTMENT_STATUS } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fDateTime, money } from '@/utils/format';

export function MyBookings({ onBookNew }) {
  const qc = useQueryClient();
  const [toCancel, setToCancel] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => bookingApi.myAppointments().then((r) => r.data),
    refetchInterval: 30_000, // refleja cambios de estado de sus citas
  });

  const cancel = useMutation({
    mutationFn: (id) => bookingApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success('Reserva cancelada');
      setToCancel(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  if (!data.length) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aún no tienes reservas"
        description="Reserva tu próxima cita en segundos."
        action={<Button onClick={onBookNew}>Reservar ahora</Button>}
      />
    );
  }

  const cancellable = (a) =>
    ['RESERVED', 'CONFIRMED'].includes(a.status) && new Date(a.startTime) > new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {data.map((a) => {
        const st = APPOINTMENT_STATUS[a.status] || { label: a.status, tone: 'gray' };
        return (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <span className="text-xs text-slate-400">{a.branch?.name}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                    <Clock className="h-4 w-4 text-brand-600" /> {fDateTime(a.startTime)}
                  </p>
                  <p className="flex items-center gap-2 text-slate-500">
                    <User className="h-4 w-4" /> {a.barber?.name}
                  </p>
                  <p className="flex items-center gap-2 text-slate-500">
                    <Scissors className="h-4 w-4" />
                    {a.services.map((s) => s.service.name).join(', ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 dark:text-white">{money(a.totalPrice)}</p>
                {cancellable(a) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-500"
                    onClick={() => setToCancel(a)}
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={() => cancel.mutate(toCancel.id)}
        loading={cancel.isPending}
        title="Cancelar reserva"
        description={`¿Cancelar tu cita del ${toCancel ? fDateTime(toCancel.startTime) : ''}?`}
        confirmText="Sí, cancelar"
      />
    </div>
  );
}
