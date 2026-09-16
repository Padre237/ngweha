/**
 * Utilitaires transverses : formatage francais, dates, phases, avatars.
 */
import { DAY_OF_WINDOW_HOURS, GUEST_PHASE, SECRET_UNLOCK_HOURS } from './constants.js';

/** Convertit un Timestamp Firestore, une Date ou une string ISO en Date JS. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate(); // Timestamp Firestore
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** « Samedi 14 decembre 2025 a 18h00 » (CDC §6.3) */
export function formatEventDate(value) {
  const date = toDate(value);
  if (!date) return '';
  const day = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
  return `${capitalized} a ${hours}h${minutes}`;
}

/** « 14 dec. 2025 » — format court pour les listes */
export function formatShortDate(value) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** « 18:34 » — horodatage des scans */
export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

/**
 * Determine la phase de l'evenement telle que la Guest Page doit s'afficher (CDC §6.3-6.5).
 * Avant < eventDate-12h · Jour J dans ±12h · Apres > eventDate+24h.
 */
export function getEventPhase(eventDate, now = new Date()) {
  const date = toDate(eventDate);
  if (!date) return GUEST_PHASE.BEFORE;

  const windowMs = DAY_OF_WINDOW_HOURS * 3600 * 1000;
  const afterMs = SECRET_UNLOCK_HOURS * 3600 * 1000;

  if (now.getTime() < date.getTime() - windowMs) return GUEST_PHASE.BEFORE;
  if (now.getTime() > date.getTime() + afterMs) return GUEST_PHASE.AFTER;
  return GUEST_PHASE.DAY_OF;
}

/** Decompose l'ecart jusqu'a la date cible pour le compte a rebours (CDC §5.3). */
export function getCountdown(targetDate, now = new Date()) {
  const date = toDate(targetDate);
  if (!date) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };

  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isPast: false,
  };
}

/** Initiales d'un nom complet : « Emmanuel Ngan » → « EN » */
export function getInitials(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Couleur d'avatar assignee par hash du nom — toujours coherente pour un meme
 * invite (Charte ch.05). Les teintes restent dans la palette autorisee.
 */
const AVATAR_PALETTE = [
  'var(--color-primary)',
  'var(--color-primary-light)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-dark)',
  'var(--color-grey)',
];

export function getAvatarColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Normalise un numero camerounais en format international pour WhatsApp. */
export function normalizePhone(phone = '', defaultCountryCode = '237') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith(defaultCountryCode)) return digits;
  return `${defaultCountryCode}${digits.replace(/^0+/, '')}`;
}

/** Pourcentage borne a [0, 100], utile pour toutes les barres de progression. */
export function toPercent(value, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/** Concatene des classes CSS en ignorant les valeurs falsy. */
export function cx(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

/** Retarde l'execution d'une fonction — utilise sur les champs de recherche (CDC §9.2). */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
