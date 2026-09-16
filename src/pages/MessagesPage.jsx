import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SkeletonList,
  useToast,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { messagesApi } from '../lib/api.js';
import { formatEventDate, formatShortDate } from '../lib/utils.js';

/**
 * Messages laisses par les invites (CDC §5.9).
 * Le contenu des messages secrets n'est pas envoye par le serveur tant que
 * le delai de 24h n'est pas ecoule — rien a devoiler cote client.
 */
export default function MessagesPage() {
  const toast = useToast();
  const { activeEventId } = useActiveEvent();

  const [messages, setMessages] = useState([]);
  const [unlockAt, setUnlockAt] = useState(null);
  const [secretsUnlocked, setSecretsUnlocked] = useState(false);
  const [loading, setLoading] = useState(Boolean(activeEventId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeEventId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    messagesApi
      .list(activeEventId)
      .then((payload) => {
        if (cancelled) return;
        setMessages(payload.messages);
        setUnlockAt(payload.unlockAt);
        setSecretsUnlocked(payload.secretsUnlocked);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeEventId]);

  async function handleDelete(message) {
    try {
      await messagesApi.remove(activeEventId, message.id);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      toast.success('Message supprime', message.guestName);
    } catch (caught) {
      toast.error('Suppression impossible', caught.message);
    }
  }

  if (!activeEventId) {
    return (
      <>
        <PageHeader title="Messages" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour lire les messages de ses invites."
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

  const lockedCount = messages.filter((message) => message.locked).length;

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle={`${messages.length} message${messages.length > 1 ? 's' : ''} recu${
          messages.length > 1 ? 's' : ''
        }`}
      />

      {!secretsUnlocked && lockedCount > 0 && unlockAt && (
        <Card variant="highlighted" className="wp-guests__capacity">
          <p className="wp-label">
            {lockedCount} message{lockedCount > 1 ? 's' : ''} secret
            {lockedCount > 1 ? 's' : ''} se devoilera
            {lockedCount > 1 ? 'nt' : ''} le {formatEventDate(unlockAt)}.
          </p>
        </Card>
      )}

      {loading && <SkeletonList rows={4} height={110} />}
      {error && <ErrorState description={error} />}

      {!loading && !error && messages.length === 0 && (
        <Card variant="elevated">
          <EmptyState
            title="Aucun message pour l'instant"
            description="Les invites pourront laisser un mot aux maries apres la ceremonie."
          />
        </Card>
      )}

      {messages.length > 0 && (
        <div className="wp-guests__list">
          {messages.map((message) => (
            <Card key={message.id} variant="default">
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                <Avatar name={message.guestName} size="md" />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      flexWrap: 'wrap',
                      marginBottom: 'var(--space-2xs)',
                    }}
                  >
                    <span className="wp-label" style={{ fontWeight: 600 }}>
                      {message.guestName}
                    </span>
                    {message.isSecret && (
                      <Badge variant={message.locked ? 'warning' : 'primary'}>
                        {message.locked ? 'Secret verrouille' : 'Secret'}
                      </Badge>
                    )}
                    <span className="wp-caption">{formatShortDate(message.createdAt)}</span>
                  </div>

                  {message.locked ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Ce message se devoilera le lendemain du mariage.
                    </p>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={() => handleDelete(message)}>
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
