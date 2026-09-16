/**
 * Client HTTP de l'API WeddingPass.
 * Attache automatiquement l'ID token Firebase aux routes protegees (CDC §7.2).
 */
import { auth } from './firebase.js';

/** Erreur applicative portant le statut HTTP, pour un affichage cible. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, auth: needsAuth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (needsAuth) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new ApiError('Session expiree. Reconnectez-vous.', 401);
    // getIdToken rafraichit le token si necessaire (CDC §4.4)
    headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch ne rejette que sur echec reseau : on le distingue d'une erreur serveur
    throw new ApiError('Connexion au serveur impossible. Verifiez votre reseau.', 0);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.error || 'Une erreur est survenue.', response.status);
  }

  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

/** Service dedie aux evenements (CDC §7.2). */
export const eventsApi = {
  list: () => api.get('/events'),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  remove: (id) => api.delete(`/events/${id}`),
  resetScans: (id) => api.post(`/events/${id}/reset-scans`),
  purgeGuests: (id) => api.post(`/events/${id}/purge-guests`),
  importGuests: (id, guests, mode) =>
    api.post(`/events/${id}/import-guests`, { guests, mode }),
};

/** Service dedie aux invites (CDC §7.3). */
export const guestsApi = {
  list: (eventId) => api.get(`/events/${eventId}/guests`),
  create: (eventId, data) => api.post(`/events/${eventId}/guests`, data),
  update: (eventId, guestId, data) => api.put(`/events/${eventId}/guests/${guestId}`, data),
  remove: (eventId, guestId) => api.delete(`/events/${eventId}/guests/${guestId}`),
};

/**
 * Validation d'un scan (CDC §7.6).
 * L'endpoint est public, mais on transmet le token Firebase quand il existe
 * afin d'enregistrer l'agent a l'origine du scan (champ scannedBy).
 */
export const scanApi = {
  validate: (eventId, token) => api.post(`/events/${eventId}/scan`, { token }),
};

/** Galerie et suppression de photos, cote organisateur (CDC §7.4). */
export const photosApi = {
  list: (eventId) => api.get(`/upload/${eventId}`),
  remove: (eventId, photoId) => api.delete(`/upload/${eventId}/${photoId}`),
};

/** Messages laisses par les invites (CDC §5.9). */
export const messagesApi = {
  list: (eventId) => api.get(`/events/${eventId}/messages`),
  remove: (eventId, messageId) => api.delete(`/events/${eventId}/messages/${messageId}`),
};

/** Envoi des liens via WhatsApp Business API (CDC §7.5). */
export const whatsappApi = {
  send: (eventId, guestId) => api.post(`/events/${eventId}/whatsapp/send`, { guestId }),
  sendBulk: (eventId) => api.post(`/events/${eventId}/whatsapp/send-bulk`),
};
