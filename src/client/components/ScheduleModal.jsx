import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { barberApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const FULL_WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function ScheduleModal({ open, onClose, barber, onSaved }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState(() =>
    WEEKDAYS.map((_, weekday) => {
      const existing = barber?.schedules?.find((s) => s.weekday === weekday);
      return {
        weekday,
        active: !!existing && existing.isActive !== false,
        startTime: existing?.startTime || '09:00',
        endTime: existing?.endTime || '19:00',
      };
    })
  );

  useEffect(() => {
    if (barber) {
      setRows(
        WEEKDAYS.map((_, weekday) => {
          const existing = barber.schedules?.find((s) => s.weekday === weekday);
          return {
            weekday,
            active: !!existing && existing.isActive !== false,
            startTime: existing?.startTime || '09:00',
            endTime: existing?.endTime || '19:00',
          };
        })
      );
    }
  }, [barber]);

  const save = useMutation({
    mutationFn: () =>
      barberApi.setSchedule(
        barber.id,
        rows
          .filter((r) => r.active)
          .map((r) => ({
            weekday: r.weekday,
            startTime: r.startTime,
            endTime: r.endTime,
            isActive: true,
          }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbers'] });
      qc.invalidateQueries({ queryKey: ['schedule-overview'] });
      toast.success('Horario semanal actualizado');
      onSaved?.();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const update = (i, patch) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Horario semanal de ${barber?.name || ''}`}
      subtitle="Define los días y turnos de atención"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Guardar horario
          </Button>
        </>
      }
    >
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div
            key={r.weekday}
            className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
              r.active
                ? 'border-brand-200 bg-brand-50/40 dark:border-brand-900/50 dark:bg-brand-950/20'
                : 'border-slate-100 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/40'
            }`}
          >
            <label className="flex w-24 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={r.active}
                onChange={(e) => update(i, { active: e.target.checked })}
                className="h-4 w-4 rounded accent-brand-600"
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {FULL_WEEKDAYS[r.weekday]}
              </span>
            </label>
            <input
              type="time"
              value={r.startTime}
              disabled={!r.active}
              onChange={(e) => update(i, { startTime: e.target.value })}
              className="input h-9 flex-1 disabled:opacity-40"
            />
            <span className="text-slate-400">—</span>
            <input
              type="time"
              value={r.endTime}
              disabled={!r.active}
              onChange={(e) => update(i, { endTime: e.target.value })}
              className="input h-9 flex-1 disabled:opacity-40"
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
