/**
 * Enregistrement du service worker (CDC §8.1 phase 13).
 * Uniquement en production : en dev, il masquerait les rechargements de Vite.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[WeddingPass] Service worker non enregistre :', error);
    });
  });
}
