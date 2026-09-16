/**
 * Valeurs autorisees, partagees entre les validateurs backend.
 * Miroir de src/lib/constants.js — les deux doivent rester synchronises (CDC §2).
 */
export const EVENT_STATUS_VALUES = ['draft', 'active', 'completed'];
export const GUEST_CATEGORY_VALUES = ['VIP', 'Famille', 'Amis', 'Collegues'];
export const RSVP_STATUS_VALUES = ['pending', 'confirmed', 'declined'];
export const SCAN_STATUS_VALUES = ['not_scanned', 'scanned'];

/** Deblocage des messages secrets : eventDate + 24h (CDC §5.9). */
export const SECRET_UNLOCK_HOURS = 24;
