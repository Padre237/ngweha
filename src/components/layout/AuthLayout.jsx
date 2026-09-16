import { Link } from 'react-router-dom';
import Logo from '../Logo.jsx';
import '../../styles/auth.css';

/** Gabarit commun aux ecrans d'authentification : logo en haut, card centrale (CDC §4.2). */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="wp-auth wp-page">
      <Link to="/login" aria-label="Accueil WeddingPass">
        <Logo size="lg" />
      </Link>

      <div className="wp-auth__card">
        {title && <h1 className="wp-auth__title">{title}</h1>}
        {subtitle && <p className="wp-auth__subtitle">{subtitle}</p>}
        {children}
      </div>

      {footer && <div className="wp-auth__footer">{footer}</div>}
    </div>
  );
}

/** Message d'alerte inline, au-dessus des formulaires. */
export function AuthAlert({ variant = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`wp-auth__alert wp-auth__alert--${variant}`} role="alert">
      {children}
    </div>
  );
}
