import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const toDate = (d) => (typeof d === 'string' ? parseISO(d) : d);

export const money = (value, currency = 'PEN') =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const fDate = (d, pattern = "dd MMM yyyy") =>
  d ? format(toDate(d), pattern, { locale: es }) : '—';

export const fDateTime = (d) =>
  d ? format(toDate(d), "dd MMM yyyy, HH:mm", { locale: es }) : '—';

export const fTime = (d) => (d ? format(toDate(d), 'HH:mm') : '—');

export const fromNow = (d) =>
  d ? formatDistanceToNow(toDate(d), { locale: es, addSuffix: true }) : '—';

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
