import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Wallet,
  Package,
  Boxes,
  Users,
  FileText,
  FileSpreadsheet,
  FileDown,
  Calendar,
} from 'lucide-react';
import { reportApi, branchApi } from '@/services';
import { errMsg } from '@/lib/axios';
import { PageHeader, PageLoader, EmptyState } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

const REPORTS = [
  { key: 'sales', label: 'Ventas', icon: BarChart3, desc: 'Ventas por período y método de pago' },
  { key: 'commissions', label: 'Comisiones', icon: Users, desc: 'Comisiones por barbero' },
  { key: 'products', label: 'Productos', icon: Package, desc: 'Productos más vendidos' },
  { key: 'inventory', label: 'Inventario', icon: Boxes, desc: 'Inventario valorizado' },
  { key: 'cash', label: 'Caja', icon: Wallet, desc: 'Arqueos y sesiones de caja' },
];

// Primer día del mes actual e "hoy", en formato yyyy-mm-dd.
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const fmtCell = (value, type) => {
  if (value === '' || value == null) return '—';
  if (type === 'money') return `S/ ${Number(value).toFixed(2)}`;
  if (type === 'date') return new Date(value).toLocaleString('es-PE');
  return String(value);
};

export default function Reports() {
  const [type, setType] = useState('sales');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [branchId, setBranchId] = useState('');
  const [downloading, setDownloading] = useState(null);

  const dateless = type === 'inventory'; // el inventario es una foto actual
  const params = {
    ...(dateless ? {} : { from, to }),
    ...(branchId ? { branchId } : {}),
  };

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.list().then((r) => r.data),
  });

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['report', type, params],
    queryFn: () => reportApi.data(type, params).then((r) => r.data),
  });

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      await reportApi.download(type, format, params);
      toast.success(`Descargando ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Analiza y exporta la información de tu negocio" />

      {/* Selector de reporte */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setType(r.key)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition',
              type === r.key
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                type === r.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              )}
            >
              <r.icon className="h-4 w-4" />
            </div>
            <div>
              <p className={cn('text-sm font-semibold', type === r.key ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200')}>
                {r.label}
              </p>
              <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{r.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtros + exportación */}
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {!dateless && (
              <>
                <div>
                  <label className="label flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Desde</label>
                  <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="label">Hasta</label>
                  <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </>
            )}
            <Select label="Sucursal" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleDownload('csv')} loading={downloading === 'csv'}>
              <FileDown className="h-4 w-4" /> CSV
            </Button>
            <Button variant="secondary" onClick={() => handleDownload('xlsx')} loading={downloading === 'xlsx'}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="secondary" onClick={() => handleDownload('pdf')} loading={downloading === 'pdf'}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <EmptyState icon={FileText} title="No se pudo cargar el reporte" description={errMsg(error)} />
      ) : (
        <>
          {/* Tarjetas de resumen */}
          {report.summary?.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {report.summary.map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {typeof s.value === 'number' && !Number.isInteger(s.value)
                      ? `S/ ${s.value.toFixed(2)}`
                      : s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tabla */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="font-semibold">{report.title}</h3>
              <p className="text-sm text-slate-500">{report.subtitle}</p>
            </div>
            {report.rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 dark:border-slate-800">
                      {report.columns.map((c) => (
                        <th key={c.key} className={cn('px-4 py-3', c.align === 'right' ? 'text-right' : 'text-left')}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40">
                        {report.columns.map((c) => (
                          <td
                            key={c.key}
                            className={cn(
                              'px-4 py-2.5',
                              c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                              c.type === 'money' && 'font-medium'
                            )}
                          >
                            {fmtCell(row[c.key], c.type)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={FileText} title="Sin datos en este período" description="Ajusta el rango de fechas o la sucursal." />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
