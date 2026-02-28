import {
  addDays,
  addWeeks,
  addMonths,
  differenceInCalendarDays,
  startOfToday,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  parseISO,
  format,
  subDays,
} from 'date-fns';

/**
 * Get all occurrence dates for a transaction within a timeframe window.
 * @param {import('../types/index.js').Transaction} transaction
 * @param {number} timeframe - Days to look ahead from today
 * @returns {Date[]}
 */
export function getOccurrences(transaction, timeframe) {
  const today = startOfToday();
  const windowEnd = addDays(today, timeframe);
  const txnStart = parseISO(transaction.startDate);

  // Build exclusion set from excludeDates array
  const excluded = new Set(
    (transaction.excludeDates || []).map((d) => d)
  );

  // One-time: single date, no looping needed
  if (transaction.frequency === 'one-time') {
    const key = format(txnStart, 'yyyy-MM-dd');
    return excluded.has(key) ? [] : [txnStart];
  }

  // Recurring: generate dates from startDate until endDate or window end
  const txnEnd = transaction.endDate
    ? parseISO(transaction.endDate)
    : windowEnd;
  const effectiveEnd = txnEnd < windowEnd ? txnEnd : windowEnd;

  const dates = [];
  let current = txnStart;

  while (current <= effectiveEnd) {
    const key = format(current, 'yyyy-MM-dd');
    if (!excluded.has(key)) {
      dates.push(current);
    }

    switch (transaction.frequency) {
      case 'weekly':
        current = addWeeks(current, 1);
        break;
      case 'bi-weekly':
        current = addWeeks(current, 2);
        break;
      case 'monthly':
        current = addMonths(current, 1);
        break;
      case 'semi-monthly': {
        // Generate 1st and 15th of each month
        const curMonth = current.getMonth();
        const curDay = current.getDate();
        if (curDay < 15) {
          current = new Date(current.getFullYear(), curMonth, 15);
        } else {
          const nextMonth = addMonths(new Date(current.getFullYear(), curMonth, 1), 1);
          current = nextMonth; // 1st of next month
        }
        break;
      }
      case 'quarterly':
        current = addMonths(current, 3);
        break;
      case 'annually':
        current = addMonths(current, 12);
        break;
      case 'custom-days':
        current = addDays(current, transaction.customDayInterval || 30);
        break;
      default:
        return dates;
    }
  }

  return dates;
}

/**
 * Get all occurrence dates for a transaction within a specific date range.
 * Used for discrete month views.
 * @param {import('../types/index.js').Transaction} transaction
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @returns {Date[]}
 */
export function getOccurrencesInRange(transaction, rangeStart, rangeEnd) {
  const txnStart = parseISO(transaction.startDate);
  const excluded = new Set((transaction.excludeDates || []).map((d) => d));

  if (transaction.frequency === 'one-time') {
    const key = format(txnStart, 'yyyy-MM-dd');
    if (excluded.has(key)) return [];
    return txnStart >= rangeStart && txnStart <= rangeEnd ? [txnStart] : [];
  }

  const txnEnd = transaction.endDate ? parseISO(transaction.endDate) : rangeEnd;
  const effectiveEnd = txnEnd < rangeEnd ? txnEnd : rangeEnd;

  const dates = [];
  let current = txnStart;

  while (current <= effectiveEnd) {
    if (current >= rangeStart) {
      const key = format(current, 'yyyy-MM-dd');
      if (!excluded.has(key)) dates.push(current);
    }

    switch (transaction.frequency) {
      case 'weekly': current = addWeeks(current, 1); break;
      case 'bi-weekly': current = addWeeks(current, 2); break;
      case 'monthly': current = addMonths(current, 1); break;
      case 'semi-monthly': {
        const cm = current.getMonth();
        const cd = current.getDate();
        if (cd < 15) {
          current = new Date(current.getFullYear(), cm, 15);
        } else {
          current = addMonths(new Date(current.getFullYear(), cm, 1), 1);
        }
        break;
      }
      case 'quarterly': current = addMonths(current, 3); break;
      case 'annually': current = addMonths(current, 12); break;
      case 'custom-days': current = addDays(current, transaction.customDayInterval || 30); break;
      default: return dates;
    }
  }

  return dates;
}

/**
 * Build a view range from either a rolling timeframe or a month string.
 * @param {number} timeframe - Rolling days (30, 60, 90, 365)
 * @param {string|null} viewMonth - "YYYY-MM" or null for rolling
 * @returns {{ start: Date, end: Date, days: number, label: string, isMonth: boolean }}
 */
export function buildViewRange(timeframe, viewMonth) {
  if (viewMonth) {
    const monthDate = parseISO(viewMonth + '-01');
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = getDaysInMonth(monthDate);
    const label = format(monthDate, 'MMMM yyyy');
    return { start, end, days, label, isMonth: true };
  }
  const today = startOfToday();
  const days = timeframe;
  const label = timeframe === 365 ? '1 year' : `${timeframe} days`;
  return { start: today, end: addDays(today, timeframe), days, label, isMonth: false };
}

/**
 * Get past-due occurrences that fell between lastUpdated and yesterday.
 * Used to prompt the user during Check In to confirm whether these already hit their bank.
 * @param {import('../types/index.js').Transaction[]} transactions
 * @param {string|null} lastUpdatedISO - ISO date string of last check-in
 * @returns {Array<{ transactionId: string, category: string, subcategory: string|null, type: string, amount: number, frequency: string, date: Date, dateKey: string }>}
 */
export function getPastDueOccurrences(transactions, lastUpdatedISO) {
  if (!lastUpdatedISO) return [];

  const today = startOfToday();
  const since = addDays(parseISO(lastUpdatedISO.split('T')[0]), 1);
  const yesterday = subDays(today, 1);

  if (since > yesterday) return [];

  const results = [];

  for (const txn of transactions) {
    if (!txn.isActive) continue;

    const occurrences = getOccurrencesInRange(txn, since, yesterday);
    for (const date of occurrences) {
      results.push({
        transactionId: txn.id,
        category: txn.category,
        subcategory: txn.subcategory || null,
        type: txn.type,
        amount: txn.amount,
        frequency: txn.frequency,
        date,
        dateKey: format(date, 'yyyy-MM-dd'),
      });
    }
  }

  results.sort((a, b) => a.date - b.date);
  return results;
}

/**
 * Generate array of daily net cash flows over a timeframe.
 * Index 0 = today, index 1 = tomorrow, etc.
 * Positive values = net income that day, negative = net expense.
 * Un-excluded past occurrences collapse to index 0 (today).
 * @param {import('../types/index.js').Transaction[]} transactions
 * @param {number} timeframe
 * @returns {number[]}
 */
export function generateDailyCashFlow(transactions, timeframe) {
  const days = new Array(timeframe).fill(0);
  const today = startOfToday();

  for (const txn of transactions) {
    if (!txn.isActive) continue;

    const occurrences = getOccurrences(txn, timeframe);
    for (const date of occurrences) {
      let dayIndex = differenceInCalendarDays(date, today);
      if (dayIndex < 0) dayIndex = 0;
      if (dayIndex < timeframe) {
        days[dayIndex] += txn.type === 'income' ? txn.amount : -txn.amount;
      }
    }
  }

  return days;
}

/**
 * Calculate average daily burn rate (absolute net cash flow per day).
 * @param {import('../types/index.js').Transaction[]} transactions
 * @param {number} [timeframe=30]
 * @returns {number}
 */
export function calculateDailyBurnRate(transactions, timeframe = 30) {
  const dailyCashFlow = generateDailyCashFlow(transactions, timeframe);
  const totalIncome = dailyCashFlow
    .filter((d) => d > 0)
    .reduce((sum, d) => sum + d, 0);
  const totalExpenses = Math.abs(
    dailyCashFlow.filter((d) => d < 0).reduce((sum, d) => sum + d, 0)
  );
  const netCashFlow = totalIncome - totalExpenses;

  return Math.round((Math.abs(netCashFlow) / timeframe) * 100) / 100;
}

/**
 * Determine runway status from days remaining.
 * @param {number} runwayDays
 * @returns {'safe' | 'caution' | 'critical'}
 */
export function getRunwayStatus(runwayDays) {
  if (runwayDays >= 60) return 'safe';
  if (runwayDays >= 30) return 'caution';
  return 'critical';
}

/**
 * Main runway calculation — produces the full RunwayResult.
 * Always simulates 365 days for projected balance checkpoints.
 * @param {import('../types/index.js').Account} account
 * @param {import('../types/index.js').Transaction[]} transactions
 * @param {number} timeframe - User-selected timeframe (used for burn rate)
 * @returns {import('../types/index.js').RunwayResult}
 */
export function calculateRunway(account, transactions, timeframe) {
  const activeTransactions = transactions.filter((t) => t.isActive);
  const today = startOfToday();
  const maxDays = 365;
  const checkpoints = [30, 60, 90, 365];

  // Edge case: already broke
  if (account.currentBalance <= 0) {
    const cf = generateDailyCashFlow(activeTransactions, maxDays);
    let bal = account.currentBalance;
    const pb = {};
    for (let i = 0; i < maxDays; i++) {
      bal += cf[i];
      if (checkpoints.includes(i + 1)) {
        pb[`${i + 1}d`] = Math.round(bal * 100) / 100;
      }
    }
    return {
      runwayDays: 0,
      dailyBurnRate: calculateDailyBurnRate(activeTransactions, timeframe),
      projectedBalance: pb,
      status: 'critical',
      depletionDate: format(today, 'yyyy-MM-dd'),
    };
  }

  // Generate 365 days of cash flow for full projections
  const dailyCashFlow = generateDailyCashFlow(activeTransactions, maxDays);

  let balance = account.currentBalance;
  let runwayDays = null;
  let depletionDate = null;
  const projectedBalance = {};

  for (let i = 0; i < maxDays; i++) {
    balance += dailyCashFlow[i];

    // Record balance at projection checkpoints
    if (checkpoints.includes(i + 1)) {
      projectedBalance[`${i + 1}d`] = Math.round(balance * 100) / 100;
    }

    // First day balance goes negative = depletion
    if (balance < 0 && runwayDays === null) {
      runwayDays = i;
      depletionDate = format(addDays(today, i), 'yyyy-MM-dd');
    }
  }

  // Never depleted within 365 days
  if (runwayDays === null) {
    runwayDays = Infinity;
  }

  return {
    runwayDays,
    dailyBurnRate: calculateDailyBurnRate(activeTransactions, timeframe),
    projectedBalance,
    status: getRunwayStatus(runwayDays),
    depletionDate,
  };
}
