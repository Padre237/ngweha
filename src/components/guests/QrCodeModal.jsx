import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Badge, Button, Modal, useToast } from '../ui/index.js';
import { whatsappApi } from '../../lib/api.js';
import '../../styles/guests.css';

/**
 * Affiche le QR code d'un invite (CDC §5.4).
 * Le QR encode le token brut, pas l'URL complete — c'est ce que le scanner attend (CDC §6.3).
 */
export default function QrCodeModal({ open, onClose, guest, event, eventId, onSent }) {
  const toast = useToast();
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  if (!guest) return null;

  /** Exporte le canvas du QR en PNG. */
  function handleDownload() {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Telechargement impossible', 'Le QR code n\'est pas encore affiche.');
      return;
    }

    const link = document.createElement('a');
    link.download = `qr-${guest.fullName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast.success('QR code telecharge', guest.fullName);
  }

  /** Copie le lien d'invitation dans le presse-papiers. */
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(guest.inviteUrl);
      setCopied(true);
      toast.success('Lien copie', 'Collez-le dans WhatsApp pour l\'envoyer.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponible hors HTTPS ou sans permission
      toast.error('Copie impossible', 'Selectionnez le lien manuellement.');
    }
  }

  /** Envoi direct du lien par WhatsApp (CDC §5.4). */
  async function handleSendWhatsApp() {
    setSending(true);
    try {
      await whatsappApi.send(eventId, guest.id);
      toast.success('Lien envoye', `${guest.fullName} · ${guest.phone}`);
      onSent?.();
    } catch (caught) {
      toast.error('Envoi impossible', caught.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="QR code d'invitation"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div className="wp-qr" ref={containerRef}>
        <div className="wp-qr__frame">
          <QRCodeCanvas
            value={guest.token}
            size={256}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#1A1A1A"
            includeMargin
          />
        </div>

        <div>
          <p className="wp-qr__name">{guest.fullName}</p>
          <p className="wp-qr__meta">
            {guest.tableNumber ? `Table ${guest.tableNumber}` : 'Table non attribuee'}
            {guest.companions > 0 &&
              ` · ${guest.companions} accompagnant${guest.companions > 1 ? 's' : ''}`}
          </p>
        </div>

        <Badge category={guest.category}>{guest.category}</Badge>

        {event && (
          <p className="wp-qr__meta">
            {event.groomName} &amp; {event.brideName}
          </p>
        )}

        <p className="wp-qr__link">{guest.inviteUrl}</p>

        <div className="wp-qr__actions">
          <Button size="sm" onClick={handleDownload}>
            Telecharger le PNG
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCopyLink}>
            {copied ? 'Lien copie' : 'Copier le lien'}
          </Button>
          {guest.phone && eventId && (
            <Button size="sm" variant="secondary" loading={sending} onClick={handleSendWhatsApp}>
              Envoyer WhatsApp
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
