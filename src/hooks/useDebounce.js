import { useEffect, useState } from 'react';

/**
 * Retarde la propagation d'une valeur — utilise sur les champs de recherche
 * pour eviter un filtrage a chaque frappe (CDC §9.2, 300ms).
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
