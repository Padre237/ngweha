/**
 * Upload des photos invites vers Cloudinary (CDC §7.4).
 *
 * L'invite n'est pas authentifie : il prouve son identite par son token.
 * Le fichier arrive en base64 — la compression cote client le ramene sous
 * 1 Mo avant l'envoi (CDC §9.2), ce que la limite d'express.json absorbe.
 */
import { Router } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { requireAuth, requireEventOwner } from '../_lib/auth.js';
import { getCloudinary } from '../_lib/cloudinary.js';
import { isValidToken } from '../_lib/tokens.js';
import { resolveInviteToken } from '../_lib/inviteTokens.js';
import { rateLimit } from '../_lib/rateLimit.js';

const router = Router();

/** POST /api/upload — depot d'une photo par un invite scanne. */
router.post('/', rateLimit({ windowMs: 60_000, max: 20 }), async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim().toLowerCase();
    const image = req.body?.image;

    if (!isValidToken(token)) {
      return res.status(403).json({ error: 'Invitation invalide.' });
    }
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Image invalide.' });
    }

    const mapping = await resolveInviteToken(token);
    if (!mapping) {
      return res.status(403).json({ error: 'Invitation invalide.' });
    }

    const eventRef = adminDb.collection('events').doc(mapping.eventId);
    const guestSnap = await eventRef.collection('guests').doc(mapping.guestId).get();

    if (!guestSnap.exists) {
      return res.status(403).json({ error: 'Invitation invalide.' });
    }

    const guest = guestSnap.data();

    // Seuls les invites presents peuvent deposer une photo (CDC §6.4)
    if (guest.scanStatus !== 'scanned') {
      return res.status(403).json({
        error: 'Le partage de photos s\'active une fois votre entree validee.',
      });
    }

    const cloudinary = getCloudinary();
    const uploaded = await cloudinary.uploader.upload(image, {
      folder: `weddingpass/${mapping.eventId}`,
      resource_type: 'image',
      transformation: [{ quality: 'auto' }],
    });

    const photo = {
      guestId: mapping.guestId,
      guestName: guest.fullName,
      cloudinaryUrl: uploaded.secure_url,
      cloudinaryPublicId: uploaded.public_id,
      takenAt: Timestamp.now(),
      uploadedAt: Timestamp.now(),
      votes: 0,
      voters: [],
    };

    const doc = await eventRef.collection('photos').add(photo);

    return res.status(201).json({
      photo: {
        id: doc.id,
        ...photo,
        takenAt: photo.takenAt.toDate().toISOString(),
        uploadedAt: photo.uploadedAt.toDate().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/** GET /api/upload/:eventId — liste des photos, cote organisateur. */
router.get('/:id', requireAuth, requireEventOwner, async (req, res, next) => {
  try {
    const snapshot = await adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('photos')
      .get();

    const photos = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        takenAt: data.takenAt?.toDate?.().toISOString() ?? null,
        uploadedAt: data.uploadedAt?.toDate?.().toISOString() ?? null,
      };
    });

    // Tri en memoire : evite un index et la volumetrie reste modeste
    photos.sort((a, b) => new Date(b.uploadedAt ?? 0) - new Date(a.uploadedAt ?? 0));

    return res.json({ photos });
  } catch (error) {
    return next(error);
  }
});

/** DELETE /api/upload/:id/:photoId — suppression par l'organisateur (CDC §7.4). */
router.delete('/:id/:photoId', requireAuth, requireEventOwner, async (req, res, next) => {
  try {
    const photoRef = adminDb
      .collection('events')
      .doc(req.params.id)
      .collection('photos')
      .doc(req.params.photoId);

    const snapshot = await photoRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Photo introuvable.' });
    }

    const { cloudinaryPublicId } = snapshot.data();

    // On retire d'abord le fichier du CDN, puis sa reference
    if (cloudinaryPublicId) {
      try {
        await getCloudinary().uploader.destroy(cloudinaryPublicId);
      } catch (caught) {
        // Fichier deja absent du CDN : la suppression Firestore reste pertinente
        console.error('[WeddingPass] Suppression Cloudinary echouee :', caught.message);
      }
    }

    await photoRef.delete();
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
