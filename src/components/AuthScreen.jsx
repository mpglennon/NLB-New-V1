import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const MODES = { SIGN_IN: 'sign_in', RESET: 'reset' };

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(MODES.SIGN_IN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onAuth(data.session);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const title = mode === MODES.SIGN_IN ? 'Sign In' : 'Reset Password';
  const submitLabel = mode === MODES.SIGN_IN ? 'Sign In' : 'Send Reset Link';

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoBadge}>NLB</div>
          <span style={s.logoText}>Cash</span>
        </div>
        <p style={s.tagline}>Never Look Back</p>

        <h2 style={s.title}>{title}</h2>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {mode !== MODES.RESET && (
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...s.input, paddingRight: '44px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
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
                  }}
                  tabIndex={-1}
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

        {/* Mode toggles */}
        <div style={s.links}>
          {mode === MODES.SIGN_IN && (
            <>
              <a href="https://nlbcash.gumroad.com/l/ykrbxv" style={{ ...s.link, textDecoration: 'none', display: 'inline-block' }}>
                Don't have an account? <strong>Get Access</strong>
              </a>
              <button style={s.link} onClick={() => { setMode(MODES.RESET); setError(''); setMessage(''); }}>
                Forgot password?
              </button>
            </>
          )}
          {mode === MODES.RESET && (
            <button style={s.link} onClick={() => { setMode(MODES.SIGN_IN); setError(''); setMessage(''); }}>
              Back to sign in
            </button>
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
    marginBottom: '24px',
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
  trust: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '24px',
    letterSpacing: '0.03em',
  },
};
