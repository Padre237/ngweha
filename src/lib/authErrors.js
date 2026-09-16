/**
 * Traduction des codes d'erreur Firebase Auth en messages francais.
 * Firebase renvoie des codes techniques : on ne les montre jamais tels quels.
 */
const MESSAGES = {
  'auth/invalid-email': "L'adresse email n'est pas valide.",
  'auth/user-disabled': 'Ce compte a ete desactive.',
  'auth/user-not-found': 'Aucun compte ne correspond a cet email.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/email-already-in-use': 'Un compte existe deja avec cet email.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caracteres.',
  'auth/missing-password': 'Veuillez saisir votre mot de passe.',
  'auth/too-many-requests': 'Trop de tentatives. Reessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Verifiez votre reseau.',
  'auth/invalid-action-code': 'Ce lien de connexion est expire ou deja utilise.',
  'auth/expired-action-code': 'Ce lien de connexion a expire. Demandez-en un nouveau.',
  'auth/operation-not-allowed':
    "Cette methode de connexion n'est pas activee dans la console Firebase.",
  'auth/unauthorized-continue-uri':
    "Ce domaine n'est pas autorise dans Firebase Auth (Parametres > Domaines autorises).",
};

export function getAuthErrorMessage(error) {
  const code = error?.code;
  return MESSAGES[code] || "Une erreur est survenue. Veuillez reessayer.";
}

/**
 * Evalue la robustesse d'un mot de passe pour le retour temps reel
 * du formulaire d'inscription (CDC §4.2).
 *
 * @returns {{score: 0|1|2|3|4, label: string, tone: 'error'|'warning'|'success'}}
 */
export function getPasswordStrength(password = '') {
  if (!password) return { score: 0, label: '', tone: 'error' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Faible', tone: 'error' };
  if (score === 2) return { score: 2, label: 'Moyen', tone: 'warning' };
  if (score === 3) return { score: 3, label: 'Bon', tone: 'warning' };
  return { score: 4, label: 'Excellent', tone: 'success' };
}

/** Validation d'email volontairement permissive : Firebase tranche ensuite. */
export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
