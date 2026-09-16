import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/utils.js';
import './Toast.css';

const ToastContext = createContext(null);

/** Jamais plus de 3 toasts simultanes (Charte ch.07). */
const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

const ICONS = {
  success: 'M20 6 9 17l-5-5',
  error: 'M6 6l12 12M18 6L6 18',
  warning: 'M12 8v5m0 3.5v.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-5m0-3.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
};

/**
 * Fournit `useToast()` a toute l'application.
 * Chaque mutation Firestore doit produire un toast de retour (CDC §8.2).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, title, message) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, variant, title, message }].slice(-MAX_TOASTS));
      timersRef.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      warning: (title, message) => push('warning', title, message),
      info: (title, message) => push('info', title, message),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="wp-toasts" role="region" aria-live="polite" aria-label="Notifications">
          {toasts.map((toast) => (
            <div key={toast.id} className={cx('wp-toast', `wp-toast--${toast.variant}`)}>
              <span className="wp-toast__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[toast.variant]} />
                </svg>
              </span>
              <div className="wp-toast__content">
                <p className="wp-toast__title">{toast.title}</p>
                {toast.message && <p className="wp-toast__message">{toast.message}</p>}
              </div>
              <button
                type="button"
                className="wp-toast__close"
                onClick={() => dismiss(toast.id)}
                aria-label="Fermer la notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/** Accede aux notifications depuis n'importe quel composant. */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit etre utilise a l\'interieur de <ToastProvider>.');
  }
  return context;
}
