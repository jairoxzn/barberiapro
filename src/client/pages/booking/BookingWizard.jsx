import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Scissors,
  MapPin,
  User,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import { bookingApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { money } from '@/utils/format';
import { cn } from '@/utils/cn';

const STEPS = ['Sucursal', 'Servicios', 'Barbero', 'Fecha y hora', 'Confirmar'];

const todayStr = () => new Date().toISOString().slice(0, 10);

export function BookingWizard({ shop, onBooked }) {
  const [step, setStep] = useState(0);
  const [branchId, setBranchId] = useState(shop.branches[0]?.id || '');
  const [serviceIds, setServiceIds] = useState([]);
  const [barberId, setBarberId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState(null);

  const selectedServices = shop.services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((a, s) => a + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((a, s) => a + s.durationMinutes, 0);

  // Barberos de la sucursal elegida (o todos si no tienen sucursal fija).
  const barbers = shop.barbers.filter((b) => !b.branchId || b.branchId === branchId);
  const barber = shop.barbers.find((b) => b.id === barberId);
  const branch = shop.branches.find((b) => b.id === branchId);

  const { data: availability, isFetching } = useQuery({
    queryKey: ['availability', barberId, date, serviceIds],
    queryFn: () =>
      bookingApi
        .availability({ barberId, date, serviceIds: serviceIds.join(',') })
        .then((r) => r.data),
    enabled: step === 3 && !!barberId && serviceIds.length > 0,
  });

  const book = useMutation({
    mutationFn: () =>
      bookingApi.book({ branchId, barberId, serviceIds, startTime: slot.iso }),
    onSuccess: () => {
      toast.success('¡Reserva confirmada!');
      onBooked();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const toggleService = (id) =>
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const canNext = useMemo(() => {
    if (step === 0) return !!branchId;
    if (step === 1) return serviceIds.length > 0;
    if (step === 2) return !!barberId;
    if (step === 3) return !!slot;
    return true;
  }, [step, branchId, serviceIds, barberId, slot]);

  const next = () => {
    if (step === 2) setSlot(null); // al cambiar barbero, resetea el horario
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div className="mb-6 flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition',
                  i < step
                    ? 'bg-brand-600 text-white'
                    : i === step
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-500/20'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="mt-1 hidden text-xs text-slate-400 sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-1 h-0.5 flex-1', i < step ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800')} />
            )}
          </div>
        ))}
      </div>

      <div className="card min-h-[300px] p-5 sm:p-6">
        {/* Paso 0: Sucursal */}
        {step === 0 && (
          <Section icon={MapPin} title="Elige la sucursal">
            <div className="grid gap-3">
              {shop.branches.map((b) => (
                <OptionCard
                  key={b.id}
                  active={branchId === b.id}
                  onClick={() => setBranchId(b.id)}
                  title={b.name}
                  subtitle={b.address}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Paso 1: Servicios */}
        {step === 1 && (
          <Section icon={Scissors} title="Elige uno o más servicios">
            <div className="grid gap-3 sm:grid-cols-2">
              {shop.services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3 text-left transition',
                    serviceIds.includes(s.id)
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  )}
                >
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.durationMinutes} min</p>
                  </div>
                  <span className="font-semibold">{money(s.price)}</span>
                </button>
              ))}
            </div>
            {serviceIds.length > 0 && (
              <div className="mt-4 flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
                <span className="text-slate-500">{serviceIds.length} servicio(s) · {totalDuration} min</span>
                <span className="font-bold">{money(totalPrice)}</span>
              </div>
            )}
          </Section>
        )}

        {/* Paso 2: Barbero */}
        {step === 2 && (
          <Section icon={User} title="Elige tu barbero">
            <div className="grid gap-3">
              {barbers.length ? (
                barbers.map((b) => (
                  <OptionCard
                    key={b.id}
                    active={barberId === b.id}
                    onClick={() => setBarberId(b.id)}
                    title={b.name}
                    subtitle={b.specialty}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-400">No hay barberos en esta sucursal.</p>
              )}
            </div>
          </Section>
        )}

        {/* Paso 3: Fecha y hora */}
        {step === 3 && (
          <Section icon={Calendar} title="Elige fecha y hora">
            <input
              type="date"
              min={todayStr()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSlot(null);
              }}
              className="input mb-4 max-w-xs"
            />
            {isFetching ? (
              <div className="flex items-center gap-2 py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Buscando horarios...
              </div>
            ) : availability?.slots?.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availability.slots.map((s) => (
                  <button
                    key={s.iso}
                    onClick={() => setSlot(s)}
                    className={cn(
                      'rounded-lg border py-2 text-sm font-medium transition',
                      slot?.iso === s.iso
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                    )}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 px-4 py-6 text-center text-sm text-amber-700 dark:bg-amber-500/10">
                No hay horarios disponibles ese día. Prueba otra fecha.
              </div>
            )}
          </Section>
        )}

        {/* Paso 4: Confirmar */}
        {step === 4 && (
          <Section icon={Check} title="Confirma tu reserva">
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <Row icon={MapPin} label="Sucursal" value={branch?.name} />
              <Row icon={User} label="Barbero" value={barber?.name} />
              <Row
                icon={Scissors}
                label="Servicios"
                value={selectedServices.map((s) => s.name).join(', ')}
              />
              <Row
                icon={Clock}
                label="Fecha y hora"
                value={slot ? `${new Date(slot.iso).toLocaleDateString('es-PE')} · ${slot.time} (${totalDuration} min)` : ''}
              />
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="font-semibold">Total estimado</span>
                <span className="text-lg font-bold text-brand-600">{money(totalPrice)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              El pago se realiza en la barbería. Podrás cancelar desde “Mis reservas”.
            </p>
          </Section>
        )}
      </div>

      {/* Navegación */}
      <div className="mt-5 flex justify-between">
        <Button variant="secondary" onClick={back} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Atrás
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canNext}>
            Continuar <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => book.mutate()} loading={book.isPending} size="lg">
            Confirmar reserva
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="animate-fade-in">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
        <Icon className="h-5 w-5 text-brand-600" /> {title}
      </h3>
      {children}
    </div>
  );
}

function OptionCard({ active, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between rounded-xl border p-4 text-left transition',
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
      )}
    >
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border-2',
          active ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
        )}
      >
        {active && <Check className="h-3 w-3 text-white" />}
      </div>
    </button>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="w-24 text-sm text-slate-400">{label}</span>
      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
