import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { format, addDays, startOfToday, parseISO, differenceInCalendarDays } from 'date-fns';
import { getOccurrences } from '../utils/runway';
import useStore from '../store/useStore';

const BACKDROP_MS = 200;
const SLIDE_MS = 300;
const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];

// ── Styles ──────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
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
    transition: `opacity ${BACKDROP_MS}ms ease`,
  },
  backdropOpen: {
    opacity: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '380px',
    maxWidth: '90vw',
    height: '100%',
    background: 'var(--bg-panel)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
    transform: 'translateX(100%)',
    transition: `transform ${SLIDE_MS}ms ease-out`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelOpen: {
    transform: 'translateX(0)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  title: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
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
  columns: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 24px',
  },
  column: {
    marginBottom: '8px',
  },
  columnHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '12px 0 8px',
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: '8px',
  },
  columnScroll: {},
  divider: {},
  txnItem: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '8px 12px',
    marginBottom: '6px',
    transition: 'border-color 150ms ease',
    cursor: 'pointer',
  },
  txnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnCategory: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  txnAmount: {
    fontSize: '14px',
    fontWeight: '700',
  },
  txnMeta: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  empty: {
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    padding: '24px 0',
    textAlign: 'center',
  },
  // Inline edit form
  editForm: {
    background: 'var(--bg-card)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '6px',
    padding: '14px 16px',
    marginBottom: '6px',
  },
  editField: {
    marginBottom: '8px',
  },
  editLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '3px',
  },
  editInput: {
    width: '100%',
    height: '34px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '0 10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  editSelect: {
    width: '100%',
    height: '34px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '0 8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  editActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
  editSave: {
    flex: 1,
    height: '34px',
    background: 'var(--accent-orange)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  editCancel: {
    flex: 1,
    height: '34px',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-focus)',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editDelete: {
    height: '34px',
    background: 'transparent',
    color: 'var(--critical-red)',
    border: '1px solid var(--critical-red)',
    borderRadius: '4px',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────

function buildTitle(mode, filterDate) {
  switch (mode) {
    case 'next7days':
      return 'Next 7 Days';
    case 'allTransactions':
      return 'All Transactions';
    case 'expensesOnly':
      return 'All Expenses';
    case 'date':
      return filterDate
        ? `Transactions for ${format(parseISO(filterDate), 'MMM d, yyyy')}`
        : 'Transactions';
    case 'category':
      return filterDate ? `${filterDate}` : 'Category';
    default:
      return 'Transactions';
  }
}

function filterTransactions(transactions, mode, filterDate, timeframe) {
  const today = startOfToday();
  const active = transactions.filter((t) => t.isActive);
  const items = [];

  for (const txn of active) {
    if (mode === 'expensesOnly' && txn.type === 'income') continue;
    const occurrences = getOccurrences(txn, timeframe);

    for (const date of occurrences) {
      const dayIndex = differenceInCalendarDays(date, today);
      let include = false;

      switch (mode) {
        case 'next7days':
          include = dayIndex >= 0 && dayIndex < 7;
          break;
        case 'allTransactions':
          include = dayIndex >= 0 && dayIndex < timeframe;
          break;
        case 'expensesOnly':
          include = dayIndex >= 0 && dayIndex < timeframe;
          break;
        case 'date':
          if (filterDate) include = format(date, 'yyyy-MM-dd') === filterDate;
          break;
        case 'category':
          include =
            dayIndex >= 0 &&
            dayIndex < timeframe &&
            filterDate &&
            txn.category === filterDate;
          break;
        default:
          include = dayIndex >= 0 && dayIndex < timeframe;
      }

      if (include) {
        items.push({ ...txn, occurrenceDate: date, _sortKey: date.getTime() });
      }
    }
  }

  items.sort((a, b) => a._sortKey - b._sortKey);
  return items;
}

// ── Component ───────────────────────────────────────────────────────────

export default function Drawer({
  isOpen,
  onClose,
  mode,
  filterDate,
  transactions,
  timeframe,
  updateTransaction,
  deleteTransaction,
}) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [editingId, setEditingId] = useState(null);

  // Reset editing when drawer closes
  useEffect(() => {
    if (!isOpen) setEditingId(null);
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (editingId) { setEditingId(null); return; }
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, editingId]);

  // Focus close button on open
  useEffect(() => {
    if (isOpen && closeBtnRef.current) closeBtnRef.current.focus();
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const items = useMemo(
    () => filterTransactions(transactions || [], mode, filterDate, timeframe),
    [transactions, mode, filterDate, timeframe]
  );

  const incomeItems = items.filter((t) => t.type === 'income');
  const expenseItems = items.filter((t) => t.type === 'expense');
  const title = buildTitle(mode, filterDate);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const mobilePanel = isMobile
    ? {
        top: 'auto', bottom: 0, right: 0, width: '100%', maxWidth: '100%',
        height: '80%', borderRadius: '16px 16px 0 0',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
      }
    : {};
  return (
    <div style={{ ...s.overlay, ...(isOpen ? s.overlayOpen : {}) }} aria-hidden={!isOpen}>
      <div
        style={{ ...s.backdrop, ...(isOpen ? s.backdropOpen : {}) }}
        onClick={onClose}
        aria-label="Close drawer"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ ...s.panel, ...(isOpen ? s.panelOpen : {}), ...mobilePanel }}
      >
        {isMobile && (
          <div style={{ width: '40px', height: '4px', background: '#A0A0A0', borderRadius: '2px', margin: '12px auto 0' }} />
        )}

        <div style={s.header}>
          <h2 style={s.title}>{title}</h2>
          <button
            ref={closeBtnRef}
            style={s.closeBtn}
            onClick={onClose}
            aria-label="Close drawer"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            ✕
          </button>
        </div>

        <div style={s.columns}>
          {mode !== 'expensesOnly' && (
            <div style={s.column}>
              <div style={{ ...s.columnHeader, color: 'var(--accent-cyan)', borderBottomColor: 'var(--accent-cyan)' }}>
                Income
                {incomeItems.length > 0 && (
                  <span style={{ float: 'right', fontWeight: '600', letterSpacing: 0 }}>{incomeItems.length}</span>
                )}
              </div>
              <div style={s.columnScroll}>
                {incomeItems.length === 0 ? (
                  <div style={s.empty}>No income in this period</div>
                ) : (
                  incomeItems.map((item, i) => (
                    <TransactionItem
                      key={`${item.id}-${i}`}
                      item={item}
                      isEditing={editingId === item.id}
                      onStartEdit={() => setEditingId(item.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSave={updateTransaction}
                      onDelete={deleteTransaction}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          <div style={s.column}>
            <div style={{ ...s.columnHeader, color: 'var(--accent-rose)', borderBottomColor: 'var(--accent-rose)' }}>
              Expenses
              {expenseItems.length > 0 && (
                <span style={{ float: 'right', fontWeight: '600', letterSpacing: 0 }}>{expenseItems.length}</span>
              )}
            </div>
            <div style={s.columnScroll}>
              {expenseItems.length === 0 ? (
                <div style={s.empty}>No expenses in this period</div>
              ) : (
                expenseItems.map((item, i) => (
                  <TransactionItem
                    key={`${item.id}-${i}`}
                    item={item}
                    isEditing={editingId === item.id}
                    onStartEdit={() => setEditingId(item.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={updateTransaction}
                    onDelete={deleteTransaction}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Transaction Item with inline editing ────────────────────────────────

function TransactionItem({ item, isEditing, onStartEdit, onCancelEdit, onSave, onDelete }) {
  const isIncome = item.type === 'income';
  const dateStr = format(item.occurrenceDate, 'MMM d');
  const freqLabel =
    item.frequency === 'one-time'
      ? 'One-time'
      : item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1);

  const getCategories = useStore((s) => s.getCategories);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const [form, setForm] = useState({});

  // Initialize form when editing starts
  useEffect(() => {
    if (isEditing) {
      const cats = getCategories(item.type);
      const isCustom = !cats.includes(item.category);
      setForm({
        category: isCustom ? '__custom__' : item.category,
        customCategory: isCustom ? item.category : '',
        amount: String(item.amount),
        frequency: item.frequency,
        startDate: item.startDate,
        description: item.description || '',
      });
    }
  }, [isEditing, item, getCategories]);

  const handleSave = useCallback(() => {
    const amount = parseFloat(form.amount);
    const category = form.category === '__custom__'
      ? (form.customCategory || '').trim()
      : form.category;
    if (!category || isNaN(amount) || amount <= 0 || !form.startDate) return;

    // Add custom category to the store if it's new
    if (form.category === '__custom__' && category) {
      addCustomCategory(item.type, category);
    }

    onSave(item.id, {
      category,
      amount,
      frequency: form.frequency,
      startDate: form.startDate,
      description: form.description,
      endDate: form.frequency === 'one-time' ? form.startDate : null,
    });
    onCancelEdit();
  }, [form, item.id, item.type, onSave, onCancelEdit, addCustomCategory]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
    onCancelEdit();
  }, [item.id, onDelete, onCancelEdit]);

  if (isEditing) {
    const categories = getCategories(item.type);
    return (
      <div style={s.editForm} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}>
        <div style={s.editField}>
          <label style={s.editLabel}>Category</label>
          <select
            style={s.editSelect}
            value={form.category || ''}
            onChange={(e) => setForm({ ...form, category: e.target.value, customCategory: '' })}
          >
            <option value="">Select...</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom__">Custom...</option>
          </select>
        </div>
        {form.category === '__custom__' && (
          <div style={s.editField}>
            <label style={s.editLabel}>Custom Name</label>
            <input
              type="text"
              style={s.editInput}
              value={form.customCategory || ''}
              onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
              placeholder="Enter category name..."
              autoFocus
            />
          </div>
        )}
        <div style={s.editField}>
          <label style={s.editLabel}>Amount</label>
          <input
            type="number"
            step="0.01"
            style={s.editInput}
            value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div style={s.editField}>
          <label style={s.editLabel}>Frequency</label>
          <select
            style={s.editSelect}
            value={form.frequency || 'monthly'}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>
        <div style={s.editField}>
          <label style={s.editLabel}>Start Date</label>
          <input
            type="date"
            style={{ ...s.editInput, cursor: 'pointer' }}
            value={form.startDate || ''}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            onClick={(e) => { try { e.target.showPicker(); } catch {} }}
          />
        </div>
        <div style={s.editField}>
          <label style={s.editLabel}>Note</label>
          <input
            type="text"
            style={s.editInput}
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional..."
          />
        </div>
        <div style={s.editActions}>
          <button style={s.editSave} onClick={handleSave}>Save</button>
          <button style={s.editCancel} onClick={onCancelEdit}>Cancel</button>
          <button style={s.editDelete} onClick={handleDelete}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={s.txnItem}
      onClick={onStartEdit}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
    >
      <div style={s.txnRow}>
        <span style={s.txnCategory}>{item.category}</span>
        <span style={{ ...s.txnAmount, color: isIncome ? 'var(--accent-cyan)' : 'var(--accent-rose)' }}>
          {isIncome ? '+' : '-'}${item.amount.toLocaleString()}
        </span>
      </div>
      <div style={s.txnMeta}>
        {dateStr} &middot; {freqLabel}
        {item.description ? ` \u00b7 ${item.description}` : ''}
      </div>
    </div>
  );
}
