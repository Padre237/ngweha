/**
 * Exports CSV et JSON de la liste d'invites (CDC §5.4).
 * Tout se fait cote client : aucune donnee ne transite par un service tiers.
 */

/** Echappe une valeur pour le format CSV (RFC 4180). */
function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);
  // Les guillemets se doublent, et tout champ contenant un separateur est entoure
  if (/[";\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Colonnes exportees, dans l'ordre d'affichage. */
const CSV_COLUMNS = [
  { key: 'fullName', label: 'Nom complet' },
  { key: 'category', label: 'Categorie' },
  { key: 'companions', label: 'Accompagnants' },
  { key: 'tableNumber', label: 'Table' },
  { key: 'phone', label: 'Telephone' },
  { key: 'rsvpStatus', label: 'RSVP' },
  { key: 'scanStatus', label: 'Scan' },
  { key: 'scannedAt', label: 'Heure du scan' },
  { key: 'inviteUrl', label: "Lien d'invitation" },
  { key: 'notes', label: 'Notes' },
];

/** Declenche le telechargement d'un fichier genere en memoire. */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libere l'objet une fois le telechargement lance
  URL.revokeObjectURL(url);
}

/** Nom de fichier lisible et sans caracteres problematiques. */
function buildFilename(event, extension) {
  const names = `${event?.groomName ?? ''}-${event?.brideName ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const date = new Date().toISOString().slice(0, 10);
  return `invites-${names || 'weddingpass'}-${date}.${extension}`;
}

/**
 * Exporte les invites au format CSV.
 * Le separateur est le point-virgule : Excel en francais l'attend par defaut.
 */
export function exportGuestsToCsv(guests, event) {
  const header = CSV_COLUMNS.map((column) => escapeCsv(column.label)).join(';');
  const rows = guests.map((guest) =>
    CSV_COLUMNS.map((column) => escapeCsv(guest[column.key])).join(';')
  );

  // Le BOM force Excel a lire le fichier en UTF-8 (accents corrects)
  const content = `\uFEFF${[header, ...rows].join('\r\n')}`;

  downloadFile(content, buildFilename(event, 'csv'), 'text/csv');
}

/** Exporte l'evenement et ses invites au format JSON (CDC §5.10). */
export function exportGuestsToJson(guests, event) {
  const payload = {
    exportedAt: new Date().toISOString(),
    event: event
      ? {
          id: event.id,
          groomName: event.groomName,
          brideName: event.brideName,
          eventDate: event.eventDate,
          venue: event.venue,
          maxGuests: event.maxGuests,
          tablesCount: event.tablesCount,
          seatsPerTable: event.seatsPerTable,
        }
      : null,
    guests,
  };

  downloadFile(JSON.stringify(payload, null, 2), buildFilename(event, 'json'), 'application/json');
}
