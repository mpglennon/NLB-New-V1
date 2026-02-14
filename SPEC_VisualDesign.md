# NLBCash v1.0 - Visual Design Specification

## Overview
NLBCash visual language: **Terminal aesthetic meets human warmth**. Dark mode, high contrast, data-dense, but with conversational microcopy and permission to be human. Think Bloomberg Terminal crossed with Things 3.

---

## Design Principles

1. **Orange Discipline** - Orange appears EXACTLY twice: NLB logo + "Check In" button
2. **Amber for Caution** - Never use orange for warnings (use amber #FFA726)
3. **Bright White Text** - Primary numbers must pop (7:1 contrast minimum)
4. **Clickable Everything** - If you can see it, you can click it (no decorative elements)
5. **Mobile-First** - Design for iPhone 13/14 size (390x844), scale up for desktop

---

## Color Palette

### CSS Variables (Use These Everywhere):
```css
:root {
  /* Brand */
  --brand-orange: #FF6B35;      /* NLB logo + Check In button ONLY */
  
  /* Status Colors */
  --caution-amber: #FFA726;     /* Caution states, tight cash */
  --safe-green: #4CAF50;        /* Safe states, income */
  --critical-white: #FFFFFF;    /* Critical states (<30 days runway) */
  
  /* Text */
  --text-primary: #FFFFFF;      /* Key numbers, headers */
  --text-secondary: #E0E0E0;    /* Labels, subtitles */
  --text-tertiary: #A0A0A0;     /* Helper text, disabled states */
  
  /* Backgrounds */
  --bg-dark: #1A1A1A;           /* Canvas, main background */
  --bg-card: #242424;           /* Card backgrounds (slightly lighter) */
  --bg-hover: rgba(255, 255, 255, 0.05); /* Hover states */
  
  /* Borders */
  --border-subtle: #333333;     /* Dividers, card borders */
  --border-focus: #FFFFFF;      /* Focus states, active elements */
  
  /* Overlays */
  --overlay-backdrop: rgba(0, 0, 0, 0.6); /* Drawer backdrop */
}
```

### Color Usage Rules:

| **Color** | **Use For** | **NEVER Use For** |
|-----------|-------------|-------------------|
| `--brand-orange` | NLB logo, Check In button | Caution states, expense categories, alerts |
| `--caution-amber` | Calendar caution cells, low balance warnings | Brand elements, primary CTAs |
| `--safe-green` | Income transactions, safe runway states | Expenses, negative values |
| `--text-primary` | Runway days, balance, critical numbers | Body copy, helper text |

---

## Typography

### Font Stack:
```css
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               "Helvetica Neue", Arial, sans-serif;
```

### Type Scale:
```css
/* Hero Numbers (Runway, Balance) */
--font-hero-size: 40px;
--font-hero-weight: 700; /* Bold */
--font-hero-line: 1.2;
--font-hero-color: var(--text-primary);

/* Primary Numbers (Cards, Metrics) */
--font-primary-size: 32px;
--font-primary-weight: 700;
--font-primary-line: 1.3;
--font-primary-color: var(--text-primary);

/* Secondary Text (Labels, Subtitles) */
--font-secondary-size: 16px;
--font-secondary-weight: 500; /* Medium */
--font-secondary-line: 1.5;
--font-secondary-color: var(--text-secondary);

/* Tertiary Text (Helper, Micro) */
--font-tertiary-size: 14px;
--font-tertiary-weight: 400; /* Regular */
--font-tertiary-line: 1.4;
--font-tertiary-color: var(--text-tertiary);

/* Body Copy */
--font-body-size: 16px;
--font-body-weight: 400;
--font-body-line: 1.6;
--font-body-color: var(--text-secondary);
```

### Typography Examples:
```html
<!-- Hero Number -->
<div style="
  font-size: var(--font-hero-size);
  font-weight: var(--font-hero-weight);
  color: var(--font-hero-color);
">
  23 days
</div>

<!-- Label -->
<div style="
  font-size: var(--font-tertiary-size);
  font-weight: var(--font-tertiary-weight);
  color: var(--font-tertiary-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
">
  RUNWAY
</div>
```

---

## Button Styles

### Primary Button (Check In):
```css
.btn-primary {
  background: var(--brand-orange);
  color: #FFFFFF;
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 200ms ease;
}

.btn-primary:hover {
  background: #E65A2A; /* 10% darker orange */
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}
```

### Secondary Button (Bordered):
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  height: 40px;
  padding: 0 20px;
  border: 2px solid var(--text-primary);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--brand-orange);
  color: var(--brand-orange);
}
```

### Icon Button (Settings, Help):
```css
.btn-icon {
  background: transparent;
  color: var(--text-tertiary);
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 200ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

---

## Card Styles

### Base Card:
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
  transition: border-color 200ms ease;
}

.card:hover {
  border-color: var(--border-focus);
}
```

### Status Card (Runway, Balance):
```css
.card-status {
  background: var(--bg-card);
  border: 3px solid var(--safe-green); /* Green for safe, amber for caution, white for critical */
  border-radius: 12px;
  padding: 24px;
}

/* Variants */
.card-status.safe { border-color: var(--safe-green); }
.card-status.caution { border-color: var(--caution-amber); }
.card-status.critical { border-color: var(--critical-white); }
```

---

## Layout Components

### Header (All Screens):
```html
<header class="app-header">
  <div class="header-left">
    <img src="nlb-logo.svg" alt="NLB" class="header-logo" />
  </div>
  <div class="header-center">
    <h1 class="header-title">RUNWAY</h1>
  </div>
  <div class="header-right">
    <button class="btn-primary">Check In</button>
  </div>
</header>
```

```css
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 120px; /* Pulls elements toward center on big screens */
  background: var(--bg-dark);
  border-bottom: 1px solid var(--border-subtle);
}

.header-logo {
  height: 40px;
  width: auto;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@media (max-width: 768px) {
  .app-header {
    padding: 16px;
  }
  
  .header-center {
    flex: 1;
    text-align: center;
  }
}
```

### Tab Navigation:
```html
<nav class="tab-nav">
  <button class="tab active">Overview</button>
  <button class="tab">Flow</button>
  <button class="tab">Cash Calendar</button>
  <button class="tab">Transactions</button>
</nav>
```

```css
.tab-nav {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid var(--border-subtle);
  padding: 0 24px;
}

.tab {
  background: transparent;
  color: var(--text-tertiary);
  border: none;
  border-bottom: 3px solid transparent;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  margin-bottom: -2px; /* Overlap with nav border */
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--brand-orange);
}

@media (max-width: 768px) {
  .tab-nav {
    gap: 0;
    padding: 0;
  }
  
  .tab {
    flex: 1;
    padding: 12px 8px;
    font-size: 14px;
  }
}
```

### Timeframe Selector (30/60/90/1Y):
```html
<div class="timeframe-selector">
  <button class="timeframe-btn active" data-days="30">30</button>
  <button class="timeframe-btn" data-days="60">60</button>
  <button class="timeframe-btn" data-days="90">90</button>
  <button class="timeframe-btn" data-days="365">1Y</button>
</div>
```

```css
.timeframe-selector {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
}

.timeframe-btn {
  width: 60px;
  height: 44px;
  background: transparent;
  border: 2px solid var(--text-tertiary);
  color: var(--text-tertiary);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms ease;
}

.timeframe-btn:first-child { border-radius: 8px 0 0 8px; }
.timeframe-btn:last-child { border-radius: 0 8px 8px 0; }
.timeframe-btn:not(:last-child) { border-right: none; }

.timeframe-btn.active {
  background: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-dark);
}

.timeframe-btn:hover:not(.active) {
  border-color: var(--text-primary);
  color: var(--text-primary);
}
```

---

## Cinematic Drawer (Desktop)

### Structure:
```html
<div class="transaction-drawer">
  <div class="drawer-backdrop"></div>
  <div class="drawer-content">
    <button class="drawer-close">✕</button>
    <div class="drawer-columns">
      <div class="drawer-column income">
        <h3 class="drawer-column-title">Income</h3>
        <!-- Transaction list -->
      </div>
      <div class="drawer-column expense">
        <h3 class="drawer-column-title">Expenses</h3>
        <!-- Transaction list -->
      </div>
    </div>
  </div>
</div>
```

### Styles:
```css
.transaction-drawer {
  position: fixed;
  top: 0;
  right: -100%;
  width: 100%;
  height: 100%;
  z-index: 1000;
  transition: right 300ms ease-out;
}

.transaction-drawer.open {
  right: 0;
}

.drawer-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--overlay-backdrop);
  cursor: pointer;
}

.drawer-content {
  position: absolute;
  top: 0;
  right: 0;
  width: 70%;
  max-width: 800px;
  height: 100%;
  background: var(--bg-dark);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
}

.drawer-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 24px;
  cursor: pointer;
  transition: color 200ms ease;
}

.drawer-close:hover {
  color: var(--text-primary);
}

.drawer-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 80px 24px 24px;
}

.drawer-column {
  min-height: 400px;
}

.drawer-column.income {
  border-right: 1px solid var(--border-subtle);
  padding-right: 24px;
}

.drawer-column-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Mobile: Bottom Sheet */
@media (max-width: 768px) {
  .drawer-content {
    top: auto;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: 80%;
    border-radius: 16px 16px 0 0;
  }
  
  .drawer-content::before {
    content: "";
    display: block;
    width: 40px;
    height: 4px;
    background: var(--text-tertiary);
    border-radius: 2px;
    margin: 12px auto 24px;
  }
  
  .drawer-columns {
    grid-template-columns: 1fr;
    gap: 32px;
    padding-top: 40px;
  }
  
  .drawer-column.income {
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
    padding-right: 0;
    padding-bottom: 24px;
  }
}
```

---

## Transaction Item (Inside Drawer):
```html
<div class="transaction-item">
  <div class="txn-main">
    <div class="txn-category">Paycheck</div>
    <div class="txn-amount income">+$3,125</div>
  </div>
  <div class="txn-meta">
    <div class="txn-frequency">Bi-weekly • Next: Feb 14</div>
  </div>
</div>
```

```css
.transaction-item {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 200ms ease;
}

.transaction-item:hover {
  border-color: var(--border-focus);
  transform: translateX(4px);
}

.txn-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.txn-category {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.txn-amount {
  font-size: 18px;
  font-weight: 700;
}

.txn-amount.income {
  color: var(--safe-green);
}

.txn-amount.expense {
  color: var(--text-primary);
}

.txn-meta {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: var(--text-tertiary);
}

.txn-frequency::before {
  content: "🔁 ";
  opacity: 0.5;
}
```

---

## Calendar Styles

### Calendar Grid:
```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  padding: 24px;
}

.calendar-cell {
  aspect-ratio: 1;
  background: var(--bg-card);
  border: 2px solid var(--border-subtle);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 200ms ease;
  position: relative;
}

.calendar-cell:hover {
  border-color: var(--border-focus);
  transform: scale(1.05);
}

.calendar-cell.caution {
  border-color: var(--caution-amber);
}

.calendar-cell.critical {
  border-color: var(--critical-white);
}

.calendar-date {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.calendar-transactions {
  font-size: 12px;
  color: var(--text-tertiary);
}

.calendar-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  margin: 2px;
}

.calendar-badge.income {
  background: rgba(76, 175, 80, 0.2);
  color: var(--safe-green);
}

.calendar-badge.expense {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
```

---

## Chart Styles

### Runway Projection Chart:
```css
.runway-chart {
  width: 100%;
  height: 300px;
  padding: 24px;
}

.chart-line {
  stroke: var(--safe-green);
  stroke-width: 3;
  fill: none;
}

.chart-line.caution {
  stroke: var(--caution-amber);
}

.chart-line.critical {
  stroke: var(--critical-white);
}

.chart-grid-line {
  stroke: var(--border-subtle);
  stroke-width: 1;
  opacity: 0.3;
}

.chart-label {
  font-size: 12px;
  fill: var(--text-tertiary);
}
```

---

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  :root {
    --font-hero-size: 32px;
    --font-primary-size: 24px;
  }
  
  .app-header {
    padding: 16px;
  }
  
  .card {
    padding: 16px;
  }
  
  .calendar-grid {
    gap: 4px;
    padding: 16px;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .app-header {
    padding: 24px 60px;
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .app-content {
    max-width: 1400px;
    margin: 0 auto;
  }
}

/* Large Desktop (32"+ monitors) */
@media (min-width: 1920px) {
  .app-header {
    padding: 24px 120px;
  }
}
```

---

## Animations

### Slide-In (Drawer):
```css
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.drawer-content.open {
  animation: slideIn 300ms ease-out;
}
```

### Fade-In (Cards):
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeIn 400ms ease-out;
}
```

### Pulse (Active State):
```css
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 107, 53, 0);
  }
}

.btn-primary:focus {
  animation: pulse 2s infinite;
}
```

---

## Accessibility

### Focus States:
```css
*:focus {
  outline: 2px solid var(--brand-orange);
  outline-offset: 2px;
}

button:focus-visible {
  outline: 2px solid var(--brand-orange);
  outline-offset: 2px;
}
```

### Contrast Requirements:
- **Text on dark bg:** Minimum 7:1 ratio (WCAG AAA)
- **Interactive elements:** Minimum 3:1 ratio
- **State changes:** Must not rely on color alone (add icons/text)

### Touch Targets (Mobile):
- **Minimum size:** 44x44px (iOS standard)
- **Spacing:** 8px between clickable elements

---

## Component Library Reference

### Key Components to Build:
1. ✅ Header (logo + title + Check In button)
2. ✅ Tab Navigation (4 tabs)
3. ✅ Timeframe Selector (segmented buttons)
4. ✅ Status Card (with border variants)
5. ✅ Runway Chart (line chart with tooltip)
6. ✅ Sankey Diagram (Flow tab)
7. ✅ Calendar Grid (drag-and-drop cells)
8. ✅ Transaction Drawer (slide-in, two columns)
9. ✅ Transaction Item (list item in drawer)
10. ✅ Modal (for settings, help)

---

**END OF VISUAL DESIGN SPEC**
