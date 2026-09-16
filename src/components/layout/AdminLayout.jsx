import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../Logo.jsx';
import EventPicker from './EventPicker.jsx';
import { NAV_ITEMS } from './navItems.jsx';
import { Avatar, useToast } from '../ui/index.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { ActiveEventProvider, useActiveEvent } from '../../hooks/useActiveEvent.jsx';
import { cx } from '../../lib/utils.js';
import '../../styles/admin.css';

/** Sidebar : logo, selecteur d'evenement, navigation, profil (CDC §5.1). */
function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile, logout } = useAuth();
  const { hasActiveEvent } = useActiveEvent();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Deconnexion impossible', 'Reessayez dans un instant.');
    }
  }

  const displayName = profile?.displayName || user?.displayName || 'Organisateur';

  return (
    <aside className={cx('wp-sidebar', open && 'wp-sidebar--open')}>
      <div className="wp-sidebar__brand">
        <Logo variant="dark" size="md" />
      </div>

      <EventPicker onNavigate={onClose} />

      <nav className="wp-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            // Les pages dependant d'un evenement restent inaccessibles tant
            // qu'aucun mariage n'est selectionne (CDC §5.1)
            className={({ isActive }) =>
              cx(
                'wp-sidebar__link',
                isActive && 'wp-sidebar__link--active',
                item.requiresEvent && !hasActiveEvent && 'wp-sidebar__link--disabled'
              )
            }
            aria-disabled={item.requiresEvent && !hasActiveEvent}
            tabIndex={item.requiresEvent && !hasActiveEvent ? -1 : undefined}
          >
            <span className="wp-sidebar__icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="wp-sidebar__footer">
        <div className="wp-sidebar__profile">
          <Avatar name={displayName} size="sm" />
          <span style={{ minWidth: 0 }}>
            <span className="wp-sidebar__profile-name">{displayName}</span>
            <span className="wp-sidebar__profile-email">{user?.email}</span>
          </span>
        </div>

        <button type="button" className="wp-sidebar__logout" onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Se deconnecter
        </button>
      </div>
    </aside>
  );
}

/** Coquille des pages admin : sidebar fixe desktop, hamburger sur mobile. */
function AdminShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Referme le menu mobile a chaque changement de page
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="wp-admin">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div
        className={cx('wp-admin__overlay', menuOpen && 'wp-admin__overlay--visible')}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <div className="wp-admin__main">
        <div className="wp-admin__topbar">
          <button
            type="button"
            className="wp-admin__burger"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Logo variant="dark" size="sm" />
        </div>

        <main className="wp-admin__content wp-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** L'evenement actif est fourni a tout l'espace admin (CDC §5.1). */
export default function AdminLayout() {
  return (
    <ActiveEventProvider>
      <AdminShell />
    </ActiveEventProvider>
  );
}

/** En-tete standard des pages admin. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="wp-page-header">
      <div>
        <h1 className="wp-page-header__title">{title}</h1>
        {subtitle && <p className="wp-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>{actions}</div>}
    </header>
  );
}
