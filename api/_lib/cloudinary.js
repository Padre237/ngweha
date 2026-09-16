/**
 * Configuration Cloudinary — cote serveur uniquement.
 * Le secret API ne doit jamais atteindre le navigateur (CDC §9.3).
 */
import { v2 as cloudinary } from 'cloudinary';

const REQUIRED_VARS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

/** Indique si l'upload est utilisable, sans faire echouer le demarrage de l'API. */
export function isCloudinaryConfigured() {
  return REQUIRED_VARS.every((name) => Boolean(process.env[name]));
}

let configured = false;

/** Configure le SDK paresseusement, au premier upload. */
export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
    const error = new Error(
      `Upload indisponible : variables Cloudinary manquantes (${missing.join(', ')}).`
    );
    error.status = 503;
    throw error;
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

/**
 * Applique les transformations d'optimisation a une URL Cloudinary (CDC §9.2).
 * f_auto choisit le format, q_auto la compression, w_ la largeur.
 */
export function buildOptimizedUrl(url, width = 400) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
