import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { Card, EmptyState } from '../components/ui/index.js';

/**
 * Gabarit temporaire des pages non encore implementees.
 * Chaque page le remplace par son contenu reel lors de sa phase (CDC §8.1).
 */
export default function PhasePlaceholder({ title, phase, description }) {
  return (
    <div className="wp-page" style={{ padding: 'var(--space-2xl) var(--space-md)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link to="/events" style={{ display: 'inline-block', marginBottom: 'var(--space-xl)' }}>
          <Logo size="md" />
        </Link>
        <Card variant="elevated" stat>
          <EmptyState
            title={title}
            description={description || `Cet ecran sera implemente en phase ${phase} du cahier des charges.`}
          />
        </Card>
      </div>
    </div>
  );
}
