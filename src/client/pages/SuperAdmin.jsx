import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  LogIn,
  Power,
  ShieldCheck,
  Scissors,
  CheckCircle2,
  XCircle,
  Eye,
  Phone,
  Mail,
  Clock,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { superadminApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageLoader } from '@/components/ui/Misc';
import { formatCurrency } from '@/utils/format';

export default function SuperAdmin() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentUser = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, suspended
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [toggleConfirm, setToggleConfirm] = useState(null);

  // Queries
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['superadmin-metrics'],
    queryFn: superadminApi.metrics,
  });

  const { data: tenantsResult, isLoading: loadingTenants, refetch: refetchTenants } = useQuery({
    queryKey: ['superadmin-tenants', search, statusFilter],
    queryFn: () => superadminApi.listTenants({ search, status: statusFilter }),
  });

  const tenants = tenantsResult?.data || [];
  const meta = tenantsResult?.meta || {};

  // Form para crear barbería
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      currency: 'PEN',
    },
  });

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: superadminApi.createTenant,
    onSuccess: () => {
      toast.success('¡Barbería registrada exitosamente en la plataforma!');
      qc.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      qc.invalidateQueries({ queryKey: ['superadmin-metrics'] });
      setCreateModal(false);
      reset();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => superadminApi.toggleStatus(id, isActive),
    onSuccess: (data) => {
      const msg = data.isActive
        ? 'Barbería reactivada exitosamente'
        : 'Barbería suspendida. No podrá acceder ni recibir citas.';
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      qc.invalidateQueries({ queryKey: ['superadmin-metrics'] });
      setToggleConfirm(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  // Impersonar / Modo soporte técnico
  const handleImpersonate = async (tenant) => {
    try {
      toast.loading('Iniciando sesión de soporte...', { id: 'impersonate' });
      const session = await superadminApi.impersonate(tenant.id);
      
      // Guardar sesión del super admin para poder volver
      sessionStorage.setItem(
        'saas_impersonation',
        JSON.stringify({
          token: useAuthStore.getState().accessToken,
          user: currentUser,
        })
      );

      // Iniciar sesión como el admin de la barbería
      setAuth({
        accessToken: session.accessToken,
        user: session.user,
      });

      toast.success(`Conectado a ${tenant.name} en Modo Soporte`, { id: 'impersonate' });
      window.location.href = '/';
    } catch (e) {
      toast.error(errMsg(e), { id: 'impersonate' });
    }
  };

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchTenants();
    toast.success('Datos actualizados');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Panel SaaS Master
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Supervisión global de todas las barberías clientes, rendimiento y soporte de la plataforma.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleRefreshAll} title="Refrescar datos">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateModal(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="h-4 w-4" />
            Nueva Barbería
          </Button>
        </div>
      </div>

      {/* Métricas Globales del SaaS */}
      {loadingMetrics ? (
        <div className="flex h-32 items-center justify-center card p-6">
          <PageLoader />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Barberías */}
          <div className="card p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Barberías Registradas
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {metrics?.totalTenants ?? 0}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {metrics?.activeTenants ?? 0} activas
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="flex items-center gap-1 font-semibold text-rose-500">
                    <XCircle className="h-3.5 w-3.5" />
                    {metrics?.suspendedTenants ?? 0} susp.
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
            {metrics?.newTenantsThisMonth > 0 && (
              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{metrics.newTenantsThisMonth} barberías en los últimos 30 días</span>
              </div>
            )}
          </div>

          {/* Card 2: Ventas Totales en Plataforma */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Ventas Procesadas (Red)
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(metrics?.totalRevenue ?? 0, 'PEN')}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {metrics?.paidSalesCount ?? 0} tickets de venta cobrados
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card 3: Barberos en la Plataforma */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Barberos
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {metrics?.totalBarbers ?? 0}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {metrics?.totalClients ?? 0} clientes atendidos
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Scissors className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card 4: Citas en la Plataforma */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Citas Agendadas
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {metrics?.totalAppointments ?? 0}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  En toda la red BarberíaPro
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Directorio de Barberías */}
      <div className="card">
        {/* Barra de Filtros y Búsqueda */}
        <div className="border-b border-slate-100 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por barbería, slug, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 sm:mt-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Todas ({metrics?.totalTenants ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
              }`}
            >
              Activas ({metrics?.activeTenants ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
              }`}
            >
              Suspendidas ({metrics?.suspendedTenants ?? 0})
            </button>
          </div>
        </div>

        {/* Tabla de Barberías */}
        {loadingTenants ? (
          <div className="flex h-64 items-center justify-center p-8">
            <PageLoader />
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-white">
              No se encontraron barberías
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'Prueba ajustando los términos de búsqueda.'
                : 'Aún no hay barberías con el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="px-5 py-3.5">Barbería</th>
                  <th className="px-5 py-3.5">Admin / Contacto</th>
                  <th className="px-5 py-3.5">Capacidad</th>
                  <th className="px-5 py-3.5">Ventas / Citas</th>
                  <th className="px-5 py-3.5">Registro</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tenants.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                    {/* Barbería y slug */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 font-bold text-white shadow-sm">
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {t.name}
                          </p>
                          <a
                            href={`/reservar/${t.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                            title="Abrir portal público de reservas"
                          >
                            <span>/reservar/{t.slug}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Admin / Contacto */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {t.admin?.name || 'Sin admin'}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail className="h-3 w-3" />
                          {t.email || t.admin?.email || 'Sin correo'}
                        </p>
                        {t.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Phone className="h-3 w-3" />
                            {t.phone}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Capacidad: Sucursales y barberos */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {t.branchesCount} {t.branchesCount === 1 ? 'sucursal' : 'sucursales'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Scissors className="h-3.5 w-3.5 text-slate-400" />
                          {t.barbersCount} {t.barbersCount === 1 ? 'barbero' : 'barberos'}
                        </span>
                      </div>
                    </td>

                    {/* Ventas y Citas */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(t.totalSales, t.currency)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t.appointmentsCount} citas agendadas
                        </p>
                      </div>
                    </td>

                    {/* Fecha de Registro */}
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-4">
                      <Badge tone={t.isActive ? 'green' : 'red'}>
                        {t.isActive ? 'Activa' : 'Suspendida'}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botón Ver Detalle */}
                        <button
                          onClick={() => setDetailModal(t.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Ver detalles completos de la barbería"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Botón Entrar / Modo Soporte */}
                        <button
                          onClick={() => handleImpersonate(t)}
                          className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                          title="Entrar como administrador de esta barbería (Modo Soporte)"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Entrar</span>
                        </button>

                        {/* Botón Suspender / Reactivar */}
                        <button
                          onClick={() => setToggleConfirm(t)}
                          className={`rounded-lg p-1.5 transition ${
                            t.isActive
                              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                          }`}
                          title={t.isActive ? 'Suspender barbería' : 'Reactivar barbería'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Nueva Barbería */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Registrar Nueva Barbería en el SaaS"
        size="lg"
      >
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <p className="text-xs text-slate-500">
            Crea una nueva barbería directamente. Se creará su espacio aislado, sucursal principal y credenciales para el dueño.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre de la Barbería *"
              placeholder="Ej: Barbería Golden Cut"
              error={errors.businessName?.message}
              {...register('businessName', { required: 'Nombre del negocio requerido' })}
            />
            <Input
              label="Nombre del Dueño / Admin *"
              placeholder="Ej: Juan Carlos Pérez"
              error={errors.name?.message}
              {...register('name', { required: 'Nombre del administrador requerido' })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Correo Electrónico (Login) *"
              type="email"
              placeholder="admin@barberia.com"
              error={errors.email?.message}
              {...register('email', { required: 'Correo requerido' })}
            />
            <Input
              label="Contraseña Inicial *"
              type="password"
              placeholder="Mínimo 6 caracteres"
              error={errors.password?.message}
              {...register('password', {
                required: 'Contraseña requerida',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono / WhatsApp"
              placeholder="+51 987 654 321"
              {...register('phone')}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Moneda de Operación
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...register('currency')}
              >
                <option value="PEN">Soles (PEN - S/)</option>
                <option value="USD">Dólares (USD - $)</option>
                <option value="COP">Pesos Colombianos (COP)</option>
                <option value="MXN">Pesos Mexicanos (MXN)</option>
                <option value="EUR">Euros (EUR - €)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModal(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              Crear Barbería
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalle de Barbería */}
      {detailModal && (
        <TenantDetailModal
          tenantId={detailModal}
          onClose={() => setDetailModal(null)}
          onImpersonate={(tenant) => {
            setDetailModal(null);
            handleImpersonate(tenant);
          }}
        />
      )}

      {/* Diálogo Confirmación: Suspender / Reactivar */}
      {toggleConfirm && (
        <ConfirmDialog
          open={true}
          onClose={() => setToggleConfirm(null)}
          onConfirm={() =>
            toggleStatusMutation.mutate({
              id: toggleConfirm.id,
              isActive: !toggleConfirm.isActive,
            })
          }
          loading={toggleStatusMutation.isPending}
          danger={toggleConfirm.isActive}
          title={
            toggleConfirm.isActive
              ? `¿Suspender ${toggleConfirm.name}?`
              : `¿Reactivar ${toggleConfirm.name}?`
          }
          description={
            toggleConfirm.isActive
              ? 'Al suspender esta barbería, sus usuarios no podrán ingresar al sistema ni sus clientes podrán realizar reservas online hasta que la reactives.'
              : 'La barbería volverá a estar disponible inmediatamente para sus administradores y reservas online.'
          }
          confirmText={toggleConfirm.isActive ? 'Sí, suspender' : 'Sí, reactivar'}
        />
      )}
    </div>
  );
}

// Subcomponente: Modal de Detalle Completo de una Barbería
function TenantDetailModal({ tenantId, onClose, onImpersonate }) {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['superadmin-tenant-detail', tenantId],
    queryFn: () => superadminApi.getTenant(tenantId),
  });

  return (
    <Modal open={true} onClose={onClose} title="Detalle de la Barbería" size="lg">
      {isLoading || !tenant ? (
        <div className="flex h-64 items-center justify-center">
          <PageLoader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header del Tenant */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 font-extrabold text-white text-lg">
                {tenant.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {tenant.name}
                </h4>
                <p className="text-xs text-slate-500">
                  ID: <span className="font-mono">{tenant.id}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={tenant.isActive ? 'green' : 'red'}>
                {tenant.isActive ? 'Activa' : 'Suspendida'}
              </Badge>
              <Button
                size="sm"
                onClick={() => onImpersonate(tenant)}
                className="gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Entrar (Soporte)</span>
              </Button>
            </div>
          </div>

          {/* Estadísticas Clave */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 p-3 text-center dark:border-slate-800">
              <p className="text-xs text-slate-400">Ventas Totales</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {formatCurrency(tenant.totalSales, tenant.settings?.currency || 'PEN')}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3 text-center dark:border-slate-800">
              <p className="text-xs text-slate-400">Citas</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {tenant._count?.appointments ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3 text-center dark:border-slate-800">
              <p className="text-xs text-slate-400">Clientes</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {tenant._count?.clients ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3 text-center dark:border-slate-800">
              <p className="text-xs text-slate-400">Productos</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {tenant._count?.products ?? 0}
              </p>
            </div>
          </div>

          {/* Sucursales */}
          <div>
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Sucursales ({tenant.branches?.length || 0})
            </h5>
            <div className="space-y-2">
              {tenant.branches?.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {b.name}
                      </p>
                      {b.address && (
                        <p className="text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {b.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge tone={b.isActive ? 'green' : 'gray'}>
                    {b.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Barberos */}
          <div>
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Barberos ({tenant.barbers?.length || 0})
            </h5>
            <div className="grid gap-2 sm:grid-cols-2">
              {tenant.barbers?.map((barber) => (
                <div
                  key={barber.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs dark:border-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {barber.name}
                    </p>
                    <p className="text-slate-400">{barber.specialty || 'General'}</p>
                  </div>
                  <span className="font-mono text-slate-500">
                    {Number(barber.commissionRate)}% com.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Usuarios del Staff */}
          <div>
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Personal con Acceso ({tenant.users?.length || 0})
            </h5>
            <div className="space-y-2">
              {tenant.users?.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-xs dark:border-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {u.name}
                    </p>
                    <p className="text-slate-400">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone="brand">{u.role}</Badge>
                    {u.lastLoginAt && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Último login: {new Date(u.lastLoginAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
