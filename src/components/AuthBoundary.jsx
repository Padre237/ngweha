import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth.jsx';

/**
 * Isole le SDK Firebase Auth aux seules routes qui en ont besoin.
 *
 * Monte a la racine, AuthProvider ferait charger ~104 KB gzip de Firebase sur la
 * Guest Page, qui n'utilise pas Auth et vise < 1,5 s en 3G (CDC §9.1). Charge en
 * lazy derriere ce composant, Firebase ne descend que sur l'espace organisateur.
 */
export default function AuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
