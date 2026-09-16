import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout, { AuthAlert } from '../components/layout/AuthLayout.jsx';
import { Button, Input, Loader, useToast } from '../components/ui/index.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { getAuthErrorMessage, isValidEmail } from '../lib/authErrors.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const {
    login,
    sendMagicLink,
    isMagicLink,
    getStoredMagicLinkEmail,
    completeMagicLink,
    isAuthenticated,
    initializing,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mode « connexion sans mot de passe » (CDC §4.2)
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // Etat du retour de lien magique : l'utilisateur revient depuis sa boite mail
  const [completingLink, setCompletingLink] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  // URL demandee avant la redirection vers /login (CDC §4.3)
  const redirectTo = location.state?.from?.pathname || '/events';

  // ── Retour du Magic Link : on termine la connexion des le montage ──
  useEffect(() => {
    if (!isMagicLink()) return;

    const storedEmail = getStoredMagicLinkEmail();

    // Sans email memorise (autre navigateur, navigation privee), on le redemande
    if (!storedEmail) {
      setMagicMode(true);
      setNeedsEmailConfirmation(true);
      return;
    }

    setCompletingLink(true);
    completeMagicLink(storedEmail)
      .then(() => {
        toast.success('Connexion reussie', 'Bienvenue sur WeddingPass.');
        navigate(redirectTo, { replace: true });
      })
      .catch((caught) => {
        setError(getAuthErrorMessage(caught));
        setCompletingLink(false);
      });
    // Volontairement monte une seule fois : le lien n'est consommable qu'une fois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session deja active : on ne laisse pas l'utilisateur sur /login
  useEffect(() => {
    if (!initializing && isAuthenticated && !isMagicLink()) {
      navigate(redirectTo, { replace: true });
    }
  }, [initializing, isAuthenticated, isMagicLink, navigate, redirectTo]);

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError("L'adresse email n'est pas valide.");
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
      toast.success('Connexion reussie', 'Bienvenue sur WeddingPass.');
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicSubmit(event) {
    event.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError("L'adresse email n'est pas valide.");
      return;
    }

    setSubmitting(true);
    try {
      // Cas du retour de lien sans email memorise : on finalise directement
      if (needsEmailConfirmation) {
        await completeMagicLink(email);
        toast.success('Connexion reussie', 'Bienvenue sur WeddingPass.');
        navigate(redirectTo, { replace: true });
        return;
      }

      await sendMagicLink(email);
      setMagicSent(true);
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (completingLink) {
    return (
      <AuthLayout title="Connexion en cours" subtitle="Validation de votre lien…">
        <Loader size={28} label="Un instant…" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Se connecter"
      subtitle="Accedez a vos evenements et a vos invites."
      footer={
        <>
          Pas encore de compte ? <Link to="/register">Creer un compte</Link>
        </>
      }
    >
      <AuthAlert>{error}</AuthAlert>

      {magicSent ? (
        <div className="wp-auth__center">
          <AuthAlert variant="success">
            Lien envoye. Ouvrez votre boite mail et cliquez sur le lien pour vous connecter.
          </AuthAlert>
          <Button
            variant="ghost"
            block
            onClick={() => {
              setMagicSent(false);
              setMagicMode(false);
            }}
          >
            Retour a la connexion
          </Button>
        </div>
      ) : magicMode ? (
        <form className="wp-auth__form" onSubmit={handleMagicSubmit}>
          {needsEmailConfirmation && (
            <AuthAlert variant="info">
              Confirmez l'adresse a laquelle ce lien a ete envoye.
            </AuthAlert>
          )}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <div className="wp-auth__actions">
            <Button type="submit" block loading={submitting}>
              {needsEmailConfirmation ? 'Me connecter' : 'Recevoir un lien'}
            </Button>
            {!needsEmailConfirmation && (
              <Button variant="ghost" block onClick={() => setMagicMode(false)}>
                Utiliser mon mot de passe
              </Button>
            )}
          </div>
        </form>
      ) : (
        <>
          <form className="wp-auth__form" onSubmit={handlePasswordLogin}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="wp-auth__actions">
              <Button type="submit" block loading={submitting}>
                Se connecter
              </Button>
            </div>
          </form>

          <div className="wp-auth__divider">ou</div>

          <Button variant="secondary" block onClick={() => setMagicMode(true)}>
            Connexion sans mot de passe
          </Button>
        </>
      )}
    </AuthLayout>
  );
}
