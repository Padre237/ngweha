/**
 * Generation des tokens d'invitation.
 * 64 caracteres hexadecimaux non previsibles via crypto.randomBytes(32) (CDC §9.3).
 */
import { randomBytes } from 'node:crypto';

export function generateGuestToken() {
  return randomBytes(32).toString('hex');
}

/** Construit l'URL publique d'invitation a partir du token (CDC §2.4). */
export function buildInviteUrl(token) {
  const base = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  return `${base}/invite/${token}`;
}

/** Valide la forme d'un token avant toute requete Firestore. */
export function isValidToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}
