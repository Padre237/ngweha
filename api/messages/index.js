/**
 * Messages laisses par les invites, cote organisateur (CDC §5.9).
 *
 * Les messages marques `isSecret` ne sont revelees qu'a partir de
 * eventDate + 24h. Le filtrage est fait ici, jamais cote client : un secret
 * envoye au navigateur serait deja divulgue.
 */
import { Router } from 'express';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { requireAuth, requireEventOwner } from '../_lib/auth.js';
import { SECRET_UNLOCK_HOURS } from '../_lib/enums.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireEventOwner);

/** GET /api/events/:id/messages — liste, secrets masques si trop tot. */
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('messages')
      .get();

    const eventDate = req.event.eventDate?.toDate?.() ?? null;
    const unlockAt = eventDate
      ? new Date(eventDate.getTime() + SECRET_UNLOCK_HOURS * 3600 * 1000)
      : null;
    const secretsUnlocked = Boolean(unlockAt && Date.now() > unlockAt.getTime());

    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      const locked = data.isSecret && !secretsUnlocked;

      return {
        id: doc.id,
        guestName: data.guestName,
        isSecret: Boolean(data.isSecret),
        locked,
        // Le contenu d'un secret verrouille ne quitte jamais le serveur
        content: locked ? null : data.content,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      };
    });

    messages.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

    return res.json({
      messages,
      secretsUnlocked,
      unlockAt: unlockAt ? unlockAt.toISOString() : null,
    });
  } catch (error) {
    return next(error);
  }
});

/** DELETE /api/events/:id/messages/:messageId (CDC §5.9). */
router.delete('/:messageId', async (req, res, next) => {
  try {
    const reference = adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('messages')
      .doc(req.params.messageId);

    const snapshot = await reference.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Message introuvable.' });

    await reference.delete();
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
