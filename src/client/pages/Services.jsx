import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Scissors, Clock, Tag } from 'lucide-react';
import { serviceApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader, EmptyState } from '@/components/ui/Misc';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { money } from '@/utils/format';

function ServiceForm({ open, onClose, editing, categories }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    values: editing
      ? { ...editing, categoryId: editing.categoryId || '' }
      : { durationMinutes: 30, color: '#6366f1', categoryId: '', imageUrl: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editing ? serviceApi.update(editing.id, data) : serviceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success(editing ? 'Servicio actualizado' : 'Servicio creado');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSubmit = (v) =>
    mutation.mutate({
      ...v,
      price: Number(v.price),
      durationMinutes: Number(v.durationMinutes),
      categoryId: v.categoryId || undefined,
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar servicio' : 'Nuevo servicio'}
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
        <Input
          label="Nombre *"
          containerClassName="sm:col-span-2"
          error={errors.name?.message}
          {...register('name', { required: 'Requerido' })}
        />
        <Input
          label="Precio (S/) *"
          type="number"
          step="0.01"
          error={errors.price?.message}
          {...register('price', { required: 'Requerido' })}
        />
        <Input
          label="Duración (min) *"
          type="number"
          error={errors.durationMinutes?.message}
          {...register('durationMinutes', { required: 'Requerido' })}
        />
        <Select label="Categoría" {...register('categoryId')}>
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <div>
          <label className="label">Color</label>
          <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 dark:border-slate-700" {...register('color')} />
        </div>
        <Textarea label="Descripción" containerClassName="sm:col-span-2" {...register('description')} />
        <div className="sm:col-span-2">
          <ImagePicker
            label="Imagen del servicio"
            value={watch('imageUrl')}
            onChange={(url) => setValue('imageUrl', url)}
          />
        </div>
      </form>
    </Modal>
  );
}

function CategoryManager({ open, onClose, categories }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { color: '#6366f1' } });

  const create = useMutation({
    mutationFn: (d) => serviceApi.createCategory(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      reset({ name: '', color: '#6366f1' });
      toast.success('Categoría creada');
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => serviceApi.removeCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Categoría eliminada');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Categorías">
      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="flex gap-2">
        <Input containerClassName="flex-1" placeholder="Nueva categoría" {...register('name', { required: true })} />
        <input type="color" className="h-11 w-12 rounded-xl border border-slate-300 dark:border-slate-700" {...register('color')} />
        <Button type="submit" loading={create.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
      <ul className="mt-4 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              {c.name}
              <span className="text-xs text-slate-400">({c._count?.services ?? 0})</span>
            </span>
            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove.mutate(c.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default function Services() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [catOpen, setCatOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceApi.list({ limit: 100 }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => serviceApi.categories().then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id) => serviceApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Servicio desactivado');
      setToDelete(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const services = data?.data || [];

  return (
    <div>
      <PageHeader title="Servicios" subtitle={`${services.length} servicios`}>
        {isAdmin && (
          <>
            <Button variant="secondary" onClick={() => setCatOpen(true)}>
              <Tag className="h-4 w-4" /> Categorías
            </Button>
            <Button onClick={() => setModal({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Nuevo servicio
            </Button>
          </>
        )}
      </PageHeader>

      {isLoading ? (
        <PageLoader />
      ) : services.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="group overflow-hidden">
              {s.imageUrl ? (
                <div className="h-28 w-full overflow-hidden">
                  <img src={s.imageUrl} alt={s.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-1.5" style={{ background: s.color }} />
              )}
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${s.color}20`, color: s.color }}>
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</h3>
                      {s.category && <Badge tone="gray" className="mt-1">{s.category.name}</Badge>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex opacity-0 transition group-hover:opacity-100">
                      <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, editing: s })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setToDelete(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {s.description && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{s.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                    <Clock className="h-4 w-4" /> {s.durationMinutes} min
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{money(s.price)}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Scissors}
          title="Sin servicios"
          description="Crea los servicios que ofrece tu barbería."
          action={isAdmin && <Button onClick={() => setModal({ open: true, editing: null })}><Plus className="h-4 w-4" /> Nuevo servicio</Button>}
        />
      )}

      <ServiceForm open={modal.open} editing={modal.editing} categories={categories} onClose={() => setModal({ open: false, editing: null })} />
      <CategoryManager open={catOpen} categories={categories} onClose={() => setCatOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Desactivar servicio"
        description={`¿Desactivar "${toDelete?.name}"?`}
        confirmText="Desactivar"
      />
    </div>
  );
}
