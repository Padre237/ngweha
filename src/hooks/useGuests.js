import { useCallback, useEffect, useState } from 'react';
import { guestsApi } from '../lib/api.js';

/**
 * Charge et manipule les invites de l'evenement actif (CDC §5.4).
 * Expose loading, error, empty et data, comme l'exige le CDC §8.2.
 */
export function useGuests(eventId) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState(null);

  const fetchGuests = useCallback(async () => {
    if (!eventId) {
      setGuests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { guests: list } = await guestsApi.list(eventId);
      setGuests(list);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  /** Reinsere l'invite en conservant le tri alphabetique du serveur. */
  const sortByName = (list) =>
    [...list].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'fr'));

  const createGuest = useCallback(
    async (data) => {
      const { guest } = await guestsApi.create(eventId, data);
      setGuests((current) => sortByName([...current, guest]));
      return guest;
    },
    [eventId]
  );

  const updateGuest = useCallback(
    async (guestId, data) => {
      const { guest } = await guestsApi.update(eventId, guestId, data);
      setGuests((current) =>
        sortByName(current.map((item) => (item.id === guestId ? guest : item)))
      );
      return guest;
    },
    [eventId]
  );

  const deleteGuest = useCallback(
    async (guestId) => {
      await guestsApi.remove(eventId, guestId);
      setGuests((current) => current.filter((item) => item.id !== guestId));
    },
    [eventId]
  );

  return {
    guests,
    loading,
    error,
    isEmpty: !loading && !error && guests.length === 0,
    refetch: fetchGuests,
    createGuest,
    updateGuest,
    deleteGuest,
  };
}
