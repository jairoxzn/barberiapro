import { cn } from '@/utils/cn';

const tones = {
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
};

export function Badge({ tone = 'gray', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// Mapeo de estados de cita a color + etiqueta.
export const APPOINTMENT_STATUS = {
  RESERVED: { label: 'Reservada', tone: 'blue' },
  CONFIRMED: { label: 'Confirmada', tone: 'brand' },
  COMPLETED: { label: 'Finalizada', tone: 'green' },
  CANCELLED: { label: 'Cancelada', tone: 'red' },
  NO_SHOW: { label: 'No asistió', tone: 'amber' },
  RESCHEDULED: { label: 'Reprogramada', tone: 'purple' },
};

export const TIER = {
  BRONZE: { label: 'Bronce', tone: 'amber' },
  SILVER: { label: 'Plata', tone: 'gray' },
  GOLD: { label: 'Oro', tone: 'amber' },
  PLATINUM: { label: 'Platino', tone: 'blue' },
  DIAMOND: { label: 'Diamante', tone: 'purple' },
};
