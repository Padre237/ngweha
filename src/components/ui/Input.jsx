import { useId } from 'react';
import { cx } from '../../lib/utils.js';
import './Input.css';

/** Loupe de la variante recherche — inline pour eviter une dependance d'icones. */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Champ de saisie unifie (CDC §3.4).
 *
 * @param {'text'|'search'|'textarea'} variant
 */
export default function Input({
  label,
  variant = 'text',
  error,
  hint,
  required = false,
  maxLength,
  value,
  className,
  id,
  ...props
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const isTextarea = variant === 'textarea';
  const Control = isTextarea ? 'textarea' : 'input';

  return (
    <div className={cx('wp-field', className)}>
      {label && (
        <label className="wp-field__label" htmlFor={fieldId}>
          {label}
          {required && <span className="wp-field__required">*</span>}
        </label>
      )}

      <div className="wp-field__control">
        {variant === 'search' && (
          <span className="wp-field__icon" aria-hidden="true">
            <SearchIcon />
          </span>
        )}
        <Control
          id={fieldId}
          type={isTextarea ? undefined : variant === 'search' ? 'search' : 'text'}
          value={value}
          maxLength={maxLength}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cx('wp-input', `wp-input--${variant}`, error && 'wp-input--error')}
          {...props}
        />
      </div>

      {maxLength && isTextarea && (
        <span className="wp-field__counter">
          {String(value ?? '').length} / {maxLength}
        </span>
      )}
      {error && (
        <span className="wp-field__error" id={`${fieldId}-error`} role="alert">
          {error}
        </span>
      )}
      {!error && hint && <span className="wp-field__hint">{hint}</span>}
    </div>
  );
}
