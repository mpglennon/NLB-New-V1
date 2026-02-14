/**
 * NLBCash Type Definitions (JSDoc)
 *
 * @typedef {Object} Account
 * @property {string} id
 * @property {string} name
 * @property {number} currentBalance
 * @property {string} lastUpdated - ISO timestamp
 * @property {string} currency
 */

/**
 * @typedef {'income' | 'expense'} TransactionType
 */

/**
 * @typedef {'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'} Frequency
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {TransactionType} type
 * @property {string} category
 * @property {string} description
 * @property {number} amount - Always positive; type determines +/-
 * @property {Frequency} frequency
 * @property {string} startDate - ISO date (YYYY-MM-DD)
 * @property {string|null} endDate - ISO date or null (null = ongoing)
 * @property {boolean} isActive
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} RunwayResult
 * @property {number} runwayDays - Days until balance reaches zero (Infinity if never)
 * @property {number} dailyBurnRate - Average daily net cash outflow
 * @property {Object} projectedBalance
 * @property {number} projectedBalance.30d
 * @property {number} projectedBalance.60d
 * @property {number} projectedBalance.90d
 * @property {number} projectedBalance.365d
 * @property {'safe' | 'caution' | 'critical'} status
 * @property {string|null} depletionDate - ISO date or null
 */

/**
 * @typedef {30 | 60 | 90 | 365} Timeframe
 */

export {};
