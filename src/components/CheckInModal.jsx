import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getPastDueOccurrences } from '../utils/runway';
import { format } from 'date-fns';

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
    maxHeight: '85vh',
    overflowY: 'auto',
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

export default function CheckInModal({
  isOpen, onClose, currentBalance, onUpdate, addTransaction, getCategories,
  transactions, lastUpdated, confirmOccurrences,
}) {
  const [balance, setBalance] = useState('');
  const [showExplain, setShowExplain] = useState(false);
  const [explainCategory, setExplainCategory] = useState('');
  const [explainNote, setExplainNote] = useState('');
  const inputRef = useRef(null);

  // Two-step flow state
  const [step, setStep] = useState('balance'); // 'confirm' | 'balance'
  const [confirmSelections, setConfirmSelections] = useState({}); // { "txnId|dateKey": true/false }

  // Compute past-due items when modal opens
  const pastDueItems = useMemo(() => {
    if (!isOpen || !transactions || !lastUpdated) return [];
    return getPastDueOccurrences(transactions, lastUpdated);
  }, [isOpen, transactions, lastUpdated]);

  // Reset & focus on open
  useEffect(() => {
    if (isOpen) {
      setBalance(String(currentBalance));
      setShowExplain(false);
      setExplainCategory('');
      setExplainNote('');

      // Initialize confirm selections — default all to "already out" (true)
      if (pastDueItems.length > 0) {
        const defaults = {};
        for (const item of pastDueItems) {
          defaults[`${item.transactionId}|${item.dateKey}`] = true;
        }
        setConfirmSelections(defaults);
        setStep('confirm');
      } else {
        setConfirmSelections({});
        setStep('balance');
      }

      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, currentBalance, pastDueItems]);

  // Focus balance input when entering balance step
  useEffect(() => {
    if (isOpen && step === 'balance') {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, step]);

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
  const absDelta = Math.abs(delta);

  const handleConfirmContinue = () => {
    if (confirmOccurrences) {
      const items = pastDueItems.map((item) => ({
        transactionId: item.transactionId,
        dateKey: item.dateKey,
        confirmed: confirmSelections[`${item.transactionId}|${item.dateKey}`] ?? true,
      }));
      confirmOccurrences(items);
    }
    setStep('balance');
  };

  const toggleSelection = (key) => {
    setConfirmSelections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNaN(parseFloat(balance))) return;

    // If user explained the difference, log it as a one-time transaction
    if (showExplain && explainCategory && absDelta > 0 && addTransaction) {
      const today = new Date().toISOString().split('T')[0];
      addTransaction({
        type: delta > 0 ? 'income' : 'expense',
        category: explainCategory,
        description: explainNote || '',
        amount: absDelta,
        frequency: 'one-time',
        startDate: today,
        endDate: today,
        isActive: true,
      });
    }

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

  const categories = getCategories ? getCategories(delta > 0 ? 'income' : 'expense') : [];

  // ── Confirmation step ────────────────────────────────────────────
  const renderConfirmStep = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={s.title}>Check In</h2>
          <p style={s.subtitle}>These were due since your last check-in</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 200ms ease, background 200ms ease', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        >✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
        {pastDueItems.map((item) => {
          const key = `${item.transactionId}|${item.dateKey}`;
          const isOut = confirmSelections[key] ?? true;
          const borderColor = item.type === 'income' ? 'var(--cyan)' : 'var(--critical-red)';
          const amountColor = item.type === 'income' ? 'var(--cyan)' : 'var(--critical-red)';
          const label = item.subcategory ? `${item.category} — ${item.subcategory}` : item.category;

          return (
            <div
              key={key}
              style={{
                background: 'var(--bg-card)',
                borderRadius: '8px',
                borderLeft: `3px solid ${borderColor}`,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {format(item.date, 'MMM d')}
                  <span style={{ margin: '0 4px' }}>&middot;</span>
                  <span style={{ color: amountColor, fontWeight: '600' }}>
                    {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => { if (!isOut) toggleSelection(key); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'background 150ms ease, color 150ms ease',
                    background: isOut ? 'var(--accent-orange)' : 'var(--bg-input)',
                    color: isOut ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  Already out
                </button>
                <button
                  type="button"
                  onClick={() => { if (isOut) toggleSelection(key); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'background 150ms ease, color 150ms ease',
                    background: !isOut ? 'var(--accent-orange)' : 'var(--bg-input)',
                    color: !isOut ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  Not yet
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.actions}>
        <button type="button" style={s.btnPrimary} onClick={handleConfirmContinue}>
          Continue
        </button>
      </div>
    </>
  );

  // ── Balance step (existing UI) ───────────────────────────────────
  const renderBalanceStep = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={s.title}>Check In</h2>
          <p style={s.subtitle}>Match your bank balance in 10 seconds</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 200ms ease, background 200ms ease', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        >✕</button>
      </div>

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

        {/* Explain the difference — optional, shows when there's a delta */}
        {delta !== 0 && addTransaction && (
          <div style={{ marginTop: '12px', marginBottom: '8px' }}>
            {!showExplain ? (
              <button
                type="button"
                onClick={() => setShowExplain(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px 0',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px',
                }}
              >
                Explain the difference? (optional)
              </button>
            ) : (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Log {delta < 0 ? 'a spend' : 'income'} of{' '}
                  <span style={{ color: deltaColor, fontWeight: '700' }}>${absDelta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <select
                  value={explainCategory}
                  onChange={(e) => setExplainCategory(e.target.value)}
                  style={{
                    width: '100%', height: '36px', background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)', borderRadius: '6px',
                    padding: '0 10px', color: 'var(--text-primary)', fontSize: '13px',
                    outline: 'none', boxSizing: 'border-box', marginBottom: '8px',
                  }}
                >
                  <option value="">Pick a category...</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Quick note (optional)"
                  value={explainNote}
                  onChange={(e) => setExplainNote(e.target.value)}
                  style={{
                    width: '100%', height: '36px', background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)', borderRadius: '6px',
                    padding: '0 10px', color: 'var(--text-primary)', fontSize: '13px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setShowExplain(false); setExplainCategory(''); setExplainNote(''); }}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                    fontSize: '11px', cursor: 'pointer', padding: '6px 0 0', textDecoration: 'underline',
                  }}
                >
                  Skip — just update balance
                </button>
              </div>
            )}
          </div>
        )}

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
    </>
  );

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
        {step === 'confirm' ? renderConfirmStep() : renderBalanceStep()}
      </div>
    </div>
  );
}
