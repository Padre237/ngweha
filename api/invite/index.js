/**
 * Guest Page publique — /api/invite/:token (CDC §7.3, §6).
 *
 * Point d'entree unique de l'experience invite. Aucune authentification :
 * la connaissance du token fait foi. En consequence, la reponse est
 * strictement filtree — jamais les notes privees, jamais les autres invites.
 */
import { Router } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { isValidToken } from '../_lib/tokens.js';
import { resolveInviteToken } from '../_lib/inviteTokens.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit } from '../_lib/rateLimit.js';

const router = Router();

// Le token est impredictible, mais on limite tout de meme le balayage
router.use(rateLimit({ windowMs: 60_000, max: 60 }));

/**
 * Retrouve un invite a partir de son seul token, en deux lectures par cle.
 * Aucune requete, donc aucun index a deployer (CDC §9.1).
 */
async function findGuestByToken(token) {
  const mapping = await resolveInviteToken(token);
  if (!mapping) return null;

  const eventRef = adminDb.collection('events').doc(mapping.eventId);
  const [guestDoc, eventDoc] = await Promise.all([
    eventRef.collection('guests').doc(mapping.guestId).get(),
    eventRef.get(),
  ]);

  // Correspondance orpheline : l'invite ou l'evenement a ete supprime
  if (!guestDoc.exists || !eventDoc.exists) return null;

  return { guestDoc, eventDoc };
}

/** Champs de l'invite exposes publiquement — `notes` en est volontairement absent. */
function serializePublicGuest(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    fullName: data.fullName,
    category: data.category,
    companions: data.companions ?? 0,
    tableNumber: data.tableNumber ?? null,
    token: data.token,
    rsvpStatus: data.rsvpStatus ?? 'pending',
    scanStatus: data.scanStatus ?? 'not_scanned',
    scannedAt: data.scannedAt?.toDate?.().toISOString() ?? null,
  };
}

/** Champs de l'evenement utiles a l'invite. */
function serializePublicEvent(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    brideName: data.brideName,
    groomName: data.groomName,
    eventDate: data.eventDate?.toDate?.().toISOString() ?? null,
    venue: data.venue ?? '',
    venueAddress: data.venueAddress ?? '',
    dressCode: data.dressCode ?? '',
    program: Array.isArray(data.program) ? data.program : [],
    couplePhotoUrl: data.couplePhotoUrl ?? null,
  };
}

/** GET /api/invite/:token — donnees de la Guest Page. */
router.get('/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim().toLowerCase();

    if (!isValidToken(token)) {
      return res.status(404).json({ error: 'Invitation introuvable.' });
    }

    const found = await findGuestByToken(token);
    if (!found) {
      return res.status(404).json({ error: 'Invitation introuvable.' });
    }

    return res.json({
      guest: serializePublicGuest(found.guestDoc),
      event: serializePublicEvent(found.eventDoc),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/invite/:token/rsvp — l'invite confirme ou decline (CDC §6.3).
 * Corps : { rsvpStatus: 'confirmed' | 'declined' }
 */
router.post('/:token/rsvp', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim().toLowerCase();
    const rsvpStatus = String(req.body?.rsvpStatus || '');

    if (!isValidToken(token)) {
      return res.status(404).json({ error: 'Invitation introuvable.' });
    }
    if (!['confirmed', 'declined'].includes(rsvpStatus)) {
      return res.status(400).json({ error: 'Reponse invalide.' });
    }

    const found = await findGuestByToken(token);
    if (!found) {
      return res.status(404).json({ error: 'Invitation introuvable.' });
    }

    await found.guestDoc.ref.update({ rsvpStatus, updatedAt: Timestamp.now() });

    return res.json({ success: true, rsvpStatus });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/invite/:token/photos — galerie collaborative (CDC §6.5).
 * Accessible a tout invite de l'evenement, une fois la fete passee.
 */
router.get('/:token/photos', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim().toLowerCase();
    if (!isValidToken(token)) return res.status(404).json({ error: 'Invitation introuvable.' });

    const mapping = await resolveInviteToken(token);
    if (!mapping) return res.status(404).json({ error: 'Invitation introuvable.' });

    const snapshot = await adminDb
      .collection('events')
      .doc(mapping.eventId)
      .collection('photos')
      .get();

    const photos = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        guestId: data.guestId,
        guestName: data.guestName,
        cloudinaryUrl: data.cloudinaryUrl,
        votes: data.votes ?? 0,
        // On n'expose pas la liste des votants, seulement le vote de l'appelant
        hasVoted: Array.isArray(data.voters) && data.voters.includes(mapping.guestId),
        uploadedAt: data.uploadedAt?.toDate?.().toISOString() ?? null,
      };
    });

    photos.sort((a, b) => new Date(b.uploadedAt ?? 0) - new Date(a.uploadedAt ?? 0));

    return res.json({ photos, guestId: mapping.guestId });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/invite/:token/photos/:photoId/vote — vote « photo du jour ».
 * Un invite ne peut voter qu'une fois par photo (CDC §2.5, §6.5).
 */
router.post('/:token/photos/:photoId/vote', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim().toLowerCase();
    if (!isValidToken(token)) return res.status(404).json({ error: 'Invitation introuvable.' });

    const mapping = await resolveInviteToken(token);
    if (!mapping) return res.status(404).json({ error: 'Invitation introuvable.' });

    const photoRef = adminDb
      .collection('events')
      .doc(mapping.eventId)
      .collection('photos')
      .doc(req.params.photoId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(photoRef);
      if (!snapshot.exists) return null;

      const voters = snapshot.data().voters || [];
      // La transaction empeche deux votes simultanes de s'ecraser
      if (voters.includes(mapping.guestId)) {
        return { votes: snapshot.data().votes ?? 0, alreadyVoted: true };
      }

      transaction.update(photoRef, {
        votes: FieldValue.increment(1),
        voters: FieldValue.arrayUnion(mapping.guestId),
      });

      return { votes: (snapshot.data().votes ?? 0) + 1, alreadyVoted: false };
    });

    if (!result) return res.status(404).json({ error: 'Photo introuvable.' });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/invite/:token/message — mot aux maries (CDC §6.5).
 * Corps : { content, isSecret }
 */
router.post('/:token/message', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim().toLowerCase();
    if (!isValidToken(token)) return res.status(404).json({ error: 'Invitation introuvable.' });

    const content = String(req.body?.content || '').trim();
    const isSecret = Boolean(req.body?.isSecret);

    if (!content) return res.status(400).json({ error: 'Le message est vide.' });
    if (content.length > 500) {
      return res.status(400).json({ error: 'Le message ne peut depasser 500 caracteres.' });
    }

    const mapping = await resolveInviteToken(token);
    if (!mapping) return res.status(404).json({ error: 'Invitation introuvable.' });

    const eventRef = adminDb.collection('events').doc(mapping.eventId);
    const guestSnap = await eventRef.collection('guests').doc(mapping.guestId).get();
    if (!guestSnap.exists) return res.status(404).json({ error: 'Invitation introuvable.' });

    const messagesRef = eventRef.collection('messages');

    // Un invite ne laisse qu'un seul message (CDC §6.5)
    const existing = await messagesRef.where('guestId', '==', mapping.guestId).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Vous avez deja laisse un message aux maries.' });
    }

    await messagesRef.add({
      guestId: mapping.guestId,
      guestName: guestSnap.data().fullName,
      content,
      isSecret,
      createdAt: Timestamp.now(),
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

/** GET /api/invite/:token/message — indique si l'invite a deja ecrit. */
router.get('/:token/message', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim().toLowerCase();
    if (!isValidToken(token)) return res.status(404).json({ error: 'Invitation introuvable.' });

    const mapping = await resolveInviteToken(token);
    if (!mapping) return res.status(404).json({ error: 'Invitation introuvable.' });

    const existing = await adminDb
      .collection('events')
      .doc(mapping.eventId)
      .collection('messages')
      .where('guestId', '==', mapping.guestId)
      .limit(1)
      .get();

    return res.json({ hasMessage: !existing.empty });
  } catch (error) {
    return next(error);
  }
});

export default router;
