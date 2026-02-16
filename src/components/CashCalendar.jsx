import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  startOfToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameDay,
  isSameMonth,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns';
import { getOccurrences, generateDailyCashFlow } from '../utils/runway';
import useStore from '../store/useStore';

const DAY_NAMES_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];

const s = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  monthTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  navBtn: {
    background: 'transparent',
    border: '2px solid var(--border-subtle)',
    color: 'var(--text-tertiary)',
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms ease',
  },
  dayNames: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    marginBottom: '6px',
  },
  dayName: {
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '8px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
  },
  cell: {
    background: 'var(--bg-card)',
    border: '2px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '8px',
    minHeight: '110px',
    cursor: 'default',
    transition: 'all 200ms ease',
    position: 'relative',
    overflow: 'hidden',
  },
  cellDate: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 4px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
    margin: '1px 0',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'grab',
    userSelect: 'none',
    background: 'transparent',
    transition: 'background 150ms ease',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  gripDots: {
    fontSize: '8px',
    letterSpacing: '-1px',
    opacity: 0,
    lineHeight: 1,
    transition: 'opacity 150ms ease',
  },
  balanceLabel: {
    position: 'absolute',
    bottom: '6px',
    right: '8px',
    fontSize: '11px',
    fontWeight: '700',
  },
  tooltip: {
    position: 'fixed',
    zIndex: 3000,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: 'var(--shadow-hover)',
    pointerEvents: 'none',
    minWidth: '160px',
    maxWidth: '260px',
  },
  tooltipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  tooltipCategory: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  tooltipAmount: {
    fontSize: '13px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  tooltipDetail: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.5',
  },
  // Inline edit popover
  editOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
  },
  editCard: {
    position: 'fixed',
    zIndex: 2001,
    background: 'var(--bg-panel)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '10px',
    padding: '18px',
    width: '300px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  editHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  editTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  editClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
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
  // Drag-drop modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-panel)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '12px',
    padding: '24px',
    minWidth: '300px',
    maxWidth: '400px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  modalSubtitle: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginBottom: '16px',
  },
  modalBtn: {
    width: '100%',
    height: '40px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    marginBottom: '8px',
    border: 'none',
  },
  modalCancel: {
    width: '100%',
    height: '36px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    border: '1px solid var(--border-subtle)',
  },
};

function getCellBorderColor(balance, threshold) {
  if (balance <= 0) return 'var(--critical-red)';
  if (balance < threshold) return 'var(--caution-amber)';
  return 'var(--border-subtle)';
}

export default function CashCalendar({
  transactions,
  timeframe,
  currentBalance,
  updateTransaction,
  deleteTransaction,
  addTransaction,
  settings = {},
}) {
  const cautionThreshold = settings.cautionThreshold || 1000;
  const weekStartsOn = settings.weekStartsOn ?? 1;
  const DAY_NAMES = weekStartsOn === 0 ? DAY_NAMES_SUN : DAY_NAMES_MON;
  const getCategories = useStore((s) => s.getCategories);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const today = startOfToday();
  const [viewDate, setViewDate] = useState(today);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [dropModal, setDropModal] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const dragDataRef = useRef(null);

  // Inline edit state
  const [editTxn, setEditTxn] = useState(null); // { txn, x, y }
  const [editForm, setEditForm] = useState({});

  // Hover tooltip state
  const [hoveredBadge, setHoveredBadge] = useState(null); // { txn, x, y }

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn });

  const prevMonth = useCallback(() => {
    setViewDate((d) => addDays(startOfMonth(d), -1));
  }, []);
  const nextMonth = useCallback(() => {
    setViewDate((d) => addDays(endOfMonth(d), 1));
  }, []);

  // ESC to close edit
  useEffect(() => {
    if (!editTxn) return;
    const handler = (e) => { if (e.key === 'Escape') setEditTxn(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [editTxn]);

  // ── Normal daily balances & per-day transactions ────────────────────
  const { dailyBalances, dailyTxns } = useMemo(() => {
    const maxDays = 365;
    const dailyFlow = generateDailyCashFlow(transactions, maxDays);

    const balances = {};
    let bal = currentBalance;
    for (let i = 0; i < maxDays; i++) {
      bal += dailyFlow[i];
      balances[format(addDays(today, i), 'yyyy-MM-dd')] = Math.round(bal);
    }

    const txns = {};
    const active = transactions.filter((t) => t.isActive);
    for (const txn of active) {
      const occs = getOccurrences(txn, maxDays);
      for (const occ of occs) {
        const key = format(occ, 'yyyy-MM-dd');
        if (!txns[key]) txns[key] = [];
        txns[key].push(txn);
      }
    }

    return { dailyBalances: balances, dailyTxns: txns };
  }, [transactions, currentBalance, today]);

  // ── LIVE DRAG PREVIEW ───────────────────────────────────────────────
  const previewBalances = useMemo(() => {
    if (!isDragging || !dragOverDate || !dragInfo) return null;

    const { txn, fromDate } = dragInfo;
    const modified = transactions.map((t) => {
      if (t.id !== txn.id) return t;
      if (txn.frequency === 'one-time') {
        return { ...t, startDate: dragOverDate, endDate: dragOverDate };
      } else {
        const delta = differenceInCalendarDays(parseISO(dragOverDate), parseISO(fromDate));
        const newStart = addDays(parseISO(t.startDate), delta);
        return { ...t, startDate: format(newStart, 'yyyy-MM-dd') };
      }
    });

    const maxDays = 365;
    const dailyFlow = generateDailyCashFlow(modified, maxDays);
    const balances = {};
    let bal = currentBalance;
    for (let i = 0; i < maxDays; i++) {
      bal += dailyFlow[i];
      balances[format(addDays(today, i), 'yyyy-MM-dd')] = Math.round(bal);
    }
    return balances;
  }, [isDragging, dragOverDate, dragInfo, transactions, currentBalance, today]);

  const activeBalances = previewBalances || dailyBalances;

  const cells = useMemo(() => {
    const result = [];
    let day = calStart;
    while (day <= calEnd) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [calStart, calEnd]);

  // ── Drag & Drop handlers ──────────────────────────────────────────
  const handleDragStart = useCallback((e, txn, dateKey) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragInfo({ txn, fromDate: dateKey });
    setEditTxn(null); // close any edit
    dragDataRef.current = { txn, fromDate: dateKey };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', txn.id);
    requestAnimationFrame(() => {
      if (e.target) e.target.style.opacity = '0.4';
    });
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
    setDragOverDate(null);
    setDragInfo(null);
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  const handleDragOver = useCallback((e, dateKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate((prev) => (prev === dateKey ? prev : dateKey));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e, toDateKey) => {
    e.preventDefault();
    setDragOverDate(null);
    setDragInfo(null);
    const data = dragDataRef.current;
    if (!data) return;
    const { txn, fromDate } = data;
    dragDataRef.current = null;
    if (fromDate === toDateKey) return;

    if (txn.frequency === 'one-time') {
      updateTransaction(txn.id, { startDate: toDateKey, endDate: toDateKey });
    } else {
      setDropModal({ txn, fromDate, toDate: toDateKey });
    }
  }, [updateTransaction]);

  // ── Inline edit handlers ──────────────────────────────────────────
  const openEdit = useCallback((e, txn) => {
    e.stopPropagation();
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Position edit card near the badge
    let x = rect.right + 8;
    let y = rect.top - 20;
    // Keep within viewport
    if (x + 270 > window.innerWidth) x = rect.left - 270;
    if (y + 300 > window.innerHeight) y = window.innerHeight - 310;
    if (y < 10) y = 10;

    const cats = getCategories(txn.type);
    const isCustom = !cats.includes(txn.category);
    setEditTxn({ txn, x, y });
    setEditForm({
      category: isCustom ? '__custom__' : txn.category,
      customCategory: isCustom ? txn.category : '',
      amount: String(txn.amount),
      frequency: txn.frequency,
      startDate: txn.startDate,
      description: txn.description || '',
    });
  }, [isDragging, getCategories]);

  const handleEditSave = useCallback(() => {
    if (!editTxn) return;
    const amount = parseFloat(editForm.amount);
    const category = editForm.category === '__custom__'
      ? editForm.customCategory.trim()
      : editForm.category;
    if (!category || isNaN(amount) || amount <= 0 || !editForm.startDate) return;

    // Add custom category to the store if it's new
    if (editForm.category === '__custom__' && category) {
      addCustomCategory(editTxn.txn.type, category);
    }

    updateTransaction(editTxn.txn.id, {
      category,
      amount,
      frequency: editForm.frequency,
      startDate: editForm.startDate,
      description: editForm.description,
      endDate: editForm.frequency === 'one-time' ? editForm.startDate : null,
    });
    setEditTxn(null);
  }, [editTxn, editForm, updateTransaction, addCustomCategory]);

  const handleEditDelete = useCallback(() => {
    if (!editTxn) return;
    deleteTransaction(editTxn.txn.id);
    setEditTxn(null);
  }, [editTxn, deleteTransaction]);

  // ── Modal actions ─────────────────────────────────────────────────
  const handleMoveAll = useCallback(() => {
    if (!dropModal) return;
    const { txn, fromDate, toDate } = dropModal;
    const delta = differenceInCalendarDays(parseISO(toDate), parseISO(fromDate));
    const newStart = addDays(parseISO(txn.startDate), delta);
    updateTransaction(txn.id, { startDate: format(newStart, 'yyyy-MM-dd') });
    setDropModal(null);
  }, [dropModal, updateTransaction]);

  const handleMoveOne = useCallback(() => {
    if (!dropModal || !addTransaction) return;
    const { txn, fromDate, toDate } = dropModal;
    const existing = txn.excludeDates || [];
    updateTransaction(txn.id, { excludeDates: [...existing, fromDate] });
    addTransaction({
      type: txn.type,
      category: txn.category,
      amount: txn.amount,
      frequency: 'one-time',
      startDate: toDate,
      endDate: toDate,
      description: txn.description || '',
      isActive: true,
    });
    setDropModal(null);
  }, [dropModal, updateTransaction, addTransaction]);

  return (
    <div>
      {/* Month header */}
      <div style={s.header}>
        <button
          style={s.navBtn}
          onClick={prevMonth}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          ‹
        </button>
        <span style={s.monthTitle}>{format(viewDate, 'MMMM yyyy')}</span>
        <button
          style={s.navBtn}
          onClick={nextMonth}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          ›
        </button>
      </div>

      {/* Day names */}
      <div style={s.dayNames}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={s.dayName}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={s.grid}>
        {cells.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, viewDate);
          const balance = activeBalances[dateKey];
          const txns = dailyTxns[dateKey] || [];
          const dayOffset = differenceInCalendarDays(day, today);
          const isFuture = dayOffset >= 0;
          const isDragOver = dragOverDate === dateKey;

          const borderColor = isToday
            ? 'var(--border-focus)'
            : isFuture && balance !== undefined
              ? getCellBorderColor(balance, cautionThreshold)
              : 'var(--border-subtle)';

          const borderWidth = isToday
            ? '3px'
            : (isFuture && balance !== undefined && balance < cautionThreshold)
              ? '3px'
              : '2px';

          return (
            <div
              key={dateKey}
              style={{
                ...s.cell,
                border: isDragOver
                  ? '3px solid var(--accent-orange)'
                  : `${borderWidth} solid ${borderColor}`,
                opacity: inMonth ? 1 : 0.35,
                background: isDragOver ? 'rgba(255,107,53,0.08)' : 'var(--bg-card)',
              }}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateKey)}
              onMouseEnter={(e) => {
                if (!isDragOver && !isDragging) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragOver && !isDragging) {
                  e.currentTarget.style.background = 'var(--bg-card)';
                }
              }}
            >
              <div style={{
                ...s.cellDate,
                color: isToday ? 'var(--text-primary)' : inMonth ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                fontWeight: isToday ? '800' : '600',
              }}>
                {format(day, 'd')}
              </div>

              {/* Transaction badges — draggable + clickable for edit */}
              {txns.slice(0, 3).map((txn, i) => {
                const isIncome = txn.type === 'income';
                const badgeColor = isIncome ? 'var(--accent-cyan)' : 'var(--accent-rose)';
                const amtStr = txn.amount >= 1000 ? `${(txn.amount / 1000).toFixed(1)}k` : txn.amount.toLocaleString();
                return (
                  <div
                    key={`${txn.id}-${i}`}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, txn, dateKey)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => openEdit(e, txn)}
                    style={s.badge}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.querySelector('[data-grip]').style.opacity = '0.5';
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredBadge({ txn, x: rect.right + 8, y: rect.top });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.querySelector('[data-grip]').style.opacity = '0';
                      setHoveredBadge(null);
                    }}
                  >
                    <span data-grip style={s.gripDots}>⠿</span>
                    <span style={{ ...s.badgeDot, background: badgeColor }} />
                    <span style={{ color: badgeColor, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {txn.category} {isIncome ? '+' : '-'}${amtStr}
                    </span>
                  </div>
                );
              })}
              {txns.length > 3 && (
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  +{txns.length - 3} more
                </div>
              )}

              {/* Projected balance — anchored bottom-right */}
              {isFuture && balance !== undefined && (
                <div style={{
                  ...s.balanceLabel,
                  color: balance <= 0 ? 'var(--critical-red)' : balance < cautionThreshold ? 'var(--caution-amber)' : 'var(--text-tertiary)',
                }}>
                  ${balance.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Hover tooltip ───────────────────────────────────────────── */}
      {hoveredBadge && !editTxn && !isDragging && (() => {
        const t = hoveredBadge.txn;
        const isInc = t.type === 'income';
        const amtColor = isInc ? 'var(--accent-cyan)' : 'var(--accent-rose)';
        // Keep tooltip in viewport
        let tx = hoveredBadge.x;
        let ty = hoveredBadge.y;
        if (tx + 260 > window.innerWidth) tx = hoveredBadge.x - 280;
        if (ty + 120 > window.innerHeight) ty = window.innerHeight - 130;
        if (ty < 10) ty = 10;
        return (
          <div style={{ ...s.tooltip, left: tx, top: ty }}>
            <div style={s.tooltipHeader}>
              <span style={s.tooltipCategory}>{t.category}</span>
              <span style={{ ...s.tooltipAmount, color: amtColor }}>
                {isInc ? '+' : '-'}${t.amount.toLocaleString()}
              </span>
            </div>
            <div style={s.tooltipDetail}>
              {t.frequency.charAt(0).toUpperCase() + t.frequency.slice(1)}
              <br />
              Starts {t.startDate}
              {t.description && (<><br />{t.description}</>)}
            </div>
          </div>
        );
      })()}

      {/* ── Inline edit popover ─────────────────────────────────────── */}
      {editTxn && (
        <>
          <div
            style={s.editOverlay}
            onClick={() => setEditTxn(null)}
          />
          <div
            style={{ ...s.editCard, left: editTxn.x, top: editTxn.y }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); }}
          >
            <div style={s.editHeader}>
              <span style={s.editTitle}>
                Edit {editTxn.txn.type === 'income' ? 'Income' : 'Expense'}
              </span>
              <button style={s.editClose} onClick={() => setEditTxn(null)}>✕</button>
            </div>
            <div style={s.editField}>
              <label style={s.editLabel}>Category</label>
              <select
                style={s.editSelect}
                value={editForm.category || ''}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value, customCategory: '' })}
              >
                <option value="">Select...</option>
                {getCategories(editTxn.txn.type).map((c) => (
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
            <div style={s.editActions}>
              <button style={s.editSave} onClick={handleEditSave}>Save</button>
              <button style={s.editCancel} onClick={() => setEditTxn(null)}>Cancel</button>
              <button style={s.editDelete} onClick={handleEditDelete}>Delete</button>
            </div>
          </div>
        </>
      )}

      {/* Recurring item drop modal */}
      {dropModal && (
        <div style={s.modalOverlay} onClick={() => setDropModal(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>Move Recurring Transaction</div>
            <div style={s.modalSubtitle}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{dropModal.txn.category}</span>
              {' '}&mdash;{' '}
              {dropModal.txn.type === 'income' ? '+' : '-'}${dropModal.txn.amount.toLocaleString()}/{dropModal.txn.frequency}
              <br />
              Moving from {format(parseISO(dropModal.fromDate), 'MMM d')} to {format(parseISO(dropModal.toDate), 'MMM d')}
            </div>
            <button
              style={{ ...s.modalBtn, background: 'var(--accent-orange)', color: '#FFFFFF' }}
              onClick={handleMoveOne}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Move Just This One
            </button>
            <button
              style={{ ...s.modalBtn, background: 'transparent', color: 'var(--text-primary)', border: '2px solid var(--border-focus)' }}
              onClick={handleMoveAll}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Move All Future Occurrences
            </button>
            <button
              style={s.modalCancel}
              onClick={() => setDropModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
