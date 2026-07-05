/**
 * US/Eastern day-boundary helpers for the daily AI budget window.
 * Pure date math — shared by the budget UI and the Supabase usage adapter.
 */

const ET_TIMEZONE = 'America/New_York';

/**
 * Parse timezone offset in minutes from short offset strings like GMT-5 or GMT-04:00
 */
function parseOffsetMinutes(offsetText) {
  const match = offsetText.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return -300;

  const sign = match[1] === '+' ? 1 : -1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

/**
 * Get current Eastern date components
 */
function getEtDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return { year, month, day };
}

/**
 * Convert ET local date/time to UTC Date.
 * Uses a short iterative solve to ensure DST-safe conversion.
 */
function etLocalToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    timeZoneName: 'shortOffset',
  });

  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i += 1) {
    const tzParts = offsetFormatter.formatToParts(new Date(utcGuess));
    const offsetText = tzParts.find((part) => part.type === 'timeZoneName')?.value || 'GMT-5';
    const offsetMinutes = parseOffsetMinutes(offsetText);
    utcGuess = Date.UTC(year, month - 1, day, hour, minute, second) - (offsetMinutes * 60 * 1000);
  }

  return new Date(utcGuess);
}

/**
 * Get start and end of current ET day in UTC.
 */
export function getDayBoundariesET() {
  const { year, month, day } = getEtDateParts();
  const dayStart = etLocalToUtc(year, month, day, 0, 0, 0);
  const nextLocalDate = new Date(Date.UTC(year, month - 1, day + 1));
  const dayEnd = etLocalToUtc(
    nextLocalDate.getUTCFullYear(),
    nextLocalDate.getUTCMonth() + 1,
    nextLocalDate.getUTCDate(),
    0,
    0,
    0,
  );

  return {
    dayStart,
    dayEnd,
  };
}

/**
 * Get next ET midnight countdown target.
 */
export function getNextDayET() {
  const { dayEnd } = getDayBoundariesET();
  return dayEnd;
}
