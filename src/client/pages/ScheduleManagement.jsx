import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, formatDistanceStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Clock,
  CalendarClock,
  Ban,
  Plus,
  Pencil,
  Trash2,
  Sliders,
  Users,
  Building2,
  Globe,
  AlertCircle,
  Save,
  CheckCircle2,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react';
import { scheduleApi, branchApi, barberApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader, EmptyState, Avatar } from '@/components/ui/Misc';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BlockModal } from '@/components/BlockModal';
import { ScheduleModal } from '@/components/ScheduleModal';

const INTERVAL_OPTIONS = [
  { value: 15, label: 'Cada 15 minutos (Recomendado)' },
  { value: 20, label: 'Cada 20 minutos' },
  { value: 30, label: 'Cada 30 minutos' },
  { value: 45, label: 'Cada 45 minutos' },
  { value: 60, label: 'Cada 1 hora' },
];

const MIN_ADVANCE_OPTIONS = [
  { value: 0, label: 'Sin anticipación (Inmediata)' },
  { value: 1, label: '1 hora antes' },
  { value: 2, label: '2 horas antes' },
  { value: 4, label: '4 horas antes' },
  { value: 12, label: '12 horas antes' },
  { value: 24, label: '24 horas antes (1 día)' },
];

const MAX_ADVANCE_OPTIONS = [
  { value: 7, label: '7 días hacia el futuro' },
  { value: 14, label: '14 días hacia el futuro' },
  { value: 30, label: '30 días hacia el futuro (1 mes)' },
  { value: 60, label: '60 días hacia el futuro (2 meses)' },
  { value: 90, label: '90 días hacia el futuro (3 meses)' },
];

const BUFFER_OPTIONS = [
  { value: 0, label: 'Sin descanso entre citas' },
  { value: 5, label: '5 minutos de holgura' },
  { value: 10, label: '10 minutos de holgura' },
  { value: 15, label: '15 minutos de holgura' },
];

const CANCEL_ADVANCE_OPTIONS = [
  { value: 1, label: 'Hasta 1 hora antes de la cita' },
  { value: 2, label: 'Hasta 2 horas antes de la cita' },
  { value: 4, label: 'Hasta 4 horas antes de la cita' },
  { value: 12, label: 'Hasta 12 horas antes de la cita' },
  { value: 24, label: 'Hasta 24 horas antes de la cita' },
];

const WEEKDAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ScheduleManagement() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  // Estado de navegación por pestañas
  const [activeTab, setActiveTab] = useState('blocks'); // 'blocks' | 'rules' | 'team'

  // Filtros de bloqueos
  const [branchFilter, setBranchFilter] = useState('');
  const [barberFilter, setBarberFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('upcoming'); // 'upcoming' | 'all' | 'past'

  // Modales
  const [blockModal, setBlockModal] = useState({
    open: false,
    editing: null,
    defaultBarberId: '',
    defaultBranchId: '',
  });
  const [scheduleBarber, setScheduleBarber] = useState(null);
  const [blockToDelete, setBlockToDelete] = useState(null);

  // Queries
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['schedule-overview'],
    queryFn: () => scheduleApi.getOverview().then((r) => r.data),
  });

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['schedule-blocks', branchFilter, barberFilter, timeFilter],
    queryFn: () =>
      scheduleApi
        .listBlocks({
          branchId: branchFilter || undefined,
          barberId: barberFilter || undefined,
          upcomingOnly: timeFilter === 'upcoming' ? 'true' : undefined,
        })
        .then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.list().then((r) => r.data),
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barberApi.list({ limit: 100 }).then((r) => r.data),
  });

  // Mutación para eliminar un bloqueo
  const deleteMutation = useMutation({
    mutationFn: (id) => scheduleApi.deleteBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-blocks'] });
      qc.invalidateQueries({ queryKey: ['schedule-overview'] });
      qc.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Horario desbloqueado correctamente');
      setBlockToDelete(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  // Formulario de reglas de reserva
  const {
    register: registerSettings,
    handleSubmit: handleSubmitSettings,
    reset: resetSettings,
    formState: { isDirty: settingsDirty },
  } = useForm({
    values: overview?.settings || {
      slotIntervalMinutes: 15,
      minAdvanceHours: 1,
      maxAdvanceDays: 30,
      bufferMinutes: 0,
      cancelAdvanceHours: 2,
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) =>
      scheduleApi.updateSettings({
        slotIntervalMinutes: Number(data.slotIntervalMinutes),
        minAdvanceHours: Number(data.minAdvanceHours),
        maxAdvanceDays: Number(data.maxAdvanceDays),
        bufferMinutes: Number(data.bufferMinutes),
        cancelAdvanceHours: Number(data.cancelAdvanceHours),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['schedule-overview'] });
      toast.success('Reglas de reserva guardadas con éxito');
      resetSettings(res.data);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  // Filtrado temporal en frontend si es necesario
  const filteredBlocks = useMemo(() => {
    const now = new Date();
    return blocks.filter((b) => {
      const end = new Date(b.endTime);
      if (timeFilter === 'past') return isBefore(end, now);
      if (timeFilter === 'upcoming') return isAfter(end, now);
      return true;
    });
  }, [blocks, timeFilter]);

  // Contadores rápidos
  const now = new Date();
  const activeNowCount = blocks.filter(
    (b) => isBefore(new Date(b.startTime), now) && isAfter(new Date(b.endTime), now)
  ).length;

  if (loadingOverview && !overview) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios y Bloqueos"
        subtitle="Configura turnos de atención, reglas de reserva de citas y bloqueos de agenda"
      >
        <Button
          onClick={() =>
            setBlockModal({
              open: true,
              editing: null,
              defaultBarberId: '',
              defaultBranchId: '',
            })
          }
        >
          <Ban className="h-4 w-4" /> Bloquear horario
        </Button>
      </PageHeader>

      {/* Tabs superiores */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition ${
              activeTab === 'blocks'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Ban className="h-4 w-4" />
            Bloqueos de agenda
            {filteredBlocks.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {filteredBlocks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition ${
              activeTab === 'rules'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Reglas de reserva
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition ${
              activeTab === 'team'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Turnos del equipo
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {barbers.length}
            </span>
          </button>
        </nav>
      </div>

      {/* PESTAÑA 1: BLOQUEOS DE AGENDA */}
      {activeTab === 'blocks' && (
        <div className="space-y-5">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">En curso ahora</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {activeNowCount}
                  </p>
                  {activeNowCount > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Próximos bloqueos</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {blocks.filter((b) => isAfter(new Date(b.endTime), now)).length}
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Total registrados</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {blocks.length}
                </p>
              </div>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeFilter('upcoming')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  timeFilter === 'upcoming'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Próximos y activos
              </button>
              <button
                onClick={() => setTimeFilter('past')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  timeFilter === 'past'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Historial pasado
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  timeFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Todos los bloqueos
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="h-9 min-w-[170px]"
              >
                <option value="">Todas las sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>

              <Select
                value={barberFilter}
                onChange={(e) => setBarberFilter(e.target.value)}
                className="h-9 min-w-[170px]"
              >
                <option value="">Todos los barberos</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Listado de bloqueos */}
          {loadingBlocks ? (
            <PageLoader />
          ) : filteredBlocks.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBlocks.map((block) => {
                const s = new Date(block.startTime);
                const e = new Date(block.endTime);
                const isCurrent = isBefore(s, now) && isAfter(e, now);
                const isPast = isBefore(e, now);

                return (
                  <Card
                    key={block.id}
                    className={`relative overflow-hidden p-5 transition hover:shadow-md ${
                      isCurrent
                        ? 'border-amber-400 ring-1 ring-amber-400/50 dark:border-amber-500'
                        : isPast
                        ? 'opacity-65'
                        : ''
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 right-0 rounded-bl-xl bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        En curso
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                          {block.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {/* Alcance */}
                          {block.barber ? (
                            <Badge tone="purple" className="flex items-center gap-1">
                              <Avatar name={block.barber.name} size="xs" src={block.barber.photoUrl} />
                              {block.barber.name}
                            </Badge>
                          ) : block.branch ? (
                            <Badge tone="brand" className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {block.branch.name}
                            </Badge>
                          ) : (
                            <Badge tone="gray" className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Toda la barbería
                            </Badge>
                          )}

                          {block.isAllDay && <Badge tone="blue">Día completo</Badge>}
                        </div>
                      </div>
                    </div>

                    {/* Fecha y horarios */}
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                        <CalendarDays className="h-4 w-4 text-brand-500" />
                        <span>
                          {format(s, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>
                            {block.isAllDay
                              ? 'Todo el día'
                              : `${format(s, 'HH:mm')} – ${format(e, 'HH:mm')}`}
                          </span>
                        </div>
                        {!block.isAllDay && (
                          <span className="text-[11px] font-semibold text-slate-400">
                            {formatDistanceStrict(e, s, { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>

                    {block.reason && (
                      <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
                        “{block.reason}”
                      </p>
                    )}

                    {/* Botones de acción */}
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setBlockModal({
                            open: true,
                            editing: block,
                            defaultBarberId: '',
                            defaultBranchId: '',
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => setBlockToDelete(block)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Desbloquear
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Ban}
              title="No hay bloqueos registrados"
              description="Bloquea horarios por almuerzo, reuniones de equipo, mantenimiento o feriados para proteger la agenda."
              action={
                <Button
                  onClick={() =>
                    setBlockModal({
                      open: true,
                      editing: null,
                      defaultBarberId: '',
                      defaultBranchId: '',
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Crear primer bloqueo
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* PESTAÑA 2: REGLAS DE RESERVA */}
      {activeTab === 'rules' && (
        <form
          onSubmit={handleSubmitSettings((d) => updateSettingsMutation.mutate(d))}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Intervalo de Slots */}
            <Card>
              <CardHeader
                title="Intervalo entre citas (Slots)"
                subtitle="Frecuencia con la que se ofrecen los turnos de inicio en la reserva online"
              />
              <CardBody className="space-y-4">
                <Select {...registerSettings('slotIntervalMinutes')}>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-500">
                  Por ejemplo: Con intervalos de 15 minutos, los clientes verán turnos a las 10:00,
                  10:15, 10:30, etc. Con 30 min, se ofrecerán 10:00, 10:30, 11:00.
                </p>
              </CardBody>
            </Card>

            {/* Anticipación mínima */}
            <Card>
              <CardHeader
                title="Anticipación mínima para reservar"
                subtitle="Evita citas sorpresa agendadas de último segundo"
              />
              <CardBody className="space-y-4">
                <Select {...registerSettings('minAdvanceHours')}>
                  {MIN_ADVANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-500">
                  Si configuras 2 horas, un cliente no podrá reservar para las 14:00 si son las
                  13:00. Solo se ofrecerán horas a partir de las 15:00.
                </p>
              </CardBody>
            </Card>

            {/* Límite máximo a futuro */}
            <Card>
              <CardHeader
                title="Ventana máxima de reserva"
                subtitle="Hasta cuántos días hacia el futuro se permite agendar"
              />
              <CardBody className="space-y-4">
                <Select {...registerSettings('maxAdvanceDays')}>
                  {MAX_ADVANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-500">
                  Protege la agenda impidiendo que los clientes reserven con meses de antelación
                  cuando los horarios pueden cambiar.
                </p>
              </CardBody>
            </Card>

            {/* Tiempo de holgura / Buffer */}
            <Card>
              <CardHeader
                title="Tiempo de holgura entre citas (Buffer)"
                subtitle="Margen automático añadido después de cada servicio"
              />
              <CardBody className="space-y-4">
                <Select {...registerSettings('bufferMinutes')}>
                  {BUFFER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-500">
                  Tiempo destinado a limpieza, desinfección de navajas y herramientas, o cobro en
                  caja antes de que entre el siguiente cliente.
                </p>
              </CardBody>
            </Card>

            {/* Plazo para cancelación */}
            <Card className="md:col-span-2">
              <CardHeader
                title="Antelación requerida para cancelaciones"
                subtitle="Límite para que un cliente pueda cancelar su cita de forma autónoma"
              />
              <CardBody className="space-y-4">
                <div className="max-w-md">
                  <Select {...registerSettings('cancelAdvanceHours')}>
                    {CANCEL_ADVANCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <p className="text-xs text-slate-500">
                  Si un cliente intenta cancelar fuera de este plazo, el sistema le solicitará
                  comunicarse directamente por WhatsApp o teléfono con la barbería.
                </p>
              </CardBody>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              loading={updateSettingsMutation.isPending}
              disabled={!isAdmin}
            >
              <Save className="h-4 w-4" /> Guardar reglas de reserva
            </Button>
          </div>
        </form>
      )}

      {/* PESTAÑA 3: TURNOS DEL EQUIPO */}
      {activeTab === 'team' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {barbers.map((b) => {
              const activeCount = b.schedules?.filter((s) => s.isActive).length || 0;
              return (
                <Card key={b.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={b.name} src={b.photoUrl} size="lg" />
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                          {b.name}
                        </h3>
                        <p className="text-xs text-slate-500">{b.specialty || 'Barbero'}</p>
                        {b.branch && (
                          <Badge tone="gray" className="mt-1">
                            {b.branch.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge tone={activeCount > 0 ? 'green' : 'amber'}>
                      {activeCount} días laborables
                    </Badge>
                  </div>

                  {/* Calendario semanal resumido */}
                  <div className="mt-4 grid grid-cols-7 gap-1 rounded-xl bg-slate-50 p-2 text-center text-xs dark:bg-slate-800/60">
                    {WEEKDAY_NAMES.map((name, dayIndex) => {
                      const sched = b.schedules?.find(
                        (s) => s.weekday === dayIndex && s.isActive
                      );
                      return (
                        <div
                          key={name}
                          className={`flex flex-col items-center rounded-lg py-1.5 transition ${
                            sched
                              ? 'bg-white font-semibold text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                              : 'text-slate-400 opacity-60'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold">{name}</span>
                          <span className="mt-0.5 text-[9px]">
                            {sched ? `${sched.startTime}` : 'Libre'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setScheduleBarber(b)}
                    >
                      <CalendarClock className="h-4 w-4" /> Configurar turnos
                    </Button>
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() =>
                        setBlockModal({
                          open: true,
                          editing: null,
                          defaultBarberId: b.id,
                          defaultBranchId: b.branchId || '',
                        })
                      }
                    >
                      <Ban className="h-4 w-4" /> Bloquear barbero
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Bloqueo */}
      <BlockModal
        open={blockModal.open}
        editing={blockModal.editing}
        branches={branches}
        barbers={barbers}
        defaultBarberId={blockModal.defaultBarberId}
        defaultBranchId={blockModal.defaultBranchId}
        onClose={() =>
          setBlockModal({
            open: false,
            editing: null,
            defaultBarberId: '',
            defaultBranchId: '',
          })
        }
      />

      {/* Modal para Configurar Horario Semanal de Barbero */}
      {scheduleBarber && (
        <ScheduleModal
          open={!!scheduleBarber}
          barber={scheduleBarber}
          onClose={() => setScheduleBarber(null)}
        />
      )}

      {/* Diálogo de Confirmación para Desbloquear / Eliminar */}
      <ConfirmDialog
        open={!!blockToDelete}
        onClose={() => setBlockToDelete(null)}
        onConfirm={() => deleteMutation.mutate(blockToDelete.id)}
        loading={deleteMutation.isPending}
        title="Desbloquear horario"
        description={`¿Deseas eliminar el bloqueo "${blockToDelete?.title}"? Este horario volverá a estar disponible en la agenda.`}
        confirmText="Desbloquear"
      />
    </div>
  );
}
