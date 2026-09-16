import { QRCodeCanvas } from 'qrcode.react';
import { formatEventDate, formatTime } from '../lib/utils.js';
// Le lien vers la carte et le bouton de telechargement reutilisent le style
// des boutons sans monter le composant React correspondant
import '../components/ui/Button.css';
import '../styles/invite.css';

/** Bandeau de tete, seul usage autorise du degrade orange (Charte ch.02). */
export function InviteHero({ event, eyebrow }) {
  return (
    <header className="wp-invite__hero">
      <p className="wp-invite__eyebrow">{eyebrow}</p>
      <h1 className="wp-invite__names">
        {event.groomName} &amp; {event.brideName}
      </h1>
      <p className="wp-invite__date">{formatEventDate(event.eventDate)}</p>
    </header>
  );
}

/** Carte d'invitation : lieu, table, accompagnants, categorie (CDC §6.3). */
export function InvitationCard({ guest, event }) {
  return (
    <section className="wp-invite__card wp-invite__card--lift">
      <h2 className="wp-invite__section-title">Votre invitation</h2>

      <div className="wp-invite__rows">
        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Invite</span>
          <span className="wp-invite__row-value">{guest.fullName}</span>
        </div>

        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Lieu</span>
          <span className="wp-invite__row-value">{event.venue}</span>
        </div>

        {guest.tableNumber && (
          <div className="wp-invite__row">
            <span className="wp-invite__row-label">Votre table</span>
            <span className="wp-invite__row-value wp-invite__table">
              Table {guest.tableNumber}
            </span>
          </div>
        )}

        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Accompagnants</span>
          <span className="wp-invite__row-value">
            {guest.companions > 0 ? guest.companions : 'Aucun'}
          </span>
        </div>

        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Categorie</span>
          <span className="wp-invite__row-value">{guest.category}</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Section QR code. Le QR encode le token brut, pas l'URL : c'est ce que
 * le scanner de l'accueil attend (CDC §6.3).
 */
export function QrSection({ guest, event, prominent = false, onDownload }) {
  return (
    <section className={`wp-invite__card${prominent ? ' wp-invite__qr--dayof' : ''}`}>
      <div className="wp-invite__qr">
        <div className="wp-invite__qr-frame">
          <QRCodeCanvas
            id="wp-invite-qr"
            value={guest.token}
            size={prominent ? 300 : 240}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#1A1A1A"
            includeMargin
          />
        </div>

        <p className="wp-invite__qr-hint">
          {prominent
            ? "Presentez ce code a l'agent d'accueil"
            : "Presentez ce code a l'entree"}
        </p>

        {onDownload && (
          <button type="button" className="wp-btn wp-btn--secondary wp-btn--sm" onClick={onDownload}>
            Telecharger mon invitation
          </button>
        )}

        {prominent && event && (
          <p className="wp-caption">
            {guest.fullName} · Table {guest.tableNumber}
          </p>
        )}
      </div>
    </section>
  );
}

/** Timeline verticale du deroule de la journee (CDC §6.3). */
export function ProgramSection({ program }) {
  if (!program || program.length === 0) return null;

  return (
    <section className="wp-invite__card">
      <h2 className="wp-invite__section-title">Programme</h2>

      <div className="wp-timeline">
        {program.map((step, index) => (
          <div className="wp-timeline__step" key={`${step.time}-${index}`}>
            <span className="wp-timeline__dot" aria-hidden="true" />
            <span className="wp-timeline__time">{step.time}</span>
            <div>
              <p className="wp-timeline__title">{step.title}</p>
              {step.description && (
                <p className="wp-timeline__description">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Lieu, itineraire et dress code (CDC §6.3). */
export function VenueSection({ event }) {
  const mapsQuery = encodeURIComponent(
    [event.venue, event.venueAddress].filter(Boolean).join(', ')
  );

  return (
    <section className="wp-invite__card">
      <h2 className="wp-invite__section-title">Le lieu</h2>

      <div className="wp-invite__rows">
        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Adresse</span>
          <span className="wp-invite__row-value">
            {event.venueAddress || event.venue}
          </span>
        </div>

        {event.dressCode && (
          <div className="wp-invite__row">
            <span className="wp-invite__row-label">Dress code</span>
            <span className="wp-invite__row-value">{event.dressCode}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-md)' }}>
        <a
          className="wp-btn wp-btn--primary wp-btn--block"
          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir sur la carte
        </a>
      </div>
    </section>
  );
}

/** Message de bienvenue apres validation du scan (CDC §6.4). */
export function WelcomeSection({ guest }) {
  const firstName = guest.fullName.split(' ')[0];

  return (
    <section className="wp-invite__card">
      <div className="wp-invite__welcome">
        <p className="wp-invite__welcome-title">Bienvenue {firstName} ! 🎉</p>
        <p>Bon mariage</p>
      </div>

      <div className="wp-invite__rows" style={{ marginTop: 'var(--space-md)' }}>
        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Votre table</span>
          <span className="wp-invite__row-value wp-invite__table">
            Table {guest.tableNumber}
          </span>
        </div>
        <div className="wp-invite__row">
          <span className="wp-invite__row-label">Entree validee a</span>
          <span className="wp-invite__row-value">{formatTime(guest.scannedAt)}</span>
        </div>
      </div>
    </section>
  );
}

/** Pied de page discret (CDC §6.6). */
export function InviteFooter() {
  return (
    <footer className="wp-invite__footer">
      <p>Propulse par WeddingPass</p>
    </footer>
  );
}
