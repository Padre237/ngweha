import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useInvite } from './useInvite.js';
import { useWakeLock } from './useWakeLock.js';
import RsvpSection from './RsvpSection.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import GallerySection from './GallerySection.jsx';
import MessageSection from './MessageSection.jsx';
import {
  InvitationCard,
  InviteFooter,
  InviteHero,
  ProgramSection,
  QrSection,
  VenueSection,
  WelcomeSection,
} from './InviteSections.jsx';
import { GUEST_PHASE, SCAN_STATUS } from '../lib/constants.js';
import { getEventPhase } from '../lib/utils.js';
import '../styles/invite.css';

/** Squelette affiche pendant le chargement (CDC §6.2). */
function InviteSkeleton() {
  return (
    <div className="wp-invite">
      <div className="wp-invite__hero">
        <div
          className="wp-skeleton"
          style={{ height: 18, width: 140, margin: '0 auto var(--space-sm)', opacity: 0.4 }}
        />
        <div
          className="wp-skeleton"
          style={{ height: 40, width: '70%', margin: '0 auto', opacity: 0.4 }}
        />
      </div>
      <div className="wp-invite__skeleton">
        <div className="wp-skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
        <div className="wp-skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    </div>
  );
}

/** Page 404 elegante quand le token ne correspond a rien (CDC §6.2). */
function InviteNotFound() {
  return (
    <div className="wp-invite">
      <div className="wp-invite__notfound">
        <h1 className="wp-invite__names" style={{ color: 'var(--color-primary)' }}>
          Invitation introuvable
        </h1>
        <p style={{ color: 'var(--color-grey)', maxWidth: '40ch' }}>
          Ce lien n'est plus valide, ou il a ete saisi incorrectement. Contactez les maries pour
          en recevoir un nouveau.
        </p>
        <InviteFooter />
      </div>
    </div>
  );
}

/**
 * Guest Page publique — /invite/:token (CDC §6).
 * Un seul lien, trois etats qui se succedent automatiquement selon la date.
 */
export default function InvitePage() {
  const { token } = useParams();
  const { data, loading, notFound, error, reload, respondRsvp } = useInvite(token);

  const phase = useMemo(
    () => getEventPhase(data?.event?.eventDate),
    [data?.event?.eventDate]
  );

  const isDayOf = phase === GUEST_PHASE.DAY_OF;

  // Ecran maintenu allume tant que le QR doit etre presente (CDC §6.4)
  useWakeLock(isDayOf);

  /** Exporte le QR et les informations essentielles en PNG (CDC §6.3). */
  const handleDownload = useCallback(() => {
    const canvas = document.getElementById('wp-invite-qr');
    if (!canvas || !data) return;

    const { guest, event } = data;
    const width = 640;
    const height = 880;

    const sheet = document.createElement('canvas');
    sheet.width = width;
    sheet.height = height;
    const context = sheet.getContext('2d');

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#C1440E';
    context.fillRect(0, 0, width, 140);

    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.font = 'bold 42px Georgia, serif';
    context.fillText(`${event.groomName} & ${event.brideName}`, width / 2, 72);
    context.font = '20px Inter, sans-serif';
    context.fillText(event.venue, width / 2, 110);

    // Le QR est recopie depuis le canvas deja rendu par qrcode.react
    context.drawImage(canvas, (width - 380) / 2, 190, 380, 380);

    context.fillStyle = '#1A1A1A';
    context.font = 'bold 34px Georgia, serif';
    context.fillText(guest.fullName, width / 2, 640);

    context.fillStyle = '#6B6B6B';
    context.font = '22px Inter, sans-serif';
    if (guest.tableNumber) context.fillText(`Table ${guest.tableNumber}`, width / 2, 684);
    context.fillText(
      guest.companions > 0 ? `${guest.companions} accompagnant(s)` : 'Sans accompagnant',
      width / 2,
      718
    );

    context.fillStyle = '#C1440E';
    context.font = '18px Inter, sans-serif';
    context.fillText("Presentez ce code a l'entree", width / 2, 790);

    const link = document.createElement('a');
    link.download = `invitation-${guest.fullName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = sheet.toDataURL('image/png');
    link.click();
  }, [data]);

  if (loading) return <InviteSkeleton />;
  if (notFound) return <InviteNotFound />;

  if (error) {
    return (
      <div className="wp-invite">
        <div className="wp-invite__notfound">
          <h1 className="wp-invite__names" style={{ color: 'var(--color-primary)' }}>
            Connexion impossible
          </h1>
          <p style={{ color: 'var(--color-grey)', maxWidth: '40ch' }}>{error}</p>
          <button type="button" className="wp-btn wp-btn--primary" onClick={reload}>
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const { guest, event } = data;
  const isScanned = guest.scanStatus === SCAN_STATUS.SCANNED;

  return (
    <div className="wp-invite wp-page">
      <InviteHero
        event={event}
        eyebrow={
          phase === GUEST_PHASE.AFTER
            ? 'Merci d\'avoir partage ce moment'
            : isDayOf
              ? "C'est aujourd'hui"
              : 'Vous etes invite(e)'
        }
      />

      <div className="wp-invite__container">
        {/* ── Etat 2 : jour J — le QR passe en premier (CDC §6.4) ── */}
        {isDayOf && (
          <>
            {isScanned ? (
              <WelcomeSection guest={guest} />
            ) : (
              <QrSection guest={guest} event={event} prominent onDownload={handleDownload} />
            )}

            {/* Le partage de photos n'apparait qu'une fois l'entree validee (CDC §6.4) */}
            {isScanned && <PhotoUpload token={token} />}

            <InvitationCard guest={guest} event={event} />
            <ProgramSection program={event.program} />
            <VenueSection event={event} />
          </>
        )}

        {/* ── Etat 1 : avant l'evenement (CDC §6.3) ── */}
        {phase === GUEST_PHASE.BEFORE && (
          <>
            <InvitationCard guest={guest} event={event} />
            <QrSection guest={guest} event={event} onDownload={handleDownload} />
            <RsvpSection guest={guest} onRespond={respondRsvp} />
            <ProgramSection program={event.program} />
            <VenueSection event={event} />
          </>
        )}

        {/* ── Etat 3 : apres l'evenement (CDC §6.5) ── */}
        {phase === GUEST_PHASE.AFTER && (
          <>
            <section className="wp-invite__card wp-invite__card--lift">
              <h2 className="wp-invite__section-title">Merci</h2>
              <p style={{ textAlign: 'center', color: 'var(--color-grey)' }}>
                Merci d'avoir partage ce moment avec {event.groomName} &amp; {event.brideName}.
              </p>
            </section>

            <GallerySection token={token} />
            <MessageSection token={token} />
          </>
        )}

        <InviteFooter />
      </div>
    </div>
  );
}
