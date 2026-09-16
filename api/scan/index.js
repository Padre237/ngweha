/**
 * Endpoint public de validation d'un scan (CDC §7.6).
 *
 * Aucune authentification Firebase : les agents d'accueil scannent depuis leurs
 * propres appareils. La protection repose sur l'impredictibilite du token
 * (64 hex) et sur un rate limiting par IP (CDC §9.3).
 */
import { Router } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, adminAuth } from '../_lib/firebaseAdmin.js';
import { isValidToken } from '../_lib/tokens.js';
import { rateLimit } from '../_lib/rateLimit.js';

const router = Router({ mergeParams: true });

// Max 30 requetes par minute et par IP (CDC §9.3)
router.use(rateLimit({ windowMs: 60_000, max: 30 }));

/**
 * Identifie l'agent si un token Firebase accompagne la requete.
 * L'endpoint reste utilisable sans authentification : on enregistre alors null.
 */
async function resolveAgentUid(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    // Token invalide ou expire : le scan reste valide, sans agent identifie
    return null;
  }
}

/**
 * POST /api/events/:id/scan
 * Corps : { token }
 *
 * Reponses : { status: 'success' | 'already_used' | 'invalid', ... }
 */
router.post('/', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim().toLowerCase();

    // Filtre les tokens malformes avant toute lecture Firestore
    if (!isValidToken(token)) {
      return res.json({ status: 'invalid', message: 'QR invalide' });
    }

    const guestsRef = adminDb.collection('events').doc(req.params.id).collection('guests');
    const agentUid = await resolveAgentUid(req);

    const result = await adminDb.runTransaction(async (transaction) => {
      // La transaction garantit qu'un scan simultane depuis deux appareils
      // ne valide l'invite qu'une seule fois (CDC §5.5, §7.6)
      const snapshot = await transaction.get(guestsRef.where('token', '==', token).limit(1));

      if (snapshot.empty) {
        return { status: 'invalid', message: 'QR invalide' };
      }

      const doc = snapshot.docs[0];
      const guest = doc.data();

      if (guest.scanStatus === 'scanned') {
        return {
          status: 'already_used',
          guestName: guest.fullName,
          tableNumber: guest.tableNumber ?? null,
          companions: guest.companions ?? 0,
          category: guest.category ?? null,
          scannedAt: guest.scannedAt?.toDate?.().toISOString() ?? null,
        };
      }

      const scannedAt = Timestamp.now();

      transaction.update(doc.ref, {
        scanStatus: 'scanned',
        scannedAt,
        scannedBy: agentUid,
        updatedAt: scannedAt,
      });

      return {
        status: 'success',
        guestName: guest.fullName,
        tableNumber: guest.tableNumber ?? null,
        companions: guest.companions ?? 0,
        category: guest.category ?? null,
        scannedAt: scannedAt.toDate().toISOString(),
      };
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
