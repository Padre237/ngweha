import { useState } from 'react';
import { RSVP_STATUS } from '../lib/constants.js';
import '../components/ui/Button.css';
import '../styles/invite.css';

/**
 * Section RSVP — trois etats selon la reponse deja donnee (CDC §6.3).
 * La mise a jour est immediate cote serveur.
 */
export default function RsvpSection({ guest, onRespond }) {
  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState('');

  async function respond(status) {
    setSubmitting(status);
    setError('');
    try {
      await onRespond(status);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className="wp-invite__card">
      <h2 className="wp-invite__section-title">Votre reponse</h2>

      {guest.rsvpStatus === RSVP_STATUS.CONFIRMED && (
        <>
          <div className="wp-invite__rsvp-state wp-invite__rsvp-state--confirmed">
            <strong>Votre presence est confirmee</strong>
            <p>Nous avons hate de vous y retrouver.</p>
          </div>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <button
              type="button"
              className="wp-btn wp-btn--ghost wp-btn--block wp-btn--sm"
              onClick={() => respond(RSVP_STATUS.DECLINED)}
              disabled={submitting !== null}
            >
              Finalement, je ne pourrai pas venir
            </button>
          </div>
        </>
      )}

      {guest.rsvpStatus === RSVP_STATUS.DECLINED && (
        <>
          <div className="wp-invite__rsvp-state wp-invite__rsvp-state--declined">
            <strong>Vous avez decline l'invitation</strong>
            <p>Vous nous manquerez.</p>
          </div>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <button
              type="button"
              className="wp-btn wp-btn--primary wp-btn--block"
              onClick={() => respond(RSVP_STATUS.CONFIRMED)}
              disabled={submitting !== null}
            >
              J'ai change d'avis, je viens
            </button>
          </div>
        </>
      )}

      {guest.rsvpStatus === RSVP_STATUS.PENDING && (
        <div className="wp-invite__rsvp-actions">
          <button
            type="button"
            className="wp-btn wp-btn--primary wp-btn--block wp-btn--lg"
            onClick={() => respond(RSVP_STATUS.CONFIRMED)}
            disabled={submitting !== null}
          >
            {submitting === RSVP_STATUS.CONFIRMED
              ? 'Enregistrement…'
              : 'Je confirme ma presence'}
          </button>
          <button
            type="button"
            className="wp-btn wp-btn--ghost wp-btn--block"
            onClick={() => respond(RSVP_STATUS.DECLINED)}
            disabled={submitting !== null}
          >
            {submitting === RSVP_STATUS.DECLINED ? 'Enregistrement…' : 'Je ne pourrai pas venir'}
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)', marginTop: 'var(--space-sm)' }} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
