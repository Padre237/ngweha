import { useCallback, useEffect, useState } from 'react';

/**
 * Charge les donnees de la Guest Page depuis /api/invite/:token (CDC §6.2).
 *
 * Volontairement construit sur fetch nu, sans le SDK Firebase : cet ecran doit
 * rester le plus leger possible sur une connexion 3G faible (CDC §9.1).
 */
export function useInvite(token) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await fetch(`/api/invite/${token}`);

      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) {
        throw new Error('Chargement impossible.');
      }

      setData(await response.json());
    } catch {
      setError('Connexion impossible. Verifiez votre reseau puis reessayez.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  /** Enregistre la reponse RSVP et met a jour l'etat local (CDC §6.3). */
  const respondRsvp = useCallback(
    async (rsvpStatus) => {
      const response = await fetch(`/api/invite/${token}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvpStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Reponse impossible a enregistrer.');
      }

      setData((current) =>
        current ? { ...current, guest: { ...current.guest, rsvpStatus } } : current
      );
    },
    [token]
  );

  return { data, loading, notFound, error, reload: load, respondRsvp };
}
