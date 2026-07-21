import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search,
  Scissors,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  Printer,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { serviceApi, productApi, clientApi, saleApi } from '@/services';
import { api, errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useDebounced } from '@/hooks/useDebounced';
import { PageHeader, EmptyState, Spinner } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { money } from '@/utils/format';
import { cn } from '@/utils/cn';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
];

const round2 = (n) => Math.round(n * 100) / 100;

export default function POS() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const taxRate = 18; // referencial; el backend usa el taxRate del tenant

  const [tab, setTab] = useState('services');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);
  const [cart, setCart] = useState([]); // {key, type, id, name, price, qty, stock}
  const [clientId, setClientId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null); // venta recién registrada (para imprimir)
  const [printing, setPrinting] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['pos-services', debounced],
    queryFn: () => serviceApi.list({ search: debounced || undefined, limit: 100 }),
    enabled: tab === 'services',
  });
  const { data: products } = useQuery({
    queryKey: ['pos-products', debounced, branchId],
    queryFn: () =>
      productApi.list({ search: debounced || undefined, branchId, limit: 100 }),
    enabled: tab === 'products',
  });
  const { data: clients } = useQuery({
    queryKey: ['pos-clients'],
    queryFn: () => clientApi.list({ limit: 100 }),
  });

  const items = tab === 'services' ? services?.data || [] : products?.data || [];

  const addToCart = (item) => {
    const type = tab === 'services' ? 'service' : 'product';
    const price = Number(type === 'service' ? item.price : item.salePrice);
    const stock = type === 'product' ? item.stock : Infinity;
    const key = `${type}-${item.id}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        if (existing.qty + 1 > stock) {
          toast.error(`Sólo hay ${stock} en stock`);
          return prev;
        }
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + 1 } : c));
      }
      if (stock < 1) {
        toast.error('Sin stock disponible');
        return prev;
      }
      return [...prev, { key, type, id: item.id, name: item.name, price, qty: 1, stock }];
    });
  };

  const changeQty = (key, delta) =>
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.key !== key) return c;
          const qty = c.qty + delta;
          if (qty > c.stock) {
            toast.error(`Sólo hay ${c.stock} en stock`);
            return c;
          }
          return { ...c, qty };
        })
        .filter((c) => c.qty > 0)
    );

  const removeItem = (key) => setCart((prev) => prev.filter((c) => c.key !== key));

  const subtotal = useMemo(
    () => round2(cart.reduce((a, c) => a + c.price * c.qty, 0)),
    [cart]
  );
  const disc = Math.min(Number(discount) || 0, subtotal);
  const base = round2(subtotal - disc);
  const tax = applyTax ? round2(base * (taxRate / 100)) : 0;
  const total = round2(base + tax);

  const reset = () => {
    setCart([]);
    setDiscount(0);
    setApplyTax(false);
    setClientId('');
  };

  const sale = useMutation({
    mutationFn: (payments) =>
      saleApi.create({
        branchId,
        clientId: clientId || undefined,
        items: cart.map((c) => ({
          [c.type === 'service' ? 'serviceId' : 'productId']: c.id,
          quantity: c.qty,
        })),
        discount: disc,
        applyTax,
        payments,
      }),
    onSuccess: (res) => {
      const created = res.data;
      toast.success(`Venta ${created.code} registrada`);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['cash'] });
      // La venta ya está guardada; ahora se muestra el paso de impresión.
      setLastSale(created);
      reset();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  // Descarga el ticket PDF con el token (una pestaña nueva no envía el JWT).
  // Se abre la pestaña de forma síncrona para evitar el bloqueo de pop-ups.
  const printTicket = async (saleId) => {
    const win = window.open('', '_blank');
    setPrinting(true);
    try {
      const { data } = await api.get(`/sales/${saleId}/ticket`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      if (win) win.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      toast.error(errMsg(e));
    } finally {
      setPrinting(false);
    }
  };

  const closePayment = () => {
    setPayOpen(false);
    setLastSale(null);
  };

  if (!branchId) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Sin sucursal asignada"
        description="Tu usuario no tiene una sucursal asignada para operar el punto de venta."
      />
    );
  }

  return (
    <div>
      <PageHeader title="Punto de venta" subtitle="Venta rápida de servicios y productos" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Catálogo */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {[
                { k: 'services', label: 'Servicios', icon: Scissors },
                { k: 'products', label: 'Productos', icon: Package },
              ].map(({ k, label, icon: Icon }) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
                    tab === k
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500'
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={`Buscar ${tab === 'services' ? 'servicios' : 'productos'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => {
              const price = tab === 'services' ? item.price : item.salePrice;
              const out = tab === 'products' && item.stock < 1;
              return (
                <button
                  key={item.id}
                  disabled={out}
                  onClick={() => addToCart(item)}
                  className={cn(
                    'group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition dark:border-slate-800 dark:bg-slate-900',
                    out
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md'
                  )}
                >
                  <div
                    className="mb-2 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg"
                    style={{
                      background: item.imageUrl
                        ? undefined
                        : tab === 'services' ? `${item.color}20` : '#6366f120',
                      color: tab === 'services' ? item.color : '#6366f1',
                    }}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : tab === 'services' ? (
                      <Scissors className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {item.name}
                  </p>
                  <div className="mt-1 flex w-full items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{money(price)}</span>
                    {tab === 'products' && (
                      <span className="text-xs text-slate-400">stock {item.stock}</span>
                    )}
                  </div>
                </button>
              );
            })}
            {!items.length && (
              <p className="col-span-full py-10 text-center text-sm text-slate-400">
                Sin resultados
              </p>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-semibold">
                <ShoppingCart className="h-5 w-5 text-brand-600" /> Carrito
                {cart.length > 0 && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    {cart.reduce((a, c) => a + c.qty, 0)}
                  </span>
                )}
              </h3>
              {cart.length > 0 && (
                <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500">
                  Vaciar
                </button>
              )}
            </div>

            <div className="max-h-[36vh] overflow-y-auto px-5">
              {cart.length ? (
                cart.map((c) => (
                  <div key={c.key} className="flex items-center gap-2 border-b border-slate-50 py-3 dark:border-slate-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                      <p className="text-xs text-slate-400">{money(c.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeQty(c.key, -1)} className="rounded-md bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-800">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{c.qty}</span>
                      <button onClick={() => changeQty(c.key, 1)} className="rounded-md bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-800">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold">{money(c.price * c.qty)}</span>
                    <button onClick={() => removeItem(c.key)} className="text-slate-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  Agrega servicios o productos
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <Select
                label="Cliente (opcional)"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Cliente ocasional</option>
                {(clients?.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName || ''}
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-3">
                <Input
                  label="Descuento (S/)"
                  type="number"
                  step="0.01"
                  min="0"
                  containerClassName="flex-1"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                  />
                  IGV {taxRate}%
                </label>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>{money(subtotal)}</span>
                </div>
                {disc > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Descuento</span><span>-{money(disc)}</span>
                  </div>
                )}
                {applyTax && (
                  <div className="flex justify-between text-slate-500">
                    <span>IGV</span><span>{money(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-lg font-bold text-slate-900 dark:text-white">
                  <span>Total</span><span>{money(total)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!cart.length}
                onClick={() => setPayOpen(true)}
              >
                Cobrar {money(total)}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <PaymentModal
        open={payOpen}
        done={lastSale}
        onClose={closePayment}
        total={total}
        loading={sale.isPending}
        printing={printing}
        onConfirm={(payments) => sale.mutate(payments)}
        onPrint={() => lastSale && printTicket(lastSale.id)}
      />
    </div>
  );
}

function PaymentModal({ open, done, onClose, total, onConfirm, onPrint, loading, printing }) {
  const [method, setMethod] = useState('CASH');
  const [received, setReceived] = useState('');

  const rec = Number(received) || 0;
  const change = method === 'CASH' ? Math.max(0, round2(rec - total)) : 0;

  const confirm = () => {
    // Un único pago que cubre el total (el backend admite pagos mixtos vía API).
    onConfirm([{ method, amount: total }]);
  };

  // ---- Fase 2: venta registrada → imprimir ----
  if (done) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Venta registrada"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Nueva venta</Button>
            <Button onClick={onPrint} loading={printing}>
              <Printer className="h-4 w-4" /> Imprimir ticket
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            ¡Venta {done.code} registrada!
          </p>
          <p className="mt-1 text-sm text-slate-500">Total cobrado</p>
          <p className="text-3xl font-extrabold text-brand-600">{money(done.total)}</p>
          {done.pointsEarned > 0 && (
            <p className="mt-2 text-sm text-slate-500">
              El cliente ganó <strong>{done.pointsEarned}</strong> puntos
            </p>
          )}
          <p className="mt-4 text-xs text-slate-400">
            El ticket se abrirá en una pestaña nueva para imprimir o guardar en PDF.
          </p>
        </div>
      </Modal>
    );
  }

  // ---- Fase 1: cobrar ----
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cobrar venta"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirm} loading={loading}>
            Confirmar venta
          </Button>
        </>
      }
    >
      <div className="mb-5 rounded-2xl bg-brand-50 p-5 text-center dark:bg-brand-500/10">
        <p className="text-sm text-brand-700 dark:text-brand-300">Total a cobrar</p>
        <p className="text-3xl font-extrabold text-brand-700 dark:text-brand-200">{money(total)}</p>
      </div>

      <label className="label">Método de pago</label>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMethod(m.value)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
              method === m.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {method === 'CASH' && (
        <div className="flex items-center gap-4">
          <Input
            label="Efectivo recibido"
            type="number"
            step="0.01"
            containerClassName="flex-1"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
          />
          <div className="mt-6 text-right">
            <p className="text-xs text-slate-400">Vuelto</p>
            <p className="text-xl font-bold text-emerald-600">{money(change)}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
