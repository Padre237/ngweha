/**
 * Middleware d'authentification : verifie l'ID token Firebase envoye par le client
 * dans l'en-tete Authorization (CDC §7.2).
 */
import { adminAuth, adminDb } from './firebaseAdmin.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    return next();
  } catch (error) {
    // Un message generique rend le diagnostic impossible en production : on
    // journalise la cause reelle et on renvoie le code Firebase, qui n'est pas
    // une donnee sensible et oriente immediatement vers le bon reglage.
    console.error('[WeddingPass] verifyIdToken a echoue :', error.code, error.message);

    return res.status(401).json({
      error: 'Session expiree ou invalide.',
      code: error.code || 'auth/unknown',
      hint:
        error.code === 'auth/argument-error'
          ? "Le projet Firebase du serveur ne correspond probablement pas a celui du client."
          : undefined,
    });
  }
}

/**
 * Verifie que l'utilisateur authentifie est bien proprietaire de l'evenement.
 * Aucun organisateur ne doit pouvoir lire les donnees d'un autre (CDC §9.3).
 * A chainer apres requireAuth sur toute route portant un :id d'evenement.
 */
export async function requireEventOwner(req, res, next) {
  const eventId = req.params.id || req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ error: 'Identifiant d\'evenement manquant.' });
  }

  try {
    const snapshot = await adminDb.collection('events').doc(eventId).get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Evenement introuvable.' });
    }
    if (snapshot.data().ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Acces refuse a cet evenement.' });
    }

    req.event = { id: snapshot.id, ...snapshot.data() };
    return next();
  } catch (error) {
    return next(error);
  }
}
