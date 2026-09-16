import { cx } from '../lib/utils.js';
import './Logo.css';

const MARK_SIZES = { sm: 20, md: 26, lg: 34 };

/**
 * Logotype WeddingPass : symbole d'alliance + mot-symbole (Charte ch.01).
 * Seules les variantes light / dark / orange sont autorisees.
 *
 * @param {'light'|'dark'|'orange'} variant
 * @param {'sm'|'md'|'lg'} size
 */
export default function Logo({ variant = 'light', size = 'md', withText = true, className }) {
  const markSize = MARK_SIZES[size];
  const ringColor = variant === 'orange' ? 'var(--color-white)' : 'var(--color-primary)';
  const ringColorLight =
    variant === 'orange' ? 'var(--color-primary-pale)' : 'var(--color-primary-light)';

  return (
    <span
      className={cx('wp-logo', `wp-logo--${variant}`, `wp-logo--${size}`, className)}
      aria-label="WeddingPass"
    >
      <svg
        className="wp-logo__mark"
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="18" r="9" stroke={ringColor} strokeWidth="2.5" />
        <circle cx="20" cy="18" r="9" stroke={ringColorLight} strokeWidth="2.5" />
      </svg>

      {withText && (
        <span>
          <span className="wp-logo__text--wedding">Wedding</span>
          <span className="wp-logo__text--pass">Pass</span>
        </span>
      )}
    </span>
  );
}
