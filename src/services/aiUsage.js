/**
 * AI Usage Service
 * Handles fetching and calculating AI token usage and costs
 */

import { supabase } from './supabase';

/**
 * Get the start and end of the current week (Monday-Sunday) in Eastern Time
 */
export function getWeekBoundariesET() {
  // Get current time in Eastern timezone
  const now = new Date();
  
  // Convert to ET (approximation using offset)
  // Note: This is a simplified approach. For production, consider using a library like date-fns-tz
  const etOffset = -5; // EST offset (adjust for EDT if needed)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const etTime = new Date(utcTime + (3600000 * etOffset));
  
  // Get Monday of current week
  const dayOfWeek = etTime.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Sunday (0)
  
  const weekStart = new Date(etTime);
  weekStart.setDate(etTime.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  // Get Sunday end of week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(0, 0, 0, 0);
  
  return { weekStart, weekEnd };
}

/**
 * Get next Monday at midnight ET for countdown
 */
export function getNextMondayET() {
  const { weekEnd } = getWeekBoundariesET();
  return weekEnd; // Week end is Monday midnight
}

/**
 * Fetch all AI usage records for the current user
 */
export async function fetchUserUsage() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Calculate usage statistics broken down by model
 * @param {Array} usageRecords - Array of usage records from database
 * @param {Date|null} startDate - Optional start date filter
 * @param {Date|null} endDate - Optional end date filter
 */
export function calculateUsageStats(usageRecords, startDate = null, endDate = null) {
  // Filter by date range if provided
  let filteredRecords = usageRecords;
  
  if (startDate || endDate) {
    filteredRecords = usageRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate >= endDate) return false;
      return true;
    });
  }
  
  // Group by model
  const statsByModel = {};
  
  filteredRecords.forEach(record => {
    const model = record.model;
    
    if (!statsByModel[model]) {
      statsByModel[model] = {
        input_tokens: 0,
        output_tokens: 0,
        cached_input_tokens: 0,
        reasoning_tokens: 0,
        total_cost: 0,
        request_count: 0,
      };
    }
    
    statsByModel[model].input_tokens += record.input_tokens || 0;
    statsByModel[model].output_tokens += record.output_tokens || 0;
    statsByModel[model].cached_input_tokens += record.cached_input_tokens || 0;
    statsByModel[model].reasoning_tokens += record.reasoning_tokens || 0;
    statsByModel[model].total_cost += parseFloat(record.cost_usd || 0);
    statsByModel[model].request_count += 1;
  });
  
  // Calculate totals across all models
  const totals = {
    input_tokens: 0,
    output_tokens: 0,
    cached_input_tokens: 0,
    reasoning_tokens: 0,
    total_cost: 0,
    request_count: 0,
  };
  
  Object.values(statsByModel).forEach(stats => {
    totals.input_tokens += stats.input_tokens;
    totals.output_tokens += stats.output_tokens;
    totals.cached_input_tokens += stats.cached_input_tokens;
    totals.reasoning_tokens += stats.reasoning_tokens;
    totals.total_cost += stats.total_cost;
    totals.request_count += stats.request_count;
  });
  
  return {
    byModel: statsByModel,
    totals,
  };
}

/**
 * Get this week's usage statistics
 */
export async function getWeeklyUsage() {
  const usageRecords = await fetchUserUsage();
  const { weekStart, weekEnd } = getWeekBoundariesET();
  
  return calculateUsageStats(usageRecords, weekStart, weekEnd);
}

/**
 * Get all-time usage statistics
 */
export async function getAllTimeUsage() {
  const usageRecords = await fetchUserUsage();
  return calculateUsageStats(usageRecords);
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

