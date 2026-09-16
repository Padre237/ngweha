/**
 * Formatage partage cote serveur.
 * Duplique volontairement quelques fonctions de src/lib/utils.js : le backend
 * et le frontend sont deux bundles distincts, sans code partage.
 */

/** « samedi 14 decembre 2025 a 18h00 » pour les messages WhatsApp (CDC §7.7). */
export function formatEventDateFr(value) {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return '';

  const formatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Douala',
  }).format(date);

  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Douala',
  }).format(date);

  return `${formatted} a ${time.replace(':', 'h')}`;
}

/** Normalise un numero au format international attendu par WhatsApp. */
export function normalizePhone(phone = '', defaultCountryCode = '237') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith(defaultCountryCode)) return digits;
  return `${defaultCountryCode}${digits.replace(/^0+/, '')}`;
}
