/**
 * Retours sensoriels du scanner : sons et confettis (CDC §5.5, Charte ch.07).
 *
 * Les sons sont synthetises via l'API Web Audio plutot que charges depuis des
 * fichiers : aucun octet supplementaire a telecharger, et aucune latence au
 * premier scan — ce qui compte pour tenir la cible d'une seconde (CDC §9.1).
 */

let audioContext = null;

/**
 * Le contexte audio ne peut demarrer qu'apres une interaction utilisateur.
 * On le cree paresseusement, au premier son demande.
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();

  return audioContext;
}

/** Joue une note simple. */
function playTone({ frequency, duration, startAt = 0, type = 'sine', volume = 0.15 }) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const start = context.currentTime + startAt;
  // Enveloppe courte : evite le claquement audible d'une coupure nette
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + duration);
}

/** Deux notes ascendantes — accès autorisé. */
export function playSuccessSound() {
  playTone({ frequency: 880, duration: 0.12 });
  playTone({ frequency: 1320, duration: 0.18, startAt: 0.1 });
}

/** Note grave et breve — QR deja utilise. */
export function playWarningSound() {
  playTone({ frequency: 440, duration: 0.2, type: 'triangle' });
}

/** Deux notes descendantes — QR invalide. */
export function playErrorSound() {
  playTone({ frequency: 320, duration: 0.18, type: 'square', volume: 0.1 });
  playTone({ frequency: 200, duration: 0.25, startAt: 0.14, type: 'square', volume: 0.1 });
}

/**
 * Confettis de celebration, uniquement sur un scan reussi.
 * C'est le seul moment d'animation festive de l'application (Charte ch.07).
 */
export async function fireConfetti() {
  // Import dynamique : la bibliotheque ne pese sur aucun autre ecran
  const { default: confetti } = await import('canvas-confetti');

  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#C1440E', '#FFFFFF'],
    disableForReducedMotion: true,
  });
}

/** Vibration courte sur mobile, si le navigateur le permet. */
export function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
