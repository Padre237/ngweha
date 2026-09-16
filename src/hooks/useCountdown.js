import { useEffect, useState } from 'react';
import { getCountdown } from '../lib/utils.js';

/**
 * Compte a rebours temps reel jusqu'a la date du mariage (CDC §5.3).
 * Se met a jour chaque seconde et s'arrete une fois la date passee.
 */
export function useCountdown(targetDate) {
  const [countdown, setCountdown] = useState(() => getCountdown(targetDate));

  useEffect(() => {
    setCountdown(getCountdown(targetDate));

    // Inutile de continuer a compter une fois l'echeance franchie
    if (getCountdown(targetDate).isPast) return undefined;

    const timer = setInterval(() => {
      const next = getCountdown(targetDate);
      setCountdown(next);
      if (next.isPast) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return countdown;
}
