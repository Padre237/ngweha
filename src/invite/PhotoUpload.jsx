import { useRef, useState } from 'react';
import '../components/ui/Button.css';
import '../styles/gallery.css';
import '../styles/invite.css';

/**
 * Partage d'une photo par un invite present (CDC §6.4).
 * La compression cote client est indispensable : sans elle, une photo de
 * smartphone de 4 Mo serait impossible a envoyer en 3G (CDC §9.2).
 */
export default function PhotoUpload({ token, onUploaded }) {
  const inputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleFile(changeEvent) {
    const file = changeEvent.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      // Import dynamique : la bibliotheque ne se charge qu'au moment du partage
      const { default: imageCompression } = await import('browser-image-compression');

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        initialQuality: 0.8,
        useWebWorker: true,
      });

      const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
      setPreview(dataUrl);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, image: dataUrl }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Envoi impossible.');
      }

      setDone(true);
      onUploaded?.(payload.photo);
    } catch (caught) {
      setError(caught.message);
      setPreview(null);
    } finally {
      setUploading(false);
      changeEvent.target.value = '';
    }
  }

  return (
    <section className="wp-invite__card">
      <h2 className="wp-invite__section-title">Partager une photo</h2>

      <div className="wp-upload">
        {preview && <img className="wp-upload__preview" src={preview} alt="Votre photo" />}

        {done ? (
          <p style={{ color: 'var(--color-success)', textAlign: 'center' }}>
            Merci ! Votre photo rejoint la galerie des maries.
          </p>
        ) : (
          <p className="wp-invite__qr-hint" style={{ textAlign: 'center' }}>
            Immortalisez un moment de la fete — les maries retrouveront toutes les photos
            dans leur galerie.
          </p>
        )}

        <button
          type="button"
          className="wp-btn wp-btn--primary wp-btn--block"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Envoi en cours…' : done ? 'Partager une autre photo' : '📷 Partager une photo'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="wp-sr-only"
        />

        {error && (
          <p style={{ color: 'var(--color-error)', textAlign: 'center' }} role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
