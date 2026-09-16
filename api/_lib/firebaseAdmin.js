/**
 * Firebase Admin SDK — utilise uniquement cote serveur.
 * Les identifiants proviennent des variables d'environnement Vercel (CDC §1.4).
 */
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const REQUIRED_VARS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

function assertCredentials() {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

  // Sans ce controle, initializeApp echoue plus tard sur une erreur peu lisible
  if (missing.length > 0) {
    throw new Error(
      `Identifiants Firebase Admin manquants : ${missing.join(', ')}.\n` +
        'Console Firebase > Parametres du projet > Comptes de service > ' +
        'Generer une nouvelle cle privee, puis reportez les valeurs dans .env.'
    );
  }
}

function createApp() {
  // Une fonction serverless peut etre reutilisee a chaud : on evite la double init
  if (getApps().length > 0) return getApp();

  assertCredentials();

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // La cle privee est stockee avec des \n echappes dans les variables d'env
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const app = createApp();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export default app;
