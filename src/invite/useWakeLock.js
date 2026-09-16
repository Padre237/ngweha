import { useEffect } from 'react';

/**
 * Maintient l'ecran allume tant que le QR est affiche le jour J (CDC §6.4).
 * L'API Screen Wake Lock n'existe pas partout : l'absence est sans consequence.
 */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return undefined;
    }

    let sentinel = null;
    let released = false;

    async function request() {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Refuse par le navigateur, batterie faible, ou onglet en arriere-plan
      }
    }

    // Le verrou saute quand l'onglet passe en arriere-plan : on le reprend au retour
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !released) request();
    }

    request();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinel?.release?.().catch(() => {});
    };
  }, [active]);
}
