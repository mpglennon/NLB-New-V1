import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format, addDays, startOfToday, startOfMonth, endOfMonth, addMonths as addMonthsFn, getDaysInMonth, differenceInCalendarDays } from 'date-fns';
import useStore from './store/useStore';
import { calculateRunway, generateDailyCashFlow, getOccurrences, getOccurrencesInRange, buildViewRange } from './utils/runway';
import Drawer from './components/Drawer';
import CheckInModal from './components/CheckInModal';
import TransactionsTab from './components/TransactionsTab';
import CashCalendar from './components/CashCalendar';
import SpendingTab from './components/SpendingTab';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import useBackButton from './hooks/useBackButton';

const TABS = ['Snapshot', 'Spending', 'Cash Calendar', 'Transactions'];

// --- Style Objects ---
const styles = {
  app: {
    backgroundColor: 'var(--bg-page)',
    color: 'var(--text-primary)',
    minHeight: '100vh',
    fontFamily: 'var(--font-family)',
  },
  headerWrapper: {
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-page)',
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    backgroundColor: 'var(--accent-orange)',
    color: 'white',
    fontSize: '26px',
    fontWeight: '800',
    padding: '6px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.04em',
  },
  checkInBtn: {
    backgroundColor: 'var(--accent-orange)',
    color: '#FFFFFF',
    height: '40px',
    padding: '0 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'filter 150ms ease',
  },
  navWrapper: {
    padding: '0 24px',
    borderBottom: '1px solid var(--border-subtle)',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  tabNav: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    background: 'transparent',
    color: 'var(--text-tertiary)',
    border: 'none',
    borderBottom: '3px solid transparent',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '-1px',
    transition: 'color 150ms ease, border-color 150ms ease',
  },
  activeTab: {
    color: 'var(--accent-orange)',
    borderBottomColor: 'var(--accent-orange)',
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  topControls: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  timeframeSelector: {
    display: 'flex',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--border-subtle)',
  },
  timeframeBtn: {
    width: '44px',
    height: '32px',
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid var(--border-subtle)',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  activeTimeframe: {
    background: 'var(--text-primary)',
    color: 'var(--bg-page)',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '20px 24px',
    cursor: 'default',
    boxShadow: 'var(--shadow-card)',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
  },
  cardLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  cardValue: {
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  cardMeta: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  chartContainer: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '24px',
    height: '350px',
    outline: 'none',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: 'var(--text-tertiary)',
    fontSize: '18px',
    fontWeight: '500',
  },
};

const FREQUENCIES = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];

// ── View Toggle (Month / Forecast) ──────────────────────────────────
function ViewToggle({ viewMonth, timeframe, setViewMonth, setTimeframe, tfLabel }) {
  const [openPanel, setOpenPanel] = useState(null); // 'month' | 'forecast' | null
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!openPanel) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenPanel(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPanel]);

  const isMonthMode = !!viewMonth;
  const forecastOptions = [
    { value: 30, label: 'Next 30 days' },
    { value: 60, label: 'Next 60 days' },
    { value: 90, label: 'Next 90 days' },
    { value: 365, label: 'Next 1 year' },
  ];
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = addMonthsFn(startOfToday(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
  });

  const toggleBtnBase = {
    height: '36px',
    padding: '0 16px',
    fontSize: '13px',
    fontWeight: '700',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    letterSpacing: '0.02em',
  };

  const activeStyle = {
    background: 'var(--accent-orange)',
    color: '#FFFFFF',
    borderColor: 'var(--accent-orange)',
  };

  const inactiveStyle = {
    background: 'var(--bg-card)',
    color: 'var(--text-tertiary)',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '42px',
    right: 0,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    zIndex: 100,
    minWidth: '180px',
    padding: '4px 0',
    maxHeight: '280px',
    overflowY: 'auto',
  };

  const optionStyle = (isActive) => ({
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: isActive ? 'var(--accent-orange-10, rgba(255,152,0,0.1))' : 'transparent',
    border: 'none',
    color: isActive ? 'var(--accent-orange)' : 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: isActive ? '700' : '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 120ms ease',
  });

  return (
    <div style={{ ...styles.topControls, position: 'relative', alignItems: 'center' }} ref={ref}>
      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginRight: 'auto' }}>{tfLabel}</span>
      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden' }}>
        <button
          style={{
            ...toggleBtnBase,
            ...(isMonthMode ? activeStyle : inactiveStyle),
            borderRadius: '8px 0 0 8px',
            borderRight: 'none',
          }}
          onClick={() => {
            if (isMonthMode) {
              setOpenPanel(openPanel === 'month' ? null : 'month');
            } else {
              const m = format(startOfToday(), 'yyyy-MM');
              setViewMonth(m);
              setOpenPanel(null);
            }
          }}
        >
          Month {isMonthMode ? '▾' : ''}
        </button>
        <button
          style={{
            ...toggleBtnBase,
            ...(!isMonthMode ? activeStyle : inactiveStyle),
            borderRadius: '0 8px 8px 0',
          }}
          onClick={() => {
            if (!isMonthMode) {
              setOpenPanel(openPanel === 'forecast' ? null : 'forecast');
            } else {
              setViewMonth(null);
              setOpenPanel(null);
            }
          }}
        >
          Forecast {!isMonthMode ? '▾' : ''}
        </button>
      </div>

      {/* Month dropdown */}
      {openPanel === 'month' && (
        <div style={dropdownStyle}>
          {monthOptions.map((opt) => (
            <button
              key={opt.value}
              style={optionStyle(viewMonth === opt.value)}
              onClick={() => { setViewMonth(opt.value); setOpenPanel(null); }}
              onMouseEnter={(e) => { if (viewMonth !== opt.value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (viewMonth !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Forecast dropdown */}
      {openPanel === 'forecast' && (
        <div style={dropdownStyle}>
          {forecastOptions.map((opt) => (
            <button
              key={opt.value}
              style={optionStyle(!viewMonth && timeframe === opt.value)}
              onClick={() => { setTimeframe(opt.value); setViewMonth(null); setOpenPanel(null); }}
              onMouseEnter={(e) => { if (viewMonth || timeframe !== opt.value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (viewMonth || timeframe !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Chart line color based on runway status
function getChartLineColor(status) {
  switch (status) {
    case 'safe': return 'var(--safe-green)';
    case 'caution': return 'var(--caution-amber)';
    case 'critical': return 'var(--critical-red)';
    default: return 'var(--safe-green)';
  }
}

// Balance card border color — uses the user's caution threshold
function getBalanceBorderColor(balance, threshold) {
  if (balance >= threshold * 2) return 'var(--safe-green)';
  if (balance >= threshold) return 'var(--caution-amber)';
  return 'var(--critical-red)';
}

// Sum all occurrences of transactions of a given type over a view range
function sumByType(transactions, type, timeframe, viewMonth) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let total = 0;
  for (const txn of transactions) {
    if (!txn.isActive || txn.type !== type) continue;
    let occs;
    if (viewMonth) {
      const range = buildViewRange(timeframe, viewMonth);
      occs = getOccurrencesInRange(txn, range.start, range.end);
    } else {
      occs = getOccurrences(txn, timeframe);
    }
    const count = occs.filter((d) => d >= (viewMonth ? buildViewRange(timeframe, viewMonth).start : today)).length;
    total += txn.amount * count;
  }
  return Math.round(total);
}

function App() {
  const {
    account, transactions, timeframe, setTimeframe, viewMonth, setViewMonth,
    settings, updateSettings,
    updateBalance, addTransaction, updateTransaction, deleteTransaction,
    getCategories, addCustomCategory,
    syncStatus, userId, loadFromSupabase,
  } = useStore();

  // ── Tab state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Snapshot');
  const [scrollToType, setScrollToType] = useState(null);

  // ── Drawer state ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('allTransactions');
  const [drawerFilterDate, setDrawerFilterDate] = useState(null);

  const openDrawer = useCallback((mode, filterDate = null) => {
    setDrawerMode(mode);
    setDrawerFilterDate(filterDate);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // ── Chart popover state ────────────────────────────────────────────
  const [pinnedDay, setPinnedDay] = useState(null); // { data, x, y }
  const [editingTxnId, setEditingTxnId] = useState(null);
  const popoverRef = useRef(null);
  const chartContainerRef = useRef(null);

  // ── Check In modal state ────────────────────────────────────────────
  const [checkInOpen, setCheckInOpen] = useState(false);

  // ── Settings modal state ──────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Onboarding ────────────────────────────────────────────────────
  const showWelcome = !settings.hasCompletedOnboarding;

  // ── Android back button integration ────────────────────────────────
  useBackButton(drawerOpen, closeDrawer);
  useBackButton(checkInOpen, useCallback(() => setCheckInOpen(false), []));
  useBackButton(settingsOpen, useCallback(() => setSettingsOpen(false), []));

  // ── Apply theme ───────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  // ── Periodic sync health check (every 60s) ─────────────────────────
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      loadFromSupabase();
    }, 60000);
    return () => clearInterval(interval);
  }, [userId, loadFromSupabase]);

  // ── Apply default view on mount ────────────────────────────────────
  const defaultViewApplied = useRef(false);
  useEffect(() => {
    if (defaultViewApplied.current) return;
    const dv = settings.defaultView || 'rolling-30';
    if (dv === 'current-month') {
      setViewMonth(format(startOfToday(), 'yyyy-MM'));
    } else {
      const days = parseInt(dv.replace('rolling-', ''), 10);
      if (days) setTimeframe(days);
    }
    defaultViewApplied.current = true;
  }, [settings.defaultView]);

  // ── Mobile detection ──────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Swipe between tabs (mobile) ──────────────────────────────────
  const touchStart = useRef(null);
  const MOBILE_TABS = ['Snapshot', 'Transactions'];

  const handleTouchStart = useCallback((e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    const idx = MOBILE_TABS.indexOf(activeTab);
    if (idx === -1) return;
    if (dx < 0 && idx < MOBILE_TABS.length - 1) setActiveTab(MOBILE_TABS[idx + 1]);
    if (dx > 0 && idx > 0) setActiveTab(MOBILE_TABS[idx - 1]);
  }, [activeTab]);

  // ── View range (rolling or month) ──────────────────────────────────
  const vr = useMemo(() => buildViewRange(timeframe, viewMonth), [timeframe, viewMonth]);

  // ── Calculations ────────────────────────────────────────────────────
  const runway = useMemo(() =>
    calculateRunway(account, transactions, timeframe),
    [account, transactions, timeframe]
  );

  const totalIncome = useMemo(() => sumByType(transactions, 'income', timeframe, viewMonth), [transactions, timeframe, viewMonth]);
  const totalExpenses = useMemo(() => sumByType(transactions, 'expense', timeframe, viewMonth), [transactions, timeframe, viewMonth]);
  const change = totalIncome - totalExpenses;
  const changePct = account.currentBalance > 0
    ? Math.round((change / account.currentBalance) * 100)
    : 0;
  const changeColor = change > 0 ? 'var(--safe-green)' : change < 0 ? 'var(--critical-red)' : 'var(--text-primary)';
  const tfLabel = vr.label;

  const chartData = useMemo(() => {
    const today = startOfToday();
    const active = transactions.filter((t) => t.isActive);

    if (vr.isMonth) {
      // Month view: project balance from today to month start, then show daily within month
      const daysToMonthStart = differenceInCalendarDays(vr.start, today);
      let startBalance = account.currentBalance;
      if (daysToMonthStart > 0) {
        const preFlow = generateDailyCashFlow(transactions, daysToMonthStart);
        for (const f of preFlow) startBalance += f;
      }

      // Build per-day maps for the month
      const dayIncome = {};
      const dayExpense = {};
      const dayTxns = {};
      for (const txn of active) {
        const occs = getOccurrencesInRange(txn, vr.start, vr.end);
        for (const occ of occs) {
          const key = format(occ, 'yyyy-MM-dd');
          if (txn.type === 'income') dayIncome[key] = (dayIncome[key] || 0) + txn.amount;
          else dayExpense[key] = (dayExpense[key] || 0) + txn.amount;
          if (!dayTxns[key]) dayTxns[key] = [];
          dayTxns[key].push(txn);
        }
      }

      let runningBalance = startBalance;
      return Array.from({ length: vr.days }, (_, i) => {
        const day = addDays(vr.start, i);
        const isoDate = format(day, 'yyyy-MM-dd');
        const inc = dayIncome[isoDate] || 0;
        const exp = dayExpense[isoDate] || 0;
        runningBalance += inc - exp;
        return {
          date: format(day, 'MMM d'),
          isoDate,
          balance: Math.round(runningBalance),
          dayIncome: Math.round(inc),
          dayExpense: Math.round(exp),
          dayTxns: dayTxns[isoDate] || [],
        };
      });
    }

    // Rolling view: existing logic
    const dailyFlow = generateDailyCashFlow(transactions, timeframe);
    let runningBalance = account.currentBalance;

    const dayIncome = {};
    const dayExpense = {};
    const dayTxns = {};
    for (const txn of active) {
      const occs = getOccurrences(txn, timeframe);
      for (const occ of occs) {
        const key = format(occ, 'yyyy-MM-dd');
        if (txn.type === 'income') dayIncome[key] = (dayIncome[key] || 0) + txn.amount;
        else dayExpense[key] = (dayExpense[key] || 0) + txn.amount;
        if (!dayTxns[key]) dayTxns[key] = [];
        dayTxns[key].push(txn);
      }
    }

    return dailyFlow.map((flow, i) => {
      runningBalance += flow;
      const isoDate = format(addDays(today, i), 'yyyy-MM-dd');
      return {
        date: format(addDays(today, i), 'MMM d'),
        isoDate,
        balance: Math.round(runningBalance),
        dayIncome: Math.round(dayIncome[isoDate] || 0),
        dayExpense: Math.round(dayExpense[isoDate] || 0),
        dayTxns: dayTxns[isoDate] || [],
      };
    });
  }, [transactions, timeframe, viewMonth, account.currentBalance, vr]);

  const yDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto'];
    const balances = chartData.map((d) => d.balance);
    const dataMin = Math.min(...balances, 0, settings.cautionThreshold > 0 ? settings.cautionThreshold : 0);
    const dataMax = Math.max(...balances, settings.cautionThreshold > 0 ? settings.cautionThreshold : 0);
    const range = Math.max(dataMax - dataMin, 1);
    const pad = range * 0.12;
    return [Math.floor(dataMin - pad), Math.ceil(dataMax + pad)];
  }, [chartData, settings.cautionThreshold]);

  const lineColor = getChartLineColor(runway.status);

  // ── Chart dot click → popover ──────────────────────────────────────
  const handleDotClick = useCallback((payload, event) => {
    if (!payload || !payload.dayTxns || payload.dayTxns.length === 0) return;
    const chartRect = chartContainerRef.current?.getBoundingClientRect();
    if (!chartRect) return;
    // Position relative to chart container
    const x = event.clientX - chartRect.left;
    const y = event.clientY - chartRect.top;
    setPinnedDay({ data: payload, x, y });
    setEditingTxnId(null);
  }, []);

  // Close popover on click outside
  useEffect(() => {
    if (!pinnedDay) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPinnedDay(null);
        setEditingTxnId(null);
      }
    };
    // Delay listener so the click that opened it doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [pinnedDay]);

  // ESC closes edit first, then popover
  useEffect(() => {
    if (!pinnedDay) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (editingTxnId) { setEditingTxnId(null); }
        else { setPinnedDay(null); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pinnedDay, editingTxnId]);

  // ── Keyboard shortcuts (C = Check In, T = Transactions drawer, 1-4 = tabs) ──
  React.useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (drawerOpen || checkInOpen || pinnedDay) return; // let component-level handlers work

      switch (e.key) {
        case 'c':
        case 'C':
          setCheckInOpen(true);
          break;
        case 't':
        case 'T':
          openDrawer('allTransactions');
          break;
        case '1':
          setActiveTab('Snapshot');
          break;
        case '2':
          setActiveTab('Spending');
          break;
        case '3':
          setActiveTab('Cash Calendar');
          break;
        case '4':
          setActiveTab('Transactions');
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen, checkInOpen, pinnedDay, openDrawer]);

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.headerWrapper}>
        <header style={styles.header} className="nlb-header-inner">
          <div
            style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
            onClick={() => setActiveTab('Snapshot')}
            role="button"
            tabIndex={0}
            aria-label="Home"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div
                style={{ ...styles.logo, cursor: 'pointer', transition: 'filter 150ms ease' }}
                onClick={(e) => { e.stopPropagation(); setCheckInOpen(true); }}
                onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                title="Quick Check In"
              >NLB</div>
              <span style={{
                fontSize: '26px',
                fontWeight: '800',
                background: 'linear-gradient(90deg, #00E5FF 0%, #FF6B8A 45%, #4CAF50 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.01em',
              }}>Cash</span>
            </div>
            <div style={{
              fontSize: '10px',
              fontStyle: 'italic',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.12em',
              marginTop: '2px',
              paddingLeft: '2px',
            }}>Never Look Back</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="nlb-header-actions">
            {/* Sync indicator */}
            {userId && (
              <div
                title={syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync error — tap to retry'}
                onClick={() => { if (syncStatus === 'error') loadFromSupabase(); }}
                style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: syncStatus === 'synced' ? 'var(--safe-green)' : syncStatus === 'syncing' ? 'var(--caution-amber)' : 'var(--critical-red)',
                  cursor: syncStatus === 'error' ? 'pointer' : 'default',
                  transition: 'background 300ms ease',
                  ...(syncStatus === 'syncing' ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
                }}
              />
            )}
            <button
              style={{
                background: 'transparent',
                border: '2px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
                padding: 0,
              }}
              onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {settings.theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              )}
            </button>
            <button
              style={{
                background: 'transparent',
                border: '2px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 200ms ease',
              }}
              onClick={() => setSettingsOpen(true)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              <span style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.03em' }}>Settings</span>
            </button>
            <button
              style={styles.checkInBtn}
              onClick={() => setCheckInOpen(true)}
            >
              Check In
            </button>
          </div>
        </header>
      </div>

      {/* TAB NAVIGATION */}
      <div style={styles.navWrapper}>
        <nav style={styles.tabNav} className="nlb-tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`nlb-tab-btn${tab === 'Cash Calendar' ? ' nlb-tab-calendar' : ''}${tab === 'Spending' ? ' nlb-tab-spending' : ''}`}
              style={{
                ...styles.tab,
                color: activeTab === tab ? 'var(--accent-orange)' : 'var(--text-tertiary)',
                borderBottomColor: activeTab === tab ? 'var(--accent-orange)' : 'transparent',
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* PERSISTENT BALANCE BAR */}
      <div className="nlb-balance-bar" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '24px',
        alignItems: 'center',
        fontSize: '14px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px', margin: '-4px -8px', transition: 'background 150ms ease' }}
          onClick={() => setCheckInOpen(true)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ color: 'var(--text-tertiary)' }}>Balance:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
            ${account.currentBalance.toLocaleString()}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {change >= 0 ? 'Surplus' : 'Deficit'}:
          </span>
          <span style={{ color: changeColor, fontWeight: '700' }}>
            {change >= 0 ? '+' : '-'}${Math.abs(change).toLocaleString()}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
            / {tfLabel}
          </span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main style={styles.mainContent} className="nlb-main-content" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* VIEW SELECTOR — Month / Forecast toggle */}
        {(activeTab === 'Snapshot' || activeTab === 'Spending') && (
          <ViewToggle
            viewMonth={viewMonth}
            timeframe={timeframe}
            setViewMonth={setViewMonth}
            setTimeframe={setTimeframe}
            tfLabel={tfLabel}
          />
        )}

        {/* ── SNAPSHOT TAB ─────────────────────────────────────── */}
        {activeTab === 'Snapshot' && (
          <>
            {/* KPI CARDS — 4 columns */}
            <div style={styles.cardGrid} className="kpi-card-grid">
              {/* INCOME */}
              <div
                style={{ ...styles.card, borderLeft: '3px solid var(--accent-cyan)', cursor: 'pointer' }}
                onClick={() => { setScrollToType('income'); setActiveTab('Transactions'); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
              >
                <div style={{ ...styles.cardLabel, color: 'var(--accent-cyan)' }}>Income</div>
                <div className="kpi-card-value" style={{ ...styles.cardValue, fontSize: '36px' }}>
                  ${totalIncome.toLocaleString()}
                </div>
              </div>

              {/* EXPENSES */}
              <div
                style={{ ...styles.card, borderLeft: '3px solid var(--accent-rose)', cursor: 'pointer' }}
                onClick={() => { setScrollToType('expense'); setActiveTab('Transactions'); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
              >
                <div style={{ ...styles.cardLabel, color: 'var(--accent-rose)' }}>Expenses</div>
                <div className="kpi-card-value" style={{ ...styles.cardValue, fontSize: '36px' }}>
                  ${totalExpenses.toLocaleString()}
                </div>
              </div>

              {/* SURPLUS / DEFICIT */}
              <div className="kpi-card-surplus" style={{ ...styles.card, borderLeft: `3px solid ${changeColor}` }}>
                <div style={{ ...styles.cardLabel, color: changeColor }}>{change >= 0 ? 'Surplus' : 'Deficit'}</div>
                <div className="kpi-card-value" style={{ ...styles.cardValue, fontSize: '36px', color: changeColor }}>
                  {change > 0 ? '\u2191' : change < 0 ? '\u2193' : '\u2192'} ${Math.abs(change).toLocaleString()}
                </div>
              </div>

              {/* BALANCE — primary KPI, tapping opens Check In */}
              <div
                className="kpi-card-balance"
                style={{ ...styles.card, borderLeft: `3px solid ${getBalanceBorderColor(account.currentBalance, settings.cautionThreshold)}`, cursor: 'pointer' }}
                onClick={() => setCheckInOpen(true)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
              >
                <div style={{ ...styles.cardLabel, color: getBalanceBorderColor(account.currentBalance, settings.cautionThreshold) }}>Balance</div>
                <div className="kpi-card-value" style={{ ...styles.cardValue, fontSize: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ${account.currentBalance.toLocaleString()}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                    <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/>
                  </svg>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Cash Available Today
                </div>
              </div>
            </div>

            {/* PROJECTION CHART */}
            <div style={{ ...styles.chartContainer, position: 'relative' }} className="nlb-chart-container" ref={chartContainerRef}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Cash Flow Projection</span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{tfLabel}</span>
              </div>
              <div style={{ height: 'calc(100% - 36px)', outline: 'none' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 56, bottom: 8, left: 8 }}
                  >
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={settings.theme === 'light' ? 'rgba(26,26,46,0.06)' : 'rgba(255,255,255,0.06)'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                      minTickGap={30}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                      tickFormatter={(val) => {
                        if (val === 0) return '';
                        const abs = Math.abs(val);
                        const prefix = val < 0 ? '-' : '';
                        return abs >= 1000 ? `${prefix}$${(abs / 1000).toFixed(0)}k` : `${prefix}$${abs.toLocaleString()}`;
                      }}
                      domain={yDomain}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (isMobile) return null;
                        if (pinnedDay) return null;
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        const txns = d.dayTxns || [];
                        return (
                          <div style={{
                            background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
                            borderRadius: '8px', padding: '12px 16px', minWidth: '200px',
                            boxShadow: 'var(--shadow-hover)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: txns.length ? '10px' : '8px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>{d.date}</span>
                              <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', marginLeft: '16px' }}>${d.balance.toLocaleString()}</span>
                            </div>
                            {txns.length > 0 && (
                              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                                {txns.map((txn, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < txns.length - 1 ? '5px' : '0', gap: '16px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{txn.category}</span>
                                    <span style={{
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: txn.type === 'income' ? 'var(--accent-cyan)' : 'var(--accent-rose)',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {txn.type === 'income' ? '+' : '-'}${txn.amount.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="var(--accent-rose)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                    />
                    {settings.cautionThreshold > 0 && (
                      <ReferenceLine
                        y={settings.cautionThreshold}
                        stroke="var(--caution-amber)"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        label={<ThresholdLabel threshold={settings.cautionThreshold} onUpdate={(v) => updateSettings({ cautionThreshold: v })} />}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke={lineColor}
                      strokeWidth={2.5}
                      fill="url(#balanceGradient)"
                      dot={false}
                      activeDot={isMobile ? { r: 4, fill: lineColor, stroke: 'var(--bg-card)', strokeWidth: 2 } : (props) => {
                        const { cx, cy, payload } = props;
                        const hasTxns = payload.dayTxns && payload.dayTxns.length > 0;
                        return (
                          <g
                            cursor={hasTxns ? 'pointer' : 'default'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDotClick(payload, e);
                            }}
                          >
                            <circle cx={cx} cy={cy} r={20} fill="transparent" />
                            <circle cx={cx} cy={cy} r={5} fill={lineColor} stroke="var(--bg-card)" strokeWidth={2} />
                          </g>
                        );
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* CHART POPOVER — desktop only */}
              {pinnedDay && !isMobile && (
                <ChartPopover
                  ref={popoverRef}
                  pinnedDay={pinnedDay}
                  containerRef={chartContainerRef}
                  editingTxnId={editingTxnId}
                  setEditingTxnId={setEditingTxnId}
                  onClose={() => { setPinnedDay(null); setEditingTxnId(null); }}
                  updateTransaction={updateTransaction}
                  addTransaction={addTransaction}
                  deleteTransaction={(id) => { deleteTransaction(id); setPinnedDay(null); setEditingTxnId(null); }}
                  getCategories={getCategories}
                  addCustomCategory={addCustomCategory}
                />
              )}
            </div>
          </>
        )}

        {/* ── SPENDING TAB ─────────────────────────────────────── */}
        {activeTab === 'Spending' && (
          <SpendingTab
            transactions={transactions}
            timeframe={timeframe}
            viewMonth={viewMonth}
            currentBalance={account.currentBalance}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            addTransaction={addTransaction}
          />
        )}

        {/* ── CASH CALENDAR TAB ──────────────────────────────────── */}
        {activeTab === 'Cash Calendar' && (
          <CashCalendar
            transactions={transactions}
            timeframe={timeframe}
            currentBalance={account.currentBalance}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            addTransaction={addTransaction}
            settings={settings}
          />
        )}

        {/* ── TRANSACTIONS TAB ─────────────────────────────────── */}
        {activeTab === 'Transactions' && (
          <TransactionsTab
            transactions={transactions}
            addTransaction={addTransaction}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            scrollToType={scrollToType}
            onScrollHandled={() => setScrollToType(null)}
          />
        )}
      </main>

      {/* TRUST SIGNAL FOOTER */}
      <footer style={{
        textAlign: 'center',
        padding: '10px 24px',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        borderTop: '1px solid var(--border-subtle)',
        letterSpacing: '0.03em',
      }}>
        Data stored locally on your device. Zero external access.
      </footer>

      {/* CINEMATIC DRAWER */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        mode={drawerMode}
        filterDate={drawerFilterDate}
        transactions={transactions}
        timeframe={timeframe}
        updateTransaction={updateTransaction}
        deleteTransaction={deleteTransaction}
      />

      {/* CHECK IN MODAL */}
      <CheckInModal
        isOpen={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        currentBalance={account.currentBalance}
        onUpdate={updateBalance}
        addTransaction={addTransaction}
        getCategories={getCategories}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* WELCOME / ONBOARDING MODAL */}
      <WelcomeModal isOpen={showWelcome} onSkip={() => {}} />
    </div>
  );
}

// ── Chart Popover ──────────────────────────────────────────────────────

const popoverStyles = {
  wrapper: {
    position: 'absolute',
    zIndex: 50,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    minWidth: '260px',
    maxWidth: '340px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px 10px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '16px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '8px 16px 14px',
  },
  txnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 120ms ease',
    marginBottom: '2px',
  },
  editForm: {
    background: 'var(--bg-card)',
    border: '2px solid var(--accent-orange)',
    borderRadius: '6px',
    padding: '12px 14px',
    marginBottom: '6px',
  },
  editField: { marginBottom: '7px' },
  editLabel: {
    fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', display: 'block', marginBottom: '3px',
  },
  editInput: {
    width: '100%', height: '32px', background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)', borderRadius: '4px',
    padding: '0 10px', color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  },
  editSelect: {
    width: '100%', height: '32px', background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)', borderRadius: '4px',
    padding: '0 8px', color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  },
  editActions: { display: 'flex', gap: '6px', marginTop: '8px' },
  editSave: {
    flex: 1, height: '32px', background: 'var(--accent-orange)', color: '#FFFFFF',
    border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
  },
  editCancel: {
    flex: 1, height: '32px', background: 'transparent', color: 'var(--text-primary)',
    border: '1px solid var(--border-focus)', borderRadius: '4px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer',
  },
  editDelete: {
    height: '32px', background: 'transparent', color: 'var(--critical-red)',
    border: '1px solid var(--critical-red)', borderRadius: '4px', padding: '0 10px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
};

const ChartPopover = React.forwardRef(function ChartPopover(
  { pinnedDay, containerRef, editingTxnId, setEditingTxnId, onClose,
    updateTransaction, deleteTransaction, addTransaction, getCategories, addCustomCategory },
  ref
) {
  const { data, x, y } = pinnedDay;
  const txns = data.dayTxns || [];

  // Smart positioning: clamp to stay inside chart container
  const containerEl = containerRef?.current;
  const cw = containerEl ? containerEl.offsetWidth : 800;
  const ch = containerEl ? containerEl.offsetHeight : 400;
  const popW = 300;
  const popH = 420;
  let left = x + 12;
  let top = y - 20;
  if (left + popW > cw) left = x - popW - 12;
  if (left < 0) left = 8;
  if (top + popH > ch) top = ch - popH - 8;
  if (top < 0) top = 8;

  return (
    <div ref={ref} style={{ ...popoverStyles.wrapper, left, top }}>
      <div style={popoverStyles.header}>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>{data.date}</span>
          <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', marginLeft: '12px' }}>
            ${data.balance.toLocaleString()}
          </span>
        </div>
        <button
          style={popoverStyles.closeBtn}
          onClick={onClose}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          ✕
        </button>
      </div>
      <div style={popoverStyles.body}>
        {txns.map((txn) =>
          editingTxnId === txn.id ? (
            <PopoverEditForm
              key={txn.id}
              txn={txn}
              occurrenceDate={data.isoDate}
              onCancel={() => setEditingTxnId(null)}
              onSave={(id, updates) => { updateTransaction(id, updates); setEditingTxnId(null); }}
              onSaveThisOne={(originalTxn, updates, date) => {
                const excludes = [...(originalTxn.excludeDates || []), date];
                updateTransaction(originalTxn.id, { excludeDates: excludes });
                addTransaction({
                  type: originalTxn.type,
                  category: updates.category || originalTxn.category,
                  amount: updates.amount || originalTxn.amount,
                  description: updates.description ?? originalTxn.description,
                  frequency: 'one-time',
                  startDate: date,
                  endDate: date,
                  isActive: true,
                });
                setEditingTxnId(null);
              }}
              onDelete={deleteTransaction}
              getCategories={getCategories}
              addCustomCategory={addCustomCategory}
            />
          ) : (
            <div
              key={txn.id}
              style={popoverStyles.txnRow}
              onClick={() => setEditingTxnId(txn.id)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                {txn.category}
              </span>
              <span style={{
                fontSize: '13px', fontWeight: '700',
                color: txn.type === 'income' ? 'var(--accent-cyan)' : 'var(--accent-rose)',
              }}>
                {txn.type === 'income' ? '+' : '-'}${txn.amount.toLocaleString()}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
});

function PopoverEditForm({ txn, occurrenceDate, onCancel, onSave, onSaveThisOne, onDelete, getCategories, addCustomCategory }) {
  const categories = getCategories(txn.type);
  const isCustom = !categories.includes(txn.category);
  const isRecurring = txn.frequency !== 'one-time';
  const [form, setForm] = useState({
    category: isCustom ? '__custom__' : txn.category,
    customCategory: isCustom ? txn.category : '',
    amount: String(txn.amount),
    frequency: txn.frequency,
    startDate: txn.startDate,
    description: txn.description || '',
  });

  const buildUpdates = () => {
    const amount = parseFloat(form.amount);
    const category = form.category === '__custom__'
      ? (form.customCategory || '').trim()
      : form.category;
    if (!category || isNaN(amount) || amount <= 0 || !form.startDate) return null;
    if (form.category === '__custom__' && category) {
      addCustomCategory(txn.type, category);
    }
    return {
      category, amount, frequency: form.frequency,
      startDate: form.startDate, description: form.description,
      endDate: form.frequency === 'one-time' ? form.startDate : null,
    };
  };

  const handleSave = () => {
    const updates = buildUpdates();
    if (updates) onSave(txn.id, updates);
  };

  const handleSaveThisOne = () => {
    const updates = buildUpdates();
    if (updates && onSaveThisOne) onSaveThisOne(txn, updates, occurrenceDate);
  };

  return (
    <div style={popoverStyles.editForm} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}>
      <div style={popoverStyles.editField}>
        <label style={popoverStyles.editLabel}>Category</label>
        <select
          style={popoverStyles.editSelect}
          value={form.category || ''}
          onChange={(e) => setForm({ ...form, category: e.target.value, customCategory: '' })}
        >
          <option value="">Select...</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">Custom...</option>
        </select>
      </div>
      {form.category === '__custom__' && (
        <div style={popoverStyles.editField}>
          <label style={popoverStyles.editLabel}>Custom Name</label>
          <input
            type="text"
            style={popoverStyles.editInput}
            value={form.customCategory || ''}
            onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
            placeholder="Enter category name..."
            autoFocus
          />
        </div>
      )}
      <div style={popoverStyles.editField}>
        <label style={popoverStyles.editLabel}>Amount</label>
        <input
          type="number"
          step="0.01"
          style={popoverStyles.editInput}
          value={form.amount || ''}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </div>
      <div style={popoverStyles.editField}>
        <label style={popoverStyles.editLabel}>Frequency</label>
        <select
          style={popoverStyles.editSelect}
          value={form.frequency || 'monthly'}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
          ))}
        </select>
      </div>
      <div style={popoverStyles.editField}>
        <label style={popoverStyles.editLabel}>Start Date</label>
        <input
          type="date"
          style={{ ...popoverStyles.editInput, cursor: 'pointer' }}
          value={form.startDate || ''}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          onClick={(e) => { try { e.target.showPicker(); } catch {} }}
        />
      </div>
      <div style={popoverStyles.editField}>
        <label style={popoverStyles.editLabel}>Note</label>
        <input
          type="text"
          style={popoverStyles.editInput}
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional..."
        />
      </div>
      <div style={popoverStyles.editActions}>
        {isRecurring ? (
          <>
            <button style={{ ...popoverStyles.editSave, fontSize: '12px' }} onClick={handleSaveThisOne}>This One</button>
            <button style={{ ...popoverStyles.editSave, fontSize: '12px', background: 'var(--accent-cyan)' }} onClick={handleSave}>All</button>
          </>
        ) : (
          <button style={popoverStyles.editSave} onClick={handleSave}>Save</button>
        )}
        <button style={popoverStyles.editCancel} onClick={onCancel}>Cancel</button>
        <button style={popoverStyles.editDelete} onClick={() => onDelete(txn.id)}>Delete</button>
      </div>
    </div>
  );
}

// ── Threshold Reference Line Label ────────────────────────────────────

function ThresholdLabel({ viewBox, threshold, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (!viewBox) return null;
  const { x, y, width } = viewBox;

  const commit = () => {
    const v = Math.round(parseFloat(draft));
    if (!isNaN(v) && v >= 0) onUpdate(v);
    setEditing(false);
  };

  const labelText = `$${threshold.toLocaleString()}`;

  // Position pill completely off the graph area, to the right
  const pillX = x + width + 8;
  const pillY = y - 14;

  return (
    <g>
      <foreignObject x={pillX} y={pillY} width="100" height="28" style={{ overflow: 'visible' }}>
        {!editing ? (
          <div
            onClick={() => { setDraft(String(threshold)); setEditing(true); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255,167,38,0.18)',
              border: '1px solid var(--caution-amber)',
              borderRadius: '14px',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--caution-amber)',
              whiteSpace: 'nowrap',
              zIndex: 10,
              position: 'relative',
            }}
          >
            {labelText}
          </div>
        ) : (
          <input
            type="number"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') setEditing(false);
            }}
            style={{
              width: '90px',
              height: '26px',
              background: 'var(--bg-panel)',
              border: '2px solid var(--caution-amber)',
              borderRadius: '14px',
              color: 'var(--caution-amber)',
              fontSize: '12px',
              fontWeight: '700',
              padding: '0 10px',
              outline: 'none',
              boxSizing: 'border-box',
              zIndex: 10,
              position: 'relative',
            }}
          />
        )}
      </foreignObject>
    </g>
  );
}

export default App;
