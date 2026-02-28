import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import useStore from '../store/useStore';
import { getOccurrencesInRange } from '../utils/runway';

const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'custom-days'];
const FREQ_LABELS = { 'one-time': 'One-time', 'weekly': 'Weekly', 'bi-weekly': 'Bi-weekly', 'semi-monthly': '1st & 15th', 'monthly': 'Monthly', 'quarterly': 'Quarterly', 'annually': 'Annually', 'custom-days': 'Every X days' };

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
  // Modal overlay + card
  editOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: 'var(--overlay-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    background: 'var(--bg-panel)',
    border: '2px solid var(--accent-gold)',
    borderRadius: '12px',
    padding: '20px',
    width: '340px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formField: {
    marginBottom: '0',
  },
  formFieldFull: {
    marginBottom: '0',
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
    alignItems: 'center',
  },
  formSave: {
    height: '32px',
    padding: '0 20px',
    background: 'var(--accent-gold)',
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
};

const defaultForm = {
  category: '',
  customCategory: '',
  subcategory: '',
  customSubcategory: '',
  amount: '',
  frequency: 'monthly',
  startDate: '',
  endDate: '',
  description: '',
  customDayInterval: '',
};

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
      ref.current.style.outline = '2px solid var(--accent-gold)';
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
  const [addingType, setAddingType] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [mobileColumn, setMobileColumn] = useState('expenses');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [yearView, setYearView] = useState(false);

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState(''); // '' | 'recurring' | 'one-time'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');

  const hasDateFilter = filterDateStart || filterDateEnd;

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterCategory('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  // All unique categories from transactions (for category filter dropdown)
  const allCategories = useMemo(() => {
    const cats = new Set();
    for (const t of transactions) cats.add(t.category);
    return [...cats].sort();
  }, [transactions]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterType) count++;
    if (filterCategory) count++;
    if (filterDateStart) count++;
    if (filterDateEnd) count++;
    if (filterAmountMin) count++;
    if (filterAmountMax) count++;
    return count;
  }, [filterType, filterCategory, filterDateStart, filterDateEnd, filterAmountMin, filterAmountMax]);

  const { income, expenses, incomeTotal, expenseTotal } = useMemo(() => {
    // Start with all transactions — no time-range filtering by default
    let list = [...transactions];

    // Apply type filter
    if (filterType === 'recurring') {
      list = list.filter((t) => t.frequency !== 'one-time');
    } else if (filterType === 'one-time') {
      list = list.filter((t) => t.frequency === 'one-time');
    }

    // Apply category filter
    if (filterCategory) {
      list = list.filter((t) => t.category === filterCategory);
    }

    // Apply amount filter
    const minAmt = parseFloat(filterAmountMin);
    const maxAmt = parseFloat(filterAmountMax);
    if (!isNaN(minAmt)) list = list.filter((t) => t.amount >= minAmt);
    if (!isNaN(maxAmt)) list = list.filter((t) => t.amount <= maxAmt);

    // When date filter is active, hide items with no occurrences in range
    if (hasDateFilter) {
      const rangeStart = filterDateStart ? new Date(filterDateStart + 'T00:00:00') : new Date();
      const rangeEnd = filterDateEnd ? new Date(filterDateEnd + 'T23:59:59') : addDays(rangeStart, 365);
      list = list.filter((t) => {
        if (!t.isActive) return true;
        const occs = getOccurrencesInRange(t, rangeStart, rangeEnd);
        return occs.length > 0;
      });
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    const sortFn = sortBy === 'amount'
      ? (a, b) => (a.amount - b.amount) * dir
      : (a, b) => ((a.startDate || '').localeCompare(b.startDate || '')) * dir;

    const inc = list.filter((t) => t.type === 'income').sort(sortFn);
    const exp = list.filter((t) => t.type === 'expense').sort(sortFn);

    // Compute totals based on the active window: month, year, or date filter
    const now = new Date();
    let windowStart, windowEnd;
    if (hasDateFilter && filterDateStart) {
      windowStart = new Date(filterDateStart + 'T00:00:00');
      windowEnd = hasDateFilter && filterDateEnd ? new Date(filterDateEnd + 'T23:59:59') : endOfMonth(viewMonth);
    } else if (yearView) {
      windowStart = now;
      windowEnd = addDays(now, 365);
    } else {
      windowStart = startOfMonth(viewMonth);
      windowEnd = endOfMonth(viewMonth);
    }
    const sumOccurrences = (t) => {
      if (!t.isActive) return 0;
      const occs = getOccurrencesInRange(t, windowStart, windowEnd);
      return t.amount * occs.length;
    };

    return {
      income: inc,
      expenses: exp,
      incomeTotal: inc.reduce((sum, t) => sum + sumOccurrences(t), 0),
      expenseTotal: exp.reduce((sum, t) => sum + sumOccurrences(t), 0),
    };
  }, [transactions, filterType, filterCategory, filterDateStart, filterDateEnd, filterAmountMin, filterAmountMax, sortBy, sortDir, hasDateFilter, viewMonth, yearView]);

  const outlookNet = Math.round(incomeTotal - expenseTotal);
  const outlookLabel = hasDateFilter ? 'Date Range Outlook' : yearView ? '12-Month Outlook' : format(viewMonth, 'MMMM yyyy');

  const startAdd = (type) => {
    setEditingId(null);
    setAddingType(type);
    setForm({
      ...defaultForm,
      frequency: filterType === 'one-time' ? 'one-time' : 'monthly',
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
      endDate: txn.endDate || '',
      description: txn.description || '',
      customDayInterval: txn.customDayInterval ? String(txn.customDayInterval) : '',
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

    if (form.category === '__custom__' && category) {
      addCustomCategory(type, category);
    }

    const subcategory = form.subcategory === '__custom_sub__'
      ? (form.customSubcategory || '').trim() || null
      : form.subcategory || null;

    const customDayInterval = form.frequency === 'custom-days' && form.customDayInterval
      ? parseInt(form.customDayInterval, 10) : null;

    if (editingId) {
      const existing = transactions.find((t) => t.id === editingId);
      const dateChanged = existing && existing.startDate !== form.startDate;
      const freqChanged = existing && existing.frequency !== form.frequency;
      updateTransaction(editingId, {
        category,
        subcategory,
        amount,
        frequency: form.frequency,
        startDate: form.startDate,
        description: form.description,
        endDate: form.frequency === 'one-time' ? form.startDate : (form.endDate || null),
        customDayInterval,
        // Clear excludeDates when startDate or frequency changes — old exclusions
        // were tied to the old schedule and would block the new occurrences
        ...(dateChanged || freqChanged ? { excludeDates: [] } : {}),
      });
    } else {
      addTransaction({
        type,
        category,
        subcategory,
        amount,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.frequency === 'one-time' ? form.startDate : (form.endDate || null),
        description: form.description,
        isActive: true,
        customDayInterval,
      });
    }
    cancel();
  };

  const handleDelete = (id) => {
    deleteTransaction(id);
    setDeleteConfirmId(null);
    cancel();
  };

  // Change 4: Fix — exclude the correct occurrence date, not the series base date
  const handleDeleteJustOne = (txn) => {
    const existing = txn.excludeDates || [];
    let dateToExclude = txn.startDate; // fallback

    if (hasDateFilter) {
      // Find occurrences within the active date filter range
      const rangeStart = filterDateStart ? new Date(filterDateStart + 'T00:00:00') : new Date();
      const rangeEnd = filterDateEnd ? new Date(filterDateEnd + 'T23:59:59') : addDays(rangeStart, 365);
      const occs = getOccurrencesInRange(txn, rangeStart, rangeEnd);
      if (occs.length > 0) {
        dateToExclude = format(occs[0], 'yyyy-MM-dd');
      }
    } else {
      // No date filter — find the next upcoming occurrence (365-day lookahead)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureEnd = addDays(today, 365);
      const occs = getOccurrencesInRange(txn, today, futureEnd);
      if (occs.length > 0) {
        dateToExclude = format(occs[0], 'yyyy-MM-dd');
      }
    }

    updateTransaction(txn.id, { excludeDates: [...existing, dateToExclude] });
    setDeleteConfirmId(null);
    cancel();
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // "Back to top" visibility
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const renderForm = (type) => {
    const categories = getCategories(type);
    const title = editingId
      ? `Edit ${form.category || (type === 'income' ? 'Income' : 'Expense')}`
      : `Add ${type === 'income' ? 'Income' : 'Expense'}`;
    return (
      <div style={s.editOverlay} onClick={cancel}>
      <div style={s.form} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(type); }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</span>
          <button onClick={cancel} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>
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
          {form.category && (
            <div style={s.formField}>
              <label style={s.formLabel}>Subcategory</label>
              <select
                style={s.formSelect}
                value={form.subcategory || ''}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value, customSubcategory: '' })}
              >
                <option value="">None</option>
                {(hierarchy[form.category === '__custom__' ? (form.customCategory || '') : form.category] || []).map((sub) => (
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
                <option key={f} value={f}>{FREQ_LABELS[f]}</option>
              ))}
            </select>
            {form.frequency === 'custom-days' && (
              <input
                type="number"
                min="1"
                style={{ ...s.formInput, marginTop: '4px' }}
                placeholder="Every how many days?"
                value={form.customDayInterval || ''}
                onChange={(e) => setForm({ ...form, customDayInterval: e.target.value })}
              />
            )}
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
          {form.frequency !== 'one-time' && (
            <div style={s.formField}>
              <label style={s.formLabel}>End Date <span style={{ fontWeight: '400', color: 'var(--text-tertiary)', textTransform: 'none' }}>(optional)</span></label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="date"
                  style={{ ...s.formInput, cursor: 'pointer', flex: 1 }}
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  onFocus={(e) => { try { e.target.showPicker(); } catch {} }}
                />
                {form.endDate && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, endDate: '' })}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '16px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                    title="Clear end date"
                  >&times;</button>
                )}
              </div>
            </div>
          )}
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
              <div style={{ ...s.formField, display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            {editingId && (() => {
              const txn = transactions.find((t) => t.id === editingId);
              const isRecurring = txn && txn.frequency !== 'one-time';
              if (deleteConfirmId === editingId && isRecurring) {
                return (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    <button
                      style={{ ...s.formDelete, fontSize: '11px', color: 'var(--caution-amber)' }}
                      onClick={() => handleDeleteJustOne(txn)}
                    >Just This One</button>
                    <button
                      style={{ ...s.formDelete, fontSize: '11px' }}
                      onClick={() => handleDelete(editingId)}
                    >Delete All</button>
                  </div>
                );
              }
              return (
                <button
                  style={s.formDelete}
                  onClick={() => isRecurring ? setDeleteConfirmId(editingId) : handleDelete(editingId)}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >Delete</button>
              );
            })()}
          </div>
        </div>
      </div>
      </div>
    );
  };


  const renderItem = (txn) => {
    const isIncome = txn.type === 'income';
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
          {txn.frequency !== 'one-time' && txn.endDate && txn.endDate !== txn.startDate && (
            <>
              <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{format(parseISO(txn.endDate), 'MMM d, yyyy')}</span>
            </>
          )}
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

  // Filter panel JSX (shared between desktop & mobile)
  const filterPanel = filterOpen && (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
        gap: '12px',
      }}>
        {/* Type */}
        <div>
          <label style={s.formLabel}>Type</label>
          <select
            style={{ ...s.formSelect, height: '32px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All</option>
            <option value="recurring">Recurring</option>
            <option value="one-time">One Time</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label style={s.formLabel}>Category</label>
          <select
            style={{ ...s.formSelect, height: '32px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label style={s.formLabel}>Date From</label>
          <input
            type="date"
            style={{ ...s.formInput, height: '32px', cursor: 'pointer' }}
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            onClick={(e) => { try { e.target.showPicker(); } catch {} }}
          />
        </div>

        {/* Date To */}
        <div>
          <label style={s.formLabel}>Date To</label>
          <input
            type="date"
            style={{ ...s.formInput, height: '32px', cursor: 'pointer' }}
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            onClick={(e) => { try { e.target.showPicker(); } catch {} }}
          />
        </div>

        {/* Amount Min */}
        <div>
          <label style={s.formLabel}>Amount Min</label>
          <input
            type="number"
            step="0.01"
            style={{ ...s.formInput, height: '32px' }}
            value={filterAmountMin}
            onChange={(e) => setFilterAmountMin(e.target.value)}
            placeholder="$0"
          />
        </div>

        {/* Amount Max */}
        <div>
          <label style={s.formLabel}>Amount Max</label>
          <input
            type="number"
            step="0.01"
            style={{ ...s.formInput, height: '32px' }}
            value={filterAmountMax}
            onChange={(e) => setFilterAmountMax(e.target.value)}
            placeholder="No limit"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          style={{
            marginTop: '12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
          onClick={clearFilters}
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div style={{ paddingBottom: isMobile ? '80px' : 0 }}>
      {/* Desktop: Filter button + Sort controls */}
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            style={{
              background: activeFilterCount > 0 ? 'var(--accent-gold)' : 'transparent',
              color: activeFilterCount > 0 ? '#FFF' : 'var(--text-tertiary)',
              border: activeFilterCount > 0 ? 'none' : '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {filterOpen ? '▴' : '▾'}
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                background: sortBy === 'date' ? 'var(--accent-gold)' : 'transparent',
                color: sortBy === 'date' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: sortBy === 'date' ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onClick={() => toggleSort('date')}
            >
              Date {sortBy === 'date' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
            </button>
            <button
              style={{
                background: sortBy === 'amount' ? 'var(--accent-gold)' : 'transparent',
                color: sortBy === 'amount' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: sortBy === 'amount' ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onClick={() => toggleSort('amount')}
            >
              Amount {sortBy === 'amount' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
            </button>
          </div>
        </div>
      )}

      {/* Mobile controls */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            maxWidth: '280px',
            width: '100%',
          }}>
            {[
              { key: 'income', label: 'Income', count: income.length, color: 'var(--safe-green)' },
              { key: 'expenses', label: 'Expenses', count: expenses.length, color: 'var(--accent-rose)' },
            ].map((col) => (
              <button
                key={col.key}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  height: '36px',
                  border: 'none',
                  fontSize: '13px',
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
          <button
            style={{
              background: activeFilterCount > 0 ? 'var(--accent-gold)' : 'transparent',
              color: activeFilterCount > 0 ? '#FFF' : 'var(--text-tertiary)',
              border: activeFilterCount > 0 ? 'none' : '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {filterOpen ? '▴' : '▾'}
          </button>
        </div>
      )}

      {/* Collapsible filter panel */}
      {filterPanel}

      {/* Month navigation + outlook strip */}
      <div style={{
        ...s.netStrip,
        ...(isMobile
          ? { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }
          : { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!yearView && (
            <button
              onClick={() => { setYearView(false); setViewMonth((m) => subMonths(m, 1)); }}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                fontSize: '18px', cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >&#8249;</button>
          )}
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', minWidth: isMobile ? '120px' : '160px', textAlign: 'center' }}>
            {hasDateFilter ? outlookLabel : yearView ? '12-Month Outlook' : format(viewMonth, 'MMMM yyyy')}
          </span>
          {!yearView && (
            <button
              onClick={() => { setYearView(false); setViewMonth((m) => addMonths(m, 1)); }}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                fontSize: '18px', cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >&#8250;</button>
          )}
          {!yearView && !isSameMonth(viewMonth, new Date()) && !hasDateFilter && (
            <button
              onClick={() => setViewMonth(new Date())}
              style={{
                background: 'transparent', border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)', borderRadius: '4px', padding: '2px 8px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              }}
            >Today</button>
          )}
          <button
            onClick={() => setYearView((v) => !v)}
            style={{
              background: yearView ? 'var(--accent-gold)' : 'transparent',
              border: yearView ? 'none' : '1px solid var(--accent-gold)',
              color: yearView ? '#FFF' : 'var(--accent-gold)',
              borderRadius: '4px', padding: '2px 10px',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >Year</button>
        </div>
        {(incomeTotal > 0 || expenseTotal > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: isMobile ? '16px' : '14px', fontWeight: 700, color: outlookNet >= 0 ? 'var(--safe-green)' : 'var(--critical-red)' }}>
              Net {outlookNet >= 0 ? '+' : '-'}${Math.abs(outlookNet).toLocaleString()}
            </span>
            <span style={{ fontSize: isMobile ? '13px' : '12px', color: 'var(--text-tertiary)' }}>
              <span style={{ color: 'var(--safe-green)', fontWeight: 600 }}>${Math.round(incomeTotal).toLocaleString()} in</span>
              <span style={{ margin: '0 6px' }}>&middot;</span>
              <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>${Math.round(expenseTotal).toLocaleString()} out</span>
            </span>
          </div>
        )}
      </div>

    <div style={{
      ...s.wrapper,
      ...(isMobile ? { gridTemplateColumns: '1fr', gap: '16px' } : {}),
    }}>
      {/* INCOME COLUMN */}
      {showIncome && (
      <div ref={incomeRef} style={{ ...s.column, ...(isMobile ? {} : s.divider) }}>
        <div style={s.columnHeader}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h3 style={s.columnTitle}>Income</h3>
            {incomeTotal > 0 && (
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                ${Math.round(incomeTotal).toLocaleString()}
              </span>
            )}
          </div>
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
          {income.length === 0 && !addingType ? (
            <div style={s.empty}>
              {activeFilterCount === 0 ? (
                <>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No income yet. What's coming in?</div>
                  <div>Paycheck, side gig, freelance — start with the big one.</div>
                </>
              ) : (
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  No income matches your filters.
                </div>
              )}
            </div>
          ) : (
            income.map(renderItem)
          )}
          {income.length >= 3 && !addingType && (
            <button
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '4px',
                background: 'transparent',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h3 style={s.columnTitle}>Expenses</h3>
            {expenseTotal > 0 && (
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-rose)' }}>
                ${Math.round(expenseTotal).toLocaleString()}
              </span>
            )}
          </div>
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
          {expenses.length === 0 && !addingType ? (
            <div style={s.empty}>
              {activeFilterCount === 0 ? (
                <>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No expenses yet. Focus on the big levers.</div>
                  <div>Rent, car payment, insurance — the lattes can wait.</div>
                </>
              ) : (
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  No expenses match your filters.
                </div>
              )}
            </div>
          ) : (
            expenses.map(renderItem)
          )}
          {expenses.length >= 3 && !addingType && (
            <button
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '4px',
                background: 'transparent',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
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

    {/* Mobile FAB */}
    {isMobile && !addingType && !editingId && (
      <button
        onClick={() => startAdd(mobileColumn === 'income' ? 'income' : 'expense')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '20px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          background: mobileColumn === 'income' ? 'var(--accent-cyan)' : 'var(--accent-rose)',
          color: '#1A1A2E',
          fontSize: '22px',
          fontWeight: '900',
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

    {/* Desktop floating controls */}
    {!isMobile && showBackToTop && (
      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}>
        {!addingType && !editingId && (
          <button
            onClick={() => startAdd('expense')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-rose)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '4px 0',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent-rose)'; }}
          >
            + Add Expense
          </button>
        )}
        <button
          onClick={scrollToTop}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '4px 0',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          ↑ Back to Top
        </button>
      </div>
    )}

    {/* Mobile floating controls */}
    {isMobile && showBackToTop && (
      <button
        onClick={scrollToTop}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '20px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-tertiary)',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          padding: '8px 12px',
          zIndex: 1000,
        }}
      >
        ↑ Back to Top
      </button>
    )}

    {/* Modal overlay form */}
    {editingId && renderForm(transactions.find((t) => t.id === editingId)?.type || 'expense')}
    {addingType && renderForm(addingType)}
    </div>
  );
}
