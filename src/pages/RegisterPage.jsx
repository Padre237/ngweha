import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { AuthAlert } from '../components/layout/AuthLayout.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import { Button, Input, useToast } from '../components/ui/index.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { getAuthErrorMessage, isValidEmail } from '../lib/authErrors.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { register } = useAuth();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  // Validation en temps reel : les erreurs n'apparaissent qu'une fois le champ rempli (CDC §4.2)
  const fieldErrors = useMemo(() => {
    const errors = {};

    if (form.email && !isValidEmail(form.email)) {
      errors.email = "Format d'email invalide.";
    }
    if (form.password && form.password.length < 6) {
      errors.password = 'Au moins 6 caracteres.';
    }
    if (form.confirmPassword && form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    return errors;
  }, [form]);

  const isComplete =
    form.displayName.trim() &&
    isValidEmail(form.email) &&
    form.password.length >= 6 &&
    form.confirmPassword === form.password;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!isComplete) {
      setError('Veuillez corriger les champs signales.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        displayName: form.displayName.trim(),
      });

      toast.info(
        'Compte cree',
        'Un email de verification vous a ete envoye. Confirmez-le avant de vous connecter.'
      );
      navigate('/login', { replace: true });
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Creer un compte"
      subtitle="Organisez vos mariages, un evenement a la fois."
      footer={
        <>
          Deja inscrit ? <Link to="/login">Se connecter</Link>
        </>
      }
    >
      <AuthAlert>{error}</AuthAlert>

      <form className="wp-auth__form" onSubmit={handleSubmit}>
        <Input
          label="Nom complet"
          autoComplete="name"
          placeholder="Armelle Mbassi"
          value={form.displayName}
          onChange={updateField('displayName')}
          required
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={form.email}
          onChange={updateField('email')}
          error={fieldErrors.email}
          required
        />

        <div>
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={updateField('password')}
            error={fieldErrors.password}
            required
          />
          <div style={{ marginTop: 'var(--space-xs)' }}>
            <PasswordStrength password={form.password} />
          </div>
        </div>

        <Input
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={updateField('confirmPassword')}
          error={fieldErrors.confirmPassword}
          required
        />

        <div className="wp-auth__actions">
          <Button type="submit" block loading={submitting} disabled={!isComplete}>
            Creer mon compte
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
