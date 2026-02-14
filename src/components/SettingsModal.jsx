import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { defaultIncomeCategories, defaultExpenseCategories } from '../data/demoData';

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#2A2A2A',
    border: '1px solid #333333',
    borderRadius: '12px',
    padding: '28px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
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
    color: '#FFFFFF',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#A0A0A0',
    fontSize: '20px',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '12px',
    borderBottom: '1px solid #333333',
    paddingBottom: '8px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  label: {
    fontSize: '14px',
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sublabel: {
    fontSize: '11px',
    color: '#A0A0A0',
    marginTop: '2px',
  },
  input: {
    width: '100px',
    height: '32px',
    background: '#1A1A1A',
    border: '1px solid #333333',
    borderRadius: '6px',
    padding: '0 10px',
    color: '#FFFFFF',
    fontSize: '14px',
    textAlign: 'right',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    height: '32px',
    background: '#1A1A1A',
    border: '1px solid #333333',
    borderRadius: '6px',
    padding: '0 10px',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    background: '#333333',
  },
  catRemove: {
    background: 'transparent',
    border: 'none',
    color: '#A0A0A0',
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
    color: '#A0A0A0',
    background: '#1A1A1A',
    border: '1px dashed #333333',
  },
  restoreBtn: {
    background: 'transparent',
    border: 'none',
    color: '#FF6B35',
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
    background: '#1A1A1A',
    border: '1px solid #333333',
    borderRadius: '6px',
    padding: '0 10px',
    color: '#FFFFFF',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  addBtn: {
    height: '30px',
    padding: '0 14px',
    background: '#FF6B35',
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
    resetAll,
  } = useStore();

  const [threshold, setThreshold] = useState(String(settings.cautionThreshold));
  const [newIncomeCat, setNewIncomeCat] = useState('');
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

  if (!isOpen) return null;

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
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>Settings</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Thresholds */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Thresholds</div>
          <div style={s.row}>
            <div>
              <div style={s.label}>Caution threshold</div>
              <div style={s.sublabel}>Amber warning when balance drops below this</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#A0A0A0', fontSize: '14px' }}>$</span>
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
            <div>
              <div style={s.label}>Critical threshold</div>
              <div style={s.sublabel}>Red warning when balance drops to zero</div>
            </div>
            <span style={{ color: '#A0A0A0', fontSize: '14px' }}>$0 (fixed)</span>
          </div>
        </div>

        {/* Calendar */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Calendar</div>
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

        {/* Danger Zone */}
        <div style={{ ...s.section, marginBottom: 0 }}>
          <div style={{ ...s.sectionTitle, color: '#FF5252', borderBottomColor: '#FF5252' }}>
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
                  border: '1px solid #FF5252',
                  color: '#FF5252',
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
              <div style={{ fontSize: '13px', color: '#FF5252', marginBottom: '8px', fontWeight: '600' }}>
                This will permanently delete all transactions, custom categories, and reset your balance to $0.
              </div>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '10px' }}>
                Type <span style={{ color: '#FFFFFF', fontWeight: '700', letterSpacing: '0.05em' }}>DELETE</span> to confirm
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  style={{
                    ...s.addInput,
                    borderColor: resetConfirm === 'DELETE' ? '#FF5252' : '#333333',
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
                    background: resetConfirm === 'DELETE' ? '#FF5252' : '#333333',
                    color: resetConfirm === 'DELETE' ? '#FFFFFF' : '#666666',
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
                    color: '#A0A0A0',
                    border: '1px solid #333333',
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
