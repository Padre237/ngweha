/**
 * Point d'entree unique de l'API (Vercel Serverless).
 * vercel.json route tous les appels /api/* vers ce fichier (CDC §1.3, §7.1).
 */
import express from 'express';
import cors from 'cors';
import eventsRouter from './events/index.js';
import guestsRouter from './guests/index.js';
import scanRouter from './scan/index.js';
import inviteRouter from './invite/index.js';
import uploadRouter from './upload/index.js';
import messagesRouter from './messages/index.js';
import whatsappRouter from './whatsapp/index.js';

const app = express();

// CORS restreint au domaine de production en dehors du dev local (CDC §9.3)
const allowedOrigins = [process.env.APP_BASE_URL, 'http://localhost:5173'].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Les requetes sans Origin (curl, health checks) restent autorisees
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origine non autorisee'));
    },
    credentials: true,
  })
);

// Les photos arrivent en base64 : compressees a 800px cote client, elles
// pesent quelques centaines de Ko, l'encodage ajoutant environ un tiers
app.use(express.json({ limit: '8mb' }));

/**
 * Verification de disponibilite et de configuration.
 *
 * Expose le projet Firebase vu par le serveur : il doit etre identique au
 * VITE_FIREBASE_PROJECT_ID du client, sinon verifyIdToken rejette tous les
 * tokens. Ces valeurs ne sont pas secretes — le projectId figure deja dans
 * le bundle JavaScript envoye au navigateur.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'weddingpass-api',
    timestamp: new Date().toISOString(),
    config: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || null,
      // On confirme la presence des secrets sans jamais les divulguer
      hasFirebaseClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      hasFirebasePrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      appBaseUrl: process.env.APP_BASE_URL || null,
      hasCloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
      hasWhatsApp: Boolean(process.env.WHATSAPP_API_TOKEN),
    },
  });
});

// ── Routeurs montes au fil des phases du CDC §8.1 ──────────────
// Les invites sont montes avant les evenements : sans cela, /api/events/:id
// capterait la requete avant d'atteindre la sous-ressource.
app.use('/api/invite', inviteRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/events/:id/scan', scanRouter);
app.use('/api/events/:id/messages', messagesRouter);
app.use('/api/events/:id/whatsapp', whatsappRouter);
app.use('/api/events/:id/guests', guestsRouter);
app.use('/api/events', eventsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

// Gestionnaire d'erreurs — ne fuit jamais la stack en production
// Les 4 parametres sont ce qui signale un gestionnaire d'erreurs a Express :
// `_next` doit rester declare bien qu'inutilise.
app.use((error, req, res, _next) => {
  console.error('[API]', error);
  res.status(error.status || 500).json({
    error: error.status ? error.message : 'Erreur serveur interne.',
  });
});

export default app;
