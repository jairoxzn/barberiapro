import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { scheduleApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

const PRESET_TITLES = [
  'Almuerzo',
  'Reunión de equipo',
  'Mantenimiento / Limpieza',
  'Feriado / Cierre',
  'Capacitación',
  'Permiso personal',
];

export function BlockModal({
  open,
  onClose,
  editing = null,
  branches = [],
  barbers = [],
  defaultDate = null,
  defaultBarberId = '',
  defaultBranchId = '',
  onSaved,
}) {
  const qc = useQueryClient();
  const [scope, setScope] = useState('barber'); // 'all', 'branch', 'barber'
  const [isAllDay, setIsAllDay] = useState(false);

  const initialDateStr = defaultDate
    ? format(new Date(defaultDate), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      reason: '',
      branchId: defaultBranchId || '',
      barberId: defaultBarberId || '',
      startDate: initialDateStr,
      endDate: initialDateStr,
      startTime: '13:00',
      endTime: '14:00',
    },
  });

  const selectedBranchId = watch('branchId');

  // Filtrar barberos según la sucursal seleccionada
  const filteredBarbers = barbers.filter(
    (b) => !selectedBranchId || !b.branchId || b.branchId === selectedBranchId
  );

  useEffect(() => {
    if (open) {
      if (editing) {
        const sDate = new Date(editing.startTime);
        const eDate = new Date(editing.endTime);
        const allDay = !!editing.isAllDay;

        setIsAllDay(allDay);
        if (editing.barberId) {
          setScope('barber');
        } else if (editing.branchId) {
          setScope('branch');
        } else {
          setScope('all');
        }

        reset({
          title: editing.title || '',
          reason: editing.reason || '',
          branchId: editing.branchId || '',
          barberId: editing.barberId || '',
          startDate: format(sDate, 'yyyy-MM-dd'),
          endDate: format(eDate, 'yyyy-MM-dd'),
          startTime: format(sDate, 'HH:mm'),
          endTime: format(eDate, 'HH:mm'),
        });
      } else {
        setIsAllDay(false);
        setScope(defaultBarberId ? 'barber' : defaultBranchId ? 'branch' : 'all');
        reset({
          title: '',
          reason: '',
          branchId: defaultBranchId || branches[0]?.id || '',
          barberId: defaultBarberId || '',
          startDate: initialDateStr,
          endDate: initialDateStr,
          startTime: '13:00',
          endTime: '14:00',
        });
      }
    }
  }, [open, editing, defaultDate, defaultBarberId, defaultBranchId, branches, reset, initialDateStr]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      editing ? scheduleApi.updateBlock(editing.id, payload) : scheduleApi.createBlock(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule-overview'] });
      qc.invalidateQueries({ queryKey: ['agenda'] });
      toast.success(editing ? 'Bloqueo actualizado' : 'Horario bloqueado con éxito');
      onSaved?.();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSubmit = (values) => {
    let startIso;
    let endIso;

    if (isAllDay) {
      const s = new Date(`${values.startDate}T00:00:00`);
      const e = new Date(`${values.endDate || values.startDate}T23:59:59`);
      if (e < s) {
        toast.error('La fecha de fin debe ser igual o posterior a la de inicio');
        return;
      }
      startIso = s.toISOString();
      endIso = e.toISOString();
    } else {
      const s = new Date(`${values.startDate}T${values.startTime}:00`);
      const e = new Date(`${values.startDate}T${values.endTime}:00`);
      if (e <= s) {
        toast.error('La hora de fin debe ser posterior a la hora de inicio');
        return;
      }
      startIso = s.toISOString();
      endIso = e.toISOString();
    }

    const payload = {
      title: values.title.trim(),
      reason: values.reason?.trim() || null,
      startTime: startIso,
      endTime: endIso,
      isAllDay,
      branchId: scope === 'all' ? null : values.branchId || null,
      barberId: scope === 'barber' ? values.barberId || null : null,
    };

    mutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar bloqueo de horario' : 'Bloquear horario'}
      subtitle="Impide que se agenden citas en este rango de tiempo"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
            {editing ? 'Guardar cambios' : 'Confirmar bloqueo'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Motivos rápidos */}
        <div>
          <label className="label">Sugerencias rápidas</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TITLES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue('title', preset, { shouldValidate: true })}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:bg-brand-950/40 dark:hover:text-brand-300 transition"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <Input
          label="Motivo o título *"
          placeholder="Ej: Almuerzo, Reunión, Mantenimiento..."
          error={errors.title?.message}
          {...register('title', { required: 'Ingresa un título o motivo' })}
        />

        {/* Alcance del bloqueo */}
        <div>
          <label className="label">Alcance del bloqueo</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: 'Toda la barbería' },
              { id: 'branch', label: 'Por sucursal' },
              { id: 'barber', label: 'Barbero específico' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                  scope === opt.id
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selectores según alcance */}
        {scope !== 'all' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Sucursal *" {...register('branchId')}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>

            {scope === 'barber' && (
              <Select label="Barbero *" {...register('barberId', { required: 'Selecciona un barbero' })}>
                <option value="">Selecciona barbero...</option>
                {filteredBarbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {/* Checkbox Día Completo */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="allDayCheck"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            className="h-4 w-4 rounded accent-brand-600"
          />
          <label htmlFor="allDayCheck" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            Bloquear día completo
          </label>
        </div>

        {/* Fecha y Horas */}
        {isAllDay ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Fecha inicio *" type="date" {...register('startDate', { required: 'Requerido' })} />
            <Input label="Fecha fin *" type="date" {...register('endDate', { required: 'Requerido' })} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Fecha *" type="date" containerClassName="sm:col-span-1" {...register('startDate', { required: 'Requerido' })} />
            <Input label="Hora inicio *" type="time" {...register('startTime', { required: 'Requerido' })} />
            <Input label="Hora fin *" type="time" {...register('endTime', { required: 'Requerido' })} />
          </div>
        )}

        {/* Notas adicionales */}
        <Input
          label="Detalle o notas adicionales (opcional)"
          placeholder="Ej: Regresa a las 14:30 hrs"
          {...register('reason')}
        />
      </form>
    </Modal>
  );
}
