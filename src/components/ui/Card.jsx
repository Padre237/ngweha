import { cx } from '../../lib/utils.js';
import './Card.css';

/**
 * Conteneur de base (CDC §3.4).
 *
 * @param {'default'|'elevated'|'highlighted'} variant
 * @param {boolean} stat  Ajoute la bordure gauche orange des cards statistiques.
 */
export default function Card({
  children,
  variant = 'default',
  stat = false,
  title,
  action,
  className,
  onClick,
  ...props
}) {
  const interactive = typeof onClick === 'function';

  return (
    <div
      className={cx(
        'wp-card',
        `wp-card--${variant}`,
        stat && 'wp-card--stat',
        interactive && 'wp-card--interactive',
        className
      )}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(event);
              }
            }
          : undefined
      }
      {...props}
    >
      {(title || action) && (
        <div className="wp-card__header">
          {title && <h3 className="wp-card__title">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
