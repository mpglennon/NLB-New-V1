import React, { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import useStore from '../store/useStore';
import { getOccurrences, getOccurrencesInRange, buildViewRange } from '../utils/runway';
import { defaultCategoryClassification } from '../data/demoData';

// ── Helpers ─────────────────────────────────────────────────────────

function sumOverTimeframe(txn, timeframe, viewMonth) {
  if (!txn.isActive) return 0;
  let occurrences;
  if (viewMonth) {
    const range = buildViewRange(timeframe, viewMonth);
    occurrences = getOccurrencesInRange(txn, range.start, range.end);
  } else {
    occurrences = getOccurrences(txn, timeframe);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filterStart = viewMonth ? buildViewRange(timeframe, viewMonth).start : today;
  const count = occurrences.filter((d) => d >= filterStart).length;
  return txn.amount * count;
}

function groupByCategory(transactions, timeframe, viewMonth) {
  const map = {};
  for (const txn of transactions) {
    const total = sumOverTimeframe(txn, timeframe, viewMonth);
    if (total <= 0) continue;
    if (!map[txn.category]) {
      map[txn.category] = { total: 0, subs: {} };
    }
    map[txn.category].total += total;
    if (txn.subcategory) {
      if (!map[txn.category].subs[txn.subcategory]) map[txn.category].subs[txn.subcategory] = 0;
      map[txn.category].subs[txn.subcategory] += total;
    }
  }
  return Object.entries(map)
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.total),
      subcategories: Object.entries(data.subs)
        .map(([name, amt]) => ({ name, amount: Math.round(amt) }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString();
}

const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];

// ── Component ───────────────────────────────────────────────────────

export default function SpendingTab({
  transactions,
  timeframe,
  viewMonth,
  currentBalance,
  updateTransaction,
  deleteTransaction,
  addTransaction,
}) {
  const settings = useStore((s) => s.settings);
  const getCategories = useStore((s) => s.getCategories);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const updateCategoryClassification = useStore((s) => s.updateCategoryClassification);
  const classification = settings.categoryClassification || defaultCategoryClassification;
  const hierarchy = settings.categoryHierarchy || {};

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingTxn, setEditingTxn] = useState(null);
  const [editForm, setEditForm] = useState({});

  const vr = buildViewRange(timeframe, viewMonth);
  const tfLabel = vr.label;

  // ── Compute grouped data ──────────────────────────────────────────
  const { nonNegotiable, flexSpending, totalNonNeg, totalFlex } = useMemo(() => {
    const expenses = transactions.filter((t) => t.isActive && t.type === 'expense');
    const groups = groupByCategory(expenses, timeframe, viewMonth);

    const nonNeg = [];
    const flex = [];

    for (const g of groups) {
      const cls = classification[g.category];
      if (cls === 'non-negotiable') {
        nonNeg.push(g);
      } else {
        flex.push(g);
      }
    }

    return {
      nonNegotiable: nonNeg,
      flexSpending: flex,
      totalNonNeg: nonNeg.reduce((s, g) => s + g.amount, 0),
      totalFlex: flex.reduce((s, g) => s + g.amount, 0),
    };
  }, [transactions, timeframe, viewMonth, classification]);

  const totalExpenses = totalNonNeg + totalFlex;

  // ── Click handlers ──────────────────────────────────────────────
  const handleBarClick = useCallback((category) => {
    setEditingTxn(null);
    setExpandedCategory((prev) => (prev === category ? null : category));
  }, []);

  const handleSubClick = useCallback((category, subName) => {
    // Find matching transaction(s) for this subcategory
    const match = transactions.find(
      (t) => t.isActive && t.type === 'expense' && t.category === category && t.subcategory === subName
    );
    if (match) {
      const cats = getCategories('expense');
      const isCustom = !cats.includes(match.category);
      setEditingTxn(match);
      setEditForm({
        category: isCustom ? '__custom__' : match.category,
        customCategory: isCustom ? match.category : '',
        subcategory: match.subcategory || '',
        amount: String(match.amount),
        frequency: match.frequency,
        startDate: match.startDate,
        description: match.description || '',
      });
    }
  }, [transactions, getCategories]);

  const handleLeafClick = useCallback((category) => {
    // Find first matching transaction for direct edit
    const match = transactions.find(
      (t) => t.isActive && t.type === 'expense' && t.category === category
    );
    if (match) {
      const cats = getCategories('expense');
      const isCustom = !cats.includes(match.category);
      setEditingTxn(match);
      setEditForm({
        category: isCustom ? '__custom__' : match.category,
        customCategory: isCustom ? match.category : '',
        subcategory: match.subcategory || '',
        amount: String(match.amount),
        frequency: match.frequency,
        startDate: match.startDate,
        description: match.description || '',
      });
    }
  }, [transactions, getCategories]);

  const handleEditSave = useCallback(() => {
    if (!editingTxn) return;
    const amount = parseFloat(editForm.amount);
    const category = editForm.category === '__custom__'
      ? (editForm.customCategory || '').trim()
      : editForm.category;
    if (!category || isNaN(amount) || amount <= 0 || !editForm.startDate) return;
    if (editForm.category === '__custom__' && category) {
      addCustomCategory('expense', category);
    }
    updateTransaction(editingTxn.id, {
      category,
      subcategory: editForm.subcategory || null,
      amount,
      frequency: editForm.frequency,
      startDate: editForm.startDate,
      description: editForm.description,
      endDate: editForm.frequency === 'one-time' ? editForm.startDate : null,
    });
    setEditingTxn(null);
  }, [editingTxn, editForm, updateTransaction, addCustomCategory]);

  const handleEditDelete = useCallback(() => {
    if (!editingTxn) return;
    deleteTransaction(editingTxn.id);
    setEditingTxn(null);
  }, [editingTxn, deleteTransaction]);

  // ── Empty state ──────────────────────────────────────────────────
  if (nonNegotiable.length === 0 && flexSpending.length === 0) {
    return (
      <div style={s.emptyState}>
        <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Your spending breakdown starts here.
        </p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '15px' }}>
          Add expenses to see how your money divides between essentials and discretionary spending.
        </p>
      </div>
    );
  }

  // ── Render a column ──────────────────────────────────────────────
  const renderColumn = (title, subtitle, groups, columnTotal, barColor) => (
    <div style={s.column}>
      <div style={s.columnHeader}>
        <h3 style={s.columnTitle}>{title}</h3>
        <div style={s.columnSubtitle}>{subtitle}</div>
        <div style={s.columnTotal}>{fmt(columnTotal)}</div>
      </div>

      {groups.map((g) => {
        const hasSubs = g.subcategories.length > 0 || (hierarchy[g.category] && hierarchy[g.category].length > 0);
        const isExpanded = expandedCategory === g.category;
        const pct = columnTotal > 0 ? Math.round((g.amount / columnTotal) * 100) : 0;

        return (
          <div key={g.category} style={s.categoryBlock}>
            {/* Category bar */}
            <div
              style={s.barRow}
              onClick={() => hasSubs ? handleBarClick(g.category) : handleLeafClick(g.category)}
            >
              <div style={s.barLabel}>
                <span style={s.barCategory}>{g.category}</span>
                {hasSubs && (
                  <span style={{ ...s.chevron, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                )}
              </div>
              <div style={s.barTrack}>
                <div
                  style={{
                    ...s.barFill,
                    width: `${pct}%`,
                    background: barColor,
                  }}
                />
              </div>
              <div style={s.barAmount}>
                <span style={{ fontWeight: '700' }}>{fmt(g.amount)}</span>
                <span style={s.barPct}>{pct}%</span>
              </div>
            </div>

            {/* Expanded subcategories */}
            {isExpanded && (
              <div style={s.subList}>
                {g.subcategories.map((sub) => {
                  const subPct = g.amount > 0 ? Math.round((sub.amount / g.amount) * 100) : 0;
                  return (
                    <div
                      key={sub.name}
                      style={s.subRow}
                      onClick={() => handleSubClick(g.category, sub.name)}
                    >
                      <span style={s.subName}>{sub.name}</span>
                      <div style={{ ...s.barTrack, flex: 1, margin: '0 8px' }}>
                        <div style={{ ...s.barFill, width: `${subPct}%`, background: barColor, opacity: 0.6 }} />
                      </div>
                      <span style={s.subAmount}>{fmt(sub.amount)}</span>
                    </div>
                  );
                })}
                {g.subcategories.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px 0 4px 16px', fontStyle: 'italic' }}>
                    No subcategories yet — manage them in Settings → Expense Categories
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <h3 style={s.title}>Spending</h3>
        <span style={s.subtitle}>Next {tfLabel}</span>
        <span style={s.totalLabel}>Total: {fmt(totalExpenses)}</span>
      </div>

      {/* Two-column layout */}
      <div style={s.columns}>
        {renderColumn(
          'Fixed',
          'The non-negotiables — bills that keep the lights on',
          nonNegotiable,
          totalNonNeg,
          'var(--accent-rose)',
        )}
        {renderColumn(
          'Flex',
          'Where you have wiggle room',
          flexSpending,
          totalFlex,
          'var(--caution-amber)',
        )}
      </div>

      {/* Inline edit card */}
      {editingTxn && (
        <div style={s.editOverlay} onClick={() => setEditingTxn(null)}>
          <div style={s.editCard} onClick={(e) => e.stopPropagation()}>
            <div style={s.editHeader}>
              <span style={s.editTitle}>
                Edit {editingTxn.category}
              </span>
              <button style={s.editClose} onClick={() => setEditingTxn(null)}>✕</button>
            </div>
            <div style={s.editField}>
              <label style={s.editLabel}>Category</label>
              <select
                style={s.editSelect}
                value={editForm.category || ''}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value, customCategory: '', subcategory: '' })}
              >
                <option value="">Select...</option>
                {getCategories('expense').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
            </div>
            {editForm.category === '__custom__' && (
              <div style={s.editField}>
                <label style={s.editLabel}>Custom Name</label>
                <input
                  type="text"
                  style={s.editInput}
                  value={editForm.customCategory || ''}
                  onChange={(e) => setEditForm({ ...editForm, customCategory: e.target.value })}
                  placeholder="Enter category name..."
                  autoFocus
                />
              </div>
            )}
            {editForm.category && editForm.category !== '__custom__' && (hierarchy[editForm.category] || []).length > 0 && (
              <div style={s.editField}>
                <label style={s.editLabel}>Subcategory</label>
                <select
                  style={s.editSelect}
                  value={editForm.subcategory || ''}
                  onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                >
                  <option value="">None</option>
                  {(hierarchy[editForm.category] || []).map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={s.editField}>
              <label style={s.editLabel}>Amount</label>
              <input
                type="number"
                step="0.01"
                style={s.editInput}
                value={editForm.amount || ''}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div style={s.editField}>
              <label style={s.editLabel}>Frequency</label>
              <select
                style={s.editSelect}
                value={editForm.frequency || 'monthly'}
                onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
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
                value={editForm.startDate || ''}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                onClick={(e) => { try { e.target.showPicker(); } catch {} }}
              />
            </div>
            <div style={s.editField}>
              <label style={s.editLabel}>Note</label>
              <input
                type="text"
                style={s.editInput}
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Optional..."
              />
            </div>
            {editForm.category && editForm.category !== '__custom__' && (() => {
              const catName = editForm.category;
              const cls = classification[catName] || 'flex';
              return (
                <div style={{ ...s.editField, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ ...s.editLabel, marginBottom: 0 }}>Type</label>
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
            <div style={s.editActions}>
              <button style={s.editSave} onClick={handleEditSave}>Save</button>
              <button style={s.editCancel} onClick={() => setEditingTxn(null)}>Cancel</button>
              <button style={s.editDelete} onClick={handleEditDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const s = {
  wrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '24px',
    minHeight: '460px',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  totalLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--accent-rose)',
    marginLeft: 'auto',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  },
  column: {
    minWidth: 0,
  },
  columnHeader: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  columnTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  columnSubtitle: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  columnTotal: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginTop: '8px',
  },
  categoryBlock: {
    marginBottom: '4px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 4px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  barLabel: {
    minWidth: '110px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  barCategory: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    transition: 'transform 150ms ease',
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: '12px',
    background: 'var(--bg-input)',
    borderRadius: '6px',
    overflow: 'hidden',
    minWidth: '40px',
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 300ms ease',
    minWidth: '2px',
  },
  barAmount: {
    minWidth: '80px',
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  barPct: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  subList: {
    paddingLeft: '16px',
    borderLeft: '2px solid var(--border-subtle)',
    marginLeft: '8px',
    marginBottom: '8px',
  },
  subRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 4px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background 120ms ease',
  },
  subName: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    minWidth: '90px',
  },
  subAmount: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    minWidth: '60px',
    textAlign: 'right',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '24px',
  },
  // Inline edit overlay
  editOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: 'var(--overlay-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCard: {
    background: 'var(--bg-panel)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '12px',
    padding: '20px',
    width: '340px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  editHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  editTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  editClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
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
    marginTop: '10px',
  },
  editSave: {
    flex: 1,
    height: '34px',
    background: 'var(--accent-orange)',
    color: '#FFFFFF',
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
