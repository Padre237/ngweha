/**
 * Routes CRUD des evenements (CDC §7.2).
 * Toutes exigent un ID token Firebase valide; les routes ciblant un evenement
 * verifient en plus que l'appelant en est proprietaire.
 */
import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { requireAuth, requireEventOwner } from '../_lib/auth.js';
import { validateEvent } from '../_lib/validation.js';
import { revokeEventTokens, registerInviteToken } from '../_lib/inviteTokens.js';
import { validateGuest } from '../_lib/validation.js';
import { buildInviteUrl, generateGuestToken } from '../_lib/tokens.js';

const router = Router();

router.use(requireAuth);

/** Serialise un document Firestore en JSON transportable. */
function serializeEvent(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    eventDate: data.eventDate?.toDate?.().toISOString() ?? null,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

/** GET /api/events — liste des evenements de l'utilisateur. */
router.get('/', async (req, res, next) => {
  try {
    // Pas d'orderBy ici : combine a `where`, il exigerait un index composite a
    // deployer. Un organisateur gere quelques dizaines d'evenements au plus,
    // le tri en memoire est suffisant et evite une etape de deploiement.
    const snapshot = await adminDb
      .collection('events')
      .where('ownerId', '==', req.user.uid)
      .get();

    // Le compteur d'invites alimente les cards de /events (CDC §5.2)
    const events = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const guests = await doc.ref.collection('guests').count().get();
        return { ...serializeEvent(doc), guestsCount: guests.data().count };
      })
    );

    events.sort((a, b) => new Date(a.eventDate ?? 0) - new Date(b.eventDate ?? 0));

    res.json({ events });
  } catch (error) {
    next(error);
  }
});

/** POST /api/events — creation. */
router.post('/', async (req, res, next) => {
  try {
    const { valid, errors, data } = validateEvent(req.body);
    if (!valid) return res.status(400).json({ error: errors[0], errors });

    const reference = await adminDb.collection('events').add({
      ...data,
      ownerId: req.user.uid,
      status: data.status || 'draft',
      program: data.program || [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const created = await reference.get();
    return res.status(201).json({ event: { ...serializeEvent(created), guestsCount: 0 } });
  } catch (error) {
    return next(error);
  }
});

/** GET /api/events/:id — detail. */
router.get('/:id', requireEventOwner, async (req, res, next) => {
  try {
    const doc = await adminDb.collection('events').doc(req.params.id).get();
    const guests = await doc.ref.collection('guests').count().get();
    res.json({ event: { ...serializeEvent(doc), guestsCount: guests.data().count } });
  } catch (error) {
    next(error);
  }
});

/** PUT /api/events/:id — mise a jour partielle. */
router.put('/:id', requireEventOwner, async (req, res, next) => {
  try {
    const { valid, errors, data } = validateEvent(req.body, { partial: true });
    if (!valid) return res.status(400).json({ error: errors[0], errors });

    const reference = adminDb.collection('events').doc(req.params.id);
    await reference.update({ ...data, updatedAt: FieldValue.serverTimestamp() });

    const updated = await reference.get();
    return res.json({ event: serializeEvent(updated) });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/events/:id — suppression en cascade (CDC §5.2).
 * Les sous-collections guests / photos / messages ne disparaissent pas avec leur
 * parent dans Firestore : il faut les supprimer explicitement, par lots.
 */
router.delete('/:id', requireEventOwner, async (req, res, next) => {
  try {
    const reference = adminDb.collection('events').doc(req.params.id);
    const deleted = { guests: 0, photos: 0, messages: 0, tokens: 0 };

    for (const name of ['guests', 'photos', 'messages']) {
      deleted[name] = await deleteCollection(reference.collection(name));
    }

    // Les correspondances token -> invite vivent hors de l'evenement :
    // sans ce nettoyage, elles resteraient orphelines indefiniment
    deleted.tokens = await revokeEventTokens(req.params.id);

    await reference.delete();
    return res.json({ success: true, deleted });
  } catch (error) {
    return next(error);
  }
});

/** Supprime une sous-collection par lots de 400 (limite Firestore : 500 ecritures). */
async function deleteCollection(collectionRef, batchSize = 400) {
  let total = 0;

  // Boucle tant qu'il reste des documents : une seule passe ne suffit pas
  // au-dela de `batchSize` elements.
  for (;;) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) return total;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    total += snapshot.size;
    if (snapshot.size < batchSize) return total;
  }
}

/**
 * POST /api/events/:id/reset-scans — remet tous les invites en non scanne.
 * Zone dangereuse des parametres (CDC §5.10).
 */
router.post('/:id/reset-scans', requireEventOwner, async (req, res, next) => {
  try {
    const guestsRef = adminDb.collection('events').doc(req.params.id).collection('guests');
    const snapshot = await guestsRef.where('scanStatus', '==', 'scanned').get();

    // Firestore plafonne un lot a 500 ecritures : on decoupe
    let reset = 0;
    for (let index = 0; index < snapshot.docs.length; index += 400) {
      const slice = snapshot.docs.slice(index, index + 400);
      const batch = adminDb.batch();

      slice.forEach((doc) => {
        batch.update(doc.ref, {
          scanStatus: 'not_scanned',
          scannedAt: null,
          scannedBy: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      reset += slice.length;
    }

    return res.json({ success: true, reset });
  } catch (error) {
    return next(error);
  }
});

/** POST /api/events/:id/purge-guests — supprime tous les invites (CDC §5.10). */
router.post('/:id/purge-guests', requireEventOwner, async (req, res, next) => {
  try {
    const reference = adminDb.collection('events').doc(req.params.id);

    const deleted = await deleteCollection(reference.collection('guests'));
    const tokens = await revokeEventTokens(req.params.id);

    return res.json({ success: true, deleted, tokens });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/events/:id/import-guests — import JSON (CDC §5.10).
 * Corps : { guests: [...], mode: 'merge' | 'replace' }
 *
 * Chaque invite importe recoit un token neuf : reutiliser les tokens d'un autre
 * evenement creerait des collisions dans la table de correspondance.
 */
router.post('/:id/import-guests', requireEventOwner, async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body?.guests) ? req.body.guests : null;
    const mode = req.body?.mode === 'replace' ? 'replace' : 'merge';

    if (!incoming) {
      return res.status(400).json({ error: 'Le fichier ne contient aucune liste d\'invites.' });
    }
    if (incoming.length > 2000) {
      return res.status(400).json({ error: 'Import limite a 2000 invites par fichier.' });
    }

    const reference = adminDb.collection('events').doc(req.params.id);

    if (mode === 'replace') {
      await deleteCollection(reference.collection('guests'));
      await revokeEventTokens(req.params.id);
    }

    const guestsRef = reference.collection('guests');
    const errors = [];
    let imported = 0;

    for (const raw of incoming) {
      const { valid, errors: guestErrors, data } = validateGuest(raw);

      if (!valid) {
        errors.push(`${raw?.fullName || 'Invite sans nom'} : ${guestErrors[0]}`);
        continue;
      }

      const token = generateGuestToken();
      const doc = await guestsRef.add({
        ...data,
        eventId: req.params.id,
        tableNumber: data.tableNumber ?? null,
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

      await registerInviteToken(token, { eventId: req.params.id, guestId: doc.id });
      imported += 1;
    }

    return res.json({ success: true, imported, skipped: errors.length, errors: errors.slice(0, 10) });
  } catch (error) {
    return next(error);
  }
});

export default router;
