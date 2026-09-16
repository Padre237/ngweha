import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import ProgramEditor from '../components/settings/ProgramEditor.jsx';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  useToast,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { useGuests } from '../hooks/useGuests.js';
import { eventsApi, whatsappApi } from '../lib/api.js';
import { exportGuestsToJson } from '../lib/export.js';
import { toDate } from '../lib/utils.js';
import '../styles/settings.css';

/** Formate une date pour un <input type="datetime-local">. */
function toDateTimeLocal(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function SettingsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { activeEvent, activeEventId, patchActiveEvent, clearEvent } = useActiveEvent();
  const { guests, refetch: refetchGuests } = useGuests(activeEventId);

  const fileInputRef = useRef(null);

  const [form, setForm] = useState(null);
  const [program, setProgram] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [typedName, setTypedName] = useState('');

  // Hydrate le formulaire des que l'evenement actif est charge
  useEffect(() => {
    if (!activeEvent) return;
    setForm({
      groomName: activeEvent.groomName || '',
      brideName: activeEvent.brideName || '',
      eventDate: toDateTimeLocal(activeEvent.eventDate),
      venue: activeEvent.venue || '',
      venueAddress: activeEvent.venueAddress || '',
      dressCode: activeEvent.dressCode || '',
      maxGuests: String(activeEvent.maxGuests ?? 100),
      tablesCount: String(activeEvent.tablesCount ?? 10),
      seatsPerTable: String(activeEvent.seatsPerTable ?? 10),
      status: activeEvent.status || 'draft',
    });
    setProgram(Array.isArray(activeEvent.program) ? activeEvent.program : []);
  }, [activeEvent]);

  const expectedPeople = useMemo(
    () => guests.reduce((total, g) => total + 1 + (g.companions || 0), 0),
    [guests]
  );

  const capacity = useMemo(() => {
    if (!form) return { total: 0, max: 0, insufficient: false };
    const total = (Number(form.tablesCount) || 0) * (Number(form.seatsPerTable) || 0);
    const max = Number(form.maxGuests) || 0;
    return { total, max, insufficient: total > 0 && max > 0 && total < max };
  }, [form]);

  function updateField(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        groomName: form.groomName.trim(),
        brideName: form.brideName.trim(),
        eventDate: new Date(form.eventDate).toISOString(),
        venue: form.venue.trim(),
        venueAddress: form.venueAddress.trim(),
        dressCode: form.dressCode.trim(),
        maxGuests: Number(form.maxGuests),
        tablesCount: Number(form.tablesCount),
        seatsPerTable: Number(form.seatsPerTable),
        status: form.status,
        // Les etapes vides ne sont pas persistees
        program: program.filter((step) => step.title.trim() || step.time.trim()),
      };

      const { event } = await eventsApi.update(activeEventId, payload);
      patchActiveEvent(event);
      toast.success('Parametres enregistres', `${event.groomName} & ${event.brideName}`);
    } catch (caught) {
      toast.error('Enregistrement impossible', caught.message);
    } finally {
      setSaving(false);
    }
  }

  /** Import JSON : on accepte le format produit par notre propre export. */
  async function handleImportFile(changeEvent) {
    const file = changeEvent.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      const incoming = Array.isArray(payload) ? payload : payload.guests;

      if (!Array.isArray(incoming)) {
        toast.error('Fichier invalide', 'Aucune liste d\'invites trouvee.');
        return;
      }

      const mode = window.confirm(
        `${incoming.length} invites detectes.\n\nOK = REMPLACER la liste actuelle\nAnnuler = AJOUTER a la liste actuelle`
      )
        ? 'replace'
        : 'merge';

      setBusyAction('import');
      const result = await eventsApi.importGuests(activeEventId, incoming, mode);
      await refetchGuests();

      toast.success(
        'Import termine',
        `${result.imported} invites importes${result.skipped ? `, ${result.skipped} ignores` : ''}.`
      );
    } catch (caught) {
      toast.error('Import impossible', caught.message);
    } finally {
      setBusyAction(null);
      changeEvent.target.value = '';
    }
  }

  async function handleDangerAction() {
    const expectedName = `${activeEvent.groomName} & ${activeEvent.brideName}`;
    if (confirm !== 'reset-scans' && typedName.trim() !== expectedName) return;

    setBusyAction(confirm);
    try {
      if (confirm === 'reset-scans') {
        const result = await eventsApi.resetScans(activeEventId);
        await refetchGuests();
        toast.success('Scans reinitialises', `${result.reset} invites remis a non scanne.`);
      } else if (confirm === 'purge-guests') {
        const result = await eventsApi.purgeGuests(activeEventId);
        await refetchGuests();
        toast.success('Invites supprimes', `${result.deleted} invites effaces.`);
      } else if (confirm === 'delete-event') {
        await eventsApi.remove(activeEventId);
        clearEvent();
        toast.success('Evenement supprime', expectedName);
        navigate('/events', { replace: true });
        return;
      }
      setConfirm(null);
      setTypedName('');
    } catch (caught) {
      toast.error('Action impossible', caught.message);
    } finally {
      setBusyAction(null);
    }
  }

  if (!activeEventId || !activeEvent || !form) {
    return (
      <>
        <PageHeader title="Parametres" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour modifier ses parametres."
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

  const expectedName = `${activeEvent.groomName} & ${activeEvent.brideName}`;
  const needsTypedName = confirm && confirm !== 'reset-scans';

  return (
    <>
      <PageHeader
        title="Parametres"
        subtitle={expectedName}
        actions={
          <Button onClick={handleSave} loading={saving}>
            Enregistrer
          </Button>
        }
      />

      <div className="wp-settings">
        {/* ── Informations de l'evenement ── */}
        <Card variant="elevated" title="Informations">
          <div className="wp-settings__grid">
            <Input label="Prenom du marie" value={form.groomName} onChange={updateField('groomName')} />
            <Input label="Prenom de la mariee" value={form.brideName} onChange={updateField('brideName')} />
            <Input
              className="wp-settings__full"
              label="Date et heure"
              type="datetime-local"
              value={form.eventDate}
              onChange={updateField('eventDate')}
            />
            <Input className="wp-settings__full" label="Lieu" value={form.venue} onChange={updateField('venue')} />
            <Input
              className="wp-settings__full"
              label="Adresse complete"
              value={form.venueAddress}
              onChange={updateField('venueAddress')}
              hint="Utilisee pour l'itineraire propose aux invites."
            />
            <Input
              className="wp-settings__full"
              label="Dress code"
              value={form.dressCode}
              onChange={updateField('dressCode')}
              placeholder="Tenue de soiree elegante, dominante blanc et or"
            />

            <div className="wp-field wp-settings__full">
              <label className="wp-field__label" htmlFor="event-status">
                Statut
              </label>
              <select
                id="event-status"
                className="wp-select"
                value={form.status}
                onChange={updateField('status')}
              >
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="completed">Termine</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ── Programme ── */}
        <Card variant="elevated" title="Programme de la journee">
          <ProgramEditor program={program} onChange={setProgram} />
        </Card>

        {/* ── Capacite ── */}
        <Card variant="elevated" title="Capacite">
          <div className="wp-settings__grid">
            <Input label="Invites maximum" type="number" min="1" value={form.maxGuests} onChange={updateField('maxGuests')} />
            <Input label="Nombre de tables" type="number" min="1" value={form.tablesCount} onChange={updateField('tablesCount')} />
            <Input label="Places par table" type="number" min="1" value={form.seatsPerTable} onChange={updateField('seatsPerTable')} />

            <div
              className={`wp-settings__summary wp-settings__full${
                capacity.insufficient ? ' wp-settings__summary--warning' : ''
              }`}
            >
              {capacity.total} places assises · {expectedPeople} personnes attendues ·{' '}
              {capacity.max} invites annonces
              {capacity.insufficient && ' — ajoutez des tables ou reduisez la capacite.'}
            </div>
          </div>
        </Card>

        {/* ── Notifications WhatsApp (CDC §5.10) ── */}
        <Card variant="elevated" title="Notifications WhatsApp">
          <p className="wp-caption">
            Le numero WhatsApp Business est configure dans les variables
            d'environnement du deploiement, jamais dans l'application.
          </p>

          <div className="wp-settings__actions">
            <Button
              variant="secondary"
              size="sm"
              loading={busyAction === 'whatsapp'}
              onClick={async () => {
                setBusyAction('whatsapp');
                try {
                  const result = await whatsappApi.sendBulk(activeEventId);
                  await refetchGuests();
                  toast.success(
                    'Envoi termine',
                    `${result.sent} liens envoyes${result.failed ? `, ${result.failed} en echec` : ''}.`
                  );
                } catch (caught) {
                  toast.error('Envoi impossible', caught.message);
                } finally {
                  setBusyAction(null);
                }
              }}
            >
              Envoyer les liens non envoyes
            </Button>
          </div>
        </Card>

        {/* ── Export / Import ── */}
        <Card variant="elevated" title="Export et import">
          <p className="wp-caption">
            L'export contient l'evenement et tous ses invites. L'import genere de nouveaux
            tokens : les anciens liens du fichier ne seront pas reconduits.
          </p>

          <div className="wp-settings__actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                exportGuestsToJson(guests, activeEvent);
                toast.success('Export genere', `${guests.length} invites exportes.`);
              }}
            >
              Exporter en JSON
            </Button>

            <Button
              variant="secondary"
              size="sm"
              loading={busyAction === 'import'}
              onClick={() => fileInputRef.current?.click()}
            >
              Importer un JSON
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="wp-sr-only"
            />
          </div>
        </Card>

        {/* ── Zone dangereuse (CDC §5.10) ── */}
        <Card variant="elevated" title="Zone dangereuse" className="wp-danger">
          <div className="wp-danger__row">
            <div>
              <p className="wp-danger__label">Reinitialiser tous les scans</p>
              <p className="wp-danger__hint">
                Remet chaque invite en « non scanne ». Utile apres un test grandeur nature.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setConfirm('reset-scans')}>
              Reinitialiser
            </Button>
          </div>

          <div className="wp-danger__row">
            <div>
              <p className="wp-danger__label">Supprimer tous les invites</p>
              <p className="wp-danger__hint">
                Efface la liste entiere et revoque tous les liens d'invitation.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirm('purge-guests')}>
              Supprimer les invites
            </Button>
          </div>

          <div className="wp-danger__row">
            <div>
              <p className="wp-danger__label">Supprimer l'evenement</p>
              <p className="wp-danger__hint">
                Supprime l'evenement, ses invites, ses photos et ses messages.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirm('delete-event')}>
              Supprimer l'evenement
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => {
          setConfirm(null);
          setTypedName('');
        }}
        size="sm"
        title="Confirmer l'action"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(null);
                setTypedName('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={Boolean(busyAction) && busyAction === confirm}
              disabled={needsTypedName && typedName.trim() !== expectedName}
              onClick={handleDangerAction}
            >
              Confirmer
            </Button>
          </>
        }
      >
        {confirm === 'reset-scans' && (
          <p className="wp-danger-text">
            Tous les invites repasseront en « non scanne ». Les entrees deja validees le jour J
            seront perdues.
          </p>
        )}

        {needsTypedName && (
          <>
            <p className="wp-danger-text">
              Cette action est irreversible. Pour confirmer, saisissez{' '}
              <span className="wp-danger-name">{expectedName}</span>
            </p>
            <Input
              label="Nom de l'evenement"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={expectedName}
              autoFocus
            />
          </>
        )}
      </Modal>
    </>
  );
}
