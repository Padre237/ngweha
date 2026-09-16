import { cx } from '../../lib/utils.js';
import Button from './Button.jsx';
import './Loader.css';

/** Spinner circulaire orange. */
export default function Loader({ size = 24, label, className }) {
  const spinner = (
    <span
      className={cx('wp-spinner', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label || 'Chargement'}
    />
  );

  if (!label) return spinner;

  return (
    <div className="wp-loader-block">
      {spinner}
      <span>{label}</span>
    </div>
  );
}

/** Bloc skeleton — utilise pendant le chargement de la Guest Page (CDC §6.2). */
export function Skeleton({ width = '100%', height = 16, radius, className, style }) {
  return (
    <span
      className={cx('wp-skeleton', className)}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** Liste de skeletons, pour les listes en cours de chargement. */
export function SkeletonList({ rows = 5, height = 64 }) {
  return (
    <div className="wp-skeleton-list" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} radius="var(--radius-md)" />
      ))}
    </div>
  );
}

/** Etat vide standardise — chaque liste doit le gerer (CDC §8.2). */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="wp-empty">
      {icon}
      <p className="wp-empty__title">{title}</p>
      {description && <p className="wp-empty__description">{description}</p>}
      {action && <div className="wp-empty__action">{action}</div>}
    </div>
  );
}

/** Etat erreur standardise, avec relance optionnelle. */
export function ErrorState({ title = 'Une erreur est survenue', description, onRetry }) {
  return (
    <div className="wp-error-state" role="alert">
      <p className="wp-empty__title">{title}</p>
      {description && <p className="wp-empty__description">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="wp-empty__action">
          Reessayer
        </Button>
      )}
    </div>
  );
}
