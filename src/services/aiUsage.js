/**
 * AI Usage Service
 * Daily AI budget usage and access level for the current user.
 *
 * Facade over the persistence adapter (src/services/persistence/). Pure
 * time/format helpers live here (and in etTime.js) since they are the same
 * for every backend.
 */

import { adapter } from './persistence';

export { getDayBoundariesET, getNextDayET } from './etTime';

export const getDailySpend = (...args) => adapter.usage.getDailySpend(...args);
export const getDailyBudgetLimit = (...args) => adapter.usage.getDailyBudgetLimit(...args);
export const getDailyBudgetUsage = (...args) => adapter.usage.getDailyBudgetUsage(...args);
export const getUserAccessLevel = (...args) => adapter.usage.getUserAccessLevel(...args);

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return `$${amount.toFixed(4)}`;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num) {
  return num.toLocaleString();
}
