# NLBCash v1.0 - Data Model Specification

## Overview
NLBCash tracks a single main checking account with forward-looking cash flow projections. No historical analysis, no multi-account support (v1.0). Focus: **30/30 method** (30 min setup, 30 sec daily update).

---

## Core Entities

### 1. Account
```javascript
{
  id: "account_main",
  name: "Main Checking", // User-editable, defaults to "Main Checking"
  currentBalance: 4200.00, // Float, updated via "Check In" button
  lastUpdated: "2026-02-13T08:00:00Z", // ISO timestamp
  currency: "USD" // Future: multi-currency support
}
```

### 2. Transaction (Base Schema)
```javascript
{
  id: "txn_abc123", // UUID or similar
  type: "income" | "expense",
  category: "Paycheck" | "Rent" | etc., // From predefined lists
  description: "Optional custom note",
  amount: 3125.00, // Float, always positive (type determines +/-)
  frequency: "one-time" | "weekly" | "bi-weekly" | "monthly" | "quarterly" | "annually",
  startDate: "2026-02-14", // ISO date (YYYY-MM-DD)
  endDate: null, // ISO date or null (null = ongoing)
  isActive: true, // User can pause/resume without deleting
  createdAt: "2026-02-13T08:00:00Z",
  updatedAt: "2026-02-13T08:00:00Z"
}
```

**Transaction Types:**
- **One-time:** Single occurrence (e.g., "Dinner with Mom" on Feb 12)
- **Recurring:** Repeats on schedule (e.g., "Paycheck" bi-weekly, "Rent" monthly)

**Frequency Rules:**
- `weekly`: Every 7 days from startDate
- `bi-weekly`: Every 14 days from startDate
- `monthly`: Same day each month (e.g., 1st, 15th)
- `quarterly`: Every 3 months
- `annually`: Once per year

---

## 3. Runway Calculation Engine

### Input:
- `currentBalance`: Float (from Account)
- `transactions`: Array of active transactions
- `timeframe`: 30 | 60 | 90 | 365 (days)

### Output:
```javascript
{
  runwayDays: 23, // Int - days until balance reaches zero
  dailyBurnRate: 186.00, // Float - average daily net cash flow
  projectedBalance: {
    "30d": 2580.00,
    "60d": 960.00,
    "90d": -1260.00, // Negative = projected deficit
    "365d": -45890.00
  },
  status: "caution", // "safe" | "caution" | "critical"
  depletionDate: "2026-03-07" // ISO date or null if runway > timeframe
}
```

### Calculation Logic:

**Step 1: Generate Daily Cash Flow Array**
```javascript
function generateDailyCashFlow(transactions, timeframe) {
  const days = Array(timeframe).fill(0); // [0, 0, 0, ...]
  const today = new Date();
  
  transactions.forEach(txn => {
    if (!txn.isActive) return;
    
    const occurrences = getOccurrences(txn, timeframe);
    occurrences.forEach(date => {
      const dayIndex = daysBetween(today, date);
      if (dayIndex >= 0 && dayIndex < timeframe) {
        const amount = txn.type === "income" ? txn.amount : -txn.amount;
        days[dayIndex] += amount;
      }
    });
  });
  
  return days; // e.g., [0, -45, 3125, -1800, ...]
}

function getOccurrences(txn, timeframe) {
  const dates = [];
  let currentDate = new Date(txn.startDate);
  const endDate = txn.endDate ? new Date(txn.endDate) : addDays(new Date(), timeframe);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate = addInterval(currentDate, txn.frequency);
  }
  
  return dates;
}
```

**Step 2: Calculate Running Balance**
```javascript
function calculateRunway(currentBalance, dailyCashFlow) {
  let balance = currentBalance;
  let runwayDays = 0;
  
  for (let i = 0; i < dailyCashFlow.length; i++) {
    balance += dailyCashFlow[i];
    if (balance < 0) {
      runwayDays = i;
      break;
    }
    runwayDays = i + 1;
  }
  
  return runwayDays === dailyCashFlow.length ? Infinity : runwayDays;
}
```

**Step 3: Determine Status**
```javascript
function getRunwayStatus(runwayDays) {
  if (runwayDays >= 60) return "safe";      // Green
  if (runwayDays >= 30) return "caution";   // Amber
  return "critical";                        // White (not orange - reserve for brand)
}
```

**Step 4: Calculate Daily Burn Rate**
```javascript
function calculateDailyBurnRate(transactions, timeframe = 30) {
  const dailyCashFlow = generateDailyCashFlow(transactions, timeframe);
  const totalIncome = dailyCashFlow.filter(d => d > 0).reduce((sum, d) => sum + d, 0);
  const totalExpenses = Math.abs(dailyCashFlow.filter(d => d < 0).reduce((sum, d) => sum + d, 0));
  const netCashFlow = totalIncome - totalExpenses;
  
  return Math.abs(netCashFlow / timeframe); // Average daily burn
}
```

---

## 4. Demo Data (Sister-Approved Seed)

### Account:
```javascript
{
  id: "demo_account",
  name: "Main Checking",
  currentBalance: 4200.00,
  lastUpdated: "2026-02-13T08:00:00Z",
  currency: "USD"
}
```

### Transactions:
```javascript
const demoTransactions = [
  // INCOME
  {
    id: "income_1",
    type: "income",
    category: "Paycheck",
    description: "",
    amount: 3125.00,
    frequency: "bi-weekly",
    startDate: "2026-02-14",
    endDate: null,
    isActive: true
  },
  {
    id: "income_2",
    type: "income",
    category: "Side Hustle",
    description: "Freelance design work",
    amount: 600.00,
    frequency: "monthly",
    startDate: "2026-02-20",
    endDate: null,
    isActive: true
  },
  
  // EXPENSES - Monthly Recurring
  {
    id: "expense_1",
    type: "expense",
    category: "Rent",
    description: "",
    amount: 1950.00,
    frequency: "monthly",
    startDate: "2026-03-01",
    endDate: null,
    isActive: true
  },
  {
    id: "expense_2",
    type: "expense",
    category: "Car Payment",
    description: "",
    amount: 485.00,
    frequency: "monthly",
    startDate: "2026-02-18",
    endDate: null,
    isActive: true
  },
  {
    id: "expense_3",
    type: "expense",
    category: "Insurance",
    description: "Auto + renters",
    amount: 220.00,
    frequency: "monthly",
    startDate: "2026-02-05",
    endDate: null,
    isActive: true
  },
  {
    id: "expense_4",
    type: "expense",
    category: "Utilities",
    description: "",
    amount: 140.00,
    frequency: "monthly",
    startDate: "2026-02-10",
    endDate: null,
    isActive: true
  },
  {
    id: "expense_5",
    type: "expense",
    category: "Phone Bill",
    description: "",
    amount: 75.00,
    frequency: "monthly",
    startDate: "2026-02-15",
    endDate: null,
    isActive: true
  },
  {
    id: "expense_6",
    type: "expense",
    category: "Subscriptions",
    description: "Netflix, Spotify, etc.",
    amount: 52.00,
    frequency: "monthly",
    startDate: "2026-02-08",
    endDate: null,
    isActive: true
  },
  
  // EXPENSES - Weekly Recurring
  {
    id: "expense_7",
    type: "expense",
    category: "Groceries",
    description: "",
    amount: 130.00,
    frequency: "weekly",
    startDate: "2026-02-14", // Next Friday
    endDate: null,
    isActive: true
  },
  {
    id: "expense_8",
    type: "expense",
    category: "Gas",
    description: "",
    amount: 45.00,
    frequency: "weekly",
    startDate: "2026-02-17", // Next Monday
    endDate: null,
    isActive: true
  },
  
  // EXPENSES - One-Time (Recent Past)
  {
    id: "expense_9",
    type: "expense",
    category: "Dinner with Mom",
    description: "",
    amount: 68.00,
    frequency: "one-time",
    startDate: "2026-02-12",
    endDate: "2026-02-12",
    isActive: true
  },
  {
    id: "expense_10",
    type: "expense",
    category: "Afternoon Beers",
    description: "",
    amount: 54.00,
    frequency: "one-time",
    startDate: "2026-02-08",
    endDate: "2026-02-08",
    isActive: true
  },
  {
    id: "expense_11",
    type: "expense",
    category: "Vet Bills",
    description: "Annual checkup",
    amount: 185.00,
    frequency: "one-time",
    startDate: "2026-02-06",
    endDate: "2026-02-06",
    isActive: true
  }
];
```

### Expected Results (Based on Demo Data):
- **Current Balance:** $4,200
- **Runway:** ~23 days (caution zone)
- **Daily Burn Rate:** ~$186/day
- **Next Income:** Paycheck on Feb 14 (+$3,125)
- **Next Big Expense:** Rent on Mar 1 (-$1,950)
- **Status:** Amber (caution) - between 30-59 days would be caution, <30 is critical

---

## 5. Category Lists (Predefined)

### Income Categories:
```javascript
const incomeCategories = [
  "Paycheck",
  "Side Hustle",
  "Freelance Gig",
  "Bonus",
  "Tax Refund",
  "Birthday Money",
  "Sold Some Stuff",
  "Odd Jobs",
  "Other"
];
```

### Expense Categories:
```javascript
const expenseCategories = [
  // Daily/Weekly
  "Groceries",
  "Gas",
  "Coffee Runs",
  "Eating Out",
  
  // Monthly Recurring
  "Rent",
  "Car Payment",
  "Insurance",
  "Utilities",
  "Phone Bill",
  "Subscriptions",
  
  // Occasional/Fun
  "Night Out",
  "Afternoon Beers",
  "Dinner with Mom",
  "Kid Stuff",
  "Car Repairs",
  "Vet Bills",
  "Casino Night - Ouch!",
  
  "Other"
];
```

---

## 6. Data Persistence

### V1.0 Strategy: LocalStorage (Browser-Based)
```javascript
// Save
localStorage.setItem('nlb_account', JSON.stringify(account));
localStorage.setItem('nlb_transactions', JSON.stringify(transactions));

// Load
const account = JSON.parse(localStorage.getItem('nlb_account')) || defaultAccount;
const transactions = JSON.parse(localStorage.getItem('nlb_transactions')) || demoTransactions;
```

### V2.0: Cloud Sync (Optional)
- Encrypted backup to user's Google Drive / iCloud
- Cross-device sync
- Export to CSV/PDF

---

## 7. Edge Cases & Validation

### Transaction Validation:
- ✅ Amount > 0 (always positive, type determines direction)
- ✅ StartDate >= today (can't create past recurring items in v1.0)
- ✅ EndDate > startDate (if provided)
- ✅ Category selected from predefined list (or "Other")

### Runway Calculation Edge Cases:
- **No transactions:** Runway = Infinity (balance never depletes)
- **Negative balance:** Runway = 0 days (already broke)
- **Income > Expenses:** Runway = Infinity (balance grows)
- **Timeframe exceeded:** If runway > 365 days, display "1Y+" (don't calculate beyond)

### Date Handling:
- **Monthly on 31st:** If month has 30 days, use last day of month
- **Leap years:** Handle Feb 29 correctly
- **Timezone:** All dates stored in ISO format, displayed in user's local timezone

---

## 8. State Management (Recommended)

### React Context or Zustand:
```javascript
const useStore = create((set) => ({
  account: defaultAccount,
  transactions: demoTransactions,
  timeframe: 90, // Default to 90-day view
  
  updateBalance: (newBalance) => set((state) => ({
    account: { ...state.account, currentBalance: newBalance, lastUpdated: new Date().toISOString() }
  })),
  
  addTransaction: (txn) => set((state) => ({
    transactions: [...state.transactions, { ...txn, id: generateId() }]
  })),
  
  updateTransaction: (id, updates) => set((state) => ({
    transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  
  deleteTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter(t => t.id !== id)
  })),
  
  setTimeframe: (days) => set({ timeframe: days })
}));
```

---

## 9. API Surface (Internal Functions)

### Core Functions:
```javascript
// Runway calculation
calculateRunway(account, transactions, timeframe) → { runwayDays, dailyBurnRate, projectedBalance, status, depletionDate }

// Daily cash flow projection
generateDailyCashFlow(transactions, timeframe) → Array<number>

// Transaction occurrence generator
getOccurrences(transaction, timeframe) → Array<Date>

// Balance projection
projectBalance(currentBalance, dailyCashFlow, targetDay) → number

// Big Five expense calculation (for Sankey)
calculateTopExpenses(transactions, timeframe, limit = 5) → Array<{ category, amount, percentage }>
```

---

## 10. Testing Scenarios

### Test Case 1: Positive Runway
- Balance: $10,000
- Income: $5,000/month
- Expenses: $3,000/month
- Expected: Runway = Infinity (net positive)

### Test Case 2: Negative Runway (Demo Data)
- Balance: $4,200
- Income: $6,850/month
- Expenses: $5,580/month
- Expected: Runway ~23 days (next paycheck extends it)

### Test Case 3: Zero Balance
- Balance: $0
- Any transactions
- Expected: Runway = 0 days, status = "critical"

### Test Case 4: No Transactions
- Balance: $1,000
- No transactions
- Expected: Runway = Infinity (balance never changes)

---

## Implementation Notes

1. **Start with demo data** - Don't make users enter 10 transactions on first launch
2. **Persist immediately** - Save to localStorage on every change
3. **Optimistic UI** - Update UI before saving (feels instant)
4. **Date math is hard** - Use a library (date-fns or Luxon), don't roll your own
5. **Currency formatting** - Use `Intl.NumberFormat` for locale-aware display

---

## V2.0 Features (Out of Scope for v1.0)

- ❌ Scenarios (Base/Worst/Best Case)
- ❌ Multi-account support
- ❌ Historical analysis (>1Y)
- ❌ Business expense splits
- ❌ Export to CSV/PDF
- ❌ Cloud sync
- ❌ Recurring transaction templates (e.g., "copy last month's bills")

---

**END OF DATA MODEL SPEC**
