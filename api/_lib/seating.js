/**
 * Calculs de capacite et d'attribution de table (CDC §5.4, §5.6).
 * Un invite occupe 1 place + autant que d'accompagnants.
 */

/** Nombre de places consommees par un invite. */
export function seatsTakenBy(guest) {
  return 1 + (Number(guest?.companions) || 0);
}

/** Total de personnes attendues, accompagnants compris. */
export function countExpectedPeople(guests) {
  return guests.reduce((total, guest) => total + seatsTakenBy(guest), 0);
}

/**
 * Occupation de chaque table : Map<numeroTable, placesOccupees>.
 * @param {Array} guests
 * @param {string} [excludeGuestId]  Invite a ignorer, utile lors d'une modification.
 */
export function buildTableOccupancy(guests, excludeGuestId = null) {
  const occupancy = new Map();

  for (const guest of guests) {
    if (guest.id === excludeGuestId) continue;
    if (!guest.tableNumber) continue;
    occupancy.set(guest.tableNumber, (occupancy.get(guest.tableNumber) || 0) + seatsTakenBy(guest));
  }

  return occupancy;
}

/**
 * Cherche la premiere table pouvant accueillir `seatsNeeded` places.
 * @returns {number|null} Numero de table, ou null si aucune ne convient.
 */
export function findAvailableTable(occupancy, { tablesCount, seatsPerTable, seatsNeeded }) {
  for (let table = 1; table <= tablesCount; table += 1) {
    const used = occupancy.get(table) || 0;
    if (used + seatsNeeded <= seatsPerTable) return table;
  }
  return null;
}

/**
 * Verifie qu'un invite tient dans l'evenement et sur la table demandee.
 * @returns {{ok: boolean, error?: string, tableNumber?: number}}
 */
export function resolveTableAssignment({
  event,
  guests,
  seatsNeeded,
  requestedTable,
  excludeGuestId = null,
}) {
  const tablesCount = Number(event.tablesCount) || 0;
  const seatsPerTable = Number(event.seatsPerTable) || 0;
  const maxGuests = Number(event.maxGuests) || 0;

  // ── Controle de la capacite globale ──
  const others = guests.filter((guest) => guest.id !== excludeGuestId);
  const expected = countExpectedPeople(others);

  if (maxGuests && expected + seatsNeeded > maxGuests) {
    return {
      ok: false,
      error: `Capacite maximale atteinte : ${expected} personnes deja attendues sur ${maxGuests}.`,
    };
  }

  const occupancy = buildTableOccupancy(guests, excludeGuestId);

  // ── Table imposee par l'organisateur ──
  if (requestedTable) {
    if (requestedTable > tablesCount) {
      return { ok: false, error: `L'evenement ne compte que ${tablesCount} tables.` };
    }

    const used = occupancy.get(requestedTable) || 0;
    if (used + seatsNeeded > seatsPerTable) {
      return {
        ok: false,
        error: `La table ${requestedTable} est pleine (${used}/${seatsPerTable} places occupees).`,
      };
    }

    return { ok: true, tableNumber: requestedTable };
  }

  // ── Attribution automatique ──
  const table = findAvailableTable(occupancy, { tablesCount, seatsPerTable, seatsNeeded });

  if (!table) {
    return {
      ok: false,
      error: `Aucune table ne dispose de ${seatsNeeded} places consecutives. Ajoutez une table.`,
    };
  }

  return { ok: true, tableNumber: table };
}
