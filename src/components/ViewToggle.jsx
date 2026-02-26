import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths as addMonthsFn, startOfToday } from 'date-fns';

const topControlsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: '16px',
};

export default function ViewToggle({ viewMonth, timeframe, setViewMonth, setTimeframe, tfLabel, compact }) {
  const [openPanel, setOpenPanel] = useState(null);
  const ref = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
    height: compact ? '30px' : '36px',
    padding: compact ? '0 12px' : '0 16px',
    fontSize: compact ? '12px' : '13px',
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

  const goMonth = (dir) => {
    const current = viewMonth || format(startOfToday(), 'yyyy-MM');
    const [y, m] = current.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const next = addMonthsFn(d, dir);
    setViewMonth(format(next, 'yyyy-MM'));
    setOpenPanel(null);
  };

  const forecastSteps = [30, 60, 90, 365];
  const goForecast = (dir) => {
    const idx = forecastSteps.indexOf(timeframe);
    const nextIdx = Math.max(0, Math.min(forecastSteps.length - 1, idx + dir));
    setTimeframe(forecastSteps[nextIdx]);
    setOpenPanel(null);
  };

  const arrowBtn = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontSize: compact ? '18px' : '22px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: compact ? '4px 8px' : '4px 10px',
    lineHeight: 1,
    borderRadius: '6px',
    transition: 'color 120ms ease, background 120ms ease, border-color 120ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: compact ? '28px' : '34px',
    minHeight: compact ? '28px' : '32px',
  };

  const arrowHoverIn = (e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover, var(--bg-panel))'; e.currentTarget.style.borderColor = 'var(--border-focus)'; };
  const arrowHoverOut = (e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; };

  const wrapperStyle = compact
    ? { position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }
    : { ...topControlsStyle, position: 'relative', alignItems: 'center', ...(isMobile ? { justifyContent: 'center' } : {}) };

  return (
    <div style={wrapperStyle} ref={ref}>
      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden' }}>
        <button
          style={{
            ...toggleBtnBase,
            ...(isMonthMode ? activeStyle : inactiveStyle),
            borderRadius: '8px 0 0 8px',
            borderRight: 'none',
          }}
          onClick={() => {
            setOpenPanel(openPanel === 'month' ? null : 'month');
          }}
        >
          Month ▾
        </button>
        <button
          style={{
            ...toggleBtnBase,
            ...(!isMonthMode ? activeStyle : inactiveStyle),
            borderRadius: '0 8px 8px 0',
          }}
          onClick={() => {
            setOpenPanel(openPanel === 'forecast' ? null : 'forecast');
          }}
        >
          Forecast ▾
        </button>
      </div>
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '4px', ...(!compact ? { marginLeft: 'auto' } : {}) }}>
          <button
            style={arrowBtn}
            onClick={() => isMonthMode ? goMonth(-1) : goForecast(-1)}
            onMouseEnter={arrowHoverIn}
            onMouseLeave={arrowHoverOut}
          >‹</button>
          <span style={{ fontSize: compact ? '12px' : '14px', fontWeight: '600', color: 'var(--text-primary)', minWidth: compact ? '100px' : '120px', textAlign: 'center' }}>{tfLabel}</span>
          <button
            style={arrowBtn}
            onClick={() => isMonthMode ? goMonth(1) : goForecast(1)}
            onMouseEnter={arrowHoverIn}
            onMouseLeave={arrowHoverOut}
          >›</button>
        </div>
      )}

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
