import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal } from '../ui/index.js';
import { toDate } from '../../lib/utils.js';
import '../../styles/events.css';

/** Formate une date pour un <input type="datetime-local">. */
function toDateTimeLocal(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const EMPTY_FORM = {
  groomName: '',
  brideName: '',
  eventDate: '',
  venue: '',
  venueAddress: '',
  maxGuests: '100',
  tablesCount: '10',
  seatsPerTable: '10',
};

/**
 * Modal de creation et d'edition d'un evenement (CDC §5.2).
 * Les champs couvrent les informations de base; le programme et le dress code
 * se reglent dans /settings.
 */
export default function EventFormModal({ open, onClose, onSubmit, event = null }) {
  const isEditing = Boolean(event);

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-hydrate le formulaire a chaque ouverture
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      event
        ? {
            groomName: event.groomName || '',
            brideName: event.brideName || '',
            eventDate: toDateTimeLocal(event.eventDate),
            venue: event.venue || '',
            venueAddress: event.venueAddress || '',
            maxGuests: String(event.maxGuests ?? 100),
            tablesCount: String(event.tablesCount ?? 10),
            seatsPerTable: String(event.seatsPerTable ?? 10),
          }
        : EMPTY_FORM
    );
  }, [open, event]);

  function updateField(field) {
    return (changeEvent) =>
      setForm((current) => ({ ...current, [field]: changeEvent.target.value }));
  }

  // Resume de capacite en temps reel (CDC §5.10)
  const capacity = useMemo(() => {
    const tables = Number(form.tablesCount) || 0;
    const seats = Number(form.seatsPerTable) || 0;
    const max = Number(form.maxGuests) || 0;
    const total = tables * seats;
    return { total, max, insufficient: total > 0 && max > 0 && total < max };
  }, [form.tablesCount, form.seatsPerTable, form.maxGuests]);

  const isComplete =
    form.groomName.trim() && form.brideName.trim() && form.eventDate && form.venue.trim();

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setError('');

    if (!isComplete) {
      setError('Renseignez les noms des maries, la date et le lieu.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        groomName: form.groomName.trim(),
        brideName: form.brideName.trim(),
        // datetime-local est sans fuseau : new Date l'interprete en heure locale,
        // ce qui correspond a l'heure saisie par l'organisateur
        eventDate: new Date(form.eventDate).toISOString(),
        venue: form.venue.trim(),
        venueAddress: form.venueAddress.trim(),
        maxGuests: Number(form.maxGuests),
        tablesCount: Number(form.tablesCount),
        seatsPerTable: Number(form.seatsPerTable),
      });
      onClose();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEditing ? "Modifier l'evenement" : 'Creer un evenement'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isComplete}>
            {isEditing ? 'Enregistrer' : "Creer l'evenement"}
          </Button>
        </>
      }
    >
      <form className="wp-event-form" onSubmit={handleSubmit}>
        <Input
          label="Prenom du marie"
          value={form.groomName}
          onChange={updateField('groomName')}
          placeholder="Martin"
          required
        />
        <Input
          label="Prenom de la mariee"
          value={form.brideName}
          onChange={updateField('brideName')}
          placeholder="Eva"
          required
        />

        <Input
          className="wp-event-form__full"
          label="Date et heure"
          type="datetime-local"
          value={form.eventDate}
          onChange={updateField('eventDate')}
          required
        />

        <Input
          className="wp-event-form__full"
          label="Lieu de reception"
          value={form.venue}
          onChange={updateField('venue')}
          placeholder="Grand Hotel de Yaounde"
          required
        />

        <Input
          className="wp-event-form__full"
          label="Adresse complete"
          value={form.venueAddress}
          onChange={updateField('venueAddress')}
          placeholder="Avenue Kennedy, Yaounde"
          hint="Utilisee pour l'itineraire propose aux invites."
        />

        <Input
          label="Invites maximum"
          type="number"
          min="1"
          value={form.maxGuests}
          onChange={updateField('maxGuests')}
        />
        <Input
          label="Nombre de tables"
          type="number"
          min="1"
          value={form.tablesCount}
          onChange={updateField('tablesCount')}
        />
        <Input
          label="Places par table"
          type="number"
          min="1"
          value={form.seatsPerTable}
          onChange={updateField('seatsPerTable')}
        />

        <div
          className={`wp-event-form__summary${
            capacity.insufficient ? ' wp-event-form__summary--warning' : ''
          }`}
        >
          {capacity.total} places assises pour {capacity.max} invites annonces
          {capacity.insufficient && ' — ajoutez des tables ou reduisez la capacite.'}
        </div>

        {error && (
          <div className="wp-event-form__full" style={{ color: 'var(--color-error)', fontSize: 'var(--text-label)' }} role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
