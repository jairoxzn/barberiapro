import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Link2,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  QrCode,
  Share2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, EmptyState } from '@/components/ui/Misc';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ShareBooking() {
  const user = useAuthStore((s) => s.user);
  const slug = user?.tenant?.slug;
  const shopName = user?.tenant?.name || 'tu barbería';
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  if (!slug) {
    return (
      <EmptyState
        icon={Link2}
        title="Enlace no disponible"
        description="No se pudo determinar el enlace de tu barbería."
      />
    );
  }

  const url = `${window.location.origin}/reservar/${slug}`;
  const waText = encodeURIComponent(
    `¡Hola! Reserva tu cita en ${shopName} de forma rápida aquí 👉 ${url}`
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `reservas-${slug}.png`;
    a.click();
    toast.success('QR descargado');
  };

  return (
    <div>
      <PageHeader
        title="Reservas online"
        subtitle="Comparte tu enlace para que tus clientes reserven solos"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Enlace + acciones */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Tu enlace de reservas" subtitle="Cualquiera con este enlace puede registrarse y reservar" />
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate text-sm text-slate-700 dark:text-slate-200">{url}</span>
                </div>
                <Button onClick={copy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button as="a" href={url} target="_blank" rel="noreferrer" variant="secondary">
                  <ExternalLink className="h-4 w-4" /> Abrir portal
                </Button>
                <Button
                  as="a"
                  href={`https://wa.me/?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  className="!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50 dark:!border-emerald-500/30 dark:!text-emerald-300"
                >
                  <MessageCircle className="h-4 w-4" /> Compartir por WhatsApp
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="¿Cómo usarlo?" action={<Share2 className="h-5 w-5 text-brand-500" />} />
            <CardBody>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {[
                  'Pon el enlace en la bio de tu Instagram, Facebook o WhatsApp Business.',
                  'Imprime el código QR y colócalo en el mostrador o la vitrina.',
                  'Envíalo por WhatsApp a tus clientes frecuentes.',
                  'El cliente crea su cuenta, elige servicio, barbero y hora, y reserva solo.',
                ].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        {/* QR */}
        <Card className="h-fit">
          <CardHeader title="Código QR" action={<QrCode className="h-5 w-5 text-brand-500" />} />
          <CardBody className="flex flex-col items-center">
            <div ref={qrRef} className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeCanvas value={url} size={200} level="M" includeMargin />
            </div>
            <p className="mt-3 text-center text-sm font-medium text-slate-700 dark:text-slate-200">
              {shopName}
            </p>
            <p className="text-center text-xs text-slate-400">Escanea para reservar</p>
            <Button onClick={downloadQR} variant="secondary" className="mt-4 w-full">
              <Download className="h-4 w-4" /> Descargar QR
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
