import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const MODES = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  RESET: 'reset',
};

const GUMROAD_URL = 'https://nlbcash.gumroad.com/l/ykrbxv';
const SUPPORT_EMAIL = 'support@nlbcash.ca';
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=NLBCash%20Support`;
const SETUP_QUERY_VALUES = new Set(['setup', 'sign_up', 'signup', 'activate']);

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(MODES.SIGN_IN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = (params.get('mode') || '').toLowerCase();
    const setupFlag = (params.get('setup') || '').toLowerCase();

    if (SETUP_QUERY_VALUES.has(modeParam) || ['1', 'true', 'yes'].includes(setupFlag)) {
      setMode(MODES.SIGN_UP);
    }
  }, []);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === MODES.RESET) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Check your email for the reset link.');
        setLoading(false);
        return;
      }

      if (mode === MODES.SIGN_UP) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.session) {
          onAuth(data.session);
          return;
        }

        setMessage('Account setup started. Check your email to confirm your account, then sign in.');
        switchMode(MODES.SIGN_IN);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onAuth(data.session);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    }

    setLoading(false);
  };

  const isSignIn = mode === MODES.SIGN_IN;
  const isSignUp = mode === MODES.SIGN_UP;
  const isReset = mode === MODES.RESET;

  const title = isSignIn ? 'Sign In' : isSignUp ? 'Set Up Your Account' : 'Reset Password';
  const submitLabel = isSignIn ? 'Sign In' : isSignUp ? 'Create Password' : 'Send Reset Link';
  const helperText = isSignUp
    ? 'Already purchased NLBCash? Use the same email you used at checkout to create your password and enter the app.'
    : null;

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoBadge}>NLB</div>
          <span style={s.logoText}>Cash</span>
        </div>
        <p style={s.tagline}>Never Look Back</p>

        <h1 style={s.title}>{title}</h1>
        {helperText && <p style={s.helper}>{helperText}</p>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label htmlFor="auth-email" style={s.label}>Email</label>
            <input
              id="auth-email"
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {!isReset && (
            <div style={s.field}>
              <label htmlFor="auth-password" style={s.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...s.input, paddingRight: '44px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create a password' : ''}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={s.eyeButton}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && <div style={s.error}>{error}</div>}
          {message && <div style={s.success}>{message}</div>}

          <button type="submit" style={s.submit} disabled={loading}>
            {loading ? 'Working...' : submitLabel}
          </button>
        </form>

        <div style={s.links}>
          {isSignIn && (
            <>
              <button style={s.primaryLink} onClick={() => switchMode(MODES.SIGN_UP)}>
                Already purchased? <strong>Set up your account</strong>
              </button>
              <button style={s.link} onClick={() => switchMode(MODES.RESET)}>
                Forgot password?
              </button>
              <a href={SUPPORT_MAILTO} style={{ ...s.link, textDecoration: 'none', display: 'inline-block' }}>
                Need help? <strong>Contact support</strong>
              </a>
              <a href={GUMROAD_URL} style={{ ...s.link, textDecoration: 'none', display: 'inline-block' }}>
                Haven't purchased yet? <strong>Get Access</strong>
              </a>
            </>
          )}

          {isSignUp && (
            <>
              <button style={s.link} onClick={() => switchMode(MODES.SIGN_IN)}>
                Already have a password? Sign in
              </button>
              <a href={SUPPORT_MAILTO} style={{ ...s.link, textDecoration: 'none', display: 'inline-block' }}>
                Need help? <strong>Contact support</strong>
              </a>
              <a href={GUMROAD_URL} style={{ ...s.link, textDecoration: 'none', display: 'inline-block' }}>
                Need to purchase first? <strong>Get Access</strong>
              </a>
            </>
          )}

          {isReset && (
            <>
              <button style={s.link} onClick={() => switchMode(MODES.SIGN_IN)}>
                Back to sign in
              </button>
              <a href={SUPPORT_MAILTO} style={{ ...s.link, textDecoration: 'none', display: 'inline-block' }}>
                Need help? <strong>Contact support</strong>
              </a>
            </>
          )}
        </div>

        <p style={s.trust}>Data synced securely. Your finances stay private.</p>
      </div>
    </div>
  );
}

const s = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-page)',
    padding: '24px',
    fontFamily: 'var(--font-family)',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    marginBottom: '4px',
  },
  logoBadge: {
    backgroundColor: 'var(--accent-orange)',
    color: 'white',
    fontSize: '22px',
    fontWeight: '800',
    padding: '5px 12px',
    borderRadius: '8px',
    letterSpacing: '0.04em',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '800',
    background: 'linear-gradient(90deg, #00E5FF 0%, #FF6B8A 45%, #4CAF50 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  tagline: {
    textAlign: 'center',
    fontSize: '11px',
    fontStyle: 'italic',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.12em',
    marginBottom: '28px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textAlign: 'center',
    marginBottom: '12px',
  },
  helper: {
    textAlign: 'center',
    fontSize: '12px',
    lineHeight: 1.5,
    color: 'var(--text-secondary)',
    marginBottom: '18px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {},
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    height: '44px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '0 14px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms ease',
  },
  eyeButton: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    width: '100%',
    height: '44px',
    backgroundColor: 'var(--accent-gold)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '4px',
    transition: 'filter 150ms ease',
  },
  error: {
    background: 'rgba(255,82,82,0.12)',
    border: '1px solid var(--critical-red)',
    color: 'var(--critical-red)',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '500',
  },
  success: {
    background: 'rgba(76,175,80,0.12)',
    border: '1px solid var(--safe-green)',
    color: 'var(--safe-green)',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '500',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px',
  },
  primaryLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px',
  },
  trust: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '24px',
    letterSpacing: '0.03em',
  },
};
