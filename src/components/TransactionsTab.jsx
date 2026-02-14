import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';

const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];

const s = {
  wrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    minHeight: '500px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  columnTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  addBtn: {
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    border: 'none',
  },
  addIncome: {
    background: 'var(--income-btn-bg)',
    color: 'var(--text-primary)',
  },
  addExpense: {
    background: 'var(--expense-btn-bg)',
    color: 'var(--text-primary)',
  },
  divider: {
    borderRight: '1px solid var(--border-subtle)',
    paddingRight: '24px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  item: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, transform 150ms ease',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  itemAmount: {
    fontSize: '18px',
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginTop: '6px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  pausedBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--caution-amber)',
    background: 'rgba(255,167,38,0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  // Inline form — compact
  form: {
    background: 'var(--bg-card)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '6px',
    padding: '14px 16px',
    marginBottom: '8px',
  },
  formField: {
    marginBottom: '8px',
  },
  formLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '3px',
  },
  formInput: {
    width: '100%',
    height: '36px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '0 10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    height: '36px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '0 8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
  formSave: {
    flex: 1,
    height: '36px',
    background: 'var(--accent-orange)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  formCancel: {
    flex: 1,
    height: '36px',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-focus)',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  formDelete: {
    height: '36px',
    background: 'transparent',
    color: 'var(--critical-red)',
    border: '1px solid var(--critical-red)',
    borderRadius: '4px',
    padding: '0 12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  empty: {
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    padding: '32px 0',
    textAlign: 'center',
  },
  filterBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
  },
  filterBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: 'var(--text-tertiary)',
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  filterActive: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--accent-orange)',
  },
};

const defaultForm = {
  category: '',
  customCategory: '',
  amount: '',
  frequency: 'monthly',
  startDate: '',
  description: '',
};

const FILTERS = ['All', 'Recurring', 'One-Time'];

export default function TransactionsTab({
  transactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  scrollToType,
  onScrollHandled,
}) {
  const incomeRef = useRef(null);
  const expenseRef = useRef(null);

  useEffect(() => {
    if (!scrollToType) return;
    const ref = scrollToType === 'income' ? incomeRef : expenseRef;
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      ref.current.style.outline = '2px solid var(--accent-orange)';
      ref.current.style.outlineOffset = '4px';
      ref.current.style.borderRadius = '8px';
      setTimeout(() => {
        if (ref.current) {
          ref.current.style.outline = 'none';
        }
      }, 1500);
    }
    if (onScrollHandled) onScrollHandled();
  }, [scrollToType, onScrollHandled]);
  const getCategories = useStore((s) => s.getCategories);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const [editingId, setEditingId] = useState(null);
  const [addingType, setAddingType] = useState(null); // 'income' | 'expense' | null
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState('All');

  const [sortBy, setSortBy] = useState('date'); // 'date' | 'amount'

  const filtered = transactions.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Recurring') return t.frequency !== 'one-time';
    return t.frequency === 'one-time';
  });

  const sortFn = sortBy === 'amount'
    ? (a, b) => b.amount - a.amount
    : (a, b) => (a.startDate || '').localeCompare(b.startDate || '');

  const income = filtered.filter((t) => t.type === 'income').sort(sortFn);
  const expenses = filtered.filter((t) => t.type === 'expense').sort(sortFn);

  const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0);
  const net = incomeTotal - expenseTotal;

  const startAdd = (type) => {
    setEditingId(null);
    setAddingType(type);
    setForm({
      ...defaultForm,
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const startEdit = (txn) => {
    setAddingType(null);
    setEditingId(txn.id);
    const cats = getCategories(txn.type);
    const isCustom = !cats.includes(txn.category);
    setForm({
      category: isCustom ? '__custom__' : txn.category,
      customCategory: isCustom ? txn.category : '',
      amount: String(txn.amount),
      frequency: txn.frequency,
      startDate: txn.startDate,
      description: txn.description || '',
    });
  };

  const cancel = () => {
    setEditingId(null);
    setAddingType(null);
    setForm(defaultForm);
  };

  const handleSave = (type) => {
    const amount = parseFloat(form.amount);
    const category = form.category === '__custom__'
      ? form.customCategory.trim()
      : form.category;
    if (!category || isNaN(amount) || amount <= 0 || !form.startDate) return;

    // Add custom category to the store if it's new
    if (form.category === '__custom__' && category) {
      addCustomCategory(type, category);
    }

    if (editingId) {
      updateTransaction(editingId, {
        category,
        amount,
        frequency: form.frequency,
        startDate: form.startDate,
        description: form.description,
        endDate: form.frequency === 'one-time' ? form.startDate : null,
      });
    } else {
      addTransaction({
        type,
        category,
        amount,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.frequency === 'one-time' ? form.startDate : null,
        description: form.description,
        isActive: true,
      });
    }
    cancel();
  };

  const handleDelete = (id) => {
    deleteTransaction(id);
    cancel();
  };

  const toggleActive = (txn) => {
    updateTransaction(txn.id, { isActive: !txn.isActive });
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const renderForm = (type) => {
    const categories = getCategories(type);
    return (
      <div style={s.form} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(type); }}>
        <div style={s.formField}>
          <label style={s.formLabel}>Category</label>
          <select
            style={s.formSelect}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value, customCategory: '' })}
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__custom__">Custom...</option>
          </select>
        </div>
        {form.category === '__custom__' && (
          <div style={s.formField}>
            <label style={s.formLabel}>Custom Name</label>
            <input
              type="text"
              style={s.formInput}
              value={form.customCategory || ''}
              onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
              placeholder="Enter category name..."
              autoFocus
            />
          </div>
        )}
        <div style={s.formField}>
          <label style={s.formLabel}>Amount</label>
          <input
            type="number"
            step="0.01"
            style={s.formInput}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div style={s.formField}>
          <label style={s.formLabel}>Frequency</label>
          <select
            style={s.formSelect}
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div style={s.formField}>
          <label style={s.formLabel}>Start Date</label>
          <input
            type="date"
            style={{ ...s.formInput, cursor: 'pointer' }}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            onClick={(e) => { try { e.target.showPicker(); } catch {} }}
          />
        </div>
        <div style={s.formField}>
          <label style={s.formLabel}>Note (optional)</label>
          <input
            type="text"
            style={s.formInput}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional note..."
          />
        </div>
        <div style={s.formActions}>
          <button style={s.formSave} onClick={() => handleSave(type)}>Save</button>
          <button style={s.formCancel} onClick={cancel}>Cancel</button>
          {editingId && (
            <button style={s.formDelete} onClick={() => handleDelete(editingId)}>Delete</button>
          )}
        </div>
      </div>
    );
  };

  const renderItem = (txn) => {
    const isIncome = txn.type === 'income';
    if (editingId === txn.id) {
      return (
        <div key={txn.id}>
          {renderForm(txn.type)}
        </div>
      );
    }
    return (
      <div
        key={txn.id}
        style={{
          ...s.item,
          ...(txn.isActive ? {} : { opacity: 0.5 }),
        }}
        onClick={() => startEdit(txn)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateX(0)'; }}
      >
        <div style={s.itemRow}>
          <span style={s.itemCategory}>{txn.category}</span>
          <span style={{ ...s.itemAmount, color: isIncome ? 'var(--accent-cyan)' : 'var(--accent-rose)' }}>
            {isIncome ? '+' : '-'}${txn.amount.toLocaleString()}
          </span>
        </div>
        <div style={s.itemMeta}>
          <span>{txn.frequency.charAt(0).toUpperCase() + txn.frequency.slice(1)}</span>
          <span>&middot;</span>
          <span>{txn.startDate}</span>
          {txn.description && (
            <>
              <span>&middot;</span>
              <span>{txn.description}</span>
            </>
          )}
          {!txn.isActive && <span style={s.pausedBadge}>PAUSED</span>}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Filter toggles + Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              style={{
                ...s.filterBtn,
                ...(filter === f ? s.filterActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          <span>Sort:</span>
          {['date', 'amount'].map((opt) => (
            <button
              key={opt}
              style={{
                background: sortBy === opt ? 'var(--accent-orange)' : 'transparent',
                color: sortBy === opt ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: sortBy === opt ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onClick={() => setSortBy(opt)}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>
    <div style={{
      ...s.wrapper,
      ...(isMobile ? { gridTemplateColumns: '1fr', gap: '32px' } : {}),
    }}>
      {/* INCOME COLUMN */}
      <div ref={incomeRef} style={{ ...s.column, ...(isMobile ? {} : s.divider) }}>
        <div style={s.columnHeader}>
          <h3 style={s.columnTitle}>Income</h3>
          <button
            style={{ ...s.addBtn, ...s.addIncome }}
            onClick={() => startAdd('income')}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            + Add Income
          </button>
        </div>
        {income.length > 0 && (
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '12px', padding: '0 2px' }}>
            Total: ${incomeTotal.toLocaleString()}
          </div>
        )}
        <div style={s.list}>
          {addingType === 'income' && renderForm('income')}
          {income.length === 0 && !addingType ? (
            <div style={s.empty}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No income yet. What's coming in?</div>
              <div>Paycheck, side gig, freelance — start with the big one.</div>
            </div>
          ) : (
            income.map(renderItem)
          )}
        </div>
      </div>

      {/* EXPENSES COLUMN */}
      <div ref={expenseRef} style={s.column}>
        <div style={s.columnHeader}>
          <h3 style={s.columnTitle}>Expenses</h3>
          <button
            style={{ ...s.addBtn, ...s.addExpense }}
            onClick={() => startAdd('expense')}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            + Add Expense
          </button>
        </div>
        {expenses.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 2px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-rose)' }}>
              Total: ${expenseTotal.toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: net >= 0 ? 'var(--safe-green)' : 'var(--critical-red)' }}>
              Net: {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString()}
            </span>
          </div>
        )}
        <div style={s.list}>
          {addingType === 'expense' && renderForm('expense')}
          {expenses.length === 0 && !addingType ? (
            <div style={s.empty}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No expenses yet. Focus on the big levers.</div>
              <div>Rent, car payment, insurance — the lattes can wait.</div>
            </div>
          ) : (
            expenses.map(renderItem)
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
