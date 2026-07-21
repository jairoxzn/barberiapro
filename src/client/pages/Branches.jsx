import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Building2, MapPin, Phone, Clock, Users } from 'lucide-react';
import { branchApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { PageHeader, PageLoader, EmptyState } from '@/components/ui/Misc';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

function BranchForm({ open, onClose, editing }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    values: editing || { openTime: '09:00', closeTime: '21:00' },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editing ? branchApi.update(editing.id, data) : branchApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success(editing ? 'Sucursal actualizada' : 'Sucursal creada');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar sucursal' : 'Nueva sucursal'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit((d) => mutation.mutate(d))} loading={mutation.isPending}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nombre *" containerClassName="sm:col-span-2" error={errors.name?.message} {...register('name', { required: 'Requerido' })} />
        <Input label="Dirección" containerClassName="sm:col-span-2" {...register('address')} />
        <Input label="Teléfono" {...register('phone')} />
        <div />
        <Input label="Apertura" type="time" {...register('openTime')} />
        <Input label="Cierre" type="time" {...register('closeTime')} />
      </form>
    </Modal>
  );
}

export default function Branches() {
  const [modal, setModal] = useState({ open: false, editing: null });

  const { data = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.list().then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="Sucursales" subtitle={`${data.length} ubicaciones`}>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="h-4 w-4" /> Nueva sucursal
        </Button>
      </PageHeader>

      {isLoading ? (
        <PageLoader />
      ) : data.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{b.name}</h3>
                    {!b.isActive && <Badge tone="red" className="mt-1">Inactiva</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, editing: b })}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                {b.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {b.address}</p>}
                {b.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {b.phone}</p>}
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {b.openTime} – {b.closeTime}</p>
                <p className="flex items-center gap-2"><Users className="h-4 w-4" /> {b._count?.barbers ?? 0} barberos</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Building2} title="Sin sucursales" description="Registra tu primera ubicación." />
      )}

      <BranchForm open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />
    </div>
  );
}
