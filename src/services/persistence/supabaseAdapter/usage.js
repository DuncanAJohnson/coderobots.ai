/**
 * AI usage adapter (Supabase)
 * Fetches daily spend / budget limits / access level for the current user.
 */

import { supabase } from '../../supabase';
import { getDayBoundariesET } from '../../etTime';

const DEFAULT_CAMPS_BUDGET = Number(import.meta.env.VITE_CAMPS_DAILY_BUDGET || 0.5);
const DEFAULT_STANDARD_BUDGET = Number(import.meta.env.VITE_STANDARD_DAILY_BUDGET || 0.125);

/**
 * Extract numeric value from app_config jsonb value
 */
function parseBudgetValue(val) {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'object' && val !== null && typeof val.value === 'number') return val.value;
  if (typeof val === 'string') return Number(val) || 0;
  return 0;
}

/**
 * Fetch budget limits from app_config table
 */
async function fetchBudgetConfig() {
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['STANDARD_DAILY_BUDGET', 'CAMPS_DAILY_BUDGET']);

  if (error) {
    throw error;
  }

  const config = {
    STANDARD_DAILY_BUDGET: DEFAULT_STANDARD_BUDGET,
    CAMPS_DAILY_BUDGET: DEFAULT_CAMPS_BUDGET,
  };

  for (const row of data || []) {
    const num = parseBudgetValue(row.value);
    if (row.key === 'STANDARD_DAILY_BUDGET') config.STANDARD_DAILY_BUDGET = num;
    if (row.key === 'CAMPS_DAILY_BUDGET') config.CAMPS_DAILY_BUDGET = num;
  }

  return config;
}

/**
 * Get active user's daily spend in USD.
 */
export async function getDailySpend() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { dayStart, dayEnd } = getDayBoundariesET();

  const { data, error } = await supabase
    .from('ai_usage')
    .select('cost_usd')
    .eq('user_id', user.id)
    .gte('timestamp', dayStart.toISOString())
    .lt('timestamp', dayEnd.toISOString());

  if (error) {
    throw error;
  }

  return (data || []).reduce((sum, row) => sum + Number(row.cost_usd || 0), 0);
}

export async function getDailyBudgetLimit(accessLevel) {
  const config = await fetchBudgetConfig();
  return accessLevel === 'standard'
    ? config.STANDARD_DAILY_BUDGET
    : config.CAMPS_DAILY_BUDGET;
}

/**
 * Get daily budget usage summary.
 */
export async function getDailyBudgetUsage(accessLevel) {
  const spent = await getDailySpend();
  const limit = await getDailyBudgetLimit(accessLevel);
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  return {
    spent,
    limit,
    percentage,
  };
}

/**
 * Get user's access level
 */
export async function getUserAccessLevel() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user.user_metadata?.access_level || 'standard';
}
