import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Wallet,
  Lock,
  Unlock,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Receipt,
} from 'lucide-react';
import { cashApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader, EmptyState } from '@/components/ui/Misc';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { money, fDateTime } from '@/utils/format';

function Stat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900 dark:text-white',
    green: 'text-emerald-600',
    red: 'text-red-600',
    brand: 'text-brand-600',
  };
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function OpenCashCard({ branchId }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { openingAmount: 0 } });
  const open = useMutation({
    mutationFn: (d) => cashApi.open({ branchId, openingAmount: Number(d.openingAmount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-current'] });
      toast.success('Caja abierta');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Card className="mx-auto max-w-md">
      <CardBody className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <Unlock className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold">Caja cerrada</h3>
        <p className="mt-1 text-sm text-slate-500">
          Abre la caja con el monto inicial en efectivo para empezar a operar.
        </p>
        <form onSubmit={handleSubmit((d) => open.mutate(d))} className="mt-6 space-y-3 text-left">
          <Input label="Monto inicial (S/)" type="number" step="0.01" {...register('openingAmount')} />
          <Button type="submit" className="w-full" size="lg" loading={open.isPending}>
            <Unlock className="h-4 w-4" /> Abrir caja
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function MovementModal({ open, onClose, sessionId }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { type: 'INCOME' } });
  const mut = useMutation({
    mutationFn: (d) => cashApi.addMovement(sessionId, { ...d, amount: Number(d.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-current'] });
      toast.success('Movimiento registrado');
      reset({ type: 'INCOME', amount: '', concept: '' });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo movimiento de caja"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit((d) => mut.mutate(d))} loading={mut.isPending}>Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Tipo" {...register('type')}>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Egreso</option>
        </Select>
        <Input label="Monto (S/)" type="number" step="0.01" {...register('amount', { required: true })} />
        <Input label="Concepto" placeholder="Ej. compra de insumos" {...register('concept', { required: true })} />
      </div>
    </Modal>
  );
}

function CloseModal({ open, onClose, session }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch } = useForm({ defaultValues: { closingAmount: '' } });
  const counted = Number(watch('closingAmount')) || 0;
  const expected = session?.summary.expected ?? 0;
  const diff = counted - expected;

  const close = useMutation({
    mutationFn: (d) => cashApi.close(session.id, Number(d.closingAmount)),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['cash-current'] });
      const d = Number(res.data.difference);
      toast.success(
        d === 0 ? 'Caja cerrada — cuadre exacto' : `Caja cerrada — diferencia ${money(d)}`
      );
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja (arqueo)"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={handleSubmit((d) => close.mutate(d))} loading={close.isPending}>
            <Lock className="h-4 w-4" /> Cerrar caja
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
        <div className="flex justify-between py-1"><span className="text-slate-500">Efectivo esperado</span><strong>{money(expected)}</strong></div>
      </div>
      <Input label="Efectivo contado en caja (S/)" type="number" step="0.01" {...register('closingAmount', { required: true })} />
      {watch('closingAmount') !== '' && (
        <div className={`mt-3 rounded-xl p-3 text-center text-sm font-medium ${
          diff === 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10'
          : diff > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10'
          : 'bg-red-50 text-red-700 dark:bg-red-500/10'
        }`}>
          {diff === 0 ? 'Cuadre exacto ✓' : `Diferencia: ${money(diff)} (${diff > 0 ? 'sobrante' : 'faltante'})`}
        </div>
      )}
    </Modal>
  );
}

export default function Cash() {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const [movOpen, setMovOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['cash-current', branchId],
    queryFn: () => cashApi.current(branchId).then((r) => r.data),
    enabled: !!branchId,
    refetchInterval: 20_000, // refleja ventas nuevas en caja sin recargar
  });

  if (!branchId) {
    return <EmptyState icon={Wallet} title="Sin sucursal asignada" description="Tu usuario no tiene una sucursal para operar caja." />;
  }
  if (isLoading) return <PageLoader />;

  const s = session?.summary;

  return (
    <div>
      <PageHeader title="Caja" subtitle={session ? `Abierta ${fDateTime(session.openedAt)}` : 'Sin caja abierta'}>
        {session && (
          <>
            <Button variant="secondary" onClick={() => setMovOpen(true)}>
              <Plus className="h-4 w-4" /> Movimiento
            </Button>
            <Button variant="danger" onClick={() => setCloseOpen(true)}>
              <Lock className="h-4 w-4" /> Cerrar caja
            </Button>
          </>
        )}
      </PageHeader>

      {!session ? (
        <OpenCashCard branchId={branchId} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Apertura" value={money(s.opening)} />
            <Stat label="Ventas efectivo" value={money(s.cashSales)} tone="green" />
            <Stat label="Ingresos" value={money(s.income)} tone="green" />
            <Stat label="Egresos" value={money(s.expense)} tone="red" />
            <Stat label="Esperado en caja" value={money(s.expected)} tone="brand" />
            <Stat label="Total facturado" value={money(s.totalBilled)} />
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="font-semibold">Movimientos</h3>
              <Badge tone="gray">{session.movements.length}</Badge>
            </div>
            {session.movements.length ? (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {session.movements.map((m) => {
                  const inbound = m.type === 'INCOME' || m.type === 'SALE';
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={inbound ? 'text-emerald-500' : 'text-red-500'}>
                        {inbound ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.concept}</p>
                        <p className="text-xs text-slate-400">{fDateTime(m.createdAt)}</p>
                      </div>
                      <span className={`font-semibold ${inbound ? 'text-emerald-600' : 'text-red-600'}`}>
                        {inbound ? '+' : '-'}{money(m.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Receipt} title="Sin movimientos aún" />
            )}
          </Card>
        </div>
      )}

      {session && <MovementModal open={movOpen} onClose={() => setMovOpen(false)} sessionId={session.id} />}
      {session && <CloseModal open={closeOpen} onClose={() => setCloseOpen(false)} session={session} />}
    </div>
  );
}
