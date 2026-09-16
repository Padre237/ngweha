import { getPasswordStrength } from '../lib/authErrors.js';

/** Jauge de robustesse affichee en temps reel sous le mot de passe (CDC §4.2). */
export default function PasswordStrength({ password }) {
  const { score, label, tone } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="wp-password-strength">
      <div className="wp-password-strength__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`wp-password-strength__bar${
              step <= score ? ` wp-password-strength__bar--${tone}` : ''
            }`}
          />
        ))}
      </div>
      <span className="wp-password-strength__label">Securite : {label}</span>
    </div>
  );
}
