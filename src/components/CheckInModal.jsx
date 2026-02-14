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
    background: 'rgba(0,0,0,0.6)',
    opacity: 0,
    transition: `opacity ${FADE_MS}ms ease`,
  },
  backdropOpen: {
    opacity: 1,
  },
  modal: {
    position: 'relative',
    background: '#2A2A2A',
    border: '1px solid #333333',
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
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#A0A0A0',
    marginBottom: '24px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#E0E0E0',
    display: 'block',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    height: '48px',
    background: '#1A1A1A',
    border: '2px solid #333333',
    borderRadius: '8px',
    padding: '0 16px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 200ms ease',
    boxSizing: 'border-box',
  },
  noteInput: {
    width: '100%',
    height: '40px',
    background: '#1A1A1A',
    border: '2px solid #333333',
    borderRadius: '8px',
    padding: '0 16px',
    fontSize: '14px',
    color: '#FFFFFF',
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
    background: '#FF6B35',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    border: '2px solid #FFFFFF',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 200ms ease, border-color 200ms ease',
  },
  delta: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#A0A0A0',
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

  const deltaColor = delta > 0 ? '#4CAF50' : delta < 0 ? '#FF5252' : '#A0A0A0';
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
              onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; }}
              onBlur={(e) => { e.target.style.borderColor = '#333333'; }}
              placeholder="0.00"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Quick Note (Optional)</label>
            <input
              type="text"
              style={s.noteInput}
              placeholder="e.g., 'Paid rent early'"
              onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; }}
              onBlur={(e) => { e.target.style.borderColor = '#333333'; }}
            />
          </div>

          <div style={s.actions}>
            <button type="submit" style={s.btnPrimary}>Update</button>
            <button
              type="button"
              style={s.btnSecondary}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>

        <div style={s.delta}>
          Delta from last check-in:{' '}
          <span style={{ color: deltaColor, fontWeight: '600' }}>{deltaText}</span>
        </div>
      </div>
    </div>
  );
}
