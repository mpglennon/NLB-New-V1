import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  subcategory: '',
  customSubcategory: '',
  amount: '',
  frequency: 'monthly',
  startDate: '',
  description: '',
};

const FILTERS = ['All', 'Recurring', 'One Time'];

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
  const updateCategoryClassification = useStore((s) => s.updateCategoryClassification);
  const settings = useStore((s) => s.settings);
  const hierarchy = settings.categoryHierarchy || {};
  const classification = settings.categoryClassification || {};
  const [editingId, setEditingId] = useState(null);
  const [addingType, setAddingType] = useState(null); // 'income' | 'expense' | null
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState('All');
  const [mobileColumn, setMobileColumn] = useState('expenses'); // 'income' | 'expenses'

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

  const { income, expenses, incomeTotal, expenseTotal } = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (filter === 'All') return true;
      if (filter === 'Recurring') return t.frequency !== 'one-time';
      return t.frequency === 'one-time';
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const sortFn = sortBy === 'amount'
      ? (a, b) => (a.amount - b.amount) * dir
      : (a, b) => ((a.startDate || '').localeCompare(b.startDate || '')) * dir;

    const inc = filtered.filter((t) => t.type === 'income').sort(sortFn);
    const exp = filtered.filter((t) => t.type === 'expense').sort(sortFn);

    return {
      income: inc,
      expenses: exp,
      incomeTotal: inc.reduce((sum, t) => sum + t.amount, 0),
      expenseTotal: exp.reduce((sum, t) => sum + t.amount, 0),
    };
  }, [transactions, filter, sortBy, sortDir]);

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
      frequency: filter === 'One Time' ? 'one-time' : 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const startEdit = (txn) => {
    setAddingType(null);
    setEditingId(txn.id);
    const cats = getCategories(txn.type);
    const isCustom = !cats.includes(txn.category);
    const subs = hierarchy[txn.category] || [];
    const isCustomSub = txn.subcategory && !subs.includes(txn.subcategory);
    setForm({
      category: isCustom ? '__custom__' : txn.category,
      customCategory: isCustom ? txn.category : '',
      subcategory: isCustomSub ? '__custom_sub__' : (txn.subcategory || ''),
      customSubcategory: isCustomSub ? txn.subcategory : '',
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

    const subcategory = form.subcategory === '__custom_sub__'
      ? (form.customSubcategory || '').trim() || null
      : form.subcategory || null;

    if (editingId) {
      updateTransaction(editingId, {
        category,
        subcategory,
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
        subcategory,
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

  // "Back to top" visibility — show after scrolling down
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const threshold = isMobile ? 400 : 600;
    const onScroll = () => setShowBackToTop(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
              onChange={(e) => setForm({ ...form, category: e.target.value, customCategory: '', subcategory: '' })}
            >
              <option value="">Select...</option>
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
                placeholder="Category name..."
                autoFocus
              />
            </div>
          )}
          {form.category && form.category !== '__custom__' && (
            <div style={s.formField}>
              <label style={s.formLabel}>Subcategory</label>
              <select
                style={s.formSelect}
                value={form.subcategory || ''}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value, customSubcategory: '' })}
              >
                <option value="">None</option>
                {(hierarchy[form.category] || []).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
                <option value="__custom_sub__">Custom...</option>
              </select>
              {form.subcategory === '__custom_sub__' && (
                <input
                  type="text"
                  style={{ ...s.formInput, marginTop: '6px' }}
                  placeholder="Enter subcategory name"
                  value={form.customSubcategory || ''}
                  onChange={(e) => setForm({ ...form, customSubcategory: e.target.value })}
                  autoFocus
                />
              )}
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
          {type === 'expense' && form.category && form.category !== '__custom__' && (() => {
            const catName = form.category;
            const cls = classification[catName] || 'flex';
            return (
              <div style={{ ...s.formFieldFull, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ ...s.formLabel, marginBottom: 0 }}>Type</label>
                <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <button type="button" style={{
                    padding: '3px 10px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                    background: cls === 'non-negotiable' ? 'var(--accent-rose)' : 'transparent',
                    color: cls === 'non-negotiable' ? '#FFF' : 'var(--text-tertiary)',
                  }} onClick={() => {
                    updateCategoryClassification({ ...classification, [catName]: 'non-negotiable' });
                  }}>Fixed</button>
                  <button type="button" style={{
                    padding: '3px 10px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                    background: cls === 'flex' ? 'var(--caution-amber)' : 'transparent',
                    color: cls === 'flex' ? '#FFF' : 'var(--text-tertiary)',
                  }} onClick={() => {
                    updateCategoryClassification({ ...classification, [catName]: 'flex' });
                  }}>Flex</button>
                </div>
              </div>
            );
          })()}
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

  // Scroll edit form into view when it appears
  const editFormRef = useRef(null);
  useEffect(() => {
    if ((editingId || addingType) && editFormRef.current) {
      // Small delay to let the DOM render the form
      requestAnimationFrame(() => {
        if (editFormRef.current) {
          editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }, [editingId, addingType]);

  const renderItem = (txn) => {
    const isIncome = txn.type === 'income';
    if (editingId === txn.id) {
      return (
        <div key={txn.id} ref={editFormRef}>
          {renderForm(txn.type)}
        </div>
      );
    }
    const accentColor = isIncome ? 'var(--accent-cyan)' : 'var(--accent-rose)';
    return (
      <div
        key={txn.id}
        className="nlb-txn-item"
        style={{
          ...s.item,
          borderLeft: `3px solid ${accentColor}`,
          ...(txn.isActive ? {} : { opacity: 0.5 }),
        }}
        onClick={() => startEdit(txn)}
      >
        <div style={s.itemRow}>
          <span style={s.itemCategory}>{txn.category}{txn.subcategory ? ` · ${txn.subcategory}` : ''}</span>
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

  const showIncome = !isMobile || mobileColumn === 'income';
  const showExpenses = !isMobile || mobileColumn === 'expenses';

  return (
    <div style={{ paddingBottom: isMobile ? '80px' : 0 }}>
      {/* Filter toggles + Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '12px' : '24px', gap: '0' }}>
        <div style={{ display: 'flex', flex: 1, gap: '0' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              style={{
                ...s.filterBtn,
                ...(filter === f ? s.filterActive : {}),
                padding: isMobile ? '8px 0' : '10px 20px',
                fontSize: isMobile ? '13px' : '15px',
                flex: isMobile ? 1 : undefined,
                textAlign: 'center',
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          style={{
            background: 'var(--accent-orange)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '4px',
            padding: isMobile ? '6px 10px' : '4px 12px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={() => toggleSort('date')}
        >
          Date {sortDir === 'asc' ? '\u2191' : '\u2193'}
        </button>
      </div>

    {/* Mobile Income | Expenses toggle */}
    {isMobile && (
      <div style={{
        display: 'flex',
        marginBottom: '16px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
      }}>
        {[
          { key: 'expenses', label: 'Expenses', count: expenses.length, color: 'var(--accent-rose)' },
          { key: 'income', label: 'Income', count: income.length, color: 'var(--accent-cyan)' },
        ].map((col) => (
          <button
            key={col.key}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              background: mobileColumn === col.key ? col.color : 'transparent',
              color: mobileColumn === col.key ? '#FFF' : 'var(--text-tertiary)',
            }}
            onClick={() => { setMobileColumn(col.key); cancel(); }}
          >
            {col.label} ({col.count})
          </button>
        ))}
      </div>
    )}

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
      ...(isMobile ? { gridTemplateColumns: '1fr', gap: '16px' } : {}),
    }}>
      {/* INCOME COLUMN */}
      {showIncome && (
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
          {addingType === 'income' && <div ref={editFormRef}>{renderForm('income')}</div>}
          {income.length === 0 && !addingType ? (
            <div style={s.empty}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No income yet. What's coming in?</div>
              <div>Paycheck, side gig, freelance — start with the big one.</div>
            </div>
          ) : (
            income.map(renderItem)
          )}
          {/* Persistent add button at bottom of list */}
          {income.length >= 3 && !addingType && (
            <button
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '4px',
                background: 'transparent',
                border: '1px dashed var(--accent-cyan)',
                borderRadius: '6px',
                color: 'var(--accent-cyan)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 200ms ease',
              }}
              onClick={() => startAdd('income')}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              + Add Income
            </button>
          )}
        </div>
      </div>
      )}

      {/* EXPENSES COLUMN */}
      {showExpenses && (
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
          {addingType === 'expense' && <div ref={editFormRef}>{renderForm('expense')}</div>}
          {expenses.length === 0 && !addingType ? (
            <div style={s.empty}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No expenses yet. Focus on the big levers.</div>
              <div>Rent, car payment, insurance — the lattes can wait.</div>
            </div>
          ) : (
            expenses.map(renderItem)
          )}
          {/* Persistent add button at bottom of list */}
          {expenses.length >= 3 && !addingType && (
            <button
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '4px',
                background: 'transparent',
                border: '1px dashed var(--accent-rose)',
                borderRadius: '6px',
                color: 'var(--accent-rose)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 200ms ease',
              }}
              onClick={() => startAdd('expense')}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              + Add Expense
            </button>
          )}
        </div>
      </div>
      )}
    </div>

    {/* Mobile FAB — floating add button */}
    {isMobile && !addingType && !editingId && (
      <button
        onClick={() => startAdd(mobileColumn === 'income' ? 'income' : 'expense')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '20px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          background: mobileColumn === 'income' ? 'var(--accent-cyan)' : 'var(--accent-rose)',
          color: '#FFF',
          fontSize: '22px',
          fontWeight: '300',
          lineHeight: '1',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 200ms ease, transform 150ms ease',
        }}
        onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        +
      </button>
    )}

    {/* "Back to top" button */}
    {showBackToTop && (
      <button
        onClick={scrollToTop}
        style={{
          position: 'fixed',
          bottom: isMobile ? '24px' : '32px',
          left: isMobile ? '20px' : '32px',
          height: isMobile ? '44px' : '36px',
          borderRadius: isMobile ? '50%' : '18px',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          color: 'var(--text-tertiary)',
          fontSize: isMobile ? '18px' : '13px',
          fontWeight: '600',
          lineHeight: '1',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: isMobile ? '0' : '0 14px',
          width: isMobile ? '44px' : 'auto',
          transition: 'opacity 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
      >
        ↑{!isMobile && ' Top'}
      </button>
    )}
    </div>
  );
}
