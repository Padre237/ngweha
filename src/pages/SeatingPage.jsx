import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import {
  Avatar,
  AvatarGroup,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SkeletonList,
  useToast,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { useGuests } from '../hooks/useGuests.js';
import { cx } from '../lib/utils.js';
import '../styles/seating.css';

/** Seuils du code couleur d'occupation (CDC §5.6). */
function getOccupancyTone(used, capacity) {
  if (used === 0) return 'empty';
  if (capacity > 0 && used >= capacity) return 'full';
  if (capacity > 0 && used / capacity >= 0.7) return 'filling';
  return 'free';
}

export default function SeatingPage() {
  const toast = useToast();
  const { activeEvent, activeEventId } = useActiveEvent();
  const { guests, loading, error, refetch, updateGuest } = useGuests(activeEventId);

  const [selectedTable, setSelectedTable] = useState(null);
  const [movingGuestId, setMovingGuestId] = useState(null);

  const seatsPerTable = Number(activeEvent?.seatsPerTable) || 0;
  const tablesCount = Number(activeEvent?.tablesCount) || 0;

  /** Repartition des invites par table, avec places consommees. */
  const tables = useMemo(() => {
    const byTable = new Map();

    for (let number = 1; number <= tablesCount; number += 1) {
      byTable.set(number, { number, guests: [], used: 0 });
    }

    for (const guest of guests) {
      const entry = byTable.get(guest.tableNumber);
      if (!entry) continue;
      entry.guests.push(guest);
      entry.used += 1 + (guest.companions || 0);
    }

    return [...byTable.values()];
  }, [guests, tablesCount]);

  const selected = tables.find((table) => table.number === selectedTable) || null;

  /** Deplace un invite vers une autre table — le serveur revalide la capacite. */
  async function handleMove(guest, tableNumber) {
    setMovingGuestId(guest.id);
    try {
      await updateGuest(guest.id, { tableNumber });
      toast.success('Invite deplace', `${guest.fullName} · Table ${tableNumber}`);
    } catch (caught) {
      toast.error('Deplacement impossible', caught.message);
    } finally {
      setMovingGuestId(null);
    }
  }

  if (!activeEventId) {
    return (
      <>
        <PageHeader title="Plan de salle" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour organiser son plan de salle."
            action={
              <Link to="/events">
                <Button>Voir mes evenements</Button>
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Plan de salle"
        subtitle={`${tablesCount} tables · ${seatsPerTable} places par table`}
      />

      <div className="wp-seating__legend">
        {[
          { tone: 'free', label: 'Disponible', color: 'var(--color-success)' },
          { tone: 'filling', label: 'Presque pleine', color: 'var(--color-warning)' },
          { tone: 'full', label: 'Complete', color: 'var(--color-error)' },
          { tone: 'empty', label: 'Vide', color: 'var(--color-grey)' },
        ].map((item) => (
          <span className="wp-seating__legend-item" key={item.tone}>
            <span className="wp-seating__dot" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      {loading && <SkeletonList rows={4} height={120} />}
      {error && <ErrorState description={error} onRetry={refetch} />}

      {!loading && !error && tablesCount === 0 && (
        <Card variant="elevated">
          <EmptyState
            title="Aucune table configuree"
            description="Definissez le nombre de tables dans les parametres de l'evenement."
            action={
              <Link to="/settings">
                <Button>Ouvrir les parametres</Button>
              </Link>
            }
          />
        </Card>
      )}

      {!loading && !error && tablesCount > 0 && (
        <div className="wp-seating">
          <div className="wp-seating__grid">
            {tables.map((table) => {
              const tone = getOccupancyTone(table.used, seatsPerTable);
              return (
                <div
                  key={table.number}
                  role="button"
                  tabIndex={0}
                  className={cx('wp-table', selectedTable === table.number && 'wp-table--selected')}
                  onClick={() => setSelectedTable(table.number)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                      keyEvent.preventDefault();
                      setSelectedTable(table.number);
                    }
                  }}
                >
                  <span className={cx('wp-table__disc', `wp-table__disc--${tone}`)}>
                    <span className="wp-table__number">{table.number}</span>
                    <span className="wp-table__ratio">
                      {table.used}/{seatsPerTable}
                    </span>
                  </span>

                  <AvatarGroup names={table.guests.map((g) => g.fullName)} max={4} />

                  <span className="wp-table__label">
                    {table.guests.length} invite{table.guests.length > 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="wp-seating__panel">
            <Card variant="elevated" title={selected ? `Table ${selected.number}` : 'Detail'}>
              {!selected && (
                <EmptyState
                  title="Selectionnez une table"
                  description="Cliquez sur une table pour voir ses invites et les deplacer."
                />
              )}

              {selected && selected.guests.length === 0 && (
                <EmptyState
                  title="Table vide"
                  description="Aucun invite n'est place a cette table."
                />
              )}

              {selected?.guests.map((guest) => (
                <div className="wp-seating__guest" key={guest.id}>
                  <Avatar name={guest.fullName} size="sm" />
                  <div className="wp-seating__guest-identity">
                    <p className="wp-seating__guest-name">{guest.fullName}</p>
                    <p className="wp-seating__guest-meta">
                      {guest.category}
                      {guest.companions > 0 && ` · +${guest.companions}`}
                    </p>
                  </div>

                  <select
                    className="wp-seating__move"
                    value={guest.tableNumber ?? ''}
                    disabled={movingGuestId === guest.id}
                    onChange={(changeEvent) =>
                      handleMove(guest, Number(changeEvent.target.value))
                    }
                    aria-label={`Deplacer ${guest.fullName}`}
                  >
                    {tables.map((table) => (
                      <option key={table.number} value={table.number}>
                        Table {table.number}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
