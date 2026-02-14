import React, { useState } from 'react';
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
    color: '#FFFFFF',
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
    background: '#00BCD4',
    color: '#FFFFFF',
  },
  addExpense: {
    background: '#E57373',
    color: '#FFFFFF',
  },
  divider: {
    borderRight: '1px solid #333333',
    paddingRight: '24px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  item: {
    background: 'var(--bg-card)',
    border: '1px solid #333333',
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
    color: '#FFFFFF',
  },
  itemAmount: {
    fontSize: '18px',
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: '13px',
    color: '#A0A0A0',
    marginTop: '6px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  pausedBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#FFA726',
    background: 'rgba(255,167,38,0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  // Inline form — compact
  form: {
    background: 'var(--bg-card)',
    border: '2px solid #FF6B35',
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '8px',
  },
  formField: {
    marginBottom: '6px',
  },
  formLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '2px',
  },
  formInput: {
    width: '100%',
    height: '30px',
    background: '#1A1A1A',
    border: '1px solid #333333',
    borderRadius: '4px',
    padding: '0 8px',
    color: '#FFFFFF',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    height: '30px',
    background: '#1A1A1A',
    border: '1px solid #333333',
    borderRadius: '4px',
    padding: '0 6px',
    color: '#FFFFFF',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
  },
  formSave: {
    flex: 1,
    height: '30px',
    background: '#FF6B35',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  formCancel: {
    flex: 1,
    height: '30px',
    background: 'transparent',
    color: '#FFFFFF',
    border: '1px solid #FFFFFF',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  formDelete: {
    height: '30px',
    background: 'transparent',
    color: '#FF5252',
    border: '1px solid #FF5252',
    borderRadius: '4px',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  empty: {
    color: '#A0A0A0',
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
    color: '#A0A0A0',
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  filterActive: {
    color: '#FFFFFF',
    borderBottomColor: '#FF6B35',
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
}) {
  const getCategories = useStore((s) => s.getCategories);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const [editingId, setEditingId] = useState(null);
  const [addingType, setAddingType] = useState(null); // 'income' | 'expense' | null
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState('All');

  const filtered = transactions.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Recurring') return t.frequency !== 'one-time';
    return t.frequency === 'one-time';
  });

  const income = filtered.filter((t) => t.type === 'income');
  const expenses = filtered.filter((t) => t.type === 'expense');

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
            style={s.formInput}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
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
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FFFFFF'; e.currentTarget.style.transform = 'translateX(4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.transform = 'translateX(0)'; }}
      >
        <div style={s.itemRow}>
          <span style={s.itemCategory}>{txn.category}</span>
          <span style={{ ...s.itemAmount, color: isIncome ? '#00BCD4' : '#E57373' }}>
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
      {/* Filter toggles */}
      <div style={s.filterBar}>
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
    <div style={{
      ...s.wrapper,
      ...(isMobile ? { gridTemplateColumns: '1fr', gap: '32px' } : {}),
    }}>
      {/* INCOME COLUMN */}
      <div style={{ ...s.column, ...(isMobile ? {} : s.divider) }}>
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
        <div style={s.list}>
          {addingType === 'income' && renderForm('income')}
          {income.length === 0 && !addingType ? (
            <div style={s.empty}>No income entries yet</div>
          ) : (
            income.map(renderItem)
          )}
        </div>
      </div>

      {/* EXPENSES COLUMN */}
      <div style={s.column}>
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
        <div style={s.list}>
          {addingType === 'expense' && renderForm('expense')}
          {expenses.length === 0 && !addingType ? (
            <div style={s.empty}>No expense entries yet</div>
          ) : (
            expenses.map(renderItem)
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
