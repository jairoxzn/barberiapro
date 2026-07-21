// Utilidades de tiempo para la agenda.
// Nota: se asume que el servidor y la barbería comparten zona horaria
// (define TZ=America/Lima en el entorno de producción). Ver README.

export const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes();

export const hhmmToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60_000);

export const weekday = (date) => date.getDay(); // 0=domingo ... 6=sábado

// Rango [start, end) del día de una fecha.
export const dayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

// ¿Se solapan los intervalos [aStart,aEnd) y [bStart,bEnd)?
export const overlaps = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && aEnd > bStart;
