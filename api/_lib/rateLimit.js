/**
 * Rate limiting en memoire — protege l'endpoint public de scan
 * (max 30 requetes/minute par IP, CDC §9.3).
 *
 * Note : l'etat vit dans l'instance serverless. Suffisant pour la v1 ou le scan
 * provient d'un petit nombre d'appareils sur place.
 */
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  return (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'inconnu';
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Trop de requetes. Reessayez dans un instant.' });
    }

    bucket.count += 1;
    return next();
  };
}

/** Purge les compteurs expires — evite une croissance illimitee de la Map. */
export function purgeExpiredBuckets(now = Date.now()) {
  for (const [ip, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(ip);
  }
}
