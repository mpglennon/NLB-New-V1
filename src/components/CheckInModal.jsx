import React, { useState, useEffect, useRef } from 'react';

const FADE_MS = 200;

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  overlayOpen: {
    pointerEvents: 'auto',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'var(--overlay-bg)',
    opacity: 0,
    transition: `opacity ${FADE_MS}ms ease`,
  },
  backdropOpen: {
    opacity: 1,
  },
  modal: {
    position: 'relative',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '420px',
    margin: '0 16px',
    opacity: 0,
    transform: 'translateY(20px)',
    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
  },
  modalOpen: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    marginBottom: '24px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    height: '48px',
    background: 'var(--bg-input)',
    border: '2px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '0 16px',
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 200ms ease',
    boxSizing: 'border-box',
  },
  noteInput: {
    width: '100%',
    height: '40px',
    background: 'var(--bg-input)',
    border: '2px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '0 16px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 200ms ease',
    boxSizing: 'border-box',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  btnPrimary: {
    flex: 1,
    height: '48px',
    background: 'var(--accent-orange)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'background 200ms ease',
  },
  btnSecondary: {
    flex: 1,
    height: '48px',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '2px solid var(--border-focus)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 200ms ease, border-color 200ms ease',
  },
  delta: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginTop: '16px',
  },
};

export default function CheckInModal({ isOpen, onClose, currentBalance, onUpdate }) {
  const [balance, setBalance] = useState('');
  const inputRef = useRef(null);

  // Reset & focus on open
  useEffect(() => {
    if (isOpen) {
      setBalance(String(currentBalance));
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, currentBalance]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const numericBalance = parseFloat(balance) || 0;
  const delta = numericBalance - currentBalance;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNaN(parseFloat(balance))) return;
    onUpdate(numericBalance);
    onClose();
  };

  const deltaColor = delta > 0 ? 'var(--safe-green)' : delta < 0 ? 'var(--critical-red)' : 'var(--text-tertiary)';
  const deltaText =
    delta > 0
      ? `+$${delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : delta < 0
        ? `-$${Math.abs(delta).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00';

  return (
    <div
      style={{ ...s.overlay, ...(isOpen ? s.overlayOpen : {}) }}
      aria-hidden={!isOpen}
    >
      <div
        style={{ ...s.backdrop, ...(isOpen ? s.backdropOpen : {}) }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Check In"
        style={{ ...s.modal, ...(isOpen ? s.modalOpen : {}) }}
      >
        <h2 style={s.title}>Check In</h2>
        <p style={s.subtitle}>Match your bank balance in 10 seconds</p>
        <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: '-16px', marginBottom: '20px' }}>No judgment. Just accuracy.</p>

        <form onSubmit={handleSubmit}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Current Balance</label>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              style={s.input}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent-orange)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; }}
              placeholder="0.00"
            />
          </div>

          {/* Delta — shows inline so you see the change before committing */}
          <div style={{ ...s.delta, textAlign: 'left', marginBottom: '4px' }}>
            Change from last check-in:{' '}
            <span style={{ color: deltaColor, fontWeight: '700' }}>{deltaText}</span>
          </div>

          <div style={s.actions}>
            <button type="submit" style={s.btnPrimary}>Check In</button>
            <button
              type="button"
              style={s.btnSecondary}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
