import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/pos');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError: boolean) => {
    const s: React.CSSProperties = {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      boxSizing: 'border-box',
      border: `1px solid ${hasError ? '#737373' : '#a3a3a3'}`,
      borderRadius: '4px',
      background: '#f5f5f5',
      color: '#262626',
      outline: 'none',
      transition: 'border-color 150ms',
    };
    return s;
  };

  const wrapStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  };

  const errorStyle: React.CSSProperties = {
    color: '#525252',
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.02em',
  };

  const submitErrorStyle: React.CSSProperties = {
    ...errorStyle,
    marginBottom: '16px',
    padding: '8px 10px',
    background: '#f5f5f5',
    border: '1px solid #a3a3a3',
    borderRadius: '4px',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          background: '#ffffff',
          border: '1px solid #e5e5e5',
          borderRadius: '6px',
          padding: '32px 28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#262626',
            textAlign: 'center',
            marginBottom: '24px',
            letterSpacing: '-0.01em',
          }}
        >
          Staff Sign In
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div style={wrapStyle}>
            <label htmlFor="email" style={errorStyle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validate}
              placeholder="you@restaurant.com"
              style={inputStyle(!!fieldErrors.email)}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" role="alert" style={errorStyle}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div style={wrapStyle}>
            <label htmlFor="password" style={errorStyle}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={validate}
              placeholder="Enter your password"
              style={inputStyle(!!fieldErrors.password)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <span id="password-error" role="alert" style={errorStyle}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {submitError && (
            <div role="alert" style={submitErrorStyle}>
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              background: submitting ? '#737373' : '#262626',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              marginTop: '8px',
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
