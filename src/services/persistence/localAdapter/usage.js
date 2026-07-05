/**
 * AI usage adapter (browser-local).
 * No budgets are enforced without telemetry — the budget UI is hidden on
 * these instances, so these are benign sentinels for any stray caller.
 */

export async function getDailySpend() {
  return 0;
}

export async function getDailyBudgetLimit() {
  return null;
}

export async function getDailyBudgetUsage() {
  return { spent: 0, limit: null, percentage: 0 };
}

export async function getUserAccessLevel() {
  return 'anonymous';
}
