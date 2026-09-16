import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/**
 * Ecoute les invites en temps reel (CDC §9.2).
 *
 * Reserve aux ecrans temps reel — dashboard et scanner. Les listes statiques
 * passent par l'API avec getDocs, moins couteux en lectures Firestore.
 */
export function useGuestsSnapshot(eventId) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setGuests([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'events', eventId, 'guests'),
      (snapshot) => {
        setGuests(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Les Timestamp Firestore sont normalises en Date des la lecture
              scannedAt: data.scannedAt?.toDate?.() ?? null,
              linkSentAt: data.linkSentAt?.toDate?.() ?? null,
            };
          })
        );
        setLoading(false);
      },
      (caught) => {
        console.error('[WeddingPass] Ecoute des invites interrompue :', caught);
        setError('Impossible de suivre les invites en temps reel.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { guests, loading, error };
}
