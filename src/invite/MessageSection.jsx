import { useEffect, useState } from 'react';
import { MAX_MESSAGE_LENGTH } from '../lib/constants.js';
import '../components/ui/Button.css';
import '../components/ui/Input.css';
import '../styles/invite.css';

/**
 * Mot laisse aux maries (CDC §6.5).
 * Un seul message par invite : le serveur refuse le second envoi.
 */
export default function MessageSection({ token }) {
  const [content, setContent] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  // Un message deja envoye interdit d'en ecrire un second
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/invite/${token}/message`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (!cancelled && payload.hasMessage) setSent(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    if (!content.trim()) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch(`/api/invite/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), isSecret }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Envoi impossible.');

      setSent(true);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSending(false);
    }
  }

  if (checking) return null;

  return (
    <section className="wp-invite__card">
      <h2 className="wp-invite__section-title">💌 Un mot aux maries</h2>

      {sent ? (
        <div className="wp-invite__rsvp-state wp-invite__rsvp-state--confirmed">
          <strong>Votre message est parti</strong>
          <p>Les maries le liront avec emotion.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <textarea
            className="wp-input wp-input--textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Votre souvenir, vos voeux, un mot d'amitie…"
            rows={5}
            aria-label="Votre message"
          />

          <span className="wp-field__counter">
            {content.length} / {MAX_MESSAGE_LENGTH}
          </span>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              fontSize: 'var(--text-label)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
            />
            Message secret — ils le decouvriront demain
          </label>

          <button
            type="submit"
            className="wp-btn wp-btn--primary wp-btn--block"
            disabled={sending || !content.trim()}
          >
            {sending ? 'Envoi…' : 'Envoyer mon message'}
          </button>

          {error && (
            <p style={{ color: 'var(--color-error)' }} role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
