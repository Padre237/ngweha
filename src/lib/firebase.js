/**
 * Initialisation Firebase cote client.
 * Les cles viennent exclusivement des variables d'environnement Vite (CDC §1.4).
 */
import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Avertit tot si la config est incomplete plutot que d'echouer silencieusement au premier appel
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[WeddingPass] Configuration Firebase absente. Copiez .env.example vers .env et renseignez les cles VITE_FIREBASE_*.'
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistance LOCAL : la session survit au rechargement (CDC §4.4)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('[WeddingPass] Persistance Firebase Auth indisponible :', error);
});

export default app;
