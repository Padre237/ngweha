import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import GuestCard from '../components/guests/GuestCard.jsx';
import GuestFormModal from '../components/guests/GuestFormModal.jsx';
import QrCodeModal from '../components/guests/QrCodeModal.jsx';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  ProgressBar,
  SkeletonList,
  useToast,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { useGuests } from '../hooks/useGuests.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { exportGuestsToCsv, exportGuestsToJson } from '../lib/export.js';
import { whatsappApi } from '../lib/api.js';
import {
  GUEST_CATEGORIES,
  PAGE_SIZE,
  RSVP_LABELS,
  RSVP_STATUS,
  SCAN_LABELS,
  SCAN_STATUS,
  SEARCH_DEBOUNCE_MS,
} from '../lib/constants.js';
import '../styles/guests.css';

const ALL = 'all';

export default function GuestsPage() {
  const toast = useToast();
  const { activeEvent, activeEventId } = useActiveEvent();
  const { guests, loading, error, isEmpty, refetch, createGuest, updateGuest, deleteGuest } =
    useGuests(activeEventId);

  // ── Filtres ──
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [rsvp, setRsvp] = useState(ALL);
  const [scan, setScan] = useState(ALL);
  const [table, setTable] = useState(ALL);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  // ── Modals ──
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [qrGuest, setQrGuest] = useState(null);
  const [deletingGuest, setDeletingGuest] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  /** Total de personnes attendues : chaque invite compte pour lui + ses accompagnants. */
  const expectedPeople = useMemo(
    () => guests.reduce((total, guest) => total + 1 + (guest.companions || 0), 0),
    [guests]
  );

  const filteredGuests = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();

    return guests.filter((guest) => {
      if (needle && !guest.fullName.toLowerCase().includes(needle)) return false;
      if (category !== ALL && guest.category !== category) return false;
      if (rsvp !== ALL && guest.rsvpStatus !== rsvp) return false;
      if (scan !== ALL && guest.scanStatus !== scan) return false;
      if (table !== ALL && String(guest.tableNumber) !== table) return false;
      return true;
    });
  }, [guests, debouncedSearch, category, rsvp, scan, table]);

  // Pagination : 25 invites par page (CDC §5.4)
  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedGuests = filteredGuests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const tableOptions = useMemo(
    () => Array.from({ length: Number(activeEvent?.tablesCount) || 0 }, (_, i) => i + 1),
    [activeEvent]
  );

  /** Remet la pagination a zero des qu'un filtre change. */
  function withPageReset(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  /** Invites joignables dont le lien n'est pas encore parti (CDC §5.4). */
  const pendingLinks = useMemo(
    () => guests.filter((guest) => guest.phone && !guest.linkSentAt),
    [guests]
  );

  /** Envoi individuel du lien WhatsApp. */
  async function handleSendLink(guest) {
    setSendingId(guest.id);
    try {
      await whatsappApi.send(activeEventId, guest.id);
      await refetch();
      toast.success('Lien envoye', `${guest.fullName} · ${guest.phone}`);
    } catch (caught) {
      toast.error('Envoi impossible', caught.message);
    } finally {
      setSendingId(null);
    }
  }

  /** Envoi groupe a tous les invites en attente. */
  async function handleSendBulk() {
    setSendingBulk(true);
    try {
      const result = await whatsappApi.sendBulk(activeEventId);
      await refetch();

      if (result.failed > 0) {
        toast.warning(
          'Envoi partiel',
          `${result.sent} liens envoyes, ${result.failed} en echec.`
        );
      } else {
        toast.success('Liens envoyes', `${result.sent} invites notifies.`);
      }
    } catch (caught) {
      toast.error('Envoi impossible', caught.message);
    } finally {
      setSendingBulk(false);
    }
  }

  async function handleSubmit(data) {
    if (editingGuest) {
      const updated = await updateGuest(editingGuest.id, data);
      toast.success('Invite modifie', `${updated.fullName} · Table ${updated.tableNumber}`);
      return;
    }

    const created = await createGuest(data);
    toast.success('Invite ajoute', `${created.fullName} · Table ${created.tableNumber}`);
  }

  async function handleDelete() {
    if (!deletingGuest) return;

    setDeleting(true);
    try {
      await deleteGuest(deletingGuest.id);
      toast.success('Invite supprime', deletingGuest.fullName);
      setDeletingGuest(null);
    } catch (caught) {
      toast.error('Suppression impossible', caught.message);
    } finally {
      setDeleting(false);
    }
  }

  function handleExportCsv() {
    exportGuestsToCsv(filteredGuests, activeEvent);
    toast.success('Export CSV genere', `${filteredGuests.length} invites exportes.`);
  }

  function handleExportJson() {
    exportGuestsToJson(filteredGuests, activeEvent);
    toast.success('Export JSON genere', `${filteredGuests.length} invites exportes.`);
  }

  // ── Aucun evenement selectionne ──
  if (!activeEventId) {
    return (
      <>
        <PageHeader title="Invites" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour gerer sa liste d'invites."
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
        title="Invites"
        subtitle={
          activeEvent ? `${activeEvent.groomName} & ${activeEvent.brideName}` : undefined
        }
        actions={
          <>
            {pendingLinks.length > 0 && (
              <Button size="sm" loading={sendingBulk} onClick={handleSendBulk}>
                Envoyer {pendingLinks.length} lien{pendingLinks.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={loading}>
              Exporter CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportJson} disabled={loading}>
              Exporter JSON
            </Button>
            <Button
              onClick={() => {
                setEditingGuest(null);
                setFormOpen(true);
              }}
            >
              Ajouter un invite
            </Button>
          </>
        }
      />

      {/* Barre de capacite globale, en tete de liste (CDC §5.4) */}
      {activeEvent && (
        <Card variant="default" stat className="wp-guests__capacity">
          <ProgressBar
            label="Personnes attendues, accompagnants compris"
            value={expectedPeople}
            total={activeEvent.maxGuests || 0}
          />
        </Card>
      )}

      <div className="wp-guests__toolbar">
        <Input
          className="wp-guests__search"
          variant="search"
          label="Rechercher"
          placeholder="Nom de l'invite…"
          value={search}
          onChange={(changeEvent) => withPageReset(setSearch)(changeEvent.target.value)}
        />

        <div className="wp-guests__filters">
          <select
            className="wp-select"
            value={category}
            onChange={(e) => withPageReset(setCategory)(e.target.value)}
            aria-label="Filtrer par categorie"
          >
            <option value={ALL}>Toutes categories</option>
            {GUEST_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="wp-select"
            value={rsvp}
            onChange={(e) => withPageReset(setRsvp)(e.target.value)}
            aria-label="Filtrer par statut RSVP"
          >
            <option value={ALL}>Tous RSVP</option>
            {Object.values(RSVP_STATUS).map((status) => (
              <option key={status} value={status}>
                {RSVP_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            className="wp-select"
            value={scan}
            onChange={(e) => withPageReset(setScan)(e.target.value)}
            aria-label="Filtrer par statut de scan"
          >
            <option value={ALL}>Tous scans</option>
            {Object.values(SCAN_STATUS).map((status) => (
              <option key={status} value={status}>
                {SCAN_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            className="wp-select"
            value={table}
            onChange={(e) => withPageReset(setTable)(e.target.value)}
            aria-label="Filtrer par table"
          >
            <option value={ALL}>Toutes les tables</option>
            {tableOptions.map((item) => (
              <option key={item} value={String(item)}>
                Table {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <SkeletonList rows={6} height={68} />}

      {error && <ErrorState description={error} onRetry={refetch} />}

      {isEmpty && (
        <Card variant="elevated">
          <EmptyState
            title="Aucun invite pour l'instant"
            description="Ajoutez votre premier invite : son QR code et son lien seront generes automatiquement."
            action={
              <Button
                onClick={() => {
                  setEditingGuest(null);
                  setFormOpen(true);
                }}
              >
                Ajouter un invite
              </Button>
            }
          />
        </Card>
      )}

      {!loading && !error && guests.length > 0 && filteredGuests.length === 0 && (
        <Card variant="elevated">
          <EmptyState
            title="Aucun resultat"
            description="Aucun invite ne correspond a ces filtres."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setCategory(ALL);
                  setRsvp(ALL);
                  setScan(ALL);
                  setTable(ALL);
                  setPage(1);
                }}
              >
                Reinitialiser les filtres
              </Button>
            }
          />
        </Card>
      )}

      {pagedGuests.length > 0 && (
        <>
          <div className="wp-guests__list">
            {pagedGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                onEdit={(item) => {
                  setEditingGuest(item);
                  setFormOpen(true);
                }}
                onShowQr={setQrGuest}
                onDelete={setDeletingGuest}
                onSendLink={handleSendLink}
                sending={sendingId === guest.id}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="wp-pagination">
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Precedent
              </Button>
              <span className="wp-pagination__info">
                Page {currentPage} sur {totalPages} · {filteredGuests.length} invites
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}

      <GuestFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        guest={editingGuest}
        event={activeEvent}
      />

      <QrCodeModal
        open={Boolean(qrGuest)}
        onClose={() => setQrGuest(null)}
        guest={qrGuest}
        event={activeEvent}
        eventId={activeEventId}
        onSent={refetch}
      />

      <Modal
        open={Boolean(deletingGuest)}
        onClose={() => setDeletingGuest(null)}
        size="sm"
        title="Supprimer l'invite"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingGuest(null)}>
              Annuler
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="wp-danger-text">
          Supprimer <strong>{deletingGuest?.fullName}</strong> ? Son lien d'invitation cessera
          immediatement de fonctionner. Cette action est irreversible.
        </p>
      </Modal>
    </>
  );
}
