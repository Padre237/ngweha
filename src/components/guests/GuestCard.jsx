import { Avatar, Badge } from '../ui/index.js';
import { RSVP_LABELS, SCAN_LABELS, SCAN_STATUS } from '../../lib/constants.js';
import '../../styles/guests.css';

/** Icones d'action, inline pour rester sans dependance. */
function ActionIcon({ path }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** Ligne d'un invite dans la liste (CDC §5.4). */
export default function GuestCard({ guest, onEdit, onShowQr, onDelete, onSendLink, sending }) {
  const companionsLabel =
    guest.companions > 0
      ? `${guest.companions} accompagnant${guest.companions > 1 ? 's' : ''}`
      : 'Seul';

  return (
    <div className="wp-guest-card">
      <Avatar name={guest.fullName} size="md" />

      <div className="wp-guest-card__identity">
        <p className="wp-guest-card__name">{guest.fullName}</p>
        <p className="wp-guest-card__meta">
          {guest.tableNumber ? `Table ${guest.tableNumber}` : 'Sans table'} · {companionsLabel}
        </p>
      </div>

      <div className="wp-guest-card__badges">
        <Badge category={guest.category}>{guest.category}</Badge>
        <Badge status={guest.rsvpStatus}>{RSVP_LABELS[guest.rsvpStatus]}</Badge>
        {guest.scanStatus === SCAN_STATUS.SCANNED && (
          <Badge status={guest.scanStatus} dot>
            {SCAN_LABELS[guest.scanStatus]}
          </Badge>
        )}
      </div>

      <div className="wp-guest-card__actions">
        {/* L'envoi n'est propose qu'aux invites ayant un numero (CDC §5.4) */}
        {guest.phone && (
          <button
            type="button"
            className="wp-icon-btn"
            onClick={() => onSendLink(guest)}
            disabled={sending}
            aria-label={`Envoyer le lien a ${guest.fullName}`}
            title={guest.linkSentAt ? 'Lien deja envoye — renvoyer' : 'Envoyer le lien WhatsApp'}
            style={guest.linkSentAt ? { color: 'var(--color-success)' } : undefined}
          >
            <ActionIcon path="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
          </button>
        )}

        <button
          type="button"
          className="wp-icon-btn"
          onClick={() => onShowQr(guest)}
          aria-label={`QR code de ${guest.fullName}`}
          title="QR code"
        >
          <ActionIcon path="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 7h4v4H7zM13 13h4v4h-4z" />
        </button>

        <button
          type="button"
          className="wp-icon-btn"
          onClick={() => onEdit(guest)}
          aria-label={`Modifier ${guest.fullName}`}
          title="Modifier"
        >
          <ActionIcon path="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </button>

        <button
          type="button"
          className="wp-icon-btn wp-icon-btn--danger"
          onClick={() => onDelete(guest)}
          aria-label={`Supprimer ${guest.fullName}`}
          title="Supprimer"
        >
          <ActionIcon path="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </button>
      </div>
    </div>
  );
}
