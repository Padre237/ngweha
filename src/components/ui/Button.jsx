import { cx } from '../../lib/utils.js';
import './Button.css';

/**
 * Bouton CTA — 4 variantes, 3 tailles, etats hover / disabled / loading (CDC §3.4).
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant
 * @param {'sm'|'md'|'lg'} size
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  type = 'button',
  className,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'wp-btn',
        `wp-btn--${variant}`,
        size !== 'md' && `wp-btn--${size}`,
        block && 'wp-btn--block',
        className
      )}
      {...props}
    >
      {loading && <span className="wp-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
