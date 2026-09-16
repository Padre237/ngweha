import { useEffect, useMemo, useState } from 'react';
import '../components/ui/Button.css';
import '../styles/gallery.css';
import '../styles/invite.css';

/** Transformations Cloudinary : format et compression automatiques (CDC §9.2). */
function optimized(url, width = 400) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}

/**
 * Galerie collaborative de l'apres-mariage (CDC §6.5).
 * Pas de telechargement individuel ici : c'est reserve a l'espace organisateur.
 */
export default function GallerySection({ token }) {
  const [photos, setPhotos] = useState([]);
  const [guestId, setGuestId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/invite/${token}/photos`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (cancelled) return;
        setPhotos(payload.photos);
        setGuestId(payload.guestId);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const visible = useMemo(
    () => (filter === 'mine' ? photos.filter((photo) => photo.guestId === guestId) : photos),
    [photos, filter, guestId]
  );

  /** Un vote par invite et par photo (CDC §6.5). */
  async function handleVote(photo) {
    if (photo.hasVoted) return;

    setVotingId(photo.id);
    try {
      const response = await fetch(`/api/invite/${token}/photos/${photo.id}/vote`, {
        method: 'POST',
      });
      if (!response.ok) return;

      const payload = await response.json();
      setPhotos((current) =>
        current.map((item) =>
          item.id === photo.id ? { ...item, votes: payload.votes, hasVoted: true } : item
        )
      );
    } finally {
      setVotingId(null);
    }
  }

  if (loading) {
    return (
      <section className="wp-invite__card">
        <div className="wp-skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
      </section>
    );
  }

  if (photos.length === 0) {
    return (
      <section className="wp-invite__card">
        <h2 className="wp-invite__section-title">Galerie commune</h2>
        <p style={{ textAlign: 'center', color: 'var(--color-grey)' }}>
          Aucune photo n'a encore ete partagee.
        </p>
      </section>
    );
  }

  return (
    <section className="wp-invite__card">
      <h2 className="wp-invite__section-title">📸 Galerie commune</h2>

      <div className="wp-upload__filters" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          className={`wp-btn wp-btn--sm wp-btn--${filter === 'all' ? 'primary' : 'ghost'}`}
          onClick={() => setFilter('all')}
        >
          Toutes ({photos.length})
        </button>
        <button
          type="button"
          className={`wp-btn wp-btn--sm wp-btn--${filter === 'mine' ? 'primary' : 'ghost'}`}
          onClick={() => setFilter('mine')}
        >
          Mes photos
        </button>
      </div>

      <div className="wp-masonry" style={{ columnCount: 2 }}>
        {visible.map((photo) => (
          <div className="wp-photo" key={photo.id}>
            <img
              className="wp-photo__image"
              src={optimized(photo.cloudinaryUrl, 400)}
              alt={`Photo de ${photo.guestName}`}
              loading="lazy"
            />
            <div className="wp-photo__overlay">
              <span className="wp-photo__author">{photo.guestName}</span>
              <button
                type="button"
                className="wp-vote"
                onClick={() => handleVote(photo)}
                disabled={photo.hasVoted || votingId === photo.id}
                aria-label={photo.hasVoted ? 'Deja vote' : 'Voter pour cette photo'}
              >
                ♥ {photo.votes}
              </button>
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--color-grey)' }}>
          Vous n'avez pas encore partage de photo.
        </p>
      )}
    </section>
  );
}
