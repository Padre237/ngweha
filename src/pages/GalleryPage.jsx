import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  SkeletonList,
  useToast,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { photosApi } from '../lib/api.js';
import { formatTime, cx } from '../lib/utils.js';
import '../styles/gallery.css';

/** Applique les transformations Cloudinary d'optimisation (CDC §9.2). */
function optimized(url, width = 400) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}

export default function GalleryPage() {
  const toast = useToast();
  const { activeEvent, activeEventId } = useActiveEvent();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(Boolean(activeEventId));
  const [error, setError] = useState(null);
  const [authorFilter, setAuthorFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (!activeEventId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    photosApi
      .list(activeEventId)
      .then(({ photos: list }) => {
        if (!cancelled) setPhotos(list);
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

  const authors = useMemo(
    () => [...new Set(photos.map((photo) => photo.guestName))].sort((a, b) => a.localeCompare(b, 'fr')),
    [photos]
  );

  const filtered = useMemo(
    () => (authorFilter === 'all' ? photos : photos.filter((p) => p.guestName === authorFilter)),
    [photos, authorFilter]
  );

  // La photo du jour est celle qui a recu le plus de votes (CDC §5.8)
  const topPhotoId = useMemo(() => {
    const best = [...photos].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))[0];
    return best && best.votes > 0 ? best.id : null;
  }, [photos]);

  /** Telecharge toutes les photos affichees dans une archive ZIP (CDC §5.8). */
  async function handleDownloadAll() {
    setZipping(true);
    try {
      // Import dynamique : JSZip ne pese que sur cet ecran
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      await Promise.all(
        filtered.map(async (photo, index) => {
          const response = await fetch(photo.cloudinaryUrl);
          const blob = await response.blob();
          const safeName = photo.guestName.toLowerCase().replace(/\s+/g, '-');
          zip.file(`${String(index + 1).padStart(3, '0')}-${safeName}.jpg`, blob);
        })
      );

      const archive = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(archive);

      const link = document.createElement('a');
      link.href = url;
      link.download = `photos-${activeEvent?.groomName}-${activeEvent?.brideName}.zip`
        .toLowerCase()
        .replace(/\s+/g, '-');
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Archive generee', `${filtered.length} photos telechargees.`);
    } catch (caught) {
      toast.error('Telechargement impossible', caught.message);
    } finally {
      setZipping(false);
    }
  }

  async function handleDelete(photo) {
    try {
      await photosApi.remove(activeEventId, photo.id);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setSelected(null);
      toast.success('Photo supprimee', photo.guestName);
    } catch (caught) {
      toast.error('Suppression impossible', caught.message);
    }
  }

  if (!activeEventId) {
    return (
      <>
        <PageHeader title="Galerie" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage pour voir les photos de ses invites."
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
        title="Galerie"
        subtitle={`${photos.length} photo${photos.length > 1 ? 's' : ''} partagee${
          photos.length > 1 ? 's' : ''
        } par vos invites`}
        actions={
          filtered.length > 0 && (
            <Button variant="secondary" loading={zipping} onClick={handleDownloadAll}>
              Tout telecharger
            </Button>
          )
        }
      />

      {authors.length > 1 && (
        <div className="wp-upload__filters">
          <Button
            size="sm"
            variant={authorFilter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setAuthorFilter('all')}
          >
            Tous
          </Button>
          {authors.map((author) => (
            <Button
              key={author}
              size="sm"
              variant={authorFilter === author ? 'primary' : 'ghost'}
              onClick={() => setAuthorFilter(author)}
            >
              {author}
            </Button>
          ))}
        </div>
      )}

      {loading && <SkeletonList rows={3} height={180} />}
      {error && <ErrorState description={error} />}

      {!loading && !error && photos.length === 0 && (
        <Card variant="elevated">
          <EmptyState
            title="Aucune photo pour l'instant"
            description="Les invites pourront partager leurs photos depuis leur invitation, une fois leur entree validee."
          />
        </Card>
      )}

      {filtered.length > 0 && (
        <div className="wp-masonry">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className={cx('wp-photo', photo.id === topPhotoId && 'wp-photo--top')}
              onClick={() => setSelected(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSelected(photo);
              }}
            >
              <img
                className="wp-photo__image"
                src={optimized(photo.cloudinaryUrl, 500)}
                alt={`Photo de ${photo.guestName}`}
                loading="lazy"
              />
              <div className="wp-photo__overlay">
                <span className="wp-photo__author">{photo.guestName}</span>
                <span className="wp-photo__votes">♥ {photo.votes ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected?.guestName}
        footer={
          <>
            <Button variant="danger" size="sm" onClick={() => handleDelete(selected)}>
              Supprimer
            </Button>
            <a
              className="wp-btn wp-btn--primary wp-btn--sm"
              href={selected?.cloudinaryUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              Telecharger
            </a>
          </>
        }
      >
        {selected && (
          <>
            <img
              className="wp-lightbox__image"
              src={optimized(selected.cloudinaryUrl, 1200)}
              alt={`Photo de ${selected.guestName}`}
            />
            <div className="wp-lightbox__meta">
              <span className="wp-caption">
                Envoyee a {formatTime(selected.uploadedAt)}
              </span>
              <Badge variant="primary">{selected.votes ?? 0} votes</Badge>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
