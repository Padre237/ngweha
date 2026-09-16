import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '../ui/index.js';

/**
 * Confirmation de suppression d'un evenement (CDC §5.2).
 * La suppression etant en cascade (invites, photos, messages), elle exige la
 * saisie exacte du nom de l'evenement.
 */
export default function DeleteEventModal({ open, onClose, onConfirm, event }) {
  const [typedName, setTypedName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTypedName('');
      setError('');
    }
  }, [open]);

  if (!event) return null;

  const expectedName = `${event.groomName} & ${event.brideName}`;
  const matches = typedName.trim() === expectedName;

  async function handleConfirm() {
    if (!matches) return;

    setSubmitting(true);
    setError('');
    try {
      await onConfirm(event);
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
      size="sm"
      title="Supprimer l'evenement"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={submitting} disabled={!matches}>
            Supprimer definitivement
          </Button>
        </>
      }
    >
      <p className="wp-danger-text">
        Cette action supprime l'evenement ainsi que{' '}
        <strong>tous ses invites, photos et messages</strong>. Elle est irreversible.
      </p>

      <p className="wp-danger-text">
        Pour confirmer, saisissez <span className="wp-danger-name">{expectedName}</span>
      </p>

      <Input
        label="Nom de l'evenement"
        value={typedName}
        onChange={(changeEvent) => setTypedName(changeEvent.target.value)}
        placeholder={expectedName}
        error={error}
        autoFocus
      />
    </Modal>
  );
}
