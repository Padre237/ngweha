import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loader,
  ProgressBar,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { useGuestsSnapshot } from '../hooks/useGuestsSnapshot.js';
import { RSVP_STATUS, SCAN_STATUS } from '../lib/constants.js';
import { formatTime, toDate, toPercent } from '../lib/utils.js';
import '../styles/dashboard.css';

/** Couleurs des graphiques — strictement issues de la palette (CDC §3.5). */
const CATEGORY_COLORS = {
  VIP: '#C1440E',
  Famille: '#E97451',
  Amis: '#D4871A',
  Collegues: '#6B6B6B',
};

/** Compteur anime, pour les cartes de statistiques (CDC §5.7). */
function AnimatedNumber({ value, duration = 700 }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayed(0);
      return undefined;
    }

    const start = performance.now();
    let frame;

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      // Courbe easeOutQuad : rapide au depart, douce a l'arrivee
      setDisplayed(Math.round(value * (1 - (1 - progress) ** 2)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="wp-stat__number">{displayed}</span>;
}

export default function AnalyticsPage() {
  const { activeEvent, activeEventId } = useActiveEvent();
  const { guests, loading, error } = useGuestsSnapshot(activeEventId);

  const stats = useMemo(() => {
    const confirmed = guests.filter((g) => g.rsvpStatus === RSVP_STATUS.CONFIRMED).length;
    const scanned = guests.filter((g) => g.scanStatus === SCAN_STATUS.SCANNED).length;
    const expected = guests.reduce((total, g) => total + 1 + (g.companions || 0), 0);
    return { confirmed, scanned, expected };
  }, [guests]);

  /** Occupation par table : invites attendus contre invites presents (CDC §5.7). */
  const tableData = useMemo(() => {
    const tablesCount = Number(activeEvent?.tablesCount) || 0;
    const rows = [];

    for (let number = 1; number <= tablesCount; number += 1) {
      const atTable = guests.filter((g) => g.tableNumber === number);
      rows.push({
        table: `T${number}`,
        invites: atTable.reduce((total, g) => total + 1 + (g.companions || 0), 0),
        presents: atTable
          .filter((g) => g.scanStatus === SCAN_STATUS.SCANNED)
          .reduce((total, g) => total + 1 + (g.companions || 0), 0),
      });
    }

    return rows;
  }, [guests, activeEvent]);

  const categoryData = useMemo(() => {
    const counts = new Map();
    for (const guest of guests) {
      counts.set(guest.category, (counts.get(guest.category) || 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [guests]);

  /** Arrivees cumulees par tranche de 15 minutes le jour J (CDC §5.7). */
  const arrivalData = useMemo(() => {
    const scans = guests
      .filter((g) => g.scanStatus === SCAN_STATUS.SCANNED && g.scannedAt)
      .map((g) => toDate(g.scannedAt))
      .sort((a, b) => a - b);

    if (scans.length === 0) return [];

    const buckets = new Map();
    for (const date of scans) {
      const rounded = new Date(date);
      rounded.setMinutes(Math.floor(rounded.getMinutes() / 15) * 15, 0, 0);
      const key = rounded.getTime();
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    let cumulative = 0;
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, count]) => {
        cumulative += count;
        return { heure: formatTime(new Date(time)), arrivees: count, cumul: cumulative };
      });
  }, [guests]);

  if (!activeEventId) {
    return (
      <>
        <PageHeader title="Analytiques" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour consulter ses statistiques."
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

  const presenceRate = toPercent(stats.scanned, guests.length);

  return (
    <>
      <PageHeader
        title="Analytiques"
        subtitle={activeEvent ? `${activeEvent.groomName} & ${activeEvent.brideName}` : undefined}
      />

      {loading && <Loader size={28} label="Calcul des statistiques…" />}
      {error && <ErrorState description={error} />}

      {!loading && !error && guests.length === 0 && (
        <Card variant="elevated">
          <EmptyState
            title="Pas encore de donnees"
            description="Ajoutez des invites pour voir apparaitre les statistiques."
            action={
              <Link to="/guests">
                <Button>Ajouter des invites</Button>
              </Link>
            }
          />
        </Card>
      )}

      {!loading && !error && guests.length > 0 && (
        <>
          <div className="wp-dash__stats">
            <Card variant="default" stat>
              <p className="wp-stat__label">Invites</p>
              <p className="wp-stat__value">
                <AnimatedNumber value={guests.length} />
              </p>
            </Card>

            <Card variant="default" stat>
              <p className="wp-stat__label">Personnes attendues</p>
              <p className="wp-stat__value">
                <AnimatedNumber value={stats.expected} />
              </p>
            </Card>

            <Card variant="default" stat>
              <p className="wp-stat__label">Confirmes</p>
              <p className="wp-stat__value">
                <AnimatedNumber value={stats.confirmed} />
              </p>
            </Card>

            <Card variant="default" stat>
              <p className="wp-stat__label">Presents</p>
              <p className="wp-stat__value">
                <AnimatedNumber value={stats.scanned} />
              </p>
            </Card>
          </div>

          <Card variant="elevated" title="Taux de presence global" className="wp-guests__capacity">
            <ProgressBar
              value={stats.scanned}
              total={guests.length}
              label={`${presenceRate}% des invites sont arrives`}
              gradient
            />
          </Card>

          <div className="wp-dash__split" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <Card variant="elevated" title="Occupation par table">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tableData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="table" tick={{ fontSize: 11 }} stroke="var(--color-grey)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-grey)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--surface-card)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="invites" name="Attendus" fill="#E97451" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="presents" name="Presents" fill="#C1440E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card variant="elevated" title="Repartition par categorie">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name] || 'var(--color-grey)'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--surface-card)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card variant="elevated" title="Timeline des arrivees">
            {arrivalData.length === 0 ? (
              <EmptyState
                title="Aucune arrivee enregistree"
                description="La courbe se construira en direct pendant la reception."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={arrivalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="heure" tick={{ fontSize: 11 }} stroke="var(--color-grey)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-grey)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--surface-card)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="arrivees" name="Arrivees" fill="#C1440E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cumul" name="Cumul" fill="#F5E6E0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}
    </>
  );
}
