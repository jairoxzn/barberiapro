import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  AlertTriangle,
  ArrowDownUp,
  History,
} from 'lucide-react';
import { productApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useDebounced } from '@/hooks/useDebounced';
import { PageHeader, PageLoader, EmptyState } from '@/components/ui/Misc';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { money, fDateTime } from '@/utils/format';

function ProductForm({ open, onClose, editing, branchId }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    values: editing
      ? { ...editing }
      : { costPrice: 0, salePrice: 0, minStock: 5, initialStock: 0, imageUrl: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editing ? productApi.update(editing.id, data) : productApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSubmit = (v) => {
    const data = {
      ...v,
      costPrice: Number(v.costPrice),
      salePrice: Number(v.salePrice),
      minStock: Number(v.minStock),
    };
    if (!editing) {
      data.initialStock = Number(v.initialStock || 0);
      data.branchId = branchId;
    }
    mutation.mutate(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      size="lg"
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
        <Input label="SKU" {...register('sku')} />
        <Input label="Código de barras" {...register('barcode')} />
        <Input label="Precio costo (S/)" type="number" step="0.01" {...register('costPrice')} />
        <Input label="Precio venta (S/) *" type="number" step="0.01"
          error={errors.salePrice?.message}
          {...register('salePrice', { required: 'Requerido' })} />
        <Input label="Stock mínimo" type="number" {...register('minStock')} />
        {!editing && (
          <Input label="Stock inicial" type="number" {...register('initialStock')} />
        )}
        <Input label="Ubicación en almacén" {...register('location')} />
        <Textarea label="Descripción" containerClassName="sm:col-span-2" {...register('description')} />
        <div className="sm:col-span-2">
          <ImagePicker
            label="Imagen del producto"
            value={watch('imageUrl')}
            onChange={(url) => setValue('imageUrl', url)}
          />
        </div>
      </form>
    </Modal>
  );
}

function StockModal({ open, onClose, product, branchId }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { type: 'PURCHASE', quantity: 1 },
  });

  const mutation = useMutation({
    mutationFn: (data) => productApi.moveStock(product.id, { ...data, branchId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['kardex', product.id] });
      toast.success(`Stock actualizado: ${res.data.stock}`);
      reset({ type: 'PURCHASE', quantity: 1 });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Movimiento de stock · ${product.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit((d) => mutation.mutate({ ...d, quantity: Number(d.quantity) }))} loading={mutation.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-500">
        Stock actual: <strong className="text-slate-800 dark:text-slate-100">{product.stock}</strong>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Tipo" {...register('type')}>
          <option value="PURCHASE">Entrada (compra)</option>
          <option value="RETURN">Devolución</option>
          <option value="ADJUSTMENT_IN">Ajuste +</option>
          <option value="ADJUSTMENT_OUT">Ajuste −</option>
        </Select>
        <Input label="Cantidad" type="number" min="1" {...register('quantity', { required: true })} />
        <Input label="Costo unitario (opcional)" type="number" step="0.01" {...register('unitCost')} />
        <Input label="Nota" {...register('note')} />
      </div>
    </Modal>
  );
}

function KardexModal({ open, onClose, product, branchId }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['kardex', product?.id, branchId],
    queryFn: () => productApi.kardex(product.id, branchId).then((r) => r.data),
    enabled: open && !!product,
  });

  const LABEL = {
    INITIAL: 'Inicial', PURCHASE: 'Compra', SALE: 'Venta',
    ADJUSTMENT_IN: 'Ajuste +', ADJUSTMENT_OUT: 'Ajuste −',
    RETURN: 'Devolución', TRANSFER_IN: 'Transf. +', TRANSFER_OUT: 'Transf. −',
  };

  return (
    <Modal open={open} onClose={onClose} title={`Kardex · ${product?.name ?? ''}`} size="lg">
      {isLoading ? (
        <PageLoader />
      ) : data.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400 dark:border-slate-800">
                <th className="py-2">Fecha</th>
                <th>Tipo</th>
                <th className="text-right">Cant.</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 dark:border-slate-800/50">
                  <td className="py-2 text-slate-500">{fDateTime(m.createdAt)}</td>
                  <td><Badge tone={m.quantity >= 0 ? 'green' : 'red'}>{LABEL[m.type] ?? m.type}</Badge></td>
                  <td className={`text-right font-medium ${m.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.quantity >= 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="text-right font-semibold">{m.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={History} title="Sin movimientos" />
      )}
    </Modal>
  );
}

export default function Products() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const branchId = user?.branch?.id;

  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const debounced = useDebounced(search, 300);
  const [form, setForm] = useState({ open: false, editing: null });
  const [stock, setStock] = useState(null);
  const [kardex, setKardex] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', debounced, lowOnly, branchId],
    queryFn: () =>
      productApi.list({
        search: debounced || undefined,
        lowStock: lowOnly || undefined,
        branchId,
        limit: 100,
      }),
  });

  const remove = useMutation({
    mutationFn: (id) => productApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto desactivado');
      setToDelete(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const products = data?.data || [];
  const lowCount = products.filter((p) => p.lowStock).length;

  return (
    <div>
      <PageHeader title="Inventario" subtitle={`${data?.meta?.total ?? 0} productos`}>
        {isAdmin && (
          <Button onClick={() => setForm({ open: true, editing: null })}>
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por nombre, SKU o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={lowOnly ? 'primary' : 'secondary'}
          onClick={() => setLowOnly((v) => !v)}
        >
          <AlertTriangle className="h-4 w-4" />
          Stock bajo {lowCount > 0 && `(${lowCount})`}
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : products.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400 dark:border-slate-800">
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-3">SKU</th>
                  <th className="px-3 text-right">Costo</th>
                  <th className="px-3 text-right">Venta</th>
                  <th className="px-3 text-center">Stock</th>
                  <th className="px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                          {p.brand && <p className="text-xs text-slate-400">{p.brand.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-slate-500">{p.sku || '—'}</td>
                    <td className="px-3 text-right text-slate-500">{money(p.costPrice)}</td>
                    <td className="px-3 text-right font-medium">{money(p.salePrice)}</td>
                    <td className="px-3 text-center">
                      <Badge tone={p.lowStock ? 'red' : 'green'}>
                        {p.stock} {p.lowStock && '⚠'}
                      </Badge>
                    </td>
                    <td className="px-5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Movimiento de stock" onClick={() => setStock(p)}>
                          <ArrowDownUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Kardex" onClick={() => setKardex(p)}>
                          <History className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setForm({ open: true, editing: p })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setToDelete(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Package}
          title="Sin productos"
          description="Registra los productos que vendes en tu barbería."
          action={isAdmin && <Button onClick={() => setForm({ open: true, editing: null })}><Plus className="h-4 w-4" /> Nuevo producto</Button>}
        />
      )}

      <ProductForm open={form.open} editing={form.editing} branchId={branchId} onClose={() => setForm({ open: false, editing: null })} />
      <StockModal open={!!stock} product={stock} branchId={branchId} onClose={() => setStock(null)} />
      <KardexModal open={!!kardex} product={kardex} branchId={branchId} onClose={() => setKardex(null)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Desactivar producto"
        description={`¿Desactivar "${toDelete?.name}"?`}
        confirmText="Desactivar"
      />
    </div>
  );
}
