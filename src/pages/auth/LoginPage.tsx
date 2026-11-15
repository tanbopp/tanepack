// Material Design 3 Email + Password sign-in page redirecting authenticated users to /dashboard
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/lib/useAuth';
import { M3Button, M3TextField } from '@shared/ui';
import { AuthCardLayout } from './AuthCardLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isConfigured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
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
    if (!trimmedEmail || !password) {
      setFormError('Please enter both your email and password.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn(trimmedEmail, password);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="Welcome back"
      subtitle="Log in to access and sync your saved packaging designs."
      icon="account_circle"
      errorMessage={formError}
      isConfigured={isConfigured}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      footerText="Don't have an account?"
      footerLinkLabel="Create account"
      footerLinkTo="/register"
    >
      <M3TextField
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <M3TextField
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
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
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </M3Button>
    </AuthCardLayout>
  );
}
