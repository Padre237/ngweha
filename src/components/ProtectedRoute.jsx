import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Loader } from './ui/index.js';

/**
 * Garde les routes admin (CDC §4.3).
 * Non authentifie  → /login, avec memorisation de l'URL demandee.
 * Email non verifie → /verify-email.
 * La route /invite/:token n'est jamais enveloppee par ce composant.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isEmailVerified, initializing } = useAuth();
  const location = useLocation();

  // Tant que Firebase n'a pas restaure la session, on n'affiche ni page ni redirection
  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader size={32} label="Verification de la session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children ?? <Outlet />;
}
