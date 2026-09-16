import { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '../lib/api.js';

/**
 * Charge et manipule la liste des evenements de l'organisateur (CDC §5.2).
 * Expose les quatre etats exiges par le CDC §8.2 : loading, error, empty, data.
 */
export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { events: list } = await eventsApi.list();
      setEvents(list);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /** Cree un evenement et l'insere localement sans recharger toute la liste. */
  const createEvent = useCallback(async (data) => {
    const { event } = await eventsApi.create(data);
    setEvents((current) =>
      [...current, event].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
    );
    return event;
  }, []);

  const updateEvent = useCallback(async (id, data) => {
    const { event } = await eventsApi.update(id, data);
    setEvents((current) => current.map((item) => (item.id === id ? { ...item, ...event } : item)));
    return event;
  }, []);

  const deleteEvent = useCallback(async (id) => {
    const result = await eventsApi.remove(id);
    setEvents((current) => current.filter((item) => item.id !== id));
    return result;
  }, []);

  return {
    events,
    loading,
    error,
    isEmpty: !loading && !error && events.length === 0,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
