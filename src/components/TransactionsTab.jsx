import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import useStore from '../store/useStore';
import { getOccurrences } from '../utils/runway';

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
    background: 'rgba(0, 151, 167, 0.15)',
    color: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
  },
  addExpense: {
    background: 'rgba(212, 96, 90, 0.15)',
    color: 'var(--accent-rose)',
    border: '1px solid var(--accent-rose)',
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
  // Inline form — compact 2-column grid
  form: {
    background: 'var(--bg-card)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '8px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  formField: {
    marginBottom: '4px',
  },
  formFieldFull: {
    marginBottom: '4px',
    gridColumn: '1 / -1',
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
    height: '30px',
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
    height: '30px',
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
    gridColumn: '1 / -1',
    alignItems: 'center',
  },
  formSave: {
    height: '32px',
    padding: '0 20px',
    background: 'var(--accent-orange)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  formCancel: {
    height: '32px',
    padding: '0 20px',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-focus)',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  formDelete: {
    background: 'transparent',
    border: 'none',
    color: 'var(--critical-red)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    marginLeft: 'auto',
  },
  netStrip: {
    textAlign: 'center',
    padding: '12px',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid var(--border-subtle)',
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
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const filtered = transactions.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Recurring') return t.frequency !== 'one-time';
    return t.frequency === 'one-time';
  });

  const dir = sortDir === 'asc' ? 1 : -1;
  const sortFn = sortBy === 'amount'
    ? (a, b) => (a.amount - b.amount) * dir
    : (a, b) => ((a.startDate || '').localeCompare(b.startDate || '')) * dir;

  const income = filtered.filter((t) => t.type === 'income').sort(sortFn);
  const expenses = filtered.filter((t) => t.type === 'expense').sort(sortFn);

  const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0);

  // True 30-day outlook — computed from ALL active transactions regardless of filter
  const { outlook30Income, outlook30Expenses } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (!t.isActive) continue;
      const occs = getOccurrences(t, 30);
      const count = occs.filter((d) => d >= today).length;
      if (t.type === 'income') inc += t.amount * count;
      else exp += t.amount * count;
    }
    return { outlook30Income: Math.round(inc), outlook30Expenses: Math.round(exp) };
  }, [transactions]);
  const outlook30Net = outlook30Income - outlook30Expenses;

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
    const borderColor = type === 'income' ? 'var(--accent-cyan)' : 'var(--accent-rose)';
    return (
      <div style={{ ...s.form, borderLeft: `3px solid ${borderColor}` }} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(type); }}>
        <div style={s.formGrid}>
          <div style={s.formField}>
            <label style={s.formLabel}>Category</label>
            <select
              style={s.formSelect}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value, customCategory: '' })}
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
          </div>
          {form.category === '__custom__' ? (
            <div style={s.formField}>
              <label style={s.formLabel}>Custom Name</label>
              <input
                type="text"
                style={s.formInput}
                value={form.customCategory || ''}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                placeholder="Category name..."
                autoFocus
              />
            </div>
          ) : (
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
          )}
          {form.category === '__custom__' && (
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
          )}
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
              onFocus={(e) => { try { e.target.showPicker(); } catch {} }}
            />
          </div>
          <div style={s.formFieldFull}>
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
              <button
                style={s.formDelete}
                onClick={() => handleDelete(editingId)}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >Delete</button>
            )}
          </div>
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
    const accentColor = isIncome ? 'var(--accent-cyan)' : 'var(--accent-rose)';
    return (
      <div
        key={txn.id}
        style={{
          ...s.item,
          borderLeft: `3px solid ${accentColor}`,
          ...(txn.isActive ? {} : { opacity: 0.5 }),
        }}
        onClick={() => startEdit(txn)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.borderLeftColor = accentColor; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.background = 'var(--bg-hover, var(--bg-panel))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.borderLeftColor = accentColor; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
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
          <span>{txn.startDate ? format(parseISO(txn.startDate), 'MMM d, yyyy') : '—'}</span>
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
          {['date', 'amount'].map((opt) => {
            const isActive = sortBy === opt;
            const arrow = isActive ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';
            return (
              <button
                key={opt}
                style={{
                  background: isActive ? 'var(--accent-orange)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  border: isActive ? 'none' : '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => toggleSort(opt)}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}{arrow}
              </button>
            );
          })}
        </div>
      </div>
    {/* 30-Day Outlook strip */}
    {(outlook30Income > 0 || outlook30Expenses > 0) && (
      <div style={s.netStrip}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '12px' }}>
          30-Day Outlook
        </span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: outlook30Net >= 0 ? 'var(--safe-green)' : 'var(--critical-red)' }}>
          Net {outlook30Net >= 0 ? '+' : '-'}${Math.abs(outlook30Net).toLocaleString()}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '12px' }}>
          ${outlook30Income.toLocaleString()} in · ${outlook30Expenses.toLocaleString()} out
        </span>
      </div>
    )}
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
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', padding: '0 2px' }}>
            {income.length} {income.length === 1 ? 'source' : 'sources'}
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
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', padding: '0 2px' }}>
            {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
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
