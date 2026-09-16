/**
 * Routes CRUD des invites (CDC §7.3).
 * Montees sous /api/events/:id/guests — mergeParams donne acces a :id.
 */
import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { requireAuth, requireEventOwner } from '../_lib/auth.js';
import { validateGuest } from '../_lib/validation.js';
import { buildInviteUrl, generateGuestToken } from '../_lib/tokens.js';
import { registerInviteToken, revokeInviteToken } from '../_lib/inviteTokens.js';
import { resolveTableAssignment, seatsTakenBy } from '../_lib/seating.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireEventOwner);

/** Serialise un invite Firestore en JSON transportable. */
function serializeGuest(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    scannedAt: data.scannedAt?.toDate?.().toISOString() ?? null,
    linkSentAt: data.linkSentAt?.toDate?.().toISOString() ?? null,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

/** Charge tous les invites de l'evenement — base des controles de capacite. */
async function loadGuests(eventId) {
  const snapshot = await adminDb.collection('events').doc(eventId).collection('guests').get();
  return snapshot.docs.map(serializeGuest);
}

/** GET /api/events/:id/guests — liste complete. */
router.get('/', async (req, res, next) => {
  try {
    const guests = await loadGuests(req.params.id);
    // Tri alphabetique en memoire : evite un index composite (cf. route events)
    guests.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'fr'));
    res.json({ guests });
  } catch (error) {
    next(error);
  }
});

/** POST /api/events/:id/guests — ajout avec generation du token et de la table. */
router.post('/', async (req, res, next) => {
  try {
    const { valid, errors, data } = validateGuest(req.body);
    if (!valid) return res.status(400).json({ error: errors[0], errors });

    const guests = await loadGuests(req.params.id);

    const assignment = resolveTableAssignment({
      event: req.event,
      guests,
      seatsNeeded: seatsTakenBy(data),
      requestedTable: data.tableNumber,
    });

    if (!assignment.ok) return res.status(409).json({ error: assignment.error });

    // Token cryptographique de 64 caracteres hexadecimaux (CDC §9.3)
    const token = generateGuestToken();

    const reference = await adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('guests')
      .add({
        ...data,
        eventId: req.params.id,
        tableNumber: assignment.tableNumber,
        token,
        inviteUrl: buildInviteUrl(token),
        rsvpStatus: 'pending',
        scanStatus: 'not_scanned',
        scannedAt: null,
        scannedBy: null,
        linkSentAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Indexe le token pour que /api/invite/:token le resolve en une lecture
    await registerInviteToken(token, { eventId: req.params.id, guestId: reference.id });

    const created = await reference.get();
    return res.status(201).json({ guest: serializeGuest(created) });
  } catch (error) {
    return next(error);
  }
});

/** PUT /api/events/:id/guests/:gid — mise a jour partielle. */
router.put('/:gid', async (req, res, next) => {
  try {
    const { valid, errors, data } = validateGuest(req.body, { partial: true });
    if (!valid) return res.status(400).json({ error: errors[0], errors });

    const reference = adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('guests')
      .doc(req.params.gid);

    const existing = await reference.get();
    if (!existing.exists) return res.status(404).json({ error: 'Invite introuvable.' });

    const current = serializeGuest(existing);

    // La capacite se recalcule des que la table ou le nombre d'accompagnants change
    const touchesSeating = data.tableNumber !== undefined || data.companions !== undefined;

    if (touchesSeating) {
      const guests = await loadGuests(req.params.id);
      const merged = { ...current, ...data };

      const assignment = resolveTableAssignment({
        event: req.event,
        guests,
        seatsNeeded: seatsTakenBy(merged),
        requestedTable: data.tableNumber === undefined ? current.tableNumber : data.tableNumber,
        excludeGuestId: req.params.gid,
      });

      if (!assignment.ok) return res.status(409).json({ error: assignment.error });
      data.tableNumber = assignment.tableNumber;
    }

    await reference.update({ ...data, updatedAt: FieldValue.serverTimestamp() });

    const updated = await reference.get();
    return res.json({ guest: serializeGuest(updated) });
  } catch (error) {
    return next(error);
  }
});

/** DELETE /api/events/:id/guests/:gid — suppression. */
router.delete('/:gid', async (req, res, next) => {
  try {
    const reference = adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('guests')
      .doc(req.params.gid);

    const existing = await reference.get();
    if (!existing.exists) return res.status(404).json({ error: 'Invite introuvable.' });

    // Revoque le lien avant de supprimer l'invite : /invite/:token repond 404
    await revokeInviteToken(existing.data().token);
    await reference.delete();

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
