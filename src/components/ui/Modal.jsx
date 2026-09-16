import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/utils.js';
import './Modal.css';

/**
 * Overlay modal avec animation fade + scale (CDC §3.4).
 * Ferme sur Echap et sur clic hors du panneau; verrouille le scroll du body.
 *
 * @param {'sm'|'md'|'lg'} size
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  className,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="wp-modal__overlay"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx('wp-modal', `wp-modal--${size}`, className)}
      >
        <div className="wp-modal__header">
          {title && <h3 className="wp-modal__title">{title}</h3>}
          <button type="button" className="wp-modal__close" onClick={onClose} aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="wp-modal__body">{children}</div>

        {footer && <div className="wp-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
