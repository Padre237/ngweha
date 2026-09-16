import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import EventFormModal from '../components/events/EventFormModal.jsx';
import DeleteEventModal from '../components/events/DeleteEventModal.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  SkeletonList,
  useToast,
} from '../components/ui/index.js';
import { useEvents } from '../hooks/useEvents.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { EVENT_LABELS } from '../lib/constants.js';
import { formatEventDate } from '../lib/utils.js';
import '../styles/events.css';

/** Petite icone de metadonnee pour les cards d'evenement. */
function MetaIcon({ path }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** Page d'accueil apres connexion : grille des evenements (CDC §5.2). */
export default function EventsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectEvent, activeEventId, clearEvent } = useActiveEvent();
  const { events, loading, error, isEmpty, refetch, createEvent, updateEvent, deleteEvent } =
    useEvents();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);

  /** Selectionne l'evenement comme actif puis ouvre le dashboard (CDC §5.2). */
  function handleManage(event) {
    selectEvent(event.id);
    navigate('/dashboard');
  }

  async function handleSubmit(data) {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
      toast.success('Evenement modifie', `${data.groomName} & ${data.brideName}`);
      return;
    }

    const created = await createEvent(data);
    toast.success('Evenement cree', `${created.groomName} & ${created.brideName}`);
    selectEvent(created.id);
  }

  async function handleDelete(event) {
    const { deleted } = await deleteEvent(event.id);

    // L'evenement supprime ne doit plus rester selectionne dans la sidebar
    if (activeEventId === event.id) clearEvent();

    toast.success(
      'Evenement supprime',
      `${deleted.guests} invites, ${deleted.photos} photos et ${deleted.messages} messages effaces.`
    );
  }

  function openCreateForm() {
    setEditingEvent(null);
    setFormOpen(true);
  }

  function openEditForm(event) {
    setEditingEvent(event);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Mes evenements"
        subtitle="Selectionnez un mariage pour acceder a son espace de gestion."
        actions={<Button onClick={openCreateForm}>Creer un evenement</Button>}
      />

      {loading && <SkeletonList rows={3} height={200} />}

      {error && <ErrorState description={error} onRetry={refetch} />}

      {isEmpty && (
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement pour l'instant"
            description="Creez votre premier mariage pour commencer a inviter vos convives."
            action={<Button onClick={openCreateForm}>Creer un evenement</Button>}
          />
        </Card>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="wp-events__grid">
          {events.map((event) => (
            <Card key={event.id} variant="elevated" stat className="wp-event-card">
              <div className="wp-event-card__head">
                <h2 className="wp-event-card__names">
                  {event.groomName} &amp; {event.brideName}
                </h2>
                <Badge status={event.status} dot>
                  {EVENT_LABELS[event.status] || event.status}
                </Badge>
              </div>

              <div className="wp-event-card__meta">
                <span className="wp-event-card__meta-row">
                  <MetaIcon path="M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                  {formatEventDate(event.eventDate)}
                </span>
                <span className="wp-event-card__meta-row">
                  <MetaIcon path="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                  {event.venue}
                </span>
              </div>

              <ProgressBar
                label="Invites"
                value={event.guestsCount ?? 0}
                total={event.maxGuests ?? 0}
              />

              <div className="wp-event-card__actions">
                <Button size="sm" onClick={() => handleManage(event)}>
                  Gerer
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openEditForm(event)}>
                  Modifier
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeletingEvent(event)}>
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        event={editingEvent}
      />

      <DeleteEventModal
        open={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleDelete}
        event={deletingEvent}
      />
    </>
  );
}
