/**
 * Constantes metier partagees entre l'admin et la Guest Page.
 * Les valeurs proviennent du CDC §2 et de la Charte Graphique ch.05.
 */

/** Categories d'invite (CDC §2.4) */
export const GUEST_CATEGORIES = ['VIP', 'Famille', 'Amis', 'Collegues'];

/** Statuts RSVP (CDC §2.4) */
export const RSVP_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
};

/** Statuts de scan (CDC §2.4) */
export const SCAN_STATUS = {
  NOT_SCANNED: 'not_scanned',
  SCANNED: 'scanned',
};

/** Statuts d'evenement (CDC §2.3) */
export const EVENT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

/** Libelles francais des statuts, pour l'affichage */
export const RSVP_LABELS = {
  [RSVP_STATUS.PENDING]: 'En attente',
  [RSVP_STATUS.CONFIRMED]: 'Confirme',
  [RSVP_STATUS.DECLINED]: 'Decline',
};

export const SCAN_LABELS = {
  [SCAN_STATUS.NOT_SCANNED]: 'Non scanne',
  [SCAN_STATUS.SCANNED]: 'Scanne',
};

export const EVENT_LABELS = {
  [EVENT_STATUS.DRAFT]: 'Brouillon',
  [EVENT_STATUS.ACTIVE]: 'Actif',
  [EVENT_STATUS.COMPLETED]: 'Termine',
};

/** Les trois etats de la Guest Page (CDC §6.3 a §6.5) */
export const GUEST_PHASE = {
  BEFORE: 'before',
  DAY_OF: 'day_of',
  AFTER: 'after',
};

/** Regles de pagination et de saisie (CDC §5.4, §9.2) */
export const PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_COMPANIONS = 10;
export const MAX_MESSAGE_LENGTH = 500;

/** Fenetre "jour J" : eventDate ± 12h (CDC §6.4) */
export const DAY_OF_WINDOW_HOURS = 12;

/** Deblocage des messages secrets : eventDate + 24h (CDC §5.9) */
export const SECRET_UNLOCK_HOURS = 24;
