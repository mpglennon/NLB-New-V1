# NLBCash v1.0 - Interaction Specification

## Overview
**Core Principle:** "If you can see it, you can click it." Every visual element is interactive or serves as a trigger for action. No purely decorative elements.

---

## Global Interactions

### Navigation:
| **Element** | **Click Action** | **Notes** |
|-------------|------------------|-----------|
| NLB Logo (header) | Navigate to Overview tab | Acts as "home" button |
| Tab buttons (Overview/Flow/Calendar/Transactions) | Switch to that tab, maintain timeframe selection | Active tab indicated by orange underline |
| Back button (when shown) | Return to previous view or close modal | Only shown in Settings, Help, or detail views |

### Timeframe Selector (All Tabs):
| **Button** | **Action** | **Scope** |
|------------|-----------|-----------|
| 30 | Update all charts/views to show next 30 days | Persists across tabs |
| 60 | Update all charts/views to show next 60 days | Persists across tabs |
| 90 | Update all charts/views to show next 90 days | **Default on first load** |
| 1Y | Update all charts/views to show next 365 days | Persists across tabs |

**State Management:** Selected timeframe stored in global state, applied to:
- Runway chart (Overview)
- Sankey diagram (Flow)
- Calendar view (Cash Calendar)
- Transaction filtering (Transactions - optional)

---

## Overview Tab Interactions

### Runway Card (Main Hero Element):
```html
<div class="card-status runway-card">
  <div class="card-label">RUNWAY</div>
  <div class="card-value">23 days</div>
  <div class="card-meta">at current burn</div>
</div>
```

**Click Behavior:**
- Click anywhere on card → Open Cinematic Drawer (filtered to next 7 days)
- Tooltip (on hover): "How long you can last at your current burn rate. Simple math, honest answer."

### Current Balance Card:
```html
<div class="card balance-card">
  <div class="card-label">YOU'VE GOT</div>
  <div class="card-value">$4,200</div>
  <div class="card-meta">Last updated: 10 min ago</div>
</div>
```

**Click Behavior:**
- Click card → Open "Check In" modal (quick balance update flow)
- Tooltip: "Click to update your balance"

### Daily Burn Rate Card:
```html
<div class="card burn-card">
  <div class="card-label">BURNING</div>
  <div class="card-value">$186/day</div>
  <div class="card-meta">Based on next 30 days</div>
</div>
```

**Click Behavior:**
- Click card → Open Cinematic Drawer (show all expenses)
- Tooltip: "Your average daily cash outflow"

### Runway Projection Chart:
**Visual:** Line chart showing projected balance over timeframe (30/60/90/1Y days)

**Interactions:**
1. **Rollover (any data point):**
   - Show tooltip with:
     ```
     Feb 14, 2026
     Balance: $11,485
     ↑ Income: +$3,200 (Paycheck)
     ↓ Expenses: -$1,030 (Rent, Groceries)
     ```
2. **Click (any data point):**
   - Open Cinematic Drawer
   - Scroll to that date's transactions
   - Highlight transactions in drawer

3. **Zoom (optional - v2.0):**
   - Pinch to zoom (mobile)
   - Mouse wheel to zoom (desktop)

---

## Flow Tab Interactions

### Sankey Diagram (Big Five):
**Visual:** Income → Categories flow chart

**Structure:**
- Left bar: Income (combined or split if multiple sources)
- Right bars: Top 5 expense categories + "Other"
- Flow lines: Proportional width based on $ amount

**Interactions:**

1. **Rollover (any category bar):**
   - Highlight that category
   - Show tooltip:
     ```
     Rent: $1,950/month
     35% of expenses
     ```

2. **Click (any category bar):**
   - Open Cinematic Drawer
   - Filter to that category's transactions
   - Example: Click "Rent" → Drawer shows only rent-related expenses

3. **Click (income bar):**
   - Open Cinematic Drawer
   - Show all income sources

4. **Click (flow line):**
   - Same as clicking destination category

**Empty State (No Transactions):**
```html
<div class="empty-state">
  <p>Track for 30 days to unlock cash flow visualization</p>
  <button class="btn-secondary" onclick="openDrawer()">
    Add Your First Transaction
  </button>
</div>
```

---

## Cash Calendar Tab Interactions

### Calendar Grid:
**Visual:** 7-column grid (Sun-Sat), 4-5 rows (month view)

**Cell States:**
| **State** | **Visual** | **Meaning** |
|-----------|------------|-------------|
| **Safe** | Green border (1px) | Positive balance |
| **Caution** | Amber border (3px) | Balance < $1,000 but > $0 |
| **Critical** | White border (3px) | Balance approaching $0 |
| **Today** | Orange outline (2px) | Current date marker |

**Interactions:**

1. **Click (any calendar cell):**
   - Open Cinematic Drawer
   - Filter to that date's transactions
   - Show date in drawer header: "Transactions for Feb 14"

2. **Drag (transaction badge on cell):**
   - **Start drag:** Badge lifts, cursor changes to grab
   - **During drag:** Chart updates in real-time (live preview)
   - **Drop (on new cell):** Transaction moves to new date, chart persists update
   - **Drop (outside calendar):** Cancel, return badge to origin

3. **Drag (entire cell - optional v2.0):**
   - Drag all transactions from one day to another
   - Useful for "move all bills from Feb 1 to Feb 7"

**Drag-and-Drop Constraints:**
- ✅ Can only drag future transactions (can't edit past)
- ✅ Can't drag one-time expenses to before today
- ✅ Can drag recurring items forward (delays next occurrence)
- ❌ Can't drag to past dates
- ❌ Can't drag locked transactions (e.g., already paid)

**Month/Week Toggle:**
```html
<div class="view-toggle">
  <button class="toggle-btn active" data-view="month">Month</button>
  <button class="toggle-btn" data-view="week">Week</button>
</div>
```

**Behavior:**
- **Month View (default):** Shows 30-35 days (full month)
- **Week View:** Shows 7 days (current week)
- **Toggle:** Reloads calendar with new granularity

---

## Transactions Tab Interactions

### Transaction Drawer (Always Visible on This Tab):
**Layout:** Two-column split (Income left, Expenses right)

**Interactions:**

1. **Click (any transaction item):**
   - Expand inline editor
   - Show editable fields:
     - Category (dropdown)
     - Amount (number input)
     - Frequency (dropdown)
     - Start Date (date picker)
     - Description (text input)
   - Save/Cancel buttons appear

2. **Swipe (mobile - transaction item):**
   - **Swipe left:** Reveal "Delete" button (red)
   - **Swipe right:** Reveal "Pause" button (gray - sets isActive: false)

3. **Click ("+ Add Income" button):**
   - Collapse all expanded items
   - Show empty transaction form at top of Income column
   - Auto-focus on Category dropdown

4. **Click ("+ Add Expense" button):**
   - Collapse all expanded items
   - Show empty transaction form at top of Expense column
   - Auto-focus on Category dropdown

**Transaction Form (Inline):**
```html
<form class="transaction-form">
  <select name="category" required>
    <option value="">Select category...</option>
    <!-- Category list -->
  </select>
  
  <input type="number" name="amount" placeholder="0.00" required />
  
  <select name="frequency" required>
    <option value="one-time">One-time</option>
    <option value="weekly">Weekly</option>
    <option value="bi-weekly">Bi-weekly</option>
    <option value="monthly">Monthly</option>
  </select>
  
  <input type="date" name="startDate" required />
  
  <textarea name="description" placeholder="Optional note..."></textarea>
  
  <div class="form-actions">
    <button type="submit" class="btn-primary">Save</button>
    <button type="button" class="btn-secondary" onclick="cancel()">Cancel</button>
  </div>
</form>
```

**Save Behavior:**
- Validate all required fields
- Generate transaction ID
- Add to transactions array
- Recalculate runway
- Close form, show success toast: "Transaction added ✓"
- Persist to localStorage immediately

---

## Check In Flow (Balance Update)

### Trigger:
- Click "Check In" button (header, always visible)
- Click Current Balance card (Overview tab)

### Modal Structure:
```html
<div class="modal check-in-modal">
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <h2>Check In</h2>
    <p class="modal-subtitle">Match your bank balance in 10 seconds</p>
    
    <form class="check-in-form">
      <label>Current Balance</label>
      <input type="number" 
             name="balance" 
             placeholder="4,200.00" 
             value="4200.00"
             step="0.01"
             autofocus />
      
      <label>Quick Note (Optional)</label>
      <input type="text" 
             name="note" 
             placeholder="e.g., 'Paid rent early'" />
      
      <div class="modal-actions">
        <button type="submit" class="btn-primary">Update</button>
        <button type="button" class="btn-secondary" onclick="closeModal()">
          Cancel
        </button>
      </div>
    </form>
    
    <div class="modal-delta">
      <small>Delta from last check-in: <span class="delta-positive">+$240</span></small>
    </div>
  </div>
</div>
```

**Behavior:**
1. **Open modal:** Pre-fill with current balance, auto-focus input
2. **User types new balance:** Calculate delta in real-time
3. **Click "Update":**
   - Save new balance to account
   - Update timestamp
   - Recalculate runway
   - Close modal
   - Show success toast: "Balance updated ✓"
   - Persist to localStorage

**Delta Indicator:**
- Positive delta (balance increased): Green text, "+$240"
- Negative delta (balance decreased): Red text, "-$180"
- Zero delta: Gray text, "$0"

---

## Cinematic Drawer (Global Component)

### Trigger Points:
| **Source** | **Filter Applied** |
|------------|--------------------|
| Runway Card (Overview) | Next 7 days |
| Balance Card (Overview) | All active transactions |
| Burn Rate Card (Overview) | All expenses |
| Chart Data Point (Overview) | Transactions on that date |
| Sankey Category (Flow) | That category only |
| Calendar Cell (Cash Calendar) | That date only |
| Transaction Item (Transactions) | Edit mode for that transaction |

### Open Animation:
1. Backdrop fades in (200ms)
2. Drawer slides in from right (300ms ease-out)
3. Content fades in (200ms, delayed 100ms)

### Close Methods:
1. Click "✕" button (top-right)
2. Click backdrop (outside drawer)
3. Press ESC key (keyboard)
4. Swipe right (mobile only)

### Two-Column Layout:
```
┌─────────────────────────────────────┐
│  ✕                                  │ ← Close button
├─────────────────┬───────────────────┤
│  INCOME         │  EXPENSES         │ ← Column headers
├─────────────────┼───────────────────┤
│  Paycheck       │  Rent             │
│  $3,125         │  $1,950           │
│  Bi-weekly      │  Monthly          │
│  ────────────── │  ────────────────  │
│  Side Hustle    │  Groceries        │
│  $600           │  $130             │
│  Monthly        │  Weekly           │
├─────────────────┼───────────────────┤
│  + Add Income   │  + Add Expense    │ ← Quick add buttons
└─────────────────┴───────────────────┘
```

**Scrolling:**
- Each column scrolls independently
- Sticky column headers (remain visible)
- Bottom padding (100px) ensures last item isn't obscured

**Mobile (Bottom Sheet):**
- Slides up from bottom (not right)
- Drag handle at top (pull down to close)
- Single-column layout (Income, then Expenses)
- 80% screen height max

---

## Keyboard Shortcuts

| **Key** | **Action** | **Context** |
|---------|-----------|-------------|
| **ESC** | Close drawer/modal | When drawer or modal is open |
| **C** | Open Check In modal | Global (any tab) |
| **T** | Open Transaction Drawer | Global (any tab) |
| **1-4** | Switch to tab 1-4 | Global (Overview, Flow, Calendar, Transactions) |
| **Arrow Keys** | Navigate calendar | Cash Calendar tab only |
| **Enter** | Submit form | When input is focused |

---

## Touch Gestures (Mobile)

| **Gesture** | **Action** | **Context** |
|-------------|-----------|-------------|
| **Tap** | Click/activate | Universal |
| **Long press** | Show tooltip | Cards, chart elements |
| **Swipe left** | Delete transaction | Transaction item |
| **Swipe right** | Pause transaction | Transaction item |
| **Swipe down** | Close drawer | Bottom sheet drawer |
| **Pinch** | Zoom chart (v2.0) | Runway chart |
| **Drag** | Move transaction | Calendar cell |

---

## Loading States

### Initial Load:
```html
<div class="loading-skeleton">
  <div class="skeleton-card"></div>
  <div class="skeleton-chart"></div>
</div>
```

**Duration:** <500ms (should be instant from localStorage)

### Calculation (Runway Update):
```html
<div class="calculating-overlay">
  <div class="spinner"></div>
  <p>Updating runway...</p>
</div>
```

**Duration:** <100ms (should be near-instant)

### Saving Transaction:
- **No spinner** (optimistic UI - update immediately)
- **Toast on success:** "Transaction saved ✓"
- **Toast on error:** "Couldn't save. Try again?"

---

## Error States

### No Transactions:
```html
<div class="empty-state">
  <p>No transactions yet</p>
  <button class="btn-primary" onclick="openDrawer()">
    Add Your First Entry
  </button>
</div>
```

### Negative Balance:
```html
<div class="alert alert-critical">
  <strong>Heads up:</strong> Your balance is negative. Add income or reduce expenses.
</div>
```

### Invalid Input:
```html
<div class="input-error">
  Please enter a valid amount
</div>
```

---

## Tooltips (On Hover)

| **Element** | **Tooltip Text** |
|-------------|------------------|
| Runway Card | "How long you can last at your current burn rate. Simple math, honest answer." |
| Balance Card | "Click to update your balance" |
| Burn Rate Card | "Your average daily cash outflow" |
| Timeframe Button | "Show next [30/60/90/365] days" |
| Check In Button | "Match your bank balance in 10 seconds" |
| Chart Data Point | "Feb 14: $11,485 (+$3,200 income, -$1,030 expenses)" |
| Calendar Cell (Caution) | "Tight, but not critical" |
| Calendar Cell (Critical) | "Pay attention - running low" |

**Tooltip Style:**
```css
.tooltip {
  background: var(--bg-card);
  border: 1px solid var(--border-focus);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 250px;
}
```

---

## Accessibility (A11y)

### Screen Reader Announcements:
- Balance update: "Balance updated to $4,200"
- Transaction added: "Paycheck added to income, $3,125 bi-weekly"
- Runway change: "Runway decreased to 18 days, caution level"

### ARIA Labels:
```html
<button aria-label="Open transaction drawer">
  Add Transaction
</button>

<div role="alert" aria-live="polite">
  <!-- Success/error messages -->
</div>
```

### Focus Management:
- **Modal opens:** Focus first input
- **Drawer opens:** Focus close button
- **Form submits:** Focus success message, then return to trigger
- **Tab key:** Logical tab order (header → tabs → content → drawer)

---

## Performance Targets

| **Action** | **Target** | **Acceptable** | **Notes** |
|------------|-----------|----------------|-----------|
| Tab switch | <50ms | <100ms | Instant perceived |
| Chart render | <200ms | <500ms | Should feel smooth |
| Drawer open | <300ms | <500ms | Animation duration |
| Balance update | <100ms | <200ms | Includes recalc |
| Transaction save | <50ms | <100ms | Optimistic UI |

---

## State Persistence

### localStorage Keys:
```javascript
{
  "nlb_account": { /* account object */ },
  "nlb_transactions": [ /* transaction array */ ],
  "nlb_preferences": {
    "timeframe": 90,
    "lastVisitedTab": "overview",
    "theme": "dark" // Future: light mode
  }
}
```

### Save Triggers:
- ✅ Balance update → Save immediately
- ✅ Transaction add/edit/delete → Save immediately
- ✅ Timeframe change → Save immediately
- ✅ Tab switch → Save preference (debounced 1s)

---

## User Flows (Step-by-Step)

### First Launch (New User):
1. App loads with demo data pre-populated
2. User sees Overview tab with realistic numbers
3. Tooltip appears (first-time only): "This is demo data. Click 'Check In' to use your real balance."
4. User clicks "Check In"
5. Modal opens, user enters balance
6. User clicks tabs to explore
7. User clicks "+ Add Income" to add first real transaction
8. Demo data auto-clears after first real transaction added

### Daily Check-In (Returning User):
1. User opens app (last visited tab loads)
2. User clicks "Check In" button
3. Enters balance, clicks "Update"
4. Glances at Runway card (23 days)
5. Closes app (total time: <30 seconds)

### Drag-and-Drop Reschedule:
1. User opens Cash Calendar tab
2. Sees Feb 1 is amber (caution)
3. Drags "Rent" badge from Feb 1 to Feb 7
4. Chart updates in real-time
5. Feb 1 turns green, Feb 7 turns amber
6. User satisfied, closes app

---

**END OF INTERACTION SPEC**
