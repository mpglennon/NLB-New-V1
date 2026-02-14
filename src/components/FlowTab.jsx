import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { getOccurrences } from '../utils/runway';

// ── Colors ──────────────────────────────────────────────────────────
const CYAN = '#00BCD4';
const AMBER = '#FFA726';
const ROSE = '#E57373';
const GREEN = '#4CAF50';
const RED = '#F44336';
const WHITE = '#FFFFFF';
const CARD_BG = '#242424';
const BORDER = '#333333';
const TEXT_DIM = '#A0A0A0';

// ── Helpers ─────────────────────────────────────────────────────────

function sumOverTimeframe(txn, timeframe) {
  if (!txn.isActive) return 0;
  const occurrences = getOccurrences(txn, timeframe);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = occurrences.filter((d) => d >= today).length;
  return txn.amount * count;
}

function groupByCategory(transactions, timeframe) {
  const map = {};
  for (const txn of transactions) {
    const total = sumOverTimeframe(txn, timeframe);
    if (total <= 0) continue;
    if (!map[txn.category]) map[txn.category] = 0;
    map[txn.category] += total;
  }
  return Object.entries(map)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString();
}

// Build a filled ribbon path between two vertical segments
function ribbon(x1, y1Top, y1Bot, x2, y2Top, y2Bot) {
  const mx = (x1 + x2) / 2;
  return [
    `M ${x1},${y1Top}`,
    `C ${mx},${y1Top} ${mx},${y2Top} ${x2},${y2Top}`,
    `L ${x2},${y2Bot}`,
    `C ${mx},${y2Bot} ${mx},${y1Bot} ${x1},${y1Bot}`,
    'Z',
  ].join(' ');
}

// ── Component ───────────────────────────────────────────────────────

export default function FlowTab({
  transactions,
  timeframe,
  currentBalance,
  onCategoryClick,
}) {
  const [tooltip, setTooltip] = useState(null);
  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 340 });
  const containerRef = useRef(null);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width - 48, 400),
          height: 340,
        });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────
  const { incomeGroups, expenseGroups, totalIncome, totalExpenses } = useMemo(() => {
    const active = transactions.filter((t) => t.isActive);
    const income = active.filter((t) => t.type === 'income');
    const expenses = active.filter((t) => t.type === 'expense');

    const incomeGroups = groupByCategory(income, timeframe);
    const allExpenses = groupByCategory(expenses, timeframe);

    const bigFive = allExpenses.slice(0, 5);
    const otherAmount = allExpenses.slice(5).reduce((sum, e) => sum + e.amount, 0);
    const expenseGroups =
      otherAmount > 0
        ? [...bigFive, { category: 'Other', amount: Math.round(otherAmount) }]
        : bigFive;

    return {
      incomeGroups,
      expenseGroups,
      totalIncome: incomeGroups.reduce((s, g) => s + g.amount, 0),
      totalExpenses: expenseGroups.reduce((s, g) => s + g.amount, 0),
    };
  }, [transactions, timeframe]);

  const surplus = totalIncome - totalExpenses;
  const isSurplus = surplus > 0;
  const surplusColor = surplus > 0 ? GREEN : surplus < 0 ? RED : WHITE;
  const tfLabel = timeframe === 365 ? '1 year' : `${timeframe} days`;

  // ── Empty state ───────────────────────────────────────────────────
  if (incomeGroups.length === 0 && expenseGroups.length === 0) {
    return (
      <div style={s.emptyState}>
        <p style={s.emptyText}>Add transactions to see your cash flow</p>
        <button
          style={s.emptyBtn}
          onClick={() => onCategoryClick && onCategoryClick('allTransactions')}
        >
          Add Your First Transaction
        </button>
      </div>
    );
  }

  // ── Layout constants ──────────────────────────────────────────────
  const W = dimensions.width;
  const H = dimensions.height;
  const barW = 24;
  const centerW = 30;
  const topPad = 24;
  const bottomPad = 20;
  const usableH = H - topPad - bottomPad;
  const barGap = 6;

  // X positions: [labels] [bars] --- flows --- [center] --- flows --- [bars] [labels]
  const leftBarX = 130;
  const centerX = W / 2 - centerW / 2;
  const rightBarX = W - 130 - barW;

  // ── Stack bars proportionally ─────────────────────────────────────
  function stackBars(groups, totalRef) {
    if (groups.length === 0) return [];
    const totalGaps = barGap * (groups.length - 1);
    const availH = usableH - totalGaps;
    let yOff = topPad;

    return groups.map((g) => {
      const h = Math.max(18, (g.amount / totalRef) * availH);
      const bar = { ...g, y: yOff, h };
      yOff += h + barGap;
      return bar;
    });
  }

  // Right side: expenses + surplus all proportional to totalIncome
  const rightGroups = isSurplus
    ? [...expenseGroups, { category: 'Savings', amount: surplus }]
    : expenseGroups;

  const incomeBars = stackBars(incomeGroups, totalIncome || 1);
  const rightBars = stackBars(rightGroups, totalIncome || 1);

  // Center node spans the full stacked height
  const stackTop = topPad;
  const incomeStackBot = incomeBars.length > 0
    ? incomeBars[incomeBars.length - 1].y + incomeBars[incomeBars.length - 1].h
    : topPad + usableH;
  const rightStackBot = rightBars.length > 0
    ? rightBars[rightBars.length - 1].y + rightBars[rightBars.length - 1].h
    : topPad + usableH;
  const centerH = Math.max(incomeStackBot, rightStackBot) - stackTop;

  // ── Attachment points on center node ──────────────────────────────
  // Left edge: income flows attach proportionally top-to-bottom
  function computeAttachments(groups, totalRef) {
    let yOff = stackTop;
    return groups.map((g) => {
      const h = (g.amount / totalRef) * centerH;
      const attach = { y: yOff, h };
      yOff += h;
      return attach;
    });
  }

  const leftAttach = computeAttachments(incomeGroups, totalIncome || 1);
  const rightAttach = computeAttachments(rightGroups, totalIncome || 1);

  // ── Build flow ribbons ────────────────────────────────────────────
  const flows = [];

  // Income flows: left bars → center left edge
  incomeBars.forEach((bar, i) => {
    const attach = leftAttach[i];
    flows.push({
      key: `in-${bar.category}`,
      from: bar.category,
      to: 'Your Account',
      amount: bar.amount,
      color: CYAN,
      path: ribbon(
        leftBarX + barW, bar.y, bar.y + bar.h,
        centerX, attach.y, attach.y + attach.h,
      ),
      clickCategory: bar.category,
    });
  });

  // Right flows: center right edge → right bars
  rightBars.forEach((bar, i) => {
    const attach = rightAttach[i];
    const isSavings = bar.category === 'Savings';
    flows.push({
      key: `out-${bar.category}`,
      from: 'Your Account',
      to: bar.category,
      amount: bar.amount,
      color: isSavings ? GREEN : ROSE,
      path: ribbon(
        centerX + centerW, attach.y, attach.y + attach.h,
        rightBarX, bar.y, bar.y + bar.h,
      ),
      clickCategory: isSavings ? null : bar.category,
    });
  });

  // ── Handlers ──────────────────────────────────────────────────────
  const handleFlowHover = useCallback((flow, e) => {
    if (!flow) { setTooltip(null); setHoveredFlow(null); return; }
    setHoveredFlow(flow.key);
    const pct = totalIncome > 0 ? Math.round((flow.amount / totalIncome) * 100) : 0;
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      text: `${flow.from} → ${flow.to}\n${fmt(flow.amount)} (${pct}%)`,
    });
  }, [totalIncome]);

  const handleBarHover = useCallback((group, label, e) => {
    if (!group) { setTooltip(null); return; }
    const pct = totalIncome > 0 ? Math.round((group.amount / totalIncome) * 100) : 0;
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      text: `${group.category}: ${fmt(group.amount)}\n${pct}% of income`,
    });
  }, [totalIncome]);

  const handleBarClick = useCallback(
    (category) => { if (onCategoryClick && category) onCategoryClick(category); },
    [onCategoryClick],
  );

  return (
    <div ref={containerRef} style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <h3 style={s.title}>Cash Flow</h3>
        <span style={s.subtitle}>Next {tfLabel}</span>
      </div>

      {/* Summary row */}
      <div style={s.summaryRow}>
        <div style={s.summaryItem}>
          <span style={{ ...s.summaryDot, background: CYAN }} />
          <span style={s.summaryLabel}>Income</span>
          <span style={{ ...s.summaryValue, color: CYAN }}>{fmt(totalIncome)}</span>
        </div>
        <span style={s.summaryDivider}>/</span>
        <div style={s.summaryItem}>
          <span style={{ ...s.summaryDot, background: ROSE }} />
          <span style={s.summaryLabel}>Expenses</span>
          <span style={{ ...s.summaryValue, color: ROSE }}>{fmt(totalExpenses)}</span>
        </div>
        <span style={s.summaryDivider}>/</span>
        <div style={s.summaryItem}>
          <span style={{ ...s.summaryDot, background: surplusColor }} />
          <span style={s.summaryLabel}>{surplus >= 0 ? 'Surplus' : 'Deficit'}</span>
          <span style={{ ...s.summaryValue, color: surplusColor }}>
            {surplus >= 0 ? '+' : '-'}{fmt(surplus)}
          </span>
        </div>
      </div>

      {/* SVG Sankey */}
      <div style={s.svgContainer}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>

          {/* ── Flow ribbons ──────────────────────────────────────── */}
          {flows.map((flow) => (
            <path
              key={flow.key}
              d={flow.path}
              fill={flow.color}
              fillOpacity={hoveredFlow === flow.key ? 0.55 : 0.2}
              stroke={flow.color}
              strokeWidth={0.5}
              strokeOpacity={hoveredFlow === flow.key ? 0.8 : 0.3}
              style={{ cursor: flow.clickCategory ? 'pointer' : 'default', transition: 'fill-opacity 150ms ease' }}
              onMouseEnter={(e) => handleFlowHover(flow, e)}
              onMouseMove={(e) => handleFlowHover(flow, e)}
              onMouseLeave={() => handleFlowHover(null)}
              onClick={() => handleBarClick(flow.clickCategory)}
            />
          ))}

          {/* ── Left: Income bars + labels ─────────────────────────── */}
          {incomeBars.map((bar) => (
            <g
              key={bar.category}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleBarHover(bar, 'income', e)}
              onMouseMove={(e) => handleBarHover(bar, 'income', e)}
              onMouseLeave={() => handleBarHover(null)}
              onClick={() => handleBarClick(bar.category)}
            >
              <rect x={leftBarX} y={bar.y} width={barW} height={bar.h} rx={4} fill={CYAN} />
              <text
                x={leftBarX - 10}
                y={bar.y + bar.h / 2}
                textAnchor="end"
                dominantBaseline="central"
                fill={WHITE}
                fontSize={13}
                fontWeight={600}
              >
                {bar.category}
              </text>
            </g>
          ))}

          {/* ── Center: Your Account node ──────────────────────────── */}
          <g>
            <rect
              x={centerX}
              y={stackTop}
              width={centerW}
              height={centerH}
              rx={6}
              fill={AMBER}
            />
            {/* Label centered on pillar — horizontal */}
            <text
              x={centerX + centerW / 2}
              y={stackTop + centerH / 2 - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#555555"
              fontSize={11}
              fontWeight={700}
              letterSpacing="0.06em"
            >
              YOUR
            </text>
            <text
              x={centerX + centerW / 2}
              y={stackTop + centerH / 2 + 8}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#555555"
              fontSize={11}
              fontWeight={700}
              letterSpacing="0.06em"
            >
              ACCOUNT
            </text>
          </g>

          {/* ── Right: Expense + Savings bars + labels ─────────────── */}
          {rightBars.map((bar) => {
            const isSavings = bar.category === 'Savings';
            const barColor = isSavings ? GREEN : WHITE;
            return (
              <g
                key={bar.category}
                style={{ cursor: isSavings ? 'default' : 'pointer' }}
                onMouseEnter={(e) => handleBarHover(bar, isSavings ? 'savings' : 'expense', e)}
                onMouseMove={(e) => handleBarHover(bar, isSavings ? 'savings' : 'expense', e)}
                onMouseLeave={() => handleBarHover(null)}
                onClick={() => !isSavings && handleBarClick(bar.category)}
              >
                <rect x={rightBarX} y={bar.y} width={barW} height={bar.h} rx={4} fill={barColor} />
                <text
                  x={rightBarX + barW + 10}
                  y={bar.y + bar.h / 2}
                  dominantBaseline="central"
                  fill={isSavings ? GREEN : WHITE}
                  fontSize={13}
                  fontWeight={600}
                >
                  {bar.category}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ ...s.tooltip, left: tooltip.x + 14, top: tooltip.y - 36 }}>
          {tooltip.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const s = {
  wrapper: {
    position: 'relative',
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: '12px',
    padding: '24px',
    minHeight: '380px',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: WHITE,
  },
  subtitle: {
    fontSize: '14px',
    color: TEXT_DIM,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  summaryDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  summaryLabel: {
    fontSize: '12px',
    color: TEXT_DIM,
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 700,
  },
  summaryDivider: {
    color: BORDER,
    fontSize: '14px',
  },
  svgContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  tooltip: {
    position: 'fixed',
    background: '#1A1A1A',
    border: `1px solid ${BORDER}`,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    color: WHITE,
    pointerEvents: 'none',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    whiteSpace: 'pre',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  emptyText: {
    color: TEXT_DIM,
    fontSize: '16px',
  },
  emptyBtn: {
    background: 'transparent',
    border: `1px solid ${BORDER}`,
    color: WHITE,
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
