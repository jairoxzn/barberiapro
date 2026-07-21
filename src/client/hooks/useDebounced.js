import { useEffect, useState } from 'react';

// Devuelve el valor tras `delay` ms sin cambios (útil para búsquedas).
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
