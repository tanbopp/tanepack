// Material Design 3 Email + Password registration page linked to Supabase Auth profiles
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/lib/useAuth';
import { M3Button, M3TextField } from '@shared/ui';
import { AuthCardLayout } from './AuthCardLayout';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isConfigured, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    setFormError(null);
    setConfirmationMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signUp(trimmedEmail, password, fullName.trim() || undefined);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.session) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setConfirmationMessage(
        'Account created! Please check your email to confirm your address, then log in.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="Create account"
      subtitle="Save your packaging dielines and access them from any device."
      icon="person_add"
      errorMessage={formError}
      infoMessage={confirmationMessage}
      isConfigured={isConfigured}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      footerText="Already have an account?"
      footerLinkLabel="Log In"
      footerLinkTo="/login"
    >
      <M3TextField
        id="register-full-name"
        label="Full Name"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
      />
      <M3TextField
        id="register-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <M3TextField
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        helperText="Minimum 6 characters"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <M3Button
        type="submit"
        m3Variant="filled"
        fullWidth
        disabled={!isConfigured || isSubmitting}
        sx={{ mt: 0.5 }}
      >
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </M3Button>
    </AuthCardLayout>
  );
}
