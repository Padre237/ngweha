import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal } from '../ui/index.js';
import { GUEST_CATEGORIES, MAX_COMPANIONS } from '../../lib/constants.js';
import '../../styles/guests.css';

const EMPTY_FORM = {
  fullName: '',
  category: 'Amis',
  companions: '0',
  tableNumber: '',
  phone: '',
  notes: '',
};

/**
 * Modal d'ajout et d'edition d'un invite (CDC §5.4).
 * Laisser le champ Table vide declenche l'attribution automatique cote serveur.
 */
export default function GuestFormModal({ open, onClose, onSubmit, guest = null, event }) {
  const isEditing = Boolean(guest);

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      guest
        ? {
            fullName: guest.fullName || '',
            category: guest.category || 'Amis',
            companions: String(guest.companions ?? 0),
            tableNumber: guest.tableNumber ? String(guest.tableNumber) : '',
            phone: guest.phone || '',
            notes: guest.notes || '',
          }
        : EMPTY_FORM
    );
  }, [open, guest]);

  function updateField(field) {
    return (changeEvent) =>
      setForm((current) => ({ ...current, [field]: changeEvent.target.value }));
  }

  // Liste des tables proposees, bornee par la configuration de l'evenement
  const tableOptions = useMemo(() => {
    const count = Number(event?.tablesCount) || 0;
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [event]);

  const isComplete = form.fullName.trim().length > 0;

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setError('');

    if (!isComplete) {
      setError("Le nom complet de l'invite est requis.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        fullName: form.fullName.trim(),
        category: form.category,
        companions: Number(form.companions) || 0,
        // Chaine vide = attribution automatique (CDC §5.4)
        tableNumber: form.tableNumber === '' ? null : Number(form.tableNumber),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
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
      title={isEditing ? "Modifier l'invite" : 'Ajouter un invite'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isComplete}>
            {isEditing ? 'Enregistrer' : "Ajouter l'invite"}
          </Button>
        </>
      }
    >
      <form className="wp-guest-form" onSubmit={handleSubmit}>
        <Input
          className="wp-guest-form__full"
          label="Nom complet"
          value={form.fullName}
          onChange={updateField('fullName')}
          placeholder="Emmanuel Ngan"
          required
          autoFocus
        />

        <div className="wp-field">
          <label className="wp-field__label" htmlFor="guest-category">
            Categorie<span className="wp-field__required">*</span>
          </label>
          <select
            id="guest-category"
            className="wp-select"
            value={form.category}
            onChange={updateField('category')}
          >
            {GUEST_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Accompagnants"
          type="number"
          min="0"
          max={MAX_COMPANIONS}
          value={form.companions}
          onChange={updateField('companions')}
          hint={`Entre 0 et ${MAX_COMPANIONS}.`}
        />

        <div className="wp-field">
          <label className="wp-field__label" htmlFor="guest-table">
            Table
          </label>
          <select
            id="guest-table"
            className="wp-select"
            value={form.tableNumber}
            onChange={updateField('tableNumber')}
          >
            <option value="">Attribution automatique</option>
            {tableOptions.map((table) => (
              <option key={table} value={table}>
                Table {table}
              </option>
            ))}
          </select>
          <span className="wp-field__hint">Laissez vide pour placer l'invite automatiquement.</span>
        </div>

        <Input
          label="Telephone WhatsApp"
          type="tel"
          value={form.phone}
          onChange={updateField('phone')}
          placeholder="+237 6 99 00 00 00"
        />

        <Input
          className="wp-guest-form__full"
          label="Notes privees"
          variant="textarea"
          value={form.notes}
          onChange={updateField('notes')}
          maxLength={1000}
          placeholder="Allergie, contrainte de placement…"
          hint="Visible uniquement par les organisateurs."
        />

        {error && (
          <div
            className="wp-guest-form__full"
            style={{ color: 'var(--color-error)', fontSize: 'var(--text-label)' }}
            role="alert"
          >
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
