import React, { useState, useEffect, useRef } from 'react';

const FADE_MS = 200;
import useStore from '../store/useStore';
import { defaultIncomeCategories, defaultExpenseCategories } from '../data/demoData';

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
    borderRadius: '12px',
    padding: '22px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    opacity: 0,
    transform: 'translateY(16px)',
    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
    zIndex: 1,
  },
  modalOpen: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '18px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 200ms ease, background 200ms ease',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '6px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  label: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  sublabel: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  input: {
    width: '100px',
    height: '32px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '0 10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    textAlign: 'right',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    height: '32px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '0 10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  },
  catList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '8px',
  },
  catChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    background: 'var(--bg-hover)',
  },
  catRemove: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1,
  },
  hiddenChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    background: 'var(--bg-input)',
    border: '1px dashed var(--border-subtle)',
  },
  restoreBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-orange)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0',
  },
  addRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
  addInput: {
    flex: 1,
    height: '30px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '0 10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  addBtn: {
    height: '30px',
    padding: '0 14px',
    background: 'var(--accent-orange)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
};

export default function SettingsModal({ isOpen, onClose }) {
  const {
    settings, updateSettings, addCustomCategory, removeCategory, restoreCategory, getCategories,
    updateCategoryHierarchy, updateCategoryClassification,
    resetAll, signOut,
  } = useStore();

  const [threshold, setThreshold] = useState(String(settings.cautionThreshold));
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [expandedExpenseCat, setExpandedExpenseCat] = useState(null);
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setThreshold(String(settings.cautionThreshold));
      setShowReset(false);
      setResetConfirm('');
    }
  }, [isOpen, settings.cautionThreshold]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const activeIncome = getCategories('income');
  const activeExpense = getCategories('expense');
  const hiddenIncome = settings.hiddenIncomeCategories || [];
  const hiddenExpense = settings.hiddenExpenseCategories || [];

  const handleThresholdBlur = () => {
    const val = parseInt(threshold, 10);
    if (!isNaN(val) && val >= 0) {
      updateSettings({ cautionThreshold: val });
    }
  };

  const handleAddIncome = () => {
    const name = newIncomeCat.trim();
    if (name && !activeIncome.includes(name)) {
      addCustomCategory('income', name);
      setNewIncomeCat('');
    }
  };

  const handleAddExpense = () => {
    const name = newExpenseCat.trim();
    if (name && !activeExpense.includes(name)) {
      addCustomCategory('expense', name);
      setNewExpenseCat('');
    }
  };

  return (
    <div style={{ ...s.overlay, ...(isOpen ? s.overlayOpen : {}) }}>
      <div
        style={{ ...s.backdrop, ...(isOpen ? s.backdropOpen : {}) }}
        onClick={onClose}
      />
      <div
        style={{ ...s.modal, ...(isOpen ? s.modalOpen : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={s.header}>
          <h2 style={s.title}>Settings</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>All data saved</span>
            <button
              style={s.closeBtn}
              onClick={onClose}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
            >✕</button>
          </div>
        </div>

        {/* Appearance */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Appearance</div>
          <div style={s.row}>
            <div style={s.label}>Theme</div>
            <div style={{
              display: 'flex',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}>
              {['dark', 'light'].map((t) => (
                <button
                  key={t}
                  style={{
                    padding: '6px 16px',
                    background: settings.theme === t ? 'var(--accent-orange)' : 'transparent',
                    color: settings.theme === t ? '#FFFFFF' : 'var(--text-tertiary)',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 200ms ease',
                  }}
                  onClick={() => updateSettings({ theme: t })}
                >
                  {t === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Preferences</div>
          <div style={s.row}>
            <div>
              <div style={s.label}>Caution threshold</div>
              <div style={s.sublabel}>Amber warning when balance drops below this</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>$</span>
              <input
                type="number"
                style={s.input}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                onBlur={handleThresholdBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleThresholdBlur(); }}
              />
            </div>
          </div>
          <div style={s.row}>
            <div style={s.label}>Week starts on</div>
            <select
              style={s.select}
              value={settings.weekStartsOn}
              onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) })}
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
          <div style={s.row}>
            <div>
              <div style={s.label}>Default view</div>
              <div style={s.sublabel}>What to show when you open the app</div>
            </div>
            <select
              style={s.select}
              value={settings.defaultView || 'rolling-30'}
              onChange={(e) => updateSettings({ defaultView: e.target.value })}
            >
              <option value="rolling-30">Next 30 days</option>
              <option value="rolling-60">Next 60 days</option>
              <option value="rolling-90">Next 90 days</option>
              <option value="rolling-365">Next 1 year</option>
              <option value="current-month">Current month</option>
            </select>
          </div>
        </div>

        {/* Income Categories */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Income Categories</div>
          <div style={s.catList}>
            {activeIncome.map((cat) => (
              <div key={cat} style={s.catChip}>
                <span>{cat}</span>
                <button style={s.catRemove} onClick={() => removeCategory('income', cat)}>✕</button>
              </div>
            ))}
          </div>
          {hiddenIncome.length > 0 && (
            <div style={{ ...s.catList, marginTop: '6px' }}>
              {hiddenIncome.map((cat) => (
                <div key={cat} style={s.hiddenChip}>
                  <span>{cat}</span>
                  <button style={s.restoreBtn} onClick={() => restoreCategory('income', cat)}>restore</button>
                </div>
              ))}
            </div>
          )}
          <div style={s.addRow}>
            <input
              type="text"
              style={s.addInput}
              value={newIncomeCat}
              onChange={(e) => setNewIncomeCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddIncome(); }}
              placeholder="Add custom category..."
            />
            <button style={s.addBtn} onClick={handleAddIncome}>Add</button>
          </div>
        </div>

        {/* Expense Categories */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Expense Categories</div>
          <div style={s.catList}>
            {activeExpense.map((cat) => (
              <div key={cat} style={s.catChip}>
                <span>{cat}</span>
                <button style={s.catRemove} onClick={() => removeCategory('expense', cat)}>✕</button>
              </div>
            ))}
          </div>
          {hiddenExpense.length > 0 && (
            <div style={{ ...s.catList, marginTop: '6px' }}>
              {hiddenExpense.map((cat) => (
                <div key={cat} style={s.hiddenChip}>
                  <span>{cat}</span>
                  <button style={s.restoreBtn} onClick={() => restoreCategory('expense', cat)}>restore</button>
                </div>
              ))}
            </div>
          )}
          <div style={s.addRow}>
            <input
              type="text"
              style={s.addInput}
              value={newExpenseCat}
              onChange={(e) => setNewExpenseCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddExpense(); }}
              placeholder="Add custom category..."
            />
            <button style={s.addBtn} onClick={handleAddExpense}>Add</button>
          </div>
        </div>

        {/* Spending Classification + Subcategories */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Spending Classification</div>
          <div style={s.sublabel}>Assign expense categories to Non-Negotiable or Flex Spending columns</div>
          <div style={{ marginTop: '8px' }}>
            {activeExpense.map((cat) => {
              const cls = (settings.categoryClassification || {})[cat] || 'flex';
              const hierarchy = settings.categoryHierarchy || {};
              const subs = hierarchy[cat] || [];
              const isExpanded = expandedExpenseCat === cat;

              return (
                <div key={cat} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Expand/collapse chevron */}
                    <button
                      style={{
                        background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                        fontSize: '14px', cursor: 'pointer', padding: '2px 4px',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms ease',
                      }}
                      onClick={() => setExpandedExpenseCat(isExpanded ? null : cat)}
                    >›</button>

                    {/* Category name */}
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>{cat}</span>

                    {/* Classification toggle */}
                    <div style={{
                      display: 'flex', borderRadius: '4px', overflow: 'hidden',
                      border: '1px solid var(--border-subtle)', fontSize: '10px',
                    }}>
                      <button
                        style={{
                          padding: '3px 8px', border: 'none', cursor: 'pointer',
                          background: cls === 'non-negotiable' ? 'var(--accent-rose)' : 'transparent',
                          color: cls === 'non-negotiable' ? '#FFF' : 'var(--text-tertiary)',
                          fontWeight: '700', fontSize: '10px',
                        }}
                        onClick={() => {
                          const updated = { ...(settings.categoryClassification || {}), [cat]: 'non-negotiable' };
                          updateCategoryClassification(updated);
                        }}
                      >Essential</button>
                      <button
                        style={{
                          padding: '3px 8px', border: 'none', cursor: 'pointer',
                          background: cls === 'flex' ? 'var(--caution-amber)' : 'transparent',
                          color: cls === 'flex' ? '#FFF' : 'var(--text-tertiary)',
                          fontWeight: '700', fontSize: '10px',
                        }}
                        onClick={() => {
                          const updated = { ...(settings.categoryClassification || {}), [cat]: 'flex' };
                          updateCategoryClassification(updated);
                        }}
                      >Flex</button>
                    </div>
                  </div>

                  {/* Expanded subcategory management */}
                  {isExpanded && (
                    <div style={{ paddingLeft: '28px', marginTop: '6px' }}>
                      {subs.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                          {subs.map((sub) => (
                            <div key={sub} style={{
                              ...s.catChip, fontSize: '11px', padding: '2px 8px',
                            }}>
                              <span>{sub}</span>
                              <button
                                style={s.catRemove}
                                onClick={() => {
                                  const updated = { ...hierarchy, [cat]: subs.filter((s) => s !== sub) };
                                  updateCategoryHierarchy(updated);
                                }}
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          style={{ ...s.addInput, height: '26px', fontSize: '11px' }}
                          value={expandedExpenseCat === cat ? newSubcategory : ''}
                          onChange={(e) => setNewSubcategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const name = newSubcategory.trim();
                              if (name && !subs.includes(name)) {
                                const updated = { ...hierarchy, [cat]: [...subs, name] };
                                updateCategoryHierarchy(updated);
                                setNewSubcategory('');
                              }
                            }
                          }}
                          placeholder="Add subcategory..."
                        />
                        <button
                          style={{ ...s.addBtn, height: '26px', fontSize: '10px', padding: '0 10px' }}
                          onClick={() => {
                            const name = newSubcategory.trim();
                            if (name && !subs.includes(name)) {
                              const updated = { ...hierarchy, [cat]: [...subs, name] };
                              updateCategoryHierarchy(updated);
                              setNewSubcategory('');
                            }
                          }}
                        >Add</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Account */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Account</div>
          <div style={s.row}>
            <div>
              <div style={s.label}>Sign out</div>
              <div style={s.sublabel}>Your data is saved and will sync when you sign back in</div>
            </div>
            <button
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
              onClick={() => { signOut(); onClose(); }}
            >
              Sign Out
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginLeft: '8px' }}>Your data is saved</span>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ ...s.section, marginBottom: 0 }}>
          <div style={{ ...s.sectionTitle, color: 'var(--critical-red)', borderBottomColor: 'var(--critical-red)' }}>
            Danger Zone
          </div>
          {!showReset ? (
            <div style={s.row}>
              <div>
                <div style={s.label}>Reset all data</div>
                <div style={s.sublabel}>Remove all transactions and restore defaults</div>
              </div>
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid var(--critical-red)',
                  color: 'var(--critical-red)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                onClick={() => setShowReset(true)}
              >
                Reset
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--critical-red)', marginBottom: '8px', fontWeight: '600' }}>
                This will permanently delete all transactions, custom categories, and reset your balance to $0.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                Type <span style={{ color: 'var(--text-primary)', fontWeight: '700', letterSpacing: '0.05em' }}>DELETE</span> to confirm
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  style={{
                    ...s.addInput,
                    borderColor: resetConfirm === 'DELETE' ? 'var(--critical-red)' : 'var(--border-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: '700',
                    fontSize: '13px',
                  }}
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && resetConfirm === 'DELETE') {
                      resetAll();
                      onClose();
                    }
                  }}
                  placeholder="Type DELETE..."
                  autoFocus
                />
                <button
                  style={{
                    height: '30px',
                    padding: '0 14px',
                    background: resetConfirm === 'DELETE' ? 'var(--critical-red)' : 'var(--bg-hover)',
                    color: resetConfirm === 'DELETE' ? '#FFFFFF' : 'var(--text-tertiary)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: resetConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                  }}
                  disabled={resetConfirm !== 'DELETE'}
                  onClick={() => {
                    if (resetConfirm === 'DELETE') {
                      resetAll();
                      onClose();
                    }
                  }}
                >
                  Confirm Reset
                </button>
                <button
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setShowReset(false); setResetConfirm(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
