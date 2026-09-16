import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { eventsApi } from '../lib/api.js';
import { useAuth } from './useAuth.jsx';

const ActiveEventContext = createContext(null);

/**
 * Identifiant de l'evenement selectionne dans la sidebar.
 *
 * Stocke en localStorage : c'est une preference d'interface, pas une donnee
 * metier — celles-ci restent exclusivement dans Firestore (CDC §10.1). Le
 * contenu de l'evenement est toujours relu depuis l'API.
 */
const ACTIVE_EVENT_KEY = 'wp:active-event-id';

function readStoredId() {
  try {
    return window.localStorage.getItem(ACTIVE_EVENT_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredId(id) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_EVENT_KEY, id);
    else window.localStorage.removeItem(ACTIVE_EVENT_KEY);
  } catch {
    // Navigation privee : la selection ne survivra pas au rechargement
  }
}

/**
 * Rend l'evenement actif disponible a toutes les pages admin (CDC §5.1).
 * Toutes les pages admin operent sur cet evenement.
 */
export function ActiveEventProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [activeEventId, setActiveEventId] = useState(readStoredId);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(Boolean(readStoredId()));
  const [error, setError] = useState(null);

  // Recharge l'evenement actif a chaque changement de selection
  useEffect(() => {
    if (!isAuthenticated || !activeEventId) {
      setActiveEvent(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    eventsApi
      .get(activeEventId)
      .then(({ event }) => {
        if (!cancelled) setActiveEvent(event);
      })
      .catch((caught) => {
        if (cancelled) return;
        // Evenement supprime ou appartenant a un autre compte : on purge la selection
        if (caught.status === 404 || caught.status === 403) {
          writeStoredId(null);
          setActiveEventId(null);
          setActiveEvent(null);
        } else {
          setError(caught.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeEventId, isAuthenticated]);

  const selectEvent = useCallback((id) => {
    writeStoredId(id);
    setActiveEventId(id);
  }, []);

  const clearEvent = useCallback(() => {
    writeStoredId(null);
    setActiveEventId(null);
    setActiveEvent(null);
  }, []);

  /** Applique une mise a jour locale apres modification depuis une page admin. */
  const patchActiveEvent = useCallback((patch) => {
    setActiveEvent((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({
      activeEventId,
      activeEvent,
      loading,
      error,
      hasActiveEvent: Boolean(activeEvent),
      selectEvent,
      clearEvent,
      patchActiveEvent,
    }),
    [activeEventId, activeEvent, loading, error, selectEvent, clearEvent, patchActiveEvent]
  );

  return <ActiveEventContext.Provider value={value}>{children}</ActiveEventContext.Provider>;
}

export function useActiveEvent() {
  const context = useContext(ActiveEventContext);
  if (!context) {
    throw new Error('useActiveEvent doit etre utilise a l\'interieur de <ActiveEventProvider>.');
  }
  return context;
}
