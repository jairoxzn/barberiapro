import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, UserCog, CalendarClock, Percent } from 'lucide-react';
import { barberApi, branchApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader, EmptyState, Avatar } from '@/components/ui/Misc';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function BarberForm({ open, onClose, editing, branches }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    values: editing
      ? { ...editing, branchId: editing.branchId || '' }
      : { commissionRate: 0, branchId: branches[0]?.id || '' },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editing ? barberApi.update(editing.id, data) : barberApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbers'] });
      toast.success(editing ? 'Barbero actualizado' : 'Barbero creado');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSubmit = (v) =>
    mutation.mutate({
      ...v,
      commissionRate: Number(v.commissionRate),
      branchId: v.branchId || undefined,
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar barbero' : 'Nuevo barbero'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nombre *" containerClassName="sm:col-span-2" error={errors.name?.message} {...register('name', { required: 'Requerido' })} />
        <Input label="Especialidad" {...register('specialty')} />
        <Input label="Comisión (%)" type="number" step="0.1" {...register('commissionRate')} />
        <Select label="Sucursal" containerClassName="sm:col-span-2" {...register('branchId')}>
          <option value="">Sin asignar</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

function ScheduleModal({ open, onClose, barber }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState(() =>
    WEEKDAYS.map((_, weekday) => {
      const existing = barber?.schedules?.find((s) => s.weekday === weekday);
      return {
        weekday,
        active: !!existing,
        startTime: existing?.startTime || '09:00',
        endTime: existing?.endTime || '19:00',
      };
    })
  );

  const save = useMutation({
    mutationFn: () =>
      barberApi.setSchedule(
        barber.id,
        rows
          .filter((r) => r.active)
          .map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime, isActive: true }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbers'] });
      toast.success('Horario actualizado');
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
      title={`Horario de ${barber?.name || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>Guardar horario</Button>
        </>
      }
    >
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.weekday} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
            <label className="flex w-20 items-center gap-2">
              <input type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} className="h-4 w-4 rounded accent-brand-600" />
              <span className="text-sm font-medium">{WEEKDAYS[r.weekday]}</span>
            </label>
            <input type="time" value={r.startTime} disabled={!r.active} onChange={(e) => update(i, { startTime: e.target.value })} className="input h-9 flex-1 disabled:opacity-40" />
            <span className="text-slate-400">—</span>
            <input type="time" value={r.endTime} disabled={!r.active} onChange={(e) => update(i, { endTime: e.target.value })} className="input h-9 flex-1 disabled:opacity-40" />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function Barbers() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [schedule, setSchedule] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barberApi.list({ limit: 100 }).then((r) => r.data),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.list().then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id) => barberApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbers'] });
      toast.success('Barbero desactivado');
      setToDelete(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const barbers = data || [];

  return (
    <div>
      <PageHeader title="Barberos" subtitle={`${barbers.length} en el equipo`}>
        {isAdmin && (
          <Button onClick={() => setModal({ open: true, editing: null })}>
            <Plus className="h-4 w-4" /> Nuevo barbero
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <PageLoader />
      ) : barbers.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={b.name} src={b.photoUrl} size="lg" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{b.name}</h3>
                    <p className="text-sm text-slate-500">{b.specialty || 'Barbero'}</p>
                    {b.branch && <Badge tone="gray" className="mt-1.5">{b.branch.name}</Badge>}
                  </div>
                </div>
                {!b.isActive && <Badge tone="red">Inactivo</Badge>}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Percent className="h-4 w-4" /> {Number(b.commissionRate)}% comisión
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-4 w-4" /> {b.schedules?.length || 0} días
                </span>
              </div>

              {isAdmin && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Button variant="subtle" size="sm" className="flex-1" onClick={() => setSchedule(b)}>
                    <CalendarClock className="h-4 w-4" /> Horario
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, editing: b })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setToDelete(b)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserCog}
          title="Sin barberos"
          description="Agrega a tu equipo de barberos."
          action={isAdmin && <Button onClick={() => setModal({ open: true, editing: null })}><Plus className="h-4 w-4" /> Nuevo barbero</Button>}
        />
      )}

      <BarberForm open={modal.open} editing={modal.editing} branches={branches} onClose={() => setModal({ open: false, editing: null })} />
      {schedule && <ScheduleModal open={!!schedule} barber={schedule} onClose={() => setSchedule(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Desactivar barbero"
        description={`¿Desactivar a ${toDelete?.name}?`}
        confirmText="Desactivar"
      />
    </div>
  );
}
