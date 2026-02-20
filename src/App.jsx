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
import { format, addDays, startOfToday } from 'date-fns';
import useStore from './store/useStore';
import { calculateRunway, generateDailyCashFlow, getOccurrences } from './utils/runway';
import Drawer from './components/Drawer';
import CheckInModal from './components/CheckInModal';
import TransactionsTab from './components/TransactionsTab';
import CashCalendar from './components/CashCalendar';
import FlowTab from './components/FlowTab';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';

const TABS = ['Snapshot', 'Flow', 'Cash Calendar', 'Transactions'];

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
    borderBottom: '2px solid var(--border-subtle)',
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
    marginBottom: '-2px',
  },
  activeTab: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--text-primary)',
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

// Sum all occurrences of transactions of a given type over timeframe
function sumByType(transactions, type, timeframe) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let total = 0;
  for (const txn of transactions) {
    if (!txn.isActive || txn.type !== type) continue;
    const occs = getOccurrences(txn, timeframe);
    const count = occs.filter((d) => d >= today).length;
    total += txn.amount * count;
  }
  return Math.round(total);
}

function App() {
  const {
    account, transactions, timeframe, setTimeframe, settings, updateSettings,
    updateBalance, addTransaction, updateTransaction, deleteTransaction,
    getCategories, addCustomCategory,
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

  // ── Apply theme ───────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  // ── Calculations ────────────────────────────────────────────────────
  const runway = useMemo(() =>
    calculateRunway(account, transactions, timeframe),
    [account, transactions, timeframe]
  );

  const totalIncome = useMemo(() => sumByType(transactions, 'income', timeframe), [transactions, timeframe]);
  const totalExpenses = useMemo(() => sumByType(transactions, 'expense', timeframe), [transactions, timeframe]);
  const change = totalIncome - totalExpenses;
  const changePct = account.currentBalance > 0
    ? Math.round((change / account.currentBalance) * 100)
    : 0;
  const changeColor = change > 0 ? 'var(--safe-green)' : change < 0 ? 'var(--critical-red)' : 'var(--text-primary)';
  const dailyRate = Math.round(Math.abs(change) / timeframe);
  const changeMeta = change > 0
    ? `Saving $${dailyRate.toLocaleString()}/day`
    : change < 0
      ? `Burning $${dailyRate.toLocaleString()}/day`
      : 'Breakeven';
  const tfLabel = timeframe === 365 ? '1 year' : `${timeframe} days`;

  const chartData = useMemo(() => {
    const dailyFlow = generateDailyCashFlow(transactions, timeframe);
    const today = startOfToday();
    let runningBalance = account.currentBalance;

    // Build per-day income/expense maps
    const dayIncome = {};
    const dayExpense = {};
    const dayTxns = {};
    const active = transactions.filter((t) => t.isActive);
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
  }, [transactions, timeframe, account.currentBalance]);

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
          setActiveTab('Flow');
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
              className={`nlb-tab-btn${tab === 'Cash Calendar' ? ' nlb-tab-calendar' : ''}`}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.activeTab : {}),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Balance:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
            ${account.currentBalance.toLocaleString()}
          </span>
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
      <main style={styles.mainContent} className="nlb-main-content">
        {/* TIMEFRAME SELECTOR — hidden on Cash Calendar tab */}
        {activeTab !== 'Cash Calendar' && (
          <div style={styles.topControls}>
            <div style={styles.timeframeSelector}>
              {[30, 60, 90, 365].map((tf) => (
                <button
                  key={tf}
                  style={{
                    ...styles.timeframeBtn,
                    ...(timeframe === tf ? styles.activeTimeframe : {}),
                    ...(tf === 365 ? { borderRight: 'none' } : {}),
                  }}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf === 365 ? '1Y' : tf}
                </button>
              ))}
            </div>
          </div>
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
                <div style={styles.cardMeta}>Next {tfLabel}</div>
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
                <div style={styles.cardMeta}>Next {tfLabel}</div>
              </div>

              {/* CHANGE */}
              <div style={{ ...styles.card, borderLeft: `3px solid ${changeColor}` }}>
                <div style={{ ...styles.cardLabel, color: changeColor }}>Change</div>
                <div className="kpi-card-value" style={{ ...styles.cardValue, fontSize: '36px', color: changeColor }}>
                  {change > 0 ? '\u2191' : change < 0 ? '\u2193' : '\u2192'} ${Math.abs(change).toLocaleString()}
                </div>
                <div style={styles.cardMeta}>{changeMeta}</div>
              </div>

              {/* RUNWAY — primary KPI: time > money */}
              <div
                style={{ ...styles.card, borderLeft: `3px solid ${lineColor}`, cursor: 'pointer' }}
                onClick={() => setCheckInOpen(true)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
              >
                <div style={{ ...styles.cardLabel, color: lineColor }}>Runway</div>
                <div className="kpi-card-value" style={{ ...styles.cardValue, fontSize: '44px', color: lineColor, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  {runway.runwayDays === Infinity ? '>365' : runway.runwayDays}
                  <span style={{ fontSize: '16px', fontWeight: '600', opacity: 0.85 }}>days</span>
                </div>
                <div style={styles.cardMeta}>
                  ${account.currentBalance.toLocaleString()} balance
                </div>
              </div>
            </div>

            {/* PROJECTION CHART */}
            <div style={{ ...styles.chartContainer, position: 'relative' }} className="nlb-chart-container" ref={chartContainerRef}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Cash Flow Projection</span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{changeMeta}</span>
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
                      activeDot={(props) => {
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

              {/* CHART POPOVER */}
              {pinnedDay && (
                <ChartPopover
                  ref={popoverRef}
                  pinnedDay={pinnedDay}
                  containerRef={chartContainerRef}
                  editingTxnId={editingTxnId}
                  setEditingTxnId={setEditingTxnId}
                  onClose={() => { setPinnedDay(null); setEditingTxnId(null); }}
                  updateTransaction={updateTransaction}
                  deleteTransaction={(id) => { deleteTransaction(id); setPinnedDay(null); setEditingTxnId(null); }}
                  getCategories={getCategories}
                  addCustomCategory={addCustomCategory}
                />
              )}
            </div>
          </>
        )}

        {/* ── FLOW TAB ─────────────────────────────────────────── */}
        {activeTab === 'Flow' && (
          <FlowTab
            transactions={transactions}
            timeframe={timeframe}
            currentBalance={account.currentBalance}
            onCategoryClick={(category) => openDrawer('category', category)}
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
    updateTransaction, deleteTransaction, getCategories, addCustomCategory },
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
              onCancel={() => setEditingTxnId(null)}
              onSave={(id, updates) => { updateTransaction(id, updates); setEditingTxnId(null); }}
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

function PopoverEditForm({ txn, onCancel, onSave, onDelete, getCategories, addCustomCategory }) {
  const categories = getCategories(txn.type);
  const isCustom = !categories.includes(txn.category);
  const [form, setForm] = useState({
    category: isCustom ? '__custom__' : txn.category,
    customCategory: isCustom ? txn.category : '',
    amount: String(txn.amount),
    frequency: txn.frequency,
    startDate: txn.startDate,
    description: txn.description || '',
  });

  const handleSave = () => {
    const amount = parseFloat(form.amount);
    const category = form.category === '__custom__'
      ? (form.customCategory || '').trim()
      : form.category;
    if (!category || isNaN(amount) || amount <= 0 || !form.startDate) return;
    if (form.category === '__custom__' && category) {
      addCustomCategory(txn.type, category);
    }
    onSave(txn.id, {
      category, amount, frequency: form.frequency,
      startDate: form.startDate, description: form.description,
      endDate: form.frequency === 'one-time' ? form.startDate : null,
    });
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
        <button style={popoverStyles.editSave} onClick={handleSave}>Save</button>
        <button style={popoverStyles.editCancel} onClick={onCancel}>Cancel</button>
        <button style={popoverStyles.editDelete} onClick={() => onDelete(txn.id)}>Delete</button>
      </div>
    </div>
  );
}

// ── Threshold Reference Line Label ────────────────────────────────────

function ThresholdLabel({ viewBox, threshold, onUpdate }) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (!viewBox) return null;
  const { x, y, width } = viewBox;

  const commit = () => {
    const v = Math.round(parseFloat(draft));
    if (!isNaN(v) && v >= 0) onUpdate(v);
    setEditing(false);
    setHovered(false);
  };

  const labelText = `$${threshold.toLocaleString()}`;

  // Outside the plot area — sits in the right margin, aligned with $0
  const labelX = x + width + 6;
  const labelY = y - 3;

  // Edit box: right-aligned inside the chart
  const editW = 120;
  const editX = x + width - editW;

  // Tooltip: right-aligned inside the chart, appears on hover of the outside label
  const tooltipW = 176;
  const tooltipX = x + width - tooltipW;

  return (
    <g>
      {/* Label sits outside the plot area in the right margin */}
      {!editing && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="start"
          dominantBaseline="auto"
          fill="var(--caution-amber)"
          fontSize={11}
          fontWeight={700}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { if (!editing) setHovered(false); }}
          onClick={() => { setDraft(String(threshold)); setEditing(true); setHovered(false); }}
        >
          {labelText}
        </text>
      )}

      {/* Hover tooltip — right-aligned, above the line */}
      {hovered && !editing && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tooltipX}
            y={y - 60}
            width={tooltipW}
            height={40}
            rx={5}
            fill="var(--bg-panel)"
            stroke="var(--caution-amber)"
            strokeWidth={1}
          />
          <text x={tooltipX + 8} y={y - 45} textAnchor="start" fill="var(--caution-amber)" fontSize={11} fontWeight={700}>
            Caution threshold: {labelText}
          </text>
          <text x={tooltipX + 8} y={y - 30} textAnchor="start" fill="var(--text-tertiary)" fontSize={10}>
            Click to edit
          </text>
        </g>
      )}

      {/* Inline edit — narrow box, right-aligned, clears the chart */}
      {editing && (
        <foreignObject x={editX} y={y - 46} width={editW} height={32}>
          <input
            type="number"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') { setEditing(false); setHovered(false); }
            }}
            style={{
              width: '100%',
              height: '32px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--caution-amber)',
              borderRadius: '4px',
              color: 'var(--caution-amber)',
              fontSize: '13px',
              fontWeight: '700',
              padding: '0 10px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </foreignObject>
      )}
    </g>
  );
}

export default App;
