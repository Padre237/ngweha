/**
 * Table de correspondance token -> invite.
 *
 * Le document porte le token comme identifiant : retrouver un invite depuis son
 * lien devient une lecture unique par cle, sans requete ni index composite a
 * deployer. C'est le chemin le plus chaud de l'application — la Guest Page vise
 * moins d'1,5 s en 3G (CDC §9.1).
 *
 * Cette collection est un index technique, jamais exposee au client : les regles
 * Firestore la refusent par defaut, seul l'Admin SDK y accede.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.js';

const COLLECTION = 'invite_tokens';

/** Enregistre la correspondance a la creation d'un invite. */
export async function registerInviteToken(token, { eventId, guestId }) {
  await adminDb.collection(COLLECTION).doc(token).set({
    eventId,
    guestId,
    createdAt: Timestamp.now(),
  });
}

/** Supprime la correspondance — le lien cesse aussitot de fonctionner. */
export async function revokeInviteToken(token) {
  if (!token) return;
  await adminDb.collection(COLLECTION).doc(token).delete();
}

/** Resout un token en { eventId, guestId }, ou null. */
export async function resolveInviteToken(token) {
  const snapshot = await adminDb.collection(COLLECTION).doc(token).get();
  return snapshot.exists ? snapshot.data() : null;
}

/** Supprime toutes les correspondances d'un evenement, par lots. */
export async function revokeEventTokens(eventId, batchSize = 400) {
  let total = 0;

  for (;;) {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('eventId', '==', eventId)
      .limit(batchSize)
      .get();

    if (snapshot.empty) return total;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    total += snapshot.size;
    if (snapshot.size < batchSize) return total;
  }
}
