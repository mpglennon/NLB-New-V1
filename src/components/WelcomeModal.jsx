import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
const FADE_MS = 200;
const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];
const emptyForm = { category: '', customCategory: '', subcategory: '', customSubcategory: '', amount: '', frequency: 'monthly', startDate: '', description: '' };

export default function WelcomeModal({ isOpen, onSkip }) {
  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState('');

  // Multiple entries
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const [savedFlash, setSavedFlash] = useState(null); // 'income' | 'expense' | null
  const [showIncomeForm, setShowIncomeForm] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(true);

  // Current form being filled
  const [incomeDraft, setIncomeDraft] = useState({ ...emptyForm });
  const [expenseDraft, setExpenseDraft] = useState({ ...emptyForm });

  const balanceRef = useRef(null);

  const getCategories = useStore((s) => s.getCategories);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const updateSettings = useStore((s) => s.updateSettings);
  const settings = useStore((s) => s.settings);
  const updateCategoryClassification = useStore((s) => s.updateCategoryClassification);
  const hierarchy = settings.categoryHierarchy || {};
  const classification = settings.categoryClassification || {};

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ESC = skip
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleSkip();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Autofocus balance input on step 1
  useEffect(() => {
    if (step === 1 && balanceRef.current) {
      setTimeout(() => {
        balanceRef.current?.focus();
        balanceRef.current?.select();
      }, 300); // slightly longer delay for initial render
    }
  }, [step]);

  const handleSkip = () => {
    updateSettings({ hasCompletedOnboarding: true });
    if (onSkip) onSkip();
  };

  // Check if a draft has valid data
  const isDraftValid = (draft) => {
    const cat = draft.category === 'Custom' ? draft.customCategory.trim() : draft.category;
    return cat && parseFloat(draft.amount) > 0;
  };

  // Finalize a draft into a clean entry
  const finalizeDraft = (draft) => {
    const subcategory = draft.subcategory === '__custom_sub__'
      ? (draft.customSubcategory || '').trim() || null
      : draft.subcategory || null;
    return {
      category: draft.category === 'Custom' ? draft.customCategory.trim() : draft.category,
      subcategory,
      amount: parseFloat(draft.amount),
      frequency: draft.frequency,
      startDate: draft.startDate || new Date().toISOString().split('T')[0],
      description: draft.description || '',
    };
  };

  // Add current income draft to the list
  const addIncome = () => {
    if (!isDraftValid(incomeDraft)) return;
    setIncomeList([...incomeList, finalizeDraft(incomeDraft)]);
    setIncomeDraft({ ...emptyForm });
    setShowIncomeForm(false);
    setSavedFlash('income');
  };

  // Add current expense draft to the list
  const addExpense = () => {
    if (!isDraftValid(expenseDraft)) return;
    setExpenseList([...expenseList, finalizeDraft(expenseDraft)]);
    setExpenseDraft({ ...emptyForm });
    setShowExpenseForm(false);
    setSavedFlash('expense');
  };

  // Remove from list
  const removeIncome = (i) => setIncomeList(incomeList.filter((_, idx) => idx !== i));
  const removeExpense = (i) => setExpenseList(expenseList.filter((_, idx) => idx !== i));

  // Moving to next step: capture any in-progress draft
  const advanceFromIncome = () => {
    if (isDraftValid(incomeDraft)) {
      setIncomeList([...incomeList, finalizeDraft(incomeDraft)]);
      setIncomeDraft({ ...emptyForm });
    }
    setSavedFlash(null);
    setShowExpenseForm(true);
    setStep(3);
  };

  const advanceFromExpense = () => {
    if (isDraftValid(expenseDraft)) {
      setExpenseList([...expenseList, finalizeDraft(expenseDraft)]);
      setExpenseDraft({ ...emptyForm });
    }
    setSavedFlash(null);
    setStep(4);
  };

  const handleComplete = () => {
    const bal = parseFloat(balance) || 0;
    completeOnboarding(
      bal,
      incomeList.length > 0 ? incomeList : null,
      expenseList.length > 0 ? expenseList : null,
    );
  };

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const bal = parseFloat(balance) || 0;

  return (
    <div style={{ ...s.overlay, ...(isOpen ? s.overlayOpen : {}) }} aria-hidden={!isOpen}>
      <div style={{ ...s.backdrop, ...(isOpen ? s.backdropOpen : {}) }} onClick={handleSkip} />
      <div role="dialog" aria-modal="true" aria-label="Welcome" style={{ ...s.modal, ...(isOpen ? s.modalOpen : {}) }}>

        {/* Step indicator */}
        {step >= 1 && step <= 3 && (
          <div style={s.stepIndicator}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ ...s.stepDot, ...(step >= n ? s.stepDotActive : {}) }} />
            ))}
          </div>
        )}

        {/* ── STEP 1: WELCOME + BALANCE (merged) ──────────── */}
        {step === 1 && (
          <div style={s.stepContent}>
            <div style={s.stepLabel}>Step 1 of 3</div>
            <h2 style={s.headline}>Life, not lattes.</h2>
            <p style={s.body}>
              One checking account. No bank linking. Just a clear view of your runway — built by a team that's been on a severance package, on a pension, and on a deadline.
            </p>
            <p style={s.hint}>30 seconds a day to stay ahead. Let's start with what's in your account right now.</p>
            <div style={s.fieldGroup}>
              <label style={s.label}>Current Balance</label>
              <input
                ref={balanceRef}
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                style={s.bigInput}
                placeholder="0.00"
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-orange)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; }}
              />
            </div>
            <div style={s.navRow}>
              <button style={s.btnPrimary} onClick={() => setStep(2)}>Next</button>
              <button style={s.linkBtn} onClick={handleSkip}>Skip, I'll explore first</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: INCOME (multiple) ───────────────────── */}
        {step === 2 && (
          <div style={s.stepContent}>
            <div style={s.stepLabel}>Step 2 of 3</div>
            <h2 style={s.headline}>Add Your Income</h2>
            <p style={s.hintSmall}>Paycheck, pension, side hustle — start with your main sources.</p>

            {/* Already-added entries */}
            {incomeList.length > 0 && (
              <div style={s.entryList}>
                {incomeList.map((entry, i) => (
                  <div key={i} style={s.entryChip}>
                    <span style={s.entryChipText}>
                      {entry.category}{entry.subcategory ? ` · ${entry.subcategory}` : ''} &mdash; ${entry.amount.toLocaleString()} / {entry.frequency}
                    </span>
                    <button style={s.entryRemove} onClick={() => removeIncome(i)}>&#x2715;</button>
                  </div>
                ))}
              </div>
            )}

            {/* Saved confirmation + Add Another */}
            {!showIncomeForm && savedFlash === 'income' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={s.savedFlash}>Income saved.</div>
                <button
                  style={s.btnAddAnother}
                  onClick={() => { setShowIncomeForm(true); setSavedFlash(null); }}
                >
                  + Add Another Income
                </button>
              </div>
            )}

            {/* Form for next entry */}
            {showIncomeForm && (
              <>
                <div style={s.formGrid}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Category</label>
                    <select
                      style={s.select}
                      value={incomeDraft.category}
                      onChange={(e) => setIncomeDraft({ ...incomeDraft, category: e.target.value, customCategory: '', subcategory: '', customSubcategory: '' })}
                    >
                      <option value="">Select...</option>
                      {getCategories('income').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Custom">Custom...</option>
                    </select>
                    {incomeDraft.category === 'Custom' && (
                      <input
                        type="text"
                        style={{ ...s.input, marginTop: '6px' }}
                        placeholder="Enter category name"
                        value={incomeDraft.customCategory}
                        onChange={(e) => setIncomeDraft({ ...incomeDraft, customCategory: e.target.value })}
                      />
                    )}
                  </div>
                  {(incomeDraft.category && incomeDraft.category !== 'Custom' || incomeDraft.category === 'Custom' && incomeDraft.customCategory) && (
                    <div style={s.fieldGroup}>
                      <label style={s.label}>Subcategory</label>
                      <select
                        style={s.select}
                        value={incomeDraft.subcategory || ''}
                        onChange={(e) => setIncomeDraft({ ...incomeDraft, subcategory: e.target.value, customSubcategory: '' })}
                      >
                        <option value="">None</option>
                        {(hierarchy[incomeDraft.category === 'Custom' ? incomeDraft.customCategory : incomeDraft.category] || []).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="__custom_sub__">Custom...</option>
                      </select>
                      {incomeDraft.subcategory === '__custom_sub__' && (
                        <input
                          type="text"
                          style={{ ...s.input, marginTop: '6px' }}
                          placeholder="Enter subcategory name"
                          value={incomeDraft.customSubcategory || ''}
                          onChange={(e) => setIncomeDraft({ ...incomeDraft, customSubcategory: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      style={s.input}
                      value={incomeDraft.amount}
                      onChange={(e) => setIncomeDraft({ ...incomeDraft, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Frequency</label>
                    <select
                      style={s.select}
                      value={incomeDraft.frequency}
                      onChange={(e) => setIncomeDraft({ ...incomeDraft, frequency: e.target.value })}
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Start Date</label>
                    <input
                      type="date"
                      style={{ ...s.input, cursor: 'pointer' }}
                      value={incomeDraft.startDate || today}
                      onChange={(e) => setIncomeDraft({ ...incomeDraft, startDate: e.target.value })}
                      onClick={(e) => { try { e.target.showPicker(); } catch {} }}
                    />
                  </div>
                  <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
                    <label style={s.label}>Note (optional)</label>
                    <input
                      type="text"
                      style={s.input}
                      value={incomeDraft.description || ''}
                      onChange={(e) => setIncomeDraft({ ...incomeDraft, description: e.target.value })}
                      placeholder="Optional note..."
                    />
                  </div>
                </div>

                <button
                  style={{ ...s.btnSaveGreen, opacity: isDraftValid(incomeDraft) ? 1 : 0.4 }}
                  disabled={!isDraftValid(incomeDraft)}
                  onClick={addIncome}
                >
                  Save Income
                </button>
              </>
            )}

            <div style={{ ...s.navRow, marginTop: '16px' }}>
              <button
                style={{
                  ...s.btnPrimary,
                  ...(incomeList.length > 0
                    ? {}
                    : { background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '13px', height: '40px', padding: '0 20px' }),
                }}
                onClick={advanceFromIncome}
              >
                {incomeList.length > 0 ? 'Next: Add Expenses' : 'Skip to Expenses'}
              </button>
              <button style={s.btnBack} onClick={() => setStep(1)}>Back</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: EXPENSES (multiple) ─────────────────── */}
        {step === 3 && (
          <div style={s.stepContent}>
            <div style={s.stepLabel}>Step 3 of 3</div>
            <h2 style={s.headline}>Add Your Expenses</h2>
            <p style={s.hintSmall}>Rent, car, groceries, insurance — the ones that matter most.</p>

            {/* Already-added entries */}
            {expenseList.length > 0 && (
              <div style={s.entryList}>
                {expenseList.map((entry, i) => (
                  <div key={i} style={s.entryChip}>
                    <span style={s.entryChipText}>
                      {entry.category}{entry.subcategory ? ` · ${entry.subcategory}` : ''} &mdash; ${entry.amount.toLocaleString()} / {entry.frequency}
                    </span>
                    <button style={s.entryRemove} onClick={() => removeExpense(i)}>&#x2715;</button>
                  </div>
                ))}
              </div>
            )}

            {/* Saved confirmation + Add Another */}
            {!showExpenseForm && savedFlash === 'expense' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={s.savedFlash}>Expense saved.</div>
                <button
                  style={s.btnAddAnother}
                  onClick={() => { setShowExpenseForm(true); setSavedFlash(null); }}
                >
                  + Add Another Expense
                </button>
              </div>
            )}

            {/* Form for next entry */}
            {showExpenseForm && (
              <>
                <div style={s.formGrid}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Category</label>
                    <select
                      style={s.select}
                      value={expenseDraft.category}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, category: e.target.value, customCategory: '', subcategory: '', customSubcategory: '' })}
                    >
                      <option value="">Select...</option>
                      {getCategories('expense').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Custom">Custom...</option>
                    </select>
                    {expenseDraft.category === 'Custom' && (
                      <input
                        type="text"
                        style={{ ...s.input, marginTop: '6px' }}
                        placeholder="Enter category name"
                        value={expenseDraft.customCategory}
                        onChange={(e) => setExpenseDraft({ ...expenseDraft, customCategory: e.target.value })}
                      />
                    )}
                  </div>
                  {(expenseDraft.category && expenseDraft.category !== 'Custom' || expenseDraft.category === 'Custom' && expenseDraft.customCategory) && (
                    <div style={s.fieldGroup}>
                      <label style={s.label}>Subcategory</label>
                      <select
                        style={s.select}
                        value={expenseDraft.subcategory || ''}
                        onChange={(e) => setExpenseDraft({ ...expenseDraft, subcategory: e.target.value, customSubcategory: '' })}
                      >
                        <option value="">None</option>
                        {(hierarchy[expenseDraft.category === 'Custom' ? expenseDraft.customCategory : expenseDraft.category] || []).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="__custom_sub__">Custom...</option>
                      </select>
                      {expenseDraft.subcategory === '__custom_sub__' && (
                        <input
                          type="text"
                          style={{ ...s.input, marginTop: '6px' }}
                          placeholder="Enter subcategory name"
                          value={expenseDraft.customSubcategory || ''}
                          onChange={(e) => setExpenseDraft({ ...expenseDraft, customSubcategory: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      style={s.input}
                      value={expenseDraft.amount}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Frequency</label>
                    <select
                      style={s.select}
                      value={expenseDraft.frequency}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, frequency: e.target.value })}
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Start Date</label>
                    <input
                      type="date"
                      style={{ ...s.input, cursor: 'pointer' }}
                      value={expenseDraft.startDate || today}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, startDate: e.target.value })}
                      onClick={(e) => { try { e.target.showPicker(); } catch {} }}
                    />
                  </div>
                  <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
                    <label style={s.label}>Note (optional)</label>
                    <input
                      type="text"
                      style={s.input}
                      value={expenseDraft.description || ''}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, description: e.target.value })}
                      placeholder="Optional note..."
                    />
                  </div>
                  {expenseDraft.category && expenseDraft.category !== 'Custom' && (() => {
                    const catName = expenseDraft.category;
                    const cls = classification[catName] || 'flex';
                    return (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ ...s.label, marginBottom: 0 }}>Type</label>
                        <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                          <button type="button" style={{
                            padding: '4px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                            background: cls === 'non-negotiable' ? 'var(--accent-rose)' : 'transparent',
                            color: cls === 'non-negotiable' ? '#FFF' : 'var(--text-tertiary)',
                          }} onClick={() => updateCategoryClassification({ ...classification, [catName]: 'non-negotiable' })}>Fixed</button>
                          <button type="button" style={{
                            padding: '4px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                            background: cls === 'flex' ? 'var(--caution-amber)' : 'transparent',
                            color: cls === 'flex' ? '#FFF' : 'var(--text-tertiary)',
                          }} onClick={() => updateCategoryClassification({ ...classification, [catName]: 'flex' })}>Flex</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <button
                  style={{ ...s.btnSaveRose, opacity: isDraftValid(expenseDraft) ? 1 : 0.4 }}
                  disabled={!isDraftValid(expenseDraft)}
                  onClick={addExpense}
                >
                  Save Expense
                </button>
              </>
            )}

            <div style={{ ...s.navRow, marginTop: '16px' }}>
              <button
                style={{
                  ...(expenseList.length > 0 && incomeList.length > 0
                    ? { ...s.btnPrimary }
                    : { ...s.btnBack, fontSize: '13px' }),
                }}
                onClick={advanceFromExpense}
              >
                Confirm My Runway
              </button>
              <button style={s.btnBack} onClick={() => { setSavedFlash(null); setShowIncomeForm(true); setStep(2); }}>Back</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: LAUNCH ──────────────────────────────── */}
        {step === 4 && (
          <div style={s.stepContent}>
            <h2 style={s.headline}>You're set.</h2>
            <p style={s.body}>
              Your runway is live. From here, it's 30 seconds a day (more if you choose) — glance at your projection, drag or edit transactions if something shifts.
            </p>
            <p style={s.body}>
              This isn't a shortcut. It's the smart way. Consistent daily snapshots beat sporadic deep dives — every time.
            </p>

            {/* Mini summary */}
            <div style={s.summary}>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>Balance</span>
                <span style={s.summaryValue}>${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {incomeList.map((entry, i) => (
                <div key={`i-${i}`} style={s.summaryRow}>
                  <span style={s.summaryLabel}>{i === 0 ? 'Income' : ''}</span>
                  <span style={{ ...s.summaryValue, color: 'var(--accent-cyan)' }}>
                    {entry.category}{entry.subcategory ? ` · ${entry.subcategory}` : ''} &mdash; ${entry.amount.toLocaleString()} / {entry.frequency}
                  </span>
                </div>
              ))}
              {expenseList.map((entry, i) => (
                <div key={`e-${i}`} style={s.summaryRow}>
                  <span style={s.summaryLabel}>{i === 0 ? 'Expenses' : ''}</span>
                  <span style={{ ...s.summaryValue, color: 'var(--accent-rose)' }}>
                    {entry.category}{entry.subcategory ? ` · ${entry.subcategory}` : ''} &mdash; ${entry.amount.toLocaleString()} / {entry.frequency}
                  </span>
                </div>
              ))}
              {incomeList.length === 0 && expenseList.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--caution-amber)', textAlign: 'center', fontWeight: '600' }}>
                  Your runway needs at least one income and one expense to work.
                </div>
              )}
            </div>

            <p style={s.hint}>Life's complex enough. Your daily finance app shouldn't be.</p>
            {incomeList.length > 0 && expenseList.length > 0 ? (
              <button style={{
                ...s.btnPrimary,
                background: 'transparent',
                border: '2px solid var(--accent-orange)',
                color: 'var(--accent-orange)',
              }} onClick={handleComplete}>Continue to App</button>
            ) : (
              <button style={{
                ...s.btnPrimary,
                background: 'transparent',
                border: '2px solid var(--caution-amber)',
                color: 'var(--caution-amber)',
              }} onClick={() => setStep(incomeList.length === 0 ? 2 : 3)}>
                {incomeList.length === 0 ? 'Add Income First' : 'Add Expenses First'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 3000,
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
    padding: '40px 36px',
    width: '100%',
    maxWidth: '520px',
    margin: '0 16px',
    opacity: 0,
    transform: 'translateY(20px)',
    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalOpen: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepIndicator: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--border-subtle)',
    transition: 'background 200ms ease',
  },
  stepDotActive: {
    background: 'var(--accent-orange)',
  },
  stepLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--accent-orange)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '4px',
  },
  headline: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 8px 0',
    lineHeight: 1.3,
  },
  body: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: '0 0 4px 0',
  },
  hint: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
    margin: '8px 0',
  },
  hintSmall: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    margin: '0 0 8px 0',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '8px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    width: '100%',
    height: '40px',
    background: 'var(--bg-input)',
    border: '2px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '0 12px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 200ms ease',
  },
  bigInput: {
    width: '100%',
    height: '56px',
    background: 'var(--bg-input)',
    border: '2px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '0 16px',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 200ms ease',
    textAlign: 'center',
  },
  select: {
    width: '100%',
    height: '40px',
    background: 'var(--bg-input)',
    border: '2px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '0 10px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  navRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    height: '48px',
    padding: '0 32px',
    background: 'var(--accent-orange)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'filter 150ms ease',
  },
  btnBack: {
    height: '40px',
    padding: '0 20px',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnAddAnother: {
    background: 'transparent',
    border: '2px dashed var(--accent-orange)',
    color: 'var(--accent-orange)',
    borderRadius: '8px',
    padding: '14px 0',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    transition: 'all 200ms ease',
    letterSpacing: '0.02em',
  },
  btnSave: {
    background: 'var(--accent-orange)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 0',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    transition: 'opacity 200ms ease',
    letterSpacing: '0.02em',
  },
  btnSaveGreen: {
    background: 'var(--safe-green)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 0',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    transition: 'opacity 200ms ease',
    letterSpacing: '0.02em',
  },
  btnSaveRose: {
    background: 'var(--accent-rose)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 0',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    transition: 'opacity 200ms ease',
    letterSpacing: '0.02em',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    padding: '4px 0',
  },
  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '4px',
  },
  entryChip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  entryChipText: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  entryRemove: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  summary: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    margin: '8px 0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    minWidth: '70px',
  },
  summaryValue: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  savedFlash: {
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--safe-green)',
    background: 'rgba(76,175,80,0.1)',
    border: '1px solid rgba(76,175,80,0.3)',
    borderRadius: '6px',
    padding: '8px 12px',
    marginTop: '4px',
  },
};
