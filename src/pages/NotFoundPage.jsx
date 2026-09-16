import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { Button, Card, EmptyState } from '../components/ui/index.js';

/** Page 404 generique de l'espace admin. */
export default function NotFoundPage() {
  return (
    <div
      className="wp-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-xl)',
        padding: 'var(--space-md)',
      }}
    >
      <Logo size="lg" />
      <Card variant="elevated" style={{ maxWidth: 480, width: '100%' }}>
        <EmptyState
          title="Page introuvable"
          description="Le lien que vous avez suivi n'existe pas ou a ete deplace."
          action={
            <Link to="/events">
              <Button variant="primary">Retour a mes evenements</Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
