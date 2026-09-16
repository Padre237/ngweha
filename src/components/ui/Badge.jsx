import { cx } from '../../lib/utils.js';
import { EVENT_STATUS, RSVP_STATUS, SCAN_STATUS } from '../../lib/constants.js';
import './Badge.css';

/** Categorie d'invite → variante visuelle. */
const CATEGORY_VARIANTS = {
  VIP: 'vip',
  Famille: 'famille',
  Amis: 'amis',
  Collegues: 'collegues',
};

/** Statut metier → variante semantique. */
const STATUS_VARIANTS = {
  [RSVP_STATUS.CONFIRMED]: 'success',
  [RSVP_STATUS.PENDING]: 'warning',
  [RSVP_STATUS.DECLINED]: 'error',
  [SCAN_STATUS.SCANNED]: 'success',
  [SCAN_STATUS.NOT_SCANNED]: 'neutral',
  [EVENT_STATUS.ACTIVE]: 'success',
  [EVENT_STATUS.DRAFT]: 'neutral',
  [EVENT_STATUS.COMPLETED]: 'primary',
};

/**
 * Badge pill. Passer `category` ou `status` laisse le composant choisir la
 * variante; `variant` permet de forcer une couleur.
 */
export default function Badge({ children, category, status, variant, dot = false, className }) {
  const resolved =
    variant || CATEGORY_VARIANTS[category] || STATUS_VARIANTS[status] || 'neutral';

  return (
    <span className={cx('wp-badge', `wp-badge--${resolved}`, className)}>
      {dot && <span className="wp-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
