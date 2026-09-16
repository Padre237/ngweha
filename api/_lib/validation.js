/**
 * Validation des entrees avant toute ecriture Firestore (CDC §9.3).
 * Chaque validateur renvoie { valid, errors, data } : `data` est la version
 * nettoyee, seule autorisee a etre persistee.
 */
import {
  EVENT_STATUS_VALUES,
  GUEST_CATEGORY_VALUES,
  RSVP_STATUS_VALUES,
} from './enums.js';

/** Erreur HTTP porteuse d'un statut, interceptee par le gestionnaire global. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function cleanString(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function cleanNumber(value, { min = 0, max = 100000, fallback = 0 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/** Convertit une date entrante (ISO ou timestamp) en objet Date. */
function cleanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Valide le programme de la journee : [{time, title, description}] (CDC §2.3). */
function cleanProgram(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((step) => ({
    time: cleanString(step?.time, 10),
    title: cleanString(step?.title, 120),
    description: cleanString(step?.description, 500),
  }));
}

/**
 * Valide la creation ou la mise a jour d'un evenement (CDC §2.3).
 * @param {object} body
 * @param {boolean} partial  true pour un PUT : seuls les champs fournis sont valides.
 */
export function validateEvent(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  // ── Champs requis a la creation ──
  if (!partial || body.brideName !== undefined) {
    const brideName = cleanString(body.brideName, 80);
    if (!brideName) errors.push('Le prenom de la mariee est requis.');
    data.brideName = brideName;
  }

  if (!partial || body.groomName !== undefined) {
    const groomName = cleanString(body.groomName, 80);
    if (!groomName) errors.push('Le prenom du marie est requis.');
    data.groomName = groomName;
  }

  if (!partial || body.eventDate !== undefined) {
    const eventDate = cleanDate(body.eventDate);
    if (!eventDate) errors.push('La date du mariage est requise et doit etre valide.');
    data.eventDate = eventDate;
  }

  if (!partial || body.venue !== undefined) {
    const venue = cleanString(body.venue, 160);
    if (!venue) errors.push('Le lieu de reception est requis.');
    data.venue = venue;
  }

  // ── Capacite ──
  if (!partial || body.maxGuests !== undefined) {
    data.maxGuests = cleanNumber(body.maxGuests, { min: 1, max: 10000, fallback: 100 });
  }
  if (!partial || body.tablesCount !== undefined) {
    data.tablesCount = cleanNumber(body.tablesCount, { min: 1, max: 500, fallback: 10 });
  }
  if (!partial || body.seatsPerTable !== undefined) {
    data.seatsPerTable = cleanNumber(body.seatsPerTable, { min: 1, max: 50, fallback: 10 });
  }

  // ── Champs optionnels ──
  if (!partial || body.venueAddress !== undefined) {
    data.venueAddress = cleanString(body.venueAddress, 300);
  }
  if (!partial || body.dressCode !== undefined) {
    data.dressCode = cleanString(body.dressCode, 300);
  }
  if (!partial || body.program !== undefined) {
    data.program = cleanProgram(body.program);
  }
  if (!partial || body.status !== undefined) {
    const status = cleanString(body.status, 20);
    if (status && !EVENT_STATUS_VALUES.includes(status)) {
      errors.push('Statut d\'evenement invalide.');
    }
    data.status = status || 'draft';
  }

  // La capacite declaree doit rester coherente avec le nombre de places assises
  if (data.maxGuests && data.tablesCount && data.seatsPerTable) {
    const seating = data.tablesCount * data.seatsPerTable;
    if (seating < data.maxGuests) {
      errors.push(
        `Capacite incoherente : ${data.tablesCount} tables x ${data.seatsPerTable} places = ${seating} places, pour ${data.maxGuests} invites annonces.`
      );
    }
  }

  return { valid: errors.length === 0, errors, data };
}

/**
 * Valide la creation ou la mise a jour d'un invite (CDC §2.4, §5.4).
 * @param {object} body
 * @param {boolean} partial  true pour un PUT : seuls les champs fournis sont valides.
 */
export function validateGuest(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.fullName !== undefined) {
    const fullName = cleanString(body.fullName, 120);
    if (!fullName) errors.push("Le nom complet de l'invite est requis.");
    data.fullName = fullName;
  }

  if (!partial || body.category !== undefined) {
    const category = cleanString(body.category, 20);
    if (!GUEST_CATEGORY_VALUES.includes(category)) {
      errors.push(`Categorie invalide. Valeurs acceptees : ${GUEST_CATEGORY_VALUES.join(', ')}.`);
    }
    data.category = category;
  }

  if (!partial || body.companions !== undefined) {
    data.companions = cleanNumber(body.companions, { min: 0, max: 10, fallback: 0 });
  }

  // tableNumber absent ou null demande une attribution automatique (CDC §5.4)
  if (!partial || body.tableNumber !== undefined) {
    data.tableNumber =
      body.tableNumber === null || body.tableNumber === undefined || body.tableNumber === ''
        ? null
        : cleanNumber(body.tableNumber, { min: 1, max: 500, fallback: 1 });
  }

  if (!partial || body.phone !== undefined) {
    data.phone = cleanString(body.phone, 25);
  }
  if (!partial || body.notes !== undefined) {
    data.notes = cleanString(body.notes, 1000);
  }

  if (partial && body.rsvpStatus !== undefined) {
    const rsvpStatus = cleanString(body.rsvpStatus, 20);
    if (!RSVP_STATUS_VALUES.includes(rsvpStatus)) {
      errors.push('Statut RSVP invalide.');
    }
    data.rsvpStatus = rsvpStatus;
  }

  return { valid: errors.length === 0, errors, data };
}
