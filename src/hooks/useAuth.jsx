import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';

const AuthContext = createContext(null);

/**
 * Cle de stockage temporaire de l'email pour le flow Magic Link.
 * Ce n'est pas une donnee metier (celles-ci restent dans Firestore, CDC §10.1) :
 * c'est un artefact de session exige par le flow Firebase, efface des la connexion.
 */
const MAGIC_LINK_EMAIL_KEY = 'wp:magic-link-email';

/** Fournit l'etat d'authentification et les actions associees a toute l'app. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // `initializing` couvre le premier aller-retour Firebase : sans lui, les routes
  // protegees redirigeraient vers /login au rechargement d'une session valide.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
          setProfile(snapshot.exists() ? { uid: firebaseUser.uid, ...snapshot.data() } : null);
        } catch (error) {
          console.error('[WeddingPass] Profil utilisateur illisible :', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  /** Cree le document users/{uid} s'il n'existe pas encore (CDC §2.2). */
  const ensureUserProfile = useCallback(async (firebaseUser, displayName) => {
    const reference = doc(db, 'users', firebaseUser.uid);
    const snapshot = await getDoc(reference);

    if (snapshot.exists()) {
      setProfile({ uid: firebaseUser.uid, ...snapshot.data() });
      return;
    }

    const data = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: displayName || firebaseUser.displayName || '',
      role: 'planner',
      whatsappNumber: '',
      createdAt: serverTimestamp(),
    };

    await setDoc(reference, data);
    setProfile({ uid: firebaseUser.uid, ...data });
  }, []);

  /** Inscription email + mot de passe, puis envoi de l'email de verification. */
  const register = useCallback(
    async ({ email, password, displayName }) => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      await ensureUserProfile(credential.user, displayName);
      await sendEmailVerification(credential.user);

      // L'utilisateur doit verifier son email avant d'acceder a l'admin (CDC §4.2)
      await signOut(auth);
      return credential.user;
    },
    [ensureUserProfile]
  );

  /** Connexion classique email + mot de passe. */
  const login = useCallback(
    async ({ email, password }) => {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserProfile(credential.user);
      return credential.user;
    },
    [ensureUserProfile]
  );

  /** Envoie le lien de connexion sans mot de passe (CDC §4.1). */
  const sendMagicLink = useCallback(async (email) => {
    const cleaned = email.trim();

    await sendSignInLinkToEmail(auth, cleaned, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    });

    try {
      window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, cleaned);
    } catch {
      // Navigation privee : l'email sera redemande au retour du lien
    }
  }, []);

  /** Indique si l'URL courante est un lien de connexion Firebase. */
  const isMagicLink = useCallback((url = window.location.href) => isSignInWithEmailLink(auth, url), []);

  /** Recupere l'email memorise a l'envoi du lien, si disponible. */
  const getStoredMagicLinkEmail = useCallback(() => {
    try {
      return window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  }, []);

  /** Termine la connexion Magic Link. */
  const completeMagicLink = useCallback(
    async (email, url = window.location.href) => {
      const credential = await signInWithEmailLink(auth, email.trim(), url);
      await ensureUserProfile(credential.user);

      try {
        window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY);
      } catch {
        // Sans importance : la cle expire avec le navigateur
      }

      return credential.user;
    },
    [ensureUserProfile]
  );

  /** Renvoie l'email de verification a l'utilisateur connecte (CDC §4.2). */
  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Aucune session active.');
    await sendEmailVerification(auth.currentUser);
  }, []);

  /** Recharge l'utilisateur Firebase pour detecter une verification faite ailleurs. */
  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return null;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
    return auth.currentUser;
  }, []);

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      initializing,
      isAuthenticated: Boolean(user),
      isEmailVerified: Boolean(user?.emailVerified),
      register,
      login,
      logout,
      sendMagicLink,
      isMagicLink,
      getStoredMagicLinkEmail,
      completeMagicLink,
      resendVerificationEmail,
      refreshUser,
      resetPassword,
    }),
    [
      user,
      profile,
      initializing,
      register,
      login,
      logout,
      sendMagicLink,
      isMagicLink,
      getStoredMagicLinkEmail,
      completeMagicLink,
      resendVerificationEmail,
      refreshUser,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Accede a l'etat d'authentification depuis n'importe quel composant. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit etre utilise a l\'interieur de <AuthProvider>.');
  }
  return context;
}
