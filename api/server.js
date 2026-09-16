/**
 * Serveur Express local pour le developpement.
 * En production, Vercel invoque directement api/index.js comme fonction
 * serverless et injecte lui-meme les variables d'environnement.
 */
// Doit preceder l'import de l'app : firebaseAdmin lit process.env des son evaluation
import 'dotenv/config';
import app from './index.js';

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`[WeddingPass] API locale sur http://localhost:${port}`);
});
