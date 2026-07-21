import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, Users, Eye, Phone } from 'lucide-react';
import { clientApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { PageHeader, PageLoader, EmptyState, Avatar } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, TIER } from '@/components/ui/Badge';
import { Table, Th, Td, Tr } from '@/components/ui/Table';
import { useDebounced } from '@/hooks/useDebounced';

function ClientForm({ open, onClose, editing }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ values: editing || {} });

  const mutation = useMutation({
    mutationFn: (data) =>
      editing ? clientApi.update(editing.id, data) : clientApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado');
      onClose();
      reset();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSubmit = (values) => {
    const payload = {
      ...values,
      birthDate: values.birthDate || null,
    };
    mutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
            {editing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nombre *"
          error={errors.firstName?.message}
          {...register('firstName', { required: 'Requerido' })}
        />
        <Input label="Apellido" {...register('lastName')} />
        <Input label="DNI" {...register('dni')} />
        <Input label="Celular" {...register('phone')} />
        <Input label="Correo" type="email" {...register('email')} />
        <Input
          label="Fecha de nacimiento"
          type="date"
          {...register('birthDate')}
        />
        <Textarea label="Notas" containerClassName="sm:col-span-2" {...register('notes')} />
      </form>
    </Modal>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 350);
  const [modal, setModal] = useState({ open: false, editing: null });
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', debounced],
    queryFn: () => clientApi.list({ search: debounced, limit: 50 }),
  });

  const remove = useMutation({
    mutationFn: (id) => clientApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente desactivado');
      setToDelete(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const clients = data?.data || [];

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${data?.meta?.total ?? 0} registrados`}>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </PageHeader>

      <Card>
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, DNI, celular…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : clients.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th className="hidden sm:table-cell">Contacto</Th>
                <Th className="hidden md:table-cell">Nivel</Th>
                <Th className="hidden md:table-cell">Puntos</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const tier = TIER[c.loyaltyAccount?.tier || 'BRONZE'];
                return (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${c.firstName} ${c.lastName || ''}`} src={c.photoUrl} size="sm" />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{c.dni || 'Sin DNI'}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      {c.phone ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Phone className="h-3.5 w-3.5" /> {c.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="hidden md:table-cell">
                      <Badge tone={tier.tone}>{tier.label}</Badge>
                    </Td>
                    <Td className="hidden md:table-cell font-medium">
                      {c.loyaltyAccount?.points ?? 0}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/${c.id}`)} title="Ver historial">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, editing: c })} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(c)} title="Eliminar" className="text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={Users}
            title="Sin clientes"
            description="Registra tu primer cliente para empezar."
            action={
              <Button onClick={() => setModal({ open: true, editing: null })}>
                <Plus className="h-4 w-4" /> Nuevo cliente
              </Button>
            }
          />
        )}
      </Card>

      <ClientForm
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Desactivar cliente"
        description={`¿Desactivar a ${toDelete?.firstName}? Su historial se conservará.`}
        confirmText="Desactivar"
      />
    </div>
  );
}
