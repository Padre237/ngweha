import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveEvent } from '../../hooks/useActiveEvent.jsx';
import { useEvents } from '../../hooks/useEvents.js';
import { formatShortDate } from '../../lib/utils.js';

/**
 * Selecteur d'evenement actif de la sidebar (CDC §5.1).
 * Le badge orange « Evenement actif » annonce le mariage sur lequel portent
 * toutes les pages admin.
 */
export default function EventPicker({ onNavigate }) {
  const navigate = useNavigate();
  const { activeEvent, activeEventId, selectEvent } = useActiveEvent();
  const { events, loading } = useEvents();

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Ferme le menu au clic exterieur et a la touche Echap
  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSelect(id) {
    selectEvent(id);
    setOpen(false);
    onNavigate?.();
    navigate('/dashboard');
  }

  return (
    <div className="wp-event-picker" ref={containerRef}>
      <button
        type="button"
        className="wp-event-picker__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span style={{ minWidth: 0 }}>
          <span className="wp-event-picker__badge">
            {activeEvent ? 'Evenement actif' : 'Aucun evenement'}
          </span>
          <span className="wp-event-picker__name">
            {activeEvent
              ? `${activeEvent.groomName} & ${activeEvent.brideName}`
              : 'Choisir un evenement'}
          </span>
          {activeEvent && (
            <span className="wp-event-picker__date">{formatShortDate(activeEvent.eventDate)}</span>
          )}
        </span>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="wp-event-picker__menu" role="listbox">
          {loading && (
            <p className="wp-event-picker__option-meta" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
              Chargement…
            </p>
          )}

          {!loading && events.length === 0 && (
            <p className="wp-event-picker__option-meta" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
              Aucun evenement pour l'instant.
            </p>
          )}

          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              role="option"
              aria-selected={event.id === activeEventId}
              className={`wp-event-picker__option${
                event.id === activeEventId ? ' wp-event-picker__option--active' : ''
              }`}
              onClick={() => handleSelect(event.id)}
            >
              <span className="wp-event-picker__option-name">
                {event.groomName} &amp; {event.brideName}
              </span>
              <span className="wp-event-picker__option-meta">
                {formatShortDate(event.eventDate)} · {event.guestsCount ?? 0} invites
              </span>
            </button>
          ))}

          <button
            type="button"
            className="wp-event-picker__option"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              navigate('/events');
            }}
          >
            <span className="wp-event-picker__option-name">Voir tous les evenements</span>
          </button>
        </div>
      )}
    </div>
  );
}
