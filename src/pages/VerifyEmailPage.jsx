import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { AuthAlert } from '../components/layout/AuthLayout.jsx';
import { Button, useToast } from '../components/ui/index.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { getAuthErrorMessage } from '../lib/authErrors.js';

/**
 * Ecran intermediaire affiche lorsqu'un compte existe mais que son email
 * n'est pas encore verifie (CDC §4.2).
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isEmailVerified, resendVerificationEmail, refreshUser, logout } = useAuth();

  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  // Cas d'un acces direct a l'URL sans session
  if (!user) {
    return (
      <AuthLayout title="Verification de l'email">
        <div className="wp-auth__center">
          <AuthAlert variant="info">Connectez-vous pour verifier votre adresse email.</AuthAlert>
          <Button block onClick={() => navigate('/login', { replace: true })}>
            Aller a la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  async function handleResend() {
    setError('');
    setSending(true);
    try {
      await resendVerificationEmail();
      toast.success('Email envoye', 'Consultez votre boite de reception.');
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    setError('');
    setChecking(true);
    try {
      const refreshed = await refreshUser();
      if (refreshed?.emailVerified) {
        toast.success('Email verifie', 'Votre compte est actif.');
        navigate('/events', { replace: true });
      } else {
        setError("L'email n'est pas encore verifie. Cliquez sur le lien recu, puis reessayez.");
      }
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <AuthLayout title="Verifiez votre email">
      <div className="wp-auth__center">
        <span className="wp-auth__icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </span>

        <p className="wp-auth__subtitle">
          Nous avons envoye un lien de verification a{' '}
          <span className="wp-auth__email">{user.email}</span>. Cliquez dessus pour activer votre
          compte.
        </p>

        <AuthAlert>{error}</AuthAlert>
        {isEmailVerified && (
          <AuthAlert variant="success">Votre email est verifie. Vous pouvez continuer.</AuthAlert>
        )}

        <div className="wp-auth__actions">
          <Button block loading={checking} onClick={handleCheck}>
            J'ai verifie mon email
          </Button>
          <Button variant="secondary" block loading={sending} onClick={handleResend}>
            Renvoyer l'email de verification
          </Button>
          <Button variant="ghost" block onClick={handleLogout}>
            Se deconnecter
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
