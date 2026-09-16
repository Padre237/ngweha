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

/**
 * Normalise la cle privee quel que soit son mode de saisie.
 *
 * Selon l'interface utilisee, une cle PEM arrive avec de vrais sauts de ligne,
 * avec des \n echappes, entouree de guillemets, ou encodee en base64. Mal
 * interpretee, OpenSSL echoue sur ERR_OSSL_UNSUPPORTED et le SDK ne peut plus
 * ni signer ni verifier — panne opaque et couteuse a diagnostiquer.
 */
function normalizePrivateKey(raw) {
  let key = String(raw || '').trim();
  if (!key) return '';

  // Guillemets ajoutes par un copier-coller depuis un fichier JSON
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Cle fournie entierement en base64 plutot qu'en PEM
  if (!key.includes('-----BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN')) key = decoded.trim();
    } catch {
      // Ce n'etait pas du base64 : on poursuit avec la valeur d'origine
    }
  }

  // Sauts de ligne echappes, avec ou sans retour chariot
  key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  if (!key.endsWith('\n')) key += '\n';

  return key;
}

function createApp() {
  // Une fonction serverless peut etre reutilisee a chaud : on evite la double init
  if (getApps().length > 0) return getApp();

  assertCredentials();

  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  // Echouer ici, avec un message explicite, vaut mieux que laisser OpenSSL
  // lever un ERR_OSSL_UNSUPPORTED indechiffrable au premier appel
  if (!privateKey.includes('-----BEGIN') || !privateKey.includes('PRIVATE KEY-----')) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY ne contient pas une cle PEM valide. Elle doit commencer ' +
        'par -----BEGIN PRIVATE KEY----- et inclure les sauts de ligne.'
    );
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
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
