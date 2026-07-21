import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Building2,
  Receipt,
  Award,
  Palette,
  Share2,
  Upload,
  Save,
  Loader2,
} from 'lucide-react';
import { settingsApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, PageLoader } from '@/components/ui/Misc';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

const CURRENCIES = [
  ['PEN', 'Sol peruano (S/)'],
  ['USD', 'Dólar (US$)'],
  ['MXN', 'Peso mexicano (MX$)'],
  ['COP', 'Peso colombiano (CO$)'],
  ['CLP', 'Peso chileno (CL$)'],
  ['ARS', 'Peso argentino (AR$)'],
  ['EUR', 'Euro (€)'],
];

export default function Settings() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch } = useForm();

  // Rellena el formulario cuando llegan los datos.
  useEffect(() => {
    if (!data) return;
    reset({
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      currency: data.settings.currency,
      taxRate: data.settings.taxRate,
      invoiceSeries: data.settings.invoiceSeries,
      primaryColor: data.settings.primaryColor,
      pointsPerCurrency: data.settings.pointsPerCurrency,
      pointsOnFirstVisit: data.settings.pointsOnFirstVisit,
      pointsOnBirthday: data.settings.pointsOnBirthday,
      pointsOnReferral: data.settings.pointsOnReferral,
      facebookUrl: data.settings.facebookUrl || '',
      instagramUrl: data.settings.instagramUrl || '',
      whatsappNumber: data.settings.whatsappNumber || '',
    });
  }, [data, reset]);

  // Refresca el tenant en el store (para el topbar: nombre, logo, color).
  const syncTenant = (fresh) => {
    setUser({
      ...user,
      tenant: {
        ...user?.tenant,
        name: fresh.name,
        logoUrl: fresh.logoUrl,
        primaryColor: fresh.settings.primaryColor,
        currency: fresh.settings.currency,
      },
    });
  };

  const save = useMutation({
    mutationFn: (values) => settingsApi.update(values),
    onSuccess: (res) => {
      qc.setQueryData(['settings'], res.data);
      syncTenant(res.data);
      toast.success('Configuración guardada');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await settingsApi.uploadLogo(file);
      qc.setQueryData(['settings'], res.data);
      syncTenant(res.data);
      toast.success('Logo actualizado');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (isLoading) return <PageLoader />;

  const color = watch('primaryColor');

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Personaliza tu negocio">
        <Button onClick={handleSubmit((v) => save.mutate(v))} loading={save.isPending}>
          <Save className="h-4 w-4" /> Guardar cambios
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Negocio + logo */}
        <Card>
          <CardHeader title="Negocio" subtitle="Datos e identidad" />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-7 w-7 text-slate-400" />
                )}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Subir logo
                </Button>
                <p className="mt-1 text-xs text-slate-400">PNG/JPG, máx. 5MB</p>
              </div>
            </div>
            <Input label="Nombre del negocio" {...register('name')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Teléfono" {...register('phone')} />
              <Input label="Correo" type="email" {...register('email')} />
            </div>
          </CardBody>
        </Card>

        {/* Facturación */}
        <Card>
          <CardHeader title="Facturación" subtitle="Moneda, impuesto y comprobantes" />
          <CardBody className="space-y-4">
            <Select label="Moneda" {...register('currency')}>
              {CURRENCIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Impuesto / IGV (%)" type="number" step="0.01" {...register('taxRate')} />
              <Input label="Serie de comprobante" {...register('invoiceSeries')} />
            </div>
          </CardBody>
        </Card>

        {/* Fidelización */}
        <Card>
          <CardHeader
            title="Fidelización"
            subtitle="Reglas del programa de puntos"
            action={<Award className="h-5 w-5 text-brand-500" />}
          />
          <CardBody className="space-y-4">
            <Input
              label="Puntos por unidad de moneda gastada"
              type="number"
              step="0.01"
              {...register('pointsPerCurrency')}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input label="1ª visita" type="number" {...register('pointsOnFirstVisit')} />
              <Input label="Cumpleaños" type="number" {...register('pointsOnBirthday')} />
              <Input label="Referido" type="number" {...register('pointsOnReferral')} />
            </div>
            <p className="text-xs text-slate-400">
              Ej: “2 puntos por sol” → una venta de S/ 50 otorga 100 puntos.
            </p>
          </CardBody>
        </Card>

        {/* Apariencia */}
        <Card>
          <CardHeader
            title="Apariencia"
            subtitle="Color principal de la marca"
            action={<Palette className="h-5 w-5 text-brand-500" />}
          />
          <CardBody>
            <div className="flex items-center gap-4">
              <input
                type="color"
                className="h-12 w-16 cursor-pointer rounded-xl border border-slate-300 dark:border-slate-700"
                {...register('primaryColor')}
              />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Color principal</p>
                <p className="text-xs text-slate-400">{color}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Redes sociales */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Redes y contacto"
            subtitle="Se muestran en tu portal de reservas"
            action={<Share2 className="h-5 w-5 text-brand-500" />}
          />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Facebook" placeholder="https://facebook.com/..." {...register('facebookUrl')} />
            <Input label="Instagram" placeholder="https://instagram.com/..." {...register('instagramUrl')} />
            <Input label="WhatsApp" placeholder="+51 999 999 999" {...register('whatsappNumber')} />
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
