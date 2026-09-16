/**
 * Envoi des liens d'invitation via WhatsApp Business API (CDC §7.5, §7.7).
 *
 * Meta impose des templates pre-approuves pour initier une conversation.
 * Quand aucun template n'est configure, on retombe sur un message texte libre :
 * il ne part que dans la fenetre de 24h suivant un message de l'invite, mais
 * cela permet de tester l'integration de bout en bout.
 */
import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { requireAuth, requireEventOwner } from '../_lib/auth.js';
import { formatEventDateFr, normalizePhone } from '../_lib/format.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireEventOwner);

const GRAPH_VERSION = 'v21.0';

function isWhatsAppConfigured() {
  return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Compose le message decrit au CDC §7.7. */
function buildMessage({ guest, event }) {
  return [
    `Bonjour ${guest.fullName} 👋`,
    '',
    'Vous etes invite(e) au mariage de',
    `*${event.groomName} & ${event.brideName}* 💍`,
    '',
    `📅 ${formatEventDateFr(event.eventDate)}`,
    `📍 ${event.venue}`,
    guest.tableNumber ? `🪑 Table ${guest.tableNumber}` : null,
    '',
    'Votre invitation personnelle avec QR code :',
    guest.inviteUrl,
    '',
    "_Presentez ce lien a l'entree le jour J._",
    '',
    '— WeddingPass',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** Appelle l'API Graph de Meta pour un destinataire. */
async function sendWhatsAppMessage({ to, body }) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: true, body },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Envoi refuse par l'API WhatsApp.");
  }

  return payload;
}

/** Envoie a un invite et horodate linkSentAt. */
async function sendToGuest({ guestDoc, event }) {
  const guest = { id: guestDoc.id, ...guestDoc.data() };

  if (!guest.phone) {
    return { guestId: guest.id, name: guest.fullName, ok: false, error: 'Aucun numero renseigne.' };
  }

  try {
    await sendWhatsAppMessage({
      to: normalizePhone(guest.phone),
      body: buildMessage({ guest, event }),
    });

    await guestDoc.ref.update({
      linkSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { guestId: guest.id, name: guest.fullName, ok: true };
  } catch (error) {
    return { guestId: guest.id, name: guest.fullName, ok: false, error: error.message };
  }
}

/** POST /api/events/:id/whatsapp/send — envoi individuel (CDC §7.5). */
router.post('/send', async (req, res, next) => {
  try {
    if (!isWhatsAppConfigured()) {
      return res.status(503).json({
        error:
          'WhatsApp non configure. Renseignez WHATSAPP_API_TOKEN et WHATSAPP_PHONE_NUMBER_ID.',
      });
    }

    const guestId = String(req.body?.guestId || '');
    if (!guestId) return res.status(400).json({ error: 'Invite non precise.' });

    const guestDoc = await adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('guests')
      .doc(guestId)
      .get();

    if (!guestDoc.exists) return res.status(404).json({ error: 'Invite introuvable.' });

    const result = await sendToGuest({ guestDoc, event: req.event });

    if (!result.ok) return res.status(502).json({ error: result.error });

    return res.json({ success: true, sent: 1 });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/events/:id/whatsapp/send-bulk — envoi groupe (CDC §7.5).
 * Cible les invites ayant un telephone et n'ayant pas encore recu leur lien.
 */
router.post('/send-bulk', async (req, res, next) => {
  try {
    if (!isWhatsAppConfigured()) {
      return res.status(503).json({
        error:
          'WhatsApp non configure. Renseignez WHATSAPP_API_TOKEN et WHATSAPP_PHONE_NUMBER_ID.',
      });
    }

    const snapshot = await adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('guests')
      .get();

    const pending = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.phone && !data.linkSentAt;
    });

    const results = [];

    // Envoi sequentiel : l'API Meta limite le debit, et un envoi groupe
    // parallele declencherait un throttling difficile a rattraper
    for (const guestDoc of pending) {
      results.push(await sendToGuest({ guestDoc, event: req.event }));
    }

    const sent = results.filter((result) => result.ok).length;

    return res.json({
      success: true,
      sent,
      failed: results.length - sent,
      errors: results.filter((result) => !result.ok).slice(0, 10),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
