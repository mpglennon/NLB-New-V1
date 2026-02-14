import React, { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

const TABS = ['Snapshot', 'Flow', 'Cash Calendar', 'Transactions'];

// --- Style Objects ---
const styles = {
  app: {
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-primary)',
    minHeight: '100vh',
    fontFamily: 'var(--font-family)',
  },
  headerWrapper: {
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-dark)',
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px 120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    backgroundColor: 'var(--brand-orange)',
    color: 'white',
    fontSize: '26px',
    fontWeight: '800',
    padding: '6px 16px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.04em',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  checkInBtn: {
    backgroundColor: 'var(--brand-orange)',
    color: '#FFFFFF',
    height: '48px',
    padding: '0 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
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
    borderBottomColor: 'var(--brand-orange)',
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  topControls: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '24px',
  },
  timeframeSelector: {
    display: 'flex',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid var(--text-tertiary)',
  },
  timeframeBtn: {
    width: '60px',
    height: '44px',
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid var(--text-tertiary)',
    color: 'var(--text-tertiary)',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  activeTimeframe: {
    background: 'var(--text-primary)',
    color: 'var(--bg-dark)',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
    marginBottom: '24px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'default',
  },
  cardLabel: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
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

// Chart line color based on runway status
function getChartLineColor(status) {
  switch (status) {
    case 'safe': return '#4CAF50';
    case 'caution': return '#FFA726';
    case 'critical': return '#FFFFFF';
    default: return '#4CAF50';
  }
}

// Balance card border color
function getBalanceBorderColor(balance) {
  if (balance >= 2000) return '#4CAF50';
  if (balance >= 1000) return '#FFA726';
  return '#FFFFFF';
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
    account, transactions, timeframe, setTimeframe, settings,
    updateBalance, addTransaction, updateTransaction, deleteTransaction,
  } = useStore();

  // ── Tab state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Snapshot');

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

  // ── Check In modal state ────────────────────────────────────────────
  const [checkInOpen, setCheckInOpen] = useState(false);

  // ── Settings modal state ──────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const changeColor = change > 0 ? '#4CAF50' : change < 0 ? '#F44336' : '#FFFFFF';
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

  const lineColor = getChartLineColor(runway.status);

  // ── Chart dot click handler ────────────────────────────────────────
  const handleDotClick = useCallback((payload) => {
    if (payload && payload.isoDate) {
      openDrawer('date', payload.isoDate);
    }
  }, [openDrawer]);

  // ── Keyboard shortcuts (C = Check In, T = Transactions drawer, 1-4 = tabs) ──
  React.useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (drawerOpen || checkInOpen) return; // let component-level handlers work

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
  }, [drawerOpen, checkInOpen, openDrawer]);

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.headerWrapper}>
        <header style={styles.header}>
          <div
            style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
            onClick={() => setActiveTab('Snapshot')}
            role="button"
            tabIndex={0}
            aria-label="Home"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={styles.logo}>NLB</div>
              <span style={{
                fontSize: '26px',
                fontWeight: '800',
                background: 'linear-gradient(90deg, #00BCD4 0%, #E57373 45%, #4CAF50 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.01em',
              }}>Cash</span>
            </div>
            <div style={{
              fontSize: '10px',
              fontStyle: 'italic',
              color: '#A0A0A0',
              letterSpacing: '0.12em',
              marginTop: '2px',
              paddingLeft: '2px',
            }}>Never Look Back</div>
          </div>
          <h1 style={styles.headerTitle}>
            {activeTab === 'Snapshot' ? 'CASH SNAPSHOT' : activeTab.toUpperCase()}
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              style={{
                background: 'transparent',
                border: '2px solid #444444',
                color: '#A0A0A0',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 200ms ease',
              }}
              onClick={() => setSettingsOpen(true)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF6B35'; e.currentTarget.style.color = '#FF6B35'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#444444'; e.currentTarget.style.color = '#A0A0A0'; }}
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
        <nav style={styles.tabNav}>
          {TABS.map((tab) => (
            <button
              key={tab}
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

      {/* MAIN CONTENT */}
      <main style={styles.mainContent}>
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
            <div style={styles.cardGrid}>
              {/* INCOME */}
              <div style={{ ...styles.card, border: '3px solid #00BCD4' }}>
                <div style={styles.cardLabel}>INCOME</div>
                <div style={{ ...styles.cardValue, fontSize: '40px' }}>
                  ${totalIncome.toLocaleString()}
                </div>
                <div style={styles.cardMeta}>Next {tfLabel}</div>
              </div>

              {/* EXPENSES */}
              <div style={{ ...styles.card, border: '3px solid #E57373' }}>
                <div style={styles.cardLabel}>EXPENSES</div>
                <div style={{ ...styles.cardValue, fontSize: '40px' }}>
                  ${totalExpenses.toLocaleString()}
                </div>
                <div style={styles.cardMeta}>Next {tfLabel}</div>
              </div>

              {/* CHANGE */}
              <div style={{ ...styles.card, border: `3px solid ${changeColor}` }}>
                <div style={styles.cardLabel}>CHANGE</div>
                <div style={{ ...styles.cardValue, fontSize: '40px', color: changeColor }}>
                  {change > 0 ? '\u2191' : change < 0 ? '\u2193' : '\u2192'} ${Math.abs(change).toLocaleString()}
                </div>
                <div style={styles.cardMeta}>{changeMeta}</div>
              </div>

              {/* BALANCE */}
              <div style={{ ...styles.card, border: `3px solid ${getBalanceBorderColor(account.currentBalance)}` }}>
                <div style={styles.cardLabel}>BALANCE</div>
                <div style={{ ...styles.cardValue, fontSize: '40px' }}>
                  ${account.currentBalance.toLocaleString()}
                </div>
                <div style={styles.cardMeta}>
                  Last updated {account.lastUpdated ? format(new Date(account.lastUpdated), 'h:mm a') : 'Never'}
                </div>
              </div>
            </div>

            {/* PROJECTION CHART */}
            <div style={styles.chartContainer}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>Cash Flow Projection</span>
                <span style={{ fontSize: '14px', color: '#A0A0A0' }}>{changeMeta}</span>
              </div>
              <div style={{ height: 'calc(100% - 36px)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#FFFFFF', fontSize: 12 }}
                      minTickGap={30}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#FFFFFF', fontSize: 12 }}
                      tickFormatter={(val) => val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toLocaleString()}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{
                            background: '#1A1A1A', border: '1px solid #333333',
                            borderRadius: '8px', padding: '10px 14px', minWidth: '160px',
                          }}>
                            <div style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
                              {d.date}
                            </div>
                            {d.dayIncome > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: '#A0A0A0', fontSize: '12px' }}>Income</span>
                                <span style={{ color: '#00BCD4', fontSize: '12px', fontWeight: '600' }}>+${d.dayIncome.toLocaleString()}</span>
                              </div>
                            )}
                            {d.dayExpense > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: '#A0A0A0', fontSize: '12px' }}>Expenses</span>
                                <span style={{ color: '#E57373', fontSize: '12px', fontWeight: '600' }}>-${d.dayExpense.toLocaleString()}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333333', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ color: '#A0A0A0', fontSize: '12px' }}>Balance</span>
                              <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '700' }}>${d.balance.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke={lineColor}
                      strokeWidth={3}
                      dot={false}
                      activeDot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <g
                            cursor="pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDotClick(payload);
                            }}
                          >
                            {/* Invisible larger hit area */}
                            <circle cx={cx} cy={cy} r={20} fill="transparent" />
                            {/* Visible dot */}
                            <circle cx={cx} cy={cy} r={6} fill="#FF6B35" stroke="#FF6B35" strokeWidth={2} />
                          </g>
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
          />
        )}
      </main>

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
    </div>
  );
}

export default App;
