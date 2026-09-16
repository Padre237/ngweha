import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loader,
  ProgressBar,
  ProgressRing,
  useToast,
} from '../components/ui/index.js';
import { whatsappApi } from '../lib/api.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { useGuestsSnapshot } from '../hooks/useGuestsSnapshot.js';
import { useCountdown } from '../hooks/useCountdown.js';
import {
  EVENT_LABELS,
  GUEST_PHASE,
  RSVP_STATUS,
  SCAN_STATUS,
} from '../lib/constants.js';
import { formatEventDate, formatTime, getEventPhase, toDate } from '../lib/utils.js';
import '../styles/dashboard.css';

/** Carte statistique a bordure gauche orange (Charte ch.08). */
function StatCard({ label, value, total, children }) {
  return (
    <Card variant="default" stat>
      <p className="wp-stat__label">{label}</p>
      <p className="wp-stat__value">
        <span className="wp-stat__number">{value}</span>
        {total !== undefined && <span className="wp-stat__total">/ {total}</span>}
      </p>
      {children}
    </Card>
  );
}

export default function DashboardPage() {
  const toast = useToast();
  const [sendingLinks, setSendingLinks] = useState(false);
  const { activeEvent, activeEventId, loading: eventLoading } = useActiveEvent();
  const { guests, loading, error } = useGuestsSnapshot(activeEventId);
  const countdown = useCountdown(activeEvent?.eventDate);

  const phase = useMemo(
    () => getEventPhase(activeEvent?.eventDate),
    [activeEvent?.eventDate]
  );
  const isDayOf = phase === GUEST_PHASE.DAY_OF || phase === GUEST_PHASE.AFTER;

  /** Agregats calcules a chaque mise a jour temps reel des invites. */
  const stats = useMemo(() => {
    const confirmed = guests.filter((g) => g.rsvpStatus === RSVP_STATUS.CONFIRMED).length;
    const pending = guests.filter((g) => g.rsvpStatus === RSVP_STATUS.PENDING).length;
    const declined = guests.filter((g) => g.rsvpStatus === RSVP_STATUS.DECLINED).length;
    const scanned = guests.filter((g) => g.scanStatus === SCAN_STATUS.SCANNED).length;

    // Un invite occupe sa place plus celles de ses accompagnants
    const expectedPeople = guests.reduce((total, g) => total + 1 + (g.companions || 0), 0);

    // Une table est complete quand elle n'a plus de place libre
    const seatsPerTable = Number(activeEvent?.seatsPerTable) || 0;
    const occupancy = new Map();
    for (const guest of guests) {
      if (!guest.tableNumber) continue;
      occupancy.set(
        guest.tableNumber,
        (occupancy.get(guest.tableNumber) || 0) + 1 + (guest.companions || 0)
      );
    }
    const fullTables = [...occupancy.values()].filter((used) => used >= seatsPerTable).length;

    const linksToSend = guests.filter((g) => g.phone && !g.linkSentAt).length;

    return { confirmed, pending, declined, scanned, expectedPeople, fullTables, linksToSend };
  }, [guests, activeEvent]);

  /** Les 10 derniers scans, du plus recent au plus ancien (CDC §5.3). */
  const liveFeed = useMemo(
    () =>
      guests
        .filter((g) => g.scanStatus === SCAN_STATUS.SCANNED && g.scannedAt)
        .sort((a, b) => toDate(b.scannedAt) - toDate(a.scannedAt))
        .slice(0, 10),
    [guests]
  );

  /** Envoi groupe des liens non encore transmis (CDC §5.3). */
  async function handleSendLinks() {
    setSendingLinks(true);
    try {
      const result = await whatsappApi.sendBulk(activeEventId);
      if (result.failed > 0) {
        toast.warning('Envoi partiel', `${result.sent} envoyes, ${result.failed} en echec.`);
      } else {
        toast.success('Liens envoyes', `${result.sent} invites notifies.`);
      }
    } catch (caught) {
      toast.error('Envoi impossible', caught.message);
    } finally {
      setSendingLinks(false);
    }
  }

  if (eventLoading) {
    return <Loader size={32} label="Chargement de l'evenement…" />;
  }

  if (!activeEventId || !activeEvent) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour afficher son tableau de bord."
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

  const tablesCount = Number(activeEvent.tablesCount) || 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${activeEvent.groomName} & ${activeEvent.brideName} · ${formatEventDate(
          activeEvent.eventDate
        )}`}
      />

      {/* ── Barre superieure : compte a rebours + statut ── */}
      <div className="wp-dash__topbar">
        <div>
          <p className="wp-dash__countdown-label">
            {countdown.isPast ? 'Evenement passe' : 'Compte a rebours'}
          </p>
          {countdown.isPast ? (
            <p className="wp-dash__unit-value">Le grand jour est arrive</p>
          ) : (
            <div className="wp-dash__countdown">
              {[
                { value: countdown.days, label: 'jours' },
                { value: countdown.hours, label: 'h' },
                { value: countdown.minutes, label: 'min' },
                { value: countdown.seconds, label: 's' },
              ].map((unit, index) => (
                <span key={unit.label} className="wp-dash__unit">
                  {index > 0 && <span className="wp-dash__separator">·</span>}
                  <span className="wp-dash__unit-value">{unit.value}</span>
                  <span className="wp-dash__unit-label">{unit.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <Badge status={activeEvent.status} dot>
          {EVENT_LABELS[activeEvent.status] || activeEvent.status}
        </Badge>
      </div>

      {error && <ErrorState description={error} />}

      {loading && <Loader size={28} label="Chargement des invites…" />}

      {!loading && !error && (
        <>
          {/* ── 4 cartes statistiques (CDC §5.3) ── */}
          <div className="wp-dash__stats">
            <StatCard label="Invites crees" value={guests.length} total={activeEvent.maxGuests}>
              <ProgressBar
                value={stats.expectedPeople}
                total={activeEvent.maxGuests || 0}
                label="Personnes attendues"
                showValue={false}
              />
            </StatCard>

            <StatCard label="Confirmes" value={stats.confirmed} total={guests.length}>
              <div className="wp-stat__breakdown">
                <Badge status={RSVP_STATUS.PENDING}>{stats.pending} en attente</Badge>
                <Badge status={RSVP_STATUS.DECLINED}>{stats.declined} declines</Badge>
              </div>
            </StatCard>

            <StatCard label="Presents le jour J" value={stats.scanned} total={guests.length}>
              <span className="wp-caption">
                {isDayOf ? 'Mise a jour en temps reel' : "Comptage actif le jour de l'evenement"}
              </span>
            </StatCard>

            <StatCard label="Tables completes" value={stats.fullTables} total={tablesCount}>
              <span className="wp-caption">
                {Math.max(0, tablesCount - stats.fullTables)} tables encore disponibles
              </span>
            </StatCard>
          </div>

          {/* ── Jauge circulaire + live feed ── */}
          <div className="wp-dash__split">
            <Card variant="elevated">
              <div className="wp-dash__gauge">
                <ProgressRing
                  value={isDayOf ? stats.scanned : stats.confirmed}
                  total={guests.length || 1}
                  caption={isDayOf ? 'presents' : 'confirmes'}
                />
                <p className="wp-dash__gauge-caption">
                  {isDayOf
                    ? `${stats.scanned} invites sur ${guests.length} sont arrives`
                    : `${stats.confirmed} invites sur ${guests.length} ont confirme leur presence`}
                </p>
              </div>
            </Card>

            {/* Le live feed n'apparait que le jour J (CDC §5.3) */}
            {isDayOf ? (
              <Card variant="elevated" title="Derniers scans">
                {liveFeed.length === 0 ? (
                  <EmptyState
                    title="Aucun scan pour l'instant"
                    description="Les arrivees s'afficheront ici en temps reel."
                  />
                ) : (
                  <div className="wp-feed">
                    {liveFeed.map((guest) => (
                      <div key={guest.id} className="wp-feed__row">
                        <Avatar name={guest.fullName} size="sm" />
                        <div className="wp-feed__identity">
                          <p className="wp-feed__name">{guest.fullName}</p>
                          <p className="wp-feed__meta">
                            Table {guest.tableNumber}
                            {guest.companions > 0 && ` · +${guest.companions}`}
                          </p>
                        </div>
                        <Badge category={guest.category}>{guest.category}</Badge>
                        <span className="wp-feed__time">{formatTime(guest.scannedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card variant="elevated" title="Preparation">
                <EmptyState
                  title="Le suivi des arrivees demarre le jour J"
                  description="Les scans s'afficheront ici en direct pendant la reception."
                />
              </Card>
            )}
          </div>

          {/* ── Actions rapides (CDC §5.3) ── */}
          <Card variant="default" title="Actions rapides">
            <div className="wp-dash__actions">
              <Link to="/guests">
                <Button size="sm">Ajouter un invite</Button>
              </Link>
              <Link to="/scanner">
                <Button size="sm" variant="secondary">
                  Scanner
                </Button>
              </Link>
              <Link to="/seating">
                <Button size="sm" variant="secondary">
                  Plan de salle
                </Button>
              </Link>
              <Link to="/settings">
                <Button size="sm" variant="ghost">
                  Parametres
                </Button>
              </Link>

              {stats.linksToSend > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={sendingLinks}
                  onClick={handleSendLinks}
                >
                  Envoyer {stats.linksToSend} lien{stats.linksToSend > 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
