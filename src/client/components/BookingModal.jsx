import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Check } from 'lucide-react';
import { appointmentApi, serviceApi, clientApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { money } from '@/utils/format';
import { cn } from '@/utils/cn';

// Reserva: sucursal → servicio(s) → barbero → fecha → hora → confirmar.
export function BookingModal({ open, onClose, defaultDate, branches, barbers }) {
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceIds, setServiceIds] = useState([]);
  const [day, setDay] = useState(() => format(defaultDate || new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');

  useEffect(() => {
    if (open) {
      setBranchId(branches[0]?.id || '');
      setBarberId('');
      setClientId('');
      setServiceIds([]);
      setDay(format(defaultDate || new Date(), 'yyyy-MM-dd'));
      setTime('10:00');
    }
  }, [open, defaultDate, branches]);

  const { data: services = [] } = useQuery({
    queryKey: ['services-active'],
    queryFn: () => serviceApi.list({ isActive: true, limit: 100 }).then((r) => r.data),
    enabled: open,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-active'],
    queryFn: () => clientApi.list({ isActive: true, limit: 100 }).then((r) => r.data),
    enabled: open,
  });

  const branchBarbers = useMemo(
    () => barbers.filter((b) => b.isActive && (!branchId || !b.branchId || b.branchId === branchId)),
    [barbers, branchId]
  );

  const { totalPrice, totalDuration } = useMemo(() => {
    const selected = services.filter((s) => serviceIds.includes(s.id));
    return {
      totalPrice: selected.reduce((sum, s) => sum + Number(s.price), 0),
      totalDuration: selected.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  }, [services, serviceIds]);

  const create = useMutation({
    mutationFn: () => {
      const startTime = new Date(`${day}T${time}:00`);
      return appointmentApi.create({
        branchId,
        barberId,
        clientId: clientId || undefined,
        serviceIds,
        startTime: startTime.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Reserva creada');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const toggleService = (id) =>
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const canSubmit = branchId && barberId && serviceIds.length > 0 && day && time;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva reserva"
      size="lg"
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{money(totalPrice)}</span>
            {totalDuration > 0 && <span className="ml-2 text-slate-400">· {totalDuration} min</span>}
          </div>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!canSubmit}>
            Confirmar reserva
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Sucursal *" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Selecciona…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Sin registrar</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ''}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="label">Servicios *</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => {
              const active = serviceIds.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3 text-left transition',
                    active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.durationMinutes} min · {money(s.price)}</p>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Barbero *" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            <option value="">Selecciona…</option>
            {branchBarbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <div>
            <label className="label">Fecha *</label>
            <input type="date" className="input" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div>
            <label className="label">Hora *</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
