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

/**
 * Firestore parle gRPC sur HTTP/2 par defaut. Les fonctions serverless Vercel
 * ne maintiennent pas ce type de connexion : les appels restent suspendus
 * jusqu'a FUNCTION_INVOCATION_TIMEOUT au lieu de repondre.
 *
 * `preferRest` bascule le SDK sur l'API REST en HTTP/1.1, qui traverse sans
 * probleme. Le reglage doit precede toute operation Firestore, d'ou sa place
 * immediatement apres l'initialisation.
 */
function createFirestore() {
  const firestore = getFirestore(app);

  try {
    firestore.settings({ preferRest: true });
  } catch (error) {
    // settings() leve si une operation a deja eu lieu — sans consequence
    // lors d'une reutilisation a chaud de l'instance serverless
    if (!String(error.message).includes('already')) throw error;
  }

  return firestore;
}

export const adminDb = createFirestore();
export const adminAuth = getAuth(app);
export default app;
